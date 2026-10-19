
// ╔══════════════════════════════════════════════════════════╗
// ║  [CONTRACT] 全域型別主契約 — 所有系統的型別定義從這裡找 ║
// ║                                                          ║
// ║  補充型別位置：                                          ║
// ║  → VFX 粒子 Schema（Particle、Decal 詳細欄位）          ║
// ║    → types/VFXSchema.ts                                 ║
// ║                                                          ║
// ║  新增型別規則：                                          ║
// ║  → Agent 型別 → engine/core/Agent.ts（此處為 type-only re-export）║
// ║  → Enum（Role、Team、AnimState 等）→ engine/types/Enums.ts         ║
// ╚══════════════════════════════════════════════════════════╝

import { Team, Role, MovementType, ActionState, AnimState, AIState } from './engine/types/Enums';
export { Team, Role, MovementType, ActionState, AnimState, AIState };

export type HexLayout = 'FLAT' | 'POINTY';

export interface Hex {
    q: number;
    r: number;
}

export interface Point {
    x: number;
    y: number;
    z?: number;
}

export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export interface HexSpatialLookup {
    tileMap: Map<string, { px: number; py: number; h: number }>;
    ensure?(engine?: unknown): void;
}

export type SpecialVisualStatus = 'NONE' | 'FROZEN' | 'POLYMORPH' | 'STASIS' | 'DANGER' | 'INVINCIBLE';

export interface AgentView {
    visualStatus: SpecialVisualStatus;
    hitFlashTimer: number;
    visualOffset: Point;
}

export interface Skill {
    id: string;
    tag: 'BASIC' | 'ACTIVE' | 'ULT';
    role: Role;
    team?: Team; 
    name: string;
    desc?: string; 
    range: number;
    cast: number;
    cd: number;
    cost: number;
    gain: number;
    type: 'SINGLE' | 'AOE';
    aoeRadius?: number; 
    power: number;
    color: string;
    element?: 'PHYSICAL' | 'FIRE' | 'ICE' | 'LIGHTNING' | 'HOLY' | 'VOID' | 'POISON' | 'ARCANE' | 'BLOOD';
    specialVisualStatus?: 'POLYMORPH' | 'STASIS' | 'FROZEN' | 'INVINCIBLE'; 
    ccType?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'SHIELD' | 'POLYMORPH' | 'INVINCIBLE' | 'VULNERABLE';
    ccDur?: number;
    ccForce?: number;
    ccSelf?: boolean;
    ccType2?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'SHIELD' | 'POLYMORPH' | 'INVINCIBLE' | 'VULNERABLE';
    ccDur2?: number;
    ccForce2?: number;
    ccSelf2?: boolean;
    effectType?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE' | 'DASH' | 'SELF_DAMAGE';
    effectVal?: number; 
    effectType2?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE' | 'DASH' | 'SELF_DAMAGE';
    effectVal2?: number;
    projectileSpeed?: number; 
    visual?: 'ARROW' | 'FIREBALL' | 'BOLT' | 'SLASH' | 'SMASH' | 'BEAM' | 'BOMB';
    visualHitEffect?: string;
    visualProjectileEffect?: string;
}

export type EffectKind =
    | 'STUN' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND'
    | 'BANISH' | 'STASIS' | 'POLYMORPH' | 'INVINCIBLE' | 'VULNERABLE'
    | 'DOT' | 'HOT';

export interface EffectSlot {
    remaining: number;     // 原 xxxTimer
    max: number;           // 原 xxxMax（沒有 Max 欄位的效果也記，給 UI 用）
    value: number;         // DOT＝原 dotDmg、HOT＝原 hotVal，其餘 0
    tag: string | null;    // DOT＝原 dotType，其餘 null
    sourceId: string | null; // TAUNT＝原 tauntTargetId，其餘 null
}
export type EffectSlots = Record<EffectKind, EffectSlot>;


import type { Agent } from './engine/core/Agent';
import type { PartSpec } from './engine/renderers/vfxparts/PartSpec';
import type { PartAnim } from './types/VFXSchema';
import { MapConfig } from './engine/utils';
export type { Agent };
export type { MapConfig };

export interface ZoneConfig {
    enabled: boolean;
    initialRadius: number;
    shrinkInterval: number;
    minRadius: number;
}

