/**
 * 特效零件庫參數 SSOT（ART_SPEC §7、§8）。
 * 零件全部在烘焙階段產生；執行期只做 drawImage／globalAlpha／globalCompositeOperation／平移縮放旋轉。
 * 快取鍵只含（量化後的）參數與品質階層算出的影格數，不含時間。
 */
export const VFX_PARTS = {
    /** 快取上限（條目數）；超過時丟最久未使用者 */
    MAX_ENTRIES: 320,
    /** 快取位元組預算（RGBA 估算，含全部影格）；超過時同樣丟最久未使用者。perf:frames 特效壓力情境的工作集約 260 條／80 MB，64 MB 時每 20 秒擠出 71～189 次 */
    MAX_BYTES: 96 * 1024 * 1024,
    /** 尺寸（半徑／長度／高度，canvas 單位）量化級距 */
    SIZE_STEPS: [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256] as const,
    /** 角度量化（度） */
    ANGLE_STEP_DEG: 15,
    /** 0～1 參數（粗糙度、長度變化）量化級距 */
    UNIT_STEP: 0.25,
    /** 種子變體數：同一組參數最多 N 種隨機外形，限制快取量 */
    SEED_VARIANTS: 4,
    /** 烘焙畫布四周留白（px），避免光暈邊緣被裁 */
    PAD: 2,
    /** 烘焙解析度倍率：sprite 以 N 倍像素烘焙，繪製時縮回，鏡頭放大時線條仍銳利 */
    BAKE_SCALE: 2,
    /** 柔邊零件（非硬光暈 glow、煙）只有漸層、沒有線條，放大也不會糊；以 1 倍烘焙省 3/4 記憶體（壓力情境的最大條目就是 256 半徑光暈，4.2 MB） */
    SOFT_BAKE_SCALE: 1,
    /** 動畫零件的影格數（品質階層 0） */
    FRAMES: { flame: 8, bolt: 3, beam: 4 } as const,
    /** 各品質階層影格係數 [Tier 0..3]；主形狀永遠保留，只減少影格 */
    TIER_FRAME_RATIO: [1, 1, 0.5, 0.5] as const,
    MIN_FRAMES: 2,
    /** 預設播放速率（影格／秒） */
    FPS: { flame: 12, bolt: 20, beam: 16 } as const,

    /** 六角骨架（ART_SPEC §0）：烘焙時的頂點起始角。0 = 平頂（頂點在左右），與 FLAT 地圖格同向；貼地零件在繪製時以 HexGeometry.alignRotation 轉到地圖版面（POINTY 為 π/6） */
    HEX: { ANGLE_OFFSET_RAD: 0 },
    /** 零件層（data/vfx/parts/partLayer.ts）的確定性抖動頻率（Hz）與垂直分量比例、上升層水平散佈用的黃金角（rad） */
    LAYER: { SHAKE_HZ: 9, SHAKE_Y_HZ_MUL: 1.3, SHAKE_Y_AMP: 0.5, GOLDEN_ANGLE: 2.399 },

    GLOW: { SOFT_MAIN_STOP: 0.35, HARD_CORE_STOP: 0.3, HARD_MAIN_STOP: 0.6, MAIN_ALPHA: 0.55 },
    /** 六角環：以三層描邊（光暈、主色、核心）畫六角外框；寬度是 thickness 的倍數 */
    RING: { HALO_WIDTH: 2, HALO_ALPHA: 0.45, HALO_BLUR: 2, SOFT_GLOW_ALPHA: 0.7, SOFT_CORE_ALPHA: 0.55, MAIN_WIDTH: 1, MAIN_ALPHA: 0.85, CORE_WIDTH: 0.35, NOTCH_WIDTH: 0.35, NOTCHES_AT_FULL: 28, NOTCH_DEPTH: 0.9, GAPS_AT_FULL: 3, GAP_ARC_RAD: 0.35 },
    SLASH: { SEGMENTS: 28, TAIL_POWER: 0.8, HEAD_FADE: 0.12, CORE_RATIO: 0.4, HALO_RATIO: 1.8, HALO_ALPHA: 0.35 },
    RAYS: { BASE_HALF_WIDTH: 0.07, REF_COUNT: 12, ALT_SHORTEN: 0.5, JITTER: 0.15, MAIN_STOP: 0.45, MAIN_ALPHA: 0.85, CENTER_GLOW_RATIO: 0.35 },
    BOLT: { WIDTH_RATIO: 0.5, DISPLACE: 0.22, DEPTH: 5, BRANCH_LEN: 0.35, BRANCH_ANGLE_RAD: 0.6, HALO_W: 7, MAIN_W: 3, CORE_W: 1.2, HALO_ALPHA: 0.35, FALLOFF: 0.5, BRANCH_REACH: 0.7, SUB_DEPTH_DROP: 2 },
    FLAME: { WIDTH_RATIO: 0.42, SWAY: 0.2, JAG: 0.08, JAG_FREQ: 9, SIDE_SCALE: 0.55, SIDE_OFFSET: 0.32, LAYER_SCALES: [1, 0.72, 0.42] as const, SEGMENTS: 20, EXTENT: 2.2, SIDE_ALPHA: 0.8, SIDE_PHASES: [0.33, 0.66] as const, LAYER_PHASE: 0.11, RIM_WIDTH: 1.6, RIM_ALPHA: 0.85 },
    SMOKE: { LUMPS_MIN: 5, LUMPS_EXTRA_AT_FULL: 6, LUMP_MIN: 0.35, LUMP_MAX: 0.6, ALPHA: 0.55, MID_ALPHA: 0.6, EXTENT: 1.2 },
    SHARD: { HEX_BEVEL: 0.55, HEX_SQUASH: 0.8, CRYSTAL_ASPECT: 0.32, ROCK_POINTS: 7, ROCK_JITTER: 0.35, BONE_ASPECT: 0.22, OUTLINE_W: 1, ROCK_LIGHT_ALPHA: 0.55 },
    /**
     * 詠唱法陣（2026-10-19 重新設計）：線條一律「模糊光暈＋細亮芯」，不畫實線；外層＝光暈圓盤＋雙同心圓＋符文帶＋刻度，
     * 內層＝獅心六芒星／灰燼倒三角＋內圓＋頂點光點。比例都相對半徑 r；線寬是 canvas 單位；BLUR 是光暈模糊半徑（canvas 單位）。
     */
    MAGIC: {
        BLUR: 2.2, HALO_WIDTH_MUL: 2.6, HALO_ALPHA: 0.55, CORE_ALPHA: 0.9,
        DISC: { CENTER_ALPHA: 0.06, MID_STOP: 0.72, MID_ALPHA: 0.1, RIM_STOP: 0.95, RIM_ALPHA: 0.2 },
        RING_A: { R: 0.97, W: 1.3 }, RING_B: { R: 0.84, W: 0.8 },
        RUNES: { R: 0.905, SIZE: 0.05, COUNT_LION: 12, COUNT_ASH: 9, W: 0.7, ALPHA: 0.8 },
        TICKS: { R: 0.8, LEN: 0.035, COUNT: 24, W: 0.6, ALPHA: 0.6 },
        STAR: { R: 0.74, W: 0.9 },
        INNER_RING: { R: 0.4, W: 0.8 },
        NODES: { R: 0.035, ALPHA: 0.9 },
        CORE: { R: 0.22, ALPHA: 0.45 },
        ASH_ARCS: { COUNT: 3, SPAN_RAD: 1.4, R: 0.58, W: 0.9 },
    },
    /**
     * 技能地面紋章／奧義聖域（2026-10-19 改成與 MAGIC 同一套畫法：透光圓盤＋烘焙模糊光暈＋細主線＋亮芯；
     * 舊版是深色粗光暈＋實心主線三層硬描邊，看起來像貼紙、畫面髒）。線寬＝半徑×LINE_RATIO×各倍率（px）。
     */
    SIGIL: {
        LINE_RATIO: 0.035, BLUR: 2.2, GLOW_WIDTH_MUL: 2.6, GLOW_ALPHA: 0.55, MAIN_WIDTH_MUL: 0.7, MAIN_ALPHA: 0.6, CORE_WIDTH_MUL: 0.35, CORE_ALPHA: 0.95,
        /** 透光圓盤：半徑＝外框×RADIUS，中心→MID_STOP 漸亮，外緣淡出到 0（斷裂外框的缺口不露硬邊） */
        DISC: { RADIUS: 0.9, CENTER_ALPHA: 0.04, MID_STOP: 0.7, MID_ALPHA: 0.12 },
        OUTER_RING: 0.95, RING_GAPS: 3,
        /** 太陽（2026-10-19 重新設計：舊版 24 刻度＋12 放射線像一堆柱子）：內圓＋八芒星 {POINTS/STEP}＋中心圓（半徑比例） */
        SUN: { CIRCLE: 0.72, STAR_R: 0.7, STAR_POINTS: 8, STAR_STEP: 3, CORE: 0.24 },
    },
    /** 六角稜柱光柱：正面寬 = 寬度的 FRONT_RATIO，左右側面依光源（左上）分亮暗 */
    PILLAR: { FRONT_RATIO: 0.5, LIT_SIDE_ALPHA: 0.75, SHADE_SIDE_ALPHA: 0.4, EDGE_ALPHA: 0.9, EDGE_WIDTH: 0.06, TOP_FADE: 0.65, BASE_ELLIPSE: 0.35 },
    /**
     * 六角稜柱（等距投影與地圖版面烘焙在 sprite 裡，錨點＝底面中心）。半徑與高度以 STEP px 量化
     * （呼叫端的尺寸只有少數幾種：護盾＝各體型頭頂高度、冰晶＝固定），不用 SIZE_STEPS，免得繪製時拉伸變形。
     * glass＝六面半透明（護盾），solid＝只畫朝向鏡頭的面（冰晶塊）。側面是頂端 SIDE_TOP → 底端 SIDE_BASE 的漸層。
     */
    PRISM: {
        STEP: 2,
        GLASS: { BACK_FACES: true, SIDE_TOP: 0.3, SIDE_BASE: 0, EDGE_ALPHA: 1, EDGE_W: 1, CAP_FILL: 0.3, CAP_EDGE_ALPHA: 1, CAP_EDGE_W: 1.5, BASE_EDGE_ALPHA: 0.5 },
        SOLID: { BACK_FACES: false, SIDE_TOP: 1, SIDE_BASE: 0, EDGE_ALPHA: 1, EDGE_W: 1, CAP_FILL: 0.6, CAP_EDGE_ALPHA: 1, CAP_EDGE_W: 1.5, BASE_EDGE_ALPHA: 0 },
    },
    /**
     * 奧義魔法構造體（kind 'construct'，ULT-V01）：有體積但不是實心物件——半透明能量體＋外暈＋亮邊＋內光。
     * 比例都是相對主軸長度 size。LIT_ALPHA＝受光面 [core 端, main 端] 不透明度；SHADE_ALPHA＝背光面 [main 端, dark 端]（較暗較透）；
     * AURA_BLUR／AURA_ALPHA＝烘焙時的外暈；RIM_W／RIM_ALPHA＝core 亮邊；CORE_W／CORE_BLUR＝中脊內光。
     * GREATSWORD：劍尖朝下。BLADE_W＝劍刃寬，TIP_LEN＝劍尖收斂長，GUARD_Y＝護手高度，WING_SPAN＝獅翼全寬，
     * FEATHER_*＝羽片（角度範圍、長度範圍、根部位置、寬度），GRIP_*＝握柄，POMMEL_R＝柄頭寶石半徑，CORE_START＝內光起點（相對劍尖長）。
     */
    CONSTRUCT: {
        LIT_ALPHA: [0.9, 0.6] as const,
        SHADE_ALPHA: [0.45, 0.22] as const,
        AURA_BLUR: 0.05,
        AURA_ALPHA: 0.85,
        RIM_W: 0.007,
        RIM_ALPHA: 0.9,
        CORE_W: 0.012,
        CORE_BLUR: 0.04,
        WRAP_ALPHA: 0.7,
        GREATSWORD: {
            BLADE_W: 0.13, TIP_LEN: 0.12, CORE_START: 1.3,
            GUARD_Y: 0.68, GUARD_H: 0.045, GUARD_EXTENT: 1.7, WING_SPAN: 0.62, FEATHERS: 5,
            FEATHER_ANGLE_DEG: [8, 62] as const, FEATHER_LEN: [0.55, 1] as const, FEATHER_ROOT_X: 1.1, FEATHER_WIDTH: 0.16,
            GRIP_LEN: 0.2, GRIP_W: 0.045, WRAPS: 5, WRAP_SLANT: 0.6, POMMEL_R: 0.04, POMMEL_LIFT: 0.8, GEM_GLOW: 0.09, GEM_CORE: 0.5,
        },
        /**
         * 多面奇點（size＝直徑 D）：外六角半徑 0.5D 切成 6 個三角面，頂點偏左上 APEX（相對半徑）做出受光／背光；
         * 中心事件視界＝轉 30° 的內六角 HORIZON（相對半徑）填 HORIZON_COLOR；FACET_*＝面的不透明度（中心深、外緣依受光）；
         * 受光面外緣 FACET_EDGE_STOP 之後往 core 透光（FACET_GLINT_ALPHA×受光度）；HORIZON_RIM_*＝事件視界邊緣的壓縮亮光；
         * EDGE_ALPHA＝面與面的稜線；RING_*＝外圈壓縮光環（相對 D 的半徑、線寬、模糊；受光側 core 亮弧的角度範圍與線寬倍率）；
         * HALO_R＝外框半徑（相對 D）。
         */
        SINGULARITY: {
            APEX: [-0.16, -0.2] as const, HORIZON: 0.42, HORIZON_COLOR: 'CHAR' as const, HORIZON_ALPHA: 0.92, HORIZON_RIM_W: 0.025, HORIZON_RIM_ALPHA: 0.8,
            FACET_CENTER_ALPHA: 0.9, FACET_LIT_ALPHA: 0.8, FACET_SHADE_ALPHA: 0.35, FACET_EDGE_STOP: 0.8, FACET_GLINT_ALPHA: 0.7, EDGE_ALPHA: 0.35,
            RING_R: 0.58, RING_W: 0.035, RING_BLUR: 0.08, RING_ALPHA: 0.55, RING_LIT_W: 0.5, RING_LIT_ALPHA: 0.95, RING_LIT_ARC_DEG: [150, 300] as const, HALO_R: 0.66,
        },
        /**
         * 神矢（size＝全長 L，矢尖在 (0,0) 朝下）：HEAD_LEN／HEAD_W＝矢頭長與寬，SHAFT_W＝矢桿寬，
         * FLETCH_*＝尾羽（起點、長度、外展），SPAN＝外框寬，TIP_GLOW＝矢尖光暈半徑（皆相對 L）。
         */
        ARROW: { HEAD_LEN: 0.2, HEAD_W: 0.16, SHAFT_W: 0.04, FLETCH_START: 0.78, FLETCH_LEN: 0.2, FLETCH_W: 0.09, SPAN: 0.24, TIP_GLOW: 0.08 },
        /**
         * 斷頭刃（size＝高 H，刃底中央在 (0,0)）：WIDTH＝刃寬，SLANT＝刃口斜度（右端比左端高多少），WEIGHT_*＝頂部配重塊（高度與寬倍率），
         * EDGE_ALPHA＝刃口亮線（皆相對 H）。
         */
        GUILLOTINE: { WIDTH: 0.8, SLANT: 0.3, WEIGHT_H: 0.18, WEIGHT_W: 1.1, EDGE_ALPHA: 0.95 },
        /**
         * 骨刺（size＝高 H，根部中央在 (0,0)）：BASE_W＝根部寬，BEND＝尖端往側邊彎的量，SPAN＝外框寬（含彎曲），
         * RIDGES＝刺身上的骨節亮紋位置（相對高度）。
         */
        RIB_SPIKE: { BASE_W: 0.24, BEND: 0.22, SPAN: 0.6, RIDGES: [0.3, 0.55] as const },
        /**
         * 深淵之眼（size＝寬 W，中心為錨點）：HEIGHT＝眼高，IRIS_R＝虹膜半徑，PUPIL_W＝縱瞳寬，PUPIL_H＝縱瞳高（相對眼高），
         * FILL_ALPHA＝眼白（深淵）不透明度。
         */
        EYE: { HEIGHT: 0.45, IRIS_R: 0.17, PUPIL_W: 0.05, PUPIL_H: 0.8, FILL_ALPHA: 0.9 },
        /**
         * 塔盾（size＝高 H，盾尖在 (0,0) 朝下）：WIDTH＝盾寬，SHOULDER＝直邊開始收尖的高度，TOP_ARCH＝上緣拱起；
         * CROSS_*＝盾面聖十字（core 內光：豎線起訖、橫線高度與半寬），BOSS_*＝盾心寶石的高度與光暈半徑（皆相對 H）。
         */
        TOWER_SHIELD: { WIDTH: 0.62, SHOULDER: 0.45, TOP_ARCH: 0.06, CROSS_V: [0.18, 0.9] as const, CROSS_H: 0.66, CROSS_HALF: 0.18, BOSS_Y: 0.66, BOSS_R: 0.1 },
        /**
         * 冠冕（size＝寬 W，中心為錨點）：HEIGHT＝全高，BAND_H＝冠環高，POINTS＝冠尖數，POINT_H＝冠尖高（皆相對 W），
         * GEM_R＝尖端寶石光暈半徑，BAND_GEMS＝冠環上的寶石數。
         */
        CROWN: { HEIGHT: 0.7, BAND_H: 0.22, POINTS: 5, POINT_H: 0.42, GEM_R: 0.07, BAND_GEMS: 3 },
        /**
         * 巨拳（size＝全長 L，拳面底部在 (0,0) 朝下）：ARM_W＝前臂寬、ARM_TOP＝前臂頂；HAND_W／HAND_TOP＝拳頭寬與頂；
         * KNUCKLES＝指節數、KNUCKLE_R＝指節半徑；ROUND＝外側圓角半徑；THUMB_*＝拇指（位置與半徑）；BRACER＝護腕亮紋的高度（皆相對 L）。
         */
        FIST: { ROUND: 0.1, ARM_W: 0.34, ARM_TOP: 1, HAND_W: 0.52, HAND_TOP: 0.56, KNUCKLES: 4, KNUCKLE_R: 0.07, THUMB_X: -0.27, THUMB_Y: 0.3, THUMB_R: [0.08, 0.14] as const, BRACER: [0.64, 0.72] as const },
        /**
         * 劍輪（size＝直徑 D，中心為錨點）：BLADES 把劍從 ROOT（相對半徑）伸到外緣，劍身寬 WIDTH（相對半徑），
         * 劍尖往旋轉方向偏 SWEEP_DEG（風車感）；GUARD＝劍格長；每把劍後方一道 TRAIL_DEG 的殘影弧（core，TRAIL_ALPHA 漸淡）；HALO_R＝外框半徑（相對 D）。
         */
        BLADE_WHEEL: { BLADES: 6, ROOT: 0.3, WIDTH: 0.16, SWEEP_DEG: 18, GUARD: 0.16, TRAIL_DEG: 50, TRAIL_ALPHA: 0.55, TRAIL_W: 0.025, HALO_R: 0.56 },
        /**
         * 多面蝕月（size＝直徑 D）：月面是 SIDES 邊的低多邊形，切成三角面、頂點偏 APEX（相對半徑），受光面在左上；
         * 暗影＝同樣的多邊形偏移 SHADOW_OFF、半徑 SHADOW_R，中心到 SHADOW_CORE_STOP 填 SHADOW_COLOR、最外緣漸成 ramp.dark（SHADOW_RIM_ALPHA，看得出暗面也是球面），露出左上一道月牙；暗影上仍淡淡看得到稜線（SHADOW_EDGE_ALPHA）；
         * RIM_*＝月牙紅緣（core 亮弧的角度範圍與線寬）；CORONA_*＝日冕光暈（相對半徑的內外緣與不透明度）；HALO_R＝外框半徑（相對 D）。
         */
        ECLIPSE: {
            SIDES: 12, APEX: [-0.12, -0.16] as const, FACET_CENTER_ALPHA: 0.85, FACET_LIT_ALPHA: 0.9, FACET_SHADE_ALPHA: 0.45, EDGE_ALPHA: 0.35,
            SHADOW_OFF: [0.2, 0.14] as const, SHADOW_R: 0.92, SHADOW_COLOR: 'CHAR' as const, SHADOW_ALPHA: 0.95, SHADOW_CORE_STOP: 0.75, SHADOW_RIM_ALPHA: 0.9, SHADOW_EDGE_ALPHA: 0.07,
            RIM_ARC_DEG: [125, 292] as const, RIM_W: 0.035, RIM_ALPHA: 0.95,
            CORONA_IN: 0.9, CORONA_OUT: 1.4, CORONA_ALPHA: 0.55, HALO_R: 0.72,
        },
        /**
         * 重型能量彈頭（size＝彈身長 L，彈尖在 (0,0) 朝下）：BODY_W＝最寬處寬，SHOULDER＝彈尖收斂到最寬處的長度，
         * TAIL_Y／TAIL_W＝尾端位置與寬；FIN_*＝尾翼（起點、長度、外展寬 FIN_SPAN、根部位置、外緣斜度）；OGIVE＝彈尖弧度；
         * BOAT_TAIL＝尾端收窄段；SPINE_X＝中脊內光的橫向位置；BAND_Y／BAND_CURVE＝彈身發光環帶與彎度；
         * NOSE_GLOW＝彈尖熱光；TRAIL_LEN／TRAIL_W／TRAIL_ALPHA＝尾端往上的能量尾焰（相對 L）。
         */
        WARHEAD: {
            BODY_W: 0.3, SHOULDER: 0.32, TAIL_Y: 0.86, TAIL_W: 0.2, FIN_START: 0.66, FIN_LEN: 0.3, FIN_SPAN: 0.62,
            FIN_ROOT: 0.9, FIN_EDGE: 0.25, OGIVE: 0.35, BOAT_TAIL: 0.15, SPINE_X: 0.3,
            BAND_Y: [0.44, 0.6] as const, BAND_CURVE: 0.5, NOSE_GLOW: 0.12,
            TRAIL_LEN: 0.5, TRAIL_W: 0.18, TRAIL_ALPHA: 0.55, TRAIL_MID_STOP: 0.4, TRAIL_MID_ALPHA: 0.6,
        },
    },
    /**
     * 螺旋吸積帶（kind 'spiral'）：每條光帶從外緣半徑繞 turns 圈收到 INNER×半徑，寬度由 thickness 收到 TAPER 倍（越往內越細）；
     * 填色是以中心為圓心的放射漸層（外緣 OUTER_ALPHA 的 dark → MID_STOP 處 main → 中心 core），越往內越亮＝向心壓縮。
     * HALO_W／HALO_BLUR／HALO_ALPHA＝外暈（相對 thickness）；CORE_W＝中線亮芯寬；SEGMENTS＝每條光帶取樣點數。
     */
    SPIRAL: { INNER: 0.12, TAPER: 0.2, OUTER_ALPHA: 0.1, MID_STOP: 0.55, MID_ALPHA: 0.8, HALO_W: 2, HALO_BLUR: 0.6, HALO_ALPHA: 0.6, CORE_W: 0.3, CORE_ALPHA: 0.9, SEGMENTS: 48, TURN_STEP: 0.25, MAX_TURNS: 2, MAX_ARMS: 8 },
    SPARK: { THICK_RATIO: 0.12, HEAD_GLOW_RATIO: 0.22, MAIN_STOP: 0.6, MAIN_ALPHA: 0.85 },
    DROPLET: { TIP_RATIO: 1.6, HIGHLIGHT_RATIO: 0.28, BODY_RATIO: 0.55 },
    /**
     * 光束磚：沿光束方向平鋪的一段光管（長 TILE_LEN，左右不加 PAD 才能無縫接）。寬度 w＝光束樣式寬度：
     * 管身全厚 w×MAIN_RATIO、光暈全厚 w×HALO_RATIO（舊 drawLayeredBeam 的可見亮帶約 0.6w，管身取同級粗細）。
     * 虛線（死光）在 ±w×DASH_OFFSET，週期需整除 TILE_LEN；鋸齒（閃電）兩端回到中線；珠鏈（血鏈）每 BEAD_PERIOD 一顆。
     * 執行期整排磚以 SCROLL_PX_S 往終點捲動（舊版虛線 lineDashOffset 的速度），兩端裁成尖頭（長度＝可見高度×TIP_RATIO）。
     */
    /**
     * 投射物本體（指向 +x，長度 L）：HEIGHT 是外框高度 / L；其餘是各外形的比例（相對 L）。
     * 箭：桿身＋箭頭＋尾羽；能量彈：拉長六角晶體；法球：光暈＋六角核心；飛斧：柄＋月牙刃；炸彈：球身＋引信火花；血鉤：鉤頭＋短索。
     */
    MISSILE: {
        HEIGHT: { arrow: 0.24, bolt: 0.24, orb: 1, axe: 0.72, bomb: 0.9, hook: 0.5 } as const,
        OUTLINE_W: 1,
        ARROW: { SHAFT_W: 0.05, HEAD_START: 0.22, HEAD_HALF: 0.11, FLETCH_LEN: 0.2, FLETCH_HALF: 0.1 },
        BOLT: { WAIST_HALF: 0.1, FRONT: 0.22, BACK: 0.28, CORE_SCALE: 0.55 },
        ORB: { CORE: 0.3, HALO_ALPHA: 0.55 },
        AXE: { HANDLE_W: 0.06, BLADE_START: 0.12, BLADE_HALF: 0.34, BLADE_BULGE: 0.12 },
        BOMB: { BODY: 0.34, FUSE_LEN: 0.16, SPARK: 0.09 },
        HOOK: { R: 0.2, LINE_W: 0.08, SHAFT_FROM: -0.5, BARB: 0.12 },
    },
    BEAM: { TILE_LEN: 64, MAIN_RATIO: 1.2, HALO_RATIO: 2.4, HALO_ALPHA: 0.22, CORE_RATIO: 0.2, TIP_RATIO: 0.8, DASH_PERIOD: 32, DASH_ON: 21, DASH_W: 1, DASH_OFFSET: 1, DASH_ALPHA: 0.8, ZIGZAG_POINTS: 8, ZIGZAG_AMP: 0.6, ZIGZAG_MAIN_W: 0.6, ZIGZAG_CORE_W: 0.25, BEAD_PERIOD: 16, BEAD_R: 0.45, SCROLL_PX_S: 500,
        /** 兩端光點（發射口／命中點）：硬光暈半徑＝光束寬 × END_GLOW_RATIO，起點縮成 START_SCALE；隨光束收窄淡出，並以 END_PULSE_HZ 閃動 */
        END_GLOW_RATIO: 1.4, END_ALPHA: 0.9, START_SCALE: 0.6, END_PULSE: 0.15, END_PULSE_HZ: 18 },
} as const;

/** 投射物本體外形：箭、能量彈、法球、飛斧、炸彈、血鉤（PartSpec 的 missile 零件、data/vfx/projectile_visuals.ts） */
export type MissileShape = keyof typeof VFX_PARTS.MISSILE.HEIGHT;
