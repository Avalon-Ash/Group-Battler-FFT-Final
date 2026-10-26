import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { ULT_SEQUENCE, chargedImpactAt } from "../ult_visuals";

/** rr_u2 的命中時刻（充能式天降：詠唱結束＋落下時間，從資產開始起算）；彈頭在這一刻落地 */
const RR_U2_IMPACT = chargedImpactAt('rr_u2');
/** rr_u2 彈頭：顯形時刻與高度路徑（詠唱期間高空緩降，詠唱結束後加速落進印記） */
const RR_U2_WARHEAD = { APPEAR: 0.35, Z_START: 520, Z_CAST_END: 420 } as const;
const RR_U2_WARHEAD_LIFE = RR_U2_IMPACT - RR_U2_WARHEAD.APPEAR;
/** sr_u4 的生效時刻（充能式天降：詠唱結束＋落下時間；這招沒有落下物，月亮是升起的） */
const SR_U4_IMPACT = chargedImpactAt('sr_u4');
/** 充能式命中時刻（從詠唱開始起算） */
const HIT = ULT_SEQUENCE.CHARGED_HIT_AT;
/** tr_u1 斷頭刃落地＝傷害時刻；刃顯形時刻、懸起高度、落地後停留 */
const TR_U1_IMPACT = chargedImpactAt('tr_u1');
const TR_U1_BLADE = { APPEAR: 0.3, Z_HANG: 200, Z_CAST_END: 230, HOLD: 0.25 } as const;
const TR_U1_BLADE_LIFE = TR_U1_IMPACT + TR_U1_BLADE.HOLD - TR_U1_BLADE.APPEAR;
/** sr_u4 蝕月：升起起訖高度（月心距地面），詠唱結束時升到 Z_CAST_END，之後緩緩再升到 Z_END */
const SR_U4_MOON = { APPEAR: 0.1, Z_START: 40, Z_CAST_END: 200, Z_END: 210, TAIL: 0.9 } as const;
const SR_U4_MOON_LIFE = SR_U4_IMPACT + SR_U4_MOON.TAIL - SR_U4_MOON.APPEAR;