export interface LogProvider {
    log(agent: Agent | null, type: LogActionType, actionName: string, targetInfo: string | null, detail: string): void;
}

export interface SpatialProvider {
    isValid(q: number, r: number): boolean;
    isBlocked(q: number, r: number, ignoreId?: string, movementType?: MovementType): boolean;
    getTerrainHeight(q: number, r: number): number;
    getSpatialHazardsAt(q: number, r: number): SpatialHazard[];
    isValidHash(h: number): boolean;
    hasObstacleHash(h: number): boolean;
    getObstacleTypeHash(h: number): string | undefined;
    getAgentHash(h: number): Agent | undefined;
    getMapConfig(): MapConfig;
    updateAgentPosition(agent: Agent, q: number, r: number): void;
    getAgents(): Agent[];
    isWarningTile(key: string): boolean;
    getTileDepth(q: number, r: number): number;
    getCurrentShrinkLevel(): number;
    readonly isLastStand: boolean;
}

export interface Projectile {
    id: string;
    active: boolean; 
    createdAt: number; 
    lifespan: number; 

    // SSOT: 3D Logic Position
    x: number;
    y: number;
    z: number;
    
    // SSOT: Path Progress
    t: number; 
    totalDuration: number;

    // SSOT: Path Constants (Locked at spawn)
    startX: number; 
    startY: number; 
    startZ: number; 
    endX: number;
    endY: number;
    endZ: number;
    
    targetId: string;
    targetHexQ: number;
    targetHexR: number;
    targetPos: Point; 
    speed: number;
    skill: Skill;
    sourceId: string;
    team: Team;

    /** 生成時鎖定的軌跡參數（TrajectoryMath）與外觀鍵（PROJECTILE_VISUALS 的鍵，繪製端查 look） */
    trajectoryInfo: {
        type: 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT' | 'HOVER_DIP';
        arcHeight?: number;
        wobbleFreq?: number;
        wobbleAmp?: number;
        spinSpeed?: number;
        dipAmount?: number;
        lookKey: string;
    };
}

export interface SpatialHazard {
    id: string;
    type: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC';
    cells: {q: number, r: number}[];
    duration: number;
    sourceId: string;
    team: Team;
    color: string;
    power: number;
    tickInterval: number;
    lastTickTime: number;
    centerQ?: number;
    centerR?: number;
    pullRadius?: number;
}

export type GameEventType = 'DAMAGE' | 'HEAL' | 'CC_APPLIED' | 'CAST_START' | 'CAST_FINISH' | 'PROJECTILE_SPAWN' | 'PROJECTILE_HIT' | 'DEATH' | 'SPAWN' | 'VISUAL_BEAM' | 'CAST_BREAK' | 'VISUAL_SLASH' | 'KILL' | 'IMPACT_AOE' | 'KILL_STREAK' | 'HAZARD_SPAWN' | 'GROUND_IMPACT' | 'LAST_STAND_TRIGGERED' | 'HIT_FX';

export interface GameEvent {
    type: GameEventType;
    pos: Point;
    value?: number; 
    text?: string; 
    color?: string;
    skill?: Skill | (Partial<Skill> & { ccType: string; dotType?: string });
    sourceId?: string;
    targetId?: string;
    team?: Team;
    absorbed?: number;
    /** DAMAGE：本次是暴擊（DamageCalculator 的結果；浮字字級與重擊音效讀它） */
    crit?: boolean;
    /** CAST_BREAK：被中斷的 AOE 技能預警範圍（中斷當下的 telegraph），供崩解特效逐格播放 */
    hexes?: readonly Hex[];
}

