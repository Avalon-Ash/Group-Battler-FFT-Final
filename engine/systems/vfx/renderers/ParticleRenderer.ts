
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { ISO_SCALE_Y } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";
import { VFXFactory } from "../../../graphics/VFXFactory";

const UNIT_CHEST_HEIGHT = 40;

function traceHexagon(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // 1. Base Position: Translate to Screen Space Start Coordinate
        // IMPORTANT: The RenderList has already calculated the Screen Y = (World Y - World Z)
        // So (0,0) here represents the visual start point.
        ctx.translate(Math.floor(p.x), Math.floor(p.y));

        const now = Date.now() / 1000;

        // 2. Texture Resolution
        if (!p.texture && !p.image && p.type !== 'SHARD' && p.type !== 'CHIP') {
            if (p.type === 'GLOW' || p.type === 'SPARK') p.texture = VFXFactory.getTexture('GLOW', p.color);
            else if (p.type === 'SMOKE') p.texture = VFXFactory.getTexture('NOISE', p.color);
            else if (p.type === 'BLAST') p.texture = VFXFactory.getTexture('BLAST', p.color);
            else if (p.type === 'DEBRIS' || p.type === 'ROCK') p.texture = VFXFactory.getTexture('SOLID', p.color);
            else if (p.type === 'HEX_LOCK' || p.type === 'SHOCKWAVE') p.texture = VFXFactory.getTexture('OUTLINE', p.color);
        }

        // 3. Render Logic
        if (p.image) {
            ctx.rotate(p.rotation);
            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(p.image, -p.size/2, -p.size/2, p.size, p.size);
        }
        else if (p.texture) {
            if (p.type === 'SMOKE' || p.type === 'GLOW') {
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = (1 - progress);
                const scale = p.type === 'SMOKE' ? (1 + progress) : (1 - progress * 0.5);
                ctx.scale(scale, scale);
                ctx.rotate(p.rotation);
                ctx.drawImage(p.texture, -p.size, -p.size, p.size * 2, p.size * 2);
            } 
            else if (p.type === 'SPARK') {
                ctx.globalCompositeOperation = 'lighter';
                ctx.rotate(Math.atan2(p.vy, p.vx));
                ctx.scale(Math.min(3, 1 + p.size/10), 0.5);
                ctx.globalAlpha = 1 - progress;
                ctx.drawImage(p.texture, -p.size, -p.size, p.size * 2, p.size * 2);
            }
            else {
                ctx.rotate(p.rotation);
                ctx.drawImage(p.texture, -p.size, -p.size, p.size * 2, p.size * 2);
            }
        }
        else {
            this.drawProcedural(ctx, p, progress, isChaos, now);
        }

        ctx.restore();
    },

    drawProcedural(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean, now: number) {
        
        if (p.type === 'CHIP') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        }
        else if (p.type === 'SHARD') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(p.size, 0);
            ctx.lineTo(-p.size * 0.5, p.size * 0.4);
            ctx.lineTo(-p.size * 0.5, -p.size * 0.4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        else if (p.type === 'HEX_BEAM') {
            ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (1 - progress) * 0.9;
            traceHexagon(ctx, p.size); ctx.fill();
            ctx.fillStyle = '#fff';
            traceHexagon(ctx, p.size * 0.6); ctx.fill();
        }
        else if (p.type === 'GRID_FIELD') {
            if (p.color === '#be123c' || p.color.includes('blood')) {
                SurfaceAssets.drawLiquidSurface(ctx, 0, 0, '#991b1b', now, progress);
            } else {
                const height = 15 * progress;
                SurfaceAssets.drawExtrudedHex(ctx, 0, 0, height, p.color, 0.6, false);
            }
        }
        else if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
            // 🚨 STRICT BEAM REWRITE: Match ProjectileRenderer 🚨
            // Requirements: Straight Line, Correct Height
            if (p.sx !== undefined && p.sy !== undefined && p.sz !== undefined &&
                p.tx !== undefined && p.ty !== undefined && p.tz !== undefined) {
                
                // 1. Calculate Relative Delta in Screen Space
                const dx = p.tx - p.sx; // World X delta
                
                // 2. Calculate Visual Y Delta
                // VisualY = WorldY - TerrainZ - BodyOffset
                // StartVisualY is current (0,0) IF we shift by -BodyOffset.
                // Current Ctx is at: sx, sy - sz
                // We want to draw from: (0, -40)
                
                const startVisY = -UNIT_CHEST_HEIGHT;
                
                // Target Y relative to Source Y:
                // dy = (ty - tz) - (sy - sz)
                const worldYDelta = p.ty - p.sy;
                const zDelta = p.tz - p.sz;
                const targetVisY = worldYDelta - zDelta - UNIT_CHEST_HEIGHT;
                
                const dist = Math.sqrt(dx*dx + (targetVisY - startVisY)**2);
                const angle = Math.atan2(targetVisY - startVisY, dx);
                
                ctx.save();
                ctx.translate(0, startVisY); // Move to Chest Height
                ctx.rotate(angle);
                
                // --- DRAW STRAIGHT BEAM ---
                
                if (p.type === 'BEAM') {
                    // --- HOLO-HELIX BEAM (Straight) ---
                    const coreWidth = p.size * Math.sin((1-progress) * Math.PI);
                    if (coreWidth > 0.5) {
                        ctx.lineCap = 'round';
                        ctx.globalCompositeOperation = 'screen';
                        
                        // Core
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = 0.3 * (1 - progress);
                        ctx.lineWidth = coreWidth * 6;
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();

                        // Bright Center
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.8 * (1 - progress);
                        ctx.lineWidth = Math.max(1, coreWidth * 0.8);
                        
                        // Helix Effect (Visual Only, Geometry is Straight)
                        const freq = 0.1; const amp = Math.max(3, coreWidth * 2);
                        const speed = now * 20; const step = 5;

                        ctx.beginPath();
                        for (let i = 0; i <= dist; i += step) {
                            const yOffset = Math.sin(i * freq - speed) * amp;
                            if (i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
                        }
                        ctx.stroke();

                        ctx.beginPath();
                        for (let i = 0; i <= dist; i += step) {
                            const yOffset = Math.sin(i * freq + speed + Math.PI) * amp;
                            if (i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
                        }
                        ctx.stroke();

                        // Solid White Core
                        ctx.strokeStyle = '#fff';
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = 10;
                        ctx.lineWidth = Math.max(1, coreWidth);
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                } else {
                    // --- DEATH RAY (Straight) ---
                    const width = p.size * (1 - progress);
                    if (width > 0.5) {
                        ctx.globalCompositeOperation = 'source-over';
                        // Black Core
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = width * 1.5;
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();

                        // Red Glow
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.strokeStyle = p.color;
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = 15;
                        ctx.lineWidth = Math.max(1, width * 0.6);
                        
                        // Unstable Jitter
                        const segments = 15;
                        const step = dist / segments;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        for (let i = 1; i < segments; i++) {
                            const jitter = Math.sin(i * 132.1 + now * 50) * (width * 2.5); 
                            ctx.lineTo(i * step, jitter);
                        }
                        ctx.lineTo(dist, 0);
                        ctx.stroke();
                        
                        // White Arc
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = Math.max(1, width * 0.2);
                        ctx.shadowBlur = 5;
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                }
                ctx.restore();
            }
        }
        else if (p.type === 'GIANT_HEX') {
            ctx.scale(1, ISO_SCALE_Y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.8;
            traceHexagon(ctx, p.size); ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            traceHexagon(ctx, p.size); ctx.stroke();
        }
    }
};
