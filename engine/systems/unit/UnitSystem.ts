// ╔══════════════════════════════════════════════════════════╗
// ║  UnitRenderSystem — 單位渲染對外統一入口                ║
// ║  本檔負責：提交 RenderOp、座標轉換、層級調度            ║
// ║                                                          ║
// ║  繪圖實作位置：                                          ║
// ║  → engine/renderers/units/painters/                     ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { HexUtils, MapConfig } from "../../utils";
import { UnitVisualProcessor } from "./UnitVisualProcessor";
import { UnitBodyPainter } from "../../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../../renderers/units/painters/UnitShadowPainter";
import { UnitCorePainter } from "../../renderers/units/painters/UnitCorePainter";
import { UnitIndicatorPainter } from "../../renderers/units/painters/UnitIndicatorPainter";
import { UnitAuraPainter } from "../../renderers/units/painters/UnitAuraPainter";
import { UnitDeathPainter } from "../../renderers/units/painters/UnitDeathPainter";
import { computeDeathGround } from "../../../data/units/appearance/deathMotion";
import { HexLayout } from "../../../types";
import { VisualMath } from "../../math/VisualMath";
import { HEX_SIZE, TERRAIN_SORT_SCALE } from "../../../constants";

export class UnitRenderSystem {
    public submitRenderables(
        renderList: RenderList,
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig,
        transitionT: number = 0,
        transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE',
        simDt: number = 0.016,
        hasGround?: (q: number, r: number) => boolean
    ) {
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        agents.forEach(agent => {
            if (agent.fullyDead || agent.outOfBounds) return;
            const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, highlightAgent);
            
            const offset = VisualMath.getTransitionOffset(state.x, state.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) return;

            const op = renderList.next();
            op.type = agent.hp <= 0 ? RenderOpType.CORPSE : RenderOpType.UNIT;
            op.simDt = simDt;
            
            // 關鍵：將單位的當前邏輯網格位置傳入
            op.tq = agent.q; 
            op.tr = agent.r;
            let groundH = state.terrainHeight;
            op.th = groundH; 
            
            op.agent = agent;
            op.tx = state.x; 
            
            // Sort Y: Ground position for depth sorting
            op.y = state.y + offset; 

            // 擊飛中的屍體：滑行位移併入繪製位置與深度排序鍵，
            // 否則排序仍以死亡點計算，滑到前方時會被後排地塊／障礙物來回覆蓋而閃爍。
            if (agent.hp <= 0) {
                const knock = UnitDeathPainter.getKnockOffset(agent);
                op.tx += knock.x;
                op.y += knock.y;

                // 擊飛滑行是繪製位移，物理不知道屍體移動了：腳下高度要跟著滑到的那一格，
                // 滑出已塌陷的地塊（虛空）就從該刻起墜落（回收仍走原本的死亡計時，不新增寫入者）。
                if (hasGround) {
                    const v = UnitDeathPainter.getKnockVelocity(agent);
                    groundH = computeDeathGround(state.x, state.y, v.vx, v.vy, v.vz, agent.deathTimer, {
                        hexAt: (x, y) => HexUtils.fromPx(x, y, mapConfig),
                        hasGround,
                        heightAt: getTerrainHeight,
                    }).height;
                    op.th = groundH;
                }
            }
            
            // 深度鍵：單位腳下所在的格子必須排在該格地塊之後。地塊以格心 Y 排序，
            // 單位走過格界後（腳已在前方鄰格內）腳 Y 仍小於該格格心 Y，會被「之後才畫」的前方地塊蓋住下半身。
            // 因此把鍵抬到腳下格的格心線（只抬不降；同鍵時 subLayer 讓單位排在地塊之後）。
            // 以含繪製位移（physics 偏移、屍體擊飛）的腳點判斷，轉場位移 offset 不參與（地塊也套同一個 offset）。
            const footY = op.y - offset;
            const hexUnderFoot = HexUtils.fromPx(op.tx, footY, mapConfig);
            const hexCenterY = HexUtils.toPx(hexUnderFoot.q, hexUnderFoot.r, mapConfig).y;
            op.sortBias = Math.max(0, hexCenterY - footY);

            // Visual Y: Top of terrain (using SSOT Math)
            op.ty = VisualMath.getIsoVisualY(op.y, groundH);
            
            op.z = agent.physics.z; 
            op.time = globalTime;
            op.uSelected = state.isSelected;

            // [FIX] Submit separate Aura/Indicator op locked to ground if casting
            if (agent.castingSkillIdx !== -1) {
                const auraOp = renderList.next();
                auraOp.type = RenderOpType.AURA;
                auraOp.agent = agent;
                auraOp.tx = state.x;
                
                // [SSOT FIX] AURA sorting: incorporate terrain height to prevent being hidden by grid
                auraOp.y = state.y + offset + (state.terrainHeight * TERRAIN_SORT_SCALE);
                auraOp.sortBias = HEX_SIZE * 0.5; // Front-edge compensation

                auraOp.ty = VisualMath.getIsoVisualY(state.y + offset, state.terrainHeight);
                auraOp.time = globalTime;
                auraOp.th = state.terrainHeight;
            }
        });
    }

    public drawSilhouette(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        mapConfig: MapConfig
    ) {
        if (agent.hp <= 0 || agent.fullyDead || agent.outOfBounds) return;
        const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, null);
        const visualGroundY = VisualMath.getIsoVisualY(state.y, state.terrainHeight);
        this.drawAssembly(ctx, agent, state.x, visualGroundY, globalTime, false, true, mapConfig.layout, state.terrainHeight);
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
        simDt: number = 0.016
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
            UnitBodyPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, isSelected, 1.0, terrainHeight);
        }
        // 核心（懸浮晶體）畫在角色之後，永遠看得見；位置與投射物起點同源（VisualMath.coreAnchorAt）
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
