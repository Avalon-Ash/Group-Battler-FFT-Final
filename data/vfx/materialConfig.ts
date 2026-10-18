/**
 * MATERIAL SSOT
 * -----------------------------------------------------------------------------
 * 烘焙期材質參數（地形顆粒、障礙物風化、棋座 Token、危害裂痕噪聲、色調分級）集中一處。
 * 只在烘焙時讀（MaterialPainter、NoiseLib、VFXFactory CRACKS）；TerrainBlockCache 以地形欄位簽章偵測即時調參並重烘。
 * 特效外觀不在這裡：零件參數在 data/vfx/parts/（VFX_PARTS、VFX_RAMPS）。
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

export interface SurfaceGrainConfig {
    enabled: boolean;
    /** fbm 設定（threshold/softness 在灰階顆粒模式下不使用裁切，僅控制對比） */
    octaves: number;
    frequency: number;
    persistence: number;
    lacunarity: number;
    /** 疊加強度（0~1），越高顆粒越明顯 */
    strength: number;
    /** 亮暗擺幅（0~1），0.5 = 全幅 */
    contrast: number;
    /** 變體張數，用 hash(q,r) 選張，避免整張地圖同一塊紋理 */
    variants: number;
    /** 變體之間的整體明度偏移量（0~1），製造區塊色差 */
    tintSpread: number;
    /** 邊緣環境遮蔽強度（0 = 關閉），讓每格讀起來是獨立方塊 */
    edgeAO: number;
    /** 邊緣遮蔽作用的環帶寬度（相對半徑） */
    edgeBand: number;
}

export interface UnitTokenConfig {
    enabled: boolean;
    grainStrength: number;
    edgeGlow: number;
}

export const MATERIAL_CONFIG = {
    /** 全域開關：false 時所有新材質回退到舊繪法，方便 A/B 比對 */
    enabled: true,

    /** 離屏噪聲遮罩解析度（越低越省記憶體，128 足夠 hex 尺度） */
    maskResolution: 128,


    /**
     * 地形頂面顆粒：整場戰鬥覆蓋面積最大的材質。
     * 一次烘焙 N 張 hex 形狀的灰階顆粒貼圖，每帧只做一次 drawImage（overlay 混合），
     * 等價於對方在 shader 裡對地面套 detail noise，但成本從 per-pixel 降到 per-tile blit。
     */
    terrain: {
        grain: {
            enabled: true,
            octaves: 4,
            frequency: 7.5,
            persistence: 0.52,
            lacunarity: 2.0,
            strength: 0.42,
            contrast: 0.34,
            variants: 4,
            tintSpread: 0.10,
            edgeAO: 0.30,
            edgeBand: 0.28,
        } as SurfaceGrainConfig,
        /** 側面（pedestal）垂直岩紋強度，0 = 關閉 */
        sideGrain: 0.22,
    },

    /**
     * 障礙物 sprite 風化：sprite 本身已經有 cache，所以這是純烘焙期成本，
     * 執行期零開銷。用 source-atop 只作用在既有像素上，不會溢出輪廓。
     */
    environment: {
        grain: {
            enabled: true,
            octaves: 5,
            frequency: 6.0,
            persistence: 0.55,
            lacunarity: 2.1,
            strength: 0.46,
            contrast: 0.48,
            variants: 1,
            tintSpread: 0,
            edgeAO: 0,
            edgeBand: 0,
        } as SurfaceGrainConfig,
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
    },

    /** 棋座 Token 烘焙期風化（MaterialPainter.weatherToken） */
    unit: {
        token: {
            enabled: true,
            grainStrength: 0.28,
            edgeGlow: 0.20,
        } as UnitTokenConfig,
    },

    /** 最終合成色調分級（對應對方的 post-processing tone pass） */
    grade: {
        enabled: true,
        contrast: 1.06,
        saturate: 1.12,
        brightness: 1.02,
    },
};

