// ╔══════════════════════════════════════════════════════════╗
// ║  UnitRenderSystem — 單位渲染對外統一入口                ║
// ║  本檔負責：提交 RenderOp、座標轉換、層級調度            ║
// ║                                                          ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §2、§3、§4：║
// ║  op 的 tx／y／ty／th／sortBias 一律讀 UnitFrame（每幀快照，  ║
// ║  engine/renderers/frame/UnitFrame.ts），本檔不再取得地形高度，║
// ║  也不自己算腳點、腳下格或擊飛位移。                        ║
// ║  UNIT op 帶著 UnitFrame（op.unitFrame），drawAssembly 轉給    ║
// ║  UnitBodyPainter 畫衝刺殘影（RenderSpec §10）。              ║
// ║  AURA（施法光環）是掛在施法者身上的空中效果：y＝濾波後足跡  ║
// ║  Y（UnitFrame.sortFootY）、sortBias＝AIR_SORT_BIAS，不含高度。║
// ║  AOE 地面預警是平貼的：不畫在 AURA op 裡，登記進            ║
// ║  GroundDrapeLayer 逐格鋪在頂面（RenderSpec §9），否則同高度   ║
// ║  的前方地塊會蓋掉它（看起來穿到地板下）。                  ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { UnitFrame, UnitFrameStore } from "../../renderers/frame/UnitFrame";
import { UnitBodyPainter } from "../../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../../renderers/units/painters/UnitShadowPainter";
import { UnitCorePainter } from "../../renderers/units/painters/UnitCorePainter";
import { UnitIndicatorPainter } from "../../renderers/units/painters/UnitIndicatorPainter";
import { UnitAuraPainter } from "../../renderers/units/painters/UnitAuraPainter";
import { unitFallProgress, unitFallAlpha } from "../../../data/units/appearance/fallMotion";
import { UnitDeathPainter } from "../../renderers/units/painters/UnitDeathPainter";
import { HexLayout } from "../../../types";
import { VFX_RENDER, HEX_SIZE, GROUND_DRAPE } from "../../../constants";
import type { GroundDrapeLayer } from "../../renderers/GroundDrape";
import { HexGeometry } from "../../graphics/utils/HexGeometry";

