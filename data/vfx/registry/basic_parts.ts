import { VFXAsset, EmitterConfig } from "../../../types/VFXSchema";
import type { VFXRampId, VFXNeutralId } from "../parts/vfxPalette";
import { part } from "./ult_parts";

// ==========================================
// 普攻命中特效（零件版，V2c）
// ART_SPEC §6：普攻 1～2 層、≤ 0.4 s、不震動；每發 ≤ 8 粒子（普攻每秒都在打）。
// 尺寸參考：HEX_SIZE = 48；受擊者身體高度由呼叫端提供（看板在身上，貼地環落在格子上）。
// 獅心：金白、乾淨、正六角環、均勻擴張；灰燼：鋸齒斷環、碎石煙塵、爆發快。
// ==========================================

/** 核心閃光：一次小閃 */
export function flash(ramp: VFXRampId, radius: number, life = 0.18, delay = 0): EmitterConfig {
    return part({ particleType: 'PART', part: { kind: 'glow', radius, ramp, hard: true }, count: 1, lifetime: life, delay, size: radius,
        partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.8 } });
}

/** 貼地環起始大小（相對起點半徑） */
const RING_START_SCALE = 0.35;

/** 貼地六角衝擊環 */
export function groundRing(ramp: VFXRampId, radius: number, scaleTo: number, life = 0.28, opts: { thickness?: number; rough?: number; seed?: number; delay?: number } = {}): EmitterConfig {
    // 烘焙在「終點半徑」、之後只縮小：環放大到終點時線寬就是 thickness。舊版以起點半徑烘焙再放大 scaleTo 倍，
    // 線寬跟著放大 scaleTo 倍（scaleTo 2.0 時主線 21 px、光暈 43 px），在 lighter 疊加混合下飽和成一整片白帶，
    // 逐格裁切後變成方塊狀白條（docs 的 cast-ring-shot --skill=wb_a3 重現）。
    const finalRadius = radius * scaleTo;
    return part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: finalRadius, thickness: opts.thickness ?? Math.max(4, radius / 6), ramp, roughness: opts.rough, seed: opts.seed }, count: 1, lifetime: life, delay: opts.delay ?? 0, size: finalRadius * 2,
        partAnim: { scaleFrom: RING_START_SCALE / scaleTo, scaleTo: 1, fadeOut: 0.6 } });
}

/** 向四周迸出的光點／火星 */
export function spray(ramp: VFXRampId, count: number | [number, number], speed: [number, number], life: [number, number] = [0.18, 0.32], size = 4, delay = 0): EmitterConfig {
    return part({ particleType: 'PART', part: { kind: 'glow', radius: size, ramp, hard: true }, count, lifetime: life, delay, size,
        shape: 'BURST_DIR', speed, vz: [30, 160], drag: 0.08, partAnim: { fadeOut: 0.6 } });
}

/** 受重力的碎屑（岩、骨、冰晶、六角片） */
export function debris(shape: 'rock' | 'bone' | 'crystal' | 'hex', ramp: VFXRampId, count: number | [number, number], size: number, speed: [number, number] = [120, 260], life: [number, number] = [0.3, 0.45], delay = 0): EmitterConfig {
    return part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size, shape, ramp, seed: 1 }, count, lifetime: life, delay, size,
        shape: 'BURST_DIR', speed, gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.35 } });
}

/** 煙／塵團（一般混合） */
export function puff(color: VFXNeutralId, radius: number, count: number | [number, number], life: [number, number] = [0.3, 0.45], alpha = 0.55, delay = 0.03): EmitterConfig {
    return part({ particleType: 'PART', part: { kind: 'smoke', radius, color, roughness: 1, seed: 1 }, count, lifetime: life, delay, size: radius,
        shape: 'CIRCLE', shapeRadius: radius * 0.6, speed: [8, 24], vz: [20, 50], drag: 0.04,
        partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeIn: 0.15, fadeOut: 0.6, alpha } });
}

