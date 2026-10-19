// ╔══════════════════════════════════════════════════════════╗
// ║  UnitIndicatorPainter — 施法 AOE 地面預警（全部是零件）     ║
// ║  職責：施法者腳下的範圍光＋法陣（magicCircle 外層，陣營樣式，║
// ║        慢轉），隨詠唱進度從中心擴張                          ║
// ║  [ARCH] 只經 GroundDrape 鋪設繪製（RenderSpec §9 非粒子鋪設）；║
// ║  平面零件在地面旋轉到版面方向再壓扁 ISO_SCALE_Y。sprite 依    ║
// ║  （色階、陣營、範圍格數）快取，每幀零配置。                   ║
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
    circle: PartSprite; circleScale: number;
}

/** 依（色階、陣營、格數）快取 */
const cache = new Map<VFXRampId, Map<number, IndicatorSprites>>();
const OPTS: DrawPartOptions = { frame: 0, scale: 1, scaleY: ISO_SCALE_Y, rotation: 0, alpha: 1 };

function resolve(ramp: VFXRampId, team: Team, cells: number): IndicatorSprites {
    let perRamp = cache.get(ramp);
    if (!perRamp) { perRamp = new Map(); cache.set(ramp, perRamp); }
    const key = cells * 2 + (team === Team.BLUE ? 0 : 1);
    const hit = perRamp.get(key);
    if (hit) return hit;
    const A = AOE_INDICATOR;
    const ringR = cells * HEX_SIZE;
    const glowR = ringR * A.GLOW_RADIUS_MUL;
    const style = team === Team.BLUE ? 'LION' : 'ASH';
    const s: IndicatorSprites = {
        glow: vfxPartStore.get({ kind: 'glow', radius: glowR, ramp }), glowScale: glowR / quantizeSize(glowR),
        circle: vfxPartStore.get({ kind: 'magicCircle', radius: ringR, ramp, layer: 'outer', style, seed: team + 4 }), circleScale: ringR / quantizeSize(ringR),
    };
    perRamp.set(key, s);
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
        const s = resolve(elementRamp(team, skill.element), team, cells);
        const alpha = A.ALPHA + Math.sin(t * A.PULSE_FREQ) * A.PULSE_AMP;
        const align = layoutAlign(layout);
        draw(ctx, s.glow, s.glowScale * progress, 0, alpha * A.GLOW_ALPHA_MUL);
        draw(ctx, s.circle, s.circleScale * progress, align + t * A.ROT_SPEED, Math.min(1, alpha * A.CIRCLE_ALPHA_MUL));
    },

    /** 測試／工具用：丟掉解析快取 */
    reset(): void {
        cache.clear();
    },
};
