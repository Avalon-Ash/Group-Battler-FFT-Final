
import { HexGeometry } from "../utils/HexGeometry";
import { VFXFactory } from "../VFXFactory";
import { HexLayout } from "../../../types";

export const VolumePainter = {
    
    draw3DPrism(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        height: number,
        color: string,
        opacity: number,
        style: 'SOLID' | 'GRADIENT_FADE' | 'HATCHED_WARNING',
        layout: HexLayout = 'FLAT',
        rotation: number = 0
    ) {
        ctx.save();
        ctx.translate(x, y); 
        
        const verts = HexGeometry.getRotatedVertices(radius, rotation, true, layout);
        
        // 1. 繪製側面 (Sides)
        // 對於透明/結界類特效，我們繪製所有 6 個面以確保 3D 感
        const isTransparent = style === 'GRADIENT_FADE';
        const indices = isTransparent ? [0, 1, 2, 3, 4, 5] : [5, 0, 1]; 
        
        let sideFill: CanvasGradient | string = color;
        if (style === 'GRADIENT_FADE') {
            const grad = ctx.createLinearGradient(0, -height, 0, 0);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            sideFill = grad;
        }

        ctx.fillStyle = sideFill;
        ctx.globalAlpha = opacity * (isTransparent ? 0.3 : 0.5); 

        for (const i of indices) {
            const j = (i + 1) % 6;
            const v1 = verts[i];
            const v2 = verts[j];
            
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);           
            ctx.lineTo(v2.x, v2.y);           
            ctx.lineTo(v2.x, v2.y - height);  
            ctx.lineTo(v1.x, v1.y - height);  
            ctx.closePath();
            ctx.fill();
            
            // 繪製垂直稜線
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v1.x, v1.y - height);
            ctx.stroke();
            
            // 補上最後一條線
            if (i === indices[indices.length - 1]) {
                ctx.beginPath(); ctx.moveTo(v2.x, v2.y); ctx.lineTo(v2.x, v2.y - height); ctx.stroke();
            }
        }

        // 2. 繪製頂部蓋子 (Top Cap)
        ctx.save();
        ctx.translate(0, -height);
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.3;
        
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for(let i=1; i<6; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 1.0;
        ctx.stroke();
        ctx.restore();

        // 3. 繪製底部輪廓 (Bottom Outline) - 增加接地感
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.5;
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for(let i=1; i<6; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    },

    drawVolumetricHex(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number
    ) {
        const texture = VFXFactory.getTexture('ATMOSPHERE', color);
        const size = radius * 2.8; 

        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawHexRipple(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number,
        width: number,
        layout: HexLayout = 'FLAT'
    ) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 1.5;
        
        HexGeometry.traceHex(ctx, x, y, radius, true, layout);
        ctx.stroke();
        
        ctx.lineWidth = width * 0.2;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    },

    drawExtrusion(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        height: number,
        color: string,
        opacity: number,
        layout: HexLayout = 'FLAT'
    ) {
        const verts = HexGeometry.getVertices(radius, true, layout);
        const indices = [5, 0, 1];

        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = opacity;

        let extrudeFill: CanvasGradient | string = color;
        if (Number.isFinite(height)) {
            const grad = ctx.createLinearGradient(0, -height, 0, 0);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            extrudeFill = grad;
        }
        ctx.fillStyle = extrudeFill;

        for (const i of indices) {
            const j = (i + 1) % 6;
            const v1 = verts[i];
            const v2 = verts[j];

            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y - height);
            ctx.lineTo(v2.x, v2.y - height);
            ctx.lineTo(v2.x, v2.y);
            ctx.lineTo(v1.x, v1.y);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.6;
        HexGeometry.traceHex(ctx, 0, -height, radius, true, layout);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;
        ctx.stroke();

        ctx.restore();
    }
};
