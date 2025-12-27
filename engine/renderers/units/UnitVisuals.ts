
import { Agent } from "../../game";
import { Team } from "../../../types";
import { HEX_SIZE } from "../../../constants";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";

export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.deathSpiritColor; 
    
    const feetX = Math.round(physX);
    const feetY = Math.round(physY - physZ); 
    
    ctx.save();
    
    ctx.lineDashOffset = -t * 20;
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    // REPLACED: Use SurfaceAssets to guarantee this matches the grid exactly
    SurfaceAssets.traceHex(ctx, feetX, feetY, 18);
    ctx.stroke();
    
    ctx.setLineDash([]);

    if (physZ > 5) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); 
        ctx.moveTo(feetX, feetY); 
        ctx.lineTo(feetX, feetY + physZ); // Line to ground
        ctx.stroke(); 
    }
    ctx.restore();
}

export function drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.flightTrailColor;

    ctx.save();
    ctx.translate(0, 5); 
    ctx.scale(1, 0.5); 
    ctx.rotate(t * 8); 
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; 
    
    ctx.beginPath();
    for(let i=0; i<6; i++) {
        const a = i * Math.PI / 3;
        const x = Math.cos(a) * 15;
        const y = Math.sin(a) * 15;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

export function drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    
    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const orbitRadius = 25;
    for (let i = 0; i < 3; i++) {
        const offset = i * (Math.PI * 2 / 3);
        const ox = Math.round(Math.cos(t * 6 + offset) * orbitRadius);
        const oy = Math.round(Math.sin(t * 6 + offset) * orbitRadius * 0.5) - 35;
        
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(t * 10);
        
        ctx.beginPath();
        for(let j=0; j<6; j++) {
            const a = j * Math.PI / 3;
            const r = 4 * progress;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if(j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();

    if (skill.type === 'AOE') {
        drawDomainExpansion(ctx, agent, t, color, progress);
    }
}

export function drawDomainExpansion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, color: string, progress: number) {
    ctx.save();
    ctx.translate(0, -40); 
    const scale = 0.5 + progress * 0.5;
    ctx.scale(scale, scale); 
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalCompositeOperation = 'screen';
    
    ctx.save();
    ctx.rotate(t * 2);
    ctx.beginPath();
    const r = 60;
    for(let i=0; i<6; i++) {
        const a = i * Math.PI / 3;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.6;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    
    ctx.restore();
}

export function drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;

    ctx.save();
    ctx.translate(0, -40); 
    const size = Math.round(50 * (0.2 + progress * 0.8));
    ctx.globalCompositeOperation = 'screen';
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    SurfaceAssets.traceHex(ctx, 0, 0, size); ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    SurfaceAssets.traceHex(ctx, 0, 0, size * 0.6); ctx.fill();

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
    ctx.save();
    // Do NOT translate context. Use x,y directly.
    
    const maxPx = Math.max(1, skillRadius) * HEX_SIZE;
    const currentRadius = maxPx * progress;

    // --- LAYER 1: BASE FIELD (Hex Fill) ---
    // REPLACED: Use SurfaceAssets for perfect alignment
    SurfaceAssets.traceHex(ctx, x, y, currentRadius);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35; 
    ctx.fill();

    // --- LAYER 2: ENERGY RIM (Hex Glow) ---
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    SurfaceAssets.traceHex(ctx, x, y, currentRadius);
    ctx.stroke();
    ctx.restore();

    // --- LAYER 3: RUNIC BORDER (Static dashed) ---
    ctx.save();
    ctx.strokeStyle = '#fff'; 
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]); 
    ctx.globalAlpha = 0.8;
    
    const pulse = 1 + Math.sin(t * 10) * 0.05;
    SurfaceAssets.traceHex(ctx, x, y, (currentRadius + 2) * pulse);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
}

export function drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
    if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (skill) {
            ctx.save();
            ctx.translate(0, Math.round(-110));
            
            ctx.globalAlpha = 0.3 * (0.5 + Math.sin(t * 10) * 0.1);
            ctx.fillStyle = skill.color;
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const a = i * Math.PI/3;
                const x = Math.cos(a)*40;
                const y = Math.sin(a)*40; 
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }
}

export function drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    if (agent.hp <= 0) return;
    
    let statusId = 'NONE';
    if (agent.banished) statusId = 'BANISH';
    else if (agent.stunTimer > 0) statusId = 'STUN';
    else if (agent.silenceTimer > 0) statusId = 'SILENCE';
    
    if (agent.visualStatus !== 'NONE') statusId = agent.visualStatus;

    const def = STATUS_VISUALS[statusId];
    if (!def || def.overheadType === 'NONE') return;

    ctx.save();
    if (agent.facing < 0) ctx.scale(-1, 1);
    
    ctx.translate(0, Math.round(-65));

    if (def.overheadType === 'STAR_SPIN') {
        const angle = t * 5;
        const x = Math.round(Math.cos(angle) * 20);
        const y = Math.round(Math.sin(angle) * 6); 
        ctx.fillStyle = def.primaryColor;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 10);
        ctx.beginPath();
        for(let i=0; i<5; i++) {
            const a = i * Math.PI * 2 / 5;
            const rx = Math.cos(a) * 4;
            const ry = Math.sin(a) * 4;
            if(i===0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.fill();
        ctx.restore();
    } else if (def.overheadType === 'BUBBLE_POP') {
        const scale = 1 + Math.sin(t * 3) * 0.1;
        ctx.scale(scale, scale);
        ctx.fillStyle = def.primaryColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (def.overheadType === 'GHOST_FLOAT') {
        const float = Math.sin(t * 2) * 5;
        ctx.translate(0, float);
        ctx.fillStyle = def.primaryColor;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}
