
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

function draw3DHexPrism(ctx: CanvasRenderingContext2D, t: number, color: string, height: number, radius: number) {
    // Legacy helper kept for Status Effects (Banish/Stasis) 
    // Ideally this should also use SurfaceAssets but status effects handle their own transforms peculiarly
    // So we keep this local for now or refactor later.
    const startAngle = Math.PI / 6 + Math.PI / 4;
    const r = radius;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    const pulse = 2 + Math.sin(t * 5) * 1.0;
    ctx.lineWidth = pulse;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const topVerts: {x: number, y: number}[] = [];
    const botVerts: {x: number, y: number}[] = [];
    
    for(let i=0; i<6; i++) {
        const angle = startAngle + i * Math.PI / 3 + t * 0.5; 
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * ISO_SCALE_Y;
        
        topVerts.push({x: x, y: y - height});
        botVerts.push({x: x, y: y});
    }
    
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for(let i=0; i<6; i++) {
        ctx.moveTo(topVerts[i].x, topVerts[i].y);
        ctx.lineTo(botVerts[i].x, botVerts[i].y);
    }
    ctx.stroke();
    
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(topVerts[0].x, topVerts[0].y);
    for(let i=1; i<6; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
    ctx.closePath();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(botVerts[0].x, botVerts[0].y);
    for(let i=1; i<6; i++) ctx.lineTo(botVerts[i].x, botVerts[i].y);
    ctx.closePath();
    ctx.stroke();
    
    const grad = ctx.createLinearGradient(0, -height, 0, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.2; 
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.restore();
}

export function drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    if (agent.hp <= 0) return;
    
    let statusId = 'NONE';
    if (agent.banished) statusId = 'BANISH';
    else if (agent.stunTimer > 0) statusId = 'STUN';
    else if (agent.silenceTimer > 0) statusId = 'SILENCE';
    else if (agent.visualStatus !== 'NONE') statusId = agent.visualStatus;

    if (statusId === 'NONE') return;

    if (statusId === 'BANISH' || statusId === 'STASIS') {
        const color = statusId === 'STASIS' ? '#facc15' : '#c084fc';
        ctx.save();
        ctx.translate(0, 0); 
        draw3DHexPrism(ctx, t, color, 120, 45); 
        ctx.restore();
        return;
    }

    if (statusId === 'STUN') {
        const color = '#facc15';
        const halo = VFXFactory.getTexture('HEX_HALO', color);
        ctx.save();
        ctx.translate(0, -90); 
        const float = Math.sin(t * 8) * 5;
        ctx.translate(0, float);
        ctx.globalCompositeOperation = 'screen';
        ctx.save();
        ctx.scale(1, 0.4); 
        ctx.rotate(t * 6); 
        const size1 = 60; 
        ctx.globalAlpha = 1.0; 
        ctx.drawImage(halo, -size1/2, -size1/2, size1, size1);
        ctx.restore();
        ctx.save();
        ctx.scale(1, 0.4);
        ctx.rotate(-t * 2); 
        const size2 = 90; 
        ctx.globalAlpha = 0.7;
        ctx.drawImage(halo, -size2/2, -size2/2, size2, size2);
        ctx.restore();
        ctx.restore();
        return;
    }

    if (statusId === 'SILENCE') {
        const color = '#94a3b8';
        const lock = VFXFactory.getTexture('HEX_LOCK', color);
        ctx.save();
        ctx.translate(0, -100); 
        const float = Math.sin(t * 3) * 3;
        ctx.translate(0, float);
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        const pulse = 1 + Math.sin(t * 5) * 0.1;
        const size = 48 * pulse; 
        ctx.drawImage(lock, -size/2, -size/2, size, size);
        ctx.restore();
        return;
    }
    
    if (statusId === 'FROZEN') {
        const glow = VFXFactory.getTexture('GLOW', '#bae6fd');
        ctx.save();
        ctx.translate(0, -40);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow, -50, -50, 100, 100);
        ctx.restore();
    }
}
