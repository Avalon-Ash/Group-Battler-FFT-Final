
// ╔══════════════════════════════════════════════════════════╗
// ║  HUDRenderer — 血條、狀態量表、浮動文字、背水一戰橫幅      ║
// ║  上游：UnitFrame（hudAnchorY／footX 由 RenderPipeline 每幀  ║
// ║        建立，本檔不取得地形高度，無法自己重算）             ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4。   ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../game";
import { HUDSystem } from "../systems/hud";
import { UnitFrameStore } from "./frame/UnitFrame";
import { BarPainter } from "./hud/BarPainter";
import { GaugePainter } from "./hud/GaugePainter";
import { TextPainter } from "./hud/TextPainter";
import { getRenderDpr } from "./RenderQuality";

export class HUDRenderer {
    public draw(ctx: CanvasRenderingContext2D, hud: HUDSystem, frames: UnitFrameStore, highlight: Agent | null, time: number, isLastStand: boolean = false) {
        const list = frames.list;
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            const a = f.agent;
            if (a.hp <= 0 || a.spawnTimer > 0) continue;

            // SSOT：與身體共用同一份腳下高度（UnitFrame：邏輯座標＋移動過渡；拖曳預覽跟著游標格）
            const isSelected = (a === highlight);
            BarPainter.drawUnitBars(ctx, a, f.footX, f.hudAnchorY, isSelected);
            GaugePainter.drawUnitStatusGauges(ctx, a, f.footX, f.hudAnchorY);
        }
        TextPainter.drawFloatingText(ctx, hud);
        if (isLastStand) this.drawLastStandBanner(ctx, time);
    }

    private drawLastStandBanner(ctx: CanvasRenderingContext2D, time: number) {
        const { width, height } = ctx.canvas;
        const dpr = getRenderDpr();
        const cw = width / dpr;
        
        ctx.save();
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        // 1. Edge Vignette (Subtle Red Pulse)
        const pulse = (Math.sin(time * 4) + 1) / 2;
        const grad = ctx.createRadialGradient(cw/2, height/(2*dpr), 0, cw/2, height/(2*dpr), cw * 0.8);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, `rgba(239, 68, 68, ${0.1 + pulse * 0.15})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, height/dpr);

        // 2. Top Banner
        const bannerH = 40;
        const bannerGrad = ctx.createLinearGradient(0, 0, 0, bannerH);
        bannerGrad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
        bannerGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = bannerGrad;
        ctx.fillRect(0, 0, cw, bannerH * 2);

        // 3. Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '900 italic 28px "Arial Black", sans-serif';
        
        const text = "L A S T   S T A N D";
        const x = cw / 2;
        const y = 20;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(text, x, y);

        // Subtle subtitle
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.shadowBlur = 0;
        ctx.fillText("ALL DEFENSES COLLAPSED • HEALING DISABLED", x, y + 35);

        ctx.restore();
    }
}