export interface EventMap {
    GAME_RESET: Record<string, never> | void;
    GAME_CLEAR: Record<string, never> | void;
    ENV_UPDATE: Record<string, never> | void;
    /** sceneId：開戰時的地圖（SCENE_DB id），AudioSystem 依它選戰鬥曲 */
    GAME_START: { sceneId?: string } | void;
    CAMERA_SHAKE: { intensity: number };
    CAMERA_MOVE: { x: number; y: number; zoom: number };
    GAME_OVER: { winner: Team | null };
    TILE_COLLAPSED: { q: number; r: number; worldX?: number; worldY?: number };
    ZONE_SHRUNK: { radius: number };
    LAST_STAND_TRIGGERED: { q: number; r: number };
    AGENT_RESET: { agentId: string };
    /** 單位死亡瞬間（同步發送，順序同原直接呼叫）。Renderer 訂閱後播放碎裂特效。 */
    AGENT_DIED: { agent: Agent; groundZ: number; impactX: number; impactY: number };
    KILL: { killerId: string; victimId: string };
    CAST_START: { sourceId: string; skill: Skill };
    /** 遊戲核心視覺/音訊事件通道 */
    GAME_EVENT: GameEvent;
    /** UI 唯一寫入事件閘門，由 UICommandSystem 處理 */
    UI_COMMAND: UICommand;
}

export type UICommand =
    | { type: 'SET_DIRECTOR_ENABLED'; enabled: boolean }
    | { type: 'SET_CAMERA_TUNING'; followStiffness?: number; zoomStiffness?: number }
    | { type: 'SET_ZONE_CONFIG'; config: Partial<ZoneConfig> }
    | { type: 'EDIT_AGENT'; agentId: string; role?: Role; maxHp?: number; hp?: number; maxMp?: number; bodyType?: BodyTypeId }
    | { type: 'REBUILD_AGENT_AI'; agentId: string }
    /** 檢視器換技能槽（UnitStatusTab）；skillId null＝清空。開戰時 game.ts 依 skillIds 重建 skills */
    | { type: 'SET_AGENT_SKILL'; agentId: string; slot: number; skillId: string | null }
    /** 技能資料庫編輯（SkillDbTab）：field 限 data/ui/skillEditor.ts SKILL_EDITABLE_FIELDS；value undefined＝清除選填欄位 */
    | { type: 'UPDATE_SKILL'; skillId: string; field: keyof Skill; value: string | number | boolean | Team | undefined }
    | { type: 'RESET_GAME' }
    | { type: 'PAUSE_GAME' }
    | { type: 'RESUME_GAME' }
    | { type: 'SET_TIME_SCALE'; timeScale: number }
    | { type: 'PLACE_AGENT'; team: Team; q: number; r: number; hp?: number; role?: Role; bodyType?: BodyTypeId }
    | { type: 'REMOVE_AGENT_AT'; q: number; r: number }
    | { type: 'SET_OBSTACLE'; q: number; r: number; obstacleType?: string }
    | { type: 'REMOVE_OBSTACLE'; q: number; r: number }
    | { type: 'MOVE_AGENT'; agentId: string; q: number; r: number }
    | { type: 'START_GAME' }
    | { type: 'STOP_GAME' }
    | { type: 'SET_SHOWCASE_MODE'; enabled: boolean }
    | { type: 'CLEAR_BOARD'; keepScene?: boolean; skipRebuild?: boolean }
    | { type: 'RANDOMIZE_MAP'; w?: number; h?: number; layout?: HexLayout; sceneId?: string; randomizeScene?: boolean }
    | { type: 'CAMERA_ZOOM'; zoom: number }
    | { type: 'CAMERA_PAN'; dx: number; dy: number }
    | { type: 'CAMERA_SNAP'; x: number; y: number; zoom?: number }
    | { type: 'SET_VIEWPORT'; width: number; height: number }
    | { type: 'SET_AUDIO_VOLUME'; bus: 'master' | 'music' | 'sfx' | 'ui'; volume: number }
    | { type: 'SET_AUDIO_MUTED'; muted: boolean };

export * from './types/UIViewModel';


export interface SceneTheme {
    id: string;
    name: string;
    background: string; 
    horizon: string;    
    fogColor: string;   
    textureType: 'VOID' | 'FOREST' | 'ICE' | 'MAGMA' | 'DESERT';
    obstacleStyle: string; 
    hexStroke: string; 
    ambientType: 'NONE' | 'SNOW' | 'ASH' | 'SPORES' | 'RAIN' | 'EMBER' | 'SAND';
    ambientColor: string;
    bgFeature: 'NONE' | 'SKY_RIVER' | 'AURORA' | 'CANOPY' | 'HEAT_WAVE' | 'DUNES';
}


export interface UnitStats {
    role: Role;
    maxHp: number;
    maxMp: number;
    moveSpeed: number; 
    movementType: MovementType; 
}

