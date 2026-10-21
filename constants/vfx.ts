// ╔══════════════════════════════════════════════════════════╗
// ║  constants/vfx.ts — 粒子、特效、法陣、投射物與鋪設常數 SSOT  ║
// ║  職責：定義特效渲染偏移、法陣幾何、鋪設模式、粒子特性與預算 ║
// ╚══════════════════════════════════════════════════════════╝

import type { ParticleType } from '../types/VFXSchema';
import { HEX_SIZE } from './geometry';

export const VFX_RENDER = {
    GROUND_SORT_BIAS:   15,  // ground-locked 粒子的 Y 軸排序偏移
    GROUND_Z_BIAS:       5,  // ground-locked 粒子的 Z 軸偏移
    GROUND_VISUAL_BIAS:  2,  // 防 Z-fighting 的視覺偏移
    PARTICLE_SIZE_BIAS: 0.5, // 碰地計算的粒子半徑比例
    DEBUG_DOT_COLOR: '#ff00ff', // 沒有繪製器的粒子型別（不應出現）畫成的除錯點
    DEBUG_DOT_RADIUS: 4,
    TRAIL_STEP_DIST:    20,  // Trail 採樣的目標點間距（螢幕像素）
    /**
     * 空中特效（非貼地粒子）與施法光環（AURA）的排序前緣：鍵＝足跡 Y（粒子在地面的投影）＋這個固定值。
     * 粒子的高度 z 不進排序鍵（舊的 z*20 與 y*100 互相抵銷，下落的碎片會相對地塊／單位來回翻轉）；
     * 半格＝把「飄在這一格上方」的東西當作站在該格前緣，所以它排在自己腳下這一格的地塊、危害、障礙物、單位之後，
     * 又不會越過前方一整列。與 AURA 原有的 HEX_SIZE * 0.5 同一個值（RenderSpec §2）。
     */
    AIR_SORT_BIAS:      HEX_SIZE * 0.5,
};

/** 貼地鋪設（FFT 風格）：大型平貼特效不再是獨立排序 op，而是畫在它蓋到的每一格頂面（RenderSpec §9） */
/**
 * 詠唱光環（UnitAuraPainter）的幾何參數。環是腰部高度的水平面，由 GroundDrapeLayer 以懸空平面逐格繪製（RenderSpec §9）。
 */
/**
 * 詠唱光環（UnitAuraPainter，全部是零件）：色階＝陣營×技能屬性（data/vfx/element_ramps.ts）。
 * 尺寸以格（HEX_SIZE）或 px 為單位；ROT／FREQ 是 rad/s；ALPHA 是零件不透明度。
 */
