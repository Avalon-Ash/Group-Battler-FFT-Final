
import { Agent, GameEngine } from "../game";
import { Role, Team } from "../../types";
import { RenderList, RenderOpType } from "../renderers/RenderList";
import { HEX_SIZE } from "../../constants";
import { HexUtils, MapConfig } from "../utils";

// Painters
import { UnitShadowPainter } from "../renderers/units/painters/UnitShadowPainter";
import { UnitBodyPainter } from "../renderers/units/painters/UnitBodyPainter";

// Visual Constants
const MAX_UNIT_SIZE_RATIO = 0.85; 
const UNIT_REFERENCE_HEIGHT = 100; 

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

            // --- VISUAL INTERPOLATION (Optimized) ---
            // We calculate this once per frame here, instead of recalculating in shadow/body/silhouette passes.
            // In a more advanced system, this would be stored on the Agent struct during a Pre-Render Tick.
            
            let terrainH = 0;
            if (agent.isMoving && agent.path.length > 0) {
                const h1 = getTerrainHeight(agent.q, agent.r);
                const nextHex = agent.path[0];
                const h2 = getTerrainHeight(nextHex.q, nextHex.r);
                terrainH = HexUtils.lerp(h1, h2, agent.moveProgress);
            } else {
                // Smoothing for micro-movements (knockback slide)
                // If sliding significantly, sample the pixel position.
                // Otherwise, stick to grid height for stability.
                const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
                const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
                
                if (distSq > 400) { // 20px tolerance
                    const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                    terrainH = getTerrainHeight(visualHex.q, visualHex.r);
                } else {
                    terrainH = getTerrainHeight(agent.q, agent.r);
                }
            }

            const visualGroundY = agent.py - terrainH;
            
            const op = renderList.next();
            op.type = RenderOpType.UNIT;
            
            // Sort by ground Y for correct occlusion
            op.y = agent.py + 1; 
            op.z = 10;
            
            op.agent = agent;
            op.tx = agent.px; 
            op.ty = visualGroundY;  
            op.th = terrainH; // Passed to draw calls
            op.time = globalTime;
            op.uSelected = (highlightAgent === agent);
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
        // Recalculate height needed for silhouette pass (redundant calc, but robust)
        // Optimization: In RenderList based silhouette pass, we could store 'th' in a map?
        // For now, re-calc is cheap enough for just occluded units.
        let terrainH = 0;
        if (agent.isMoving && agent.path.length > 0) {
            const h1 = getTerrainHeight(agent.q, agent.r);
            const nextHex = agent.path[0];
            const h2 = getTerrainHeight(nextHex.q, nextHex.r);
            terrainH = HexUtils.lerp(h1, h2, agent.moveProgress);
        } else {
            terrainH = getTerrainHeight(agent.q, agent.r);
        }
        
        const visualGroundY = agent.py - terrainH;
        this.drawAssembly(ctx, agent, agent.px, visualGroundY, globalTime, false, true);
    }

    public drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean
    ) {
        // 1. Calculate Scale based on Role
        const maxDimension = HEX_SIZE * 2 * MAX_UNIT_SIZE_RATIO;
        let roleScaleMod = 1.0;
        switch(agent.role) {
            case Role.TANK: roleScaleMod = 1.25; break; 
            case Role.WARRIOR: roleScaleMod = 1.1; break; 
            case Role.RANGER: roleScaleMod = 0.9; break; 
            case Role.MAGE: roleScaleMod = 0.9; break; 
            case Role.SUPPORT: roleScaleMod = 0.95; break;
        }
        const scaleFactor = (maxDimension / UNIT_REFERENCE_HEIGHT) * roleScaleMod;

        // 2. Global Transform for this Unit
        ctx.save();
        ctx.translate(drawX, drawY); 
        ctx.scale(scaleFactor, scaleFactor);

        // We work in local coordinates now (0,0 is ground anchor)
        // Physics coordinates are relative to the unit's logical position, 
        // but here we are already at the interpolated pixel position (drawX, drawY).
        // The agent.physics x/y are spring offsets (jitter), z is height.
        const physX = agent.physics.x / scaleFactor;
        const physY = agent.physics.y / scaleFactor;
        const physZ = agent.physics.z / scaleFactor; 

        // 3. Draw Shadow & Base (Ground Layer)
        if (!isSilhouette && agent.hp > 0) {
            UnitShadowPainter.draw(ctx, agent, physX, physY, physZ, globalTime, isSilhouette);
        }

        // 4. Draw Body (Elevated Layer)
        UnitBodyPainter.draw(ctx, agent, physX, physY, physZ, globalTime, isSilhouette, isSelected, scaleFactor);

        ctx.restore(); 
    }
}