export interface ObstacleDef {
    id: string;
    name: string;
    blocksVision: boolean;
    blocksMovement: boolean;
    blocksFlying?: boolean; 
}

export enum NodeState {
    SUCCESS = 'S',
    FAILURE = 'F',
    RUNNING = 'R',
    PENDING = 'P'
}

export interface LogEntry {
    id: string;
    time: string;
    turn: number; 
    agentId: string; 
    team: Team | undefined;
    location: string; 
    actionType: LogActionType;
    actionName: string; 
    targetInfo?: string; 
    detail: string; 
    visualColor?: string; 
    action?: string;
    target?: string;
    loc?: string;
}

export type LogActionType = 'MOVE' | 'CAST' | 'HIT' | 'DECISION' | 'DEATH' | 'SYSTEM' | 'HEAL' | 'CC' | 'HAZARD';

interface KillStreakInfo {
    count: number;
    lastTime: number;
}

export interface GlobalSessionState {
    killStreaks: Map<string, KillStreakInfo>;
    firstBloodTriggered: boolean;
}

export enum ToolType {
    SELECT = 'SELECT',
    ADD_BLUE = 'ADD_BLUE',
    ADD_RED = 'ADD_RED',
    OBSTACLE = 'OBSTACLE',
    DELETE = 'DELETE'
}

// ══════════════════════════════════════════════════════════════
// UI Window System Types (SSOT)
// ══════════════════════════════════════════════════════════════

export type WindowId =
    | 'logs'
    | 'db'
    | 'skillDb'
    | 'vfxmap'
    | 'vfxMap'
    | 'inspector'
    | 'monitor'
    | 'directorSettings'
    | 'zoneSettings'
    | 'showcaseSettings'
    | 'audioSettings';

export interface WindowRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WindowDef {
    id: WindowId;
    title: string;
    icon?: string;
    defaultRect: WindowRect;
    minSize: { width: number; height: number };
    kind?: 'window' | 'toolbar';
    visibleInShowcase?: boolean;
    visibleInManual?: boolean;
    /** 手動模式結算畫面（勝負已分）時仍可開啟；預設不可見（結算畫面只留這些視窗） */
    visibleOnGameOver?: boolean;
}

export interface WindowState {
    id: WindowId;
    isOpen: boolean;
    isCollapsed: boolean;
    isMaximized: boolean;
    rect: WindowRect;
    prevRect?: WindowRect;
    zIndex: number;
}

interface SerializedWindowState {
    x: number;
    y: number;
    w: number;
    h: number;
    max?: boolean;
    open?: boolean;
    collapsed?: boolean;
}

export type SerializedWindowMap = Record<string, SerializedWindowState>;

// ══════════════════════════════════════════════════════════════
// Unit Appearance, Body Types & 2.5D Sprite Types (SSOT)
// ══════════════════════════════════════════════════════════════

export type BodyTypeId = 'MALE' | 'FEMALE';

export interface BodyTypeProfile {
    label: string;
    enabled: boolean;
    heightScale: number;
    shadowScale: number;
    anchorYOffset: number;
    fallback: BodyTypeId | null;
}

export interface SpriteAppearanceConfig {
    manifestKey: string;
    targetHeight: number;
    shadowRadius: number;
    flashStrength: number;
}



// ══════════════════════════════════════════════════════════════
// Terrain Ambience (R2): 地表細節 / 液面循環 / 天氣粒子設定型別（資料在 data/vfx/terrainAmbience.ts）
// ══════════════════════════════════════════════════════════════

export type TerrainAmbienceBiome = 'VOID' | 'FOREST' | 'ICE' | 'MAGMA' | 'DESERT';
export type AmbienceWeatherType = 'SNOW' | 'ASH' | 'EMBER' | 'SPORES' | 'SAND' | 'VOID';

/** 隨機範圍：value = min + Math.random() * spread */
interface AmbienceRange {
    min: number;
    spread: number;
}

/** 無縫循環動畫：一個完整週期（秒）預渲染成 frames 張影格 */
interface LoopTiming {
    period: number;
    frames: number;
}

interface GrassTuftConfig {
    x: number;
    y: number;
    /** 草叢精靈編號（1 起算，會隨地形 variant 輪替） */
    sprite: number;
}

