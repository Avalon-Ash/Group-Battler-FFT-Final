// ╔══════════════════════════════════════════════════════════╗
// ║  UnitFrame — 每幀單位視覺快照（腳點／高度／排序／錨點）    ║
// ║  職責：每幀只算一次「繪製用」單位座標；UNIT／CORPSE／AURA、 ║
// ║        血條、狀態、剪影、選取連線都讀同一份，不再各算各的   ║
// ║  上游：RenderPipeline（drawWorld 開頭建立，傳入繪製用高度   ║
// ║        函式＝已含漂浮位移）、VisualMath（SSOT 函式）、      ║
// ║        deathMotion（屍體擊飛／墜落）                        ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4。   ║
// ║  本檔是 engine/renderers 內唯一可以呼叫                      ║
// ║  VisualMath.getUnitGroundHeight 的地方（棘輪測試擋住）；     ║
// ║  繪製端拿到的是 frames，沒有地形高度函式，所以無法自己重算。 ║
// ║  唯一寫入者：UnitFrameStore.build。                          ║
// ║  殘影（ghosts）：trailHistory 的點換算成相對腳底的偏移       ║
// ║  （Afterimage.ts，腳下高度＝繪製用高度，RenderSpec §10）。   ║
// ║  視覺狀態（store 內，跨幀）：每個單位上一幀的排序用腳下格，  ║
// ║  只有腳明顯進入新格才切換（UNIT_FRAME.HEX_HYSTERESIS_PX），  ║
// ║  sortBias 因此不會在格界上鋸齒翻轉（RenderSpec §2）。        ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { HexUtils, MapConfig } from "../../utils";
import { VisualMath } from "../../math/VisualMath";
import { UnitDeathPainter } from "../units/painters/UnitDeathPainter";
import { computeDeathGround } from "../../../data/units/appearance/deathMotion";
import { UNIT_FRAME } from "../../../constants";
import { resolveBodyType } from "../../../data/units/appearance/bodyTypes";
import { hudBarHeight } from "../../../data/units/appearance/projection";
import { Hex } from "../../../types";
import { AfterimageGhost, computeAfterimageGhosts, createGhostSlots } from "./Afterimage";

export type UnitFramePhase = 'IN' | 'OUT' | 'IDLE';

/** 轉場 OUT 超過這個進度後整批單位不提交（原 UnitRenderSystem.submitRenderables 的早退條件） */
const TRANSITION_OUT_CULL_T = 0.95;
/** 轉場位移超過這個像素數的單位不提交（飛在畫面外） */
const TRANSITION_CULL_OFFSET = 800;

/** 單位的一幀繪製座標。唯讀：只有 UnitFrameStore.build 寫入。 */
export interface UnitFrame {
    readonly agent: Agent;
    /** hp <= 0（屍體，含擊飛位移） */
    readonly isCorpse: boolean;
    /** 提交 UNIT／CORPSE／AURA 的條件：非 fullyDead、非 outOfBounds、轉場未把它帶出畫面。血條／狀態／剪影另有各自的單位狀態判斷 */
    readonly visible: boolean;
    /** px + physics.x（屍體再加擊飛滑行 x） */
    readonly footX: number;
    /** py + physics.y（屍體再加擊飛滑行 y），不含轉場位移 */
    readonly footY: number;
    /** 轉場位移（地塊也套同一個）。以未擊飛的位置計算 */
    readonly transition: number;
    /** 繪製用腳下高度：含漂浮位移；拖曳預覽＝游標格；屍體＝computeDeathGround */
    readonly groundH: number;
    /** footY − groundH：不含轉場位移的腳底繪製 Y（狀態、血條、剪影用） */
    readonly floorY: number;
    /** footY + transition − groundH（＝UNIT op.ty） */
    readonly drawY: number;
    /** footY + transition（＝UNIT op.y，排序用） */
    readonly sortY: number;
    /** max(0, 腳下格格心 Y − footY)（＝UNIT／CORPSE op.sortBias） */
    readonly sortBias: number;
    readonly hexUnderFoot: Hex;
    /** VisualMath.getVisualBodyCenterY(floorY, physics.z)：護盾與包裹類狀態 */
    readonly bodyCenterY: number;
    /** 血條錨點 Y：腳底繪製 Y − physics.z − hudBarHeight(體型)（投影頭頂 + HUD_ANCHOR.barHeadMargin；血條、量表、頭頂狀態圖示共用） */
    readonly hudAnchorY: number;
    /** 衝刺／高速移動殘影的槽位（預先配置，前 ghostCount 個有效；偏移相對單位目前腳底繪製點，RenderSpec §10） */
    readonly ghosts: AfterimageGhost[];
    readonly ghostCount: number;
}

type MutableUnitFrame = { -readonly [K in keyof UnitFrame]: UnitFrame[K] };

