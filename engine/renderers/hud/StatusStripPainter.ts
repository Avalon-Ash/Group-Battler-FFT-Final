// ╔══════════════════════════════════════════════════════════╗
// ║  StatusStripPainter — 血條上方的狀態圖示列                   ║
// ║  職責：列出單位身上全部增減益（減益在左、增益在右，邊框顏色    ║
// ║        區分），每個圖示有剩餘時間的扇形遮罩；取代舊的單一圓形   ║
// ║        控制量表（詠唱進度仍由 GaugePainter 畫）                ║
// ║  [ARCH] 座標：x＝UnitFrame.footX、y＝UnitFrame.hudAnchorY       ║
// ║  （RenderSpec §4 血條錨點），圖示底緣在血條外框頂端之上          ║
// ║  HUD_STATUS_STRIP.ABOVE_BAR；縮小到螢幕上不足 MIN_SCREEN_PX      ║
// ║  時依相機縮放放大（stripScale，每幀算一次）。圖示由狀態零件      ║
// ║  （data/vfx/status_parts.ts 的 icon）烘焙一次成小畫布，每幀只有   ║
// ║  drawImage 與扇形填色，不配置物件、不建漸層、不設 shadowBlur；    ║
// ║  數量與扇形遮罩依品質階層（階層 3 只留 2 個、不畫遮罩）。          ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import { HUD_BAR, HUD_STATUS_STRIP } from "../../../constants";
import { STATUS_PARTS, STATUS_STRIP_ORDER, type StatusPartKey } from "../../../data/vfx/status_parts";
import { createCanvas } from "../../graphics/CanvasUtils";
import { isStatusActive, statusFraction } from "../status/StatusActivity";
import { getQualityTier, getRenderDpr } from "../RenderQuality";
import { vfxPartStore, drawPart } from "../vfxparts/VFXPartStore";

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const H = HUD_STATUS_STRIP;

/** 烘焙好的圖示（依狀態鍵）；零件圖鑑未烘焙完成前不快取空圖示 */
const icons: Partial<Record<StatusPartKey, HTMLCanvasElement>> = {};

/** 每幀暫存（重用，不配置）：本單位挑出的狀態鍵 */
const picked: StatusPartKey[] = new Array<StatusPartKey>(H.MAX_BY_TIER[0]);

function bakeIcon(key: StatusPartKey): HTMLCanvasElement {
    const px = Math.ceil(H.ICON * H.BAKE_SCALE);
    const { canvas, ctx } = createCanvas(px, px);
    const c = px / 2;
    const set = STATUS_PARTS[key];
    ctx.fillStyle = H.BG;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, c - H.BORDER_WIDTH * H.BAKE_SCALE, 0, TAU);
    ctx.clip();
    for (const part of set.icon ?? []) {
        const sprite = vfxPartStore.get(part.spec, 0);
        // 縮到字形框內（不放大）；以零件外框中心對齊圖示中心（零件的錨點各不相同）
        const fit = Math.min(1, (H.ICON * H.GLYPH_FIT) / Math.max(sprite.width, sprite.height));
        const k = H.BAKE_SCALE * fit * (part.scale ?? 1);
        drawPart(ctx, sprite, c + (sprite.width / 2 - sprite.anchorX) * k, c + (sprite.height / 2 - sprite.anchorY) * k, { scale: k, rotation: part.rotation, frame: 0 });
    }
    ctx.restore();
    ctx.lineWidth = H.BORDER_WIDTH * H.BAKE_SCALE;
    ctx.strokeStyle = set.category === 'BUFF' ? H.BORDER_BUFF : H.BORDER_DEBUFF;
    ctx.beginPath();
    ctx.arc(c, c, c - ctx.lineWidth / 2, 0, TAU);
    ctx.stroke();
    return canvas;
}

function iconOf(key: StatusPartKey): HTMLCanvasElement {
    return icons[key] ?? (icons[key] = bakeIcon(key));
}

export const StatusStripPainter = {
    /**
     * 圖示放大倍率（每幀呼叫一次）：相機縮放小到圖示在螢幕上不足 MIN_SCREEN_PX 時放大，上限 MAX_SCALE。
     * 用目前的變換（世界座標）推得 CSS 像素縮放。
     */
    stripScale(ctx: CanvasRenderingContext2D): number {
        const m = ctx.getTransform();
        const zoom = Math.hypot(m.a, m.b) / getRenderDpr();
        if (zoom <= 0) return 1;
        return Math.max(1, Math.min(H.MAX_SCALE, H.MIN_SCREEN_PX / (H.ICON * zoom)));
    },

    /**
     * 畫一個單位的圖示列，置中於 x、底緣在血條之上。回傳圖示列佔用的高度（含與血條的間距，canvas 單位；沒有圖示回傳 0），
     * 供詠唱量表往上讓位。
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, scale: number): number {
        const tier = getQualityTier();
        const cap = H.MAX_BY_TIER[Math.min(tier, H.MAX_BY_TIER.length - 1)];
        let n = 0;
        const debuffs = STATUS_STRIP_ORDER.debuffs;
        for (let i = 0; i < debuffs.length && n < cap; i++) if (isStatusActive(debuffs[i], agent)) picked[n++] = debuffs[i];
        const nDebuff = n;
        const buffs = STATUS_STRIP_ORDER.buffs;
        for (let i = 0; i < buffs.length && n < cap; i++) if (isStatusActive(buffs[i], agent)) picked[n++] = buffs[i];
        if (n === 0) return 0;

        const size = H.ICON * scale;
        const gap = H.GAP * scale;
        const groupGap = nDebuff > 0 && nDebuff < n ? (H.GROUP_GAP - H.GAP) * scale : 0;
        const total = n * size + (n - 1) * gap + groupGap;
        const top = y - HUD_BAR.TOP_OFFSET - H.ABOVE_BAR * scale - size;
        const sweep = tier <= H.SWEEP_MAX_TIER;
        let ix = x - total / 2;
        for (let i = 0; i < n; i++) {
            const key = picked[i];
            if (i === nDebuff && groupGap > 0) ix += groupGap;
            ctx.drawImage(iconOf(key), ix, top, size, size);
            if (sweep) {
                const elapsed = 1 - statusFraction(key, agent);
                if (elapsed > 0) {
                    const r = size / 2;
                    ctx.fillStyle = H.SWEEP;
                    ctx.beginPath();
                    ctx.moveTo(ix + r, top + r);
                    ctx.arc(ix + r, top + r, r - H.BORDER_WIDTH * scale, TOP, TOP + TAU * elapsed);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ix += size + gap;
        }
        return size + H.ABOVE_BAR * scale;
    },
};
