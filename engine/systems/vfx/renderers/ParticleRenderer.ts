
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { ISO_SCALE_Y } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";
import { VFXFactory } from "../../../graphics/VFXFactory";

const UNIT_CHEST_HEIGHT = 40;

// Optimization: Precomputed Unit Hexagon (Radius 1.0)
const HEX_CORNERS_X = [1, 0.5, -0.5, -1, -0.5, 0.5];
const HEX_CORNERS_Y = [0, 0.866, 0.866, 0, -0.866, -0.866];

function traceHexagonFast(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    ctx.moveTo(HEX_CORNERS_X[0] * r, HEX_CORNERS_Y[0] * r);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(HEX_CORNERS_X[i] * r, HEX_CORNERS_Y[i] * r);
    }
    ctx.closePath();
}

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // 1. Base Position (Int Snapping for Speed)
        ctx.translate(Math.floor(p.x), Math.floor(p.y));

        const now = Date.now() / 1000;

        // 2. Texture Resolution
        if (!p.texture && !p.image && !['PILLAR', 'DOMAIN', 'HEX_BEAM', 'GIANT_HEX', 'GRID_FIELD', 'DEATH_RAY', 'BEAM'].includes(p.type)) {
            if (p.type === 'GLOW' || p.type === 'SPARK' || p.type === 'HEX_GLOW') p.texture = VFXFactory.getTexture('GLOW', p.color);
            else if (p.type === 'SMOKE') p.texture = VFXFactory.getTexture('NOISE', p.color);
            else if (p.type === 'BLAST') p.texture = VFXFactory.getTexture('BLAST', p.color);
            else if (p.type === 'DEBRIS' || p.type === 'ROCK') p.texture = VFXFactory.getTexture('SOLID', p.color);
            else if (p.type === 'HEX_LOCK' || p.type === 'SHOCKWAVE') p.texture = VFXFactory.getTexture('OUTLINE', p.color);
            
            // New Pre-baked types for performance
            else if (p.type === 'SHARD') p.texture = VFXFactory.getTexture('SHARD', p.color);
            else if (p.type === 'CHIP') p.texture = VFXFactory.getTexture('CHIP', p.color);
        }

        // 3. Render Logic
        if (p.image) {
            ctx.rotate(p.rotation);
            ctx.globalAlpha = 1 - progress;
            const size = Math.floor(p.size);
            ctx.drawImage(p.image, -size/2, -size/2, size, size);
        }
        else if (p.texture) {
            if (p.type === 'SMOKE' || p.type === 'GLOW' || p.type === 'HEX_GLOW') {
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = (1 - progress);
                const scale = p.type === 'SMOKE' ? (1 + progress) : (1 - progress * 0.5);
                ctx.scale(scale, scale);
                ctx.rotate(p.rotation);
                const s2 = p.size * 2;
                ctx.drawImage(p.texture, -p.size, -p.size, s2, s2);
            } 
            else if (p.type === 'SPARK') {
                ctx.globalCompositeOperation = 'lighter';
                ctx.rotate(Math.atan2(p.vy, p.vx));
                ctx.scale(Math.min(3, 1 + p.size/10), 0.5);
                ctx.globalAlpha = 1 - progress;
                const s2 = p.size * 2;
                ctx.drawImage(p.texture, -p.size, -p.size, s2, s2);
            }
            else {
                ctx.rotate(p.rotation);
                const s2 = p.size * 2;
                // Standard texture draw
                ctx.drawImage(p.texture, -p.size, -p.size, s2, s2);
            }
        }
        else {
            this.drawProcedural(ctx, p, progress, isChaos, now);
        }

        ctx.restore();
    },

    drawProcedural(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean, now: number) {
        // Optimized: Removed simple CHIP/SHARD drawing as they are now textured
        
        if (p.type === 'HEX_BEAM') {
            ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (1 - progress) * 0.9;
            traceHexagonFast(ctx, p.size); ctx.fill();
            ctx.fillStyle = '#fff';
            traceHexagonFast(ctx, p.size * 0.6); ctx.fill();
        }
        else if (p.type === 'GRID_FIELD') {
            if (p.color === '#be123c' || p.color.includes('blood')) {
                SurfaceAssets.drawLiquidSurface(ctx, 0, 0, '#991b1b', now, progress);
            } else {
                const height = 15 * progress;
                SurfaceAssets.drawExtrudedHex(ctx, 0, 0, height, p.color, 0.6, false);
            }
        }
        else if (p.type === 'PILLAR') {
            const h = 1200; 
            const width = p.size * (1 - progress * 0.5);
            
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            
            const grad = ctx.createLinearGradient(0, 0, 0, -h);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.2, '#fff');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = (1 - progress);
            ctx.fillRect(-width/2, -h, width, h);
            
            ctx.scale(1, ISO_SCALE_Y);
            ctx.beginPath(); ctx.arc(0, 0, width, 0, Math.PI*2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.restore();
        }
        else if (p.type === 'DOMAIN') {
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(0, 0, r*0.5, 0, 0, r);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'rgba(255,255,255,0.5)');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.3 * (1 - progress);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.15;
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 10]);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
        else if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
            // Optimized Beam drawing
            if (p.sx !== undefined && p.sy !== undefined && p.sz !== undefined &&
                p.tx !== undefined && p.ty !== undefined && p.tz !== undefined) {
                
                const dx = p.tx - p.sx; 
                const startVisY = -UNIT_CHEST_HEIGHT;
                
                const worldYDelta = p.ty - p.sy;
                const zDelta = p.tz - p.sz;
                const targetVisY = worldYDelta - zDelta - UNIT_CHEST_HEIGHT;
                
                const dist = Math.sqrt(dx*dx + (targetVisY - startVisY)**2);
                const angle = Math.atan2(targetVisY - startVisY, dx);
                
                ctx.save();
                ctx.translate(0, startVisY); 
                ctx.rotate(angle);
                
                if (p.type === 'BEAM') {
                    const coreWidth = p.size * Math.sin((1-progress) * Math.PI);
                    if (coreWidth > 0.5) {
                        ctx.lineCap = 'round';
                        ctx.globalCompositeOperation = 'screen';
                        
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = 0.3 * (1 - progress);
                        ctx.lineWidth = coreWidth * 6;
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();

                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.8 * (1 - progress);
                        ctx.lineWidth = Math.max(1, coreWidth * 0.8);
                        
                        // Optimized Helix: Less segments
                        const freq = 0.1; const amp = Math.max(3, coreWidth * 2);
                        const speed = now * 20; const step = 10; // Increased step size

                        ctx.beginPath();
                        for (let i = 0; i <= dist; i += step) {
                            const yOffset = Math.sin(i * freq - speed) * amp;
                            if (i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
                        }
                        ctx.stroke();

                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = Math.max(1, coreWidth);
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                    }
                } else {
                    const width = p.size * (1 - progress);
                    if (width > 0.5) {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = width * 1.5;
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();

                        ctx.globalCompositeOperation = 'lighter';
                        ctx.strokeStyle = p.color;
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = 10; // Reduced blur
                        ctx.lineWidth = Math.max(1, width * 0.6);
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                        
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = Math.max(1, width * 0.2);
                        ctx.shadowBlur = 0; // Remove blur for inner core
                        ctx.stroke();
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
            traceHexagonFast(ctx, p.size); ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            traceHexagonFast(ctx, p.size); ctx.stroke();
        }
    }
};
