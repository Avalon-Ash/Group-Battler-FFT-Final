import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { flash, spray } from "./basic_parts";

// ==========================================
// 共用特效（零件版）：格子脈衝、出手閃光、治療、吸血、瞬移。
// 取代 shared.ts 裡的 GRID_FIELD／GLOW／SPARK／PILLAR／SPIKE 舊粒子（docs/VFX_PIPELINE_MAP.md §4.1）。
// 零件的顏色在烘焙時由 ramp 決定，不吃 colorOverride：需要分陣營的拆成 _BLUE／_RED 兩個鍵，由呼叫端依施法者陣營選。
// 尺寸參考：HEX_SIZE = 48。
// ==========================================

/** 格子脈衝：一格大小的六角框＋淡淡的格內光，不擴張（原 GRID_FIELD 的 0.95 格框＋15% 填色） */
const GRID_RING_R = 46;
const GRID_GLOW_R = 42;

export const SHARED_PART_VFX: Record<string, VFXAsset> = {
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: GRID_RING_R, thickness: 4, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.5, delay: 0, size: GRID_RING_R * 2,
                partAnim: { scaleFrom: 0.92, scaleTo: 1, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'glow', radius: GRID_GLOW_R, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.45, delay: 0, size: GRID_GLOW_R,
                partAnim: { fadeOut: 0.8, alpha: 0.35 } }),
        ],
    },
    // 灰燼：鋸齒斷框，壽命略長（原 GRID_CORRUPT_RED 0.5～0.7 s）
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: GRID_RING_R, thickness: 4, ramp: 'ASH_BLOOD', roughness: 0.5, seed: 3 }, count: 1, lifetime: 0.6, delay: 0, size: GRID_RING_R * 2,
                partAnim: { scaleFrom: 0.92, scaleTo: 1, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'glow', radius: GRID_GLOW_R, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.55, delay: 0, size: GRID_GLOW_R,
                partAnim: { fadeOut: 0.8, alpha: 0.35 } }),
        ],
    },

    // 投射物出手閃光（發射點＝核心投影中心）：小閃＋少量火星，普攻每秒都在放，保持 ≤ 6 顆
    'FX_MUZZLE_FLASH_BLUE': {
        id: 'FX_MUZZLE_FLASH_BLUE',
        emitters: [
            flash('LION_HOLY', 14, 0.14),
            spray('LION_HOLY', [3, 4], [100, 200], [0.14, 0.24], 2.5),
        ],
    },
    'FX_MUZZLE_FLASH_RED': {
        id: 'FX_MUZZLE_FLASH_RED',
        emitters: [
            flash('ASH_FIRE', 14, 0.14),
            spray('ASH_FIRE', [3, 4], [100, 200], [0.14, 0.24], 2.5),
        ],
    },

    // 治療：柔光一閃＋上飄光點（兩陣營同為綠色，治療的辨識度優先於陣營色）
    'FX_HEAL_BURST': {
        id: 'FX_HEAL_BURST',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 30, ramp: 'STATUS_GREEN' }, count: 1, lifetime: 0.4, delay: 0, size: 30,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeOut: 0.7, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 3, ramp: 'STATUS_GREEN', hard: true }, count: [6, 8], lifetime: [0.45, 0.7], delay: 0, size: 3,
                shape: 'CIRCLE', shapeRadius: 16, speed: [10, 30], vz: [90, 160], drag: 0.06, partAnim: { fadeIn: 0.1, fadeOut: 0.6 } }),
        ],
    },

    // 吸血：血色一閃＋上飄血滴
    'FX_VAMP_BURST': {
        id: 'FX_VAMP_BURST',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 28, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: 0, size: 28,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeOut: 0.7, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'droplet', size: 4, ramp: 'ASH_BLOOD' }, count: [5, 7], lifetime: [0.4, 0.6], delay: 0, size: 4,
                shape: 'CIRCLE', shapeRadius: 16, speed: [10, 30], vz: [80, 150], drag: 0.06, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // 瞬移（mb_a3 秘儀突進的命中）：秘藍光柱＋閃光＋碎光
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 18, height: 72, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.6 } }),
            flash('LION_ARCANE', 30, 0.2),
            spray('LION_VOID', 4, [120, 220], [0.16, 0.28], 3),
        ],
    },
};
