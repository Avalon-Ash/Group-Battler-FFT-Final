
import { Particle } from "../../state";
import { VFXFactory } from "../../../../graphics/VFXFactory";

/**
 * 告示板粒子繪製器 v28.0 - 視覺豐富版
 * 絕對遵守視覺約束：還原被錯誤削減的煙霧特效
 */
export const BillboardPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number) {
        let img = p.image || p.texture;
        
        if (!img && p.type !== 'SPRITE' && p.type !== 'GENERIC_DEBUG') {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
            img = p.image;
        }
        
        let scale = 1.0;
        let alpha = 1.0; 
        const type = p.type;

        // --- 煙霧特效還原 (Visibility Restoration v28) ---
        if (type === 'SMOKE' || type === 'SMOKE_PUFF' || type === 'ATMOSPHERE') {
            const blastEase = 1 - Math.pow(1 - progress, 5);
            scale = 0.9 + blastEase * 0.6; // 稍微放大的體積感
            
            // 還原透明度至 0.88 (符合減少 10% 的適中感)
            // 延後淡出觸發點，保留煙霧存在感
            if (progress < 0.7) {
                alpha = 0.88; 
            } else {
                // 平滑淡出 (1.0 - 0.7) = 0.3
                alpha = (1.0 - progress) * 3.33; 
            }
        } 
        else if (type === 'SPARK' || type === 'GLOW') {
            scale = 1.0 - (progress * 0.4); 
            alpha = Math.min(0.95, (1.0 - progress) * 3.5); 
        } 
        else if (['RUBBLE', 'ROCK', 'DEBRIS', 'SHARD', 'SPRITE'].includes(type)) {
            scale = 1.0;
            alpha = progress > 0.85 ? (1.0 - progress) * 6.6 : 1.0;
        } 
        else {
            scale = 1.0 - (progress * progress);
            alpha = 1.0 - progress;
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        if (p.rotation) ctx.rotate(p.rotation);

        if (p.blendMode) {
            ctx.globalCompositeOperation = p.blendMode;
        } else {
            const isEnergy = (type === 'SPARK' || type === 'GLOW' || type === 'ATMOSPHERE');
            ctx.globalCompositeOperation = isEnergy ? 'screen' : 'source-over';
        }

        ctx.globalAlpha = alpha;
        const drawSize = p.size * scale;

        // 影子隨透明度同步消散
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'SPRITE'].includes(type)) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.4 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.beginPath(); ctx.arc(2, 4, drawSize * 0.75, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        if (img) {
            ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, drawSize, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
};
