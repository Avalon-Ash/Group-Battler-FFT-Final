// ╔══════════════════════════════════════════════════════════╗
// ║  hazard_visuals — 持續性空間危害的六角零件版視覺表（SSOT）   ║
// ║  職責：每種危害（SpatialHazard.type）每格畫哪些零件層、中心  ║
// ║        格另外畫什麼、生成那一下播哪個登記特效                 ║
// ║  上游：parts/partLayer（零件層格式）、PartSpec、vfxPalette   ║
// ║  下游：HazardPainter（只做 drawImage／alpha／變換）；         ║
// ║        EventVFXMapper（spawnVfx）                            ║
// ║  [ARCH] 錨點＝格子頂面中心（GridRenderStrategy 的 op.ty，已含 ║
// ║  漂浮）＋ Z_LAYERS.HAZARD 偏移（RenderSpec §2、§3）。危害在   ║
// ║  格子自己的 HAZARD op 繪製、不做鋪設（RenderSpec §9），所以   ║
// ║  flat 層的半徑 ≤ HAZARD_RENDER.FLAT_MAX_RADIUS（待在那格內）；║
// ║  垂直的層（火舌、煙、冰晶）可以往上長。顏色是危害種類的辨識  ║
// ║  色，兩隊相同（同一個顏色＝同一種危害）。                    ║
// ╚══════════════════════════════════════════════════════════╝

import type { PartLayer } from './parts/partLayer';
import type { SpatialHazard } from '../../types';

export type HazardType = SpatialHazard['type'];

export interface HazardVisualDef {
    /** 液面底：地形液面的循環影格快取（TerrainLoopAtlas），time × speed 播放 */
    liquid?: { color: string; intensity: number; speed: number };
    /** 每格的零件層（錨點＝格子頂面中心） */
    layers: readonly PartLayer[];
    /** 只畫在危害中心格（SpatialHazard.centerQ／centerR）的零件層：例如重力漩渦 */
    centerLayers?: readonly PartLayer[];
    /** 危害出現那一下播的登記特效（EventVFXMapper）；沒有就播 FX_HAZARD_FIELD_<type> */
    spawnVfx?: string;
}

export const HAZARD_RENDER = {
    /** 最後幾秒淡出 */
    FADE_SEC: 0.8,
    /** flat 層的半徑上限（px）：六角內切圓 ≈ HEX_SIZE × 0.866 = 41.6 */
    FLAT_MAX_RADIUS: 40,
    /** 品質階層 ≥ 此值時略過 decor 層 */
    DECOR_CUT_TIER: 2,
} as const;

