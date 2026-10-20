import { VFXAsset, EmitterConfig } from "../../../types/VFXSchema";
import type { VFXRampId } from "../parts/vfxPalette";

// ==========================================
// 奧義特效（V2a，零件版）
// 依 ART_SPEC §6：起手（紋章法陣）→ 命中（主爆發＋衝擊環）→ 餘韻（殘留飄散），總長 ≤ 2 s。
// 外形與色階由 part 規格決定（data/vfx/parts/），粒子 colors 不使用。
// 尺寸參考：HEX_SIZE = 48，奧義範圍約 2 格（半徑約 100）。
// ==========================================

const NO_COLOR: string[] = [];
const still = { speed: 0, shape: 'POINT', colors: NO_COLOR } as const;

/** 零件 emitter 的共通預設 */
export function part(cfg: Omit<EmitterConfig, 'colors' | 'speed' | 'shape'> & Partial<Pick<EmitterConfig, 'speed' | 'shape' | 'shapeRadius'>>): EmitterConfig {
    return { ...still, ...cfg };
}

/**
 * 奧義共用命中包（SkillSequences 在每個奧義的命中時刻加播，序列 scale＝奧義 scale）：
 * 大型衝擊環兩道（外圈快、內圈慢）、爆閃、地面裂紋、碎石與火星。各奧義自己的資產負責「是什麼」，這包負責「打得多重」。
 */
function ultImpact(id: string, ramp: VFXRampId, debrisRamp: VFXRampId): VFXAsset {
    return {
        id,
        emitters: [
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp, hard: true }, count: 1, lifetime: 0.28, delay: 0, size: 96,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.25, fadeOut: 0.85 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 160, thickness: 7, ramp }, count: 1, lifetime: 0.55, delay: 0, size: 320,
                partAnim: { scaleFrom: 0.15, scaleTo: 1, ease: 'out', fadeOut: 0.55 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 112, thickness: 5, ramp, roughness: 0.5, seed: 2 }, count: 1, lifetime: 0.7, delay: 0.06, size: 224,
                partAnim: { scaleFrom: 0.2, scaleTo: 1, ease: 'out', fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 96, count: 10, ramp, lengthJitter: 0.75, seed: 4 }, count: 1, lifetime: 0.9, delay: 0, size: 96,
                partAnim: { scaleFrom: 0.6, scaleTo: 1, fadeIn: 0.05, fadeOut: 0.6 } }),
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 9, shape: 'rock', ramp: debrisRamp, seed: 1 }, count: [8, 10], lifetime: [0.8, 1.1], delay: 0, size: 9,
                shape: 'BURST_DIR', speed: [260, 520], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            part({ particleType: 'PART', part: { kind: 'glow', radius: 5, ramp, hard: true }, count: [14, 18], lifetime: [0.35, 0.6], delay: 0, size: 5,
                shape: 'BURST_DIR', speed: [300, 620], vz: [80, 260], drag: 0.06, partAnim: { fadeOut: 0.6 } }),
        ],
    };
}

export const ULT_IMPACT_VFX: Record<string, VFXAsset> = {
    FX_ULT_IMPACT_BLUE: ultImpact('FX_ULT_IMPACT_BLUE', 'LION_HOLY', 'LION_PHYSICAL'),
    FX_ULT_IMPACT_RED: ultImpact('FX_ULT_IMPACT_RED', 'ASH_FIRE', 'ASH_PHYSICAL'),
};

export const ULT_PART_VFX: Record<string, VFXAsset> = {
    // wb_u3 誓約勝利（獅心・聖光）：日輪法陣浮現 → 巨大金色劍弧＋光柱落下 → 金色光點上飄
    'FX_ULT_BLUE_EXCALIBUR': {
        id: 'FX_ULT_BLUE_EXCALIBUR',
        emitters: [
            // 起手：日輪法陣（陣營紋章），緩慢旋轉（單體尺寸 ≤ 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0, size: 36, vRotation: 0.5,
                partAnim: { scaleFrom: 0.7, scaleTo: 1, fadeIn: 0.15, fadeOut: 0.35 } }),
            // 命中：光柱
            part({ particleType: 'PART', part: { kind: 'pillar', width: 64, height: 256, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.7, delay: 0.3, size: 64, groundAnchored: true,
                partAnim: { scaleFrom: 1.15, scaleTo: 0.9, fadeIn: 0.05, fadeOut: 0.6 } }),
            // 命中：巨大劍弧（由右上斬下）
            part({ particleType: 'PART', part: { kind: 'slashArc', radius: 128, arcDeg: 150, thickness: 32, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.35, delay: 0.32, size: 128,
                partAnim: { scaleFrom: 0.85, scaleTo: 1.1, fadeOut: 0.5, rotation: 0.6 } }),
            // 命中：核心閃光
            part({ particleType: 'PART', part: { kind: 'glow', radius: 96, ramp: 'LION_HOLY', hard: true }, count: 1, lifetime: 0.5, delay: 0.32, size: 96,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.3, fadeOut: 0.7 } }),
            // 命中：地面衝擊環（單體尺寸 ≤ 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 24, thickness: 8, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.6, delay: 0.34, size: 48,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.0, fadeOut: 0.6 } }),
            // 餘韻：光點緩慢上飄後淡出
            part({ particleType: 'PART', part: { kind: 'glow', radius: 8, ramp: 'LION_HOLY', hard: true }, count: [10, 14], lifetime: [0.8, 1.1], delay: [0.45, 0.65], size: 8,
                shape: 'CIRCLE', shapeRadius: 50, speed: [5, 20], vz: [40, 90], drag: 0.02,
                partAnim: { fadeIn: 0.15, fadeOut: 0.5 } }),
        ],
    },

    // wr_u1 諸神黃昏（灰燼・火）：角骷髏印記烙地 → 火柱噴發＋衝擊環 → 灰煙翻騰、火星飄落
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        emitters: [
            // 起手：角骷髏印記（單體尺寸 <= 72px，36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: 1.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.1, scaleTo: 1, fadeIn: 0.08, fadeOut: 0.4 } }),
            // 命中主爆發（delay 0.28 對齊 hitAt 0.3）
            part({ particleType: 'PART', part: { kind: 'glow', radius: 48, ramp: 'ASH_FIRE' }, count: 1, lifetime: 0.45, delay: 0.28, size: 48,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeOut: 0.8 } }),
            // 命中：中央火柱
            part({ particleType: 'PART', part: { kind: 'flame', height: 192, ramp: 'ASH_FIRE', jagged: true }, count: 1, lifetime: 0.8, delay: 0.3, size: 48, groundAnchored: true,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.1, fadeOut: 0.5 } }),
            // 單體擴張環（32 * 1.1 * 1.4 = 49.3 <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 12, ramp: 'ASH_FIRE', roughness: 1, seed: 1 }, count: 1, lifetime: 0.5, delay: 0.3, size: 32,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.1, fadeOut: 0.5 } }),
            // 餘韻：灰煙與火星
            part({ particleType: 'PART', part: { kind: 'glow', radius: 6, ramp: 'ASH_FIRE', hard: true }, count: [6, 8], lifetime: 0.8, delay: [0.35, 0.5], size: 6,
                shape: 'CIRCLE', shapeRadius: 40, speed: [15, 40], vz: [40, 80], drag: 0.03, partAnim: { fadeOut: 0.6 } }),
        ],
    },
};
