
import { Agent } from "../../../../game";
import { SpriteManager } from "../../../sprites";
import { UnitIndicatorPainter } from "./UnitIndicatorPainter";
import { MovementType } from "../../../../../types";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { VFXFactory } from "../../../graphics/VFXFactory";

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number, isSilhouette: boolean) {
        if (isSilhouette || agent.visualStatus === 'POLYMORPH') return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        
        // Calculate Surface Y (Where the shadow falls)
        // py passed here is Base Y. pz is Total Height.
        // We assume we want shadow at Surface.
        // We need the Terrain Height from somewhere. 
        // NOTE: UnitVisualProcessor calculates terrainHeight. 
        // pz = terrainHeight + physicsZ.
        // We can approximate surface if we don't have explicit terrainHeight here by assuming physicsZ is 0 if grounded.
        // BUT, for flying units, we need strict separation.
        // For now, we will assume 'py' passed to this function is the Base, 
        // and we need to draw at Base - TerrainHeight.
        // However, standard call signature in UnitRenderSystem passes 'th' which is 'totalHeight'.
        // Let's rely on the passed coordinates which are usually correct for the body.
        // BUT Shadows need to be on the floor.
        
        // Correction: UnitRenderSystem passes (px, py, pz) where py is BASE ground Y.
        // We need to subtract terrain height to get to the visual surface.
        // Since we don't have terrain height passed explicitly, we derive it:
        // terrainH = pz - agent.physics.z;
        const terrainH = Math.max(0, pz - agent.physics.z);
        const surfaceY = py - terrainH;

        ctx.save();
        ctx.translate(px, surfaceY); // Draw at SURFACE level
        
        // 1. Drop Shadow (Optimized)
        // Shadow shrinks as unit jumps high
        const jumpHeight = agent.physics.z;
        const shadowScale = Math.max(0.6, 1.0 - (jumpHeight / 400));
        const shadowAlpha = Math.max(0.2, 1.0 - (jumpHeight / 200));
        
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,0.5)'); 
        
        ctx.save();
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.drawImage(shadowBlob, -48, -24, 96, 48); 
        ctx.restore();

        // 2. Base Token (Stays on ground)
        // Token renders at Surface Level too.
        ctx.save();
        ctx.scale(shadowScale, shadowScale); // Scale token slightly if jumping? No, usually tokens stay flat.
        ctx.globalAlpha = shadowAlpha; // Fade token if jumping high?
        ctx.drawImage(assets.base, -64, -64); 
        ctx.restore();

        // 3. Class Icon (Anchored to ground)
        if (agent.hp > 0) {
            ctx.save();
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
        
        // 4. Casting Indicators (Surface Level)
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                const radius = skill.aoeRadius || 1;
                const isAOE = skill.type === 'AOE';
                const visualRadius = isAOE ? 0.8 : radius;
                UnitIndicatorPainter.drawSkillGroundIndicator(ctx, 0, 0, skill.color, t, progress, visualRadius, skill.tag, isAOE);
            }
        }

        ctx.restore();

        // 5. Flying Anchor Line (Draws from Surface UP to Body)
        if (agent.movementType === MovementType.FLYING && jumpHeight > 5) {
            // Draw relative to Surface
            UnitFlightPainter.drawFlyingAnchor(ctx, agent, t, px, surfaceY, jumpHeight);
        }
    }
};
