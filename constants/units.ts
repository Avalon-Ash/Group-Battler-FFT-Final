// ╔══════════════════════════════════════════════════════════╗
// ║  constants/units.ts — 單位外觀、投影、動畫與視覺動態 SSOT    ║
// ║  職責：定義單位階梯過渡、遮擋、核心投影、幀快取、殘影與精靈 ║
// ║  下游：engine/renderers/units、engine/renderers/frame      ║
// ╚══════════════════════════════════════════════════════════╝

import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, UNIT_SCALE } from './geometry';

/**
 * 單位腳下地面高度的過渡（VisualMath.getUnitGroundHeight）。
 * 移動中的單位視覺位置在 moveProgress = 0.5 越過格界，邏輯格卻到 1.0（抵達）才切換；
 * 若高度跟著邏輯格，上坡時 t∈(0.5,1) 腳會陷進較高的柱子、下坡則懸空。
 * 上坡：在越界前（RISE_START～RISE_END）升到目標高度；下坡：越界後（FALL_START～FALL_END）才降下。
 * 不變式：RISE_END <= 0.5 <= FALL_START（腳永遠不低於所在格的頂面）。
 */
export const UNIT_STEP_BLEND = {
    RISE_START: 0.25,
    RISE_END: 0.5,
    FALL_START: 0.5,
    FALL_END: 0.75,
} as const;

/** 前方（螢幕下方）鄰格比單位腳下高出此值以上，就視為遮擋該單位（補畫輪廓） */
export const UNIT_OCCLUSION = {
    MIN_STEP: 20,
} as const;

/** 職業字形刻在棋座頂面（俯視字形，烘焙時套等距壓扁）：相對棋座半徑的大小與不透明度 */
export const CLASS_GLYPH = {
    scale: 0.55,
    alpha: 0.8,
} as const;

/**
 * 棋座核心（懸浮六角晶體，把角色投影出來的投影器）。
 * 投影成形後，核心藏進投影中心、淡淡地透出來；發射點與受擊點都是投影中心
 * （VisualMath.projectionCenterAt，高度由 data/units/appearance/projection.ts 從精靈資料推導），
 * 繪製（UnitCorePainter）用同一個公式。投影不可見（拖曳預覽、放置幽靈、出生前）時才畫實體寶石，懸在棋座上。
 */
export const CORE_VISUAL = {
    /** 實體寶石（投影未成形）中心離棋座地面的高度（世界 z，等同螢幕像素） */
    hoverHeight: 26,
    /** 晶體半寬／半高（Token 畫布單位，烘焙後隨 UNIT_SCALE 縮放） */
    halfWidth: 11,
    halfHeight: 17,
    /** 上下浮動（世界像素）與週期（秒） */
    bobAmplitude: 2,
    bobPeriod: 2.6,
    /** 待機／施法中的光暈強度（0..1）與施法時的放大倍率 */
    idleGlow: 0.35,
    idleGlowPulse: 0.12,
    castGlow: 0.95,
    castGlowPulse: 0.2,
    castScale: 1.18,
    /** 投影成形後：寶石本體的不透明度（淡淡透出，不搶角色） */
    projectedAlpha: 0.25,
    /** 投影成形後：待機光暈強度與脈動（附加在 idleGlow 的語意上，但更淡） */
    projectedGlow: 0.12,
    projectedGlowPulse: 0.05,
    /** 投影成形後：施法中的光暈強度（比待機亮得多，讓「誰在詠唱」仍然看得出來） */
    projectedCastGlow: 0.85,
    /** 半透明預覽（放置幽靈）的不透明度 */
    ghostAlpha: 0.65,
    /** 烘焙畫布邊長（Token 畫布單位） */
    canvasSize: 64,
} as const;

