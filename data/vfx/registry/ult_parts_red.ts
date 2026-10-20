import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";

// ==========================================
// 奧義特效（零件版）— 灰燼（RED）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 灰燼：深紅／火／骨／深淵；角骷髏／倒三角紋章；衝擊環斷裂（roughness）。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_RED: Record<string, VFXAsset> = {
    // tr_u1 處決斷頭台（HEAVEN_FALL，單體）：巨刃落下 → 直劈血弧＋閃光＋斷裂環＋血滴與骨片 → 倒三角烙印
    // tr_u1 處決斷頭台（HEAVEN_FALL，單體斬殺）：倒三角法陣 → 巨大垂直斷頭台刃落下＋深紅閃光＋衝擊環＋血滴四濺
    'FX_ULT_RED_GUILLOTINE_IMPACT': {
        id: 'FX_ULT_RED_GUILLOTINE_IMPACT',
        emitters: [
            // 起手：倒三角法陣（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.1, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.45 } }),
            // 命中：垂直斷頭台刃
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 112, arcDeg: 120, thickness: 28, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.35, delay: 0.3, size: 112,
                partAnim: { scaleFrom: 0.9, scaleTo: 1.1, fadeOut: 0.5, rotation: 1.57 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: 0.3, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 單體擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 12, ramp: 'ASH_BLOOD', roughness: 1, seed: 2 }, count: 1, lifetime: 0.45, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [10, 14], lifetime: [0.5, 0.7], delay: 0.3, size: 6,
                shape: 'BURST_DIR', speed: [150, 350], vz: [200, 450], gravity: 2200, partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: [4, 6], lifetime: [0.6, 0.8], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [200, 400], gravity: 2200, vRotation: [-10, 10], partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // tr_u4 永恆夢魘（自身範圍 8，全場級）：深淵角骷髏法陣 → 虛空爆閃＋巨大斷裂環向外吞噬 → 黑煙翻騰、深淵碎晶上浮
    'FX_ULT_RED_NIGHTMARE': {
        id: 'FX_ULT_RED_NIGHTMARE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'hornSkull', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: -0.3,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.6, delay: 0.3, size: 112,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.5, fadeOut: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 20, ramp: 'ASH_VOID', roughness: 1, seed: 4 }, count: 1, lifetime: 0.8, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 3.2, fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'ASH_BLOOD', roughness: 1, seed: 5 }, count: 1, lifetime: 0.7, delay: 0.45, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 56, color: 'CHAR', roughness: 1, seed: 6 }, count: [5, 7], lifetime: [1.0, 1.3], delay: [0.4, 0.6], size: 56,
                shape: 'CIRCLE', shapeRadius: 120, speed: [20, 50], vz: [20, 50], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.75 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'ASH_VOID' }, count: [8, 10], lifetime: [0.9, 1.2], delay: [0.4, 0.7], size: 8,
                shape: 'CIRCLE', shapeRadius: 130, speed: [5, 20], vz: [50, 110], vRotation: [-3, 3], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // wr_u3 惡魔降臨（自身變身）：倒三角法陣烙下 → 火焰吞身＋核心閃光＋衝擊環 → 灰煙與火星
    'FX_ULT_RED_DEMON_FORM': {
        id: 'FX_ULT_RED_DEMON_FORM',
        emitters: [
            // 起手：倒三角法陣（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_FIRE' }, count: 1, lifetime: 1.5, delay: 0, size: 36, vRotation: 0.6,
                partAnim: { scaleFrom: 1.1, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 160, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.8, delay: 0.25, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeOut: 0.5 } }),
            // 命中主爆發（glow radius 64 大於環，非擴張環；delay 0.25 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0.25, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 單體非擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 12, ramp: 'ASH_FIRE', roughness: 1, seed: 3 }, count: 1, lifetime: 0.5, delay: 0.28, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.5 } }),
            // 餘韻火星（vz > 0 滿足 power <= 0 規則）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_FIRE', hard: true }, count: [6, 8], lifetime: 0.8, delay: [0.35, 0.5], size: 6,
                shape: 'CIRCLE', shapeRadius: 40, speed: [15, 35], vz: [40, 80], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // wr_u5 毀滅重擊（自身範圍 3）：角骷髏印記 → 重擊爆閃＋鋸齒放射＋粗斷裂環＋大量碎石 → 塵土
    'FX_ULT_RED_DEVASTATE': {
        id: 'FX_ULT_RED_DEVASTATE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.3, delay: 0, size: 96,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: 0.25, size: 80,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 8, ramp: 'ASH_BLOOD', lengthJitter: 1, seed: 5 }, count: 1, lifetime: 0.3, delay: 0.25, size: 96,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 20, ramp: 'ASH_PHYSICAL', roughness: 1, seed: 6 }, count: 1, lifetime: 0.6, delay: 0.25, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.2, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 4 }, count: [10, 14], lifetime: [0.9, 1.3], delay: 0.25, size: 10,
                shape: 'BURST_DIR', speed: [250, 550], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 48, color: 'DUST', roughness: 1, seed: 8 }, count: [4, 5], lifetime: [1.0, 1.3], delay: [0.35, 0.5], size: 48,
                shape: 'CIRCLE', shapeRadius: 70, speed: [20, 50], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },

    // mr_u1 毀滅隕石（HEAVEN_FALL，範圍 2）：隕石落地 → 火光爆閃＋火柱群＋斷裂環＋熔岩碎石 → 灰煙、火星、角骷髏焦痕
    'FX_ULT_RED_METEOR_IMPACT': {
        id: 'FX_ULT_RED_METEOR_IMPACT',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.5, delay: 0, size: 112,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.5, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 112, count: 10, ramp: 'ASH_FIRE', lengthJitter: 1, seed: 9 }, count: 1, lifetime: 0.3, delay: 0, size: 112,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 128, ramp: 'ASH_FIRE', jagged: true }, count: [5, 6], lifetime: [0.7, 1.0], delay: [0.02, 0.15], size: 64, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 40, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 16, ramp: 'ASH_FIRE', roughness: 1, seed: 7 }, count: 1, lifetime: 0.55, delay: 0.02, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.4, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_FIRE', seed: 5 }, count: [10, 12], lifetime: [0.9, 1.3], delay: 0, size: 10,
                shape: 'BURST_DIR', speed: [250, 550], vz: [200, 450], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 1.4, delay: 0.1, size: 96,
                partAnim: { scaleFrom: 0.8, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 56, color: 'ASH', roughness: 1, seed: 9 }, count: [4, 6], lifetime: [1.0, 1.3], delay: [0.2, 0.35], size: 56,
                shape: 'CIRCLE', shapeRadius: 60, speed: [10, 30], vz: [30, 60], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_FIRE', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.15, 0.45], size: 6,
                shape: 'CIRCLE', shapeRadius: 80, speed: [20, 60], vz: [60, 140], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // rr_u2 戰術核彈（HEAVEN_FALL，範圍 3 擊退）：落地 → 白熱爆閃＋巨大火柱＋雙層斷裂環（擊退）＋碎石 → 蕈狀灰煙
    'FX_ULT_RED_NUKE_FLASH': {
        id: 'FX_ULT_RED_NUKE_FLASH',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 128, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.5, delay: 0, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.5, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 128, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 1.0, delay: 0.02, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.15, fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 20, ramp: 'ASH_FIRE', roughness: 1, seed: 8 }, count: 1, lifetime: 0.6, delay: 0.02, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'ASH_BLOOD', roughness: 1, seed: 9 }, count: 1, lifetime: 0.6, delay: 0.15, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 6 }, count: [10, 12], lifetime: [0.9, 1.3], delay: 0, size: 10,
                shape: 'BURST_DIR', speed: [300, 600], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 64, color: 'CHAR', roughness: 1, seed: 10 }, count: [5, 6], lifetime: [1.1, 1.4], delay: [0.25, 0.4], size: 64,
                shape: 'CIRCLE', shapeRadius: 40, speed: [20, 50], vz: [80, 140], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.7, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_FIRE', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.1, 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 90, speed: [30, 70], vz: [60, 140], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // sr_u4 猩紅血月（自身範圍 10 吸血）：血月（深紅光暈）高懸 → 角骷髏法陣＋擴散斷裂環 → 血滴向上被吸走
    'FX_ULT_RED_BLOOD_MOON': {
        id: 'FX_ULT_RED_BLOOD_MOON',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: 0.2,
                partAnim: { scaleFrom: 0.8, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 血月：施法者上方的大光暈（vz 讓它緩升）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_BLOOD', hard: true }, count: 1, lifetime: 1.6, delay: 0.1, size: 64, vz: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeIn: 0.2, fadeOut: 0.3 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 14, ramp: 'ASH_BLOOD', roughness: 1, seed: 11 }, count: 1, lifetime: 0.8, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 3.2, fadeOut: 0.5 } }),
            // 吸血：外圈血滴向上、向中心漂
            part({ particleType: 'PART', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [12, 14], lifetime: [0.9, 1.2], delay: [0.3, 0.7], size: 6,
                shape: 'CIRCLE', shapeRadius: 150, speed: [-140, -100], vz: [60, 120], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.4 } }),
        ],
    },

    // tr_u3 不朽屍王（自身巨量護盾）：倒三角法陣 → 骨片環繞升起＋深紅閃光＋六角護盾碎晶 → 暗紅殘光
    'FX_ULT_RED_UNDYING': {
        id: 'FX_ULT_RED_UNDYING',
        emitters: [
            // 起手：倒三角法陣（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.5, delay: 0, size: 36, vRotation: -0.5,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: 6, lifetime: 0.9, delay: [0.2, 0.35], size: 16, groundAnchored: true,
                shape: 'RING', shapeRadius: 30, partAnim: { scaleFrom: 0.3, scaleTo: 1, fadeOut: 0.4 } }),
            // 命中主爆發（glow radius 64 大於環，非擴張環）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.45, delay: 0.25, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 單體非擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 12, ramp: 'ASH_BLOOD', roughness: 1, seed: 12 }, count: 1, lifetime: 0.5, delay: 0.28, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'ASH_BLOOD' }, count: [8, 10], lifetime: [0.8, 1.1], delay: [0.35, 0.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 40, speed: [10, 30], vz: [50, 100], vRotation: [-4, 4], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tr_u5 鮮血之牆（自身範圍 4 群體護盾，SANCTUARY）：角骷髏法陣 → 六道血柱沿六角環升起＋核心閃光＋衝擊環 → 血滴落下
    'FX_ULT_RED_BLOOD_WALL': {
        id: 'FX_ULT_RED_BLOOD_WALL',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.6, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 128, ramp: 'ASH_BLOOD', jagged: true }, count: 6, lifetime: 1.0, delay: [0.25, 0.4], size: 48, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            // 命中主爆發（glow radius 80 大於環，非擴張環；delay 0.25 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'ASH_BLOOD', hard: true }, count: 1, lifetime: 0.45, delay: 0.25, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 4 柔和環（128 * 1.9 * 1.4 = 340.5px，落於 232.8～432.3px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 14, ramp: 'ASH_BLOOD', roughness: 1, seed: 13 }, count: 1, lifetime: 0.6, delay: 0.25, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.9, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [10, 12], lifetime: [0.7, 1.0], delay: [0.4, 0.7], size: 6,
                shape: 'CIRCLE', shapeRadius: 100, speed: [10, 40], vz: [150, 300], gravity: 1800, partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // sr_u2 鮮血契約（自身範圍 8 大補）：鮮血法陣 → 血色閃光＋擴散環 → 血珠上浮（生命回流）
    'FX_ULT_RED_BLOOD_PACT': {
        id: 'FX_ULT_RED_BLOOD_PACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: 0.4,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.5, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'ASH_BLOOD', roughness: 0.5, seed: 14 }, count: 2, lifetime: 0.8, delay: [0.3, 0.55], size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [12, 14], lifetime: [1.0, 1.3], delay: [0.4, 0.8], size: 6,
                shape: 'CIRCLE', shapeRadius: 130, speed: [5, 20], vz: [50, 100], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },

    // tr_u2 亡靈瘟疫（自身範圍 2 持續腐化）：毒色角骷髏法陣 → 斷裂毒環＋瘴氣湧出 → 毒滴飛濺
    'FX_ULT_RED_PLAGUE': {
        id: 'FX_ULT_RED_PLAGUE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'hornSkull', ramp: 'ASH_POISON' }, count: 1, lifetime: 1.7, delay: 0, size: 96,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 14, ramp: 'ASH_POISON', roughness: 1, seed: 15 }, count: 1, lifetime: 0.6, delay: 0.25, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 48, color: 'MIASMA', roughness: 1, seed: 11 }, count: [5, 6], lifetime: [1.1, 1.4], delay: [0.25, 0.5], size: 48,
                shape: 'CIRCLE', shapeRadius: 60, speed: [20, 40], vz: [20, 40], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_POISON' }, count: [10, 12], lifetime: [0.7, 1.0], delay: [0.25, 0.4], size: 6,
                shape: 'BURST_DIR', speed: [150, 300], vz: [200, 400], gravity: 2000, partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // mr_u3 虛空降臨（單體凝滯）：深淵倒三角法陣 → 收縮斷裂環＋深淵碎晶環繞凍結 → 暗光
    'FX_ULT_RED_VOID_PORTAL': {
        id: 'FX_ULT_RED_VOID_PORTAL',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 80, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.7, delay: 0, size: 80, vRotation: -0.8,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'ASH_VOID', roughness: 1, seed: 16 }, count: 2, lifetime: 0.6, delay: [0.2, 0.5], size: 128,
                partAnim: { scaleFrom: 2.0, scaleTo: 0.4, fadeIn: 0.2, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_VOID' }, count: 1, lifetime: 1.2, delay: 0.3, size: 64,
                partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.2, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'crystal', ramp: 'ASH_VOID' }, count: 5, lifetime: 1.1, delay: 0.4, size: 16,
                shape: 'RING', shapeRadius: 40, vz: [20, 40], vRotation: [-1, 1], partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
        ],
    },

    // mr_u4 末世毒雨（全場毒雨）：大型毒色角骷髏法陣 → 毒滴大量拋起落下＋瘴氣＋斷裂環 → 瘴氣殘留
    'FX_ULT_RED_POISON_RAIN': {
        id: 'FX_ULT_RED_POISON_RAIN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'hornSkull', ramp: 'ASH_POISON' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: 0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_POISON' }, count: [14, 16], lifetime: [0.7, 1.0], delay: [0.25, 0.8], size: 6,
                shape: 'CIRCLE', shapeRadius: 140, speed: [-40, 40], vz: [300, 450], gravity: 2000, partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'ASH_POISON', roughness: 1, seed: 17 }, count: 1, lifetime: 0.8, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 3.0, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 56, color: 'MIASMA', roughness: 1, seed: 12 }, count: [5, 6], lifetime: [1.1, 1.4], delay: [0.4, 0.6], size: 56,
                shape: 'CIRCLE', shapeRadius: 110, speed: [10, 30], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.6 } }),
        ],
    },

    // sr_u1 靈魂連結（自身範圍 3 群體禁錮，SANCTUARY）：深淵倒三角法陣 → 五道深淵雷鏈沿環落下＋收縮斷裂環 → 暗光
    'FX_ULT_RED_SOUL_WEB': {
        id: 'FX_ULT_RED_SOUL_WEB',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.7, delay: 0, size: 112, vRotation: 0.5,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'bolt', length: 160, branches: 1, ramp: 'ASH_VOID', seed: 5 }, count: 5, lifetime: 0.5, delay: [0.25, 0.45], size: 80, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'ASH_VOID', roughness: 1, seed: 18 }, count: 2, lifetime: 0.6, delay: [0.3, 0.55], size: 128,
                partAnim: { scaleFrom: 2.2, scaleTo: 0.5, fadeIn: 0.2, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.6, delay: 0.5, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6 } }),
        ],
    },

    // sr_u5 惡靈附身（單體強化）：角骷髏法陣 → 深淵火焰纏身＋黑煙螺旋上升 → 暗紅殘光
    'FX_ULT_RED_POSSESSION': {
        id: 'FX_ULT_RED_POSSESSION',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'hornSkull', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.5, delay: 0, size: 64, vRotation: -0.6,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 128, ramp: 'ASH_VOID', jagged: true }, count: 1, lifetime: 0.9, delay: 0.25, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: 0.25, size: 48,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'CHAR', roughness: 1, seed: 13 }, count: [4, 5], lifetime: [0.9, 1.2], delay: [0.3, 0.6], size: 32,
                shape: 'CIRCLE', shapeRadius: 30, speed: [-20, -10], vz: [60, 110], drag: 0.02, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 10, ramp: 'ASH_VOID', roughness: 1, seed: 19 }, count: 1, lifetime: 0.5, delay: 0.28, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.5 } }),
        ],
    },
};
