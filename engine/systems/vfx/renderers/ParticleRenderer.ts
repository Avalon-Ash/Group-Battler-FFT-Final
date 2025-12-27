
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { ISO_SCALE_Y } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { BEAM_VISUALS, BeamVisualDef } from "../../../../../data/vfx/beam_visuals";

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

// Fallback if visual config missing
const DEFAULT_BEAM: BeamVisualDef = {
    type: 'HELIX',
    width: 6,
    coreColor: '#fff',
    glowColor: '#fff'
};

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
            // New Beam Drawing Logic using Data
            if (p.sx !== undefined && p.sy !== undefined && p.sz !== undefined &&
                p.tx !== undefined && p.ty !== undefined && p.tz !== undefined) {
                
                const styleId = p.beamStyle || (p.type === 'DEATH_RAY' ? 'DEATH_RAY' : 'GENERIC_BEAM');
                const conf = BEAM_VISUALS[styleId] || DEFAULT_BEAM;

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
                
                // Color Override Logic (Particle Color > Config Color)
                const coreCol = p.color !== '#fff' ? p.color : conf.coreColor;
                const glowCol = p.color !== '#fff' ? p.color : conf.glowColor;
                const width = conf.width * (p.size / 4); // Scale by particle size param

                if (conf.blendMode) ctx.globalCompositeOperation = conf.blendMode;

                if (conf.type === 'HELIX') {
                    const coreWidth = width * Math.sin((1-progress) * Math.PI);
                    if (coreWidth > 0.5) {
                        ctx.strokeStyle = glowCol;
                        ctx.globalAlpha = 0.3 * (1 - progress);
                        ctx.lineWidth = coreWidth * 6;
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();

                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.8 * (1 - progress);
                        ctx.lineWidth = Math.max(1, coreWidth * 0.8);
                        
                        // Configurable Helix
                        const freq = conf.helixFreq || 0.1; 
                        const amp = (conf.helixAmp || 3) * (width / 4);
                        const speed = now * 20; 
                        const step = 10; 

                        ctx.beginPath();
                        for (let i = 0; i <= dist; i += step) {
                            const yOffset = Math.sin(i * freq - speed) * amp;
                            if (i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
                        }
                        ctx.stroke();

                        ctx.strokeStyle = coreCol;
                        ctx.lineWidth = Math.max(1, coreWidth);
                        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                    }
                } 
                else if (conf.type === 'STRAIGHT' || conf.type === 'VIBRANT') {
                    const w = width * (1 - progress);
                    if (w > 0.5) {
                        // Outer Glow
                        ctx.strokeStyle = glowCol;
                        ctx.shadowColor = glowCol;
                        ctx.shadowBlur = (conf.noiseScale || 0) * 5 + 10;
                        ctx.lineWidth = w * 2;
                        ctx.globalAlpha = 0.6 * (1 - progress);
                        
                        // Jitter for VIBRANT
                        let y1 = 0, y2 = 0;
                        if (conf.noiseScale && conf.noiseScale > 0) {
                            y1 = (Math.random()-0.5) * conf.noiseScale;
                            y2 = (Math.random()-0.5) * conf.noiseScale;
                        }

                        ctx.beginPath(); ctx.moveTo(0,y1); ctx.lineTo(dist, y2); ctx.stroke();
                        ctx.shadowBlur = 0;

                        // Inner Core
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = coreCol;
                        ctx.lineWidth = w;
                        ctx.globalAlpha = 1.0;
                        ctx.beginPath(); ctx.moveTo(0,y1); ctx.lineTo(dist, y2); ctx.stroke();
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
