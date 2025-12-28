
import { Agent } from "../../game";
import { Team } from "../../../types";
import { HEX_SIZE, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../../constants";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { AssetManager } from "../../assets";
import { VFXFactory } from "../../graphics/VFXFactory";

// ... (Keep existing imports and functions up to drawDomainExpansion) ...

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

export function drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
    if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (skill) {
            ctx.save();
            ctx.translate(0, -110);
            const bg = VFXFactory.getTexture('GLOW', skill.color);
            ctx.globalAlpha = 0.6;
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bg, -30, -30, 60, 60);
            ctx.restore();
        }
    }
}

export function drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    if (agent.hp <= 0) return;
    
    // Priority Status Drawing
    // We check specific conditions and draw the corresponding VFX
    
    // 1. ROOT (Chains at feet)
    if (agent.rootTimer > 0) {
        const color = '#fbbf24'; // Amber chains
        ctx.save();
        ctx.translate(0, 40); // Ground level
        // Draw 3 Spikes
        for(let i=0; i<3; i++) {
            const angle = i * (Math.PI*2/3) + t;
            const r = 15;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r * ISO_SCALE_Y;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py - 30); // Spike Up
            ctx.lineTo(px + 5, py);
            ctx.fillStyle = color;
            ctx.globalCompositeOperation = 'overlay';
            ctx.fill();
        }
        
        // Ring
        SurfaceAssets.drawHexRipple(ctx, 0, 0, 20, color, 0.8, 2);
        ctx.restore();
    }

    // 2. SHIELD (Rotating Prism Shell)
    if (agent.shield > 0) {
        // Shield color depends on team or generic
        const color = agent.team === Team.BLUE ? '#bae6fd' : '#f87171';
        const pulse = 0.3 + Math.sin(t * 2) * 0.1;
        
        ctx.save();
        ctx.translate(0, 40); // Ground level anchor for Prism
        ctx.globalCompositeOperation = 'screen';
        
        // Rotating shell
        ctx.save();
        // Since Prism drawing is static, we can't rotate it easily without 3D math.
        // Instead, we just draw the prism with pulsing opacity to simulate field.
        SurfaceAssets.draw3DPrism(ctx, 0, 0, 35, 90, color, pulse, 'SOLID');
        ctx.restore();
        
        // Inner brighter rim
        SurfaceAssets.drawHexRipple(ctx, 0, -45, 30, color, 0.5, 2);
        
        ctx.restore();
    }

    // 3. BANISH / STASIS (Full Encapsulation)
    if (agent.banished) {
        const color = agent.visualStatus === 'STASIS' ? '#facc15' : '#c084fc';
        const pulse = 0.5 + Math.sin(t * 3) * 0.2;
        
        ctx.save();
        ctx.translate(0, 40); 
        // Use standard Prism for consistent look
        // Height 100 covers the unit comfortably
        SurfaceAssets.draw3DPrism(ctx, 0, 0, 40, 100, color, pulse, 'SOLID');
        ctx.restore();
        return; // Banish hides other effects
    }

    // 4. OVERHEAD ICONS (Stun, Silence, Fear, Taunt, Blind)
    let iconType = '';
    let iconColor = '#fff';
    
    if (agent.stunTimer > 0) { iconType = 'STUN'; iconColor = '#facc15'; }
    else if (agent.fearTimer > 0) { iconType = 'FEAR'; iconColor = '#a855f7'; }
    else if (agent.tauntTimer > 0) { iconType = 'TAUNT'; iconColor = '#ef4444'; }
    else if (agent.silenceTimer > 0) { iconType = 'SILENCE'; iconColor = '#94a3b8'; }
    else if (agent.blindTimer > 0) { iconType = 'BLIND'; iconColor = '#cbd5e1'; }

    if (iconType) {
        const def = STATUS_VISUALS[iconType];
        const shape = def.iconShape;
        const color = def.primaryColor;
        
        ctx.save();
        ctx.translate(0, -95); // Head height + padding
        
        // Float animation
        const float = Math.sin(t * 5) * 4;
        ctx.translate(0, float);
        
        // Draw the specific icon from AssetManager/UIFactory logic
        // Since UnitVisuals usually calls factories, we can do manual drawing here or helper
        // Let's use the Factory texture for consistency
        const icon = AssetManager.getStatusIcon(iconType);
        
        ctx.scale(0.8, 0.8); // Scale down slightly for overhead
        ctx.drawImage(icon, -24, -24, 48, 48);
        
        ctx.restore();
    }
}