/** UnitFrame 的視覺狀態參數（腳下格排序滯後，RenderSpec §2） */
export const UNIT_FRAME = {
    /** 腳下格只有在「新格格心比舊格格心近這麼多像素」時才切換，避免腳跨格界時排序鍵鋸齒翻轉 */
    HEX_HYSTERESIS_PX: 3,
    /**
     * 滯後放開：腳點連續這麼多幀都待在同一個錨點 STILL_PX（px，|dx|+|dy|，相對錨點的累積位移）內，就直接採用實際所在格。
     * 靜止的東西不會壓著格界來回，滯後只會讓它卡在舊格、排在自己腳下那格的地塊之前（屍體擊飛滑停在格界附近時整段殘留）。
     */
    HEX_RELEASE_FRAMES: 12,
    STILL_PX: 0.5,
    /**
     * 單位排序用腳點 Y 的死區（像素）：腳點離上次採用的值不超過這麼多就不動。
     * 受擊後退（PhysicsEngine 的彈簧，HIT_IMPULSE 衝量）讓 physics.y 擺盪約 1～2 px，真實位移但肉眼不可分辨；
     * 連續的鍵會讓它在鄰近的鍵（法陣粒子、屍體 0.5 px 平局值）兩側來回穿越。死區內鍵恆定，超過才跟隨（落後 ≤ 此值）。
     */
    SORT_DEADBAND_PX: 2,
} as const;

/**
 * 衝刺／高速移動殘影（角色投影的半透明複製，FFT 式）。
 * 位置來自 Agent.trailHistory（PhysicsSystem 唯一寫入者），換算在 engine/renderers/frame/Afterimage.ts，
 * 繪製在 UnitAfterimagePainter（RenderSpec §10）。
 */
export const AFTERIMAGE = {
    /** trailHistory 保留的最大點數（每個物理 tick 一點） */
    HISTORY_LENGTH: 15,
    /** 物理端開始記錄軌跡的速度平方（px/s）² */
    RECORD_SPEED_SQ: 10000,
    /** 殘影最多幾個（再依品質階層取較少者） */
    MAX_GHOSTS: 4,
    /** 各品質階層 [Tier 0, 1, 2, 3] 的殘影數上限 */
    GHOSTS_BY_TIER: [4, 3, 2, 1] as const,
    /** 相鄰殘影在 trailHistory 中相隔幾個點 */
    STRIDE: 2,
    /** 殘影與本體腳點的最小水平距離（px）；更近的殘影整個疊在本體後面，省略 */
    MIN_SEPARATION_PX: 6,
    /** 最近一個殘影的不透明度；其後依序線性遞減 */
    ALPHA_NEAREST: 0.5,
    /** 陣營軌跡色疊在殘影上的強度（0～1，source-atop） */
    TINT_STRENGTH: 0.6,
    /** 染色影格快取上限（超過時淘汰最舊） */
    MAX_TINTED_FRAMES: 96,
} as const;

/** 單位死亡擊飛（渲染層以經過時間推導位移，見 data/units/appearance/deathMotion.ts） */
export const DEATH_KNOCKBACK = {
    /** 放大 Ragdoll 軀幹初速（世界座標單位/秒）後作為滑行初速 */
    SPEED_SCALE: 2.2,
    /** 水平滑行的指數衰減係數（1/秒） */
    SLIDE_DECAY: 4,
    /** 水平總位移上限 */
    MAX_SLIDE: 110,
    /** 垂直初速放大倍率、重力與彈跳衰減 */
    VZ_SCALE: 1.6,
    GRAVITY: 1050,
    RESTITUTION: 0.35,
    BOUNCES: 2,
    /** 滑行軌跡檢查「是否滑出地塊」的時間範圍與取樣間隔（秒）；滑行約 1.5 秒後已停止 */
    GROUND_SCAN_END: 1.6,
    GROUND_SCAN_STEP: 0.05,
} as const;

/**
 * 護盾稜柱（ShieldPainter，全部是零件）：height 為圖集未就緒時的預設高度；實際高度＝角色頭頂高度＋headMargin。
 * 稜柱用 PRISM_RAMP（兩隊同色＝同一個狀態），掃描環與上下緣用陣營色階（factionSkin.shield.accentRamp）。
 */
