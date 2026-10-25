// ╔══════════════════════════════════════════════════════════╗
// ║  UnitFrame — 每幀單位視覺快照（腳點／高度／排序／錨點）    ║
// ║  職責：每幀只算一次「繪製用」單位座標；UNIT／CORPSE／AURA、 ║
// ║        血條、狀態、剪影、選取連線都讀同一份，不再各算各的   ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4。   ║
// ║  本檔是 engine/renderers 內唯一可以呼叫                      ║
// ║  VisualMath.getUnitGroundHeight 的地方（棘輪測試擋住）；     ║
// ║  繪製端拿到的是 frames，沒有地形高度函式，所以無法自己重算。 ║
// ║  唯一寫入者：UnitFrameStore.build。                          ║
// ║  殘影（ghosts）：trailHistory 的點換算成相對腳底的偏移       ║
// ║  （Afterimage.ts，腳下高度＝繪製用高度，RenderSpec §10）。   ║
// ║  視覺狀態（store 內，跨幀）：每個單位上一幀的排序用腳下格，  ║
// ║  進入前格（格心 Y 較大）立即切換；退回後格或同列側移才要求  ║
// ║  腳明顯進入新格（UNIT_FRAME.HEX_HYSTERESIS_PX，未壓扁平面   ║
// ║  距離 dy/ISO_SCALE_Y 與 HexUtils.fromPx 一致），             ║
// ║  靜止 HEX_RELEASE_FRAMES 幀後放開（停在格界不會卡在舊格），   ║
// ║  sortBias 因此不會在格界上鋸齒翻轉（RenderSpec §2）；腳點 Y   ║
// ║  另有死區（UNIT_FRAME.SORT_DEADBAND_PX）：受擊後退的 1～2 px  ║
// ║  擺盪不動排序鍵。                                            ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { HexUtils, MapConfig } from "../../utils";
import { VisualMath } from "../../math/VisualMath";
import { UnitDeathPainter } from "../units/painters/UnitDeathPainter";
import { computeDeathGround } from "../../../data/units/appearance/deathMotion";
import { UNIT_FRAME, ISO_SCALE_Y } from "../../../constants";
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
    /** max(死區濾波後的腳點 Y, 腳下格格心 Y) − footY（＝UNIT／CORPSE op.sortBias；濾波使它可為 ≥ −SORT_DEADBAND_PX 的小負值） */
    readonly sortBias: number;
    /** 死區濾波後的腳點 Y ＋ 轉場位移：AURA 的 op.y（掛在施法者身上的空中效果，不含腳下格抬升，RenderSpec §2） */
    readonly sortFootY: number;
    readonly hexUnderFoot: Hex;
    /** hexUnderFoot 的格心（世界座標，不含轉場位移）：詠唱環在施法者那格的前半由 AURA op 補畫時的裁切中心 */
    readonly hexCenterX: number;
    readonly hexCenterY: number;
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
        footX: 0, footY: 0, transition: 0, groundH: 0, floorY: 0, drawY: 0, sortY: 0, sortBias: 0, sortFootY: 0,
        hexUnderFoot: { q: 0, r: 0 }, hexCenterX: 0, hexCenterY: 0, bodyCenterY: 0, hudAnchorY: 0,
        ghosts: createGhostSlots(), ghostCount: 0,
    };
}

