
import { Particle } from "../state";
import { ISO_SCALE_Y } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { PROCEDURAL_VISUALS, PillarVisualDef, DomainVisualDef, HexVisualDef, BeamVisualDef, GridVisualDef, DEFAULT_PILLAR_CONFIG, DEFAULT_DOMAIN_CONFIG, DEFAULT_BEAM_CONFIG, DEFAULT_GRID_CONFIG } from "../../../../data/vfx/procedural_visuals";

// Helper for hex tracing
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
    for (let i = 1; i < 6; i++) ctx.lineTo(HEX_CORNERS_X[i] * r, HEX_CORNERS_Y[i] * r);
    ctx.closePath();
}

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, isChaos: boolean) {
        ctx.save();
        ctx.translate(drawX, drawY);

        const now = Date.now() / 1000;

        // Texture Resolution - Map types to new Hard Surface textures
        if (!p.texture && !p.image && !['PILLAR', 'DOMAIN', 'HEX_BEAM', 'GIANT_HEX', 'GRID_FIELD', 'DEATH_RAY', 'BEAM'].includes(p.type)) {
            let texType: any = 'RUBBLE'; // Default to gravel
            
            if (p.type === 'SHARD' || p.type === 'DEBRIS' || p.type === 'ROCK') texType = 'SHARD';
            else if (p.type === 'SMOKE' || p.type === 'DUST' || p.type === 'RUBBLE') texType = 'RUBBLE';
            else if (p.type === 'SPARK' || p.type === 'STREAK') texType = 'SPARK';
            else if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST' || p.type === 'SPIKE') texType = 'SPIKE';
            else if (p.type === 'GLOW') texType = 'SPIKE'; // No more soft glows
            else if (p.type === 'CRACKS') texType = 'CRACKS';
            
            p.texture = VFXFactory.getTexture(texType, p.color);
        }

        if (p.image) {
            ctx.rotate(p.rotation);
            ctx.globalAlpha = 1 - progress;
            const size = Math.floor(p.size);
            ctx.drawImage(p.image, -size/2, -size/2, size, size);
        }
        else if (p.texture) {
            // PHYSICAL RENDERING
            ctx.rotate(p.rotation);
            
            // Blending Logic
            if (p.type === 'SPARK' || p.type === 'STREAK') {
                ctx.globalCompositeOperation = 'lighter'; 
            } else if (p.type === 'SPIKE' || p.type === 'SHOCKWAVE') {
                ctx.globalCompositeOperation = 'screen'; 
            } else {
                ctx.globalCompositeOperation = 'source-over'; // Rocks are solid
            }

            // Alpha / Size Logic
            let alpha = 1.0;
            let scale = 1.0;

            if (p.type === 'RUBBLE' || p.type === 'SMOKE') {
                // Gravel scatters and fades
                scale = 0.5 + progress * 0.5;
                alpha = (1 - progress) * 0.9;
            } else if (p.type === 'SHARD' || p.type === 'DEBRIS') {
                // Solids stay solid until very end
                scale = 1.0;
                alpha = progress > 0.8 ? (1 - progress) * 5 : 1.0;
            } else if (p.type === 'SPARK') {
                scale = 1.0 - progress;
                alpha = 1.0 - progress;
            } else if (p.type === 'SPIKE') {
                // Impact flash
                scale = 0.5 + progress * 1.5;
                alpha = 1.0 - Math.pow(progress, 2);
            }

            ctx.globalAlpha = alpha;
            const s2 = p.size * scale * 2;
            ctx.drawImage(p.texture, -s2/2, -s2/2, s2, s2);
        }
        else {
            this.drawProcedural(ctx, p, progress, isChaos, now);
        }

        ctx.restore();
    },

    // ... (Procedural methods kept same) ...
    drawProcedural(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean, now: number) {
        
        if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
             if (p.targetX !== undefined && p.targetY !== undefined) {
                const dx = p.targetX;
                const dy = p.targetY; // relative coords
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(dx, dy - (p.targetZ || 0));
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * (1-progress);
                ctx.lineCap = 'butt'; // Sharp ends
                ctx.globalCompositeOperation = 'screen';
                ctx.stroke();
                
                // White core
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = p.size * (1-progress) * 0.3;
                ctx.stroke();
             }
        }
        else if (p.type === 'HEX_BEAM' || p.type === 'GIANT_HEX') {
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
    }
};