export const CAST_RING = {
    /**
     * 詠唱法陣（2026-10-19 重新設計：VFX_PARTS.MAGIC 的 magicCircle 零件，外層與內層反向慢轉）。
     * 舊版是 3～6 rad/s 高速旋轉的實線六角環，尖角閃爍造成毛刺感；現在旋轉放慢、律動放輕、詠唱開始時淡入。
     */
    /** 一般詠唱法陣半徑（格）、律動幅度（半徑比例）與角頻率 */
    BASE_SIZE: 0.95,
    PULSE: 0.025,
    PULSE_FREQ: 2.4,
    /** 外層／內層旋轉速度（rad/s，內層反向）與不透明度 */
    ROT_SPEED: 0.45,
    INNER_ROT_SPEED: 0.8,
    RING_ALPHA: 0.95,
    INNER_ALPHA: 0.85,
    /** 詠唱開始的淡入時間（秒） */
    FADE_IN_S: 0.18,
    /** AOE 擴張環的起始不透明度（越接近完成越淡） */
    AOE_ALPHA: 0.55,
    /** 奧義聖域半徑（格）：法陣外層＋內層＋陣營紋章（淡）＋中心光 */
    ULT_SIZE: 2.5,
    ULT_ROT_SPEED: 0.3,
    ULT_INNER_ROT_MUL: 1.6,
    ULT_SIGIL_ALPHA: 0.4,
    ULT_RING_ALPHA: 0.95,
    ULT_CORE_RATIO: 0.4,
    ULT_CORE_ALPHA: 0.3,
    ULT_CORE_PULSE: 0.12,
    ULT_CORE_PULSE_FREQ: 4,
    /** 奧義能量柱：最大高度與開始顯示的最小高度（px）、寬度、所在環（聖域半徑比例）、不透明度與閃爍 */
    ULT_PILLAR_H: 150,
    ULT_PILLAR_MIN_H: 5,
    ULT_PILLAR_W: 6,
    ULT_PILLAR_RING: 0.7,
    ULT_PILLAR_ALPHA: 0.35,
    ULT_PILLAR_FLICKER: 0.25,
    ULT_PILLAR_FLICKER_FREQ: 8,
    /** 一般詠唱的上升光點：顆數、半徑、繞行半徑、上升高度（px）、週期速度、自轉、不透明度 */
    MOTES: 3,
    MOTE_RADIUS: 3,
    MOTE_ORBIT: 35,
    MOTE_RISE: 70,
    MOTE_CYCLE_SPEED: 2.5,
    MOTE_SPIN: 5,
    MOTE_ALPHA: 0.85,
    /** 法陣的混合模式：screen 讓光線疊在地面上有透光感、不會像加法那樣在亮地表洗白；鋪設的離屏貼回（GROUND_DRAPE.PLANE_BLEND）要一致 */
    BLEND: 'screen' as GlobalCompositeOperation,
    /** 法陣光暈超出幾何半徑的餘量（px），判斷蓋到哪些格 */
    GLOW_PAD: 8,
} as const;

export const GROUND_DRAPE = {
    /** 投影後半高 ≥ 此值才鋪設；更小的平貼特效維持一般貼地 op（前緣排序） */
    MIN_HALF_H: 20,
    /** 非粒子鋪設（施法 AOE 預警等繪製函式）貼回主畫布的混合模式：與原本直接繪製的 screen 一致 */
    PAINTER_BLEND: 'screen' as GlobalCompositeOperation,
    /** 懸空平面（詠唱法陣）貼回的混合模式：與 CAST_RING.BLEND 一致（2026-10-19 法陣改成發光線條，screen） */
    PLANE_BLEND: 'screen' as GlobalCompositeOperation,
    /** 繪製函式類鋪設的離屏畫布半邊長（× halfW，正方形）：涵蓋 AOE 預警的範圍光（AOE_INDICATOR.GLOW_RADIUS_MUL 1.4 倍範圍） */
    PAINTER_EXTENT: 1.5,
    /** 施法 AOE 預警的涵蓋半徑額外加的格數比例（描邊光暈超出幾何半徑的部分） */
    AOE_INDICATOR_PAD: 0.15,
    /** 懸空平面（詠唱環）在格子頂面高過平面多少 px 以上才算被該格擋住（避免漂浮位移造成邊緣閃動） */
    PLANE_OCCLUDE_EPS: 2,
    /** 判斷哪些格被蓋到時，特效半徑的放大倍率（涵蓋光暈／描邊超出 size 的部分） */
    REACH_MARGIN: 1.15,
    /** 頂面裁切六邊形比格子外擴的像素：相鄰格的裁切重疊，接縫不露底 */
    CLIP_EXPAND_PX: 0.5,
    /** 離屏畫布的邊界餘量（邏輯像素），涵蓋描邊與光暈 */
    CANVAS_PAD_PX: 24,
    /** 離屏畫布單邊上限（裝置像素）；超過時降低離屏解析度 */
    MAX_CANVAS_PX: 2048,
    /** 離屏畫布容量取整單位（裝置像素）：縮放動畫時尺寸每幀變動，不能每幀重配畫布 */
    CANVAS_GROW_STEP_PX: 128,
    /**
     * 鋪設類別（依繪製內容判斷，見 docs/COORD_GUARD_FINDINGS.md 對應的修正輪）：
     *  DIRECT    單一 drawImage／少量填色：每格裁切後直接畫，混合模式與原本完全一致
     *  OFFSCREEN 多段描邊（曼陀羅、震波）：每幀只畫一次到離屏畫布，再逐格裁切貼上（以粒子混合模式貼上）
     * 登記特效全是零件，貼地的只有 PART_GROUND（單張 sprite → DIRECT）；OFFSCREEN 保留給多段描邊的繪製函式。
     */
    MODE: {
        PART_GROUND: 'DIRECT',
    } as Readonly<Record<string, 'DIRECT' | 'OFFSCREEN'>>,
} as const;

