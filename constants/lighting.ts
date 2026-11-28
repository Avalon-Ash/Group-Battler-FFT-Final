// ╔══════════════════════════════════════════════════════════╗
// ║  constants/lighting.ts — 打光通道參數 SSOT（ADR 0029）      ║
// ║  唯一讀取者：engine/renderers/lighting/**。著色器不寫死    ║
// ║  任何外觀數值，全部由這張表經 uniform 傳入。               ║
// ║  長度單位是「世界像素」（相機縮放前，與 HexUtils.toPx 同   ║
// ║  一把尺）；著色器把它乘上相機縮放與 dpr，所以鏡頭拉近拉遠   ║
// ║  時光的大小跟著地圖走。顏色是線性 RGB。                    ║
// ║  開關不在這裡：RENDER_QUALITY.LIT_QUERY_KEY／LIT_DEFAULT_ON  ║
// ║  （進入點要讀；這張表只進延後載入的打光 chunk）。          ║
// ║  數值來源：離線原型（commit 819386b8）的 LOOK，換成世界像素 ║
// ║  後在引擎裡看 npm run perf:lit 的截圖調過（WORKLOG §2 DQ）。║
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
    /** 環境（地形、障礙物、背景）打光前保留的彩度；單位、特效、玩法標示保留原彩度 */
    envChroma: number;
}

