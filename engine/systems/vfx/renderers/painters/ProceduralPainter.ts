
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VolumePainter } from "../../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../../types";
import { MaterialPainter } from "../../../../graphics/materials/MaterialPainter";
import { MATERIAL_CONFIG } from "../../../../../data/vfx/materialConfig";

export const ProceduralPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout = 'FLAT') {
        ctx.save();
        
        // 1. 處理地面法陣類 (Locked to Ground)
        if (['GIANT_HEX', 'MAGIC_CIRCLE', 'BLACK_HOLE'].includes(p.type)) {
            // 使用 now * vRotation 確保動畫平滑，不跳幀
            const animRot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            if (p.type === 'GIANT_HEX') {
                this.drawVolumetricHex(ctx, p, animRot, layout);
            } else if (p.type === 'MAGIC_CIRCLE') {
                this.drawTechMandala(ctx, p, animRot, layout);
            } else if (p.type === 'BLACK_HOLE') {
                this.drawBlackHole(ctx, p, progress, now, layout);
            }
        }
        // 2. 處理體積投射類 (3D Entities)
        else if (p.type === 'PILLAR' || p.type === 'HEX_BEAM') {
            this.drawHexPillar(ctx, p, progress, now, layout);
        }
        else if (p.type === 'DOMAIN') {
            this.drawHexDomain(ctx, p, progress, now, layout);
        }
        else if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
            this.drawBeam(ctx, p, progress, now);
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
        ctx.stroke();
        ctx.shadowBlur = 0;
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
                const vertsBottom = HexGeometry.getVertices(p.size, false, layout);
                const cos = Math.cos(rot);
                const sin = Math.sin(rot);
                
                // 為了效能，只畫 3 條間隔的線
                for(let k=0; k<6; k+=2) {
                    const v = vertsBottom[k];
                    // 2D 旋轉
                    const rx = v.x * cos - v.y * sin;
                    const ry = v.x * sin + v.y * cos; 
                    
                    // 投影
                    const px = rx;
                    const py = ry * ISO_SCALE_Y;
                    
                    ctx.save();
                    // [SSOT FIX] Pillar base must start exactly at ground center (op.ty)
                    // to avoid visual insertion into high-terrain walls.
                    // Start at (px, 0) relative to ground center, not (px, py).
                    ctx.strokeStyle = p.color;
                    ctx.globalAlpha = 0.15;
                    ctx.beginPath();
                    ctx.moveTo(px, 0); // 地面中心基準線
                    ctx.lineTo(px, -(layers * layerDist)); // 頂層
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
        const r = p.size * (0.8 + Math.sin(now * 4) * 0.05);
        const h = (p.height || 1000) * Math.min(1, progress * 4);
        const opacity = 0.6 * (1 - progress);
        const animRot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
        
        VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'SOLID', layout, animRot);
        
        // 額外繪製掃描線
        const scanY = -( (now * 800) % h );
        const verts = HexGeometry.getRotatedVertices(r, animRot, true, layout);
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = opacity * 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y + scanY);
        for(let i=1; i<6; i++) ctx.lineTo(verts[i].x, verts[i].y + scanY);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    },

    drawHexDomain(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout) {
        const r = p.size;
        const h = 80; // 結界高度
        const opacity = 0.4 * (1 - progress);
        const animRot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
        
        // 強制使用六邊形稜鏡
        VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE', layout, animRot);
        
        // 頂部蓋子 (Top Cap) - 六邊形網格
        ctx.save();
        ctx.translate(0, -h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.5;
        ctx.setLineDash([5, 5]);
        
        // 使用 HexGeometry 繪製內部網格，確保比例正確
        const verts = HexGeometry.getRotatedVertices(r, animRot, true, layout);
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y); ctx.lineTo(verts[3].x, verts[3].y);
        ctx.moveTo(verts[1].x, verts[1].y); ctx.lineTo(verts[4].x, verts[4].y);
        ctx.moveTo(verts[2].x, verts[2].y); ctx.lineTo(verts[5].x, verts[5].y);
        ctx.stroke();
        ctx.restore();
    },

    /**
     * 線性光束 (Linear Beam)
     * 處理 BEAM 與 DEATH_RAY
     */
    drawBeam(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number) {
        if (!p.sx || !p.tx) return;
        
        // 1. 計算螢幕空間的相對座標
        // 由於 ctx 已經 translate 到 (p.x, p.y - p.z)，即起點的螢幕位置
        const relX = p.tx - p.sx;
        const relY = (p.ty - p.tz) - (p.sy - p.sz);
        
        const dist = Math.sqrt(relX * relX + relY * relY);
        const angle = Math.atan2(relY, relX);
        
        ctx.save();
        ctx.rotate(angle);
        
        const isDeathRay = p.type === 'DEATH_RAY';
        const width = p.size * (isDeathRay ? (1.5 - progress) : (1.0 - progress));

        // [MATERIAL UPGRADE] 程序化材質路徑
        if (MATERIAL_CONFIG.enabled) {
            if (p.visualStyle === 'LIGHTNING') {
                // Ribbon strip：中點位移路徑；seed 取自起點座標，確保同一發技能路徑穩定不閃爍
                const seed = Math.floor((p.sx || 0) * 31 + (p.sy || 0) * 17 + p.maxLife * 7) | 0;
                MaterialPainter.drawRibbon(ctx, dist, 0, p.color, seed, 1 - progress * 0.5);
                ctx.restore();
                return;
            }
            MaterialPainter.drawLayeredBeam(ctx, dist, Math.max(1, width), p.color, now);
            if (isDeathRay) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.8;
                ctx.setLineDash([20, 10]);
                ctx.lineDashOffset = -now * 500;
                ctx.beginPath();
                ctx.moveTo(0, -width); ctx.lineTo(dist, -width);
                ctx.moveTo(0, width); ctx.lineTo(dist, width);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
            return;
        }

        // 2. 繪製核心光束（legacy 回退路徑，MATERIAL_CONFIG.enabled=false 時使用）
        const grad = ctx.createLinearGradient(0, -width, 0, width);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.2, p.color);
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(0.8, p.color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = isDeathRay ? 1.0 : 0.8;
        
        // 稍微抖動寬度
        const jitter = Math.sin(now * 20) * 2;
        ctx.fillRect(0, -width/2 + jitter, dist, width - jitter);
        
        // 3. 繪製邊緣粒子 (模擬能量流動)
        if (isDeathRay) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([20, 10]);
            ctx.lineDashOffset = -now * 500;
            ctx.beginPath();
            ctx.moveTo(0, -width); ctx.lineTo(dist, -width);
            ctx.moveTo(0, width); ctx.lineTo(dist, width);
            ctx.stroke();
        }
        
        ctx.restore();
    }
};
