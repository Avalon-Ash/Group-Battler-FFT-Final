import { VFXAsset } from "../../../types/VFXSchema";
import type { VFXRampId } from "../parts/vfxPalette";
import { Team } from "../../../types";
import { part } from "./ult_parts";
import { flash, spray, groundRing, debris, puff } from "./basic_parts";

// ==========================================
// 共用特效（零件版）：格子脈衝、出手閃光、治療、吸血、瞬移、燒魔；以及奧義 HEAVEN_FALL 的隕石。
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

    // 通用撞擊（死亡爆點 UnitShatter、奧義詠唱中斷）：中性灰白一閃＋貼地環＋碎石（原 SHOCKWAVE／RUBBLE／GLOW）
    'FX_HIT_GENERIC': {
        id: 'FX_HIT_GENERIC',
        emitters: [
            flash('STATUS_SLATE', 30, 0.12),
            groundRing('STATUS_SLATE', 26, 1.5, 0.22),
            debris('rock', 'STATUS_SLATE', [4, 6], 5, [150, 300], [0.3, 0.5]),
        ],
    },

    // 護盾吸收：冰藍六角碎晶＋貼地漣漪＋小閃（原 HEX_SHARD／RIPPLE）
    'FX_HIT_SHIELD_SPARK': {
        id: 'FX_HIT_SHIELD_SPARK',
        emitters: [
            flash('LION_ICE', 20, 0.14),
            groundRing('LION_ICE', 24, 1.8, 0.32, { thickness: 4 }),
            debris('hex', 'LION_ICE', [6, 8], 5, [150, 250], [0.2, 0.32]),
        ],
    },

    // 布陣出場：陣營法陣浮現＋光柱升起（原 HEX_GLOW／MAGIC_CIRCLE＋PILLAR＋SPARK／SMOKE）
    'FX_SPAWN_BLUE': {
        id: 'FX_SPAWN_BLUE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 40, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0, size: 40,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 22, height: 90, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0, size: 45,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.6 } }),
            spray('LION_ARCANE', [4, 6], [60, 140], [0.3, 0.55], 3),
        ],
    },
    'FX_SPAWN_RED': {
        id: 'FX_SPAWN_RED',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 40, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.6, delay: 0, size: 40,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 22, height: 90, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.5, delay: 0, size: 45,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.6 } }),
            puff('CHAR', 14, [3, 4], [0.4, 0.7], 0.5),
        ],
    },

    // 待機：腰部飄起一兩顆小光點（原 SPARK；每 1.5～2.5 秒一次，保持很淡）
    'FX_IDLE_BLUE': {
        id: 'FX_IDLE_BLUE',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 2.5, ramp: 'LION_ARCANE', hard: true }, count: [1, 2], lifetime: [0.8, 1.2], delay: 0, size: 2.5,
                shape: 'CIRCLE', shapeRadius: 12, speed: [4, 12], vz: [30, 60], drag: 0.04, partAnim: { fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
        ],
    },
    'FX_IDLE_RED': {
        id: 'FX_IDLE_RED',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 2.5, ramp: 'ASH_FIRE', hard: true }, count: [1, 2], lifetime: [0.8, 1.2], delay: 0, size: 2.5,
                shape: 'CIRCLE', shapeRadius: 12, speed: [4, 12], vz: [30, 60], drag: 0.04, partAnim: { fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
        ],
    },

    // 自傷（SACRIFICE）：暗紅一閃＋濺落血滴＋焦煙（原 SHARD／SMOKE／GLOW）
    'FX_SELF_DAMAGE': {
        id: 'FX_SELF_DAMAGE',
        emitters: [
            flash('ASH_BLOOD', 26, 0.22),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 4, ramp: 'ASH_BLOOD' }, count: [4, 6], lifetime: [0.4, 0.6], delay: 0, size: 4,
                shape: 'BURST_DIR', speed: [100, 220], vz: [120, 260], gravity: 1800, partAnim: { fadeOut: 0.4 } }),
            puff('CHAR', 14, [2, 3], [0.5, 0.8], 0.5),
        ],
    },

    // 回魔：秘藍柔光＋上飄光點（同治療的結構，色階 LION_ARCANE）
    'FX_MANA_RESTORE': {
        id: 'FX_MANA_RESTORE',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 30, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.4, delay: 0, size: 30,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeOut: 0.7, alpha: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 3, ramp: 'LION_ARCANE', hard: true }, count: [6, 8], lifetime: [0.45, 0.7], delay: 0, size: 3,
                shape: 'CIRCLE', shapeRadius: 16, speed: [10, 30], vz: [90, 160], drag: 0.06, partAnim: { fadeIn: 0.1, fadeOut: 0.6 } }),
        ],
    },

    // 擊退／突進的地面塵（AgentVFXSystem；原本借用 FX_STATUS_ROOT_LOOP 的 DUST）
    'FX_KNOCKBACK_DUST': {
        id: 'FX_KNOCKBACK_DUST',
        emitters: [
            puff('DUST', 10, [2, 3], [0.35, 0.55], 0.45, 0),
        ],
    },

    // 燒魔（DAMAGE text=BURN，sr_a4）：虛紫一閃＋六道光芒＋紫色火星（原 SHOCKWAVE＋SPARK）
    'FX_MANA_BURN': {
        id: 'FX_MANA_BURN',
        emitters: [
            flash('ASH_VOID', 24, 0.22),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 34, count: 6, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.28, delay: 0, size: 34,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            spray('ASH_VOID', [4, 6], [100, 200], [0.25, 0.4], 3),
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

/**
 * 奧義 HEAVEN_FALL（style METEOR）的隕石：SequenceSystem 直接生成兩顆同步自由落體的 PART_DEBRIS
 * （岩塊在下層、光暈在上層），因為落下時間由每個奧義的高度決定，無法寫成固定壽命的登記資產。
 * 尺寸以粒子 size（原 ROCK 看板大小）的比例給出；色階依施法者陣營。
 */
export const METEOR_PARTS: Record<Team, { rockRamp: VFXRampId; glowRamp: VFXRampId }> = {
    [Team.BLUE]: { rockRamp: 'LION_HOLY', glowRamp: 'LION_HOLY' },
    [Team.RED]: { rockRamp: 'ASH_PHYSICAL', glowRamp: 'ASH_FIRE' },
};
/**
 * 死亡碎裂（UnitShatter）的零件動畫與尺寸比例：粒子仍由 UnitShatter 逐顆生成（保留受擊方向噴濺與預算降階），
 * 外形換成零件；色階來自 factionSkin 的 death.ramps。
 */
export const DEATH_PARTS = {
    /** 塵煙：smoke 半徑＝粒子 size × PUFF_RADIUS */
    PUFF_RADIUS: 0.5,
    PUFF_SEEDS: 3,
    PUFF_ANIM: { scaleFrom: 0.6, scaleTo: 1.4, fadeIn: 0.15, fadeOut: 0.6, alpha: 0.55 },
    /** 火花：hard glow 半徑＝粒子 size */
    SPARK_ANIM: { fadeOut: 0.6 },
    /** 靈魂光（SPIRIT_RISE）：柔光上升 */
    SOUL_RADIUS: 36,
    SOUL_ANIM: { scaleFrom: 0.7, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 },
    /** 血滴（BLOOD_SPRAY）：droplet 大小＝粒子 size */
    BLOOD_ANIM: { fadeOut: 0.4 },
} as const;

/** 施法者已不存在（查不到陣營）時的隕石色階 */
export const METEOR_NEUTRAL: { rockRamp: VFXRampId; glowRamp: VFXRampId } = { rockRamp: 'STATUS_SLATE', glowRamp: 'STATUS_SLATE' };

export const METEOR_SIZE = {
    /** 岩塊 shard size（半徑）＝粒子 size × ROCK */
    ROCK: 0.32,
    /** 光暈半徑＝粒子 size × GLOW */
    GLOW: 0.5,
    /** 岩塊自轉速度範圍（rad/s） */
    SPIN: [-3, 3] as const,
    SEED: 5,
};