function createFrame(agent: Agent): MutableUnitFrame {
    return {
        agent, isCorpse: false, visible: false,
        footX: 0, footY: 0, transition: 0, groundH: 0, floorY: 0, drawY: 0, sortY: 0, sortBias: 0,
        hexUnderFoot: { q: 0, r: 0 }, bodyCenterY: 0, hudAnchorY: 0,
        ghosts: createGhostSlots(), ghostCount: 0,
    };
}

/** 排序用腳下格的跨幀記憶（每個單位一筆；stamp 標記最後一次被 build 看到的幀） */
interface SortHexMemory { q: number; r: number; stamp: number }

export class UnitFrameStore {
    private readonly pool: MutableUnitFrame[] = [];
    private readonly frames: UnitFrame[] = [];
    private readonly sortHex = new Map<string, SortHexMemory>();
    private buildStamp = 0;
    /** 本幀 build 的繪製用高度函式與地圖（殘影腳下高度用；每幀由 build 設定） */
    private heightAt: (q: number, r: number) => number = () => 0;
    private mapConfig: MapConfig | null = null;
    private readonly ghostGroundAt = (x: number, y: number): number => {
        if (!this.mapConfig) return 0;
        const h = HexUtils.fromPx(x, y, this.mapConfig);
        return this.heightAt(h.q, h.r);
    };

    /** 與輸入 agents 同序、同長度的本幀快照 */
    public get list(): readonly UnitFrame[] { return this.frames; }

    /** 單位數很少，線性搜尋；繪製端以 list 迭代，只有選取連線與測試會用到 */
    public get(agent: Agent | null): UnitFrame | undefined {
        if (!agent) return undefined;
        for (let i = 0; i < this.frames.length; i++) {
            if (this.frames[i].agent === agent) return this.frames[i];
        }
        return undefined;
    }

    /**
     * drawWorld 開頭呼叫一次（提交之前）。renderHeightAt 是 RenderPipeline 的繪製用高度函式（已扣漂浮位移）。
     * hasGround 有值時，屍體擊飛滑出已塌陷地塊就墜落（computeDeathGround）。
     */
    public build(
        agents: readonly Agent[],
        renderHeightAt: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        phase: UnitFramePhase,
        hasGround?: (q: number, r: number) => boolean
    ): void {
        const n = agents.length;
        this.heightAt = renderHeightAt;
        this.mapConfig = mapConfig;
        if (this.frames.length > n) this.frames.length = n;
        const batchCulled = phase === 'OUT' && transitionT > TRANSITION_OUT_CULL_T;
        this.buildStamp++;

        for (let i = 0; i < n; i++) {
            const agent = agents[i];
            let f = this.pool[i];
            if (!f) { f = createFrame(agent); this.pool[i] = f; }
            this.frames[i] = f;
            this.fill(f, agent, renderHeightAt, mapConfig, transitionT, phase, batchCulled, hasGround);
        }

        // 不在單位列表裡的單位（已移除）：丟掉它的腳下格記憶
        if (this.sortHex.size > n) {
            for (const [id, mem] of this.sortHex) {
                if (mem.stamp !== this.buildStamp) this.sortHex.delete(id);
            }
        }
    }

    /**
     * 排序用腳下格（帶滯後）：腳點原始所在格 raw 與上一幀記憶的格 prev 不同時，
     * 只有「到 raw 格心的距離 + HEX_HYSTERESIS_PX < 到 prev 格心的距離」才切換；
     * 離 prev 超過一環（瞬移、擊飛）立即切換。結果寫進 out（幀自己的 Hex，不洩漏記憶物件）。
     */
    private resolveSortHex(out: Hex, agent: Agent, footX: number, footY: number, mapConfig: MapConfig): void {
        const raw = HexUtils.fromPx(footX, footY, mapConfig);
        let mem = this.sortHex.get(agent.id);
        if (!mem) {
            mem = { q: raw.q, r: raw.r, stamp: this.buildStamp };
            this.sortHex.set(agent.id, mem);
            out.q = raw.q; out.r = raw.r;
            return;
        }
        mem.stamp = this.buildStamp;
        if (raw.q !== mem.q || raw.r !== mem.r) {
            let sw = HexUtils.dist(raw, mem) > 1;
            if (!sw) {
                const cNew = HexUtils.toPx(raw.q, raw.r, mapConfig);
                const cOld = HexUtils.toPx(mem.q, mem.r, mapConfig);
                const dNew = Math.hypot(footX - cNew.x, footY - cNew.y);
                const dOld = Math.hypot(footX - cOld.x, footY - cOld.y);
                sw = dNew + UNIT_FRAME.HEX_HYSTERESIS_PX < dOld;
            }
            if (sw) { mem.q = raw.q; mem.r = raw.r; }
        }
        out.q = mem.q; out.r = mem.r;
    }

