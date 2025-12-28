
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

            // 1. Process Logic -> State
            const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, highlightAgent);

            const op = renderList.next();
            op.type = RenderOpType.UNIT;
            
            // Sort by calculated SortY (Safe Max Y approach)
            // Add +1 to ensure it draws slightly in front of the terrain block if positions are identical
            op.y = state.sortY + 1; 
            op.z = 10;
            
            op.agent = agent;
            
            // ALIGNMENT FIX:
            // state.x / state.y = Physical Ground Coordinates (Base of block)
            // state.terrainHeight = Height of block
            // visualGroundTop = state.y - state.terrainHeight
            
            op.tx = state.x; 
            op.ty = state.y - state.terrainHeight; // Anchor Visuals to TOP of block
            
            // Pass LOCAL Physics Z to painter, NOT Total Z.
            // Painter will translate(0, -pz).
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
        // Recalculate state just for the silhouette pass
        const state = UnitVisualProcessor.process(agent, getTerrainHeight, mapConfig, null);
        
        // Use consistent alignment
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

        // Global Transform for this Unit
        ctx.save();
        
        // Move to Visual Ground Top (drawX, drawY)
        ctx.translate(drawX, drawY); 

        // 1. Draw Shadow & Base (At Ground Level)
        // Passes localZ so shadow can scale based on jump height
        if (!isSilhouette && agent.hp > 0) {
            UnitShadowPainter.draw(ctx, agent, 0, 0, localZ, globalTime, isSilhouette);
        }

        // 2. Draw Body (Elevated Layer)
        // UnitBodyPainter handles the `translate(0, -localZ)` internally
        UnitBodyPainter.draw(ctx, agent, 0, 0, localZ, globalTime, isSilhouette, isSelected, scaleFactor);

        ctx.restore(); 
    }
}