export const SHIELD_VISUAL = {
    height: 80,
    radius: 38,
    headMargin: 8,
    PRISM_RAMP: 'STATUS_SKY',
    BLEND: 'screen' as GlobalCompositeOperation,
    /** 不透明度＝BASE_ALPHA＋護盾比例×STRENGTH_ALPHA＋sin(t×PULSE_FREQ)×PULSE_ALPHA；maxShield 未設定時以 DEFAULT_MAX 為分母 */
    BASE_ALPHA: 0.3,
    STRENGTH_ALPHA: 0.4,
    PULSE_FREQ: 5,
    PULSE_ALPHA: 0.1,
    DEFAULT_MAX: 100,
    /** 掃描環：上升速度（px/s）、各道環的半徑比例與不透明度倍率（份數＝陣列長度，相位均分）、粗細（px） */
    SCAN_SPEED: 120,
    SCAN_RATIOS: [0.9, 0.7] as const,
    SCAN_ALPHA_MULS: [1.2, 0.6] as const,
    SCAN_THICKNESS: 2,
    /** 上下緣陣營環 */
    RIM_THICKNESS: 1,
    RIM_ALPHA: 0.4,
} as const;

export const UNIT_SHADOW = {
    WIDTH: 110,
    BASE_HALF: 64,
    CORE_COLOR: 'rgba(0,0,0,1)',
    MID_STOP: 0.6,
    MID_COLOR: 'rgba(0,0,0,0.3)',
} as const;

export const UNIT_SPRITE = {
    targetHeightCanvasUnits: 59,
    referenceHeightPx: 158.3,
    footOffsetLocal: (UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET) / UNIT_SCALE,
    /** 精靈腳底離棋座地面的高度（目前精靈直接站在地面上；投影中心＝此值＋頭頂高度 × centerFraction） */
    footHover: 0,
    /** 投影中心在腳底到頭頂之間的位置（0.5＝正中央） */
    centerFraction: 0.5,
    /** 出生動畫長度（秒）；Agent.spawnTimer 從這裡倒數（UnitBodyPainter／UnitCorePainter 讀它） */
    spawnDuration: 0.5,
    facingHysteresisMs: 120,
    hitFlashDuration: 0.15,
    deathFadeDuration: 1.2,
    deathSinkDistance: 12,
    /** 精靈尚未載入時的退路圓盤半徑（UNIT_SCALE 前）與剪影色（UnitBodyPainter／UnitDeathPainter） */
    fallbackRadius: 20,
    fallbackSilhouetteColor: '#ffffff',
    mipLevels: [1.0, 0.5, 0.25] as const,
    silhouetteAlpha: 0.25,
    shadowScale: 1.0,
    idleFps: 6,
    walkFps: 10,
    attackFps: 12,
    castFps: 10,
    hitFps: 12,
    deathFps: 8,
    manifestPath: 'assets/units/manifest.json',
} as const;

/**
 * 單位本體的純繪製動態（UnitBodyPainter）：只在單位局部座標內套用，不寫 Agent、不進 UnitFrame 與排序鍵，
 * 發射點／受擊點（投影中心）不跟著浮動（RenderSpec §4）。
 */
export const UNIT_BODY_MOTION = {
    /** 待機上下浮動：振幅（canvas 單位，UNIT_SCALE 之前）與角頻率（rad/s） */
    groundBob: { amplitude: 3, freq: 2 },
    flyingBob: { amplitude: 2, freq: 4 },
    /** 高速移動的前傾上限（弧度）；反向移動（煞車）時的倍率 */
    maxTilt: 0.5,
    brakeTiltMult: 1.5,
    /** 奧義詠唱的脈動縮放（振幅、整段詠唱的脈動次數） */
    ultPulseAmp: 0.15,
    ultPulseCycles: 3,
    /** 出生動畫的下落距離（px，負值＝從上方落下；長度見 UNIT_SPRITE.spawnDuration） */
    spawnDrop: -40,
    /**
     * 墜落（縮圈塌陷，physics.z < 0）：進度＝min(1, −z / fallFadeDepth)。本體繞身體中心翻滾 fallTumble 弧度（朝面向）、
     * 縮小 fallShrink 比例；影子、本體、核心整組淡出（不透明度 1 − 進度^fallFadePow）。
     * 模擬端在 z < −1000 才判出局，淡出深度遠小於它，所以單位在消失前已經看不見。
     */
    fallFadeDepth: 320,
    fallFadePow: 1.5,
    fallTumble: 1.4,
    fallShrink: 0.45,
} as const;
