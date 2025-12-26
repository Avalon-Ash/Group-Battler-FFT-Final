
import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { SpriteManager } from "../../sprites";
import { Team } from "../../../types";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";

// =================================================================================
// 🧚 UNIT VISUAL EFFECTS (Flight, Casting, Status)
// =================================================================================

export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const isBlue = agent.team === Team.BLUE;
    const color = isBlue ? '#60a5fa' : '#f87171';
    
    const feetX = physX;
    const feetY = physY - physZ; 
    
    ctx.save();

    // 1. Ground Anchor (The Base)
    ctx.save();
    ctx.scale(1, 0.58); 
    ctx.lineDashOffset = -t * 20;
    
    // Outer dashed ring (Tech style)
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner solid ring/plate
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Holographic Tether (The Lift)
    if (physZ > 5) {
        const grad = ctx.createLinearGradient(0, 0, feetX, feetY);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent'); 

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(feetX, feetY);
        ctx.stroke();

        const pulseCount = 3;
        ctx.fillStyle = isBlue ? '#e0f2fe' : '#fecaca';
        ctx.globalAlpha = 0.8;
        
        for(let i=0; i<pulseCount; i++) {
            const p = (t * 0.8 + i / pulseCount) % 1.0; 
            const px = feetX * p;
            const py = feetY * p;
            const scale = 1 - p * 0.5;
            ctx.beginPath();
            ctx.ellipse(px, py, 4 * scale, 2 * scale, 0, 0, Math.PI*2);
            ctx.fill();
        }
    }

    ctx.restore();
}

export function drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const color = agent.team === Team.BLUE ? '#bae6fd' : '#fecaca'; 
    
    ctx.save();
    ctx.translate(0, 5); 
    ctx.scale(1, 0.5); 

    // Rotating Wind/Energy Swirl at Feet
    ctx.rotate(t * 8); 
    
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    ctx.beginPath();
    for(let i=0; i<3; i++) {
        const offset = i * (Math.PI * 2 / 3);
        const arcLen = Math.PI / 2;
        ctx.moveTo(Math.cos(offset) * 18, Math.sin(offset) * 18);
        ctx.arc(0, 0, 18, offset, offset + arcLen);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; 
    ctx.stroke();

    ctx.restore();
}

export function drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    
    if (skill.tag === 'ULT') {
        drawUltimateChantVFX(ctx, agent, t);
        return;
    }

    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;
    
    ctx.save();
    if (agent.facing < 0) ctx.scale(-1, 1);

    // 1. Rising Energy Lines
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3; 
    const lineCount = 5 + Math.floor(progress * 8); 
    for(let i=0; i<lineCount; i++) {
        const h = (t * 150 + i * 40) % 90; 
        const alpha = 1 - (h / 90);
        const xOff = Math.sin(t * 15 + i) * 20 * (1-progress); 
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(xOff, 15 - h); ctx.lineTo(xOff, 15 - h - 20); ctx.stroke();
    }

    // 2. Converging Rings
    if (progress > 0.2) {
        const ringScale = (1 - progress) * 2.5; 
        ctx.globalAlpha = progress;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -20, 30 * ringScale, 10 * ringScale, 0, 0, Math.PI*2); ctx.stroke();
        
        ctx.save(); ctx.translate(0, -20); ctx.rotate(t * 10);
        ctx.beginPath(); ctx.ellipse(0, 0, 20 * ringScale, 5 * ringScale, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }

    // 3. Hand Glow
    ctx.globalAlpha = 0.4 + (Math.sin(t * 20) * 0.2) + (progress * 0.6);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -20, 10 + progress * 15, 0, Math.PI*2); ctx.fill();

    // 4. Final Flash
    if (progress > 0.9) {
        ctx.globalAlpha = (progress - 0.9) * 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -20, 30, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}

// 🌀 DOMAIN EXPANSION (Pre-Cast Chant)
// Renders a barrier/sphere that gathers energy
export function drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;

    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;

    ctx.save();
    
    // Calculate Sphere Pulse (Expands as cast nears completion)
    // 0.0 -> 0.8 scale (Starts small, expands to encompass unit)
    const size = 60 * (0.2 + progress * 0.8);
    const distortion = Math.sin(t * 20) * 2;
    
    ctx.translate(0, -40); // Chest/Center height

    // 1. The Domain Boundary (Sphere)
    // Using lighter composite for energy look
    ctx.globalCompositeOperation = 'screen';
    
    const grad = ctx.createRadialGradient(0, 0, size * 0.8, 0, 0, size);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.4 + (progress * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, size + distortion, 0, Math.PI*2);
    ctx.fill();

    // 2. High-Speed Electrons (Orbiting particles)
    const particles = 3 + Math.floor(progress * 5);
    ctx.fillStyle = '#fff';
    
    for(let i=0; i<particles; i++) {
        // Orbit on different axes
        ctx.save();
        ctx.rotate(t * 2 + i * (Math.PI/particles));
        ctx.scale(1, 0.3); // Flatten to create 3D ring effect
        
        const px = Math.cos(t * 10 + i) * size;
        const py = Math.sin(t * 10 + i) * size;
        
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fill();
        
        // Trail
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.stroke();
        
        ctx.restore();
    }

    // 3. Core Compression (Imploding energy)
    // Only visible near end
    if (progress > 0.6) {
        ctx.globalCompositeOperation = 'lighter';
        const implodeSize = 100 * (1 - progress);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = progress;
        
        ctx.beginPath();
        for(let i=0; i<4; i++) {
            ctx.moveTo(implodeSize, 0); ctx.lineTo(0,0);
            ctx.rotate(Math.PI/2);
        }
        ctx.stroke();
    }

    ctx.restore();
}