export const BASIC_PART_VFX: Record<string, VFXAsset> = {
    // ================= 獅心騎士團（BLUE）=================

    // 鋼銀劍擊：白核閃 → 六角衝擊環（0.15 s 內完成）＋十字星光＋金色小火花
    'FX_HIT_BLUE_PHYSICAL': {
        id: 'FX_HIT_BLUE_PHYSICAL',
        emitters: [
            flash('LION_PHYSICAL', 28, 0.16),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 40, count: 4, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.18, delay: 0, size: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7, rotation: 0.78 } }),
            groundRing('LION_PHYSICAL', 32, 1.3, 0.24),
            spray('LION_HOLY', [3, 4], [140, 260], [0.16, 0.26], 3),
        ],
    },

    // 聖雷：金白雷自上劈落＋閃光＋環
    'FX_HIT_BLUE_LIGHTNING': {
        id: 'FX_HIT_BLUE_LIGHTNING',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'bolt', length: 96, branches: 1, ramp: 'LION_LIGHTNING', seed: 2 }, count: 1, lifetime: 0.2, delay: 0, size: 48,
                partAnim: { fadeOut: 0.5 } }),
            flash('LION_LIGHTNING', 32, 0.18),
            groundRing('LION_LIGHTNING', 32, 1.5, 0.24),
            spray('LION_LIGHTNING', 3, [120, 240], [0.14, 0.24], 3),
        ],
    },

    // 聖光：小光柱升起＋六道光芒＋上飄光點
    'FX_HIT_BLUE_HOLY': {
        id: 'FX_HIT_BLUE_HOLY',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 24, height: 96, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.34, delay: 0, size: 24, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.1, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 36, count: 6, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.26, delay: 0, size: 36,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            groundRing('LION_HOLY', 28, 1.4, 0.3),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_HOLY', hard: true }, count: [3, 4], lifetime: [0.2, 0.28], delay: 0.05, size: 4,
                shape: 'CIRCLE', shapeRadius: 16, speed: [0, 10], vz: [50, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // 奧術：雙層六角環＋藍白閃
    'FX_HIT_BLUE_ARCANE': {
        id: 'FX_HIT_BLUE_ARCANE',
        emitters: [
            flash('LION_ARCANE', 30, 0.2),
            groundRing('LION_ARCANE', 28, 1.6, 0.3),
            groundRing('LION_ARCANE', 28, 1.0, 0.26, { thickness: 3, delay: 0.06 }),
            spray('LION_ARCANE', 3, [60, 150], [0.2, 0.3], 3),
        ],
    },

    // 冰：冰晶碎片迸散＋霜白環
    'FX_HIT_BLUE_ICE': {
        id: 'FX_HIT_BLUE_ICE',
        emitters: [
            flash('LION_ICE', 26, 0.16),
            groundRing('LION_ICE', 30, 1.4, 0.26),
            debris('crystal', 'LION_ICE', [3, 4], 8, [100, 220], [0.3, 0.42]),
        ],
    },

    // ================= 灰燼軍團（RED）=================

    // 灰燼重擊：骨白閃＋鋸齒鏽環＋碎石＋塵
    'FX_HIT_RED_PHYSICAL': {
        id: 'FX_HIT_RED_PHYSICAL',
        emitters: [
            flash('ASH_PHYSICAL', 26, 0.14),
            groundRing('ASH_PHYSICAL', 32, 1.4, 0.26, { rough: 1, seed: 1, thickness: 8 }),
            debris('rock', 'ASH_PHYSICAL', [2, 3], 6, [120, 260], [0.22, 0.32]),
            puff('DUST', 24, 1, [0.22, 0.30], 0.55, 0.02),
        ],
    },

    // 重擊：更大的斷裂環＋碎石四濺＋灰塵
    'FX_HIT_RED_HEAVY': {
        id: 'FX_HIT_RED_HEAVY',
        emitters: [
            flash('ASH_FIRE', 32, 0.16),
            groundRing('ASH_PHYSICAL', 40, 1.6, 0.3, { rough: 1, seed: 2, thickness: 10 }),
            debris('rock', 'ASH_PHYSICAL', [3, 4], 8, [140, 300], [0.24, 0.32]),
            puff('ASH', 28, 1, [0.22, 0.30], 0.55, 0.02),
        ],
    },

    // 血：血色新月斬＋血滴甩出（實體，一般混合）
    'FX_HIT_RED_BLOOD': {
        id: 'FX_HIT_RED_BLOOD',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 40, arcDeg: 120, thickness: 10, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.2, delay: 0, size: 40,
                partAnim: { scaleFrom: 0.8, scaleTo: 1.1, fadeOut: 0.6, rotation: -0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [4, 5], lifetime: [0.22, 0.32], delay: 0.02, size: 6,
                shape: 'BURST_DIR', speed: [100, 220], gravity: 1800, partAnim: { fadeOut: 0.3 } }),
            groundRing('ASH_BLOOD', 26, 1.2, 0.24, { rough: 1, seed: 3, thickness: 6 }),
        ],
    },

    // 熔岩：橘核閃＋小火舌＋火星＋斷裂火環
    'FX_HIT_RED_MAGMA': {
        id: 'FX_HIT_RED_MAGMA',
        emitters: [
            flash('ASH_FIRE', 32, 0.2),
            part({ particleType: 'PART', part: { kind: 'flame', height: 56, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.34, delay: 0, size: 28, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeOut: 0.6 } }),
            groundRing('ASH_FIRE', 30, 1.4, 0.26, { rough: 1, seed: 1, thickness: 8 }),
            spray('ASH_FIRE', [3, 4], [120, 260], [0.22, 0.36], 3),
        ],
    },

    // 瘴氣：膽綠閃＋瘴氣團＋腐液滴
    'FX_HIT_RED_FEL': {
        id: 'FX_HIT_RED_FEL',
        emitters: [
            flash('ASH_POISON', 28, 0.2),
            puff('MIASMA', 26, [2, 3], [0.35, 0.45], 0.6, 0),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_POISON' }, count: [2, 3], lifetime: [0.3, 0.4], delay: 0.02, size: 5,
                shape: 'BURST_DIR', speed: [60, 140], gravity: 1500, partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // 暗影／深淵：緋紅邊黑色斷環＋向上飄的黑煙
    'FX_HIT_RED_SHADOW': {
        id: 'FX_HIT_RED_SHADOW',
        emitters: [
            flash('ASH_VOID', 28, 0.18),
            groundRing('ASH_VOID', 32, 1.5, 0.3, { rough: 1, seed: 2, thickness: 9 }),
            puff('CHAR', 24, [1, 2], [0.35, 0.45], 0.7),
        ],
    },
};
