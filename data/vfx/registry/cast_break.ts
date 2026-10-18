import { VFXAsset } from "../../../types/VFXSchema";
import { Team } from "../../../types";
import type { VFXRampId } from "../parts/vfxPalette";
import { part } from "./ult_parts";

// ==========================================
// 詠唱中斷（ART_SPEC §13）：法術結構崩解＝六角晶格碎裂。
//  - FX_CAST_BREAK_<TEAM>：施法者腳下的斷裂六角環＋六角碎片噴散。
//  - FX_CAST_BREAK_BURST_<TEAM>：施法者身上（核心高度）的崩解爆散：重力很重的六角碎片＋灰煙（取代舊的共用 FX_CAST_BREAK）。
//  - FX_AOE_BREAK_<TEAM>_<band>：AOE 預警格逐格閃一次後收縮熄滅並迸出碎片；
//    band 0 為最外圈、延遲最短，由外向中心依序熄滅，讓玩家看出「這片危險解除了」。
// 外形與色階由 part 規格決定，粒子 colors 不使用。
// ==========================================

/** AOE 崩解的延遲分層數與每層延遲（秒） */
export const AOE_BREAK = { BANDS: 3, BAND_DELAY: 0.08 } as const;

const FACTIONS: ReadonlyArray<{ key: 'BLUE' | 'RED'; ramp: VFXRampId; roughness: number }> = [
    { key: 'BLUE', ramp: 'LION_HOLY', roughness: 0.5 },
    { key: 'RED', ramp: 'ASH_FIRE', roughness: 1 },
];

export function castBreakFxId(team: Team | undefined): string {
    return team === Team.RED ? 'FX_CAST_BREAK_RED' : 'FX_CAST_BREAK_BLUE';
}

export function castBreakBurstFxId(team: Team | undefined): string {
    return team === Team.RED ? 'FX_CAST_BREAK_BURST_RED' : 'FX_CAST_BREAK_BURST_BLUE';
}

export function aoeBreakFxId(team: Team | undefined, band: number): string {
    const b = Math.max(0, Math.min(AOE_BREAK.BANDS - 1, band));
    return `${team === Team.RED ? 'FX_AOE_BREAK_RED' : 'FX_AOE_BREAK_BLUE'}_${b}`;
}

function buildCastBreak(): Record<string, VFXAsset> {
    const out: Record<string, VFXAsset> = {};
    for (const f of FACTIONS) {
        const id = `FX_CAST_BREAK_${f.key}`;
        out[id] = {
            id,
            emitters: [
                part({ particleType: 'PART', part: { kind: 'glow', radius: 32, ramp: f.ramp, hard: true }, count: 1, lifetime: 0.25, delay: 0, size: 32,
                    partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeOut: 0.8 } }),
                part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 32, thickness: 6, ramp: f.ramp, roughness: f.roughness, seed: 1 }, count: 1, lifetime: 0.4, delay: 0, size: 32,
                    partAnim: { scaleFrom: 0.7, scaleTo: 1.6, fadeOut: 0.6 } }),
                part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 6, shape: 'hex', ramp: f.ramp }, count: [10, 14], lifetime: [0.6, 0.9], delay: 0, size: 6,
                    shape: 'BURST_DIR', speed: [150, 350], vz: [300, 600], gravity: 2500, vRotation: [-10, 10], partAnim: { fadeOut: 0.4 } }),
            ],
        };
        const bid = `FX_CAST_BREAK_BURST_${f.key}`;
        out[bid] = {
            id: bid,
            emitters: [
                // 法術結構往外崩散、很快被重力拉下（原 SHARD 15～20 顆、gravity 4500）
                part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: f.ramp }, count: [6, 10], lifetime: [0.5, 0.8], delay: 0, size: 4,
                    shape: 'BURST_DIR', speed: [150, 400], vz: [400, 750], gravity: 4500, vRotation: [-12, 12], partAnim: { fadeOut: 0.4 } }),
                part({ particleType: 'PART', part: { kind: 'smoke', radius: 14, color: 'STEEL', roughness: 1, seed: 2 }, count: [3, 4], lifetime: [0.3, 0.5], delay: 0.02, size: 14,
                    shape: 'CIRCLE', shapeRadius: 10, speed: [40, 90], vz: [50, 140], drag: 0.05, partAnim: { scaleFrom: 0.6, scaleTo: 1.4, fadeIn: 0.15, fadeOut: 0.6, alpha: 0.5 } }),
            ],
        };
        for (let band = 0; band < AOE_BREAK.BANDS; band++) {
            const aid = `FX_AOE_BREAK_${f.key}_${band}`;
            const delay = band * AOE_BREAK.BAND_DELAY;
            out[aid] = {
                id: aid,
                emitters: [
                    // 預警格閃一次，再收縮熄滅
                    part({ particleType: 'PART_GROUND', part: { kind: 'ring', radius: 48, thickness: 4, ramp: f.ramp }, count: 1, lifetime: 0.3, delay, size: 48,
                        partAnim: { scaleFrom: 0.95, scaleTo: 0.55, fadeIn: 0.1, fadeOut: 0.7 } }),
                    // 沿格迸出的六角碎片
                    part({ particleType: 'PART_DEBRIS', part: { kind: 'shard', size: 4, shape: 'hex', ramp: f.ramp }, count: [1, 2], lifetime: [0.4, 0.6], delay, size: 4,
                        shape: 'CIRCLE', shapeRadius: 30, speed: [20, 60], vz: [150, 300], gravity: 2000, vRotation: [-8, 8], partAnim: { fadeOut: 0.5 } }),
                ],
            };
        }
    }
    return out;
}

export const CAST_BREAK_VFX: Record<string, VFXAsset> = buildCastBreak();
