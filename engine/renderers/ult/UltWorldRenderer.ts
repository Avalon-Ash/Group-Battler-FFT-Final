// ╔══════════════════════════════════════════════════════════╗
// ║  UltWorldRenderer — 奧義世界層共用演出繪製器 (UF A3)       ║
// ║  職責：命中點局部光爆                                     ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §11：       ║
// ║  表現層狀態，畫在後製之後、tactical overlay 與 HUD 之前     ║
// ║  （世界座標）。每幀零配置、sprite 一次性預烘焙。           ║
// ║  詠唱暗場＋聚光已移除（詠唱太短，只見亮暗交替；c7df349）。║
// ╚══════════════════════════════════════════════════════════╝

import { ultFeelStore } from "../../presentation/vfx/UltFeelStore";
import { ULT_FEEL, HEX_SIZE } from "../../../constants";
import { createCanvas } from "../../graphics/CanvasUtils";
import { Team } from "../../../types";

export class UltWorldRenderer {
    /** 預烘焙命中光爆 sprite（藍方：聖光藍白） */
    private readonly impactSpriteBlue: HTMLCanvasElement;
    /** 預烘焙命中光爆 sprite（紅方：深紅暖橘） */
    private readonly impactSpriteRed: HTMLCanvasElement;
    /** 預烘焙命中光爆 sprite（中性：純白光暈） */
    private readonly impactSpriteNeutral: HTMLCanvasElement;

    constructor() {
        this.impactSpriteBlue = this.bakeImpactSprite('#ffffff', '#93c5fd', '#2563eb');
        this.impactSpriteRed = this.bakeImpactSprite('#ffffff', '#fdba74', '#dc2626');
        this.impactSpriteNeutral = this.bakeImpactSprite('#ffffff', '#e2e8f0', '#94a3b8');
    }

    /** 一次性烘焙命中光爆（加法混合 lighter 使用） */
    private bakeImpactSprite(coreColor: string, midColor: string, edgeColor: string): HTMLCanvasElement {
        const r = ULT_FEEL.IMPACT_BURST_BAKE_RADIUS;
        const size = r * 2;
        const { canvas, ctx } = createCanvas(size, size);
        if (!ctx.createRadialGradient) return canvas;

        const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.25, midColor);
        grad.addColorStop(0.65, edgeColor);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    /**
     * 繪製 A3 命中光爆
     * 呼叫時機：在 post-processing 之後、tactical overlay 與 HUD 之前
     * 上下文：已套用 camera.applyTransform(ctx, lW, lH)
     */
    public draw(ctx: CanvasRenderingContext2D, battleTime: number): void {
        const impacts = ultFeelStore.getActiveImpacts(battleTime);
        if (impacts.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const baseRadius = ULT_FEEL.IMPACT_BURST_RADIUS_HEX * HEX_SIZE;

        for (let i = 0; i < impacts.length; i++) {
            const imp = impacts[i];
            const elapsed = battleTime - imp.time;
            if (elapsed < 0 || elapsed >= ULT_FEEL.IMPACT_BURST_DURATION) continue;

            const t = Math.min(1, Math.max(0, elapsed / ULT_FEEL.IMPACT_BURST_DURATION));
            const alpha = ULT_FEEL.IMPACT_BURST_MAX_ALPHA * (1 - t);
            if (alpha <= 0) continue;

            const scale = ULT_FEEL.IMPACT_BURST_SCALE_FROM + (ULT_FEEL.IMPACT_BURST_SCALE_TO - ULT_FEEL.IMPACT_BURST_SCALE_FROM) * t;
            const r = baseRadius * scale;
            const diam = r * 2;
            const visualY = imp.y - imp.z;

            let sprite = this.impactSpriteNeutral;
            if (imp.team === Team.RED) sprite = this.impactSpriteRed;
            else if (imp.team === Team.BLUE) sprite = this.impactSpriteBlue;

            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, imp.x - r, visualY - r, diam, diam);
        }

        ctx.restore();
    }
}
