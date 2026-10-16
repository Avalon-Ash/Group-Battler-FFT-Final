import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";

// ==========================================
// 奧義特效（零件版）— 獅心（BLUE）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 獅心：金白、乾淨、對稱；日輪／獅盾紋章；環與碎片為正六角。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_BLUE: Record<string, VFXAsset> = {
    // tb_u3 絕對防禦（天降神盾，HEAVEN_FALL，範圍 4）：神盾落地 → 獅盾紋章展開＋光柱＋六角護盾碎片 → 光點上飄
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.02, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 2.4, fadeOut: 0.6 } }),
            // 紋章：神盾落地後烙下，緩慢淡出（守護範圍的提示）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0.05, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 六角護盾碎片向外彈開
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, count: [8, 10], lifetime: [0.8, 1.1], delay: 0.02, size: 8,
                shape: 'BURST_DIR', speed: [180, 360], vz: [250, 450], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.3, 0.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 90, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u4 泰坦降臨（巨型重擊，近身）：日輪法陣快閃 → 金色重擊閃光＋放射＋衝擊環＋碎石 → 塵土
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 80, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.2, delay: 0, size: 80,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.2, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 80, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.2, size: 80,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 16, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.55, delay: 0.2, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.0, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'LION_PHYSICAL', seed: 2 }, count: [8, 12], lifetime: [0.9, 1.2], delay: 0.2, size: 8,
                shape: 'BURST_DIR', speed: [250, 450], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 40, color: 'DUST', seed: 3 }, count: [3, 5], lifetime: [0.9, 1.2], delay: [0.3, 0.45], size: 40,
                shape: 'CIRCLE', shapeRadius: 50, speed: [20, 40], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.6 } }),
        ],
    },

    // wb_u1 雷霆之怒（跳躍轟炸，HEAVEN_FALL，範圍 3）：落地瞬間金雷劈下 → 閃光＋衝擊環 → 日輪烙印與電光殘點
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'bolt', length: 224, branches: 3, ramp: 'LION_LIGHTNING', seed: 4 }, count: 1, lifetime: 0.35, delay: 0, size: 112, groundAnchored: true,
                partAnim: { fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'bolt', length: 160, branches: 2, ramp: 'LION_LIGHTNING', seed: 7 }, count: [3, 4], lifetime: [0.2, 0.3], delay: [0.05, 0.2], size: 80, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 70, partAnim: { fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_LIGHTNING', hard: true }, count: 1, lifetime: 0.4, delay: 0, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.5, delay: 0.02, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'sun', ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 1.2, delay: 0.05, size: 96, vRotation: 0.8,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_LIGHTNING', hard: true }, count: [10, 14], lifetime: [0.5, 0.8], delay: [0.05, 0.3], size: 6,
                shape: 'BURST_DIR', speed: [150, 350], vz: [80, 200], drag: 0.06, partAnim: { fadeOut: 0.6 } }),
        ],
    },

    // wb_u2 破曉聖擊（自身範圍 4）：日輪法陣浮現 → 旭日爆發（閃光＋十二道光芒＋雙重衝擊環） → 光點上飄
    'FX_ULT_BLUE_DAYBREAK': {
        id: 'FX_ULT_BLUE_DAYBREAK',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0, size: 112, vRotation: 0.4,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.55, delay: 0.3, size: 112,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 128, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.6, rotation: 0.2 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.32, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 2.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.45, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.0, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.9, 1.2], delay: [0.45, 0.7], size: 8,
                shape: 'CIRCLE', shapeRadius: 110, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // sb_u4 神之怒火（自身範圍 4 轟炸）：日輪法陣 → 三道天罰光柱依序落下＋閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_WRATH': {
        id: 'FX_ULT_BLUE_WRATH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 112, vRotation: -0.4,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 224, ramp: 'LION_HOLY' }, count: 3, lifetime: 0.55, delay: [0.25, 0.45], size: 48, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 80, partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeIn: 0.05, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 64, height: 256, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.5, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeIn: 0.05, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.5, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.52, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 2.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 14], lifetime: [0.8, 1.1], delay: [0.6, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u1 聖光結界（自身範圍 3 暈眩，SANCTUARY）：獅盾法陣 → 六根光柱沿六角環升起＋中央閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.7, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 六根光柱：RING 均勻分布＝六角結界的六個頂點
            part({ particleType: 'PART', part: { kind: 'pillar', width: 40, height: 192, ramp: 'LION_HOLY' }, count: 6, lifetime: 1.0, delay: 0.25, size: 40, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.9, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u1 極地冰河（HEAVEN_FALL）／mb_u2 絕對零度（DOMAIN）共用：冰晶爆裂 → 冰霜衝擊環＋六角冰晶飛散 → 日輪霜印、冰塵
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_ICE', hard: true }, count: 1, lifetime: 0.45, delay: 0, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 32, shape: 'crystal', ramp: 'LION_ICE' }, count: [5, 6], lifetime: [0.9, 1.2], delay: [0, 0.1], size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 50, partAnim: { scaleFrom: 0.3, scaleTo: 1, fadeOut: 0.4 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 14, ramp: 'LION_ICE' }, count: 1, lifetime: 0.6, delay: 0.02, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.5, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_ICE' }, count: [10, 12], lifetime: [0.8, 1.1], delay: 0, size: 8,
                shape: 'BURST_DIR', speed: [200, 420], vz: [250, 450], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_ICE' }, count: 1, lifetime: 1.5, delay: 0.05, size: 112, vRotation: 0.2,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.45 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 40, color: 'STEEL', seed: 4 }, count: [3, 5], lifetime: [1.0, 1.3], delay: [0.15, 0.3], size: 40,
                shape: 'CIRCLE', shapeRadius: 70, speed: [20, 40], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.5 } }),
        ],
    },

    // rb_u3 軌道轟炸／穿日神矢（HEAVEN_FALL，單體）：日輪自天貫下 → 細長聖光柱＋核心閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 320, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 80, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.02, size: 80,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 10, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.02, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.0, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.2, delay: 0.05, size: 64, vRotation: 1.0,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_HOLY', hard: true }, count: [8, 10], lifetime: [0.8, 1.1], delay: [0.1, 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 40, speed: [10, 30], vz: [60, 120], drag: 0.02, partAnim: { fadeOut: 0.5 } }),
        ],
    },

    // mb_u1 事件視界／奧術漩渦（範圍 3 牽引）：奧術法陣 → 收縮的六角環與向心碎晶（牽引感）→ 核心坍縮閃光
    'FX_ULT_BLUE_BLACKHOLE': {
        id: 'FX_ULT_BLUE_BLACKHOLE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_VOID' }, count: 1, lifetime: 1.8, delay: 0, size: 112, vRotation: -1.2,
                partAnim: { scaleFrom: 1.1, scaleTo: 0.8, fadeIn: 0.15, fadeOut: 0.3 } }),
            // 牽引：衝擊環由外向內收縮（反向的衝擊環）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_VOID' }, count: 3, lifetime: 0.6, delay: [0.1, 0.7], size: 128,
                partAnim: { scaleFrom: 2.4, scaleTo: 0.2, fadeIn: 0.2, fadeOut: 0.3 } }),
            // 向心碎晶：從外圈被吸向中心
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_VOID' }, count: [10, 14], lifetime: [0.6, 0.8], delay: [0.1, 0.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 140, speed: [-220, -180], vRotation: [-6, 6], partAnim: { fadeIn: 0.2, fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_VOID' }, count: 1, lifetime: 1.2, delay: 0.1, size: 64,
                partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.3, fadeOut: 0.3, alpha: 0.8 } }),
            // 坍縮：最後一閃＋外推環
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.4, delay: 1.2, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.2, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.5, delay: 1.2, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.2, fadeOut: 0.6 } }),
        ],
    },

    // sb_u2 復活之光（自身範圍 6 治療，HEAVEN_FALL）：重生光柱落下 → 日輪法陣＋柔和光環 → 大量光點上升
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 288, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.9, delay: 0, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.1, scaleTo: 0.9, fadeIn: 0.05, fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.8, delay: 0, size: 128, vRotation: 0.3,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 2, lifetime: 0.8, delay: [0.05, 0.35], size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 3.0, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [14, 16], lifetime: [1.0, 1.3], delay: [0.1, 0.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 140, speed: [5, 20], vz: [60, 120], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u2 王者之風（全場嘲諷與護盾）：獅盾法陣 → 王者光環（三道擴散環）＋上射光芒 → 光點
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.5, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_HOLY' }, count: 3, lifetime: 0.8, delay: [0.3, 0.7], size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 3.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.9, 1.2], delay: [0.4, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 120, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u5 鋼鐵長城（全隊護盾）：獅盾法陣 → 六角護盾碎片環形升起＋護盾環 → 碎片閃爍淡出
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.7, delay: 0, size: 112, vRotation: -0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 城牆：六面六角盾片沿六角環立起
            part({ particleType: 'PART', part: { kind: 'shard', size: 32, shape: 'hex', ramp: 'LION_ARCANE' }, count: 6, lifetime: 1.1, delay: [0.25, 0.4], size: 32, groundAnchored: true,
                shape: 'RING', shapeRadius: 90, vz: [20, 40], partAnim: { scaleFrom: 0.3, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.5, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_ARCANE' }, count: 2, lifetime: 0.8, delay: [0.3, 0.55], size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 3.0, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_ARCANE', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u4 絕對封鎖（範圍 4 禁錮）：日輪法陣 → 六根細光柱沿六角環落下成牢籠＋收縮環 → 牢籠淡出
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.7, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 24, height: 224, ramp: 'LION_ARCANE' }, count: 6, lifetime: 1.2, delay: 0.25, size: 24, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.35 } }),
            // 禁錮：環由外向內收緊
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_ARCANE' }, count: 2, lifetime: 0.6, delay: [0.3, 0.55], size: 128,
                partAnim: { scaleFrom: 2.4, scaleTo: 0.6, fadeIn: 0.2, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.45, delay: 0.85, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
        ],
    },

    // mb_u3 時間停止（全場靜止）：巨大日輪時鐘法陣緩轉 → 白光一閃＋擴散環（時間凍結）→ 光點懸停
    'FX_ULT_BLUE_TIMESTOP': {
        id: 'FX_ULT_BLUE_TIMESTOP',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.9, delay: 0, size: 128, vRotation: 1.2,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.3 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0.15, size: 64, vRotation: -2.0,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.5, size: 112,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.4, fadeOut: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.9, delay: 0.5, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 3.4, fadeOut: 0.5 } }),
            // 懸停光點：無速度、無上飄（時間靜止）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [1.0, 1.3], delay: [0.5, 0.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 130, vz: [0, 10], partAnim: { fadeIn: 0.1, fadeOut: 0.4 } }),
        ],
    },

    // sb_u1 神聖干涉（單體無敵）：小型獅盾法陣 → 窄光柱＋六角護盾碎片環繞＋閃光 → 光點
    'FX_ULT_BLUE_INTERVENTION': {
        id: 'FX_ULT_BLUE_INTERVENTION',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0, size: 64, vRotation: 0.5,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0.25, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.05, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.25, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'hex', ramp: 'LION_HOLY' }, count: 6, lifetime: 1.0, delay: 0.3, size: 16,
                shape: 'RING', shapeRadius: 40, vz: [30, 50], vRotation: [-2, 2], partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.27, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.6 } }),
        ],
    },
};
