
import { Particle } from "../../state";
import { ISO_SCALE_Y, HEX_SIZE } from "../../../../../constants";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { VFXFactory } from "../../../../graphics/VFXFactory";
import { HexLayout } from "../../../../../types";
import { VisualMath } from "../../../../math/VisualMath";
import { MaterialPainter } from "../../../../graphics/materials/MaterialPainter";
import { MATERIAL_CONFIG } from "../../../../../data/vfx/materialConfig";

export const GroundPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number, layout: HexLayout) {
        
        // 1. 向量幾何處理
        if (['SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'GRID_FIELD', 'MAGIC_CIRCLE'].includes(p.type)) {
            this.drawVectorGeometry(ctx, p, progress, drawX, drawY, layout);
            return;
        }

        let img = p.image || p.texture;
        if (!img && p.type !== 'SPRITE' && p.type !== 'GENERIC_DEBUG') {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
            img = p.image;
        }
        
        if (!img) return;

        let alpha = 1.0 - progress;
        if (p.type === 'CRACKS') alpha = 1.0 - Math.pow(progress, 4);

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(1, ISO_SCALE_Y); 
        
        if (p.rotation) ctx.rotate(p.rotation);
        
        ctx.globalCompositeOperation = p.blendMode || 'screen';
        ctx.globalAlpha = Math.min(1, alpha);

        const size = p.size;
        ctx.drawImage(img, -size, -size, size * 2, size * 2);
        
        ctx.restore();
    },

    drawGenericGrid(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const alpha = 1.0 - Math.pow(progress, 4);
        let color = p.color;
        if (p.visualStyle === 'GRID_TECH_BLUE') color = '#3b82f6';
        if (p.visualStyle === 'GRID_CORRUPT_RED') color = '#ef4444';
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        const hexRadius = HEX_SIZE;
        ctx.beginPath();
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.95, true, layout);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.15;
        ctx.fill();
    },

    drawFireField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const hexRadius = HEX_SIZE;

        // [MATERIAL UPGRADE] 隨機裂紋 + shadowBlur 改為離屏烘焙的灼痕貼圖（噪聲裁切邊緣）
        if (MATERIAL_CONFIG.enabled) {
            const tex = MaterialPainter.bakeScorch(MATERIAL_CONFIG.maskResolution, 11);
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'source-over';
            const r = hexRadius * 0.95;
            ctx.drawImage(tex, -r, -r, r * 2, r * 2);
            ctx.restore();
            return;
        }

        // Lava pool effect
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 15;
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.9, true, layout);
        ctx.fill();

        // Cracks
        ctx.strokeStyle = '#fdba74';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<3; i++) {
            const ang = Math.random() * Math.PI * 2;
            const len = hexRadius * 0.8;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len * ISO_SCALE_Y);
        }
        ctx.stroke();
    },

    drawIceField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const hexRadius = HEX_SIZE;

        // [MATERIAL UPGRADE] 以 fbm 遮罩裁切的霜面，取代純色六邊形 + 兩條白橢圓
        if (MATERIAL_CONFIG.enabled) {
            const tex = MaterialPainter.bakeIceCrust(MATERIAL_CONFIG.maskResolution, 7);
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'source-over';
            const r = hexRadius * 0.95;
            ctx.drawImage(tex, -r, -r, r * 2, r * 2);
            ctx.restore();
            return;
        }

        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)'; // Light blue
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.95, true, layout);
        ctx.fill();
        
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shine highlights
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(-10, -10 * ISO_SCALE_Y, 15, 5 * ISO_SCALE_Y, Math.PI/4, 0, Math.PI*2);
        ctx.fill();
    },

    drawPoisonField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const hexRadius = HEX_SIZE;
        ctx.fillStyle = p.color;
        ctx.globalAlpha *= 0.6;
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.9, true, layout);
        ctx.fill();

        // Bubbles
        ctx.fillStyle = '#bef264';
        for(let i=0; i<3; i++) {
            const ox = (Math.random()-0.5) * hexRadius * 1.2;
            const oy = (Math.random()-0.5) * hexRadius * 1.2;
            const r = 2 + Math.random() * 4;
            ctx.beginPath(); ctx.arc(ox, oy * ISO_SCALE_Y, r, 0, Math.PI*2); ctx.fill();
        }
    },

    drawVoidField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const hexRadius = HEX_SIZE;
        ctx.fillStyle = '#000';
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.8, true, layout);
        ctx.fill();

        ctx.strokeStyle = p.color; // purple
        ctx.lineWidth = 4;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        HexGeometry.traceHex(ctx, 0, 0, hexRadius * 0.82, true, layout);
        ctx.stroke();
    },

    drawVectorGeometry(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number, layout: HexLayout) {
        ctx.save();
        ctx.translate(drawX, drawY);
        
        ctx.globalCompositeOperation = p.blendMode || 'screen';

        if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST') {
            const alpha = 1.0 - Math.pow(progress, 2);
            if (alpha <= 0.01) { ctx.restore(); return; }

            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.type === 'BLAST' ? 30 : 15;
            
            // Explosive Easing - pops much faster in the first 20% of life, allowing it to be seen even on low FPS 
            const easeOut = 1 - Math.pow(1 - progress, 4);
            const currentRadius = p.size * Math.max(0.2, easeOut);
            
            if (p.type === 'BLAST') {
                // Blast is a massive fill flash
                ctx.fillStyle = p.color;
                HexGeometry.traceHex(ctx, 0, 0, currentRadius, true, layout);
                ctx.fill();
            } else {
                ctx.strokeStyle = p.color;
                const lineWidth = Math.max(1, (1 - progress) * (p.type === 'SHOCKWAVE' ? 14 : 4));
                ctx.lineWidth = lineWidth;
                HexGeometry.traceHex(ctx, 0, 0, currentRadius, true, layout);
                ctx.stroke();
                
                // Inner ring feedback for powerful impacts
                if (p.type === 'SHOCKWAVE') {
                    ctx.lineWidth = lineWidth * 0.4;
                    ctx.globalAlpha = alpha * 0.6;
                    HexGeometry.traceHex(ctx, 0, 0, currentRadius * 0.75, true, layout);
                    ctx.stroke();
                }
            }
        }
        else if (p.type === 'GRID_FIELD') {
            const alpha = 1.0 - Math.pow(progress, 4);
            ctx.globalAlpha = alpha;
            
            // Handle specialized visual styles for hazards
            if (p.visualStyle === 'FIRE') {
                this.drawFireField(ctx, p, progress, layout);
            } else if (p.visualStyle === 'ICE') {
                this.drawIceField(ctx, p, progress, layout);
            } else if (p.visualStyle === 'POISON') {
                this.drawPoisonField(ctx, p, progress, layout);
            } else if (p.visualStyle === 'VOID') {
                this.drawVoidField(ctx, p, progress, layout);
            } else {
                this.drawGenericGrid(ctx, p, progress, layout);
            }
        }
        else if (p.type === 'HEX_GLOW') {
            const alpha = 1.0 - Math.pow(progress, 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.3;
            HexGeometry.traceHex(ctx, 0, 0, p.size, true, layout);
            ctx.fill();
        }

        ctx.restore();
    }
};
