
import { Agent, GameEngine } from "../game";
import { RenderList, RenderOpType } from "../renderers/RenderList";
import { MapConfig } from "../utils";
import { UnitVisualProcessor } from "./unit/UnitVisualProcessor";
import { UnitBodyPainter } from "../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../renderers/units/painters/UnitShadowPainter";
import { HexLayout } from "../../types";
import { VisualMath } from "../math/VisualMath";

export class UnitRenderSystem {
    public submitRenderables(
        renderList: RenderList,
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig,
        transitionT: number = 0,
        transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE'
    ) {
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        agents.forEach(agent => {
            if (agent.hp <= 0) return;
            const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, highlightAgent);
            
            const offset = VisualMath.getTransitionOffset(state.x, state.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) return;

            const op = renderList.next();
            op.type = RenderOpType.UNIT;
            
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
        terrainHeight: number
    ) {
        ctx.save();
        ctx.translate(drawX, drawY); 
        
        // drawY is expected to be the Surface Visual Y.
        // Painters will internally read agent.physics.z via VisualMath to calculate offsets.
        
        if (!isSilhouette && agent.hp > 0) {
            UnitShadowPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, layout);
        }
        UnitBodyPainter.draw(ctx, agent, 0, 0, globalTime, isSilhouette, isSelected, 1.0, terrainHeight);
        
        ctx.restore(); 
    }
}
