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
    /** 護盾稜柱（兩隊同色；陣營只出現在掃描環，factionSkin.shield.accentRamp） */
    STATUS_SKY: { core: '#f0f9ff', main: '#bae6fd', dark: '#0369a1' },
    /** 天氣（地圖氛圍，data/vfx/terrainAmbience.ts WEATHER_AMBIENCE）：不屬於任何陣營 */
    WEATHER_SNOW: { core: '#ffffff', main: '#e0f2fe', dark: '#7dd3fc' },
    WEATHER_EMBER: { core: '#fff7cc', main: '#f59e0b', dark: '#b91c1c' },
    WEATHER_SPORE: { core: '#f7fee7', main: '#bef264', dark: '#3f6212' },
    WEATHER_SPORE_VIOLET: { core: '#faf5ff', main: '#c084fc', dark: '#581c87' },
    WEATHER_SAND: { core: '#fef3c7', main: '#fcd34d', dark: '#b45309' },
    WEATHER_VOID: { core: '#e9d5ff', main: '#7e22ce', dark: '#1e0b3b' },
} as const satisfies Record<string, VFXRamp>;

export type VFXRampId = keyof typeof VFX_RAMPS;

/**
 * 實體物質色階（血、瘴氣、深淵黑）：一律用一般混合（ART_SPEC §10-4）。
 * 加法混合下暗色等於透明，深淵與血的主形狀會消失。
 */
export const VFX_SOLID_RAMPS: readonly VFXRampId[] = ['ASH_BLOOD', 'ASH_POISON', 'ASH_VOID'];

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
