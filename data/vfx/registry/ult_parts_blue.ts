import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { ULT_SEQUENCE, chargedImpactAt } from "../ult_visuals";

/** 充能式命中時刻（從詠唱開始起算） */
const HIT = ULT_SEQUENCE.CHARGED_HIT_AT;
/** wb_u1 雷核落地＝傷害時刻（詠唱結束＋落下時間） */
const WB_U1_IMPACT = chargedImpactAt('wb_u1');
/** wb_u1 雷核：顯形時刻與匯聚高度 */
const WB_U1_CORE = { APPEAR: 0.2, Z: 260 } as const;
const WB_U1_CORE_LIFE = WB_U1_IMPACT - WB_U1_CORE.APPEAR;
/** tb_u3 巨盾落地＝傷害時刻；巨盾顯形時刻、高空緩降高度、落地後插著的停留秒數 */
const TB_U3_IMPACT = chargedImpactAt('tb_u3');
const TB_U3_SHIELD = { APPEAR: 0.3, Z_START: 380, Z_CAST_END: 300, HOLD: 0.5 } as const;
const TB_U3_SHIELD_LIFE = TB_U3_IMPACT + TB_U3_SHIELD.HOLD - TB_U3_SHIELD.APPEAR;
/** rb_u1 冰稜破土＝傷害時刻（詠唱結束＋落下時間；這招沒有落下物） */
const RB_U1_IMPACT = chargedImpactAt('rb_u1');
/** rb_u3 神矢貫下＝傷害時刻；神矢顯形、聚光高度、落地後停留 */
const RB_U3_IMPACT = chargedImpactAt('rb_u3');
const RB_U3_ARROW = { APPEAR: 0.3, Z_START: 300, Z_CAST_END: 280, HOLD: 0.2 } as const;
const RB_U3_ARROW_LIFE = RB_U3_IMPACT + RB_U3_ARROW.HOLD - RB_U3_ARROW.APPEAR;
/** tb_u4 巨拳：顯形、抬起高度、命中後停留 */
const TB_U4_FIST = { APPEAR: 0.3, Z_START: 150, Z_TOP: 200, TOP_AT: 1.2, HOLD: 0.4 } as const;
const TB_U4_FIST_LIFE = HIT + TB_U4_FIST.HOLD - TB_U4_FIST.APPEAR;