/** 排序用腳下格的跨幀記憶（每個單位一筆；stamp 標記最後一次被 build 看到的幀） */
interface SortHexMemory {
    q: number; r: number; stamp: number;
    /** 排序用腳點 Y（死區濾波後；UNIT_FRAME.SORT_DEADBAND_PX） */
    footY: number;
    /** 靜止錨點（腳點離它超過 STILL_PX 就重設）與停在錨點附近、原始格也不變的幀數（≥ HEX_RELEASE_FRAMES 時滯後放開，見 resolveSortHex） */
    anchorX: number;
    anchorY: number;
    still: number;
    /** 上一幀的原始格（腳壓在格界時原始格會隨次像素抖動來回跳，這種「停住」不算穩定，不放開） */
    rawQ: number;
    rawR: number;
    /** 這次靜止已經放開過一次（錨點重設前不再放開：腳正好壓在格界上時原始格會來回跳，不能跟著跳） */
    released: boolean;
}

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
     * raw 在 prev 前方（格心 Y 較大）就立即切換；否則只有「到 raw 格心的距離 + HEX_HYSTERESIS_PX < 到 prev 格心的距離」才切換
     * （距離在未壓扁平面計算，dy 除以 ISO_SCALE_Y，與 HexUtils.fromPx 尺度一致，COORD-OSC-01）。
     * 非對稱的理由：腳壓在格界時排在前格，地塊遮擋永遠正確；排在後格，自己腳下那格的地塊會蓋住腳
     * （COORD-R1 審查：FOREST/1001 屍體停在 (0,0)／(1,−1) 格界，兩格心距離差 0.07，對稱滯後卡在後格約 150 幀）。
     * 格界上的抖動因此收斂在前格，不會來回翻（原始格在抖時不累計靜止幀，放開不會挑到後格那一幀）；
     * 離 prev 超過一環（瞬移、擊飛）立即切換。腳點連續 HEX_RELEASE_FRAMES 幀待在同一個錨點 STILL_PX 內也切換：
     * 滯後只為了擋「移動中壓著格界」的鋸齒，停在格界附近的單位或屍體不會閃爍，卻會因為卡在舊格而排在
     * 自己腳下那格的地塊之前（腳被地塊蓋住；景深預言 CORPSE×TERRAIN sameHex 70 段、屍體擊飛滑停後整段殘留）。
     * 每次靜止只放開一次：腳正好壓在格界時原始格會隨次像素抖動來回跳，放開後回到一般滯後。
     * 結果寫進 out（幀自己的 Hex，不洩漏記憶物件）。
     */
    private resolveSortHex(out: Hex, agent: Agent, footX: number, footY: number, mapConfig: MapConfig): SortHexMemory {
        const raw = HexUtils.fromPx(footX, footY, mapConfig);
        let mem = this.sortHex.get(agent.id);
        if (!mem) {
            mem = { q: raw.q, r: raw.r, stamp: this.buildStamp, footY, anchorX: footX, anchorY: footY, still: 0, rawQ: raw.q, rawR: raw.r, released: false };
            this.sortHex.set(agent.id, mem);
            out.q = raw.q; out.r = raw.r;
            return mem;
        }
        mem.stamp = this.buildStamp;
        // 以錨點的累積位移判斷靜止：慢速行走（每幀 < STILL_PX）也會很快離開錨點，不會被當成靜止
        if (Math.abs(footX - mem.anchorX) + Math.abs(footY - mem.anchorY) > UNIT_FRAME.STILL_PX) {
            mem.anchorX = footX;
            mem.anchorY = footY;
            mem.still = 0;
            mem.released = false;
        } else if (raw.q !== mem.rawQ || raw.r !== mem.rawR) {
            mem.still = 0;
        } else {
            mem.still++;
        }
        mem.rawQ = raw.q;
        mem.rawR = raw.r;
        // 腳點死區：受擊後退的 1～2 px 擺盪不動排序鍵，真的移動時落後不超過 SORT_DEADBAND_PX
        const d = UNIT_FRAME.SORT_DEADBAND_PX;
        if (footY > mem.footY + d) mem.footY = footY - d;
        else if (footY < mem.footY - d) mem.footY = footY + d;
        if (raw.q !== mem.q || raw.r !== mem.r) {
            const release = !mem.released && mem.still >= UNIT_FRAME.HEX_RELEASE_FRAMES;
            let sw = HexUtils.dist(raw, mem) > 1 || release;
            if (!sw) {
                const cNew = HexUtils.toPx(raw.q, raw.r, mapConfig);
                const cOld = HexUtils.toPx(mem.q, mem.r, mapConfig);
                const dNew = Math.hypot(footX - cNew.x, (footY - cNew.y) / ISO_SCALE_Y);
                const dOld = Math.hypot(footX - cOld.x, (footY - cOld.y) / ISO_SCALE_Y);
                // 前進到前格不需滯後（fromPx 已判定腳在 raw 格內）；退回後格或同列側移才要求距離差
                sw = cNew.y > cOld.y || dNew + UNIT_FRAME.HEX_HYSTERESIS_PX < dOld;
            }
            if (sw) { mem.q = raw.q; mem.r = raw.r; }
            if (release) mem.released = true;
        }
        out.q = mem.q; out.r = mem.r;
        return mem;
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
            f.floorY = baseY; f.drawY = baseY; f.sortY = baseY; f.sortBias = 0; f.sortFootY = baseY;
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
        const sortMem = this.resolveSortHex(hexUnderFoot, agent, footX, footY, mapConfig);
        const hexCenter = HexUtils.toPx(hexUnderFoot.q, hexUnderFoot.r, mapConfig);
        const hexCenterY = hexCenter.y;
        f.hexCenterX = hexCenter.x;
        f.hexCenterY = hexCenterY;

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
        // 排序鍵 Y＝max(死區濾波後的腳點, 腳下格格心)：鍵永遠不低於自己腳下那一格的地塊；濾波使 sortBias 可為 ≥ −SORT_DEADBAND_PX 的小負值
        f.sortBias = Math.max(sortMem.footY, hexCenterY) - footY;
        f.sortFootY = sortMem.footY + transition;
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
