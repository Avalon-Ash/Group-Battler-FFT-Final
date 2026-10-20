import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";

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
    // wb_u4 劍刃風暴（自身範圍 3，8 次）：旋轉鋼白劍弧＋中央閃光＋地面衝擊環＋迸出六角碎光
    'FX_ULT_BLUE_BLADESTORM': {
        id: 'FX_ULT_BLUE_BLADESTORM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 64, arcDeg: 150, thickness: 16, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.25, delay: 0, size: 64,
                shape: 'CIRCLE', shapeRadius: 30, vRotation: [-10, 10], partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.3, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 8, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.4, delay: 0, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.5, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: 'LION_HOLY' }, count: 2, lifetime: [0.3, 0.4], delay: 0.05, size: 4,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.5 } }),
        ],
    },
    // rb_u2 星辰墜落（全場隨機箭雨，10 次）：細光矢落在隨機位置＋星光
    'FX_ULT_BLUE_STARFALL': {
        id: 'FX_ULT_BLUE_STARFALL',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'pillar', width: 12, height: 192, ramp: 'LION_HOLY' }, count: 2, lifetime: 0.3, delay: [0, 0.08], size: 12, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 110, partAnim: { scaleFrom: 1.4, scaleTo: 0.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 16, ramp: 'LION_HOLY', hard: true }, count: 2, lifetime: 0.35, delay: [0.05, 0.12], size: 16,
                shape: 'CIRCLE', shapeRadius: 110, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
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
    // mb_u4 奧術洪流（範圍 5 彈幕，12 次）：奧術飛彈落點（藍光爆點＋六角碎晶）
    'FX_ULT_BLUE_TORRENT': {
        id: 'FX_ULT_BLUE_TORRENT',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 24, ramp: 'LION_ARCANE', hard: true }, count: 2, lifetime: 0.3, delay: [0, 0.06], size: 24,
                shape: 'CIRCLE', shapeRadius: 70, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: 'LION_ARCANE' }, count: [3, 4], lifetime: [0.4, 0.6], delay: 0, size: 4,
                shape: 'CIRCLE', shapeRadius: 70, speed: [50, 150], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.5 } }),
        ],
    },
    // sb_u3 英勇讚美（全隊 Buff，10 次）：金色聖歌波紋一圈圈擴散＋光點上升
    'FX_ULT_BLUE_HYMN': {
        id: 'FX_ULT_BLUE_HYMN',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 4, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 2.6, fadeIn: 0.1, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'LION_HOLY', hard: true }, count: 2, lifetime: [0.8, 1.0], delay: [0, 0.1], size: 6,
                shape: 'CIRCLE', shapeRadius: 120, vz: [60, 110], drag: 0.02, partAnim: { fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },
    // sb_u5 寧靜之雨（範圍 5 持續治療，20 次）：金白光雨滴落下＋柔光點
    'FX_ULT_BLUE_RAIN': {
        id: 'FX_ULT_BLUE_RAIN',
        emitters: [
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 4, ramp: 'LION_HOLY' }, count: 2, lifetime: [0.4, 0.6], delay: [0, 0.04], size: 4,
                shape: 'CIRCLE', shapeRadius: 120, vz: [-60, 0], gravity: 1500, partAnim: { fadeIn: 0.1, fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.4, delay: 0.1, size: 8,
                shape: 'CIRCLE', shapeRadius: 120, vz: [20, 40], partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeIn: 0.2, fadeOut: 0.6 } }),
        ],
    },

    // ---------- RED STORM 落點 ----------
    // wr_u2 血腥旋風（自身範圍 2，15 次）：旋轉血弧＋血滴甩出
    'FX_ULT_RED_BLOODSTORM': {
        id: 'FX_ULT_RED_BLOODSTORM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 64, arcDeg: 160, thickness: 18, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.25, delay: 0, size: 64,
                shape: 'CIRCLE', shapeRadius: 25, vRotation: [-12, -6], partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' }, count: [2, 3], lifetime: [0.5, 0.7], delay: 0.05, size: 5,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 300], gravity: 2000, partAnim: { fadeOut: 0.3 } }),
        ],
    },
    // wr_u4 無限劍制（自身範圍 2 恐懼，12 次）：骨刃從地面刺出（骨片轉 90° 直立）＋碎石
    'FX_ULT_RED_UNLIMITED_BLADE': {
        id: 'FX_ULT_RED_UNLIMITED_BLADE',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'shard', size: 32, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: 1, lifetime: 0.8, delay: 0, size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 50, partAnim: { scaleFrom: 0.2, scaleTo: 1, fadeOut: 0.4, ease: 'out', rotation: 1.57 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 5, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 3 }, count: 2, lifetime: [0.5, 0.7], delay: 0, size: 5,
                shape: 'CIRCLE', shapeRadius: 50, speed: [50, 120], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
        ],
    },
    // rr_u3 煉獄火雨（全場火雨，20 次）：隨機落點火舌＋火星
    'FX_ULT_RED_INFERNO': {
        id: 'FX_ULT_RED_INFERNO',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'flame', height: 64, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.6, delay: 0, size: 32, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 120, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp: 'ASH_FIRE', hard: true }, count: 2, lifetime: [0.5, 0.8], delay: [0, 0.1], size: 5,
                shape: 'CIRCLE', shapeRadius: 120, speed: [10, 30], vz: [60, 120], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },
    // rr_u5 末日審判（範圍 2 恐懼，12 次）：深淵雷擊落下＋黑煙
    'FX_ULT_RED_DOOM': {
        id: 'FX_ULT_RED_DOOM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'bolt', length: 160, branches: 1, ramp: 'ASH_VOID', seed: 6 }, count: 1, lifetime: 0.25, delay: 0, size: 80, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 60, partAnim: { fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'CHAR', roughness: 1, seed: 14 }, count: 1, lifetime: [0.7, 0.9], delay: 0.05, size: 32,
                shape: 'CIRCLE', shapeRadius: 60, vz: [20, 40], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },
    // mr_u5 靈魂爆燃（範圍 3 連鎖爆炸，12 次）：連鎖小爆（火光＋斷裂小環）＋火星
    'FX_ULT_RED_SOUL_BURN': {
        id: 'FX_ULT_RED_SOUL_BURN',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                shape: 'CIRCLE', shapeRadius: 70, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 6, ramp: 'ASH_FIRE', roughness: 1, seed: 20 }, count: 1, lifetime: 0.3, delay: 0, size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.6, fadeOut: 0.6 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 4, ramp: 'ASH_FIRE', hard: true }, count: 2, lifetime: [0.4, 0.6], delay: 0, size: 4,
                shape: 'BURST_DIR', speed: [150, 300], drag: 0.06, partAnim: { fadeOut: 0.6 } }),
        ],
    },
    // sr_u3 群體恐慌（單體逐出，10 次）：深淵暗光與黑煙向目標收攏
    'FX_ULT_RED_VOODOO': {
        id: 'FX_ULT_RED_VOODOO',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'CHAR', roughness: 1, seed: 15 }, count: 1, lifetime: [0.7, 0.9], delay: 0, size: 32,
                shape: 'CIRCLE', shapeRadius: 50, speed: [-30, -10], vz: [20, 50], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_VOID', hard: true }, count: 2, lifetime: [0.5, 0.7], delay: [0, 0.1], size: 6,
                shape: 'CIRCLE', shapeRadius: 60, speed: [-60, -30], vz: [30, 60], partAnim: { fadeIn: 0.2, fadeOut: 0.5 } }),
        ],
    },

    // ---------- BEAM_SNIPE 命中點（光束本體不變） ----------
    // wb_u5 光速斬擊（瞬移斬擊，單體）：日輪紋章起手 → 交叉雙劍弧＋命中核心爆閃＋單體地面環
    'FX_ULT_BLUE_LIGHTSPEED': {
        id: 'FX_ULT_BLUE_LIGHTSPEED',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.0, delay: 0, size: 36, vRotation: 1.0,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 96, arcDeg: 120, thickness: 20, ramp: 'LION_PHYSICAL' }, count: 1, lifetime: 0.25, delay: 0.1, size: 96,
                partAnim: { scaleFrom: 0.85, scaleTo: 1.15, fadeOut: 0.5, rotation: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 96, arcDeg: 120, thickness: 20, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.25, delay: 0.18, size: 96,
                partAnim: { scaleFrom: 0.85, scaleTo: 1.15, fadeOut: 0.5, rotation: -0.8 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.35, delay: 0.3, size: 64,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.45, delay: 0.3, size: 48,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.0, fadeOut: 0.6 } }),
        ],
    },
    // mb_u5 聚能光束（巨型光束，命中範圍 1）：光束終點爆閃＋光芒＋衝擊環＋日輪烙印＋六角碎晶
    'FX_ULT_BLUE_FOCUS_BEAM': {
        id: 'FX_ULT_BLUE_FOCUS_BEAM',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 80, ramp: 'LION_ARCANE', hard: true }, count: 1, lifetime: 0.5, delay: 0, size: 80,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 12, ramp: 'LION_ARCANE' }, count: 1, lifetime: 0.4, delay: 0, size: 96,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_ARCANE' }, count: 2, lifetime: 0.5, delay: [0.02, 0.25], size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 80, emblem: 'sun', ramp: 'LION_ARCANE' }, count: 1, lifetime: 1.2, delay: 0.05, size: 80, vRotation: 0.8,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'hex', ramp: 'LION_ARCANE' }, count: [6, 8], lifetime: [0.6, 0.9], delay: 0, size: 6,
                shape: 'BURST_DIR', speed: [200, 400], vz: [200, 400], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.4 } }),
        ],
    },
    // rr_u1 灰燼穿心（貫穿斬殺）：貫穿爆點（深紅閃光＋鋸齒放射）＋斷裂環＋骨片＋灰煙
    'FX_ULT_RED_RAILGUN': {
        id: 'FX_ULT_RED_RAILGUN',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 64, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.4, delay: 0, size: 64,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 80, count: 7, ramp: 'ASH_FIRE', lengthJitter: 1, seed: 11 }, count: 1, lifetime: 0.25, delay: 0, size: 80,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 12, ramp: 'ASH_BLOOD', roughness: 1, seed: 21 }, count: 1, lifetime: 0.45, delay: 0.02, size: 96,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'bone', ramp: 'ASH_PHYSICAL' }, count: [5, 7], lifetime: [0.6, 0.9], delay: 0, size: 6,
                shape: 'BURST_DIR', speed: [250, 450], gravity: 2200, vRotation: [-10, 10], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 32, color: 'ASH', roughness: 1, seed: 16 }, count: 2, lifetime: [0.8, 1.0], delay: [0.1, 0.2], size: 32,
                shape: 'CIRCLE', shapeRadius: 20, speed: [10, 30], vz: [30, 60], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },
    // rr_u4 血腥獵殺（鎖定秒殺）：倒三角鎖定印記收緊 → 命中血爆＋血滴
    'FX_ULT_RED_HEADHUNTER': {
        id: 'FX_ULT_RED_HEADHUNTER',
        emitters: [
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'invTriangle', ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.9, delay: 0, size: 64, vRotation: 2.0,
                partAnim: { scaleFrom: 1.6, scaleTo: 0.8, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'ASH_BLOOD' }, count: 1, lifetime: 0.35, delay: 0.05, size: 48,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 8, ramp: 'ASH_BLOOD', roughness: 1, seed: 22 }, count: 1, lifetime: 0.4, delay: 0.05, size: 64,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.8, fadeOut: 0.5 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' }, count: [8, 10], lifetime: [0.5, 0.8], delay: 0.05, size: 5,
                shape: 'BURST_DIR', speed: [150, 300], vz: [150, 350], gravity: 2200, partAnim: { fadeOut: 0.3 } }),
        ],
    },
    // mr_u2 死亡一指（單體秒殺）：深淵命中閃光＋收縮斷裂環（靈魂被抽離）＋角骷髏烙印＋暗光上逸
    'FX_ULT_RED_DEATH_FINGER': {
        id: 'FX_ULT_RED_DEATH_FINGER',
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 56, ramp: 'ASH_VOID' }, count: 1, lifetime: 0.45, delay: 0, size: 56,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.3, fadeOut: 0.8 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 10, ramp: 'ASH_VOID', roughness: 1, seed: 23 }, count: 1, lifetime: 0.5, delay: 0, size: 96,
                partAnim: { scaleFrom: 1.8, scaleTo: 0.3, fadeIn: 0.1, fadeOut: 0.4 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 64, emblem: 'hornSkull', ramp: 'ASH_VOID' }, count: 1, lifetime: 1.1, delay: 0.05, size: 64,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.45 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_VOID', hard: true }, count: [8, 10], lifetime: [0.7, 1.0], delay: [0.1, 0.4], size: 6,
                shape: 'CIRCLE', shapeRadius: 30, speed: [5, 20], vz: [80, 140], drag: 0.02, partAnim: { fadeIn: 0.1, fadeOut: 0.5 } }),
        ],
    },
};
