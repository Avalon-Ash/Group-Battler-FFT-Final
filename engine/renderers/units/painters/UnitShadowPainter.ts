
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
        
        ctx.save();
        ctx.translate(px, py); // Ground Level
        
        // 1. Drop Shadow (Optimized: Use Cached Blob)
        const shadowScale = Math.max(0.6, 1.0 - (pz / 400));
        const shadowAlpha = Math.max(0.2, 1.0 - (pz / 200));
        
        // Reuse VFXFactory for generic shadow blob
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,0.5)'); 
        
        ctx.save();
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        // Shadow Blob is 64x64, unit base is 128x128 approx visual weight
        // Scale it up
        ctx.drawImage(shadowBlob, -48, -24, 96, 48); 
        ctx.restore();

        // 2. Base Token (Falls backward if flying? No, base usually stays on ground or fades)
        // Design Choice: Base stays on ground, unit floats above it.
        ctx.save();
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.drawImage(assets.base, -64, -64); 
        ctx.restore();

        // 3. Class Icon (Anchored to ground, breathing effect)
        if (agent.hp > 0) {
            ctx.save();
            const iconBaseY = -24; 
            ctx.translate(0, iconBaseY);
            const breath = Math.sin(t * 2) * 1.5;
            ctx.translate(0, breath);

            // Dark backing for icon visibility
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 1.0; 
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
            ctx.drawImage(assets.icon, -32, -32, 64, 64);
            ctx.restore();
        }
        
        // 4. Casting Indicators (Ground Level)
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

        // 5. Flying Anchor Line (If high up)
        if (agent.movementType === MovementType.FLYING && pz > 5) {
            UnitFlightPainter.drawFlyingAnchor(ctx, agent, t, px, py, pz);
        }
    }
};
