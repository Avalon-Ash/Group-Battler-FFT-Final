// ╔══════════════════════════════════════════════════════════╗
// ║  constants/lighting.ts — 打光通道參數 SSOT（ADR 0029）      ║
// ║  唯一讀取者：engine/renderers/lighting/**。著色器不寫死    ║
// ║  任何外觀數值，全部由這張表經 uniform 傳入。               ║
// ║  長度單位是「世界像素」（相機縮放前，與 HexUtils.toPx 同   ║
// ║  一把尺）；著色器把它乘上相機縮放與 dpr，所以鏡頭拉近拉遠   ║
// ║  時光的大小跟著地圖走。顏色是線性 RGB。                    ║
// ║  開關不在這裡：RENDER_QUALITY.LIT_QUERY_KEY／LIT_DEFAULT_ON  ║
// ║  （進入點要讀；這張表只進延後載入的打光 chunk）。          ║
// ║  數值來源：tools/ui-e2e/lit-proto.mjs 的 LOOK（原型在縮放   ║
// ║  0.857 的畫面上以螢幕像素調，這裡已除以 0.857 換成世界像素）。║
// ╚══════════════════════════════════════════════════════════╝

type RGB = readonly [number, number, number];

/** 打光外觀：一個群系一份；BIOME 只寫和 BASE 不同的欄位 */
export interface LightingLook {
    /** 環境光（沒有任何光照到的地方的顏色與亮度） */
    ambient: RGB;
    /** 月光顏色與強度（強度乘在顏色上） */
    moonColor: RGB;
    moonIntensity: number;
    /** 指向月亮的方向（地面座標：x 右、y 朝鏡頭、z 上），不必正規化 */
    moonDir: RGB;
    /** 背景（天空）不打光，只調色：背景色 ×（ambient × skyAmbient ＋ 月光色 × skyMoon） */
    skyAmbient: number;
    skyMoon: number;
    /** 曝光（色調映射前的整體倍率） */
    exposure: number;
}

export const LIGHTING = {
    /** 一幀最多幾盞點光（instance 緩衝的大小）；超過的照 agents 順序截掉 */
    MAX_LIGHTS: 64,

    /** 單位腳前的暖色點光 */
    UNIT_LIGHT: {
        /** 依陣營（Team 列舉值）的光色；沒列到的陣營用 FALLBACK */
        COLOR: { 0: [1.0, 0.70, 0.38], 1: [1.0, 0.46, 0.22] } as Readonly<Record<number, RGB>>,
        FALLBACK: [1.0, 0.60, 0.30] as RGB,
        INTENSITY: 3.6,
        /** 照得到的最遠距離（世界像素，地面平面上） */
        RANGE: 280,
        /** 光源離地高度 */
        HEIGHT: 35,
        /** 光源從腳底往鏡頭方向（地面 y）偏移，讓單位正面受光 */
        FRONT: 47,
        /** 衰減曲線的膝點：距離到 RANGE × sqrt(KNEE) 時亮度約減半；越小光越集中在腳邊 */
        KNEE: 0.06,
    },

    /**
     * 遮罩畫布（單位、特效、玩法標示各一張）相對主畫布的解析度。遮罩只用來分辨「這個像素是單位／特效／環境」，
     * 半解析度的邊緣夠用，記憶體與上傳量是全解析度的四分之一。
     */
    MASK_SCALE: 0.5,
    /** 環境（地形、障礙物、背景）打光前保留的彩度；單位與特效保留原彩度 */
    ENV_CHROMA: 0.5,
    /** 特效像素的亮度倍率（HDR，不受環境光壓暗；超過 1 的部分進泛光） */
    EMISSIVE_GAIN: 2.2,
    /** 玩法標示（射程、預警、縮圈格）的亮度倍率：不受光，維持接近原本畫出來的亮度 */
    INFO_GAIN: 1.0,

    BLOOM: {
        /** HDR 亮度超過這個值才進泛光 */
        THRESHOLD: 1.15,
        STRENGTH: 0.55,
        /** 泛光貼圖相對畫面的縮小倍率 */
        DOWNSCALE: 2,
        /** 模糊來回的次數（每次一橫一直）與每次的取樣步長增量 */
        PASSES: 2,
        STEP_GROW: 1.5,
    },

    /** 暗部偏藍、亮部偏暖的幅度 */
    SPLIT_TONE: 0.07,
    /** 畫面四角壓暗的幅度（0＝不壓） */
    VIGNETTE: 0.42,

    /** 所有群系共用的外觀 */
    BASE: {
        ambient: [0.10, 0.14, 0.27],
        moonColor: [0.62, 0.74, 1.0],
        moonIntensity: 1.15,
        moonDir: [-0.72, -0.34, 0.5],
        skyAmbient: 2.2,
        skyMoon: 0.25,
        exposure: 1.25,
    } as LightingLook,

    /** 群系覆寫（鍵＝SceneConfig.textureType）；沒列到的群系用 BASE */
    BIOME: {} as Readonly<Record<string, Partial<LightingLook>>>,
} as const;