// SSOT: VFX Thresholds
export const VFX_PARAM = {
    SPEED_TRAIL_THRESHOLD_SQ: 1000,
    SPEED_TILT_THRESHOLD: 300,
    SPEED_MAX_TILT_REF: 800,
    SHAKE_INTENSITY_DASH: 0.4,
    SHAKE_INTENSITY_KNOCKBACK: 0.35,
    FX_KNOCKBACK_DUST_THRESHOLD_SQ: 80000,

    // ── Particle Budget ──────────────────────────────────────────
    /** 全域粒子硬上限。超過時 VFXPlayer 直接 skip spawn。*/
    MAX_PARTICLES: 450,
    /** Pool 回收上限。超過直接丟棄，避免 pool 無限膨脹。*/
    MAX_POOL_SIZE: 350,
    /** 每格 Hazard Field 最多存活的 locked 粒子數量。*/
    HAZARD_FIELD_MAX_PER_CELL: 2,
    /** Idle VFX cull 距離平方（300px²）。超出不生成 idle 粒子。*/
    IDLE_VFX_CULL_DIST_SQ: 90000,
    /** Idle VFX 剔除中心 = 地圖寬/高（格數）× 此值。原程式讀取不存在的 engine.camera，恆走此 fallback；刻意保留以維持行為。*/
    IDLE_VFX_CULL_CENTER_PER_TILE: 40,
};

/**
 * 特效預算與自適應 LOD 降級治理器參數 SSOT
 */
export const VFX_BUDGET = {
    /** 總開關：關閉時行為與改動前 100% 逐像素一致 */
    enabled: true,
    /** 全域粒子軟預算上限：超過此數量時開始對非關鍵特效啟動降級 */
    SOFT_PARTICLE_BUDGET: 240,
    /** 全域粒子硬上限：超過此數量時阻止非關鍵特效生成 */
    HARD_PARTICLE_BUDGET: 380,
    /** 各品質階層粒子發射係數 [Tier 0, Tier 1, Tier 2, Tier 3] */
    TIER_EMISSION_RATIOS: [1.0, 0.75, 0.5, 0.35] as const,
    /** 單位死亡特效存活時間基準秒數；高負載或降階時以 REDUCED / NORMAL 比例縮短 */
    SHATTER_LIFETIME_NORMAL: 4.5,
    SHATTER_LIFETIME_REDUCED: 2.0,
    /** 聖約陣營死亡血噴粒子數（一般 / 高負載） */
    SHATTER_BLOOD_NORMAL: 18,
    SHATTER_BLOOD_REDUCED: 6,
} as const;

/** 單位死亡特效（輕量塵煙＋火花；取代舊的 token 碎片噴射）調校常數 */
export const DEATH_VFX = {
    /** 塵煙團數量（一般 / 高負載） */
    PUFF_NORMAL: 4,
    PUFF_REDUCED: 2,
    PUFF_LIFE: 1.4,
    PUFF_SIZE_MIN: 26,
    PUFF_SIZE_RANGE: 18,
    /** 塵煙水平擴散速度與上升速度 */
    PUFF_SPEED: 60,
    PUFF_RISE: 50,
    /** 每 1/60 秒損失的速度比例，必須落在 [0,1)（VFXPhysics: pow(1 - drag, dt * 60)；≥1 會得到 NaN）。0.025 ≈ 每秒 e^-1.5 的衰減 */
    PUFF_DRAG: 0.025,
    PUFF_COLOR: '#cbd5e1',
    /** 火花數量（一般 / 高負載） */
    SPARK_NORMAL: 10,
    SPARK_REDUCED: 4,
    SPARK_LIFE: 0.7,
    SPARK_SPEED_MIN: 180,
    SPARK_SPEED_RANGE: 220,
    SPARK_RISE_MIN: 120,
    SPARK_RISE_RANGE: 160,
    SPARK_SIZE_MIN: 6,
    SPARK_SIZE_RANGE: 6,
    SPARK_GRAVITY: 900,
} as const;

