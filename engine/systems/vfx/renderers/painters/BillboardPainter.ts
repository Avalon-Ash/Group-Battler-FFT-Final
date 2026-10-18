import { Particle } from "../../state";
import { VFXFactory } from "../../../../graphics/VFXFactory";
import { BILLBOARD } from "../../../../../constants";

/**
 * 看板繪製：目前只有天氣粒子（ATMOSPHERE，VFXAmbience 生成；地形 T4 會改零件）。
 * 貼圖是程序化光點（VFXFactory GLOW_SPRITE，快取在粒子上），以 screen 疊加，進場先維持再淡出。
 */
export const BillboardPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number) {
        let img = p.image || p.texture;
        if (!img) {
            p.image = VFXFactory.getTexture(p.type, p.color);
            img = p.image;
        }
        const ease = 1 - Math.pow(1 - progress, 3);
        const scale = BILLBOARD.SCALE_FROM + ease * BILLBOARD.SCALE_GROW;
        const alpha = progress < BILLBOARD.HOLD_UNTIL ? BILLBOARD.HOLD_ALPHA : (1 - progress) * BILLBOARD.FADE_MUL;
        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.globalCompositeOperation = p.blendMode ?? 'screen';
        ctx.globalAlpha = alpha;
        const drawSize = p.size * scale;
        ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
        ctx.restore();
    }
};
