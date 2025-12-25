
import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { SpriteManager } from "../../sprites";
import { Team } from "../../../types";

// =================================================================================
// 🧚 UNIT VISUAL EFFECTS (Flight, Casting, Status)
// =================================================================================

// COLORS
const COL_PURPLE = '#8b5cf6'; // Violet-500
const COL_GOLD = '#facc15';   // Yellow-400
const COL_CRIMSON = '#ef4444'; // Red-500

export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const isBlue = agent.team === Team.BLUE;
    const color = isBlue ? '#60a5fa' : '#f87171';
    
    // We are at Ground Level (0,0) in the scaled context.
    // Unit Feet are at (physX, physY - physZ).
    
    const feetX = physX;
    const feetY = physY - physZ; 
    
    ctx.save();

    // 1. Ground Anchor (The Base)
    // Rotating Rune Ring - Clear indication of ground position
    ctx.save();
    ctx.scale(1, 0.58); // Isometric flat on ground
    // Use lineDashOffset to simulate rotation without distorting the ellipse
    ctx.lineDashOffset = -t * 20;
    
    // Outer dashed ring
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
    // Only visible if unit is airborne to show connection
    if (physZ > 5) {
        const grad = ctx.createLinearGradient(0, 0, feetX, feetY);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent'); // Fade out near unit feet

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        
        // Draw Main Tether Line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(feetX, feetY);
        ctx.stroke();

        // Draw Moving Energy Pulses up the tether
        const pulseCount = 3;
        ctx.fillStyle = isBlue ? '#e0f2fe' : '#fecaca';
        ctx.globalAlpha = 0.8;
        
        for(let i=0; i<pulseCount; i++) {
            const p = (t * 0.8 + i / pulseCount) % 1.0; // 0 to 1, faster speed
            const px = feetX * p;
            const py = feetY * p;
            
            // Draw small horizontal dash/disk traveling up
            // Scale based on height to simulate perspective
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
    ctx.translate(0, 5); // Just below body
    ctx.scale(1, 0.5); 

    // Rotating Wind/Energy Swirl at Feet
    ctx.rotate(t * 8); // Faster spin for thrusters
    
    // Inner Turbine Ring
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    // Outer Thruster Arcs
    ctx.beginPath();
    // 3 Arcs for stability look
    for(let i=0; i<3; i++) {
        const offset = i * (Math.PI * 2 / 3);
        const arcLen = Math.PI / 2;
        ctx.moveTo(Math.cos(offset) * 18, Math.sin(offset) * 18);
        ctx.arc(0, 0, 18, offset, offset + arcLen);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.2; // Flicker
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

// 🌀 NEW: ULTIMATE CHANT VFX (Body)
export function drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;

    const progress = 1 - (agent.castTimer / skill.cast);
    const factionColor = agent.team === Team.BLUE ? COL_GOLD : COL_CRIMSON;
    const mainColor = COL_PURPLE;

    ctx.save();
    
    // 1. Atmosphere (Localized Darkening)
    // Draw a large dark vignette behind the unit to make runes pop
    const vignetteSize = 120 * progress;
    const vignette = ctx.createRadialGradient(0, -40, 20, 0, -40, vignetteSize);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = vignette;
    ctx.beginPath(); ctx.arc(0, -40, vignetteSize, 0, Math.PI*2); ctx.fill();

    // 2. Implosion (Energy Gathering)
    // Particles moving from radius inwards to chest
    ctx.globalCompositeOperation = 'lighter';
    const pCount = 16;
    const radius = 80;
    
    for(let i=0; i<pCount; i++) {
        const speed = 2.0 + progress * 2.0; // Speed up as cast finishes
        const offset = i * (1/pCount);
        const lifetime = (t * speed + offset) % 1.0;
        
        // lifetime 0 = spawn at edge, 1 = hit center
        // Reverse for implosion: spawn far (p=0), move in (p=1)
        const curDist = radius * (1 - Math.pow(lifetime, 2)); // Ease in
        const angle = i * (Math.PI * 2 / pCount) + t + (progress * 5); // Spiral in
        
        const px = Math.cos(angle) * curDist;
        const py = Math.sin(angle) * curDist - 40; // Center on chest (-40)
        
        const size = (2 + progress * 3) * lifetime; // Grow slightly as they condense
        const alpha = Math.sin(lifetime * Math.PI); 
        
        ctx.fillStyle = i % 2 === 0 ? factionColor : mainColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI*2); ctx.fill();
        
        // Trail
        if (curDist > 10) {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const tailX = Math.cos(angle - 0.2) * (curDist + 15);
            const tailY = Math.sin(angle - 0.2) * (curDist + 15) - 40;
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }
    }

    // 3. Core Overload (Bright center glow)
    // OPTIMIZATION: Removed shadowBlur, replaced with Radial Gradient
    const pulse = 1 + Math.sin(t * 30) * 0.2;
    ctx.globalAlpha = 0.8 * progress;
    
    const coreGrad = ctx.createRadialGradient(0, -40, 2, 0, -40, 15 * pulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, factionColor);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(0, -40, 15 * pulse, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

// 🌀 NEW: ULTIMATE GROUND CIRCLE (Replaces AssetManager circle)
export function drawUltimateGroundCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, t: number, progress: number) {
    const pulse = 1 + Math.sin(t * 5) * 0.05;
    const baseSize = 70 * pulse; 
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.58); // Isometric projection
    ctx.globalCompositeOperation = 'lighter';

    // 1. Outer Ring (Slow Rotate via lineDashOffset)
    ctx.save();
    // FIX: Do NOT rotate the context, it distorts the isometric ellipse to a wobbling egg!
    // Instead, animate the dash offset to simulate spinning.
    ctx.lineDashOffset = -t * 30; // Speed of spin
    
    ctx.strokeStyle = COL_PURPLE;
    ctx.setLineDash([20, 10]); // Runes
    
    // OPTIMIZATION: Fake Glow (Double Stroke)
    ctx.lineWidth = 4;
    ctx.globalAlpha = (0.6 + progress * 0.4) * 0.3; // Low alpha for width
    ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI*2); ctx.stroke();
    
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + progress * 0.4;
    ctx.stroke();
    ctx.restore();

    // 2. Inner Ring (Fast Counter-Rotate via lineDashOffset)
    ctx.save();
    ctx.lineDashOffset = t * 60; // Counter spin
    
    ctx.strokeStyle = COL_GOLD; // Gold core for contrast
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([5, 15, 2, 10]); // Complex pattern
    ctx.beginPath(); ctx.arc(0, 0, baseSize * 0.7, 0, Math.PI*2); ctx.stroke();
    ctx.restore();

    // 3. Central Geometry (Triangle/Square pulse)
    // NOTE: Geometry rotation inside the flat plane is fine as long as we calculate points manually
    // or if we accept that non-circular shapes will wobble.
    // For a triangle, wobbling is actually acceptable/cool energy effect.
    // But let's keep it stable for now by manually calculating points.
    ctx.save();
    ctx.globalAlpha = 0.3 * progress;
    ctx.fillStyle = color;
    const r = baseSize * 0.5 * progress;
    
    ctx.beginPath();
    for(let i=0; i<3; i++) {
        // Manually calculate rotated points to ensure they stay on the isometric plane
        // Actually, for a filled shape, standard context rotation IS the wobble.
        // To fix, we just define the points rotated by `t`.
        const a = t + i * (Math.PI*2/3);
        ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
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

    // 1. FROZEN - ICE PRISM (Encasing the unit)
    if (agent.visualStatus === 'FROZEN') {
        ctx.save();
        ctx.translate(0, -40); // Center of body
        
        // Draw Hexagonal Prism
        const w = 30;
        const h = 50;
        
        ctx.globalCompositeOperation = 'source-over';
        // Back Faces
        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)'; // Light Blue
        ctx.beginPath();
        ctx.moveTo(-w, -h); ctx.lineTo(w, -h); ctx.lineTo(w, h); ctx.lineTo(-w, h);
        ctx.fill();
        
        // Front Faces (Glassy)
        const grad = ctx.createLinearGradient(-w, -h, w, h);
        grad.addColorStop(0, 'rgba(255,255,255,0.6)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
        grad.addColorStop(1, 'rgba(14, 165, 233, 0.5)');
        
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -h - 10); // Top Tip
        ctx.lineTo(w + 5, -h + 10);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h + 10); // Bottom Tip
        ctx.lineTo(-w, h);
        ctx.lineTo(-w - 5, -h + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Glint
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(0, -h-10); ctx.lineTo(0, h+10);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.stroke();
        
        ctx.restore();
    }

    // 2. BANISH - GHOSTLY CAGE (Rotates around unit)
    // MUTUALLY EXCLUSIVE: Only draw if NOT Poly'd and NOT Stasis
    if (agent.banished && agent.visualStatus !== 'POLYMORPH' && agent.visualStatus !== 'STASIS') {
        ctx.translate(0, -30); // Body center
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        
        // Vertical Bars orbiting (Simulated 3D Cylinder)
        const bars = 5;
        const radius = 25;
        const height = 50;
        
        for(let i=0; i<bars; i++) {
            // Rotate bars over time
            const angle = t * 2 + (i / bars) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle); // Depth
            
            // Perspective scale
            // const scale = 1 + z * 0.1;
            const alpha = 0.5 + (z + 1) * 0.25; // Fade back bars
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(x, -height);
            ctx.lineTo(x, height);
            ctx.stroke();
            
            // Runes on bars
            if (i % 2 === 0) {
                ctx.fillStyle = '#d8b4fe';
                ctx.beginPath(); ctx.arc(x, -height/2 + Math.sin(t*3+i)*10, 3, 0, Math.PI*2); ctx.fill();
            }
        }
        
        // Top and Bottom Rings
        ctx.globalAlpha = 0.6;
        ctx.save();
        ctx.scale(1, 0.3); // Isometric
        ctx.beginPath(); ctx.arc(0, -height / 0.3, radius, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, height / 0.3, radius, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }

    // 3. STUN - 3D DIZZY RING
    if (agent.stunTimer > 0 && !agent.banished && agent.visualStatus !== 'FROZEN') {
        ctx.translate(0, HEAD_Y - 10);
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 3;
        
        const count = 5;
        const radius = 25;
        
        // Orbiting Stars
        for(let i=0; i<count; i++) {
            const angle = t * 4 + (i / count) * Math.PI * 2;
            // 3D Orbit: Y is squashed
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.3;
            // Z-sort simulation: if sin(angle) > 0, it's in front
            const scale = 1 + Math.sin(angle) * 0.3;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            
            ctx.fillStyle = '#facc15';
            // OPTIMIZATION: Removed shadowBlur. Added fake glow circle.
            ctx.beginPath();
            const starPts = 5;
            for(let j=0; j<starPts*2; j++) {
                const r = j%2===0 ? 6 : 2;
                const a = j * Math.PI / starPts;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.fill();
            
            // Fake Glow
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
        }
    }

    // 4. SILENCE - FLOATING RUNE SEAL
    if (agent.silenceTimer > 0) {
        ctx.translate(0, HEAD_Y - 15);
        
        const scale = 1 + Math.sin(t * 5) * 0.1;
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#1e1b4b'; 
        ctx.strokeStyle = '#a855f7';
        
        // OPTIMIZATION: Fake glow via multi-pass stroke instead of shadowBlur
        ctx.globalCompositeOperation = 'lighter';
        
        const drawRune = (width: number, alpha: number) => {
            ctx.lineWidth = width;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.rect(-15, -10, 30, 20);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-8, -5); ctx.lineTo(8, 5);
            ctx.moveTo(8, -5); ctx.lineTo(-8, 5);
            ctx.stroke();
        };

        drawRune(4, 0.3); // Glow pass
        drawRune(2, 1.0); // Core pass
    }

    // 5. DoT - Rising Bubbles / Smoke
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

    // 6. HoT - Spiraling +
    if (agent.hotTimer > 0) {
        ctx.translate(0, -30);
        const angle = -t * 3;
        const radius = 25;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.3; // Flattened
        
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', x, y);
    }

    ctx.restore();
}

export function drawSpawnIndicator(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, scale: number) {
    const assets = SpriteManager.getUnitImages(agent.role, agent.team);
    const totalDuration = 0.5;
    const alpha = Math.max(0, agent.spawnTimer / totalDuration);
    const yOffset = -85 * scale; 

    ctx.save();
    ctx.translate(x, y + yOffset);
    const popScale = 1.0 + alpha * 0.2;
    ctx.scale(popScale, popScale);
    ctx.globalAlpha = alpha;
    
    // OPTIMIZATION: Fake glow strokes instead of standard stroke
    const mainCol = agent.team === Team.BLUE ? '#60a5fa' : '#f87171';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = mainCol;
    
    // Outer Glow
    ctx.lineWidth = 4;
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
    
    // Inner Core
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; 
    ctx.fill();

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
