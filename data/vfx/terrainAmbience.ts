/**
 * TERRAIN AMBIENCE SSOT (R2)
 * -----------------------------------------------------------------------------
 * 地表氛圍效果的單一設定表：
 *  - TERRAIN_AMBIENCE：以地形類型為鍵，記錄該地形的地表細節（種類、是否烘焙、參數、循環週期與影格數）
 *    與熔岩液面（顏色、強度）。
 *  - TERRAIN_LIQUID：液面循環影格的共用參數（HazardPainter 也經由 drawLiquid 使用）。
 *  - WEATHER_AMBIENCE / WEATHER_BOUNDS：以 ambientType 為鍵的天氣粒子參數與生成範圍。
 *
 * 規則：
 *  - 靜態細節（baked: true）烘進地形 sprite；動態效果（baked: false）預渲染成循環影格，
 *    執行期每格每幀只做一次 drawImage。
 *  - 循環週期內所有動作都必須是週期函數（頭尾影格無縫銜接）。
 *  - 修改本檔數值後，若頁面已在跑，需呼叫 TerrainLoopAtlas.reset()（或重新整理）才會重烘；
 *    烘焙型細節則隨地形 sprite 快取重烘（改貼圖版本或重整）。
 */
import type {
    AmbienceWeatherType,
    GrassDetailConfig,
    IceSheenDetailConfig,
    LiquidLoopConfig,
    RunesDetailConfig,
    SandRipplesDetailConfig,
    TerrainAmbienceBiome,
    TerrainAmbienceEntry,
    TerrainDecorConfig,
    WeatherAmbienceConfig,
    WeatherBoundsConfig,
} from '../../types';
import type { PartAnim } from '../../types/VFXSchema';

const TWO_PI = Math.PI * 2;

/** 冰面反光：高光帶沿對角線滑過整格，slide = u * wrap - offset，u 為週期內進度（0..1） */
const ICE_SLIDE_SPEED = 0.5;
const ICE_SLIDE_WRAP = 2.5;
/** 草叢風擺角速度（rad/s）；週期 = 2π / 角速度 */
const GRASS_WIND_OMEGA = 1.2;

export const GRASS_DETAIL: GrassDetailConfig = {
    kind: 'GRASS',
    baked: false,
    loop: { period: TWO_PI / GRASS_WIND_OMEGA, frames: 16 },
    fallbackColor: '#14532d',
    // 3 叢草相對格心的位置與使用的草叢精靈編號（精靈編號會隨地形 variant 輪替，variant 0 與舊版一致）
    tufts: [
        { x: -14, y: -2, sprite: 1 },
        { x: 12, y: 4, sprite: 2 },
        { x: -2, y: 14, sprite: 3 },
    ],
    // 風擺幅度（px）；xPhase（rad/px）讓不同位置的格子相位錯開，形成風吹過草地的波浪
    windAmplitude: 4,
    windXPhase: 0.05,
    // 單叢草精靈（VFXFactory.getGrassSprite）的繪製參數
    sprite: {
        size: 64,
        anchorX: 32,
        anchorY: 48,
        scaleBase: 0.8,
        scaleStep: 0.1,
        scaleCycle: 5,
        bladeHeight: 22,
        bladeWidth: 6,
        shadowRadiusMul: 2,
        shadowColor: 'rgba(0,0,0,0.35)',
        rootColor: 'rgba(0,0,0,0.4)',
        tipColor: '#ffffff',
        midStop: 0.5,
        curveCtrl: 0.5,
    },
    // 2026-10-19：KayKit 草叢／灌木預渲染（tools/assets/blender/render_obstacle.py DECOR_GRASS），風擺改為以底部為軸的斜切
    decor: { type: 'DECOR_GRASS', bakeScale: 2, scale: 1, frameStep: 2, countByVariant: [2, 1, 3, 1] },
};

export const ICE_SHEEN: IceSheenDetailConfig = {
    kind: 'ICE_SHEEN',
    baked: false,
    loop: { period: ICE_SLIDE_WRAP / ICE_SLIDE_SPEED, frames: 24 },
    // 裁切六角形半徑 = HEX_SIZE * radiusRatio
    radiusRatio: 0.9,
    // 漸層軸長 = HEX_SIZE * gradientSpan（從 (-w,-w) 到 (w,w)）
    gradientSpan: 2,
    slideWrap: ICE_SLIDE_WRAP,
    slideOffset: 0.7,
    bandHalfWidth: 0.3,
    bandPeakColor: 'rgba(255,255,255,0.25)',
    bandEdgeColor: 'rgba(255,255,255,0)',
    // 固定的兩道刮痕（線段 x1,y1,x2,y2）
    scratchColor: 'rgba(255,255,255,0.1)',
    scratchWidth: 1,
    scratches: [
        [-5, 5, 5, -5],
        [2, 8, 8, 4],
    ],
    framePad: 2,
};

