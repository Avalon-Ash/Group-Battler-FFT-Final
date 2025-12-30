
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { VFXFactory } from "../VFXFactory";
import { HexGeometry } from "../utils/HexGeometry";
import { HexLayout } from "../../../types";

export const SurfacePainter = {
    
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number,
        layout: HexLayout = 'FLAT' 
    ) {
        ctx.save();
        const r = HEX_SIZE * 0.9;
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9 * intensity;
        ctx.fill();

        ctx.clip(); 

        const flowX = Math.sin(time * 0.5) * 8;
        const flowY = Math.cos(time * 0.4) * 8;

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(flowX, flowY, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        
        const bubbleX = Math.cos(time * 0.8) * (r * 0.4);
        const bubbleY = Math.sin(time * 0.9) * (r * 0.4) * ISO_SCALE_Y;
        
        ctx.beginPath(); 
        ctx.arc(bubbleX, bubbleY, r * 0.3, 0, Math.PI * 2); 
        ctx.fill();
        
        ctx.restore();
    },

    /**
     * 高能見度草地渲染器 v2.0
     * 解決與地表顏色過於貼近的問題
     */
    drawGrass(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string, // 地表頂層色 (theme.top)
        density: number, 
        time: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        const seed = Math.sin(x * 0.12 + y * 0.12);
        const windForce = Math.sin(time * 1.5 + x * 0.02) * 8;
        
        const tufts = [
            { x: -12, y: -4,  scale: 1.1, offset: 0 },
            { x: 10,  y: 2,   scale: 0.9, offset: 2 },
            { x: -2,  y: 12,  scale: 1.2, offset: 4 }
        ];

        for (let i = 0; i < tufts.length; i++) {
            const t = tufts[i];
            const localSeed = seed + i;
            const bx = t.x + Math.cos(localSeed * 5) * 4;
            const by = t.y + Math.sin(localSeed * 5) * 4;
            
            // 1. 根部陰影 pass (解決「浮」在空中的問題)
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(bx, by, 6 * t.scale, 3 * t.scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. 繪製草葉主體 (稍微提亮地表色)
            ctx.save();
            this.pathTuft(ctx, bx, by, windForce, t.scale);
            
            const grad = ctx.createLinearGradient(bx, by, bx + windForce * 0.5, by - 15 * t.scale);
            grad.addColorStop(0, 'rgba(0,0,0,0.5)'); // 根部深色
            grad.addColorStop(0.4, color);           // 中段地表色
            grad.addColorStop(1, '#ffffff');         // 葉尖高亮
            
            ctx.fillStyle = grad;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 2;
            ctx.fill();
            
            // 3. 邊緣勾勒 (AO 效果)
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.restore();
    },

    pathTuft(ctx: CanvasRenderingContext2D, bx: number, by: number, wind: number, scale: number) {
        const h = 16 * scale;
        const w = 5 * scale;
        
        const tipX = bx + wind * scale;
        const tipY = by - h;

        ctx.beginPath();
        ctx.moveTo(bx - w, by);
        // 增加一個貝茲曲線控制點讓葉片有厚度感
        ctx.quadraticCurveTo(bx - w * 0.8, by - h * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(bx + w * 0.8, by - h * 0.5, bx + w, by);
        ctx.closePath();
    },

    drawIceSheen(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        time: number,
        layout: HexLayout = 'FLAT'
    ) {
        ctx.save();
        ctx.translate(x, y);
        HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
        ctx.clip();
        const slide = (time * 0.5) % 2.5 - 0.7; 
        const w = size * 2;
        const grad = ctx.createLinearGradient(-w, -w, w, w);
        const start = slide - 0.3;
        const end = slide + 0.3;
        grad.addColorStop(Math.max(0, Math.min(1, start)), 'rgba(255,255,255,0)');
        grad.addColorStop(Math.max(0, Math.min(1, slide)), 'rgba(255,255,255,0.25)'); 
        grad.addColorStop(Math.max(0, Math.min(1, end)), 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-size, -size, size*2, size*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, 5); ctx.lineTo(5, -5);
        ctx.moveTo(2, 8); ctx.lineTo(8, 4);
        ctx.stroke();
        ctx.restore();
    },

    drawSandRipples(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.15; 
        const seed = Math.sin(x * 0.05 + y * 0.05);
        const offset = seed * 5;
        for(let i=-1; i<=1; i++) {
            const ly = i * 8 + offset;
            ctx.beginPath();
            for(let lx=-15; lx<=15; lx+=5) {
                const wave = Math.sin(lx * 0.3 + offset) * 2;
                if(lx === -15) ctx.moveTo(lx, ly + wave);
                else ctx.lineTo(lx, ly + wave);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12; 
        const puffs = 4;
        const twoPi = Math.PI * 2;
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.15 + (i * twoPi / puffs);
            const dist = 15 + Math.sin(time * 0.8 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const pulse = 1.0 + Math.sin(time * 1.2 + i) * 0.15;
            const pSize = size * 0.55 * pulse;
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        ctx.globalAlpha = 0.18;
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        const texture = VFXFactory.generateCracks(color);
        const size = HEX_SIZE * 2.4; 
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.rotate((x * 0.001) + (y * 0.001)); 
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawDetailTexture(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        type: string,
        color: string,
        seed: number
    ) {
        const variant = Math.abs(Math.floor(seed * 100));
        const texture = VFXFactory.getTerrainDetail(type, color, variant);
        const size = texture.width;
        ctx.drawImage(texture, x - size/2, y - size/2);
    }
};
