/**
 * 特效零件色階 SSOT（ART_SPEC §3.2、§5）。
 * 每個色階只有三階：core（最亮）→ main（主色）→ dark（暗部）。零件一律由 core 往外變暗，不做彩虹過渡。
 * LION_* ＝ 獅心騎士團（BLUE），ASH_* ＝ 灰燼軍團（RED）。
 */

export interface VFXRamp {
    core: string;
    main: string;
    dark: string;
}

export const VFX_RAMPS = {
    LION_PHYSICAL: { core: '#ffffff', main: '#cbd5e1', dark: '#1e3a8a' },
    LION_HOLY: { core: '#fffbeb', main: '#fbbf24', dark: '#ea580c' },
    LION_LIGHTNING: { core: '#fffbeb', main: '#fbbf24', dark: '#3b82f6' },
    LION_ICE: { core: '#ffffff', main: '#67e8f9', dark: '#1e3a8a' },
    LION_ARCANE: { core: '#ffffff', main: '#3b82f6', dark: '#1e3a8a' },
    LION_VOID: { core: '#ffffff', main: '#6366f1', dark: '#1e3a8a' },
    ASH_PHYSICAL: { core: '#e7e5e4', main: '#7c2d12', dark: '#1c1917' },
    ASH_BLOOD: { core: '#fca5a5', main: '#dc2626', dark: '#7f1d1d' },
    ASH_FIRE: { core: '#fde68a', main: '#f97316', dark: '#dc2626' },
    ASH_POISON: { core: '#d9f99d', main: '#84cc16', dark: '#365314' },
    ASH_VOID: { core: '#f0abfc', main: '#7e22ce', dark: '#2e1065' },
    /** 狀態專用中性色階（data/vfx/status_parts.ts）：不屬於任何陣營，兩隊看到同一個顏色 = 同一個狀態 */
    STATUS_SLATE: { core: '#f1f5f9', main: '#94a3b8', dark: '#334155' },
    STATUS_PINK: { core: '#fff1f2', main: '#f9a8d4', dark: '#9d174d' },
    STATUS_GREEN: { core: '#f0fdf4', main: '#4ade80', dark: '#166534' },
    /**
     * 狀態色帶（依 MMO／FFT 的控制種類慣例配色，不借陣營色；兩隊看到同一個顏色＝同一個狀態）。
     * 硬控各有不同色相：暈眩金黃、沉默藍紫、禁錮綠棕、恐懼暗紫黑、嘲諷紅、變羊粉、放逐蒼白青灰、凝滯琥珀、凍結冰青；
     * 弱減益：致盲灰、緩速霜藍（比凍結暗、飽和度低）、易傷橘紅；週期：燃燒橘、中毒綠；
     * 增益：再生草綠、加速青白、反傷銀白、吸血深紅、無敵金白、護盾藍。
     */
    STATUS_GOLD: { core: '#fffbeb', main: '#facc15', dark: '#a16207' },
    STATUS_VIOLET: { core: '#ede9fe', main: '#818cf8', dark: '#3730a3' },
    STATUS_VINE: { core: '#ecfccb', main: '#65a30d', dark: '#713f12' },
    STATUS_DREAD: { core: '#c4b5fd', main: '#4c1d95', dark: '#0f0720' },
    STATUS_RED: { core: '#fecaca', main: '#ef4444', dark: '#7f1d1d' },
    STATUS_GHOST: { core: '#f8fafc', main: '#a5c3cf', dark: '#475b66' },
    STATUS_AMBER: { core: '#fffbeb', main: '#f59e0b', dark: '#92400e' },
    STATUS_ICE: { core: '#ffffff', main: '#67e8f9', dark: '#0e7490' },
    STATUS_FROST: { core: '#e2e8f0', main: '#7a9cc0', dark: '#334155' },
    STATUS_CRACK: { core: '#ffedd5', main: '#ea580c', dark: '#7c2d12' },
    STATUS_BURN: { core: '#fde68a', main: '#f97316', dark: '#dc2626' },
    STATUS_POISON: { core: '#d9f99d', main: '#84cc16', dark: '#365314' },
    STATUS_WIND: { core: '#ffffff', main: '#a5f3fc', dark: '#0891b2' },
    STATUS_SILVER: { core: '#ffffff', main: '#e2e8f0', dark: '#64748b' },
    STATUS_CRIMSON: { core: '#fecdd3', main: '#be123c', dark: '#4c0519' },
    STATUS_RADIANT: { core: '#ffffff', main: '#fde68a', dark: '#d97706' },
    /** 護盾稜柱（兩隊同色；陣營只出現在掃描環，factionSkin.shield.accentRamp） */
    STATUS_SKY: { core: '#f0f9ff', main: '#bae6fd', dark: '#0369a1' },
    /** 天氣（地圖氛圍，data/vfx/terrainAmbience.ts WEATHER_AMBIENCE）：不屬於任何陣營 */
    WEATHER_SNOW: { core: '#ffffff', main: '#e0f2fe', dark: '#7dd3fc' },
    WEATHER_EMBER: { core: '#fff7cc', main: '#f59e0b', dark: '#b91c1c' },
    WEATHER_SPORE: { core: '#f7fee7', main: '#bef264', dark: '#3f6212' },
    WEATHER_SPORE_VIOLET: { core: '#faf5ff', main: '#c084fc', dark: '#581c87' },
    WEATHER_SAND: { core: '#fef3c7', main: '#fcd34d', dark: '#b45309' },
    WEATHER_VOID: { core: '#e9d5ff', main: '#7e22ce', dark: '#1e0b3b' },
    /** 地圖氛圍層（T3）：森林霧氣、光柱 */
    WEATHER_MIST: { core: '#f0fdf4', main: '#bbf7d0', dark: '#14532d' },
    WEATHER_SUN: { core: '#fffbea', main: '#fde68a', dark: '#a16207' },
} as const satisfies Record<string, VFXRamp>;

