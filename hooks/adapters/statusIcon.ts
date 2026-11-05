import type { StatusDisplayKey } from '../../data/status/status_display';
import type { StatusPartKey } from '../../data/vfx/status_parts';
import { HUD_STATUS_STRIP as H } from '../../constants';
import { STATUS_PARTS } from '../../data/vfx/status_parts';
import { createCanvas } from '../../engine/graphics/CanvasUtils';
import { vfxPartStore, drawPart } from '../../engine/renderers/vfxparts/VFXPartStore';

const urls = new Map<StatusPartKey, string>();

/** Same baked glyphs and palette as the strip, centred only for Inspector.
 * The legacy strip's crop/alignment is deliberately untouched. */
export function getStatusIconUrl(key: StatusDisplayKey): string {
    const part: StatusPartKey = key === 'DOT' || key === 'BLEED' ? 'POISON' : key;
    let url = urls.get(part);
    if (!url) {
        const px = Math.ceil(H.ICON * H.BAKE_SCALE), c = px / 2;
        const { canvas, ctx } = createCanvas(px, px);
        const set = STATUS_PARTS[part];
        ctx.fillStyle = H.BG;
        ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath();
        ctx.arc(c, c, c - H.BORDER_WIDTH * H.BAKE_SCALE, 0, Math.PI * 2); ctx.clip();
        for (const glyph of set.icon ?? []) {
            const sprite = vfxPartStore.get(glyph.spec, 0), angle = glyph.rotation ?? 0;
            const cosine = Math.abs(Math.cos(angle)), sine = Math.abs(Math.sin(angle));
            const width = sprite.width * cosine + sprite.height * sine;
            const height = sprite.height * cosine + sprite.width * sine;
            const k = H.BAKE_SCALE * Math.min(1, H.ICON * H.GLYPH_FIT / Math.max(width, height)) * (glyph.scale ?? 1);
            ctx.save(); ctx.translate(c, c); ctx.rotate(angle);
            drawPart(ctx, sprite, (sprite.anchorX - sprite.width / 2) * k,
                (sprite.anchorY - sprite.height / 2) * k, { scale: k, frame: 0 });
            ctx.restore();
        }
        ctx.restore();
        ctx.lineWidth = H.BORDER_WIDTH * H.BAKE_SCALE;
        ctx.strokeStyle = set.category === 'BUFF' ? H.BORDER_BUFF : H.BORDER_DEBUFF;
        ctx.beginPath(); ctx.arc(c, c, c - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
        url = canvas.toDataURL(); urls.set(part, url);
    }
    return url;
}
