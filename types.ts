
// ╔══════════════════════════════════════════════════════════╗
// ║  [CONTRACT] 全域型別主契約 — 所有系統的型別定義從這裡找 ║
// ║                                                          ║
// ║  補充型別位置：                                          ║
// ║  → VFX 粒子 Schema（Particle、Decal 詳細欄位）          ║
// ║    → types/VFXSchema.ts                                 ║
// ║                                                          ║
// ║  新增型別規則：                                          ║
// ║  → 引擎核心型別（Agent、Skill、Hex、GameEvent）→ 本檔   ║
// ║  → 特定子系統的複雜型別 → types/ 目錄下獨立檔案         ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from './engine/core/Agent';
import type { MapConfig } from './engine/utils';

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

export type GameEventType = 'DAMAGE' | 'HEAL' | 'CC_APPLIED' | 'CAST_START' | 'CAST_FINISH' | 'PROJECTILE_SPAWN' | 'PROJECTILE_HIT' | 'DEATH' | 'SPAWN' | 'VISUAL_BEAM' | 'CAST_BREAK' | 'VISUAL_SLASH' | 'KILL' | 'IMPACT_AOE' | 'KILL_STREAK' | 'HAZARD_SPAWN' | 'GROUND_IMPACT' | 'LAST_STAND_TRIGGERED';

export interface GameEvent {
    type: GameEventType;
    pos: Point;
    value?: number; 
    text?: string; 
    color?: string;
    skill?: Skill;
    sourceId?: string;
    targetId?: string;
    team?: Team;
    absorbed?: number;
}

export enum Team {
    BLUE = 0,
    RED = 1
}

export type HexLayout = 'FLAT' | 'POINTY';

export enum Role {
    TANK = 'TANK',
    WARRIOR = 'WARRIOR',
    RANGER = 'RANGER',
    MAGE = 'MAGE',
    SUPPORT = 'SUPPORT'
}

export enum MovementType {
    GROUND = 0,
    FLYING = 1
}

export enum ActionState {
    IDLE = 0,
    WALKING = 1,
    ATTACKING = 2,
    EVADING = 3,
    CASTING = 4,
    STUNNED = 5,
    DYING = 6
}

export enum AnimState {
    IDLE = 0,
    COMBAT_IDLE = 1,
    ATTACK = 2,
    HIT = 3,
    DEAD = 4,
    STUN = 5,
    MOVE = 6
}

export enum AIState {
    IDLE = 0,
    WAITING = 1,
    CC_INTERRUPTED = 2,
    DEAD = 3,
    CASTING_ULT = 4,
    CASTING_ACTIVE = 5,
    CASTING_BASIC = 6,
    TRACKING = 7,
    EVADING = 8,
    EVADING_URGENT = 9,
    LAST_STAND_PUSH = 10,
    LAST_STAND_ATTACK = 11,
    COMBAT_LOCK = 12,
}

export interface Hex {
    q: number;
    r: number;
}

export interface Cube {
    x: number;
    y: number;
    z: number;
}

export interface Point {
    x: number;
    y: number;
    z?: number;
}

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
    specialVisualStatus?: 'POLYMORPH' | 'STASIS' | 'FROZEN'; 
    ccType?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'SHIELD';
    ccDur?: number;
    ccForce?: number;
    ccType2?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'SHIELD';
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

export interface KillStreakInfo {
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
