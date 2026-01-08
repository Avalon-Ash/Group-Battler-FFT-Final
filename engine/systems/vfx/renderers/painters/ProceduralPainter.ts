
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VolumePainter } from "../../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../../types";

export const ProceduralPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout = 'FLAT') {
        ctx.save();
        
        // 1. 處理地面法陣類 (Locked to Ground)
        if (['HEX_BEAM', 'GIANT_HEX', 'MAGIC_CIRCLE', 'BLACK_HOLE'].includes(p.type)) {
            // 使用 now * vRotation 確保動畫平滑，不跳幀
            const animRot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            if (p.type === 'GIANT_HEX') {
                this.drawVolumetricHex(ctx, p, animRot, layout);
            } else if (p.type === 'MAGIC_CIRCLE') {
                this.drawTechMandala(ctx, p, animRot, layout);
            } else if (p.type === 'BLACK_HOLE') {
                this.drawBlackHole(ctx, p, progress, now, layout);
            } else {
                this.drawStandardHexVfx(ctx, p, animRot, progress, layout);
            }
        }
        // 2. 處理體積投射類 (3D Entities)
        else if (p.type === 'PILLAR') {
            this.drawHexPillar(ctx, p, progress, now, layout);
        }
        else if (p.type === 'DOMAIN') {
            this.drawHexDomain(ctx, p, progress, layout);
        }
        
        ctx.restore();
    },

    drawBlackHole(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout) {
        let scale = 1.0;
        if (progress < 0.2) scale = progress / 0.2; 
        else if (progress > 0.8) scale = (1 - progress) / 0.2; 
        
        const size = p.size * scale;
        if (size < 1) return;

        // 1. 吸積盤 (六邊形化)
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y); 
        const rot = now * 3.0;
        ctx.rotate(rot);
        
        const grad = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size);
        grad.addColorStop(0, 'rgba(0,0,0,1)'); 
        grad.addColorStop(0.2, p.color);       
        grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
        grad.addColorStop(0.8, p.color);       
        grad.addColorStop(1, 'transparent');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        
        // 強制使用六邊形幾何繪製吸積盤
        HexGeometry.traceHex(ctx, 0, 0, size, false, layout);
        ctx.fill();
        
        // 螺旋臂 (幾何線條)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for(let i=0; i<3; i++) {
            const rOffset = (i * Math.PI * 2) / 3;
            ctx.moveTo(0,0);
            const x = Math.cos(rOffset) * size;
            const y = Math.sin(rOffset) * size;
            ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();

        // 2. 事件視界 (核心球體 - 物理特異點仍保持圓形)
        const coreSize = size * 0.3;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.shadowColor = p.color;
        // Optimization: Reduce Shadow Blur for FPS
        ctx.shadowBlur = 10 * scale; 
        ctx.beginPath(); ctx.arc(0, 0, coreSize, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * 2.5D 全息六邊形 (Volumetric Hologram)
     * 利用多層疊加創造厚度感，這是 Tech/Magic 的核心視覺
     */
    drawVolumetricHex(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        
        const layers = 3; // 產生 3 層堆疊
        const layerDist = 15; // 每層高度差 px (Z軸)
        const fade = 1 - (p.life / p.maxLife);
        
        // 1. 核心底層 (Ground Projection)
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2 * (1 - fade);
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();
        ctx.restore();

        // 2. 懸浮層疊 (Levitating Stack)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        
        for(let i = 1; i <= layers; i++) {
            // 隨時間稍微壓縮堆疊高度，產生落地感
            const h = i * layerDist; 
            // 越上層越小 (透視感)
            const scale = 1.0 - (i * 0.05); 
            
            ctx.save();
            ctx.translate(0, -h); // 向上位移 (2.5D Z軸)
            ctx.globalAlpha = (0.8 / i) * (1 - fade); // 越上層越透明
            
            // 每層稍微旋轉錯位
            HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * scale, rot + (i * 0.1), true, layout);
            ctx.stroke();
            
            // 頂層加亮
            if (i === layers) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.1 * (1 - fade);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.8 * (1 - fade);
                ctx.stroke();
            }
            ctx.restore();
            
            // 3. 連接線 (角落立柱) - 增加結構感
            if (i === 1) {
                const vertsBottom = HexGeometry.getVertices(p.size, true, layout);
                // 為了效能，只畫 3 條間隔的線
                for(let k=0; k<6; k+=2) {
                    const v = vertsBottom[k];
                    // 簡單旋轉變換 (近似)
                    const cos = Math.cos(rot); const sin = Math.sin(rot);
                    const rx = v.x * cos - v.y * sin;
                    const ry = v.x * sin + v.y * cos; 
                    
                    ctx.save();
                    ctx.strokeStyle = p.color;
                    ctx.globalAlpha = 0.15;
                    ctx.beginPath();
                    ctx.moveTo(rx, ry); // 地面
                    ctx.lineTo(rx, ry - (layers * layerDist)); // 頂層
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    },

    /**
     * 科技曼陀羅 (Tech Mandala)
     * 複雜的旋轉六邊形陣列，取代原本的 Magic Circle
     */
    drawTechMandala(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = p.color;
        ctx.shadowBlur = 0; 
        
        // 外環：逆時針慢轉
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.stroke();
        
        // 內環：順時針快轉 (虛線)
        ctx.save();
        ctx.setLineDash([15, 10]);
        ctx.lineWidth = 1.5;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.7, -rot * 1.5, true, layout);
        ctx.stroke();
        ctx.restore();

        // 核心：脈衝實心六邊形
        const pulse = 0.5 + Math.sin(rot * 5) * 0.2;
        ctx.globalAlpha = pulse * 0.5;
        ctx.fillStyle = p.color;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.3, rot * 2, true, layout);
        ctx.fill();
        
        // 掃描光束
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        const beamLen = p.size * 1.2;
        ctx.moveTo(0, 0);
        // 使用 ISO_SCALE_Y 確保光束貼地
        ctx.lineTo(Math.cos(rot * 3) * beamLen, Math.sin(rot * 3) * beamLen * ISO_SCALE_Y);
        ctx.lineWidth = 4;
        ctx.stroke();
    },

    drawStandardHexVfx(ctx: CanvasRenderingContext2D, p: Particle, rot: number, progress: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - progress) * 0.6;
        ctx.fillStyle = p.color;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.stroke();
    },

    /**
     * 六邊形光柱 (Hex Pillar)
     * 取代傳統圓柱，這是 2.5D 的靈魂
     */
    drawHexPillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout) {
        const h = p.height || 1000; 
        const w = p.size * (1 - progress * 0.2); // 稍微收縮
        const color = p.color;
        
        ctx.globalCompositeOperation = 'screen';
        
        const verts = HexGeometry.getVertices(w, true, layout);
        
        // 1. 填充柱體 (Back faces only for transparency simulation)
        ctx.fillStyle = color;
        ctx.globalAlpha = (1 - progress) * 0.15;
        
        ctx.beginPath();
        // 投射到底部
        ctx.moveTo(verts[0].x, -h); 
        for(let i=1; i<6; i++) ctx.lineTo(verts[i].x, -h); // Top Cap
        // 這裡簡化處理，直接畫一個半透明矩形覆蓋區域
        const bottomY = 0;
        ctx.lineTo(verts[5].x, bottomY);
        ctx.lineTo(verts[0].x, bottomY);
        ctx.fill();

        // 2. 掃描線 (Scanline)
        const scanY = -( (now * 800) % h );
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = (1 - progress) * 0.6;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        // 畫一個在 scanY 高度的六邊形環
        ctx.moveTo(verts[0].x, verts[0].y + scanY);
        for(let i=1; i<6; i++) ctx.lineTo(verts[i].x, verts[i].y + scanY);
        ctx.closePath();
        ctx.stroke();

        // 3. 垂直稜線 (Vertical Edges) - 強化立體感
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = (1 - progress) * 0.4;
        ctx.beginPath();
        [0, 2, 4].forEach(idx => { // 只畫間隔的線，避免太亂
            ctx.moveTo(verts[idx].x, 0);
            ctx.lineTo(verts[idx].x, -h);
        });
        ctx.stroke();

        // 4. 底部光環
        ctx.globalAlpha = (1 - progress) * 0.5;
        HexGeometry.traceHex(ctx, 0, 0, w * 1.2, true, layout);
        ctx.stroke();
    },

    drawHexDomain(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const r = p.size;
        const h = 80; // 結界高度
        const opacity = 0.4 * (1 - progress);
        
        // 強制使用六邊形稜鏡
        VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE', layout);
        
        // 頂部蓋子 (Top Cap) - 六邊形網格
        ctx.save();
        ctx.translate(0, -h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.5;
        ctx.setLineDash([5, 5]);
        // 內部網格線
        ctx.beginPath();
        ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
        ctx.moveTo(-r/2, -r*ISO_SCALE_Y); ctx.lineTo(r/2, r*ISO_SCALE_Y);
        ctx.moveTo(r/2, -r*ISO_SCALE_Y); ctx.lineTo(-r/2, r*ISO_SCALE_Y);
        ctx.stroke();
        ctx.restore();
    }
};
