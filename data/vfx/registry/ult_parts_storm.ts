import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { ULT_SEQUENCE } from "../ult_visuals";

/** 充能式命中時刻（從詠唱開始起算） */
const HIT = ULT_SEQUENCE.CHARGED_HIT_AT;

// ==========================================
// 奧義特效（零件版）— STORM 與 BEAM_SNIPE 類
// STORM：SkillSequences 會把同一效果在「同一點」重播 count 次（間隔 timing），
// 所以每個效果只是一次「小落點」（約 3～5 個粒子），散佈靠 emitter 內的 CIRCLE；
// 陣營紋章不放在落點裡（會疊 N 次），改由 ult_visuals 的 windupFx 只播一次。
// BEAM_SNIPE：光束本體是光束零件（beam_styles.ts → PartPainter.drawBeam），這裡只定義命中點。
// ==========================================

export const ULT_PART_VFX_STORM: Record<string, VFXAsset> = {
    // ---------- STORM 起手紋章（每次施放只播一次） ----------
    'FX_ULT_BLUE_STORM_SIGIL': {
        id: 'FX_ULT_BLUE_STORM_SIGIL',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.8, delay: 0, size: 112, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.3, alpha: 0.85 } }),
        ],
    },
    'FX_ULT_RED_STORM_SIGIL': {
        id: 'FX_ULT_RED_STORM_SIGIL',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 112, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 1.8, delay: 0, size: 112,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.3, alpha: 0.85 } }),
        ],
    },

    // ---------- BLUE STORM 落點 ----------
    // wb_u4 劍刃風暴（自身範圍 3，充能式 8 段）：起手（只播一次）＝日輪紋章＋劍輪（多把能量劍貼地繞身旋轉，整段詠唱加速成形）
    'FX_ULT_BLUE_BLADESTORM_WINDUP': {
        id: 'FX_ULT_BLUE_BLADESTORM_WINDUP',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.5, delay: 0, size: 64, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.3, alpha: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'construct', shape: 'bladeWheel', size: 224, ramp: 'LION_ARCANE' }, count: 1, lifetime: HIT + 0.85, delay: 0.1, size: 224, vRotation: 9,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, ease: 'linear', fadeIn: 0.15, fadeOut: 0.2 } }),
        ],
    },
    // wb_u4 每一段（散落在範圍內）：切面斬弧＋小閃＋細環＋碎光；不放大白閃（8 段疊起來會洗白）
    'FX_ULT_BLUE_BLADESTORM': {
        id: 'FX_ULT_BLUE_BLADESTORM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 56, arcDeg: 140, thickness: 12, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.25, delay: 0, size: 56,
                shape: 'CIRCLE', shapeRadius: 15, vRotation: [-10, 10], partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 20, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.2, delay: 0, size: 20,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 20, thickness: 5, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.4, delay: 0, size: 40,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.4, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: 'LION_HOLY' }, count: 2, lifetime: [0.3, 0.4], delay: 0.05, size: 4,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.5 } }),
        ],
    },
    // rb_u2 星辰墜落（全場隨機箭雨，8 次）：細光矢落在隨機位置＋星光＋擴張星環
    'FX_ULT_BLUE_STARFALL': {
        id: 'FX_ULT_BLUE_STARFALL',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 12, height: 192, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0, size: 12, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 1.4, scaleTo: 0.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 24, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.35, delay: 0, size: 24,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // rb_u5 系統超載（單體極速連射，15 次）：命中點連閃＋小衝擊環＋電光碎點
    'FX_ULT_BLUE_OVERLOAD': {
        id: 'FX_ULT_BLUE_OVERLOAD',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 24, ramp: 'LION_LIGHTNING', hard: true }, count: 1, lifetime: 0.15, delay: 0, size: 24,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'LION_LIGHTNING' }, count: 1, lifetime: 0.25, delay: 0, size: 24,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'LION_LIGHTNING', hard: true }, count: [2, 3], lifetime: [0.2, 0.35], delay: 0, size: 4,
                shape: 'BURST_DIR', speed: [200, 400], drag: 0.08, partAnim: { fadeOut: 0.6 } }),
        ],
    },
    // mb_u4 奧術洪流（範圍 5 彈幕，8 次）：奧術飛彈落點（藍光爆點＋六角碎晶＋擴張環）
    'FX_ULT_BLUE_TORRENT': {
        id: 'FX_ULT_BLUE_TORRENT',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 24, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.35, delay: 0, size: 24,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: 'LION_ARCANE' }, count: [2, 3], lifetime: [0.35, 0.5], delay: 0, size: 4,
                shape: 'CIRCLE', shapeRadius: 10, speed: [50, 150], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.5 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // sb_u3 英勇讚美（全隊 Buff，8 次）：金色聖歌波紋一圈圈擴散＋光點上升
    'FX_ULT_BLUE_HYMN': {
        id: 'FX_ULT_BLUE_HYMN',
        emitters: [
            // 命中主爆發（glow radius 48 大於環，非擴張環；delay 0 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.35, delay: 0, size: 48,
                shape: 'CIRCLE', shapeRadius: 10, vz: [40, 80], partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.4, fadeIn: 0.1, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_HOLY', hard: true }, count: 2, lifetime: 0.45, delay: 0, size: 6,
                shape: 'CIRCLE', shapeRadius: 10, vz: [60, 110], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },
    // sb_u5 寧靜之雨（範圍 5 持續治療，8 次）：金白光雨滴落下＋光霧＋擴散環
    'FX_ULT_BLUE_RAIN': {
        id: 'FX_ULT_BLUE_RAIN',
        emitters: [
            // 命中主爆發（glow radius 48 大於環，非擴張環；delay 0 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.35, delay: 0, size: 48,
                shape: 'CIRCLE', shapeRadius: 10, vz: [20, 50], partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeIn: 0.1, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.4, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 4, ramp: 'LION_HOLY' }, count: 2, lifetime: [0.35, 0.45], delay: 0, size: 4,
                shape: 'CIRCLE', shapeRadius: 10, vz: [-40, -10], gravity: 1200, partAnim: { fadeIn: 0.1, fadeOut: 0.3 } }),
        ],
    },

    // ---------- RED STORM 落點 ----------
    // wr_u2 血腥旋風（自身範圍 3，8 次）：旋轉血弧＋中央閃光＋擴張血環
    'FX_ULT_RED_BLOODSTORM': {
        id: 'FX_ULT_RED_BLOODSTORM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 64, arcDeg: 160, thickness: 18, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.3, delay: 0, size: 64,
                shape: 'CIRCLE', shapeRadius: 10, vRotation: [-12, -6], partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.6 } }),
            // 命中主爆發（glow delay 0 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_BLOOD', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // wr_u4 無限劍制（自身範圍 3 恐懼，8 次）：骨刃從地面刺出＋中央閃光＋擴張骨環
    'FX_ULT_RED_UNLIMITED_BLADE': {
        id: 'FX_ULT_RED_UNLIMITED_BLADE',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'shard', size: 32, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: 1, lifetime: 0.6, delay: 0, size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeOut: 0.4, ease: 'out', rotation: 1.57 } }),
            // 命中主爆發（glow delay 0 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // rr_u3 煉獄火雨（全場火雨，8 次）：火舌＋火球爆發＋全場擴張火環
    'FX_ULT_RED_INFERNO': {
        id: 'FX_ULT_RED_INFERNO',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'flame', height: 48, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.45, delay: 0, size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            // 命中主爆發（glow delay 0 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // rr_u5 末日審判（範圍 2 恐懼，8 次）：深淵雷擊落下＋核心暗光＋擴張暗環
    'FX_ULT_RED_DOOM': {
        id: 'FX_ULT_RED_DOOM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'bolt', length: 120, branches: 1, ramp: 'ASH_VOID', seed: 6 }, count: 1, lifetime: 0.25, delay: 0, size: 60, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { fadeOut: 0.6 } }),
            // 命中主爆發（glow delay 0 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_VOID', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
        ],
    },
    // mr_u5 靈魂爆燃（範圍 2 連鎖爆炸，8 次）：連鎖小爆（火光＋擴張火環）＋火星
    'FX_ULT_RED_SOUL_BURN': {
        id: 'FX_ULT_RED_SOUL_BURN',
        emitters: [
            // 命中主爆發（glow delay 0 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 4, ramp: 'ASH_FIRE', roughness: 1, seed: 20 }, count: 1, lifetime: 0.45, delay: 0, size: 48,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.3, scaleTo: 1.4, fadeOut: 0.5 } }),
            // 火星飛散
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'ASH_FIRE', hard: true }, count: 2, lifetime: [0.4, 0.7], delay: [0.05, 0.2], size: 5,
                shape: 'CIRCLE', shapeRadius: 10, speed: [20, 40], vz: [40, 80], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },
    // sr_u3 群體恐慌（單體逐出，8 次）：深淵暗光與黑煙向目標收攏
    'FX_ULT_RED_VOODOO': {
        id: 'FX_ULT_RED_VOODOO',
        emitters: [
            // 命中主爆發（glow delay 0 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_VOID', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 單體微光環（非擴張環，size 24 * 1.0 * 0.8 = 19.2 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 6, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: 0, size: 24,
                partAnim: { scaleFrom: 1.0, scaleTo: 1.0, fadeOut: 0.5 } }),
            // 黑煙螺旋上升（vz > 0 滿足 power <= 0 規則）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 28, color: 'CHAR', roughness: 1, seed: 15 }, count: 1, lifetime: 0.5, delay: 0, size: 28,
                shape: 'CIRCLE', shapeRadius: 20, speed: [-15, 15], vz: [30, 60], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },

    // ---------- BEAM_SNIPE 命中點（光束本體不變） ----------
    // wb_u5 光速斬擊（單體瞬移斬，充能式，命中 1.5 s）：詠唱中目標腳下浮現獅盾紋章、光晶向目標收攏 →
    // 命中：光束打出同時三道錯開的直線高速劍痕依序交叉（0.07 s 間隔）＋單體衝擊環
    'FX_ULT_BLUE_LIGHTSPEED': {
        id: 'FX_ULT_BLUE_LIGHTSPEED',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'lionShield', ramp: 'LION_HOLY' }, count: 1, lifetime: HIT + 0.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, ease: 'linear', fadeIn: 0.1, fadeOut: 0.3 } }),
            // 光晶收攏
            part({ particleType: 'PART', part: { kind: 'shard', size: 8, shape: 'crystal', ramp: 'LION_HOLY' }, count: 8, lifetime: 0.75, delay: [0.4, 0.8], size: 8,
                shape: 'RING', shapeRadius: 60, speed: -70, vRotation: [-6, 6], partAnim: { fadeIn: 0.25, fadeOut: 0.25 } }),
            // 三道直線劍痕（頭端在目標，往後拖尾），依序交叉
            part({ particleType: 'PART', part: { kind: 'spark', length: 144, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.3, delay: HIT, size: 144,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.3, fadeOut: 0.6, rotation: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'spark', length: 144, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.3, delay: HIT + 0.07, size: 144,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.3, fadeOut: 0.6, rotation: 2.5 } }),
            part({ particleType: 'PART', part: { kind: 'spark', length: 144, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.3, delay: HIT + 0.14, size: 144,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.3, fadeOut: 0.6, rotation: -0.15 } }),
            // 命中主爆發：單體衝擊環（36 * 1.2 * 1.4 = 60.5px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.75, delay: HIT, size: 36,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.2, fadeOut: 0.6 } }),
        ],
    },
    // mb_u5 聚能光束（巨型光束，命中範圍 1）：日輪烙印 → 光束終點爆閃＋光芒＋衝擊環＋六角碎晶
    'FX_ULT_BLUE_FOCUS_BEAM': {
        id: 'FX_ULT_BLUE_FOCUS_BEAM',
        emitters: [
            // 起手：日輪烙印（範圍 1 尺寸 <= 108px，48 * 1.0 * 1.4 = 67.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 48, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.2, delay: 0, size: 48, vRotation: 0.8,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
            // 命中主爆發（delay 0.3 對齊 hitAt）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.4, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 48, count: 12, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.35, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            // 範圍 1 擴張環（48 * 1.2 * 1.4 = 80.6px，落於 58.2～108.1px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 8, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.45, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'hex', ramp: 'LION_ARCANE' }, count: [4, 6], lifetime: [0.5, 0.7], delay: 0.3, size: 6,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
        ],
    },
    // rr_u1 灰燼穿心（貫穿斬殺）：起手鎖定印記 → 命中深紅閃光＋單體擴張碎裂環＋骨片＋灰煙
    'FX_ULT_RED_RAILGUN': {
        id: 'FX_ULT_RED_RAILGUN',
        emitters: [
            // 起手印記（delay 0 < burstTime 0.28，滿足 C3 起手；size 36 * 1.2 * 1.5 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.8, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 命中主爆發（glow radius 64 大於環，delay 0.28 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_FIRE', hard: true }, count: 1, lifetime: 0.4, delay: 0.28, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 單體擴張環（size 24 * 1.8 * 1.5 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'ASH_FIRE', roughness: 1, seed: 21 }, count: 1, lifetime: 0.45, delay: 0.28, size: 24,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            // 骨片飛濺
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: [5, 7], lifetime: [0.5, 0.7], delay: 0.3, size: 6,
                shape: 'BURST_DIR', speed: [200, 350], gravity: 2200, vRotation: [-10, 10], partAnim: { fadeOut: 0.3 } }),
            // 灰煙餘韻（delay 0.35 + lifetime 0.8 = 1.15s >= 0.8s，總長 1.15s 在 1.0～2.0s）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 28, color: 'ASH', roughness: 1, seed: 16 }, count: 2, lifetime: 0.8, delay: 0.35, size: 28,
                shape: 'CIRCLE', shapeRadius: 20, speed: [10, 25], vz: [30, 50], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },
    // rr_u4 血腥獵殺（鎖定秒殺）：倒三角鎖定印記 → 命中血爆＋單體擴張血環＋血滴飛濺
    'FX_ULT_RED_HEADHUNTER': {
        id: 'FX_ULT_RED_HEADHUNTER',
        emitters: [
            // 起手印記（delay 0 < burstTime 0.28，滿足 C3 起手；size 36 * 1.0 * 1.5 = 54 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.8, delay: 0, size: 36, vRotation: 2.0,
                partAnim: { scaleFrom: 1.3, scaleTo: 0.8, fadeIn: 0.1, fadeOut: 0.4 } }),
            // 命中主爆發（glow radius 64 大於環，delay 0.28 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_BLOOD', hard: true }, count: 1, lifetime: 0.4, delay: 0.28, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 單體擴張環（size 24 * 1.8 * 1.5 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'ASH_BLOOD', roughness: 1, seed: 22 }, count: 1, lifetime: 0.4, delay: 0.28, size: 24,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.5 } }),
            // 血滴飛濺（delay 0.3 + lifetime 0.8 = 1.1s >= 0.8s）
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' }, count: [6, 8], lifetime: 0.8, delay: 0.3, size: 5,
                shape: 'BURST_DIR', speed: [120, 250], vz: [120, 250], gravity: 2200, partAnim: { fadeOut: 0.3 } }),
        ],
    },
    // mr_u2 死亡一指（單體秒殺）：起手倒三角印記 → 命中深紅閃光＋單體擴張暗環＋靈魂暗光上逸
    'FX_ULT_RED_DEATH_FINGER': {
        id: 'FX_ULT_RED_DEATH_FINGER',
        emitters: [
            // 起手印記（delay 0 < burstTime 0.28，滿足 C3 起手；size 36 * 1.2 * 1.5 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'hornSkull', ramp: 'ASH_VOID' }, count: 1, lifetime: 0.8, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.2, scaleTo: 0.8, fadeIn: 0.08, fadeOut: 0.4 } }),
            // 命中主爆發（glow radius 64 大於環，delay 0.28 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_VOID', hard: true }, count: 1, lifetime: 0.4, delay: 0.28, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.8 } }),
            // 單體擴張環（size 24 * 1.8 * 1.5 = 64.8 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'ASH_VOID', roughness: 1, seed: 23 }, count: 1, lifetime: 0.45, delay: 0.28, size: 24,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            // 靈魂暗光上逸（delay 0.3 + lifetime 0.8 = 1.1s >= 0.8s）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_VOID', hard: true }, count: [5, 6], lifetime: 0.8, delay: 0.3, size: 6,
                shape: 'CIRCLE', shapeRadius: 20, speed: [5, 15], vz: [60, 110], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },
};
