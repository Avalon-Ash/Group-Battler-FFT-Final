
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { ISO_SCALE_Y, HEX_SIZE } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";
import { VFXFactory } from "../../../graphics/VFXFactory";

// Import aggregated registry and specific types
import { 
    PROCEDURAL_VISUALS, 
    PillarVisualDef, 
    DomainVisualDef, 
    HexVisualDef,
    BeamVisualDef,
    GridVisualDef,
    DEFAULT_PILLAR_CONFIG,
    DEFAULT_DOMAIN_CONFIG,
    DEFAULT_HEX_CONFIG,
    DEFAULT_BEAM_CONFIG,
    DEFAULT_GRID_CONFIG
} from "../../../../data/vfx/procedural_visuals";

const UNIT_CHEST_HEIGHT = 40;

// Optimization: Precomputed Unit Hexagon (Radius 1.0)
// FIXED: Alignment with Terrain
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_CORNERS_X: number[] = [];
const HEX_CORNERS_Y: number[] = [];

for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_CORNERS_X.push(Math.cos(angle));
    HEX_CORNERS_Y.push(Math.sin(angle));
}

function traceHexagonFast(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    ctx.moveTo(HEX_CORNERS_X[0] * r, HEX_CORNERS_Y[0] * r);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(HEX_CORNERS_X[i] * r, HEX_CORNERS_Y[i] * r);
    }
    ctx.closePath();
}

