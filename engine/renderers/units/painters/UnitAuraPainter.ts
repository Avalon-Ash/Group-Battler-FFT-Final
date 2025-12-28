
import { Agent } from "../../../game";
import { ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../../../constants";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const UnitAuraPainter = {
    
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        ctx.translate(0, -50); 
        
        const ring = VFXFactory.getTexture('HEX_HALO', color);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.8 * progress;
        
        ctx.save();
        ctx.scale(1, 0.4); 
        ctx.rotate(t * 3); 
        const size = 64 * (0.8 + progress * 0.2);
        ctx.drawImage(ring, -size/2, -size/2, size, size);
        ctx.restore();

        const glow = VFXFactory.getTexture('GLOW', color);
        const coreSize = 32 * progress;
        ctx.drawImage(glow, -coreSize/2, -coreSize/2, coreSize, coreSize);

        ctx.restore();

        // If AOE, draw ground expansion
        if (skill.type === 'AOE') {
            this.drawDomainExpansion(ctx, agent, t, color, progress);
        }
    },

    drawDomainExpansion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, color: string, progress: number) {
        // Large Ground Ripple
        const texture = VFXFactory.getTexture('SHOCKWAVE', color); 
        ctx.save();
        // Move to feet
        ctx.translate(0, UNIT_BODY_OFFSET); 
        ctx.scale(1, ISO_SCALE_Y); 
        
        // Scale up massively
        const scale = (0.5 + progress * 2.5) * 4.0; 
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - progress) * 0.3; // Fade as it gets huge
        
        const size = 64 * scale;
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        // 1. Magic Circle (Spinning)
        const texture = VFXFactory.getTexture('MAGIC_CIRCLE', color);
        ctx.save();
        ctx.translate(0, -60); 
        const rot = t * (2 + progress * 5);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6 + progress * 0.4;
        ctx.save();
        ctx.scale(1, 0.4); 
        ctx.rotate(rot);
        const size = 120;
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
        
        // 2. Rising Energy
        const glow = VFXFactory.getTexture('GLOW', color);
        ctx.globalAlpha = 0.5 * progress;
        ctx.scale(0.5, 1.5); 
        ctx.drawImage(glow, -40, -40 - (progress * 50), 80, 80);
        ctx.restore();

        // 3. 3D Domain Expansion (Volumetric)
        ctx.save();
        ctx.translate(0, 40); // Move to ground
        
        const domainSize = 200 * progress;
        VolumePainter.draw3DPrism(ctx, 0, 0, domainSize, 20, color, 0.3 * progress, 'SOLID');
        
        ctx.restore();
    }
};