export const SAND_RIPPLES: SandRipplesDetailConfig = {
    kind: 'SAND_RIPPLES',
    baked: true,
    fallbackColor: '#92400e',
    lineWidth: 1.5,
    alpha: 0.15,
    // 三條沙紋：列索引 -1..1，列距（等距壓縮後的像素）
    rowFrom: -1,
    rowTo: 1,
    rowSpacing: 8,
    // 每條沙紋的橫向範圍與取樣間隔
    xFrom: -15,
    xTo: 15,
    xStep: 5,
    waveFrequency: 0.3,
    waveAmplitude: 2,
    // 沙紋整體垂直偏移 = offsetAmplitude * variantPhases[variant % length]
    offsetAmplitude: 5,
    variantPhases: [-0.9, -0.3, 0.4, 0.95],
};

export const VOID_RUNES: RunesDetailConfig = {
    kind: 'RUNES',
    baked: true,
    // 哪些 variant 的格子帶有紋路（索引 = variant % length）
    variantMask: [true, false, true, false],
    arms: 4,
    armLength: 8,
    lineWidth: 1,
    alpha: 0.3,
};

/** 靜態裝飾擺放點（前半格；見 TerrainDecorConfig） */
const DECOR_SPOTS = [
    { x: 13, y: 6 },
    { x: -15, y: 9 },
    { x: 2, y: 15 },
] as const;

export const SAND_PEBBLES: TerrainDecorConfig = { type: 'DECOR_PEBBLE', scale: 1, spots: DECOR_SPOTS, countByVariant: [2, 0, 1, 1] };
export const ICE_SHARDS: TerrainDecorConfig = { type: 'DECOR_ICE', scale: 1, spots: DECOR_SPOTS, countByVariant: [1, 0, 2, 0] };
export const VOID_RUBBLE: TerrainDecorConfig = { type: 'DECOR_RUBBLE', scale: 1, spots: DECOR_SPOTS, countByVariant: [0, 1, 0, 1] };

export const TERRAIN_AMBIENCE: Readonly<Record<TerrainAmbienceBiome, TerrainAmbienceEntry>> = {
    VOID: { detail: VOID_RUNES, liquid: null, decor: VOID_RUBBLE },
    FOREST: { detail: GRASS_DETAIL, liquid: null, decor: null },
    ICE: { detail: ICE_SHEEN, liquid: null, decor: ICE_SHARDS },
    // 熔岩：地塊頂面疊一層循環液面
    MAGMA: { detail: { kind: 'NONE', baked: false }, liquid: { color: '#ef4444', intensity: 1.0 }, decor: null },
    DESERT: { detail: SAND_RIPPLES, liquid: null, decor: SAND_PEBBLES },
};

const TERRAIN_AMBIENCE_BY_NAME: Readonly<Record<string, TerrainAmbienceEntry | undefined>> = TERRAIN_AMBIENCE;

/** 以地形類型字串取設定；未登記的類型回傳 undefined */
export function getTerrainAmbience(type: string): TerrainAmbienceEntry | undefined {
    return TERRAIN_AMBIENCE_BY_NAME[type];
}

/** 液面循環影格的共用參數：drawLiquid（地塊熔岩與 HazardPainter 的液態危害區）共用 */
export const TERRAIN_LIQUID: LiquidLoopConfig = {
    // 週期內所有動作的諧波數 k 必須是整數（角速度 = 2π * k / period）
    loop: { period: 10, frames: 48 },
    radiusRatio: 0.9,
    pad: 2,
    baseAlpha: 0.95,
    // 強度量化步距：同色同 layout 只在此步距的整數倍各存一組循環影格
    intensityStep: 0.1,
    bakeScale: 2,
    variants: 4,
    // 熔體：中心偏金黃、往外是基準色、岸邊壓暗（2026-10-19 重繪：取代單色橢圓）
    melt: { coreColor: '#ffe08a', coreMix: 0.8, hotColor: '#ff9a1f', hotMix: 0.55, edgeDarken: 0.45, coreStop: 0.15, hotStop: 0.55 },
    pulse: { harmonic: 2, amp: 0.12 },
    crust: { tile: 112, cells: 11, seed: 7, crack: 2.8, heat: 7, alpha: 0.92, color: '#2a0e08', heatColor: '#a8260c', grain: 0.18 },
    drift: { radius: 9, harmonic: 1, variantShift: 0.29 },
    bubbles: { count: 3, radius: 3.2, orbit: 0.45, harmonic: 2, alpha: 0.85, color: '#ffd27a' },
    rim: { color: 'rgba(20,4,2,0.55)', width: 2.5 },
};

