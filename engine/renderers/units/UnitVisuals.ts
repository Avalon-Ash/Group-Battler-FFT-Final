
import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { SpriteManager } from "../../sprites";
import { Team } from "../../../types";

// =================================================================================
// 🧚 UNIT VISUAL EFFECTS (Flight, Casting, Status)
// =================================================================================

export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const isBlue = agent.team === Team.BLUE;
    const color = isBlue ? '#60a5fa' : '#f87171'; // Blue-400 : Red-400
    
    // We are at Ground Level (0,0).
    // Unit Feet are at (physX, physY - physZ).
    // We want to draw a column connecting Ground(0,0) to Feet.
    
    const feetX = physX;
    const feetY = physY - physZ; 
    
    ctx.save();

    // 1. "Divine Light" Lift Column (Gradient Fill)
    const grad = ctx.createLinearGradient(0, 0, feetX, feetY);
    // Transparent at bottom to blend with ground, stronger at top to show lift source
    grad.addColorStop(0, isBlue ? 'rgba(96, 165, 250, 0.0)' : 'rgba(248, 113, 113, 0.0)');
    grad.addColorStop(0.3, isBlue ? 'rgba(96, 165, 250, 0.1)' : 'rgba(248, 113, 113, 0.1)');
    grad.addColorStop(1.0, isBlue ? 'rgba(96, 165, 250, 0.3)' : 'rgba(248, 113, 113, 0.3)');

    // Column Shape (Tapered Cylinder)
    const baseW = 20; // Ground width
    const topW = 15;  // Feet width
    
    ctx.beginPath();
    // Start Bottom Left
    ctx.moveTo(-baseW, 0);
    // Line to Top Left
    ctx.lineTo(feetX - topW, feetY);
    // Curve Top (Feet)
    ctx.ellipse(feetX, feetY, topW, topW * 0.5, 0, Math.PI, 0); // Top semi-circle
    // Line to Bottom Right
    ctx.lineTo(baseW, 0);
    // Curve Bottom (Ground)
    ctx.ellipse(0, 0, baseW, baseW * 0.5, 0, 0, Math.PI); // Bottom semi-circle
    
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Rising Energy Streams / Rings
    // Adds motion inside the column
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    
    const height = Math.abs(feetY);
    // Density of rings based on height
    const ringCount = Math.max(2, Math.floor(height / 25));
    
    for(let i=0; i<ringCount; i++) {
        // Scroll rings upward
        const phase = (t * 1.5 + i / ringCount) % 1; 
        
        // Interpolate position between ground(0,0) and feet(feetX, feetY)
        const curX = feetX * phase;
        const curY = feetY * phase;
        
        // Interpolate width
        const curW = baseW + (topW - baseW) * phase;
        
        // Fade in/out at ends
        const alpha = Math.sin(phase * Math.PI); 
        
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.ellipse(curX, curY, curW, curW * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 3. Ground Anchor Ring (Target Reticle)
    ctx.globalAlpha = 1.0;
    const pulse = 1 + Math.sin(t * 8) * 0.1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]); 
    ctx.beginPath();
    ctx.ellipse(0, 0, 35 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Crosshair Center
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
    ctx.moveTo(0, -4); ctx.lineTo(0, 4);
    ctx.stroke();

    ctx.restore();
}

export function drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const color = agent.team === Team.BLUE ? '#bae6fd' : '#fecaca'; 
    
    ctx.save();
    ctx.translate(0, 10); // Slightly below body center (feet)
    ctx.scale(1, 0.5); 

    // Rotating Wind/Energy Swirl at Feet
    ctx.rotate(t * 5); // Faster spin
    
    // Inner Turbine Ring
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke();

    // Outer Thruster Arcs
    ctx.beginPath();
    ctx.arc(0, 0, 18 + Math.sin(t * 15) * 2, 0, Math.PI * 1.5);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Particles (Exhaust)
    ctx.fillStyle = color;
    for(let i=0; i<3; i++) {
        const angle = t * 8 + i * (Math.PI * 2 / 3);
        const r = 16;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}