export const LIGHTING = {
    /** 一幀最多幾盞點光（instance 緩衝的大小）；超過的照繪製順序截掉 */
    MAX_LIGHTS: 64,
    /** 一幀最多幾個投影物（單位＋障礙物；12×8 地圖的障礙物約 20～40 個） */
    MAX_CASTERS: 256,

    /** 單位腳前的暖色點光 */
    UNIT_LIGHT: {
        /** 依陣營（Team 列舉值）的光色；沒列到的陣營用 FALLBACK */
        COLOR: { 0: [1.0, 0.64, 0.30], 1: [1.0, 0.42, 0.18] } as Readonly<Record<number, RGB>>,
        FALLBACK: [1.0, 0.60, 0.30] as RGB,
        INTENSITY: 4.4,
        /** 照得到的最遠距離（世界像素，地面平面上） */
        RANGE: 300,
        /** 光源離地高度 */
        HEIGHT: 95,
        /** 光源從腳底往鏡頭方向（地面 y）偏移，讓單位正面受光 */
        FRONT: 40,
        /** 衰減曲線的膝點：距離到 RANGE × sqrt(KNEE) 時亮度約減半；越小光越集中在腳邊 */
        KNEE: 0.10,
        /** 點光打在障礙物（樹、岩柱、冰晶）上的倍率：它們整面朝鏡頭，不減弱會比地上的光池還亮 */
        ON_OBSTACLE: 0.45,
    },

    /**
     * 仿光效零件改成光（ADR 0031）：打光開啟時，柔邊加法的 glow 零件（PartSpec.partLight）不貼光暈圖，
     * 改登記一盞點光，另畫一個縮小的發光核心。和單位的光分開算上限，排不進去的照舊貼圖。
     * 位置、半徑由 drawPart 當下的變換換算；顏色＝零件色階的 main（sRGB 值直接當線性用，和 UNIT_LIGHT.COLOR 同一種寫法）。
     * 範圍、強度：草擬 2.5／3 在 perf:vfx-strip 上幾乎看不出受光（投射物光暈半徑 10～18），調一次到 6／12（WORKLOG §2 DU）；外觀待定調。
     */
    PART_LIGHT: {
        /** 一幀最多幾盞（0＝全部照舊貼圖，等於改版前的畫面）；不得超過 MAX_CASTERS（共用 instance 緩衝） */
        MAX: 64,
        /** 光照得到的範圍＝零件畫出來的半徑（世界像素）× 這個倍率 */
        RANGE_PER_RADIUS: 6,
        /** 光的強度＝色階顏色 × 零件畫出來的不透明度 × 這個倍率 */
        INTENSITY: 12,
        /** 空中零件的光源假設離地多高（世界像素）：畫點往下這麼多當腳底 */
        HEIGHT_AIR: 30,
        /** 貼地零件（drawPart 有 scaleY）的光源離地高度；畫點就是腳底 */
        HEIGHT_GROUND: 6,
        /** 衰減膝點（同 UNIT_LIGHT.KNEE） */
        KNEE: 0.15,
        /** 打在障礙物上的倍率（同 UNIT_LIGHT.ON_OBSTACLE） */
        ON_OBSTACLE: 0.45,
        /** 沿地面找遮擋的取樣步數（0＝不帶投影；手機假設，P4 在桌機分不出兩者，lighting-cost.md §5.1） */
        SHADOW_STEPS: 0,
        /** 縮小核心：照原圖縮到這個比例再畫（世界畫布與特效遮罩各一次）；0＝只有光 */
        CORE_SCALE: 0.35,
    },

    /**
     * 遮罩畫布（直立物幾何、特效、玩法標示各一張）相對主畫布的解析度。遮罩只用來分辨「這個像素是單位／特效／環境」，
     * 半解析度的邊緣夠用，記憶體與上傳量是全解析度的四分之一。
     */
    MASK_SCALE: 0.5,
    /** 特效像素的亮度倍率（HDR，不受環境光壓暗；超過 1 的部分進泛光） */
    EMISSIVE_GAIN: 1.2,
    /** 玩法標示（射程、預警、縮圈格、狀態底色、地塊光）的亮度倍率：不受光，維持接近原本畫出來的亮度 */
    INFO_GAIN: 1.0,
    /**
     * 遮罩覆蓋率的放大倍率：半透明的疊層（預警格底色約 0.35、柔邊的法陣）在遮罩裡的 alpha 很低，
     * 照原值混合會被當成環境壓暗、降彩。乘上這個倍率再夾到 1，半透明的標示與特效才保有原本的顏色。
     */
    INFO_COVERAGE: 2.6,
    GLOW_COVERAGE: 1.4,
    /** 單位的保底受光（加在環境光上）：沒站在任何光池裡的單位仍然認得出職業與陣營 */
    UNIT_FILL: [0.46, 0.46, 0.50] as RGB,
    /**
     * 特效照亮周圍：把上一幀泛光的亮部再縮小、抹開，當成一層光加在這一幀的受光面上（延遲一幀，肉眼看不出）。
     * DOWNSCALE＝相對主畫布的縮小倍率，PASSES＝模糊來回次數，STRENGTH＝光的強度。
     */
    GLOW_LIGHT: { DOWNSCALE: 8, PASSES: 3, STEP_GROW: 1.5, STRENGTH: 2.2 },

    BLOOM: {
        /** HDR 亮度超過這個值才進泛光 */
        THRESHOLD: 1.25,
        STRENGTH: 0.4,
        /** 泛光貼圖相對畫面的縮小倍率 */
        DOWNSCALE: 2,
        /** 模糊來回的次數（每次一橫一直）與每次的取樣步長增量 */
        PASSES: 2,
        STEP_GROW: 1.5,
    },

    /**
     * 直立物（單位、障礙物）的幾何遮罩：每個精靈蓋一張「離腳底多高、橫向在哪」的漸層章，
     * 著色器由它得到腳底位置、高度與左右彎的輪廓法線（烘焙法線圖之前的替代品）。
     */
    GEO: {
        /** 章蓋住腳底以上這麼高（世界像素）；比它高的部分當成這個高度。最高的樹約 160 */
        MAX_HEIGHT: 180,
        /** 章往腳底以下多蓋的比例（精靈的底座、腳邊會略低於錨點） */
        FOOT_PAD: 0.1,
        /** 單位的半寬＝身高（腳底到血條錨點）× 這個比例 */
        UNIT_HALF_WIDTH: 0.6,
        /**
         * 單位剪影畫進遮罩的不透明度：幾何遮罩裡單位的覆蓋率，也是它把背後的特效、玩法標示挖掉多少。
         * 0.68 是改寫前的實際值（剪影以 25% 畫 4 次＝1 − 0.75⁴），外觀是照這個覆蓋率調的；調高單位會更完整地被當成直立物受光。
         */
        UNIT_COVERAGE: 0.68,
        /** 漸層章的邊長（像素）；拉伸後取線性內插，不需要大 */
        STAMP_SIZE: 64,
        /** 輪廓法線左右彎的幅度（0＝整片朝鏡頭的平板） */
        BEVEL: 1.15,
        /** GL 畫幾何遮罩時每個直立物最多幾張貼圖（單位 1 張、障礙物本體＋加法疊層 2 張）；一幀上限＝MAX_CASTERS × 這個數 */
        GPU_BLITS_PER_ITEM: 2,
        /** 精靈圖集的 GL 貼圖連續這麼多幀沒用到就刪掉（圖集被換掉或釋放後不留在顯示卡上） */
        TEX_IDLE_FRAMES: 600,
    },

    /** 地面投影（月光與點光共用）與接觸暗部 */
    SHADOW: {
        /** 沿地面往光源走的取樣次數（每個受光像素、每盞照到它的光各一次）；手機要降 */
        STEPS: 16,
        STRENGTH: 0.8,
        /** 遮擋邊緣的柔化：投影物比光線高出這麼多（世界像素）才算全擋 */
        SOFT: 12,
        /** 月光的影子最長（世界像素，地面平面上） */
        MOON_LENGTH: 268,
        /** 從受光點出發先跳過的距離：地面像素很短，直立物要跳過自己的腳印 */
        SKIP_GROUND: 3.5,
        SKIP_UPRIGHT: 26,
        /** 投影物腳印半徑＝精靈寬 × RATIO，夾在 MIN～MAX（世界像素） */
        CASTER_RADIUS: { RATIO: 0.22, MIN: 7, MAX: 30 },
        /** 投影物貼圖相對主畫布的解析度 */
        CASTER_SCALE: 0.5,
        /** 接觸暗部：腳邊的環境光最多壓掉這個比例，影響範圍是腳印半徑的 CONTACT_REACH 倍 */
        CONTACT: 0.45,
        CONTACT_REACH: 2.2,
    },
    /** 直立物朝月亮那一側的冷色邊光強度（它們正面照不到月光） */
    MOON_RIM: 0.55,

    /** 暗部偏藍、亮部偏暖的幅度 */
    SPLIT_TONE: 0.07,
    /** 畫面四角壓暗的幅度（0＝不壓） */
    VIGNETTE: 0.42,

    /** 所有群系共用的外觀 */
    BASE: {
        ambient: [0.095, 0.13, 0.25],
        moonColor: [0.62, 0.74, 1.0],
        moonIntensity: 1.12,
        moonDir: [-0.72, -0.34, 0.5],
        skyAmbient: 1.5,
        skyMoon: 0.25,
        exposure: 1.25,
        envChroma: 0.5,
    } as LightingLook,

    /** 群系覆寫（鍵＝SceneConfig.textureType）；沒列到的群系用 BASE */
    BIOME: {
        // 熔岩的橘紅就是這個群系的辨識色：降到一半會變成粉灰
        MAGMA: { envChroma: 0.8 },
        // 草地降到一半會變灰青，認不出是森林
        FOREST: { envChroma: 0.64 },
        // 沙的橘色降彩後被藍色月光染成粉紫：月光與環境光往中性靠，彩度多留一點
        DESERT: { envChroma: 0.7, ambient: [0.10, 0.10, 0.165], moonColor: [0.82, 0.80, 0.92] },
    } as Readonly<Record<string, Partial<LightingLook>>>,
} as const;
