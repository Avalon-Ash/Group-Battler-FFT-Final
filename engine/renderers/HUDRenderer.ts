
import { Agent } from "../game";
import { HUD_BAR_OFFSET } from "../../constants";
import { HexUtils, MapConfig } from "../utils";
import { HUDSystem } from "../systems/hud";
import { VisualMath } from "../math/VisualMath";
import { BarPainter } from "./hud/BarPainter";
import { GaugePainter } from "./hud/GaugePainter";
import { TextPainter } from "./hud/TextPainter";

export class HUDRenderer {
    public draw(ctx: CanvasRenderingContext2D, hud: HUDSystem, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig, highlight: Agent | null, time: number, isLastStand: boolean = false) {
        agents.forEach(a => {
            if (a.hp <= 0 || a.spawnTimer > 0) return;
            
            let h = 0;
            if (a.isMoving && a.path.length > 0) {
                const startH = getTerrainHeight(a.q, a.r);
                const endH = getTerrainHeight(a.path[0].q, a.path[0].r);
                h = HexUtils.lerp(startH, endH, a.moveProgress);
            } else {
                // FIXED: Use logical coordinates (q, r) for stable height.
                // Using pixel coordinates (fromPx) causes jitter due to physics drift crossing tile boundaries.
                h = getTerrainHeight(a.q, a.r);
            }

            // SSOT: Use Unified Projection Formula
            const anchorY = VisualMath.getEntityVisualY(a.py, h, a.physics.y, a.physics.z, -HUD_BAR_OFFSET);
            const headX = a.px + a.physics.x;

            const isSelected = (a === highlight);
            BarPainter.drawUnitBars(ctx, a, headX, anchorY, isSelected);
            GaugePainter.drawUnitStatusGauges(ctx, a, headX, anchorY);
        });
        TextPainter.drawFloatingText(ctx, hud);
        if (isLastStand) this.drawLastStandBanner(ctx, time);
    }

    private drawLastStandBanner(ctx: CanvasRenderingContext2D, time: number) {
        const { width, height } = ctx.canvas;
        const dpr = window.devicePixelRatio || 1;
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