// Replaced complex rune with simple unit rune
export function drawSkillGroundIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, t: number, progress: number, skillRadius: number, type: 'BASIC' | 'ACTIVE' | 'ULT', isAOE: boolean) {
    SurfaceAssets.drawUnitRune(ctx, x, y, color, t, progress);
}

export function drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
    if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (skill) {
            ctx.save();
            ctx.translate(0, -110);
            
            const glow = AssetManager.getGlowSprite(skill.color);
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.5 + Math.sin(t * 10) * 0.1;
            ctx.globalAlpha = 0.3 * pulse;
            ctx.drawImage(glow, -40, -40, 80, 80);
            
            ctx.restore();
        }
    }
}

export function drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    if (agent.hp <= 0) return;
    
    ctx.save();
    if (agent.facing < 0) ctx.scale(-1, 1);
    
    const HEAD_Y = -60; 

    // 1. FROZEN - ICE PRISM
    if (agent.visualStatus === 'FROZEN') {
        ctx.save();
        ctx.translate(0, -40); 
        
        const w = 30; const h = 50;
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)'; 
        ctx.beginPath();
        ctx.moveTo(-w, -h); ctx.lineTo(w, -h); ctx.lineTo(w, h); ctx.lineTo(-w, h);
        ctx.fill();
        
        const grad = ctx.createLinearGradient(-w, -h, w, h);
        grad.addColorStop(0, 'rgba(255,255,255,0.6)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0.5)');
        
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -h - 10); 
        ctx.lineTo(w + 5, -h + 10); ctx.lineTo(w, h); ctx.lineTo(0, h + 10); 
        ctx.lineTo(-w, h); ctx.lineTo(-w - 5, -h + 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath(); ctx.moveTo(0, -h-10); ctx.lineTo(0, h+10);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
        
        ctx.restore();
    }

    // 2. BANISH - GHOSTLY CAGE
    if (agent.banished && agent.visualStatus !== 'POLYMORPH' && agent.visualStatus !== 'STASIS') {
        ctx.translate(0, -30); 
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        
        const bars = 5; const radius = 25; const height = 50;
        
        for(let i=0; i<bars; i++) {
            const angle = t * 2 + (i / bars) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle); 
            
            const alpha = 0.5 + (z + 1) * 0.25; 
            
            ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.moveTo(x, -height); ctx.lineTo(x, height); ctx.stroke();
            
            if (i % 2 === 0) {
                ctx.fillStyle = '#d8b4fe';
                ctx.beginPath(); ctx.arc(x, -height/2 + Math.sin(t*3+i)*10, 3, 0, Math.PI*2); ctx.fill();
            }
        }
        
        ctx.globalAlpha = 0.6;
        ctx.save();
        ctx.scale(1, 0.3); 
        ctx.beginPath(); ctx.arc(0, -height / 0.3, radius, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, height / 0.3, radius, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }

    // 3. STUN - 3D DIZZY RING
    if (agent.stunTimer > 0 && !agent.banished && agent.visualStatus !== 'FROZEN') {
        ctx.translate(0, HEAD_Y - 10);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 3;
        const count = 5; const radius = 25;
        
        for(let i=0; i<count; i++) {
            const angle = t * 4 + (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.3;
            const scale = 1 + Math.sin(angle) * 0.3;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            const starPts = 5;
            for(let j=0; j<starPts*2; j++) {
                const r = j%2===0 ? 6 : 2;
                const a = j * Math.PI / starPts;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.fill();
            
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    // 4. SILENCE
    if (agent.silenceTimer > 0) {
        ctx.translate(0, HEAD_Y - 15);
        const scale = 1 + Math.sin(t * 5) * 0.1;
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#1e1b4b'; 
        ctx.strokeStyle = '#a855f7';
        ctx.globalCompositeOperation = 'lighter';
        
        const drawRune = (width: number, alpha: number) => {
            ctx.lineWidth = width;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.rect(-15, -10, 30, 20);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-8, -5); ctx.lineTo(8, 5);
            ctx.moveTo(8, -5); ctx.lineTo(-8, 5);
            ctx.stroke();
        };
        drawRune(4, 0.3); drawRune(2, 1.0);
    }

    // 5. DoT
    if (agent.dotTimer > 0) {
        ctx.translate(0, -40);
        const count = 3;
        for(let i=0; i<count; i++) {
            const phase = (t + i/count) % 1;
            const y = -phase * 40;
            const x = Math.sin(phase * 10 + i) * 10;
            const size = (1-phase) * 6;
            
            ctx.fillStyle = i%2===0 ? '#10b981' : '#a855f7'; 
            ctx.globalAlpha = (1-phase);
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
        }
    }

    // 6. HoT
    if (agent.hotTimer > 0) {
        ctx.translate(0, -30);
        const angle = -t * 3;
        const radius = 25;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.3; 
        
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', x, y);
    }

    ctx.restore();
}

export function drawSpawnIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, scale: number) {
}
