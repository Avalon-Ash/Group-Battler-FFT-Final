/**
 * TrailStreak — 光痕：把光束磚（kind 'beam'，左端錨點、可平鋪）沿一串點一段一段拉伸，越往尾端越窄越淡。
 * 投射物拖尾（ProjectilePartPainter）與飛行尾跡（UnitWakePainter）共用；執行期只有 drawImage 與變換，零配置。
 * 點由近到遠排列，第一段從 (headX, headY) 連到 points[0]。
 */

import type { PartSprite } from './VFXPartStore';

export interface StreakPoint { x: number; y: number }

export function drawTrailStreak(
    ctx: CanvasRenderingContext2D,
    tile: PartSprite,
    headX: number,
    headY: number,
    points: ArrayLike<StreakPoint>,
    count: number,
    widthScale: number,
    alpha: number,
): void {
    if (count <= 0 || widthScale <= 0 || alpha <= 0) return;
    const img = tile.frames[0];
    const prevBlend = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = tile.blend;
    let px = headX, py = headY;
    for (let i = 0; i < count; i++) {
        const q = points[i];
        const dx = q.x - px, dy = q.y - py;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.5) {
            const k = i / count;
            const w = (1 - k) * widthScale;
            ctx.globalAlpha = prevAlpha * (1 - k) * alpha;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(Math.atan2(dy, dx));
            ctx.drawImage(img, 0, -tile.anchorY * w, len, tile.height * w);
            ctx.restore();
        }
        px = q.x; py = q.y;
    }
    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevBlend;
}
