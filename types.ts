
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
    ccType2?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'SHIELD' | 'POLYMORPH' | 'INVINCIBLE' | 'VULNERABLE';
    ccDur2?: number;
    ccForce2?: number;
    effectType?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE' | 'DASH' | 'SELF_DAMAGE';
    effectVal?: number; 
    effectType2?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE' | 'DASH' | 'SELF_DAMAGE';
    effectVal2?: number;
    projectileSpeed?: number; 
    visual?: 'ARROW' | 'FIREBALL' | 'BOLT' | 'SLASH' | 'SMASH' | 'BEAM' | 'BOMB';
    visualHitEffect?: string;
    visualProjectileEffect?: string;
}

import type { Agent } from './engine/core/Agent';
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
    trail: Point[];

    // NEW: Embedded Trajectory Configuration (The "How" of movement)
    trajectoryInfo: {
        type: 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT' | 'HOVER_DIP';
        arcHeight?: number;
        wobbleFreq?: number;
        wobbleAmp?: number;
        spinSpeed?: number;
        spriteKey?: string; // Cache visual key
        scale?: number;
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

export interface GroundHazard {
    id: string;
    q: number;
    r: number;
    centerQ?: number;
    centerR?: number;
    pullRadius?: number;
    type: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC';
    duration: number; 
    sourceId: string;
    team: Team;
    color: string;
    power: number; 
    interval: number; 
    timer: number; 
    vfxId?: string; 
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
    GAME_START: Record<string, never> | void;
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

export interface TerrainAmbienceEntry {
    detail: TerrainSurfaceDetailConfig;
    /** 非 null 時，地塊頂面疊一層循環液面（drawLiquid） */
    liquid: TerrainLiquidSurfaceConfig | null;
}

export interface LiquidLoopConfig {
    loop: LoopTiming;
    radiusRatio: number;
    pad: number;
    baseAlpha: number;
    intensityStep: number;
    flowAmplitude: number;
    flowHarmonicX: number;
    flowHarmonicY: number;
    shadeColor: string;
    shadeRadiusX: number;
    shadeRadiusY: number;
    bubbleColor: string;
    bubbleAlpha: number;
    bubbleHarmonicX: number;
    bubbleHarmonicY: number;
    bubbleOrbitRatio: number;
    bubbleRadiusRatio: number;
}

export interface WeatherAmbienceConfig {
    /** 品質階層 0 的生成間隔（秒）；低階層除以 VFX_BUDGET.TIER_EMISSION_RATIOS */
    interval: number;
    /** 品質階層 0 的同時存在 ATMOSPHERE 粒子上限；低階層乘以 TIER_EMISSION_RATIOS */
    maxActive: number;
    /** 1 或 2 種顏色；兩色時 primaryChance 為取第一色的機率 */
    colors: readonly string[];
    primaryChance: number;
    size: AmbienceRange;
    vx: AmbienceRange;
    vy: AmbienceRange;
    /** 壽命（秒）；null = 生成範圍寬度 / vx（剛好飛越整個範圍） */
    life: number | null;
    spawn: 'ANYWHERE' | 'LEFT_EDGE';
    blendMode: GlobalCompositeOperation;
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
