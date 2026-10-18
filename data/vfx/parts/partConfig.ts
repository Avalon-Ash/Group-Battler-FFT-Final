/**
 * 特效零件庫參數 SSOT（ART_SPEC §7、§8）。
 * 零件全部在烘焙階段產生；執行期只做 drawImage／globalAlpha／globalCompositeOperation／平移縮放旋轉。
 * 快取鍵只含（量化後的）參數與品質階層算出的影格數，不含時間。
 */
export const VFX_PARTS = {
    /** 快取上限（條目數）；超過時丟最久未使用者 */
    MAX_ENTRIES: 192,
    /** 快取位元組預算（RGBA 估算，含全部影格）；超過時同樣丟最久未使用者 */
    MAX_BYTES: 64 * 1024 * 1024,
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
    /** 動畫零件的影格數（品質階層 0） */
    FRAMES: { flame: 8, bolt: 3, beam: 4 } as const,
    /** 各品質階層影格係數 [Tier 0..3]；主形狀永遠保留，只減少影格 */
    TIER_FRAME_RATIO: [1, 1, 0.5, 0.5] as const,
    MIN_FRAMES: 2,
    /** 預設播放速率（影格／秒） */
    FPS: { flame: 12, bolt: 20, beam: 16 } as const,

    /** 六角骨架（ART_SPEC §0）：烘焙時的頂點起始角。0 = 平頂（頂點在左右），與 FLAT 地圖格同向；貼地零件在繪製時以 HexGeometry.alignRotation 轉到地圖版面（POINTY 為 π/6） */
    HEX: { ANGLE_OFFSET_RAD: 0 },

    GLOW: { SOFT_MAIN_STOP: 0.35, HARD_CORE_STOP: 0.3, HARD_MAIN_STOP: 0.6, MAIN_ALPHA: 0.55 },
    /** 六角環：以三層描邊（光暈、主色、核心）畫六角外框；寬度是 thickness 的倍數 */
    RING: { HALO_WIDTH: 2, HALO_ALPHA: 0.35, MAIN_WIDTH: 1, MAIN_ALPHA: 0.85, CORE_WIDTH: 0.35, NOTCH_WIDTH: 0.35, NOTCHES_AT_FULL: 28, NOTCH_DEPTH: 0.9, GAPS_AT_FULL: 3, GAP_ARC_RAD: 0.35 },
    SLASH: { SEGMENTS: 28, TAIL_POWER: 0.8, HEAD_FADE: 0.12, CORE_RATIO: 0.4, HALO_RATIO: 1.8, HALO_ALPHA: 0.35 },
    RAYS: { BASE_HALF_WIDTH: 0.07, REF_COUNT: 12, ALT_SHORTEN: 0.5, JITTER: 0.15, MAIN_STOP: 0.45, MAIN_ALPHA: 0.85, CENTER_GLOW_RATIO: 0.35 },
    BOLT: { WIDTH_RATIO: 0.5, DISPLACE: 0.22, DEPTH: 5, BRANCH_LEN: 0.35, BRANCH_ANGLE_RAD: 0.6, HALO_W: 7, MAIN_W: 3, CORE_W: 1.2, HALO_ALPHA: 0.35, FALLOFF: 0.5, BRANCH_REACH: 0.7, SUB_DEPTH_DROP: 2 },
    FLAME: { WIDTH_RATIO: 0.42, SWAY: 0.2, JAG: 0.08, JAG_FREQ: 9, SIDE_SCALE: 0.55, SIDE_OFFSET: 0.32, LAYER_SCALES: [1, 0.72, 0.42] as const, SEGMENTS: 20, EXTENT: 2.2, SIDE_ALPHA: 0.8, SIDE_PHASES: [0.33, 0.66] as const, LAYER_PHASE: 0.11, RIM_WIDTH: 1.6, RIM_ALPHA: 0.85 },
    SMOKE: { LUMPS_MIN: 5, LUMPS_EXTRA_AT_FULL: 6, LUMP_MIN: 0.35, LUMP_MAX: 0.6, ALPHA: 0.55, MID_ALPHA: 0.6, EXTENT: 1.2 },
    SHARD: { HEX_BEVEL: 0.55, HEX_SQUASH: 0.8, CRYSTAL_ASPECT: 0.32, ROCK_POINTS: 7, ROCK_JITTER: 0.35, BONE_ASPECT: 0.22, OUTLINE_W: 1, ROCK_LIGHT_ALPHA: 0.55 },
    SIGIL: { LINE_RATIO: 0.035, HALO_RATIO: 2.4, HALO_ALPHA: 0.45, HALO_WIDTH_MUL: 1.5, MAIN_WIDTH_MUL: 0.6, CORE_WIDTH_MUL: 0.6, OUTER_RING: 0.95, TICKS: 24, SUN_RAYS: 12, RING_GAPS: 3 },
    /** 六角稜柱光柱：正面寬 = 寬度的 FRONT_RATIO，左右側面依光源（左上）分亮暗 */
    PILLAR: { FRONT_RATIO: 0.5, LIT_SIDE_ALPHA: 0.75, SHADE_SIDE_ALPHA: 0.4, EDGE_ALPHA: 0.9, EDGE_WIDTH: 0.06, TOP_FADE: 0.65, BASE_ELLIPSE: 0.35 },
    SPARK: { THICK_RATIO: 0.12, HEAD_GLOW_RATIO: 0.22, MAIN_STOP: 0.6, MAIN_ALPHA: 0.85 },
    DROPLET: { TIP_RATIO: 1.6, HIGHLIGHT_RATIO: 0.28, BODY_RATIO: 0.55 },
    /**
     * 光束磚：沿光束方向平鋪的一段光管（長 TILE_LEN，左右不加 PAD 才能無縫接）。寬度 w＝光束樣式寬度：
     * 管身全厚 w×MAIN_RATIO、光暈全厚 w×HALO_RATIO（舊 drawLayeredBeam 的可見亮帶約 0.6w，管身取同級粗細）。
     * 虛線（死光）在 ±w×DASH_OFFSET，週期需整除 TILE_LEN；鋸齒（閃電）兩端回到中線；珠鏈（血鏈）每 BEAD_PERIOD 一顆。
     * 執行期整排磚以 SCROLL_PX_S 往終點捲動（舊版虛線 lineDashOffset 的速度），兩端裁成尖頭（長度＝可見高度×TIP_RATIO）。
     */
    BEAM: { TILE_LEN: 64, MAIN_RATIO: 1.2, HALO_RATIO: 2.4, HALO_ALPHA: 0.22, CORE_RATIO: 0.2, TIP_RATIO: 0.8, DASH_PERIOD: 32, DASH_ON: 21, DASH_W: 1, DASH_OFFSET: 1, DASH_ALPHA: 0.8, ZIGZAG_POINTS: 8, ZIGZAG_AMP: 0.6, ZIGZAG_MAIN_W: 0.6, ZIGZAG_CORE_W: 0.25, BEAD_PERIOD: 16, BEAD_R: 0.45, SCROLL_PX_S: 500 },
} as const;