interface GrassSpriteConfig {
    size: number;
    anchorX: number;
    anchorY: number;
    scaleBase: number;
    scaleStep: number;
    scaleCycle: number;
    bladeHeight: number;
    bladeWidth: number;
    shadowRadiusMul: number;
    shadowColor: string;
    rootColor: string;
    tipColor: string;
    midStop: number;
    curveCtrl: number;
}

export interface GrassDetailConfig {
    kind: 'GRASS';
    baked: false;
    loop: LoopTiming;
    fallbackColor: string;
    tufts: readonly GrassTuftConfig[];
    windAmplitude: number;
    windXPhase: number;
    sprite: GrassSpriteConfig;
    /** 預渲染草叢（ObstacleSpriteStore 的裝飾圖集）；載入前退回 sprite 程序化草叢 */
    decor: { type: string; bakeScale: number; scale: number; frameStep: number; countByVariant: readonly number[] };
}

export interface IceSheenDetailConfig {
    kind: 'ICE_SHEEN';
    baked: false;
    loop: LoopTiming;
    radiusRatio: number;
    gradientSpan: number;
    slideWrap: number;
    slideOffset: number;
    bandHalfWidth: number;
    bandPeakColor: string;
    bandEdgeColor: string;
    scratchColor: string;
    scratchWidth: number;
    scratches: readonly (readonly [number, number, number, number])[];
    framePad: number;
}

export interface SandRipplesDetailConfig {
    kind: 'SAND_RIPPLES';
    baked: true;
    fallbackColor: string;
    lineWidth: number;
    alpha: number;
    rowFrom: number;
    rowTo: number;
    rowSpacing: number;
    xFrom: number;
    xTo: number;
    xStep: number;
    waveFrequency: number;
    waveAmplitude: number;
    offsetAmplitude: number;
    variantPhases: readonly number[];
}

export interface RunesDetailConfig {
    kind: 'RUNES';
    baked: true;
    variantMask: readonly boolean[];
    arms: number;
    armLength: number;
    lineWidth: number;
    alpha: number;
}

interface NoDetailConfig {
    kind: 'NONE';
    baked: false;
}

type TerrainSurfaceDetailConfig =
    | GrassDetailConfig
    | IceSheenDetailConfig
    | SandRipplesDetailConfig
    | RunesDetailConfig
    | NoDetailConfig;

interface TerrainLiquidSurfaceConfig {
    color: string;
    intensity: number;
}

/**
 * 靜態地表裝飾（VISUAL_ROADMAP T2）：烘進地塊 sprite（bakeBlock），依地形 variant 決定擺幾個、擺哪裡。
 * spots 是頂面中心起算的地面座標（canvas 單位，y 已是等距壓縮後）；只用前半格（y ≥ 0），裝飾頂端才不會超出 sprite。
 */
export interface TerrainDecorConfig {
    type: string;
    scale: number;
    spots: readonly { x: number; y: number }[];
    /** 索引＝variant % length：這個 variant 擺前幾個 spot */
    countByVariant: readonly number[];
}

/**
 * 崖邊裝飾（VISUAL_ROADMAP T2）：烘進地塊 sprite，只畫在「前側、鄰格較低」的邊（edgeMask 位元且 edgeIsFront）。
 *  - FRINGE：垂草（沿邊每 spacing 一根，往下垂 minLen..maxLen）
 *  - EAVE：積雪簷（沿邊粗白帶＋垂冰）
 *  - GLOW：發光邊（加法描邊＋往下滴落的光痕；drips 0＝只描邊）
 */
export type TerrainEdgeConfig =
    | { kind: 'FRINGE'; color: string; tipColor: string; spacing: number; minLen: number; maxLen: number; width: number }
    | { kind: 'EAVE'; color: string; width: number; dripEvery: number; dripMin: number; dripMax: number; dripWidth: number }
    | { kind: 'GLOW'; color: string; width: number; alpha: number; dripEvery: number; dripMin: number; dripMax: number };

export interface TerrainAmbienceEntry {
    /** 非 null 時在崖邊（前側落差邊）烘進裝飾 */
    edge: TerrainEdgeConfig | null;
    /** 非 null 時烘進靜態地表裝飾 */
    decor: TerrainDecorConfig | null;
    detail: TerrainSurfaceDetailConfig;
    /** 非 null 時，地塊頂面疊一層循環液面（drawLiquid） */
    liquid: TerrainLiquidSurfaceConfig | null;
}

