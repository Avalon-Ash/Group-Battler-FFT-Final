// ╔══════════════════════════════════════════════════════════╗
// ║  UnitRenderSystem — 單位渲染對外統一入口                ║
// ║  本檔負責：提交 RenderOp、座標轉換、層級調度            ║
// ║                                                          ║
// ║  繪圖實作位置：                                          ║
// ║  → engine/renderers/units/painters/                     ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §2、§3、§4：║
// ║  op 的 tx／y／ty／th／sortBias 一律讀 UnitFrame（每幀快照，  ║
// ║  engine/renderers/frame/UnitFrame.ts），本檔不再取得地形高度，║
// ║  也不自己算腳點、腳下格或擊飛位移。                        ║
// ║  UNIT op 帶著 UnitFrame（op.unitFrame），drawAssembly 轉給    ║
// ║  UnitBodyPainter 畫衝刺殘影（RenderSpec §10）。              ║
// ║  AURA（施法光環）是掛在施法者身上的空中效果：y＝濾波後足跡  ║
// ║  Y（UnitFrame.sortFootY）、sortBias＝AIR_SORT_BIAS，不含高度。║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { UnitFrame, UnitFrameStore } from "../../renderers/frame/UnitFrame";
import { UnitBodyPainter } from "../../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../../renderers/units/painters/UnitShadowPainter";
import { UnitCorePainter } from "../../renderers/units/painters/UnitCorePainter";
import { UnitIndicatorPainter } from "../../renderers/units/painters/UnitIndicatorPainter";
import { UnitAuraPainter } from "../../renderers/units/painters/UnitAuraPainter";
import { UnitDeathPainter } from "../../renderers/units/painters/UnitDeathPainter";
import { HexLayout } from "../../../types";
import { VFX_RENDER } from "../../../constants";

export class UnitRenderSystem {
    public submitRenderables(
        renderList: RenderList,
        frames: UnitFrameStore,
        globalTime: number,
        highlightAgent: Agent | null,
        simDt: number = 0.016
    ) {
        const list = frames.list;
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            if (!f.visible) continue;
            const agent = f.agent;

            const op = renderList.next();
            op.type = f.isCorpse ? RenderOpType.CORPSE : RenderOpType.UNIT;
            op.simDt = simDt;

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
        simDt: number = 0.016,
        frame: UnitFrame | null = null
    ) {
        ctx.save();
        ctx.translate(drawX, drawY);
        
        if (!isSilhouette) {
            if (agent.hp > 0) {
                UnitShadowPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, layout);
            } else {
                // [ARCH] 死亡單位使用 UnitDeathPainter 進行死亡動畫、擊飛與淡出繪製
                UnitDeathPainter.draw(ctx, agent, 0, 0, 1.0, globalTime, { layout }, terrainHeight, simDt);
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
        layout: HexLayout
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

        // 2. AOE Ground Indicators
        const progress = 1 - (agent.castTimer / skill.cast);
        const radius = skill.aoeRadius || 1;
        const isAOE = skill.type === 'AOE';
              
        if (isAOE && radius > 0) {
            UnitIndicatorPainter.drawSkillGroundIndicator(ctx, 0, surfaceY, skill.color, globalTime, progress, radius, skill.tag, isAOE, layout);
        }

        ctx.restore();
    }
}