export function drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    
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

export function drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
    // Only keeping this logic for casting glow if needed, but HUDSystem handles the main gauge now.
    // We can keep the "Glow" behind the unit here if desired, or remove it.
    // For now, let's just keep the particle glow effect if casting, but remove the UI elements (Icon/Bar).
    
    if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (skill) {
            ctx.save();
            ctx.translate(0, -110);
            
            // Just the ambient energy glow behind the head, no UI
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
    // Undo facing flip so icons don't flip
    if (agent.facing < 0) ctx.scale(-1, 1);
    
    const HEAD_Y = -75; // Adjusted head position for icons

    // 1. STUN
    if (agent.stunTimer > 0 && !agent.banished && agent.visualStatus !== 'FROZEN') {
        const icon = AssetManager.getStatusIcon('STUN');
        const angle = t * 5;
        ctx.drawImage(icon, -20 + Math.cos(angle)*10, HEAD_Y + Math.sin(angle)*5, 24, 24);
        ctx.drawImage(icon, -10 + Math.cos(angle + 2)*10, HEAD_Y - 10 + Math.sin(angle + 2)*5, 16, 16);
    }

    // 2. SILENCE
    if (agent.silenceTimer > 0) {
        const icon = AssetManager.getStatusIcon('SILENCE');
        ctx.drawImage(icon, 15, HEAD_Y - 5 + Math.sin(t * 3) * 3, 24, 24);
    }

    // 3. BANISH
    if (agent.banished && agent.visualStatus === 'NONE') {
        const icon = AssetManager.getStatusIcon('BANISH');
        ctx.globalAlpha = 0.7;
        ctx.drawImage(icon, -12, HEAD_Y - 20 + Math.sin(t * 2) * 5, 24, 24);
    }

    // 4. DoT
    if (agent.dotTimer > 0) {
        const pulse = 1 + Math.sin(t * 10) * 0.2;
        const iconSize = 28 * pulse; 
        const icon = AssetManager.getStatusIcon('POISON'); 
        const glow = AssetManager.getGlowSprite('#ef4444');
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glow, -35 - iconSize/2, HEAD_Y - iconSize/2, iconSize*2, iconSize*2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(icon, -35, HEAD_Y, iconSize, iconSize);

        ctx.globalAlpha = 0.8;
        for(let i=0; i<5; i++) {
            const cycle = (t * 2 + i * 0.7) % 1;
            const yOff = -cycle * 60; 
            const xOff = Math.sin(t * 5 + i) * 15;
            const size = (1 - cycle) * 7;
            ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#a855f7';
            if (cycle < 1) {
                ctx.beginPath(); ctx.arc(xOff, -20 + yOff, size, 0, Math.PI*2); ctx.fill();
            }
        }
    }

    // 5. HoT
    if (agent.hotTimer > 0) {
        const icon = AssetManager.getStatusIcon('REGEN');
        ctx.drawImage(icon, 25, HEAD_Y, 24, 24);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 14px sans-serif';
        for(let i=0; i<3; i++) {
            const cycle = (t * 1.5 + i * 0.4) % 1;
            const yOff = -cycle * 40;
            const xOff = Math.cos(t * 3 + i) * 15;
            if (cycle < 1) ctx.fillText('+', xOff, -20 + yOff);
        }
    }

    ctx.restore();
}

export function drawSpawnIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, scale: number) {
    const assets = SpriteManager.getUnitImages(agent.role, agent.team);
    const totalDuration = 0.5;
    const alpha = Math.max(0, agent.spawnTimer / totalDuration);
    const yOffset = -85 * scale; // Moved up higher because body is now higher

    ctx.save();
    ctx.translate(x, y + yOffset);
    const popScale = 1.0 + alpha * 0.2;
    ctx.scale(popScale, popScale);
    ctx.globalAlpha = alpha;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; 
    ctx.strokeStyle = agent.team === Team.BLUE ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.drawImage(assets.icon, -12, -12, 24, 24);
    
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText(agent.role, 0, 28);
    ctx.fillText(agent.role, 0, 28);

    ctx.restore();
}