export const ParticleRenderer = {
    
    /**
     * Draws a single particle at the given LOCAL coordinates (0,0 assumed if context is translated).
     * @param ctx Canvas Context
     * @param p Particle Data
     * @param drawX Local X offset (usually 0 if caller handled translate)
     * @param drawY Local Y offset (usually 0 if caller handled translate)
     * @param progress Lifecycle 0->1
     * @param isChaos Visual style flag
     */
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, isChaos: boolean) {
        ctx.save();
        
        // 1. Base Position
        // CRITICAL FIX: Do NOT use p.x/p.y here. The context is already translated by the RenderList.
        // We only translate by the local offset (drawX, drawY), which is typically 0,0.
        ctx.translate(drawX, drawY);

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
        
        // --- 1. HEX SHAPES (Hex Beam / Giant Hex) ---
        if (p.type === 'HEX_BEAM' || p.type === 'GIANT_HEX') {
            const rawDef = PROCEDURAL_VISUALS[p.style || ''] || 
                          (p.type === 'HEX_BEAM' ? PROCEDURAL_VISUALS['HEX_CORE'] : PROCEDURAL_VISUALS['HEX_SOLID']);
            
            const def = rawDef as HexVisualDef;
            
            ctx.scale(1, ISO_SCALE_Y);
            if (p.type === 'GIANT_HEX') ctx.rotate(p.rotation);
            if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;
            
            if (def.filled) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = (1 - progress) * (p.type === 'HEX_BEAM' ? 0.9 : 0.8);
                traceHexagonFast(ctx, p.size); ctx.fill();
            }
            
            if (def.innerScale) {
                ctx.fillStyle = '#fff';
                traceHexagonFast(ctx, p.size * def.innerScale); ctx.fill();
            }
            
            if (def.stroked) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = def.strokeWidth || 2;
                traceHexagonFast(ctx, p.size); ctx.stroke();
            }
        }
        // --- 2. GRID FIELD (Data Driven) ---
        else if (p.type === 'GRID_FIELD') {
            let config: GridVisualDef = DEFAULT_GRID_CONFIG;
            if (p.style && PROCEDURAL_VISUALS[p.style]) {
                config = PROCEDURAL_VISUALS[p.style] as GridVisualDef;
            } 

            if (config.blendMode) ctx.globalCompositeOperation = config.blendMode;

            if (config.isLiquid) {
                SurfaceAssets.drawLiquid(ctx, 0, 0, config.color, now, progress);
            } else {
                const height = (config.height || 15) * progress;
                SurfaceAssets.drawExtrusion(ctx, 0, 0, height, config.color, config.opacity || 0.6);
            }
        }
        // --- 3. PILLARS ---
        else if (p.type === 'PILLAR') {
            const rawDef = PROCEDURAL_VISUALS[p.style || ''] || DEFAULT_PILLAR_CONFIG;
            const def = rawDef as PillarVisualDef;

            const h = def.height || 1200; 
            const width = p.size * (1 - progress * 0.5) * (def.widthScale || 1.0);
            
            ctx.save();
            if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;
            
            const grad = ctx.createLinearGradient(0, 0, 0, -h);
            const colBottom = def.gradientBottom === 'current' ? p.color : (def.gradientBottom || p.color);
            
            grad.addColorStop(0, colBottom || p.color);
            grad.addColorStop(0.2, '#fff');
            grad.addColorStop(1, def.gradientTop || 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = (1 - progress);
            ctx.fillRect(-width/2, -h, width, h);
            
            if (def.hasBaseRing) {
                ctx.scale(1, ISO_SCALE_Y);
                ctx.beginPath(); ctx.arc(0, 0, width, 0, Math.PI*2);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            ctx.restore();
        }
        // --- 4. DOMAINS ---
        else if (p.type === 'DOMAIN') {
            const rawDef = PROCEDURAL_VISUALS[p.style || ''] || DEFAULT_DOMAIN_CONFIG;
            const def = rawDef as DomainVisualDef;
            
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            
            if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;
            
            const grad = ctx.createRadialGradient(0, 0, r*0.5, 0, 0, r);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'rgba(255,255,255,0.5)');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = (def.fillAlpha || 0.3) * (1 - progress);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = def.rimColor || '#ffffff';
            ctx.globalAlpha = 0.15;
            ctx.lineWidth = def.rimWidth || 1;
            if (def.dashed) ctx.setLineDash([10, 10]);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
        // --- 5. BEAMS ---
        else if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
            // NOTE: Beam logic uses p.targetX relative calculations.
            // Since we are now in local space (0,0), we rely on the p.targetX/Y that was prepared in RenderList
            // OR we must ensure p has the relative coords.
            // The renderer logic in GameRenderer.ts prepares this relative coordinate.
            
            if (p.targetX !== undefined && p.targetY !== undefined) {
                const styleId = p.style || (p.type === 'DEATH_RAY' ? 'DEATH_RAY' : 'GENERIC_BEAM');
                const rawDef = PROCEDURAL_VISUALS[styleId] || DEFAULT_BEAM_CONFIG;
                const conf = rawDef as BeamVisualDef;

                // Source is (0,0) because of context translation
                const startVisY = -UNIT_CHEST_HEIGHT;
                
                // Target is relative
                const dx = p.targetX;
                const dy = p.targetY;
                const targetVisY = dy - UNIT_CHEST_HEIGHT; // Approximate visual target Y relative to source visual Y
                
                const dist = Math.sqrt(dx*dx + (targetVisY - startVisY)**2);
                const angle = Math.atan2(targetVisY - startVisY, dx);
                
                ctx.save();
                ctx.translate(0, startVisY); 
                ctx.rotate(angle);
                
                const coreCol = p.color !== '#fff' ? p.color : conf.coreColor;
                const glowCol = p.color !== '#fff' ? p.color : conf.glowColor;
                const width = conf.width * (p.size / 4); 

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
                        ctx.strokeStyle = glowCol;
                        ctx.shadowColor = glowCol;
                        ctx.shadowBlur = (conf.noiseScale || 0) * 5 + 10;
                        ctx.lineWidth = w * 2;
                        ctx.globalAlpha = 0.6 * (1 - progress);
                        
                        let y1 = 0, y2 = 0;
                        if (conf.noiseScale && conf.noiseScale > 0) {
                            y1 = (Math.random()-0.5) * conf.noiseScale;
                            y2 = (Math.random()-0.5) * conf.noiseScale;
                        }

                        ctx.beginPath(); ctx.moveTo(0,y1); ctx.lineTo(dist, y2); ctx.stroke();
                        ctx.shadowBlur = 0;

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
    }
};
