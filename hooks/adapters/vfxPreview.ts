import { INSPECTOR_PARAM } from '../../constants';
import type { PartGalleryEntry } from '../../data/vfx/parts/partGallery';
import { vfxPartStore, drawPart } from '../../engine/renderers/vfxparts/VFXPartStore';

export const THUMB_PX = 72;

export function drawPartThumbnail(canvas: HTMLCanvasElement, entry: PartGalleryEntry): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = THUMB_PX * dpr;
    canvas.height = THUMB_PX * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, THUMB_PX, THUMB_PX);
    const sprite = vfxPartStore.get(entry.spec);
    const pad = INSPECTOR_PARAM.VFX_MAP_PAD;
    const scale = Math.min((THUMB_PX - pad * 2) / sprite.width, (THUMB_PX - pad * 2) / sprite.height);
    const x = THUMB_PX / 2 - (sprite.width / 2 - sprite.anchorX) * scale;
    const y = THUMB_PX / 2 - (sprite.height / 2 - sprite.anchorY) * scale;
    drawPart(ctx, sprite, x, y, { scale, frame: 0 });
}