/** 天氣粒子生成範圍（依地圖格數推算；無引擎時用 fallback） */
export const WEATHER_BOUNDS: WeatherBoundsConfig = {
    fallbackW: 2000,
    fallbackH: 1400,
    offsetX: -400,
    offsetY: -400,
    pxPerTile: 80,
    padding: 800,
    zMin: 50,
    zSpread: 400,
};

/**
 * 天氣粒子（T4，2026-10-19）：六角零件管線（PART 粒子，VFXAmbience 生成），取代程序化光點看板（ATMOSPHERE 型別已刪）。
 * 縮放＝粒子 size / partRadius；淡入淡出沿用舊看板的節奏（先維持再淡出、略為放大）。
 */
export const WEATHER_PART_ANIM: PartAnim = { scaleFrom: 0.9, scaleTo: 1.5, fadeIn: 0.1, fadeOut: 0.4, alpha: 0.55 };

export const WEATHER_AMBIENCE: Readonly<Record<AmbienceWeatherType, WeatherAmbienceConfig>> = {
    SNOW: {
        interval: 0.03,
        maxActive: 160,
        parts: [{ kind: 'glow', radius: 4, ramp: 'WEATHER_SNOW', hard: true }],
        partRadius: 4,
        alignToVelocity: false,
        primaryChance: 1,
        size: { min: 1.5, spread: 2.5 },
        vx: { min: 40, spread: 30 },
        vy: { min: 80, spread: 40 },
        life: 4.0,
        spawn: 'ANYWHERE',
        blendMode: 'source-over',
    },
    ASH: {
        interval: 0.03,
        maxActive: 200,
        parts: [{ kind: 'smoke', radius: 4, color: 'ASH' }, { kind: 'smoke', radius: 4, color: 'CHAR' }],
        partRadius: 4,
        alignToVelocity: false,
        primaryChance: 0.5,
        size: { min: 1, spread: 3 },
        vx: { min: 20, spread: 20 },
        vy: { min: 30, spread: 20 },
        life: 5.0,
        spawn: 'ANYWHERE',
        blendMode: 'source-over',
    },
    EMBER: {
        interval: 0.15,
        maxActive: 40,
        parts: [{ kind: 'glow', radius: 4, ramp: 'WEATHER_EMBER', hard: true }, { kind: 'spark', length: 8, ramp: 'WEATHER_EMBER' }],
        partRadius: 4,
        alignToVelocity: true,
        primaryChance: 0.5,
        size: { min: 1, spread: 2 },
        vx: { min: -20, spread: 40 },
        vy: { min: -70, spread: 30 },
        life: 2.5,
        spawn: 'ANYWHERE',
        blendMode: 'screen',
    },
    SPORES: {
        interval: 0.15,
        maxActive: 64,
        parts: [{ kind: 'glow', radius: 4, ramp: 'WEATHER_SPORE' }, { kind: 'glow', radius: 4, ramp: 'WEATHER_SPORE_VIOLET' }],
        partRadius: 3,
        alignToVelocity: false,
        primaryChance: 0.5,
        size: { min: 0.5, spread: 2.5 },
        vx: { min: -7.5, spread: 15 },
        vy: { min: -7.5, spread: 15 },
        life: 6.0,
        spawn: 'ANYWHERE',
        blendMode: 'screen',
    },
    SAND: {
        interval: 0.005,
        maxActive: 240,
        parts: [{ kind: 'spark', length: 12, ramp: 'WEATHER_SAND' }, { kind: 'spark', length: 8, ramp: 'WEATHER_SAND' }],
        partRadius: 2,
        alignToVelocity: true,
        primaryChance: 0.4,
        size: { min: 1, spread: 2 },
        vx: { min: 1200, spread: 600 },
        vy: { min: 50, spread: 30 },
        // life 為 null 時，壽命 = 生成範圍寬度 / vx：剛好飛越整個範圍
        life: null,
        spawn: 'LEFT_EDGE',
        blendMode: 'source-over',
    },
    VOID: {
        interval: 0.15,
        maxActive: 40,
        parts: [{ kind: 'glow', radius: 6, ramp: 'WEATHER_VOID' }, { kind: 'smoke', radius: 6, color: 'CHAR' }],
        partRadius: 4,
        alignToVelocity: false,
        primaryChance: 0.5,
        size: { min: 2, spread: 4 },
        vx: { min: -10, spread: 20 },
        vy: { min: -10, spread: 20 },
        life: 3.0,
        spawn: 'ANYWHERE',
        blendMode: 'screen',
    },
};

const WEATHER_AMBIENCE_BY_NAME: Readonly<Record<string, WeatherAmbienceConfig | undefined>> = WEATHER_AMBIENCE;

/** 以 ambientType 字串取天氣設定；'NONE'、'RAIN' 等未登記的類型回傳 undefined（不生成粒子） */
export function getWeatherAmbience(type: string): WeatherAmbienceConfig | undefined {
    return WEATHER_AMBIENCE_BY_NAME[type];
}
