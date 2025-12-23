
export enum Team {
    BLUE = 0,
    RED = 1
}

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

export enum AnimState {
    IDLE = 0,
    COMBAT_IDLE = 1,
    ATTACK = 2,
    HIT = 3,
    DEAD = 4,
    STUN = 5,
    MOVE = 6
}

export interface Hex {
    q: number;
    r: number;
}

export interface Point {
    x: number;
    y: number;
}

// Scene / Environment Types
export interface SceneTheme {
    id: string;
    name: string;
    background: string; // Sky Top Color
    horizon: string;    // Sky Bottom/Horizon Color (New)
    fogColor: string;   // Low-lying fog color (New)
    textureType: 'VOID' | 'FOREST' | 'ICE' | 'MAGMA' | 'DESERT';
    obstacleStyle: string; 
    hexStroke: string; 
    ambientType: 'NONE' | 'SNOW' | 'ASH' | 'SPORES' | 'RAIN' | 'EMBER';
    ambientColor: string;
    bgFeature: 'NONE' | 'SKY_RIVER' | 'AURORA' | 'CANOPY' | 'HEAT_WAVE' | 'DUNES';
}

// Data Models
export interface Skill {
    id: string;
    tag: 'BASIC' | 'ACTIVE' | 'ULT';
    role: Role;
    team?: Team; // Optional: If specified, only this team can learn it
    name: string;
    desc?: string; // For Tooltips
    range: number;
    cast: number;
    cd: number;
    cost: number;
    gain: number;
    type: 'SINGLE' | 'AOE';
    aoeRadius?: number; // Default 1 if not specified
    power: number;
    color: string;
    
    // Control Effects (Slot 1)
    ccType?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE';
    ccDur?: number;
    ccForce?: number;

    // Control Effects (Slot 2) - NEW: Allows composite effects like Knockback + Stun
    ccType2?: 'STUN' | 'BANISH' | 'KNOCKBACK' | 'PULL' | 'DOT' | 'HOT' | 'SILENCE';
    ccDur2?: number;
    ccForce2?: number;
    
    // Special Combat Effects (Slot 1)
    effectType?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE';
    effectVal?: number; // e.g. 0.5 for 50% Vamp, 1.5 for 50% bonus Execute dmg

    // Special Combat Effects (Slot 2)
    effectType2?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE';
    effectVal2?: number;

    projectileSpeed?: number; // 0 = Instant
    visual?: 'ARROW' | 'FIREBALL' | 'BOLT' | 'SLASH' | 'SMASH' | 'BEAM' | 'BOMB';
}

export interface UnitStats {
    role: Role;
    maxHp: number;
    maxMp: number;
    baseHp: number; // For scaling reference
    moveSpeed: number; // Tiles per second. 1.0 = 1 tile/sec
    movementType: MovementType; // Ground or Flying
}

export interface ObstacleDef {
    id: string;
    name: string;
    blocksVision: boolean;
    blocksMovement: boolean;
    blocksFlying?: boolean; // New: If true, blocks even flying units (High Towers/Pillars)
}

// Logic State Types
export enum NodeState {
    SUCCESS = 'S',
    FAILURE = 'F',
    RUNNING = 'R'
}

export type LogActionType = 'MOVE' | 'CAST' | 'HIT' | 'DECISION' | 'DEATH' | 'SYSTEM' | 'HEAL' | 'CC';

export interface LogEntry {
    id: string;
    time: string;
    turn: number; // Battle tick or frame count
    agentId: string; // "Who"
    team: Team | undefined;
    location: string; // "Where" (e.g., "(10, 5)")
    actionType: LogActionType;
    actionName: string; // "What" (e.g., "Fireball", "MoveTo")
    targetInfo?: string; // "To Whom" (e.g., "Tank-A @ (12,5)")
    detail: string; // Narrative details
    visualColor?: string; // For UI highlighting
    
    // Legacy support fields (optional)
    action?: string;
    target?: string;
    loc?: string;
}

export interface Projectile {
    id: string;
    x: number;
    y: number;
    startX: number; // New: For Height Interpolation
    startY: number; // New: For Height Interpolation
    targetId: string;
    targetPos: Point;
    speed: number;
    skill: Skill;
    sourceId: string;
    team: Team;
    trail: Point[];
}

// Event System (Bridge between Logic and Visuals)
// Added VISUAL_BEAM for strict enforcement of instant ranged attacks
export type GameEventType = 'DAMAGE' | 'HEAL' | 'CC_APPLIED' | 'CAST_START' | 'CAST_FINISH' | 'PROJECTILE_SPAWN' | 'PROJECTILE_HIT' | 'DEATH' | 'SPAWN' | 'VISUAL_BEAM' | 'CAST_BREAK' | 'VISUAL_SLASH' | 'KILL';

export interface GameEvent {
    type: GameEventType;
    pos: Point;
    value?: number; // Damage amount, heal amount, etc.
    text?: string; // For specialized text
    color?: string;
    skill?: Skill;
    sourceId?: string;
    targetId?: string;
    team?: Team;
}

export interface FloatingText {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    velocity: number;
}

// Tooling
export enum ToolType {
    SELECT = 'SELECT',
    ADD_BLUE = 'ADD_BLUE',
    ADD_RED = 'ADD_RED',
    OBSTACLE = 'OBSTACLE',
    DELETE = 'DELETE'
}