/**
 * 施法 AOE 地面預警（UnitIndicatorPainter，零件、只經 GroundDrape 鋪設）：範圍＝aoeRadius 格，隨詠唱進度從中心擴張。
 * 2026-10-19：實線六角雙環改成 magicCircle 外層（光暈圓盤＋雙環＋符文，陣營樣式），慢轉、律動放慢；底下仍墊一層範圍光。
 * 不透明度＝ALPHA＋sin(t×PULSE_FREQ)×PULSE_AMP，各零件再乘自己的倍率；光暈半徑＝範圍×GLOW_RADIUS_MUL。
 */
export const AOE_INDICATOR = {
    ALPHA: 0.5,
    PULSE_AMP: 0.08,
    PULSE_FREQ: 3,
    GLOW_RADIUS_MUL: 1.4,
    GLOW_ALPHA_MUL: 0.5,
    CIRCLE_ALPHA_MUL: 1,
    /** 法陣旋轉速度（rad/s） */
    ROT_SPEED: 0.2,
} as const;

/**
 * 加法零件的群系增益（VFXPartStore.setAdditiveGain，RenderPipeline 每幀依 scene.textureType 設定；未列＝1）。
 * 依 fx-shot --scene 的白色飽和像素比例校到與 FOREST 同級（docs/VFX_PIPELINE_MAP.md §4.14）。
 */
export const VFX_BIOME_GAIN: Readonly<Record<string, number>> = {
    /** 2026-10-19 實機：0.7／0.85 偏暗，各提亮 10% */
    ICE: 0.77,
    DESERT: 0.94,
};

/**
 * 投射物繪製（ProjectileRenderer 取樣、ProjectilePartPainter 繪製）。外觀表在 data/vfx/projectile_visuals.ts。
 * 本體沿螢幕上的飛行方向旋轉（自轉的投射物改用自轉角），速度越快拉得越長（動態模糊感）。
 */
export const PROJECTILE_RENDER = {
    /** 拖尾取樣點數（奧義乘 ULT_TRAIL_MULT）；間距見 VFX_RENDER.TRAIL_STEP_DIST */
    TRAIL_SAMPLES: 12,
    ULT_TRAIL_MULT: 2,
    /** 取樣的 t 步長上下限（飛得越遠步長越小） */
    TRAIL_T_STEP_MIN: 0.005,
    TRAIL_T_STEP_MAX: 0.05,
    /** 奧義投射物整體放大 */
    ULT_SCALE: 1.5,
    /** 速度拉伸：stretch = 1 + max(0, 速度 − SPEED_REF) / SPEED_SPAN；垂直方向壓到 max(SQUISH_MIN, 1/stretch) */
    STRETCH_SPEED_REF: 800,
    STRETCH_SPEED_SPAN: 2500,
    SQUISH_MIN: 0.4,
    /** 光痕拖尾的頭端不透明度；煙拖尾的頭端不透明度與尾端放大倍率 */
    STREAK_ALPHA: 1,
    SMOKE_ALPHA: 0.9,
    SMOKE_GROW: 1.8,
    /** 煙拖尾每隔幾個取樣點蓋一團（越大越省） */
    SMOKE_EVERY: 2,
    /** 頭部光暈不透明度 */
    GLOW_ALPHA: 0.9,
} as const;

