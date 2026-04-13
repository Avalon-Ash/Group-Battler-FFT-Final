
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
     * 高效能草地渲染器 v3.0 (Sprite Based)
     * 使用預渲染精靈取代即時幾何計算
     */
    drawGrass(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string, 
        density: number, 
        time: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        // 數學風力偏移：僅在 drawImage 時應用微小的 skew 或 translation，效能極高
        const windX = Math.sin(time * 1.2 + x * 0.05) * 4;
        
        const tufts = [
            { x: -14, y: -2,  v: 1 },
            { x: 12,  y: 4,   v: 2 },
            { x: -2,  y: 14,  v: 3 }
        ];

        for (let i = 0; i < tufts.length; i++) {
            const t = tufts[i];
            const sprite = VFXFactory.getGrassSprite(color, t.v);
            
            // 繪製預渲染的草叢 (含陰影與高光)
            // skrew 效果模擬風吹，比重新 pathTuft 快數百倍
            ctx.drawImage(sprite, t.x + windX - 32, t.y - 48);
        }
        
        ctx.restore();
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
        if (Number.isFinite(w)) {
            const grad = ctx.createLinearGradient(-w, -w, w, w);
            const start = slide - 0.3;
            const end = slide + 0.3;
            grad.addColorStop(Math.max(0, Math.min(1, start)), 'rgba(255,255,255,0)');
            grad.addColorStop(Math.max(0, Math.min(1, slide)), 'rgba(255,255,255,0.25)'); 
            grad.addColorStop(Math.max(0, Math.min(1, end)), 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(-size, -size, size*2, size*2);
        }
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
