import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { flash, groundRing, spray, debris, puff } from "./basic_parts";

// ==========================================
// 主動技特效（零件版，V2b）
// ART_SPEC §6：主動技 2～3 層、≤ 0.8 s、無全螢幕閃白；保留範圍讀法（AOE 的環半徑 ≈ 範圍半徑，HEX_SIZE = 48）。
// 起手預兆（FX_IMPERIAL_*／FX_COVENANT_*）≤ 0.5 s，在目標點先亮出陣營紋章。
// ==========================================

export const ACTIVE_PART_VFX: Record<string, VFXAsset> = {
    // ================= 獅心騎士團（BLUE）=================

    // 起手：目標點六角網格掃過＋金色小日輪（取代舊的科幻掃描）
    'FX_IMPERIAL_SCAN': {
        id: 'FX_IMPERIAL_SCAN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.5, delay: 0, size: 48, vRotation: 0.8,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },
    // 起手：支援者腳下的獅盾光環＋上飄光點
    'FX_IMPERIAL_HALO': {
        id: 'FX_IMPERIAL_HALO',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.2, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_HOLY', hard: true }, count: [4, 5], lifetime: [0.5, 0.7], delay: [0, 0.2], size: 4,
                shape: 'CIRCLE', shapeRadius: 28, speed: [0, 8], vz: [40, 80], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // 神盾護佑（護盾類）：獅盾紋章展開＋六角環＋金光點上升（聚合、上升）
    'FX_ACTIVE_BLUE_AEGIS_WARD': {
        id: 'FX_ACTIVE_BLUE_AEGIS_WARD',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 0.8, delay: 0, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.45 } }),
            groundRing('LION_HOLY', 48, 1.5, 0.45, { delay: 0.05 }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'LION_HOLY', hard: true }, count: [6, 8], lifetime: [0.5, 0.75], delay: [0.05, 0.3], size: 5,
                shape: 'CIRCLE', shapeRadius: 40, speed: [0, 10], vz: [50, 110], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // 裁決（單體聖擊）：光柱落下＋八道光芒＋六角環
    'FX_ACTIVE_BLUE_HOLY_SMITE': {
        id: 'FX_ACTIVE_BLUE_HOLY_SMITE',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 40, height: 176, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.55, delay: 0, size: 40, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.05, fadeOut: 0.6 } }),
            flash('LION_HOLY', 56, 0.35, 0.05),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 56, count: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.05, size: 56,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6 } }),
            groundRing('LION_HOLY', 48, 1.8, 0.45, { delay: 0.05 }),
        ],
    },

    // 輝光迸發（周圍／範圍 AOE）：日輪法陣＋十二道光芒＋雙環向外擴（環終半徑 ≈ 範圍）
    'FX_ACTIVE_BLUE_RADIANT_BURST': {
        id: 'FX_ACTIVE_BLUE_RADIANT_BURST',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0, size: 64, vRotation: 0.6,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.5 } }),
            flash('LION_HOLY', 64, 0.3, 0.08),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 64, count: 12, ramp: 'LION_HOLY', lengthJitter: 0.5 }, count: 1, lifetime: 0.35, delay: 0.08, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6, rotation: 0.2 } }),
            groundRing('LION_HOLY', 64, 2.0, 0.5, { delay: 0.08 }),
            groundRing('LION_HOLY', 64, 1.3, 0.4, { delay: 0.18, thickness: 6 }),
        ],
    },

    // 霜凍：冰晶尖刺自地面升起＋霜環＋冰屑
    'FX_ACTIVE_BLUE_FROST_SNAP': {
        id: 'FX_ACTIVE_BLUE_FROST_SNAP',
        emitters: [
            flash('LION_ICE', 48, 0.25),
            groundRing('LION_ICE', 56, 1.8, 0.45),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 16, shape: 'crystal', ramp: 'LION_ICE' }, count: [4, 5], lifetime: [0.5, 0.7], delay: [0.02, 0.1], size: 16,
                shape: 'CIRCLE', shapeRadius: 36, speed: [10, 40], vz: [220, 380], gravity: 1800, vRotation: [-3, 3], partAnim: { fadeOut: 0.4 } }),
            debris('hex', 'LION_ICE', [4, 6], 6, [120, 240], [0.4, 0.6], 0.1),
        ],
    },

    // 奧術漣漪：法陣＋三道同心六角環依序擴散（平穩、收束）
    'FX_ACTIVE_BLUE_ARCANE_RIPPLE': {
        id: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.7, delay: 0, size: 64, vRotation: -0.8,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.5 } }),
            flash('LION_ARCANE', 56, 0.3, 0.1),
            groundRing('LION_ARCANE', 64, 1.8, 0.5, { delay: 0.1 }),
            groundRing('LION_ARCANE', 64, 1.4, 0.45, { delay: 0.2, thickness: 6 }),
            groundRing('LION_ARCANE', 64, 1.0, 0.4, { delay: 0.3, thickness: 4 }),
            spray('LION_ARCANE', [4, 5], [60, 140], [0.35, 0.5], 4, 0.1),
        ],
    },

    // ================= 灰燼軍團（RED）=================

    // 起手：目標點裂口（倒三角符文）
    'FX_COVENANT_RIFT': {
        id: 'FX_COVENANT_RIFT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: 0.5, delay: 0, size: 48,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },
    // 起手：骨刺／血刺——角骷髏烙印快閃
    'FX_COVENANT_BLOOD_SPIKE': {
        id: 'FX_COVENANT_BLOOD_SPIKE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.5 } }),
        ],
    },

    // 暗影尖嘯（範圍恐懼）：倒三角符文烙地＋黑色斷環擴散＋黑煙上升
    'FX_ACTIVE_RED_SHADOW_SCREAM': {
        id: 'FX_ACTIVE_RED_SHADOW_SCREAM',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: 0.8, delay: 0, size: 64,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.45 } }),
            groundRing('ASH_VOID', 64, 2.0, 0.5, { rough: 1, seed: 1, thickness: 12, delay: 0.08 }),
            flash('ASH_VOID', 48, 0.25, 0.08),
            puff('CHAR', 36, [3, 4], [0.5, 0.7], 0.75, 0.1),
        ],
    },

    // 戰爭踐踏（近身／範圍重擊）：粗斷環＋碎石四濺＋塵煙（重、短停頓）
    'FX_ACTIVE_RED_WAR_STOMP': {
        id: 'FX_ACTIVE_RED_WAR_STOMP',
        emitters: [
            flash('ASH_PHYSICAL', 56, 0.2),
            groundRing('ASH_PHYSICAL', 64, 2.0, 0.5, { rough: 1, seed: 1, thickness: 14 }),
            groundRing('ASH_PHYSICAL', 64, 1.2, 0.4, { rough: 1, seed: 2, thickness: 8, delay: 0.08 }),
            debris('rock', 'ASH_PHYSICAL', [6, 8], 10, [200, 380], [0.5, 0.7]),
            puff('DUST', 40, [3, 4], [0.5, 0.7], 0.6, 0.05),
        ],
    },

    // 血怒（自身強化）：血色倒三角符印＋血光上翻＋血滴向上噴
    'FX_ACTIVE_RED_BLOOD_RAGE': {
        id: 'FX_ACTIVE_RED_BLOOD_RAGE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 56, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.8, delay: 0, size: 56,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.45 } }),
            flash('ASH_BLOOD', 48, 0.3),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [5, 6], lifetime: [0.5, 0.7], delay: [0, 0.12], size: 6,
                shape: 'CIRCLE', shapeRadius: 24, speed: [10, 40], vz: [220, 360], gravity: 1500, partAnim: { fadeOut: 0.3 } }),
            groundRing('ASH_BLOOD', 44, 1.5, 0.4, { rough: 1, seed: 3, thickness: 8 }),
        ],
    },

    // 熔岩噴發（範圍火）：火柱＋周圍火舌＋斷裂火環＋灼石＋灰煙
    'FX_ACTIVE_RED_MAGMA_ERUPTION': {
        id: 'FX_ACTIVE_RED_MAGMA_ERUPTION',
        emitters: [
            flash('ASH_FIRE', 56, 0.3),
            part({ particleType: 'PART', part: { kind: 'flame', height: 128, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.7, delay: 0.02, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 64, ramp: 'ASH_FIRE', jagged: true }, count: [4, 5], lifetime: [0.5, 0.7], delay: [0.05, 0.2], size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 48, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            groundRing('ASH_FIRE', 64, 1.9, 0.5, { rough: 1, seed: 1, thickness: 12 }),
            debris('rock', 'ASH_PHYSICAL', [4, 5], 8, [180, 340], [0.5, 0.7]),
            puff('ASH', 36, [2, 3], [0.6, 0.8], 0.7, 0.15),
        ],
    },

    // 邪能飛濺（毒／腐化）：膽綠環＋瘴氣團＋腐液飛濺
    'FX_ACTIVE_RED_FEL_SPLASH': {
        id: 'FX_ACTIVE_RED_FEL_SPLASH',
        emitters: [
            flash('ASH_POISON', 48, 0.3),
            groundRing('ASH_POISON', 52, 1.7, 0.5, { rough: 1, seed: 1, thickness: 10 }),
            puff('MIASMA', 34, [3, 4], [0.6, 0.85], 0.65, 0.02),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 6, ramp: 'ASH_POISON' }, count: [4, 6], lifetime: [0.4, 0.6], delay: 0.02, size: 6,
                shape: 'BURST_DIR', speed: [80, 180], gravity: 1500, partAnim: { fadeOut: 0.3 } }),
        ],
    },
};
