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

// ==========================================
// 奧義特效（零件版）— 獅心（BLUE）
// 依 ult_parts.ts 的兩個樣板：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻，總長 ≤ 2 s。
// 獅心：金白、乾淨、對稱；日輪／獅盾紋章；環與碎片為正六角。
// HEAVEN_FALL 類（SkillSequences 先畫落體，命中時才播本特效）：落體本身就是起手，
// 所以這類的爆發在 delay 0，紋章改為命中後烙下的餘韻。
// ==========================================

export const ULT_PART_VFX_BLUE: Record<string, VFXAsset> = {
    // tb_u3 絕對防禦（天降神盾，HEAVEN_FALL，範圍 4）：起手神盾法陣預告 → 落地神盾衝擊＋光柱＋六角護盾碎片 → 光點上飄
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            // 起手：獅盾紋章（陣營紋章），在落點預告
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.1, delay: 0, size: 112, vRotation: 0.3,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 起手：天降神盾光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 80, height: 224, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.1, size: 80, groundAnchored: true,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.85, fadeOut: 0.6 } }),
            // 命中：落地主爆發（delay 0.3 與自由落體落地時刻對齊）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            // 六角護盾碎片向外彈開
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'hex', ramp: 'LION_HOLY' }, count: [8, 10], lifetime: [0.6, 0.8], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [180, 360], vz: [250, 450], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.6, 0.85], delay: [0.4, 0.55], size: 8,
                shape: 'CIRCLE', shapeRadius: 90, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // tb_u4 泰坦降臨（巨型重擊，單體）：日輪法陣快閃 → 金色重擊閃光＋放射＋衝擊環＋碎石 → 塵土
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.2, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.0, scaleTo: 1.0, fadeIn: 0.08, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 80, count: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.3, size: 80,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.0, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'LION_PHYSICAL', seed: 2 }, count: [8, 12], lifetime: [0.7, 0.9], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [250, 450], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'DUST', seed: 3 }, count: [3, 5], lifetime: [0.7, 0.9], delay: [0.35, 0.45], size: 32,
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
                partAnim: { scaleFrom: 0.3, scaleTo: 1.7, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u1 極地冰河（HEAVEN_FALL，單體）：日輪霜印 → 冰霜主爆發＋衝擊環＋碎冰飛散 → 冰塵餘韻
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            // 起手：日輪霜印（單體尺寸 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_ICE' }, count: 1, lifetime: 1.15, delay: 0, size: 36, vRotation: 0.2,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_ICE', hard: true }, count: 1, lifetime: 0.35, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中衝擊環（單體擴張環，半徑 32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_ICE' }, count: 1, lifetime: 0.45, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.6 } }),
            // 碎冰飛散
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'crystal', ramp: 'LION_ICE' }, count: [6, 8], lifetime: [0.5, 0.7], delay: 0.3, size: 6,
                shape: 'BURST_DIR', speed: [120, 260], vz: [150, 320], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
            // 餘韻冰塵
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_ICE', hard: true }, count: [6, 8], lifetime: [0.6, 0.8], delay: [0.35, 0.5], size: 4,
                shape: 'CIRCLE', shapeRadius: 30, speed: [5, 15], vz: [20, 50], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },

    // rb_u3 軌道轟炸／穿日神矢（HEAVEN_FALL，單體）：日輪自天貫下 → 細長聖光柱＋核心閃光＋衝擊環 → 光點
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            // 起手：日輪光印（單體尺寸 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.05, delay: 0, size: 36, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            // 命中：細長聖光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 48, height: 320, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.3, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.6, fadeOut: 0.6 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中衝擊環（單體擴張環，半徑 32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.6 } }),
            // 餘韻光點
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_HOLY', hard: true }, count: [6, 8], lifetime: [0.5, 0.7], delay: [0.35, 0.45], size: 4,
                shape: 'CIRCLE', shapeRadius: 30, speed: [10, 25], vz: [40, 80], drag: 0.02, partAnim: { fadeOut: 0.5 } }),
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
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
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
                partAnim: { scaleFrom: 0.4, scaleTo: 1.7, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_ARCANE', hard: true }, count: [10, 12], lifetime: [0.9, 1.2], delay: [0.5, 0.8], size: 8,
                shape: 'CIRCLE', shapeRadius: 100, speed: [5, 20], vz: [40, 90], drag: 0.02, partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // rb_u4 絕對封鎖（範圍 4 禁錮）：日輪法陣 → 六根細光柱沿六角環落下成牢籠＋擴張環 → 牢籠淡出
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.6, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.35 } }),
            part({ particleType: 'PART', part: { kind: 'pillar', width: 24, height: 224, ramp: 'LION_ARCANE' }, count: 6, lifetime: 1.0, delay: 0.25, size: 24, groundAnchored: true,
                shape: 'RING', shapeRadius: 100, partAnim: { scaleFrom: 1.3, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.35 } }),
            // 命中衝擊環：擴張環（範圍 4：128 * 1.8 * 1.4 = 322.6px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 10, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.7, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.45, delay: 0.3, size: 64,
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
