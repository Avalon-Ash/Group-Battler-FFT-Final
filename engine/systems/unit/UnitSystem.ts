// ╔══════════════════════════════════════════════════════════╗
// ║  UnitSystem — 單位系統對外統一入口                      ║
// ║  本檔負責：單位狀態更新統一入口、HP/MP 管理觸發         ║
// ║                                                          ║
// ║  子系統實作位置：                                        ║
// ║  → 詳見 unit/ 目錄下各子系統                            ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, GameEngine } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { MapConfig } from "../../utils";
import { UnitVisualProcessor } from "./UnitVisualProcessor";
import { UnitBodyPainter } from "../../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../../renderers/units/painters/UnitShadowPainter";
import { UnitIndicatorPainter } from "../../renderers/units/painters/UnitIndicatorPainter";
import { UnitAuraPainter } from "../../renderers/units/painters/UnitAuraPainter";
import { UnitDeathPainter } from "../../renderers/units/painters/UnitDeathPainter";
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
        simDt: number = 0.016
    ) {
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        agents.forEach(agent => {
            if (agent.fullyDead) return;
            const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, highlightAgent);
            
            const offset = VisualMath.getTransitionOffset(state.x, state.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) return;

            const op = renderList.next();
            op.type = agent.hp <= 0 ? RenderOpType.CORPSE : RenderOpType.UNIT;
            op.simDt = simDt;
            
            // 關鍵：將單位的當前邏輯網格位置傳入
            op.tq = agent.q; 
            op.tr = agent.r;
            op.th = state.terrainHeight; 
            
            op.agent = agent;
            op.tx = state.x; 
            
            // Sort Y: Ground position for depth sorting
            op.y = state.y + offset; 
            
            // Visual Y: Top of terrain (using SSOT Math)
            op.ty = VisualMath.getIsoVisualY(op.y, state.terrainHeight);
            
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
                // Dead units use ragdoll drawing
                UnitDeathPainter.draw(ctx, agent, 0, 0, 1.0, globalTime, { layout } as any, terrainHeight, simDt);
            }
        }
        UnitBodyPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, isSelected, 1.0, terrainHeight);

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