// ==========================================
// 奧義特效（零件版）— 灰燼（RED）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 灰燼：深紅／火／骨／深淵；角骷髏／倒三角紋章；衝擊環斷裂（roughness）。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_RED: Record<string, VFXAsset> = {
    // tr_u1 處決斷頭台（單體斬殺，充能式天降：傷害＝TR_U1_IMPACT＝詠唱結束＋落下時間）：
    // 詠唱中厚重斜刃懸在目標上方慢慢升起 → 詠唱結束後垂直急墜 → 直劈血痕＋血環＋血滴 → 倒三角烙印淡出
    'FX_ULT_RED_GUILLOTINE_IMPACT': {
        id: 'FX_ULT_RED_GUILLOTINE_IMPACT',
        emitters: [
            // 倒三角烙印（36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: TR_U1_IMPACT + 0.6, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 斷頭刃：懸起 → 急墜 → 落地停一下（刃底高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'guillotine', size: 96, ramp: 'ASH_BLOOD' }, count: 1, lifetime: TR_U1_BLADE_LIFE, delay: TR_U1_BLADE.APPEAR, size: 96, groundAnchored: true,
                partAnim: { fadeIn: 0.12, fadeOut: 0.12, rise: [
                    { at: 0, z: TR_U1_BLADE.Z_HANG },
                    { at: (HIT - TR_U1_BLADE.APPEAR) / TR_U1_BLADE_LIFE, z: TR_U1_BLADE.Z_CAST_END, ease: 'linear' },
                    { at: (TR_U1_IMPACT - TR_U1_BLADE.APPEAR) / TR_U1_BLADE_LIFE, z: 0, ease: 'in' },
                    { at: 1, z: 0 },
                ] } }),
            // 直劈血痕（垂直、短促）
            part({ particleType: 'PART', part: { kind: 'spark', length: 96, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.25, delay: TR_U1_IMPACT, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.6, rotation: Math.PI / 2 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 24, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.3, delay: TR_U1_IMPACT, size: 24,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中主爆發：單體血環（32 * 1.55 * 1.4 = 69.4px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'ASH_BLOOD', roughness: 1, seed: 23 }, count: 1, lifetime: 0.45, delay: TR_U1_IMPACT, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.55, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' }, count: [6, 8], lifetime: 0.8, delay: TR_U1_IMPACT, size: 5,
                shape: 'BURST_DIR', speed: [120, 250], vz: [120, 250], gravity: 2200, partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // tr_u4 永恆夢魘（自身範圍 8 全場恐懼，無傷害，充能式，生效 1.5 s）：地面暗影擴大、裂出多隻深淵之眼並睜開 →
    // 生效：眼中暗光一閃＋三道影爪掃過 → 黑煙從眼中上竄（控制：主爆發是空中暗光，不是擴張衝擊環）
    'FX_ULT_RED_NIGHTMARE': {
        id: 'FX_ULT_RED_NIGHTMARE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'hornSkull', ramp: 'ASH_VOID' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 128,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 地面暗影擴大（96 * 1.4 * 1.4 = 188px）
            part({ particleType: 'PART_GROUND', part: { kind: 'smoke', radius: 96, color: 'CHAR', roughness: 0.6, seed: 7 }, count: 1, lifetime: HIT + 0.6, delay: 0.1, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, ease: 'linear', fadeIn: 0.2, fadeOut: 0.3, alpha: 0.55 } }),
            // 深淵之眼：暗影裡依序睜開
            part({ particleType: 'PART_GROUND', part: { kind: 'construct', shape: 'eye', size: 40, ramp: 'ASH_VOID' }, count: 7, lifetime: 1.4, delay: [0.6, 1.2], size: 40,
                shape: 'CIRCLE', shapeRadius: 140, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 生效主爆發：暗光（柔光）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 72, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: HIT, size: 72,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7, alpha: 0.75 } }),
            // 三道影爪掃過
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 96, arcDeg: 120, thickness: 14, ramp: 'ASH_VOID' }, count: 3, lifetime: 0.35, delay: [HIT, HIT + 0.12], size: 96,
                shape: 'CIRCLE', shapeRadius: 40, vRotation: [-3, 3], partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            // 黑煙從眼中上竄（vz > 0）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 24, color: 'CHAR', roughness: 1, seed: 17 }, count: 6, lifetime: [0.7, 0.9], delay: [HIT + 0.05, HIT + 0.3], size: 24,
                shape: 'CIRCLE', shapeRadius: 140, vz: [60, 120], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeIn: 0.15, fadeOut: 0.5, alpha: 0.7 } }),
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
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 4 }, count: [10, 14], lifetime: [0.9, 1.3], delay: 0.25, size: 10,
                shape: 'BURST_DIR', speed: [250, 550], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 48, color: 'DUST', roughness: 1, seed: 8 }, count: [4, 5], lifetime: [1.0, 1.3], delay: [0.35, 0.5], size: 48,
                shape: 'CIRCLE', shapeRadius: 70, speed: [20, 50], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },

    // mr_u1 毀滅隕石（HEAVEN_FALL，範圍 2）：落地印記預告 → 火光爆閃＋擴張衝擊環＋碎石＋焦痕與零星餘燼收斂
    'FX_ULT_RED_METEOR_IMPACT': {
        id: 'FX_ULT_RED_METEOR_IMPACT',
        emitters: [
            // 落點預告印記（delay 0 < burstTime 0.3，滿足 C3 起手；size 48 * 1.0 * 2.0 = 96px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.6, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.8, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 命中主爆發（glow radius 112 大於環，delay 0.3 對齊 hitAt 0.8944）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 112, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 112,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 範圍 2 擴張衝擊環（size 56 * 1.5 * 2.0 = 168.0px，落於 116.4～216.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 56, thickness: 14, ramp: 'ASH_FIRE', roughness: 1, seed: 7 }, count: 1, lifetime: 0.5, delay: 0.3, size: 56,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.5, fadeOut: 0.5 } }),
            // 熔岩碎石飛散
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'ASH_FIRE', seed: 5 }, count: [5, 7], lifetime: [0.45, 0.65], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [250, 450], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            // 地面焦痕餘韻（收斂為暗黑灼痕）
            part({ particleType: 'PART_GROUND', part: { kind: 'smoke', radius: 48, color: 'CHAR', roughness: 1, seed: 9 }, count: 1, lifetime: 0.75, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.0, fadeIn: 0.05, fadeOut: 0.55, alpha: 0.85 } }),
            // 零星火星餘燼（命中後快速收斂）
            part({ particleType: 'PART', part: { kind: 'spark', length: 6, ramp: 'ASH_FIRE' }, count: [4, 6], lifetime: [0.35, 0.55], delay: [0.35, 0.45], size: 6,
                shape: 'CIRCLE', shapeRadius: 25, speed: [10, 25], vz: [15, 35], partAnim: { fadeOut: 0.4 } }),
        ],
    },

    // rr_u2 焦土衝擊（範圍 3 擊退，充能式天降，命中＝RR_U2_IMPACT＝詠唱結束＋落下時間，傷害同一刻）：
    // 詠唱中能量彈頭在高空顯形緩降（落點預警由遊戲的落點格顯示）→ 詠唱結束後加速落地 →
    // 命中：衝擊裙（擴張環）＋碎石 → 煙團粒子堆出蕈狀雲：慢的灰煙留成雲幹、快的焦黑煙團衝上去往外翻成蕈傘，蕈傘裡有火光。
    // 2026-10-26 使用者：構造體蕈狀雲太卡通，蕈狀雲用粒子與煙霧做（舊版做法）。不放大白光球（避免洗白）。
    // 蕈狀雲只是命中的視覺，不代表新增持續傷害；擊退範圍 3 格（C6）。
    // 煙的上升高度＝vz ÷ (60 × −ln(1 − drag))（VFXPhysics 的阻力每 1/60 秒乘一次）：雲幹約 20～95px、蕈傘約 120～145px（太高會衝出鏡頭上緣）。
    'FX_ULT_RED_NUKE_FLASH': {
        id: 'FX_ULT_RED_NUKE_FLASH',
        emitters: [
            // 能量彈頭：高空顯形緩降，詠唱結束（CHARGED_HIT_AT）後加速，命中那一刻落地消失（彈尖高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'warhead', size: 72, ramp: 'ASH_FIRE' }, count: 1, lifetime: RR_U2_WARHEAD_LIFE, delay: RR_U2_WARHEAD.APPEAR, size: 72, groundAnchored: true,
                partAnim: { fadeIn: 0.12, rise: [
                    { at: 0, z: RR_U2_WARHEAD.Z_START },
                    { at: (ULT_SEQUENCE.CHARGED_HIT_AT - RR_U2_WARHEAD.APPEAR) / RR_U2_WARHEAD_LIFE, z: RR_U2_WARHEAD.Z_CAST_END, ease: 'linear' },
                    { at: 1, z: 0, ease: 'in' },
                ] } }),
            // 命中主爆發：衝擊裙（範圍 3 擴張環；160 * 1.4 * 1.4 = 313.6px，上限 324.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 160, thickness: 24, ramp: 'ASH_FIRE', roughness: 1, seed: 8 }, count: 1, lifetime: 0.7, delay: RR_U2_IMPACT, size: 160,
                partAnim: { scaleFrom: 0.2, scaleTo: 1.4, fadeOut: 0.55 } }),
            // 雲幹：灰煙慢慢往上推，集中在中心一束
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 24, color: 'ASH', roughness: 0.6, seed: 3 }, count: 12, lifetime: [1.0, 1.2], delay: [RR_U2_IMPACT, RR_U2_IMPACT + 0.3], size: 24,
                shape: 'CIRCLE', shapeRadius: 10, speed: [0, 10], vz: [40, 250], drag: 0.04, vRotation: [-0.6, 0.6],
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeIn: 0.1, fadeOut: 0.45, alpha: 0.85 } }),
            // 蕈傘：焦黑煙團快速衝上去、被阻力停在高處並往外翻開，越來越大
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 44, color: 'CHAR', roughness: 0.8, seed: 12 }, count: 10, lifetime: [1.1, 1.3], delay: [RR_U2_IMPACT + 0.02, RR_U2_IMPACT + 0.12], size: 44,
                shape: 'CIRCLE', shapeRadius: 20, speed: [110, 190], vz: [260, 310], drag: 0.035, vRotation: [-1, 1],
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeIn: 0.08, fadeOut: 0.45, alpha: 0.75 } }),
            // 蕈傘裡的火光：跟煙團一起衝上去，從裡面照亮（加法光暈，先亮後收）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'ASH_FIRE', hard: true }, count: 6, lifetime: [0.8, 1.0], delay: [RR_U2_IMPACT + 0.04, RR_U2_IMPACT + 0.12], size: 40,
                shape: 'CIRCLE', shapeRadius: 16, speed: [60, 120], vz: [260, 310], drag: 0.035,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6, alpha: 0.9 } }),
            // 高飛碎石
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 6 }, count: [10, 12], lifetime: [0.7, 1.0], delay: RR_U2_IMPACT, size: 10,
                shape: 'BURST_DIR', speed: [350, 700], vz: [400, 800], gravity: 2600, vRotation: [-10, 10], partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // sr_u4 猩紅血月（全隊吸血＋持續回血，充能式天降時序：生效＝SR_U4_IMPACT＝詠唱結束＋落下時間，玩法不變）：
    // 詠唱中角骷髏法陣展開、多面蝕月從施法者頭頂升起（暗芯、左上月牙紅緣、日冕）→
    // 生效：月亮一閃、月華光點往下灑 → 血光滴從四周往上流回月亮。
    // 不是落石，序列不另生共用隕石（ownFallObject）；增益技：主爆發是空中的月閃，不是向外擴張的地面衝擊環（C7）。
    // 只畫既有的吸血與回血，不代表新增增益。
    'FX_ULT_RED_BLOOD_MOON': {
        id: 'FX_ULT_RED_BLOOD_MOON',
        emitters: [
            // 起手：角骷髏法陣，整段詠唱緩轉展開（64 * 1.0 * 1.4 = 89.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: SR_U4_IMPACT + 0.5, delay: 0, size: 64, vRotation: 0.25,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 多面蝕月：從頭頂升起（月心高度＝rise），詠唱結束時就定位
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'eclipse', size: 72, ramp: 'ASH_BLOOD' }, count: 1, lifetime: SR_U4_MOON_LIFE, delay: SR_U4_MOON.APPEAR, size: 72, vRotation: 0.15, groundAnchored: true,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.12, fadeOut: 0.2, rise: [
                    { at: 0, z: SR_U4_MOON.Z_START },
                    { at: (ULT_SEQUENCE.CHARGED_HIT_AT - SR_U4_MOON.APPEAR) / SR_U4_MOON_LIFE, z: SR_U4_MOON.Z_CAST_END },
                    { at: 1, z: SR_U4_MOON.Z_END, ease: 'linear' },
                ] } }),
            // 生效主爆發：月閃（空中柔光，不用硬芯以免洗白；半徑最大的 glow，C2）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 72, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.45, delay: SR_U4_IMPACT, size: 72, groundAnchored: true,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6, alpha: 0.6, rise: [{ at: 0, z: SR_U4_MOON.Z_CAST_END }] } }),
            // 月華：光點從月亮高度往下灑到地面
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'ASH_BLOOD', hard: true }, count: 14, lifetime: [0.6, 0.8], delay: [ULT_SEQUENCE.CHARGED_HIT_AT, SR_U4_IMPACT + 0.3], size: 5, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 140,
                partAnim: { fadeIn: 0.2, fadeOut: 0.3, rise: [{ at: 0, z: SR_U4_MOON.Z_CAST_END }, { at: 1, z: 0, ease: 'in' }] } }),
            // 血光上流：血滴從四周往上流回月亮（增益＝上升聚合，vz > 0）
            part({ particleType: 'PART', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [12, 14], lifetime: [0.7, 0.9], delay: [SR_U4_IMPACT, SR_U4_IMPACT + 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 150, speed: [-60, -20], vz: [160, 260], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.4 } }),
        ],
    },

    // tr_u3 不朽屍王（自身巨量護盾，無傷害，充能式，生效 1.5 s）：骨片從腳底往上攀爬、肋骨刺依序環繞鎖合 →
    // 生效：鎖環一收＋暗紅光 → 毒光上浮
    'FX_ULT_RED_UNDYING': {
        id: 'FX_ULT_RED_UNDYING',
        emitters: [
            // 倒三角法陣（36 * 1.2 * 1.4 = 60.5px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: HIT + 0.4, delay: 0, size: 36, vRotation: -0.5,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.3 } }),
            // 骨片沿身體往上攀爬
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: 8, lifetime: 0.6, delay: [0.2, 1.2], size: 8, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 18, vRotation: [-3, 3], partAnim: { fadeIn: 0.2, fadeOut: 0.2, rise: [{ at: 0, z: 0 }, { at: 1, z: 70 }] } }),
            // 肋骨刺依序環繞立起、鎖合
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'ribSpike', size: 48, ramp: 'ASH_PHYSICAL' }, count: 6, lifetime: 1.2, delay: [0.3, 1.2], size: 48, groundAnchored: true,
                shape: 'RING', shapeRadius: 26, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 生效主爆發：暗紅光
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: HIT, size: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            // 鎖環一收（32 * 1.4 * 1.4 = 62.7px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 6, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.5, delay: HIT, size: 32,
                partAnim: { scaleFrom: 1.4, scaleTo: 1, fadeOut: 0.6 } }),
            // 毒光上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'ASH_POISON', hard: true }, count: 8, lifetime: [0.6, 0.9], delay: [HIT + 0.05, HIT + 0.25], size: 5,
                shape: 'CIRCLE', shapeRadius: 24, vz: [50, 100], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },

    // tr_u5 鮮血之牆（自身範圍 4 群體護盾，無傷害，充能式，生效 1.5 s）：外圈血骨尖肋先立起、內圈再長出（由外往內）→
    // 生效：凝成血牆輪廓（收縮環）＋血光 → 血珠上浮
    'FX_ULT_RED_BLOOD_WALL': {
        id: 'FX_ULT_RED_BLOOD_WALL',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'hornSkull', ramp: 'ASH_BLOOD' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.3 } }),
            // 外圈尖肋
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'ribSpike', size: 72, ramp: 'ASH_BLOOD' }, count: 8, lifetime: 1.4, delay: [0.2, 0.7], size: 72, groundAnchored: true,
                shape: 'RING', shapeRadius: 120, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 內圈尖肋
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'ribSpike', size: 56, ramp: 'ASH_BLOOD' }, count: 6, lifetime: 1.1, delay: [0.7, 1.2], size: 56, groundAnchored: true,
                shape: 'RING', shapeRadius: 70, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 生效主爆發：血牆輪廓（收縮環，不是擴張衝擊環；112 * 1.2 * 1.4 = 188px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 112, thickness: 10, ramp: 'ASH_BLOOD', roughness: 0.5, seed: 24 }, count: 1, lifetime: 0.6, delay: HIT, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: HIT, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            // 血珠上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: 10, lifetime: [0.7, 1.0], delay: [HIT + 0.05, HIT + 0.3], size: 6,
                shape: 'CIRCLE', shapeRadius: 110, vz: [60, 120], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // sr_u2 鮮血契約（自身範圍 8 大補，施法者自損，充能式，生效 1.5 s）：詠唱中血珠從施法者身上螺旋抽出 →
    // 生效：血線往四周分流＋中心血花綻開＋血光 → 血珠從周圍回流上升（治療：主爆發不是向外擴張的地面衝擊環，C7）
    'FX_ULT_RED_BLOOD_PACT': {
        id: 'FX_ULT_RED_BLOOD_PACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 128, vRotation: 0.4,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.3 } }),
            // 施法者的血被抽出：血珠在身邊螺旋上升
            part({ particleType: 'PART', part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' }, count: 10, lifetime: 0.6, delay: [0.3, 1.3], size: 5,
                shape: 'CIRCLE', shapeRadius: 22, speed: [10, 25], vz: [60, 110], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.3 } }),
            // 生效主爆發：血光（柔光，不洗白）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 72, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.45, delay: HIT, size: 72,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7, alpha: 0.7 } }),
            // 血線分流：細血痕往四周射向隊友
            part({ particleType: 'PART', part: { kind: 'spark', length: 28, ramp: 'ASH_BLOOD' }, count: 10, lifetime: 0.4, delay: HIT, size: 28,
                shape: 'BURST_DIR', speed: [300, 500], vz: [10, 40], drag: 0.03, partAnim: { fadeOut: 0.5 } }),
            // 血花：中心綻開的五瓣血光螺旋
            part({ particleType: 'PART_GROUND', part: { kind: 'spiral', radius: 64, arms: 5, turns: 0.5, thickness: 14, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.9, delay: HIT, size: 64, vRotation: 1.2,
                partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            // 回流：血珠從周圍往上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' }, count: [10, 12], lifetime: [0.8, 1.1], delay: [HIT + 0.1, HIT + 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 150, speed: [5, 20], vz: [50, 100], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },

    // tr_u2 亡靈瘟疫（自身範圍 3 持續腐化，充能式，命中 1.5 s）：詠唱中腐蝕毒泡從地面冒起、膨脹後破掉 →
    // 命中：斷裂毒環擴張＋毒光＋低伏瘴氣由中心往外翻滾＋毒滴
    'FX_ULT_RED_PLAGUE': {
        id: 'FX_ULT_RED_PLAGUE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'hornSkull', ramp: 'ASH_POISON' }, count: 1, lifetime: HIT + 0.4, delay: 0, size: 96,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 毒泡：冒起、膨脹（ease in）後快速破掉
            part({ particleType: 'PART', part: { kind: 'glow', radius: 7, ramp: 'ASH_POISON', hard: true }, count: 12, lifetime: 0.5, delay: [0.2, 1.4], size: 7,
                shape: 'CIRCLE', shapeRadius: 100, vz: [20, 50], partAnim: { scaleFrom: 0.3, scaleTo: 1.6, ease: 'in', fadeIn: 0.2, fadeOut: 0.1 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'ASH_POISON' }, count: 1, lifetime: 0.35, delay: HIT, size: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            // 命中主爆發：斷裂毒環（範圍 3；64 * 1.7 * 1.4 = 152px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 14, ramp: 'ASH_POISON', roughness: 1, seed: 15 }, count: 1, lifetime: 0.6, delay: HIT, size: 64,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.7, fadeOut: 0.6 } }),
            // 低伏瘴氣往外翻滾
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 48, color: 'MIASMA', roughness: 1, seed: 12 }, count: 6, lifetime: [1.0, 1.2], delay: [HIT, HIT + 0.15], size: 48,
                shape: 'CIRCLE', shapeRadius: 30, speed: [80, 140], vz: [0, 10], drag: 0.02, partAnim: { scaleFrom: 0.5, scaleTo: 1.8, fadeIn: 0.15, fadeOut: 0.6, alpha: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_POISON' }, count: 6, lifetime: [0.5, 0.7], delay: HIT, size: 5,
                shape: 'CIRCLE', shapeRadius: 60, speed: [10, 40], vz: [150, 280], gravity: 1800, partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // mr_u3 虛空降臨（單體凝滯）：深淵倒三角法陣 → 核心暗光＋單體擴張暗環＋深淵碎晶
    'FX_ULT_RED_VOID_PORTAL': {
        id: 'FX_ULT_RED_VOID_PORTAL',
        emitters: [
            // 起手印記（delay 0 < burstTime 0.3，滿足 C3 起手；size 48 * 1.2 * 1.0 = 57.6 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.4, delay: 0, size: 48, vRotation: -0.8,
                partAnim: { scaleFrom: 1.2, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.35 } }),
            // 命中主爆發（glow radius 72 大於環，delay 0.3 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 72, ramp: 'ASH_VOID', hard: true }, count: 1, lifetime: 0.6, delay: 0.3, size: 72,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.2, fadeIn: 0.1, fadeOut: 0.5 } }),
            // 單體擴張環（size 36 * 1.8 * 1.0 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 36, thickness: 10, ramp: 'ASH_VOID', roughness: 1, seed: 16 }, count: 1, lifetime: 0.5, delay: 0.3, size: 36,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            // 深淵碎晶環繞
            part({ particleType: 'PART', part: { kind: 'shard', size: 14, shape: 'crystal', ramp: 'ASH_VOID' }, count: 4, lifetime: 0.9, delay: 0.35, size: 14,
                shape: 'RING', shapeRadius: 25, vz: [20, 40], vRotation: [-1, 1], partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
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
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 56, color: 'MIASMA', roughness: 1, seed: 12 }, count: [5, 6], lifetime: [1.1, 1.4], delay: [0.4, 0.6], size: 56,
                shape: 'CIRCLE', shapeRadius: 110, speed: [10, 30], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.6 } }),
        ],
    },

    // sr_u1 靈魂連結（自身範圍 4 群體禁錮＋沉默，充能式，命中 1.5 s）：詠唱中五個魂火錨點在範圍邊緣長出 →
    // 命中：鎖鏈環瞬間收緊＋錨點間暗紫鏈絲＋內圈衝擊 → 禁錮網紋留在地上
    'FX_ULT_RED_SOUL_WEB': {
        id: 'FX_ULT_RED_SOUL_WEB',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: HIT + 0.3, delay: 0, size: 112, vRotation: 0.5,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 魂錨：五團鬼火在邊緣長出
            part({ particleType: 'PART', part: { kind: 'flame', height: 48, ramp: 'ASH_VOID', jagged: true }, count: 5, lifetime: HIT + 0.2, delay: 0.2, size: 32, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 0.3, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.2 } }),
            // 命中主爆發：鎖鏈環瞬間收緊（96 * 2.0 * 1.4 = 268.8px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 96, thickness: 14, ramp: 'ASH_VOID', roughness: 1, seed: 18 }, count: 1, lifetime: 0.45, delay: HIT, size: 96,
                partAnim: { scaleFrom: 2.0, scaleTo: 0.7, fadeIn: 0.08, fadeOut: 0.45 } }),
            // 內圈禁錮衝擊（傷害：擴張貼地環）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 10, ramp: 'ASH_VOID', roughness: 1, seed: 19 }, count: 1, lifetime: 0.5, delay: HIT + 0.05, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.2, fadeIn: 0.08, fadeOut: 0.5 } }),
            // 鏈絲
            part({ particleType: 'PART', part: { kind: 'bolt', length: 140, branches: 1, ramp: 'ASH_VOID', seed: 5 }, count: 5, lifetime: 0.5, delay: [HIT, HIT + 0.1], size: 70, groundAnchored: true,
                shape: 'RING', shapeRadius: 90, partAnim: { fadeOut: 0.5 } }),
            // 禁錮網紋：灰燼法陣內圈留在地上
            part({ particleType: 'PART_GROUND', part: { kind: 'magicCircle', radius: 80, ramp: 'ASH_VOID', layer: 'inner', style: 'ASH', seed: 4 }, count: 1, lifetime: 0.9, delay: HIT + 0.05, size: 80,
                partAnim: { scaleFrom: 0.8, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5, alpha: 0.85 } }),
        ],
    },

    // sr_u5 惡靈附身（單體強化＋護盾，充能式，生效 1.5 s）：三道鬼影螺旋繞著目標轉、尾段收縮鑽進身體 →
    // 生效：鬼火升騰＋幽光上浮＋小鬼火環（增益：主爆發是空中柔光，不是擴張衝擊環）
    'FX_ULT_RED_POSSESSION': {
        id: 'FX_ULT_RED_POSSESSION',
        emitters: [
            // 印記（36 * 1.2 * 1.4 = 60.5px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_VOID' }, count: 1, lifetime: HIT + 0.3, delay: 0, size: 36, vRotation: 0.8,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.3 } }),
            // 三道鬼影：胸口高度的三臂螺旋快轉，尾段收縮鑽入
            part({ particleType: 'PART', part: { kind: 'spiral', radius: 40, arms: 3, turns: 0.5, thickness: 10, ramp: 'ASH_VOID' }, count: 1, lifetime: HIT - 0.3, delay: 0.3, size: 40, vRotation: 5, groundAnchored: true,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.3, ease: 'in', fadeIn: 0.15, rise: [{ at: 0, z: 45 }] } }),
            // 鬼火靈甲升騰
            part({ particleType: 'PART', part: { kind: 'flame', height: 112, ramp: 'ASH_VOID', jagged: true }, count: 2, lifetime: 0.85, delay: HIT, size: 56, groundAnchored: true,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.15, fadeOut: 0.45 } }),
            // 生效主爆發：幽光（柔光）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: HIT, size: 40,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 幽光上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'spark', length: 10, ramp: 'ASH_VOID' }, count: [6, 8], lifetime: [0.6, 0.9], delay: [HIT, HIT + 0.15], size: 10,
                shape: 'CIRCLE', shapeRadius: 20, speed: [-15, 15], vz: [70, 130], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
            // 小鬼火環（24 * 1.4 * 1.4 = 47px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'ASH_VOID', roughness: 1, seed: 19 }, count: 1, lifetime: 0.5, delay: HIT, size: 24,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
};