export type VFXRampId = keyof typeof VFX_RAMPS;

/**
 * 實體物質色階（血、瘴氣、深淵黑）：一律用一般混合（ART_SPEC §10-4）。
 * 加法混合下暗色等於透明，深淵與血的主形狀會消失。
 */
export const VFX_SOLID_RAMPS: readonly VFXRampId[] = ['ASH_BLOOD', 'ASH_POISON', 'ASH_VOID', 'STATUS_DREAD'];

/** 中性色：只用於碎屑與煙（ART_SPEC §3.2 規則）。 */
export const VFX_NEUTRALS = {
    STEEL: '#cbd5e1',
    BONE: '#e7e5e4',
    ASH: '#57534e',
    CHAR: '#1c1917',
    DUST: '#a8a29e',
    MIASMA: '#4d7c0f',
} as const;

export type VFXNeutralId = keyof typeof VFX_NEUTRALS;

/** 奧義命中光爆三階色表，保留既有色值。 */
export const ULT_IMPACT_COLORS = {
    /** 藍方光爆中心顏色（CSS 色值） */
    BLUE_CORE: '#ffffff',
    /** 藍方光爆中段顏色（CSS 色值） */
    BLUE_MID: '#93c5fd',
    /** 藍方光爆外緣顏色（CSS 色值） */
    BLUE_EDGE: '#2563eb',
    /** 紅方光爆中心顏色（CSS 色值） */
    RED_CORE: '#ffffff',
    /** 紅方光爆中段顏色（CSS 色值） */
    RED_MID: '#fdba74',
    /** 紅方光爆外緣顏色（CSS 色值） */
    RED_EDGE: '#dc2626',
    /** 中性光爆中心顏色（CSS 色值） */
    NEUTRAL_CORE: '#ffffff',
    /** 中性光爆中段顏色（CSS 色值） */
    NEUTRAL_MID: '#e2e8f0',
    /** 中性光爆外緣顏色（CSS 色值） */
    NEUTRAL_EDGE: '#94a3b8',
} as const;
