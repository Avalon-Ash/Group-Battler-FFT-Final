import { VFXAsset, EmitterConfig } from "../../../types/VFXSchema";
import type { VFXRampId } from "../parts/vfxPalette";
import { ULT_SEQUENCE } from "../ult_visuals";

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
    // wb_u3 誓約勝利（獅心・聖光，充能式，hit＝ULT_SEQUENCE.CHARGED_HIT_AT 1.5 s）：
    // 日輪法陣浮現、光點與劍片向上空匯聚 → 獅翼聖劍在目標上空成形並抬起 → 重刃砸落插地 → 地裂、碎晶、光點上飄
    'FX_ULT_BLUE_EXCALIBUR': {
        id: 'FX_ULT_BLUE_EXCALIBUR',
        emitters: [
            // 起手（0 s）：日輪法陣，整段詠唱緩慢放大旋轉
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'sun', ramp: 'LION_HOLY' }, count: 1, lifetime: 2.0, delay: 0, size: 36, vRotation: 0.6,
                partAnim: { scaleFrom: 0.55, scaleTo: 1.1, ease: 'linear', fadeIn: 0.08, fadeOut: 0.25 } }),
            // 成形（0.15–1.05 s）：劍片由外圈向中心收、往上空劍的位置升起
            part({ particleType: 'PART', part: { kind: 'shard', size: 12, shape: 'crystal', ramp: 'LION_HOLY' }, count: 10, lifetime: 0.75, delay: [0.15, 0.3], size: 12,
                shape: 'RING', shapeRadius: 70, speed: -85, vRotation: [-6, 6], groundAnchored: true,
                partAnim: { fadeIn: 0.25, fadeOut: 0.25, rise: [{ at: 0, z: 30 }, { at: 1, z: 120 }] } }),
            // 聖劍（0.75–2.35 s）：上空顯形並緩慢抬起 → 1.4 s 急墜 → 1.5 s 插地停留後淡出（劍尖高度＝rise）
            part({ particleType: 'PART', part: { kind: 'construct', shape: 'greatsword', size: 128, ramp: 'LION_HOLY' }, count: 1, lifetime: 1.6, delay: 0.75, size: 128, groundAnchored: true,
                partAnim: { scaleFrom: 0.8, scaleTo: 1, fadeIn: 0.16, fadeOut: 0.24,
                    rise: [{ at: 0, z: 100 }, { at: 0.40625, z: 150 }, { at: 0.46875, z: 0, ease: 'in' }, { at: 1, z: 0 }] } }),
            // 命中：地面放射裂紋與衝擊環
            // 單體技能：貼地零件不超過 1.5 格（C6），畫面不暗示比實際更大的打擊範圍
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 48, count: 8, ramp: 'LION_HOLY', lengthJitter: 0.6, seed: 3 }, count: 1, lifetime: 0.9, delay: 1.5, size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1, fadeOut: 0.6 } }),
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 40, thickness: 6, ramp: 'LION_HOLY' }, count: 1, lifetime: 0.5, delay: 1.5, size: 40,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.2, fadeOut: 0.6 } }),
            // 命中：碎晶噴濺
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 9, shape: 'crystal', ramp: 'LION_HOLY' }, count: 8, lifetime: [0.6, 0.9], delay: 1.5, size: 9,
                shape: 'BURST_DIR', speed: [200, 380], gravity: 1800, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
        ],
    },

    // wr_u1 諸神黃昏（近身單體爆發，充能式，命中 1.5 s）：詠唱中熔岩裂紋往目標腳下收攏 →
    // 命中：火柱分三階接連噴發＋單體碎裂環＋熔岩彈 → 灰煙上竄
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        emitters: [
            // 角骷髏印記（36 * 1.0 * 1.4 = 50.4px）
            part({ particleType: 'PART_GROUND', part: { kind: 'sigil', radius: 36, emblem: 'hornSkull', ramp: 'ASH_FIRE' }, count: 1, lifetime: ULT_SEQUENCE.CHARGED_HIT_AT + 0.4, delay: 0, size: 36,
                partAnim: { scaleFrom: 1.2, scaleTo: 1, fadeIn: 0.1, fadeOut: 0.3 } }),
            // 熔岩裂紋往中心收攏（36 * 1.4 * 1.4 = 70.6px <= 72px）
            part({ particleType: 'PART_GROUND', part: { kind: 'rays', radius: 36, count: 6, ramp: 'ASH_FIRE', lengthJitter: 0.5, seed: 9 }, count: 1, lifetime: ULT_SEQUENCE.CHARGED_HIT_AT - 0.3 + 0.2, delay: 0.3, size: 36,
                partAnim: { scaleFrom: 1.4, scaleTo: 0.6, ease: 'in', fadeIn: 0.2, fadeOut: 0.2 } }),
            // 火柱分三階噴發
            part({ particleType: 'PART', part: { kind: 'flame', height: 112, ramp: 'ASH_FIRE', jagged: true }, count: 3, lifetime: 0.6, delay: [ULT_SEQUENCE.CHARGED_HIT_AT, ULT_SEQUENCE.CHARGED_HIT_AT + 0.24], size: 56, groundAnchored: true,
                shape: 'CIRCLE', shapeRadius: 10, partAnim: { scaleFrom: 0.4, scaleTo: 1.2, fadeOut: 0.5 } }),
            // 命中主爆發：單體碎裂環（30 * 1.6 * 1.4 = 67.2px）
            part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 30, thickness: 10, ramp: 'ASH_FIRE', roughness: 1, seed: 10 }, count: 1, lifetime: 0.5, delay: ULT_SEQUENCE.CHARGED_HIT_AT, size: 30,
                partAnim: { scaleFrom: 0.3, scaleTo: 1.6, fadeOut: 0.5 } }),
            // 熔岩彈
            part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 8, shape: 'rock', ramp: 'ASH_FIRE', seed: 4 }, count: 8, lifetime: [0.6, 0.9], delay: [ULT_SEQUENCE.CHARGED_HIT_AT, ULT_SEQUENCE.CHARGED_HIT_AT + 0.2], size: 8,
                shape: 'BURST_DIR', speed: [100, 220], vz: [350, 600], gravity: 2200, vRotation: [-8, 8], partAnim: { fadeOut: 0.3 } }),
            // 灰煙上竄
            part({ particleType: 'PART', part: { kind: 'smoke', radius: 28, color: 'ASH', roughness: 1, seed: 11 }, count: 3, lifetime: 0.9, delay: ULT_SEQUENCE.CHARGED_HIT_AT + 0.1, size: 28,
                shape: 'CIRCLE', shapeRadius: 16, vz: [60, 120], drag: 0.03, partAnim: { scaleFrom: 0.5, scaleTo: 1.4, fadeIn: 0.15, fadeOut: 0.6, alpha: 0.7 } }),
        ],
    },
};