    private fill(
        f: MutableUnitFrame,
        agent: Agent,
        renderHeightAt: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        phase: UnitFramePhase,
        batchCulled: boolean,
        hasGround?: (q: number, r: number) => boolean
    ): void {
        const isCorpse = agent.hp <= 0;
        const baseX = agent.px + agent.physics.x;
        const baseY = agent.py + agent.physics.y;
        f.agent = agent;
        f.isCorpse = isCorpse;

        // 已回收的屍體：沒有任何繪製端會讀它，不做擊飛與墜落的取樣
        if (agent.fullyDead) {
            f.visible = false;
            f.footX = baseX; f.footY = baseY; f.transition = 0; f.groundH = 0;
            f.floorY = baseY; f.drawY = baseY; f.sortY = baseY; f.sortBias = 0;
            f.bodyCenterY = baseY; f.hudAnchorY = baseY;
            f.ghostCount = 0;
            return;
        }

        // 腳下地面高度的唯一定義在 VisualMath.getUnitGroundHeight（編輯模式拖曳預覽例外：直接取游標所在格）
        const isDragPreview = agent.dragOverQ !== null || agent.dragOverR !== null;
        let groundH = isDragPreview
            ? renderHeightAt(agent.dragOverQ ?? agent.q, agent.dragOverR ?? agent.r)
            : VisualMath.getUnitGroundHeight(agent, renderHeightAt, mapConfig);

        let footX = baseX;
        let footY = baseY;

        // 擊飛中的屍體：滑行位移併入繪製位置與深度排序鍵，
        // 否則排序仍以死亡點計算，滑到前方時會被後排地塊／障礙物來回覆蓋而閃爍。
        if (isCorpse) {
            const knock = UnitDeathPainter.getKnockOffset(agent);
            footX += knock.x;
            footY += knock.y;

            // 擊飛滑行是繪製位移，物理不知道屍體移動了：腳下高度要跟著滑到的那一格，
            // 滑出已塌陷的地塊（虛空）就從該刻起墜落（回收仍走原本的死亡計時，不新增寫入者）。
            if (hasGround) {
                const v = UnitDeathPainter.getKnockVelocity(agent);
                groundH = computeDeathGround(baseX, baseY, v.vx, v.vy, v.vz, agent.deathTimer, {
                    hexAt: (x, y) => HexUtils.fromPx(x, y, mapConfig),
                    hasGround,
                    heightAt: renderHeightAt,
                }).height;
            }
        }

        // 轉場位移以未擊飛的位置計算（地塊也套同一個）
        const transition = VisualMath.getTransitionOffset(baseX, baseY, mapConfig, transitionT, phase);
        const sortY = footY + transition;

        // 深度鍵：單位腳下所在的格子必須排在該格地塊之後。地塊以格心 Y 排序，
        // 單位走過格界後（腳已在前方鄰格內）腳 Y 仍小於該格格心 Y，會被「之後才畫」的前方地塊蓋住下半身。
        // 因此把鍵抬到腳下格的格心線（只抬不降；同鍵時 subLayer 讓單位排在地塊之後）。
        // 以含繪製位移（physics 偏移、屍體擊飛）的腳點判斷，轉場位移不參與（地塊也套同一個）。
        // 排序用腳下格帶滯後（resolveSortHex）：高度仍由 getUnitGroundHeight 決定，不受影響
        const hexUnderFoot = f.hexUnderFoot;
        this.resolveSortHex(hexUnderFoot, agent, footX, footY, mapConfig);
        const hexCenterY = HexUtils.toPx(hexUnderFoot.q, hexUnderFoot.r, mapConfig).y;

        const floorY = footY - groundH;
        const pz = isNaN(agent.physics?.z) ? 0 : agent.physics.z;

        f.visible = !agent.outOfBounds && !batchCulled && !(Math.abs(transition) > TRANSITION_CULL_OFFSET);
        f.footX = footX;
        f.footY = footY;
        f.transition = transition;
        f.groundH = groundH;
        f.floorY = floorY;
        f.sortY = sortY;
        f.drawY = VisualMath.getIsoVisualY(sortY, groundH);
        f.sortBias = Math.max(0, hexCenterY - footY);
        f.bodyCenterY = VisualMath.getVisualBodyCenterY(floorY, pz);
        f.hudAnchorY = VisualMath.getEntityVisualY(agent.py, groundH, agent.physics.y, agent.physics.z, -hudBarHeight(resolveBodyType(agent)));

        // 衝刺／高速移動殘影：屍體與拖曳預覽沒有（屍體的位移是擊飛，不是衝刺）
        const hasGhosts = !isCorpse && !isDragPreview && agent.trailHistory.length > 0;
        f.ghostCount = hasGhosts
            ? computeAfterimageGhosts(f.ghosts, agent.trailHistory,
                agent.physics.vx * agent.physics.vx + agent.physics.vy * agent.physics.vy,
                footX, footY, groundH, this.ghostGroundAt)
            : 0;
    }
}
