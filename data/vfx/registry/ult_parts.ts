import { VFXAsset, EmitterConfig } from "../../../types/VFXSchema";

// ==========================================
// 奧義特效（V2a，零件版）
// 依 ART_SPEC §6：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻（殘留飄散），總長 ≤ 2 s。
// 外形與色階由 part 規格決定（data/vfx/parts/），粒子 colors 不使用。
// 尺寸參考：HEX_SIZE = 48，奧義範圍約 2 格（半徑約 100）。
// ==========================================

const NO_COLOR: string[] = [];
const still = { speed: 0, shape: 'POINT', colors: NO_COLOR } as const;

/** 零件 emitter 的共通預設 */
function part(cfg: Omit<EmitterConfig, 'colors' | 'speed' | 'shape'> & Partial<Pick<EmitterConfig, 'speed' | 'shape' | 'shapeRadius'>>): EmitterConfig {
    return { ...still, ...cfg };
}

export const ULT_PART_VFX: Record<string, VFXAsset> = {
    // wb_u3 誓約勝利（獅心・聖光）：日輪法陣浮現 → 巨大金色劍弧＋光柱落下 → 金色光點上飄
    'FX_ULT_BLUE_EXCALIBUR': {
        id: 'FX_ULT_BLUE_EXCALIBUR',
        emitters: [
            // 起手：日輪法陣（陣營紋章），緩慢旋轉
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 96, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 命中：光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 64, height: 256, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0.3, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 1.15, scaleTo: 0.9, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中：巨大劍弧（由右上斬下）
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 128, arcDeg: 150, thickness: 32, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.32, size: 128,
                partAnim: { scaleFrom: 0.85, scaleTo: 1.1, fadeOut: 0.5, rotation: 0.6 } }),
            // 命中：核心閃光＋日輪放射
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.5, delay: 0.32, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 12, ramp: 'LION_HOLY', lengthJitter: 0.5 }, count: 1, lifetime: 0.45, delay: 0.34, size: 96,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.6 } }),
            // 命中：地面衝擊環
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 12, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.34, size: 128,
                partAnim: { scaleFrom: 0.4, scaleTo: 2.2, fadeOut: 0.6 } }),
            // 餘韻：光點緩慢上飄後淡出
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 14], lifetime: [0.9, 1.2], delay: [0.45, 0.7], size: 8,
                shape: 'CIRCLE', shapeRadius: 70, speed: [5, 20], vz: [40, 90], drag: 0.02,
                partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // wr_u1 諸神黃昏（灰燼・火）：角骷髏印記烙地 → 火柱噴發＋鋸齒衝擊環＋碎石 → 灰煙翻騰、火星飄落
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        emitters: [
            // 起手：角骷髏印記（陣營紋章），快速烙下
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 96, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 1.4, delay: 0, size: 96,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            // 命中：核心爆閃＋不規則放射
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0.28, size: 96,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.5, fadeOut: 0.8 } }),
            part({ particleType: 'PART', part: { kind: 'rays', radius: 96, count: 9, ramp: 'ASH_FIRE', lengthJitter: 1, seed: 3 }, count: 1, lifetime: 0.3, delay: 0.28, size: 96,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中：中央火柱＋周圍火舌
            part({ particleType: 'PART', part: { kind: 'flame', height: 192, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.9, delay: 0.3, size: 96, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeOut: 0.5 } }),
            part({ particleType: 'PART', part: { kind: 'flame', height: 96, ramp: 'ASH_FIRE', jagged: true }, count: [5, 6], lifetime: [0.7, 1.0], delay: [0.32, 0.42], size: 48, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 60, partAnim: { scaleFrom: 0.4, scaleTo: 1, fadeOut: 0.5 } }),
            // 命中：鋸齒斷裂衝擊環
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 64, thickness: 16, ramp: 'ASH_FIRE', roughness: 1, seed: 1 }, count: 1, lifetime: 0.55, delay: 0.3, size: 128,
                partAnim: { scaleFrom: 0.3, scaleTo: 2.4, fadeOut: 0.5 } }),
            // 命中：碎石飛濺（受重力、會彈跳）
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'ASH_PHYSICAL', seed: 1 }, count: [8, 12], lifetime: [0.9, 1.3], delay: 0.3, size: 8,
                shape: 'BURST_DIR', speed: [250, 500], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            // 餘韻：灰煙翻騰上升（一般混合）
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 48, color: 'ASH', roughness: 1, seed: 2 }, count: [4, 6], lifetime: [1.0, 1.3], delay: [0.45, 0.6], size: 48,
                shape: 'CIRCLE', shapeRadius: 50, speed: [10, 30], vz: [30, 60], drag: 0.03, partAnim: { scaleFrom: 0.6, scaleTo: 1.6, fadeIn: 0.2, fadeOut: 0.6, alpha: 0.8 } }),
            // 餘韻：火星飄落
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_FIRE', hard: true }, count: [10, 14], lifetime: [0.9, 1.2], delay: [0.4, 0.7], size: 6,
                shape: 'CIRCLE', shapeRadius: 80, speed: [20, 60], vz: [60, 140], drag: 0.04, partAnim: { fadeOut: 0.6 } }),
        ],
    },
};
