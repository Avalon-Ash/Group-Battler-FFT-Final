
import { Agent } from "../../game";
import { Team } from "../../../types";
import { HEX_SIZE, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../../constants";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { VFXFactory } from "../../graphics/VFXFactory";

// =========================================================================================
// 🦴 UNIT BODY VISUALS (Pure Geometry & Animation)
// 
// Responsible ONLY for:
// 1. Casting Animations (Chant circles)
// 2. Flight/Hover Effects
// 3. Skill Indicators (Ground decals)
//
// MOVED OUT: Status Effects -> StatusRenderLayer.ts
// =========================================================================================

export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.deathSpiritColor; 
    
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, physZ);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); 
    grad.addColorStop(0.5, color);        
    grad.addColorStop(1, 'rgba(0,0,0,0)'); 
    
    ctx.globalAlpha = 0.3 + Math.sin(t * 5) * 0.1;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    
    const w = 4;
    ctx.fillRect(-w/2, 0, w, physZ);
    
    ctx.translate(0, physZ);
    ctx.scale(1, ISO_SCALE_Y); 
    
    const glow = VFXFactory.getTexture('GLOW', color);
    const sz = 32;
    ctx.drawImage(glow, -sz/2, -sz/2, sz, sz);

    ctx.restore();
}

export function drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.flightTrailColor;
    const glow = VFXFactory.getTexture('GLOW', color);

    ctx.save();
    ctx.translate(0, 10); 
    
    for(let i = -1; i <= 1; i += 2) {
        ctx.save();
        const offsetX = i * 10;
        const pulse = Math.sin(t * 20 + i) * 0.2 + 0.8;
        ctx.translate(offsetX, 0);
        ctx.scale(0.5 * pulse, 1.0 * pulse);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow, -16, 0, 32, 48); 
        ctx.restore();
    }
    ctx.restore();
}

export function drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
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
        drawDomainExpansion(ctx, agent, t, color, progress);
    }
}

export function drawDomainExpansion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, color: string, progress: number) {
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
}

export function drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
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
    // Use the new 3D prism for casting
    SurfaceAssets.draw3DPrism(ctx, 0, 0, domainSize, 20, color, 0.3 * progress, 'SOLID');
    
    ctx.restore();
}

export function drawSkillGroundIndicator(
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    color: string, 
    t: number, 
    progress: number, 
    skillRadius: number, 
    type: string, 
    isAOE: boolean
) {
    const pixelRadius = Math.max(1, skillRadius) * HEX_SIZE;
    const currentRadius = pixelRadius * progress;
    const opacity = 0.3 + Math.sin(t * 5) * 0.1;

    // Use volumetric for local skill indicator too
    SurfaceAssets.drawVolumetricHex(ctx, 0, 0, currentRadius, color, opacity);
    
    const ringSize = currentRadius * 2.5; 
    const ring = VFXFactory.getTexture('RING', color);
    
    ctx.save();
    ctx.scale(1, ISO_SCALE_Y); 
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = opacity * 1.2;
    ctx.drawImage(ring, -ringSize/2, -ringSize/2, ringSize, ringSize);
    ctx.restore();
}