/**
 * 液面循環影格（熔岩地塊、液態危害；TerrainLoopAtlas.bakeLiquid）。
 * 結構：發光熔體（中心亮、邊緣暗的放射漸層＋脈動）→ 漂移的冷卻硬殼（無縫 Voronoi，裂縫露出熔體）→
 * 冒泡 → 邊緣暗環。所有動作的諧波數都是整數，頭尾影格無縫。
 */
export interface LiquidLoopConfig {
    loop: LoopTiming;
    radiusRatio: number;
    pad: number;
    baseAlpha: number;
    intensityStep: number;
    /** 烘焙像素密度（每 canvas 單位幾 px），繪製時縮回 canvas 單位 */
    bakeScale: number;
    /** 硬殼位移不同的變體數（依格子雜湊選，鄰格不同步） */
    variants: number;
    /** 熔體配色：由液面基準色往這些顏色混合（0..1） */
    melt: { coreColor: string; coreMix: number; hotColor: string; hotMix: number; edgeDarken: number; coreStop: number; hotStop: number };
    /** 熔體亮度脈動：1 + amp * sin(2π * harmonic * u) */
    pulse: { harmonic: number; amp: number };
    /** 無縫硬殼貼圖：tile＝邊長（地面座標 px）、cells＝格點數、crack＝裂縫半寬、heat＝裂縫旁硬殼泛紅的寬度 */
    crust: { tile: number; cells: number; seed: number; crack: number; heat: number; alpha: number; color: string; heatColor: string; grain: number };
    /** 硬殼沿圓周漂移（半徑 px、整數諧波），變體之間再錯開 variantShift 個 tile 比例 */
    drift: { radius: number; harmonic: number; variantShift: number };
    /** 冒泡：每個泡泡在週期內生滅 harmonic 次 */
    bubbles: { count: number; radius: number; orbit: number; harmonic: number; alpha: number; color: string };
    /** 邊緣暗環（硬殼堆積在岸邊） */
    rim: { color: string; width: number };
}

export interface WeatherAmbienceConfig {
    /** 品質階層 0 的生成間隔（秒）；低階層除以 VFX_BUDGET.TIER_EMISSION_RATIOS */
    interval: number;
    /** 品質階層 0 的同時存在天氣粒子上限；低階層乘以 TIER_EMISSION_RATIOS */
    maxActive: number;
    /** 1 或 2 種零件（T4：天氣改六角零件管線）；兩種時 primaryChance 為取第一種的機率 */
    parts: readonly PartSpec[];
    /** 零件的基準半徑（px）：粒子 size 除以它就是繪製縮放 */
    partRadius: number;
    primaryChance: number;
    /** 拉長型零件（spark）沿速度方向轉；其餘不轉 */
    alignToVelocity: boolean;
    size: AmbienceRange;
    vx: AmbienceRange;
    vy: AmbienceRange;
    /** 壽命（秒）；null = 生成範圍寬度 / vx（剛好飛越整個範圍） */
    life: number | null;
    /** ANYWHERE／LEFT_EDGE＝天氣範圍（地圖外擴 WEATHER_BOUNDS.padding）；ISLAND＝只在地圖格子範圍內（霧氣、光柱） */
    spawn: 'ANYWHERE' | 'LEFT_EDGE' | 'ISLAND';
    blendMode: GlobalCompositeOperation;
    /** 以下為地圖氛圍層（T3）用的覆寫；未設時用 WEATHER_BOUNDS 的高度、WEATHER_PART_ANIM、不旋轉 */
    z?: AmbienceRange;
    vz?: AmbienceRange;
    anim?: PartAnim;
    /** 固定旋轉（弧度，光柱斜射）；alignToVelocity 為 true 時忽略 */
    rotation?: number;
}

export interface WeatherBoundsConfig {
    fallbackW: number;
    fallbackH: number;
    offsetX: number;
    offsetY: number;
    pxPerTile: number;
    padding: number;
    zMin: number;
    zSpread: number;
}

export interface ActiveZone {
    q: number;
    r: number;
    radius: number;
    color: string;
    progress: number;
    isEnemy: boolean;
}