export const HAZARD_VISUALS: Record<HazardType, HazardVisualDef> = {
    /** 熔岩：液面＋發光裂紋＋地面光＋竄起的火舌與餘燼。火舌用一般混合：加法疊在藍色地面上，紅色外焰會變紫 */
    FIRE: {
        liquid: { color: '#ea580c', intensity: 1, speed: 3 },
        layers: [
            { spec: { kind: 'glow', radius: 40, ramp: 'ASH_FIRE' }, flat: true, alpha: 0.28, pulse: { amp: 0.06, hz: 1.2 } },
            { spec: { kind: 'rays', radius: 32, count: 7, ramp: 'ASH_FIRE', lengthJitter: 0.75, seed: 1 }, flat: true, alpha: 0.7 },
            { spec: { kind: 'flame', height: 26, ramp: 'ASH_FIRE', jagged: true }, count: 3, orbitRadius: 14, rise: { height: 14, period: 1.1 }, alpha: 0.9, blend: 'source-over' },
            { spec: { kind: 'glow', radius: 3, ramp: 'ASH_FIRE', hard: true }, count: 4, orbitRadius: 20, rise: { height: 46, period: 1.6 }, alpha: 0.9, decor: true },
        ],
        spawnVfx: 'FX_HIT_RED_MAGMA',
    },
    /** 毒沼：綠色地面光＋貼地翻滾的瘴氣＋上升的煙與氣泡 */
    POISON: {
        layers: [
            { spec: { kind: 'glow', radius: 40, ramp: 'ASH_POISON' }, flat: true, alpha: 0.4 },
            { spec: { kind: 'smoke', radius: 24, color: 'MIASMA', roughness: 0.5, seed: 2 }, flat: true, count: 3, orbitRadius: 12, orbitSpeed: 0.4, spin: 0.3, alpha: 0.6 },
            { spec: { kind: 'smoke', radius: 16, color: 'MIASMA', roughness: 0.5, seed: 3 }, count: 2, orbitRadius: 12, rise: { height: 28, period: 2.4 }, alpha: 0.5, decor: true },
            { spec: { kind: 'glow', radius: 3, ramp: 'ASH_POISON', hard: true }, count: 3, orbitRadius: 18, rise: { height: 12, period: 1.3 }, alpha: 0.9, decor: true },
        ],
        spawnVfx: 'FX_HIT_RED_FEL',
    },
    /** 冰封：冰藍地面光＋矮冰塊（實心稜柱）＋冰晶與閃光 */
    ICE: {
        layers: [
            { spec: { kind: 'glow', radius: 40, ramp: 'LION_ICE' }, flat: true, alpha: 0.35 },
            { spec: { kind: 'prism', radius: 38, height: 8, ramp: 'LION_ICE', style: 'solid' }, alpha: 0.7 },
            { spec: { kind: 'shard', size: 14, shape: 'crystal', ramp: 'LION_ICE' }, count: 3, orbitRadius: 16, lift: 12, alpha: 0.95 },
            { spec: { kind: 'glow', radius: 5, ramp: 'LION_ICE', hard: true }, lift: 20, pulse: { amp: 0.4, hz: 0.7 }, alpha: 0.7, decor: true },
        ],
        spawnVfx: 'FX_HIT_BLUE_ICE',
    },
    /** 重力場：每格是暗色地斑＋反轉的粗糙環；中心格另有三臂漩渦、黑色核心與被吸入的光點 */
    GRAVITY: {
        layers: [
            { spec: { kind: 'smoke', radius: 34, color: 'CHAR', roughness: 0.25, seed: 1 }, flat: true, alpha: 0.5 },
            { spec: { kind: 'ring', radius: 30, thickness: 3, ramp: 'ASH_VOID', roughness: 0.5, seed: 2 }, flat: true, spin: -1.5, alpha: 0.7 },
        ],
        // 2026-10-19 實機回饋「漩渦有點弱」：紫色底光＋粗外臂＋反轉內臂＋向心放射紋，黑色核心加大
        centerLayers: [
            { spec: { kind: 'glow', radius: 40, ramp: 'ASH_VOID' }, flat: true, alpha: 0.6, pulse: { amp: 0.08, hz: 1.5 } },
            { spec: { kind: 'rays', radius: 40, count: 9, ramp: 'LION_VOID', lengthJitter: 0.5, seed: 3 }, flat: true, spin: -2, alpha: 0.55 },
            { spec: { kind: 'slashArc', radius: 38, arcDeg: 90, thickness: 9, ramp: 'LION_VOID' }, flat: true, count: 3, spin: 3.5, alpha: 1 },
            { spec: { kind: 'slashArc', radius: 24, arcDeg: 70, thickness: 5, ramp: 'ASH_VOID' }, flat: true, count: 3, spin: -5, alpha: 0.9 },
            { spec: { kind: 'smoke', radius: 22, color: 'CHAR', roughness: 0, seed: 0 }, flat: true, alpha: 1 },
            { spec: { kind: 'glow', radius: 3, ramp: 'LION_VOID', hard: true }, count: 6, orbitRadius: 28, orbitSpeed: 3.2, lift: 6, alpha: 1, decor: true },
        ],
        spawnVfx: 'FX_HIT_RED_SHADOW',
    },
    /** 一般場：灰色地面光＋淡淡的塵霧 */
    GENERIC: {
        layers: [
            { spec: { kind: 'glow', radius: 36, ramp: 'STATUS_SLATE' }, flat: true, alpha: 0.35 },
            { spec: { kind: 'smoke', radius: 22, color: 'DUST', roughness: 0.5, seed: 1 }, flat: true, count: 2, orbitRadius: 10, orbitSpeed: 0.3, alpha: 0.4 },
        ],
    },
};
