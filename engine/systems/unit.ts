import { Agent, GameEngine } from "../game";
import { RenderList, RenderOpType } from "../renderers/RenderList";
import { MapConfig } from "../utils";
import { UnitVisualProcessor } from "./unit/UnitVisualProcessor";
import { UnitBodyPainter } from "../renderers/units/painters/UnitBodyPainter";
import { UnitShadowPainter } from "../renderers/units/painters/UnitShadowPainter";
export class UnitRenderSystem {
    public submitRenderables(
        renderList: RenderList,
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig
    ) {
        agents.forEach(agent => {
            if (agent.hp <= 0 && agent.fullyDead) return;
            const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, highlightAgent);
            const op = renderList.next();
            op.type = RenderOpType.UNIT;
            op.y = state.sortY + 1; 
            op.z = 10;
            op.agent = agent;
            op.tx = state.x; 
            op.ty = state.y - state.terrainHeight;
            op.th = agent.physics.z; 
            op.time = globalTime;
            op.uSelected = state.isSelected;
            op.uSilhouette = false;
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
        const visualGroundY = state.y - state.terrainHeight;
        this.drawAssembly(ctx, agent, state.x, visualGroundY, agent.physics.z, globalTime, false, true);
    }
    public drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        localZ: number,
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean
    ) {
        const scaleFactor = 1.0; 
        ctx.save();
        ctx.translate(drawX, drawY); 
        if (!isSilhouette && agent.hp > 0) {
            UnitShadowPainter.draw(ctx, agent, 0, 0, localZ, globalTime, isSilhouette);
        }
        UnitBodyPainter.draw(ctx, agent, 0, 0, localZ, globalTime, isSilhouette, isSelected, scaleFactor);
        ctx.restore(); 
    }
}