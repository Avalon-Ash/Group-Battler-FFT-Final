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

export interface UnitArmorConfig {
    enabled: boolean;
    strength: number;      // 顆粒疊加強度
    contrast: number;      // 明暗對比
    specular: number;      // 邊緣高光強度
}

export interface UnitTokenConfig {
    enabled: boolean;
    grainStrength: number;
    edgeGlow: number;
}

export interface UnitMaterialConfig {
    armor: UnitArmorConfig;
    token: UnitTokenConfig;
}

export interface PoisonConfig {
    noise: NoiseFieldConfig;
    /** 酸液底色 */
    baseColor: string;
    /** 酸液池暗部漸層色 */
    deepColor: string;
    /** 氣泡主色 */
    bubbleColor: string;
    /** 氣泡高光/破裂邊緣 */
    bubbleGlowColor: string;
    /** 腐蝕邊緣強調色 */
    edgeColor: string;
    /** 確定性泡泡數量 */
    bubbleCount: number;
}

export interface VoidConfig {
    noise: NoiseFieldConfig;
    /** 事件視界中心（黑洞中心） */
    coreColor: string;
    /** 吸積深紫底層 */
    innerColor: string;
    /** 吸積盤強能量漸層色 */
    accretionColor: string;
    /** 外緣柔和能量光暈（替代 shadowBlur） */
    edgeGlowColor: string;
    /** 能量吸積環層數 */
    ringCount: number;
}

export interface ParticleNoiseConfig {
    slash: NoiseFieldConfig;
    fireball: NoiseFieldConfig;
    hexShard: NoiseFieldConfig;
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

    poison: {
        noise: {
            octaves: 4,
            frequency: 6.0,
            persistence: 0.52,
            lacunarity: 2.0,
            threshold: 0.28,
            softness: 0.30,
        } as NoiseFieldConfig,
        /** 酸液底色 */
        baseColor: 'rgba(16, 185, 129, 0.55)',
        /** 酸液池暗部漸層色 */
        deepColor: 'rgba(5, 46, 22, 0.85)',
        /** 氣泡主色（亮黃綠） */
        bubbleColor: '#bef264',
        /** 氣泡高光/破裂邊緣 */
        bubbleGlowColor: '#d9f99d',
        /** 腐蝕邊緣強調色 */
        edgeColor: '#22c55e',
        /** 確定性泡泡數量 */
        bubbleCount: 5,
    } as PoisonConfig,

    void: {
        noise: {
            octaves: 5,
            frequency: 5.5,
            persistence: 0.55,
            lacunarity: 2.1,
            threshold: 0.26,
            softness: 0.32,
        } as NoiseFieldConfig,
        /** 事件視界中心（黑洞中心純黑） */
        coreColor: '#05020a',
        /** 吸積深紫底層 */
        innerColor: 'rgba(26, 10, 46, 0.92)',
        /** 吸積盤強能量漸層色 */
        accretionColor: '#a855f7',
        /** 外緣柔和能量光暈（替代 shadowBlur） */
        edgeGlowColor: 'rgba(192, 132, 252, 0.75)',
        /** 能量吸積環層數 */
        ringCount: 3,
    } as VoidConfig,

    particles: {
        slash: {
            octaves: 4,
            frequency: 6.0,
            persistence: 0.5,
            lacunarity: 2.0,
            threshold: 0.25,
            softness: 0.35,
        } as NoiseFieldConfig,
        fireball: {
            octaves: 5,
            frequency: 6.5,
            persistence: 0.55,
            lacunarity: 2.1,
            threshold: 0.28,
            softness: 0.30,
        } as NoiseFieldConfig,
        hexShard: {
            octaves: 4,
            frequency: 5.0,
            persistence: 0.5,
            lacunarity: 2.0,
            threshold: 0.30,
            softness: 0.25,
        } as NoiseFieldConfig,
    } as ParticleNoiseConfig,

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

    /**
     * 角色與棋座材質管線（Pass 3）
     */
    unit: {
        armor: {
            enabled: true,
            strength: 0.35,      // 顆粒疊加強度
            contrast: 0.30,      // 明暗對比
            specular: 0.25,      // 邊緣高光強度
        } as UnitArmorConfig,
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

export type MaterialConfig = typeof MATERIAL_CONFIG;