export class UnitRenderSystem {
    public submitRenderables(
        renderList: RenderList,
        frames: UnitFrameStore,
        globalTime: number,
        highlightAgent: Agent | null,
        drape?: GroundDrapeLayer
    ) {
        const list = frames.list;
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            if (!f.visible) continue;
            const agent = f.agent;

            const op = renderList.next();
            op.type = f.isCorpse ? RenderOpType.CORPSE : RenderOpType.UNIT;

            // 關鍵：將單位的當前邏輯網格位置傳入
            op.tq = agent.q;
            op.tr = agent.r;
            op.th = f.groundH;

            op.agent = agent;
            op.unitFrame = f;
            op.tx = f.footX;

            // Sort Y: Ground position for depth sorting（含 physics／擊飛／轉場；腳下格抬升見 UnitFrame.sortBias）
            op.y = f.sortY;
            op.sortBias = f.sortBias;

            // Visual Y: Top of terrain
            op.ty = f.drawY;

            op.z = agent.physics.z;
            op.time = globalTime;
            op.uSelected = agent === highlightAgent;

            // [FIX] Submit separate Aura/Indicator op locked to ground if casting
            if (agent.castingSkillIdx !== -1) {
                const auraOp = renderList.next();
                auraOp.type = RenderOpType.AURA;
                auraOp.agent = agent;
                auraOp.tx = f.footX;

                // AURA 是掛在施法者身上的空中效果：足跡 Y 不含高度（docs/COORD_GUARD_FINDINGS.md §8）；
                // y＝死區濾波後的腳點（與單位同一把尺，受擊擺盪不動鍵），sortBias＝固定前緣 AIR_SORT_BIAS：
                // 鍵比施法者的鍵（腳點與腳下格格心取大）高，永遠排在施法者與腳下格之後。
                auraOp.y = f.sortFootY;
                auraOp.sortBias = VFX_RENDER.AIR_SORT_BIAS;

                auraOp.ty = f.drawY;
                auraOp.time = globalTime;
                auraOp.th = f.groundH;
                auraOp.unitFrame = f;

                // 詠唱環（腰部高度的水平面）：懸空平面逐格繪製，前方較低的地塊不再蓋掉它，較高的前景照樣擋住；
                // 施法者那格的前半在 drawAura 補畫（排在施法者之後）。
                const ringR = drape && agent.hp > 0 ? UnitAuraPainter.ringRadius(agent) : 0;
                if (ringR > 0 && drape) {
                    drape.addPlane(UnitAuraPainter.drawRings, agent, f.footX, f.sortY, ringR,
                        f.groundH + UnitAuraPainter.RING_LIFT, f.hexUnderFoot.q, f.hexUnderFoot.r);
                }

                // AOE 地面預警：鋪在施法者腳下附近的每一格頂面（足跡 Y＝含轉場、不含高度與漂浮，GroundDrape 自己貼合各格）
                const aoeR = drape && f.agent.hp > 0 ? UnitRenderSystem.aoeIndicatorRadius(agent) : 0;
                if (aoeR > 0 && drape) drape.addPainted(UnitRenderSystem.paintAoeIndicator, agent, f.footX, f.sortY, aoeR * (1 + GROUND_DRAPE.AOE_INDICATOR_PAD));
            }
        }
    }

    public drawSilhouette(
        ctx: CanvasRenderingContext2D,
        frame: UnitFrame,
        globalTime: number,
        layout: HexLayout
    ) {
        const agent = frame.agent;
        if (agent.hp <= 0 || agent.fullyDead || agent.outOfBounds) return;
        this.drawAssembly(ctx, agent, frame.footX, frame.floorY, globalTime, false, true, layout, frame.groundH);
    }

    public drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean,
        layout: HexLayout,
        terrainHeight: number,
        frame: UnitFrame | null = null
    ) {
        ctx.save();
        ctx.translate(drawX, drawY);
        // 墜落（縮圈塌陷）：影子、本體、核心整組淡出；翻滾與縮小在 UnitBodyPainter
        const fall = agent.hp > 0 ? unitFallProgress(agent.physics.z) : 0;
        if (fall > 0) ctx.globalAlpha *= unitFallAlpha(fall);

        if (!isSilhouette) {
            if (agent.hp > 0) {
                UnitShadowPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, layout);
            } else {
                // [ARCH] 死亡單位使用 UnitDeathPainter 進行死亡動畫、擊飛與淡出繪製
                UnitDeathPainter.draw(ctx, agent, 0, 0, 1.0, globalTime);
            }
        }
        // 編輯模式拖曳預覽：只移動實體（棋座＋核心），角色投影放下後才回來
        const isDragPreview = agent.dragOverQ !== null || agent.dragOverR !== null;
        if (!isDragPreview) {
            UnitBodyPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, isSelected, 1.0, terrainHeight, frame);
        }
        // 核心寶石畫在角色之後：投影成形後藏在投影中心（淡色），否則是棋座上的實體寶石；位置與投射物起點同源（VisualMath.projectionCenterAt）
        if (!isSilhouette) {
            UnitCorePainter.draw(ctx, agent, globalTime, layout);
        }

        ctx.restore(); 
    }

    public drawAura(
        ctx: CanvasRenderingContext2D,
        agent: Agent,
        drawX: number,
        drawY: number,
        globalTime: number,
        layout: HexLayout,
        frame: UnitFrame | null = null
    ) {
        if (agent.hp <= 0 || agent.castingSkillIdx === -1) return;
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;

        ctx.save();
        ctx.translate(drawX, drawY);

        const surfaceY = 0; 
              
        // 1. Casting Auras
        if (skill.tag === 'ULT') {
            UnitAuraPainter.drawUltimateChantVFX(ctx, agent, 0, surfaceY, globalTime, layout);
        } else {
            UnitAuraPainter.drawCastingVFX(ctx, agent, 0, surfaceY, globalTime, layout);
        }

        // 詠唱環在施法者那格的前半（平面中心線以下）：裁切到該格在環平面高度上的六邊形，畫在施法者之後。
        // 其餘部分由 GroundDrapeLayer 逐格畫（submitRenderables 登記）。AOE 地面預警同樣走 GroundDrapeLayer。
        if (frame) {
            const ringY = -UnitAuraPainter.RING_LIFT;
            const hx = frame.hexCenterX - frame.footX;
            const hy = frame.hexCenterY - frame.footY + ringY;
            ctx.save();
            HexGeometry.traceHex(ctx, hx, hy, HEX_SIZE + GROUND_DRAPE.CLIP_EXPAND_PX, true, layout);
            ctx.clip();
            ctx.beginPath();
            ctx.rect(hx - HEX_SIZE * 2, ringY, HEX_SIZE * 4, HEX_SIZE * 2);
            ctx.clip();
            ctx.translate(0, ringY);
            ctx.globalCompositeOperation = GROUND_DRAPE.PLANE_BLEND;
            UnitAuraPainter.drawRings(ctx, agent, globalTime, layout);
            ctx.restore();
        }

        ctx.restore();
    }

    /** 施法中的 AOE 地面預警半徑（像素）；不是 AOE 回傳 0 */
    private static aoeIndicatorRadius(agent: Agent): number {
        const skill = agent.castingSkillIdx !== -1 ? agent.skills[agent.castingSkillIdx] : undefined;
        if (!skill || skill.type !== 'AOE') return 0;
        return Math.max(1, skill.aoeRadius || 1) * HEX_SIZE;
    }

    /** GroundDrapeLayer 的繪製函式：在原點（施法者腳下地平面）畫 AOE 預警。靜態參考，不每幀建立閉包。 */
    public static paintAoeIndicator(ctx: CanvasRenderingContext2D, agent: Agent, t: number, layout: HexLayout): void {
        const skill = agent.castingSkillIdx !== -1 ? agent.skills[agent.castingSkillIdx] : undefined;
        if (!skill || skill.type !== 'AOE') return;
        const progress = 1 - (agent.castTimer / skill.cast);
        UnitIndicatorPainter.drawAoeIndicator(ctx, skill, agent.team, t, progress, layout);
    }
}
