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
