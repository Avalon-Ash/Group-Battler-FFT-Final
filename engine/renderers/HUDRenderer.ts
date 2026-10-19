
// ╔══════════════════════════════════════════════════════════╗
// ║  HUDRenderer — 血條、狀態量表、浮動文字、背水一戰橫幅      ║
// ║  上游：UnitFrame（hudAnchorY／footX 由 RenderPipeline 每幀  ║
// ║        建立，本檔不取得地形高度，無法自己重算）             ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4。   ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../game";
import { HUDSystem } from "../presentation/hud";
import { UnitFrameStore } from "./frame/UnitFrame";
import { BarPainter } from "./hud/BarPainter";
import { GaugePainter } from "./hud/GaugePainter";
import { TextPainter } from "./hud/TextPainter";
import { getRenderDpr } from "./RenderQuality";
import { GlowTextCache, quantizeDeviceScale } from "./hud/GlowTextCache";
import { LAST_STAND_BANNER } from "../../constants";
import { unitFallProgress } from "../../data/units/appearance/fallMotion";

export class HUDRenderer {
    public draw(ctx: CanvasRenderingContext2D, hud: HUDSystem, frames: UnitFrameStore, highlight: Agent | null, time: number, isLastStand: boolean = false) {
        const list = frames.list;
        // 血條 sprite 的烘焙縮放（相機縮放 × DPR，量化），每幀算一次
        const devScale = quantizeDeviceScale(ctx);
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            const a = f.agent;
            // 墜落中（縮圈塌陷）的單位已註定出局：血條與量表不跟著往下掉
            if (a.hp <= 0 || a.spawnTimer > 0 || unitFallProgress(a.physics.z) > 0) continue;

            // SSOT：與身體共用同一份腳下高度（UnitFrame：邏輯座標＋移動過渡；拖曳預覽跟著游標格）
            const isSelected = (a === highlight);
            BarPainter.drawUnitBars(ctx, a, f.footX, f.hudAnchorY, isSelected, devScale);
            GaugePainter.drawUnitStatusGauges(ctx, a, f.footX, f.hudAnchorY);
        }
        TextPainter.drawFloatingText(ctx, hud);
        if (isLastStand) this.drawLastStandBanner(ctx, time);
    }

    private drawLastStandBanner(ctx: CanvasRenderingContext2D, time: number) {
        const L = LAST_STAND_BANNER;
        const { width, height } = ctx.canvas;
        const dpr = getRenderDpr();
        const cw = width / dpr;
        const ch = height / dpr;
        const g = bannerGradients(ctx, cw, ch);

        ctx.save();
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // 1. 邊緣暗紅脈動（漸層快取在全強度，脈動只改 globalAlpha）
        const pulse = (Math.sin(time * L.PULSE_FREQ) + 1) / 2;
        ctx.globalAlpha = L.VIGNETTE_ALPHA + pulse * L.VIGNETTE_PULSE;
        ctx.fillStyle = g.vignette;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 1;

        // 2. 頂端橫幅
        ctx.fillStyle = g.banner;
        ctx.fillRect(0, 0, cw, L.BANNER_H * 2);

        // 3. 標題（描邊＋預烘焙光暈文字）與副標
        const x = cw / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = L.TITLE_FONT;
        ctx.strokeStyle = L.TITLE_STROKE;
        ctx.lineWidth = L.TITLE_STROKE_W;
        ctx.strokeText(L.TITLE, x, L.TITLE_Y);
        const glow = GlowTextCache.getText(L.TITLE, L.TITLE_FONT, L.TITLE_SIZE, L.COLOR, L.COLOR, L.TITLE_GLOW_BLUR, dpr);
        ctx.drawImage(glow.canvas, x + glow.x, L.TITLE_Y + glow.y, glow.w, glow.h);
        ctx.font = L.SUBTITLE_FONT;
        ctx.fillStyle = L.SUBTITLE_COLOR;
        ctx.fillText(L.SUBTITLE, x, L.SUBTITLE_Y);

        ctx.restore();
    }
}

/** 橫幅漸層依畫布尺寸快取（尺寸改變才重建） */
let bannerCache: { cw: number; ch: number; vignette: CanvasGradient; banner: CanvasGradient } | null = null;
function bannerGradients(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    if (bannerCache && bannerCache.cw === cw && bannerCache.ch === ch) return bannerCache;
    const L = LAST_STAND_BANNER;
    const vignette = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * L.VIGNETTE_REACH);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, L.COLOR);
    const banner = ctx.createLinearGradient(0, 0, 0, L.BANNER_H);
    banner.addColorStop(0, L.BANNER_TOP);
    banner.addColorStop(1, L.BANNER_BOTTOM);
    bannerCache = { cw, ch, vignette, banner };
    return bannerCache;
}
