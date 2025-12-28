
import { Agent } from "../../../../game";
import { SpriteManager } from "../../../sprites";
import { UnitIndicatorPainter } from "./UnitIndicatorPainter";
import { MovementType } from "../../../../../types";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { VFXFactory } from "../../../graphics/VFXFactory";

// Lift the physical token slightly to avoid z-fighting with the floor
const HOVER_LIFT = 6; 

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number, isSilhouette: boolean) {
        if (isSilhouette || agent.visualStatus === 'POLYMORPH') return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        
        // Calculate Surface Y (Where the shadow falls)
        // UnitRenderSystem passes (px, py, pz) where py is BASE ground Y.
        // We calculate terrainH to find the visual surface top.
        const terrainH = Math.max(0, pz - agent.physics.z);
        const surfaceY = py - terrainH;

        // The Token sits slightly above the surface
        const tokenY = surfaceY - HOVER_LIFT;

        ctx.save();
        
        // 1. Drop Shadow (Stays firmly on the floor surface)
        // Shadow shrinks as unit jumps high
        const jumpHeight = agent.physics.z;
        const shadowScale = Math.max(0.6, 1.0 - (jumpHeight / 400));
        const shadowAlpha = Math.max(0.2, 1.0 - (jumpHeight / 200));
        
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,0.5)'); 
        
        ctx.save();
        ctx.translate(px, surfaceY); 
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.drawImage(shadowBlob, -48, -24, 96, 48); 
        ctx.restore();

        // 2. Base Token (Lifted)
        ctx.save();
        ctx.translate(px, tokenY);
        // Only scale token if it's actually jumping significantly, otherwise it looks stable
        // We don't scale the token with jump height usually to keep it readable as a game piece
        ctx.drawImage(assets.base, -64, -64); 
        ctx.restore();

        // 3. Class Icon (Anchored to Token)
        if (agent.hp > 0) {
            ctx.save();
            ctx.translate(px, tokenY);
            
            const iconBaseY = -20; 
            ctx.translate(0, iconBaseY);
            const breath = Math.sin(t * 2) * 1.5;
            ctx.translate(0, breath);

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 1.0; 
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
            ctx.drawImage(assets.icon, -32, -32, 64, 64);
            ctx.restore();
        }
        
        // 4. Casting Indicators (Projected on Surface)
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                const radius = skill.aoeRadius || 1;
                const isAOE = skill.type === 'AOE';
                const visualRadius = isAOE ? 0.8 : radius;
                
                // Indicators sit on the surface, not lifted
                ctx.save();
                ctx.translate(px, surfaceY);
                UnitIndicatorPainter.drawSkillGroundIndicator(ctx, 0, 0, skill.color, t, progress, visualRadius, skill.tag, isAOE);
                ctx.restore();
            }
        }

        // 5. Flying Anchor Line (Draws from Surface UP to Body)
        if (agent.movementType === MovementType.FLYING && jumpHeight > 5) {
            // Draw relative to Surface
            UnitFlightPainter.drawFlyingAnchor(ctx, agent, t, px, surfaceY, jumpHeight);
        }
        
        ctx.restore();
    }
};
