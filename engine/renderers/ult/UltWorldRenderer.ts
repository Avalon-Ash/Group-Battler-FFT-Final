// ╔══════════════════════════════════════════════════════════╗
// ║  UltWorldRenderer — 奧義世界層共用演出繪製器 (UF A1/A3)     ║
// ║  職責：詠唱暗場＋施法者聚光、命中點局部光爆               ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §11：       ║
// ║  表現層狀態，畫在後製之後、tactical overlay 與 HUD 之前     ║
// ║  （世界座標，聚光中心讀 UnitFrame）。                     ║
// ║  每幀零配置、漸層與 sprite 一次性預烘焙。                 ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine } from "../../game";
import { CameraSystem } from "../../presentation/CameraSystem";
import { UnitFrameStore } from "../frame/UnitFrame";
import { ultFeelStore } from "../../presentation/vfx/UltFeelStore";
import { ULT_FEEL, HEX_SIZE } from "../../../constants";
import { getQualityTier } from "../RenderQuality";
import { createCanvas } from "../../graphics/CanvasUtils";
import { Team } from "../../../types";

export class UltWorldRenderer {
    /** 預烘焙施法者聚光孔洞 sprite（destination-out 使用，白色/實心漸層至透明） */
    private readonly spotlightSprite: HTMLCanvasElement;
    /** 預烘焙命中光爆 sprite（藍方：聖光藍白） */
    private readonly impactSpriteBlue: HTMLCanvasElement;
    /** 預烘焙命中光爆 sprite（紅方：深紅暖橘） */
    private readonly impactSpriteRed: HTMLCanvasElement;
    /** 預烘焙命中光爆 sprite（中性：純白光暈） */
    private readonly impactSpriteNeutral: HTMLCanvasElement;

    /** 池化暗場離屏畫布（尺寸改變時才重建） */
    private dimCanvas: HTMLCanvasElement | null = null;
    private dimCtx: CanvasRenderingContext2D | null = null;

    constructor() {
        this.spotlightSprite = this.bakeSpotlightSprite();
        this.impactSpriteBlue = this.bakeImpactSprite('#ffffff', '#93c5fd', '#2563eb');
        this.impactSpriteRed = this.bakeImpactSprite('#ffffff', '#fdba74', '#dc2626');
        this.impactSpriteNeutral = this.bakeImpactSprite('#ffffff', '#e2e8f0', '#94a3b8');
    }

    /** 一次性烘焙聚光孔洞（用於 destination-out 擦除暗場） */
    private bakeSpotlightSprite(): HTMLCanvasElement {
        const r = ULT_FEEL.SPOTLIGHT_BAKE_RADIUS;
        const size = r * 2;
        const { canvas, ctx } = createCanvas(size, size);
        if (!ctx.createRadialGradient) return canvas;

        const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
        // 中心完全不透明（完全挖空暗場），邊緣柔和衰減至透明（保留暗場）
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.35, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return canvas;
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

    private ensureDimCanvas(targetW: number, targetH: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
        if (!this.dimCanvas || !this.dimCtx || this.dimCanvas.width < targetW || this.dimCanvas.height < targetH) {
            const { canvas, ctx } = createCanvas(targetW, targetH);
            this.dimCanvas = canvas;
            this.dimCtx = ctx;
        }
        return { canvas: this.dimCanvas, ctx: this.dimCtx };
    }

    /**
     * 繪製 A1 暗場聚光與 A3 命中光爆
     * 呼叫時機：在 post-processing 之後、tactical overlay 與 HUD 之前
     * 上下文：已套用 camera.applyTransform(ctx, lW, lH)
     */
    public draw(
        ctx: CanvasRenderingContext2D,
        engine: GameEngine,
        frames: UnitFrameStore,
        camera: CameraSystem,
        lW: number,
        lH: number,
        dpr: number,
        battleTime: number
    ): void {
        const isLowTier = getQualityTier() === 3;
        const dimAlpha = ultFeelStore.getDimAlpha(battleTime, isLowTier);
        const impacts = ultFeelStore.getActiveImpacts(battleTime);

        // 若無暗場且無命中光爆，立即返回（熱路徑零開銷）
        if (dimAlpha <= 0 && impacts.length === 0) return;

        // ── 1. A1 暗場＋聚光 ──
        if (dimAlpha > 0) {
            const targetW = Math.ceil(lW * dpr);
            const targetH = Math.ceil(lH * dpr);
            const { canvas: dCanvas, ctx: dCtx } = this.ensureDimCanvas(targetW, targetH);

            dCtx.clearRect(0, 0, targetW, targetH);
            dCtx.save();
            dCtx.scale(dpr, dpr);

            // 填滿暗場
            dCtx.fillStyle = '#000000';
            dCtx.globalAlpha = dimAlpha;
            dCtx.fillRect(0, 0, lW, lH);
            dCtx.globalAlpha = 1.0;

            // 最低品質階層時關閉聚光，只留較淡暗場；否則挖出聚光
            if (!isLowTier) {
                const casters = ultFeelStore.getActiveSpotlightCasters(battleTime);
                if (casters.length > 0) {
                    dCtx.save();
                    // 沿用主畫布當下的世界變換（含 dpr 與本幀的震動位移）；重呼叫 applyTransform 會重抽震動亂數，聚光會和施法者錯開
                    dCtx.setTransform(ctx.getTransform());
                    dCtx.globalCompositeOperation = 'destination-out';

                    const spotRadius = ULT_FEEL.SPOTLIGHT_RADIUS_HEX * HEX_SIZE;
                    const spotDiam = spotRadius * 2;

                    for (let i = 0; i < casters.length; i++) {
                        const caster = casters[i];
                        // 聚光中心讀施法者的 UnitFrame（世界座標，與單位繪製同一把尺）
                        const frame = frames.list.find(f => f.agent.id === caster.casterId);
                        if (frame) {
                            const cx = frame.footX;
                            const cy = frame.bodyCenterY;
                            dCtx.drawImage(this.spotlightSprite, cx - spotRadius, cy - spotRadius, spotDiam, spotDiam);
                        }
                    }
                    dCtx.restore();
                }
            }

            dCtx.restore();

            // 將暗場畫布繪製到主畫面（暫時重設轉換以對齊螢幕）
            ctx.save();
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
            ctx.drawImage(dCanvas, 0, 0, targetW, targetH, 0, 0, lW, lH);
            ctx.restore();
        }

        // ── 2. A3 命中光爆 ──
        if (impacts.length > 0) {
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
}