/**
 * 粒子型別特性表（SSOT，docs/VFX_PIPELINE_MAP.md §5-5）：每個 ParticleType 一列，下面的集合都由它推導。
 *  - backend：ParticleRenderer 交給哪個繪製器——PART＝PartPainter（零件）、BILL＝非零件（光束掛零件另走 drawBeam；其餘只畫除錯點）。
 *    天氣在地形 T4（2026-10-19）改成 PART 粒子，ATMOSPHERE 型別與看板繪製器已刪。
 *    BEAM 一律掛光束零件走 PartPainter.drawBeam。舊的 PROC／GROUND 型別與繪製器已全部移除（docs/VFX_PIPELINE_MAP.md §4.10、§4.12）。
 *  - ground：貼地（排序用前緣、z 鎖地面、VFXPlayer 以 groundZ 生成）→ VFX_GROUND_TYPES
 *  - physical：受重力與落地反彈（VFXPhysics）→ PHYSICAL_PARTICLE_TYPES
 *  - fixed：生成時不給隨機自轉（VFXPlayer）→ FIXED_ORIENTATION_PARTICLE_TYPES
 *  - selfDrawn：繪製器自己畫外形、不需要粒子貼圖（VFXPlayer）→ SELF_DRAWN_PARTICLE_TYPES
 * 新增型別時只改這張表；tests/VFXBackend.test.ts 鎖住推導結果。
 */
export type ParticleBackend = 'PART' | 'BILL';
interface ParticleTraits { backend: ParticleBackend; ground?: true; physical?: true; fixed?: true; selfDrawn?: true }
export const PARTICLE_TRAITS: Readonly<Record<ParticleType, ParticleTraits>> = {
    PART: { backend: 'PART', fixed: true, selfDrawn: true },
    PART_GROUND: { backend: 'PART', ground: true, fixed: true, selfDrawn: true },
    PART_DEBRIS: { backend: 'PART', physical: true, fixed: true, selfDrawn: true },
    BEAM: { backend: 'BILL', selfDrawn: true },
    GENERIC_DEBUG: { backend: 'BILL' },
};
const particleTypesWhere = (pred: (t: ParticleTraits) => boolean): ReadonlySet<string> =>
    new Set((Object.keys(PARTICLE_TRAITS) as ParticleType[]).filter((k) => pred(PARTICLE_TRAITS[k])));
/** 依特性表查繪製後端；未知型別（不應發生）當看板 */
export const particleBackend = (type: string): ParticleBackend => PARTICLE_TRAITS[type as ParticleType]?.backend ?? 'BILL';
export const VFX_GROUND_TYPES = particleTypesWhere((t) => !!t.ground);
export const PHYSICAL_PARTICLE_TYPES = particleTypesWhere((t) => !!t.physical);
export const FIXED_ORIENTATION_PARTICLE_TYPES = particleTypesWhere((t) => !!t.fixed);
export const SELF_DRAWN_PARTICLE_TYPES = particleTypesWhere((t) => !!t.selfDrawn);
export const PART_PARTICLE_TYPES = particleTypesWhere((t) => t.backend === 'PART');

/**
 * 奧義專屬演出常數（ART_SPEC §6、DECISIONS §4、ULT_FEEL §2-A）：
 * 命中點局部光爆（奧義名橫幅、詠唱暗場＋聚光都試過，使用者回饋後移除；暗場見 c7df349）。
 */
export const ULT_FEEL = {
    // --- A3: 命中光爆 ---
    /** 命中局部光爆半徑（格數，約 2～3 格） */
    IMPACT_BURST_RADIUS_HEX: 2.4,
    /** 命中局部光爆最大不透明度（<= 0.35） */
    IMPACT_BURST_MAX_ALPHA: 0.32,
    /** 命中局部光爆持續時間（秒，0.15～0.25 s） */
    IMPACT_BURST_DURATION: 0.20,
    /** 預烘焙命中光爆 sprite 半徑（像素） */
    IMPACT_BURST_BAKE_RADIUS: 256,
    /** 命中光爆起始縮放比例 */
    IMPACT_BURST_SCALE_FROM: 0.35,
    /** 命中光爆結束縮放比例 */
    IMPACT_BURST_SCALE_TO: 1.15,

    // --- 容量上限（固定容量、每幀零配置） ---
    /** 命中點追蹤槽位上限 */
    MAX_IMPACTS: 8,

    // --- B: 風暴落點邊界約束 ---
    /** 散布落點超出地圖時，每次往中心收縮的比例 */
    SCATTER_CLAMP_RETRACT_RATIO: 0.75,
    /** 散布落點超出地圖時，最大收縮嘗試次數（超過仍出界則直接落在中心） */
    SCATTER_CLAMP_MAX_STEPS: 4,
} as const;
