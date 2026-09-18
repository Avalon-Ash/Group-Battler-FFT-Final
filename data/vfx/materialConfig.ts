/**
 * MATERIAL SSOT
 * -----------------------------------------------------------------------------
 * 移植 LinearAbilityCastingThreeJS 的 `config/settings.js` 設計原則：
 * 所有程序化材質參數集中一處，繪製端每次呼叫時即時讀取，
 * 因此暫停狀態下修改本物件（或由外部編輯器寫入）下一帧立即生效。
 *
 * 規則：
 *  - 這裡只放「視覺表現」參數，不放戰鬥數值。
 *  - 任何 painter 不得自行寫死魔術數字，一律引用本檔。
 */

export interface NoiseFieldConfig {
    /** fbm 疊加層數，越高越細碎（成本線性增加） */
    octaves: number;
    /** 基礎格點密度，越高紋理越細 */
    frequency: number;
    /** 每層振幅衰減 */
    persistence: number;
    /** 每層頻率放大 */
    lacunarity: number;
    /** 遮罩裁切門檻，低於此值視為透明 */
    threshold: number;
    /** 門檻邊緣的軟化寬度（0 = 硬邊） */
    softness: number;
}

export interface RibbonConfig {
    /** 中點位移遞迴深度（2^depth 段） */
    subdivisions: number;
    /** 初始橫向抖動幅度（px） */
    displacement: number;
    /** 每層遞迴的抖動衰減 */
    roughness: number;
    /** 分岔機率 */
    branchChance: number;
    /** 分岔長度比例 */
    branchScale: number;
    /** 疊繪層數（由粗到細、由暗到亮） */
    layers: number;
    glowBlur: number;
}

export interface BeamCoreConfig {
    /** 同心管層數 */
    tubes: number;
    /** 每層相對寬度倍率 */
    tubeFalloff: number;
    /** 外層螺旋緞帶的虛線長度 */
    dash: [number, number];
    /** 緞帶滾動速度（px/s） */
    scrollSpeed: number;
    /** 核心寬度呼吸振幅 */
    breathe: number;
}

export const MATERIAL_CONFIG = {
    /** 全域開關：false 時所有新材質回退到舊繪法，方便 A/B 比對 */
    enabled: true,

    /** 離屏噪聲遮罩解析度（越低越省記憶體，128 足夠 hex 尺度） */
    maskResolution: 128,

    ice: {
        noise: {
            octaves: 4,
            frequency: 5.0,
            persistence: 0.5,
            lacunarity: 2.0,
            threshold: 0.30,
            softness: 0.28,
        } as NoiseFieldConfig,
        /** 冰面底色（低飽和藍） */
        baseColor: 'rgba(186, 230, 253, 0.55)',
        /** 晶稜描邊色 */
        edgeColor: '#7dd3fc',
        /** 高光色 */
        specColor: 'rgba(255,255,255,0.85)',
        /** 晶稜條數 */
        facets: 7,
        /** 晶稜長度相對半徑 */
        facetLength: 0.82,
    },

    scorch: {
        noise: {
            octaves: 5,
            frequency: 6.5,
            persistence: 0.55,
            lacunarity: 2.1,
            threshold: 0.32,
            softness: 0.30,
        } as NoiseFieldConfig,
        /** 熔岩裂縫亮邊色 */
        emberColor: '#fdba74',
        crackWidth: 2,
        crackCount: 4,
    },

    lightning: {
        ribbon: {
            subdivisions: 5,
            displacement: 26,
            roughness: 0.55,
            branchChance: 0.28,
            branchScale: 0.45,
            layers: 3,
            glowBlur: 12,
        } as RibbonConfig,
    },

    beam: {
        core: {
            tubes: 3,
            tubeFalloff: 0.55,
            dash: [20, 12] as [number, number],
            scrollSpeed: 520,
            breathe: 0.08,
        } as BeamCoreConfig,
    },

    /** 殘影拖尾：以遞減 alpha 疊繪近似動態模糊 */
    motionTrail: {
        enabled: true,
        samples: 3,
        /** 每層往速度反方向的位移比例 */
        stride: 0.35,
        /** 每層 alpha 衰減 */
        falloff: 0.45,
    },

    /** 最終合成色調分級（對應對方的 post-processing tone pass） */
    grade: {
        enabled: true,
        contrast: 1.06,
        saturate: 1.12,
        brightness: 1.02,
    },
};

export type MaterialConfig = typeof MATERIAL_CONFIG;
