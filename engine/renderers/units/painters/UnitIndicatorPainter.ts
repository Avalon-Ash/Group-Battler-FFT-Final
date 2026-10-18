// ╔══════════════════════════════════════════════════════════╗
// ║  UnitIndicatorPainter — 施法 AOE 地面預警（全部是零件）     ║
// ║  職責：施法者腳下的範圍光＋外環＋內環，隨詠唱進度從中心擴張 ║
// ║  上游：UnitRenderSystem.paintAoeIndicator（GroundDrapeLayer   ║
// ║        的繪製函式，原點＝施法者腳下地平面）、AOE_INDICATOR、  ║
// ║        element_ramps（陣營×技能屬性色階）                     ║
// ║  [ARCH] 只經 GroundDrape 鋪設繪製（RenderSpec §9 非粒子鋪設）；║
// ║  平面零件在地面旋轉到版面方向再壓扁 ISO_SCALE_Y。sprite 依    ║
// ║  （色階、範圍格數）快取，每幀零配置。                         ║
// ╚══════════════════════════════════════════════════════════╝

import { HEX_SIZE, ISO_SCALE_Y, AOE_INDICATOR } from "../../../../constants";
import { HexLayout, Team, type Skill } from "../../../../types";
import { elementRamp } from "../../../../data/vfx/element_ramps";
import type { VFXRampId } from "../../../../data/vfx/parts/vfxPalette";
import { vfxPartStore, drawPart, type PartSprite, type DrawPartOptions } from "../../vfxparts/VFXPartStore";
import { quantizeSize } from "../../vfxparts/PartSpec";
import { layoutAlign } from "../../vfxparts/PartLayerPainter";

interface IndicatorSprites {
    glow: PartSprite; glowScale: number;
    ring: PartSprite; ringScale: number;
    inner: PartSprite; innerScale: number;
}

const cache = new Map<VFXRampId, Map<number, IndicatorSprites>>();
const OPTS: DrawPartOptions = { frame: 0, scale: 1, scaleY: ISO_SCALE_Y, rotation: 0, alpha: 1 };

function resolve(ramp: VFXRampId, cells: number): IndicatorSprites {
    let perRamp = cache.get(ramp);
    if (!perRamp) { perRamp = new Map(); cache.set(ramp, perRamp); }
    const hit = perRamp.get(cells);
    if (hit) return hit;
    const A = AOE_INDICATOR;
    const ringR = cells * HEX_SIZE;
    const glowR = ringR * A.GLOW_RADIUS_MUL;
    const innerR = ringR * A.INNER_RATIO;
    const s: IndicatorSprites = {
        glow: vfxPartStore.get({ kind: 'glow', radius: glowR, ramp }), glowScale: glowR / quantizeSize(glowR),
        ring: vfxPartStore.get({ kind: 'ring', radius: ringR, thickness: A.RING_THICKNESS, ramp }), ringScale: ringR / quantizeSize(ringR),
        inner: vfxPartStore.get({ kind: 'ring', radius: innerR, thickness: A.INNER_THICKNESS, ramp }), innerScale: innerR / quantizeSize(innerR),
    };
    perRamp.set(cells, s);
    return s;
}

function draw(ctx: CanvasRenderingContext2D, sprite: PartSprite, scale: number, rotation: number, alpha: number): void {
    OPTS.scale = scale;
    OPTS.rotation = rotation;
    OPTS.alpha = alpha;
    drawPart(ctx, sprite, 0, 0, OPTS);
}

export const UnitIndicatorPainter = {
    /** 在原點畫 AOE 預警；progress＝詠唱進度 0～1（範圍從中心擴張到 aoeRadius 格） */
    drawAoeIndicator(ctx: CanvasRenderingContext2D, skill: Skill, team: Team, t: number, progress: number, layout: HexLayout): void {
        if (progress <= 0) return;
        const A = AOE_INDICATOR;
        const cells = Math.max(1, skill.aoeRadius || 1);
        const s = resolve(elementRamp(team, skill.element), cells);
        const alpha = A.ALPHA + Math.sin(t * A.PULSE_FREQ) * A.PULSE_AMP;
        const align = layoutAlign(layout);
        draw(ctx, s.glow, s.glowScale * progress, 0, alpha * A.GLOW_ALPHA_MUL);
        draw(ctx, s.ring, s.ringScale * progress, align, Math.min(1, alpha * A.RING_ALPHA_MUL));
        draw(ctx, s.inner, s.innerScale * progress, align, alpha * A.INNER_ALPHA_MUL);
    },

    /** 測試／工具用：丟掉解析快取 */
    reset(): void {
        cache.clear();
    },
};