// ==========================================
// 奧義特效（零件版）— 獅心（BLUE）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 獅心：金白、乾淨、對稱；日輪／獅盾紋章；環與碎片為正六角。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_BLUE: Record<string, VFXAsset> = {
    // tb_u3 絕對防禦（自身範圍 4 擊退，充能式天降：傷害＝TB_U3_IMPACT＝詠唱結束＋落下時間）：
    // 詠唱中獅盾紋章預告、巨型獅心光盾在高空顯形緩降 → 詠唱結束後砸落插地 → 衝擊環＋盾片往外震飛 → 光點
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: TB_U3_IMPACT + 0.6, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 巨盾：高空緩降 → 詠唱結束後加速砸落 → 插地停留（盾尖高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'towerShield', size: 150, ramp: 'LION_HOLY' }, count: 1, lifetime: TB_U3_SHIELD_LIFE, delay: TB_U3_SHIELD.APPEAR, size: 150, groundAnchored: true,
                partAnim: { fadeIn: 0.1, fadeOut: 0.15, rise: [
                    { at: 0, z: TB_U3_SHIELD.Z_START },
                    { at: (HIT - TB_U3_SHIELD.APPEAR) / TB_U3_SHIELD_LIFE, z: TB_U3_SHIELD.Z_CAST_END, ease: 'linear' },
                    { at: (TB_U3_IMPACT - TB_U3_SHIELD.APPEAR) / TB_U3_SHIELD_LIFE, z: 0, ease: 'in' },
                    { at: 1, z: 0 },
                ] } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: TB_U3_IMPACT, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中主爆發：衝擊環（範圍 4；128 * 1.6 * 1.4 = 286.7px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 128, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: TB_U3_IMPACT, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.6, fadeOut: 0.6 } }),
            // 盾片往外震飛
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, count: [8, 10], lifetime: [0.6, 0.8], delay: TB_U3_IMPACT, size: 8,
                shape: 'BURST_DIR', speed: [180, 360], vz: [250, 450], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [8, 10], lifetime: [0.6, 0.85], delay: [TB_U3_IMPACT + 0.1, TB_U3_IMPACT + 0.25], size: 8,
                shape: 'CIRCLE', shapeRadius: 90, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },
    // tb_u4 泰坦降臨（單體巨型重擊＋暈眩，充能式，命中 1.5 s）：金色能量巨拳在目標上空抬起蓄力 → 命中瞬間下壓 →
    // 地面放射裂紋＋單體衝擊環＋大塊碎石 → 塵土
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 0.8, scaleTo: 1, ease: 'linear', fadeIn: 0.08, fadeOut: 0.3 } }),
            // 巨拳：顯形後慢慢抬高蓄力 → 命中瞬間砸下 → 壓在地上停一下（拳面高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'fist', size: 96, ramp: 'LION_HOLY' }, count: 1, lifetime: TB_U4_FIST_LIFE, delay: TB_U4_FIST.APPEAR, size: 96, groundAnchored: true,
                partAnim: { fadeIn: 0.12, fadeOut: 0.2, rise: [
                    { at: 0, z: TB_U4_FIST.Z_START },
                    { at: (TB_U4_FIST.TOP_AT - TB_U4_FIST.APPEAR) / TB_U4_FIST_LIFE, z: TB_U4_FIST.Z_TOP },
                    { at: (HIT - TB_U4_FIST.APPEAR) / TB_U4_FIST_LIFE, z: 0, ease: 'in' },
                    { at: 1, z: 0 },
                ] } }),
            // 放射裂紋（48 * 1.0 * 1.4 = 67.2px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 48, count: 7, ramp: 'LION_HOLY', lengthJitter: 0.6, seed: 5 }, count: 1, lifetime: 0.9, delay: HIT, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeOut: 0.6 } }),
            // 命中主爆發：單體衝擊環（24 * 1.6 * 1.4 = 53.8px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: HIT, size: 24,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.5 } }),
            // 大塊碎石
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 12, shape: 'rock', ramp: 'LION_PHYSICAL', seed: 2 }, count: 6, lifetime: [0.7, 0.9], delay: HIT, size: 12,
                shape: 'BURST_DIR', speed: [180, 360], vz: [200, 380], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'DUST', seed: 3 }, count: [3, 4], lifetime: [0.7, 0.9], delay: [HIT + 0.05, HIT + 0.15], size: 32,
                shape: 'CIRCLE', shapeRadius: 36, speed: [20, 40], vz: [10, 30], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.6 } }),
        ],
    },
    // wb_u1 雷霆之怒（範圍 3 暈眩，充能式天降：傷害＝WB_U1_IMPACT＝詠唱結束＋落下時間）：
    // 詠唱中分叉聖雷一道道劈向目標上空的匯聚點、雷核漸大 → 詠唱結束後雷核砸落 →
    // 落地：主雷劈下、衝擊環擴張、電火花沿地面四竄。雷核由資產自己畫（ownFallObject），不掉共用岩塊。
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            // 落點日輪印記：整段詠唱到落地後淡出（64 * 1.0 * 1.4 = 89.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_LIGHTNING' }, count: 1, lifetime: WB_U1_IMPACT + 0.8, delay: 0, size: 64, vRotation: 0.6,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.08, fadeOut: 0.25 } }),
            // 匯聚聖雷：短促分叉雷從上方劈進匯聚點（雷的底端＝rise 高度）
            part({ particleType: 'PART', part: { kind: 'bolt', length: 128, branches: 2, ramp: 'LION_LIGHTNING', seed: 3 }, count: 5, lifetime: 0.14, delay: [0.25, 1.4], size: 64, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 12, partAnim: { fadeOut: 0.5, rise: [{ at: 0, z: WB_U1_CORE.Z }] } }),
            // 雷核：在匯聚點漸大，詠唱結束後加速砸落，落地那一刻消失
            part({ particleType: 'PART', part: { kind: 'glow', radius: 28, ramp: 'LION_LIGHTNING', hard: true }, count: 1, lifetime: WB_U1_CORE_LIFE, delay: WB_U1_CORE.APPEAR, size: 28, groundAnchored: true,
                partAnim: { scaleFrom: 0.3, scaleTo: 1, ease: 'linear', fadeIn: 0.1, rise: [
                    { at: 0, z: WB_U1_CORE.Z },
                    { at: (HIT - WB_U1_CORE.APPEAR) / WB_U1_CORE_LIFE, z: WB_U1_CORE.Z, ease: 'linear' },
                    { at: 1, z: 0, ease: 'in' },
                ] } }),
            // 落地主雷
            part({ particleType: 'PART', part: { kind: 'bolt', length: 320, branches: 3, ramp: 'LION_LIGHTNING', seed: 4 }, count: 1, lifetime: 0.3, delay: WB_U1_IMPACT, size: 160, groundAnchored: true,
                partAnim: { fadeOut: 0.5 } }),
            // 命中主爆發：衝擊環（範圍 3；96 * 1.6 * 1.4 = 215px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 96, thickness: 10, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.55, delay: WB_U1_IMPACT, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.6 } }),
            // 電火花沿地面四竄
            part({ particleType: 'PART', part: { kind: 'spark', length: 18, ramp: 'LION_LIGHTNING' }, count: 12, lifetime: [0.3, 0.5], delay: [WB_U1_IMPACT, WB_U1_IMPACT + 0.1], size: 18,
                shape: 'BURST_DIR', speed: [250, 500], vz: [20, 120], drag: 0.05, partAnim: { fadeOut: 0.5 } }),
        ],
    },

    // wb_u2 破曉聖擊（自身範圍 4，充能式，命中 1.5 s）：詠唱中地面曙光暈開、旭日從地平線升起 →
    // 命中：日輪斬面貼地高速掃出＋衝擊環＋日芒 → 光點緩緩上浮
    'FX_ULT_BLUE_DAYBREAK': {
        id: 'FX_ULT_BLUE_DAYBREAK',
        emitters: [
            // 曙光：柔光環在地面慢慢暈開
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 24, ramp: 'LION_HOLY', soft: true }, count: 1, lifetime: 1.6, delay: 0.05, size: 64,
                partAnim: { scaleFrom: 0.4, scaleTo: 1, ease: 'linear', fadeIn: 0.2, fadeOut: 0.2, alpha: 0.7 } }),
            // 旭日：柔光球從地面升起
            part({ particleType: 'PART', part: { kind: 'glow', radius: 36, ramp: 'LION_HOLY' }, count: 1, lifetime: 1.55, delay: 0.1, size: 36, groundAnchored: true,
                partAnim: { scaleFrom: 0.4, scaleTo: 1, ease: 'linear', fadeIn: 0.2, fadeOut: 0.15, rise: [{ at: 0, z: 0 }, { at: 1, z: 80 }] } }),
            // 命中：日芒在旭日的位置綻開
            part({ particleType: 'PART', part: { kind: 'rays', radius: 112, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: HIT, size: 112, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.6, alpha: 0.85, rotation: 0.2, rise: [{ at: 0, z: 80 }] } }),
            // 日輪斬面：貼地的大弧刃高速旋轉掃出（112 * 1.5 * 1.4 = 235px）
            part({ particleType: 'PART_GROUND', part: { kind: 'slashArc', radius: 112, arcDeg: 300, thickness: 18, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: HIT, size: 112, vRotation: 14,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.5, fadeOut: 0.5 } }),
            // 命中主爆發：衝擊環（範圍 4；120 * 1.5 * 1.4 = 252px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 120, thickness: 10, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: HIT, size: 120,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.5, fadeOut: 0.6 } }),
            // 光點上浮（餘韻）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_HOLY', hard: true }, count: 12, lifetime: [0.6, 0.9], delay: [HIT + 0.1, HIT + 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 130, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // sb_u4 神之怒火（自身範圍 4 轟炸）：日輪法陣 → 三道天罰光柱依序落下＋閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_WRATH': {
        id: 'FX_ULT_BLUE_WRATH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 112, vRotation: -0.4,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 224, ramp: 'LION_HOLY' }, count: 3, lifetime: 0.55, delay: [0.15, 0.25], size: 48, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 80, partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 4 擴張環（128 * 1.8 * 1.4 = 322.6px，落於 232.8～432.3px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 14], lifetime: [0.8, 1.1], delay: [0.35, 0.55], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u1 聖光結界（自身範圍 3 暈眩，充能式，命中 1.5 s）：六面獅心光盾沿六角環依序立起 →
    // 合圍：六向鎮壓光芒貼地射出＋衝擊環＋小閃 → 光點
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 96, vRotation: 0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.3 } }),
            // 光盾：六面依序從地面立起（盾尖貼地，縮放＝長高）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'towerShield', size: 64, ramp: 'LION_HOLY' }, count: 6, lifetime: 1.2, delay: [0.3, 0.75], size: 64, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.25 } }),
            // 六向鎮壓：貼地六道光芒
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 112, count: 6, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: HIT, size: 112,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: HIT, size: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中主爆發：衝擊環（範圍 3；96 * 1.6 * 1.4 = 215px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 96, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: HIT, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.7, 1.0], delay: [HIT + 0.1, HIT + 0.35], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u1 極地冰河（單體凍結，充能式天降時序：傷害＝RB_U1_IMPACT＝詠唱結束＋落下時間，玩法不變；這招沒有落下物）：
    // 等待期間霜裂紋從目標腳下往外蔓延 → 傷害那一刻前後錯落的冰稜破土而出＋冰環＋冰屑
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_ICE' }, count: 1, lifetime: RB_U1_IMPACT + 0.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 霜裂紋往外蔓延（48 * 1.0 * 1.4 = 67.2px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 48, count: 9, ramp: 'LION_ICE', lengthJitter: 0.6, seed: 6 }, count: 1, lifetime: RB_U1_IMPACT + 0.5 - 0.4, delay: 0.4, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.2, alpha: 0.85 } }),
            // 主冰稜：中央三根高的
            part({ particleType: 'PART', part: { kind: 'prism', radius: 14, height: 64, ramp: 'LION_ICE', style: 'solid' }, count: 3, lifetime: 0.9, delay: RB_U1_IMPACT, size: 14, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 14, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeOut: 0.35 } }),
            // 外圈矮冰脊：稍晚一點破土（前後錯落）
            part({ particleType: 'PART', part: { kind: 'prism', radius: 12, height: 36, ramp: 'LION_ICE', style: 'solid' }, count: 5, lifetime: 0.8, delay: [RB_U1_IMPACT + 0.03, RB_U1_IMPACT + 0.12], size: 12, groundAnchored: true,
                shape: 'RING', shapeRadius: 40, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeOut: 0.35 } }),
            // 命中主爆發：單體冰環（32 * 1.5 * 1.4 = 67.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_ICE' }, count: 1, lifetime: 0.5, delay: RB_U1_IMPACT, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.5, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'crystal', ramp: 'LION_ICE' }, count: 8, lifetime: [0.5, 0.7], delay: RB_U1_IMPACT, size: 6,
                shape: 'BURST_DIR', speed: [120, 260], vz: [200, 360], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
        ],
    },

    // rb_u3 穿日神矢（單體毀滅，充能式天降：傷害＝RB_U3_IMPACT＝詠唱結束＋落下時間）：
    // 詠唱中光點聚向目標上空、巨型神矢在高處聚光成形 → 詠唱結束後筆直貫下 → 狹長穿孔光痕＋單體環＋碎晶
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_LIGHTNING' }, count: 1, lifetime: RB_U3_IMPACT + 0.4, delay: 0, size: 36, vRotation: 0.6,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 光點聚向神矢
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'LION_LIGHTNING', hard: true }, count: 10, lifetime: 0.6, delay: [0.2, 1.2], size: 5, groundAnchored: true,
                shape: 'RING', shapeRadius: 70, speed: -110, partAnim: { fadeIn: 0.2, fadeOut: 0.15, rise: [{ at: 0, z: 220 }, { at: 1, z: 280 }] } }),
            // 神矢：高處聚光 → 詠唱結束後筆直貫下（矢尖高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'arrow', size: 120, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: RB_U3_ARROW_LIFE, delay: RB_U3_ARROW.APPEAR, size: 120, groundAnchored: true,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.15, rise: [
                    { at: 0, z: RB_U3_ARROW.Z_START },
                    { at: (HIT - RB_U3_ARROW.APPEAR) / RB_U3_ARROW_LIFE, z: RB_U3_ARROW.Z_CAST_END, ease: 'linear' },
                    { at: (RB_U3_IMPACT - RB_U3_ARROW.APPEAR) / RB_U3_ARROW_LIFE, z: 0, ease: 'in' },
                    { at: 1, z: 0 },
                ] } }),
            // 穿孔光痕：狹長細光柱，留一下再收
            part({ particleType: 'PART', part: { kind: 'pillar', width: 12, height: 256, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.7, delay: RB_U3_IMPACT, size: 12, groundAnchored: true,
                partAnim: { scaleFrom: 1, scaleTo: 0.6, fadeOut: 0.6 } }),
            // 命中主爆發：單體環（32 * 1.5 * 1.4 = 67.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.5, delay: RB_U3_IMPACT, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.5, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'hex', ramp: 'LION_LIGHTNING' }, count: 6, lifetime: [0.5, 0.7], delay: RB_U3_IMPACT, size: 6,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
        ],
    },

    // mb_u1 奧術漩渦（範圍 3 牽引，充能式，hit＝ULT_SEQUENCE.CHARGED_HIT_AT 1.5 s）：
    // 詠唱期間螺旋吸積帶在目標地面成形、一邊旋轉一邊往內收，碎晶被吸進去，上空多面奇點從小長大 →
    // 1.5 s 命中（傷害＋牽引）：大亮環向內壓縮、內圈快轉吸積帶收進奇點 → 約 2.6 s 奇點坍縮放出衝擊環。
    // 魔法能量體（ULT-V01 美術方向）：奇點是半透明多面能量核＋亮邊，不是黑煙球；吸積帶是彎曲光帶，不是直線放射。
    // 吸積帶與壓縮環只畫牽引的實際作用（向心），範圍不超過 3 格（C6）。
    'FX_ULT_BLUE_BLACKHOLE': {
        id: 'FX_ULT_BLUE_BLACKHOLE',
        emitters: [
            // 吸積盤（0.1–2.7 s）：三條彎曲光帶，負 vRotation＝往內流，整盤由 1.25 收到 0.45（120 * 1.25 * 1.4 = 210px）
            part({ particleType: 'PART_GROUND', part: { kind: 'spiral', radius: 120, arms: 3, turns: 0.75, thickness: 22, ramp: 'LION_VOID' }, count: 1, lifetime: 2.6, delay: 0.1, size: 120, vRotation: -2.2,
                partAnim: { scaleFrom: 1.25, scaleTo: 0.45, ease: 'linear', fadeIn: 0.3, fadeOut: 0.2 } }),
            // 向心碎晶：整段詠唱往中心掉
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_VOID' }, count: [14, 18], lifetime: [0.45, 0.6], delay: [0.05, 1.6], size: 8,
                shape: 'CIRCLE', shapeRadius: 150, speed: [-320, -240], vRotation: [-6, 6], partAnim: { fadeIn: 0.25, fadeOut: 0.25 } }),
            // 多面奇點（0.2–2.75 s）：懸在目標上空，從 0.25 長到全尺寸，坍縮時快速淡出
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'singularity', size: 64, ramp: 'ASH_VOID' }, count: 1, lifetime: 2.55, delay: 0.2, size: 64, vRotation: 0.6, groundAnchored: true,
                partAnim: { scaleFrom: 0.25, scaleTo: 1, fadeIn: 0.2, fadeOut: 0.12, rise: [{ at: 0, z: 100 }] } }),
            // 命中主爆發（1.5 s）：亮環向內壓縮（半徑最大的 ring，C2；120 * 1.2 * 1.4 = 201.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 120, thickness: 10, ramp: 'LION_VOID' }, count: 1, lifetime: 0.35, delay: 1.5, size: 120,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.25, ease: 'in', fadeOut: 0.3 } }),
            // 內圈快轉吸積帶（1.4–2.6 s）：命中後更緊更快地收進奇點
            part({ particleType: 'PART_GROUND', part: { kind: 'spiral', radius: 80, arms: 4, turns: 1, thickness: 12, ramp: 'LION_VOID' }, count: 1, lifetime: 1.2, delay: 1.4, size: 80, vRotation: -5,
                partAnim: { scaleFrom: 1.1, scaleTo: 0.3, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 坍縮（2.6 s）：奇點消失時放出擴張衝擊環（C7；64 * 1.3 * 1.4 = 116.5px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.3, delay: 2.6, size: 64,
                partAnim: { scaleFrom: 0.2, scaleTo: 1.3, fadeOut: 0.6 } }),
        ],
    },

    // mb_u2 絕對零度（範圍 4 凍結，充能式，命中 1.5 s）：詠唱中霜紋螺旋從邊界往中心收、冰晶沿地面滑向中心 →
    // 命中：六角冰殼成形＋擴張冰環＋冰屑 → 冰霧
    'FX_ULT_BLUE_ABSOLUTE_ZERO': {
        id: 'FX_ULT_BLUE_ABSOLUTE_ZERO',
        emitters: [
            // 霜紋：六條細霜線慢慢旋進中心（120 * 1.3 * 1.4 = 218px）
            part({ particleType: 'PART_GROUND', part: { kind: 'spiral', radius: 120, arms: 6, turns: 0.25, thickness: 8, ramp: 'LION_ICE' }, count: 1, lifetime: 1.6, delay: 0.05, size: 120, vRotation: -0.8,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.45, ease: 'linear', fadeIn: 0.2, fadeOut: 0.15, alpha: 0.85 } }),
            // 冰晶沿地面滑向中心
            part({ particleType: 'PART', part: { kind: 'shard', size: 10, shape: 'crystal', ramp: 'LION_ICE' }, count: 12, lifetime: 0.7, delay: [0.2, 1.2], size: 10, groundAnchored: true,
                shape: 'RING', shapeRadius: 150, speed: -90, partAnim: { fadeIn: 0.2, fadeOut: 0.2 } }),
            // 冰封殼：命中時六角冰殼收進來定住
            part({ particleType: 'PART', part: { kind: 'prism', radius: 64, height: 48, ramp: 'LION_ICE', style: 'glass' }, count: 1, lifetime: 0.9, delay: HIT, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.35 } }),
            // 命中主爆發：冰環（範圍 4；128 * 1.5 * 1.4 = 268.8px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 128, thickness: 10, ramp: 'LION_ICE' }, count: 1, lifetime: 0.5, delay: HIT, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.5, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'LION_ICE' }, count: 8, lifetime: [0.5, 0.7], delay: HIT, size: 8,
                shape: 'BURST_DIR', speed: [150, 300], vz: [180, 360], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            // 冰霧（餘韻）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'STEEL', seed: 4 }, count: 3, lifetime: 0.9, delay: HIT + 0.05, size: 32,
                shape: 'CIRCLE', shapeRadius: 60, speed: [15, 30], vz: [10, 25], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.4 } }),
        ],
    },

    // sb_u2 復活之光（自身範圍 6 治療，HEAVEN_FALL）：日輪法陣 → 重生光柱落下＋核心閃光＋柔和光環 → 大量光點上升
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.05, delay: 0, size: 64, vRotation: 0.3,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 288, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.1, scaleTo: 0.9, fadeIn: 0.05, fadeOut: 0.5 } }),
            // 命中主爆發（glow radius 140 大於環，非擴張環；delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 140, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 140,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 範圍 6 柔和環（128 * 1.8 * 1.4 = 322.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [12, 14], lifetime: [0.6, 0.8], delay: [0.35, 0.45], size: 8,
                shape: 'CIRCLE', shapeRadius: 140, speed: [5, 20], vz: [60, 120], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u2 王者之風（全場嘲諷＋護盾，無傷害，充能式，生效 1.5 s）：獅盾紋章展開、冠冕從施法者頭上升起 →
    // 生效：冠冕一閃＋王令波紋一圈圈往外傳＋護盾碎光從各處上浮（增益：主爆發是冠冕的空中光，不是擴張衝擊環）
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.3 } }),
            // 冠冕升起並停在頭頂上方
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'crown', size: 56, ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.7 - 0.2, delay: 0.2, size: 56, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.25, rise: [{ at: 0, z: 40 }, { at: (HIT - 0.2) / (HIT + 0.5), z: 120 }, { at: 1, z: 130, ease: 'linear' }] } }),
            // 生效主爆發：冠冕的光（柔光，在冠冕高度）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 72, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: HIT, size: 72, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7, alpha: 0.7, rise: [{ at: 0, z: 120 }] } }),
            // 王令波紋：三道柔光環一圈圈往外傳
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_HOLY', soft: true }, count: 3, lifetime: 0.8, delay: [HIT, HIT + 0.45], size: 64,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            // 護盾回應：碎光從各處上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'shard', size: 6, shape: 'hex', ramp: 'LION_HOLY' }, count: [10, 12], lifetime: [0.8, 1.1], delay: [HIT + 0.15, HIT + 0.5], size: 6,
                shape: 'CIRCLE', shapeRadius: 140, speed: [5, 20], vz: [50, 100], drag: 0.02, vRotation: [-3, 3], partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u5 鋼鐵長城（全隊護盾，無傷害，充能式，生效 1.5 s）：六座六角稜柱城垛沿六角環依序升起 →
    // 生效：城牆輪廓合攏（靜止環）＋碎光往四周分給友軍
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_ARCANE' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 112, vRotation: -0.3,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.3 } }),
            // 城垛：六座玻璃稜柱依序升起（底面錨點，縮放＝升起）
            part({ particleType: 'PART', part: { kind: 'prism', radius: 22, height: 40, ramp: 'LION_ARCANE', style: 'glass' }, count: 6, lifetime: 1.0, delay: [0.3, 1.0], size: 22, groundAnchored: true,
                shape: 'RING', shapeRadius: 90, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 生效主爆發：城牆輪廓合攏（靜止的六角環）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 100, thickness: 8, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.6, delay: HIT, size: 100,
                partAnim: { fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.4, delay: HIT, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            // 分給友軍：碎光往四周飛出並上浮（vz > 0）
            part({ particleType: 'PART', part: { kind: 'shard', size: 6, shape: 'hex', ramp: 'LION_ARCANE' }, count: 10, lifetime: [0.6, 0.9], delay: [HIT + 0.05, HIT + 0.2], size: 6,
                shape: 'BURST_DIR', speed: [200, 400], vz: [60, 140], drag: 0.03, vRotation: [-6, 6], partAnim: { fadeOut: 0.5 } }),
        ],
    },

    // rb_u4 六芒封鎖（範圍 4 禁錮，充能式，命中 1.5 s）：六枚稜晶錨點由外往內拉近、六芒星鎖紋收合 →
    // 命中：錨點升起光柵＋衝擊環＋小閃
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 錨點：六枚稜晶由外圈往內拉近
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'crystal', ramp: 'LION_ARCANE' }, count: 6, lifetime: HIT - 0.1, delay: 0.1, size: 16, groundAnchored: true,
                shape: 'RING', shapeRadius: 140, speed: -40 / (HIT - 0.1), vRotation: 2, partAnim: { fadeIn: 0.15, rise: [{ at: 0, z: 20 }] } }),
            // 鎖紋：六芒星（法陣內層）從大收到範圍邊界
            part({ particleType: 'PART_GROUND', part: { kind: 'magicCircle', radius: 100, ramp: 'LION_ARCANE', layer: 'inner', style: 'LION', seed: 5 }, count: 1, lifetime: HIT + 0.4 - 0.5, delay: 0.5, size: 100,
                partAnim: { scaleFrom: 1.6, scaleTo: 1, ease: 'in', fadeIn: 0.15, fadeOut: 0.3 } }),
            // 光柵：錨點位置升起細光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 16, height: 120, ramp: 'LION_ARCANE' }, count: 6, lifetime: 0.8, delay: HIT, size: 16, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.4 } }),
            // 命中主爆發：衝擊環（範圍 4；128 * 1.6 * 1.4 = 286.7px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 128, thickness: 10, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.7, delay: HIT, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.6, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 40, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.4, delay: HIT, size: 40,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
        ],
    },

    // mb_u3 時間停止（全場靜止，控制無傷害，充能式，生效 1.5 s）：六角刻度盤整段詠唱高速旋轉 →
    // 生效：轉盤戛然停住（換成靜止的盤；旋轉量是 1/8 圈的整數倍，換盤時日輪圖樣對得上）、外環往內一縮、懸浮碎片減速定格。
    // 不畫打擊（沒有傷害）：主爆發是收縮環，不是向外擴張的衝擊環（C7）。
    'FX_ULT_BLUE_TIMESTOP': {
        id: 'FX_ULT_BLUE_TIMESTOP',
        emitters: [
            // 旋轉刻度盤（0.1～1.5 s 轉 6/8 圈）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT - 0.1, delay: 0.1, size: 128, vRotation: (Math.PI / 4) * 6 / (HIT - 0.1),
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.15 } }),
            // 內圈反轉
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT - 0.15, delay: 0.15, size: 64, vRotation: -(Math.PI / 4) * 10 / (HIT - 0.15),
                partAnim: { scaleFrom: 0.6, scaleTo: 1, ease: 'linear', fadeIn: 0.15 } }),
            // 停住的刻度盤（生效後靜止，慢慢淡出）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 128, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.0, delay: HIT, size: 128,
                partAnim: { fadeOut: 0.4, alpha: 0.9 } }),
            // 生效主爆發：外環往內一縮（140 * 1.25 * 1.4 = 245px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 140, thickness: 6, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: HIT, size: 140,
                partAnim: { scaleFrom: 1.25, scaleTo: 1, fadeOut: 0.6 } }),
            // 懸浮碎片：慢慢浮起、被阻力減速到幾乎定格（vz > 0）
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, count: 12, lifetime: [1.4, 1.8], delay: [0.3, 1.0], size: 8,
                shape: 'CIRCLE', shapeRadius: 140, vz: [40, 90], drag: 0.05, vRotation: [-0.5, 0.5], partAnim: { fadeIn: 0.15, fadeOut: 0.25 } }),
        ],
    },

    // sb_u1 神聖干涉（單體無敵）：小型獅盾法陣 → 窄光柱＋六角護盾碎片環繞＋閃光 → 光點
    'FX_ULT_BLUE_INTERVENTION': {
        id: 'FX_ULT_BLUE_INTERVENTION',
        emitters: [
            // 起手：小型獅盾法陣（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.5, delay: 0, size: 36, vRotation: 0.5,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 36, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0.25, size: 36, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中主爆發（glow radius 64 大於環，非擴張環）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.25, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'shard', size: 16, shape: 'hex', ramp: 'LION_HOLY' }, count: 6, lifetime: 1.0, delay: 0.3, size: 16,
                shape: 'RING', shapeRadius: 30, vz: [30, 50], vRotation: [-2, 2], partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 單體非擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.27, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.6 } }),
        ],
    },
};
