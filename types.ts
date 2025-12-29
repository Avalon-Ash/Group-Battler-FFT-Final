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

export interface Cube {
    x: number;
    y: number;
    z: number;
}

export interface Point {
    x: number;
    y: number;
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
    ambientType: 'NONE' | 'SNOW' | 'ASH' | 'SPORES' | 'RAIN' | 'EMBER';
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
    
    effectType?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE';
    effectVal?: number; 

    effectType2?: 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE';
    effectVal2?: number;

    projectileSpeed?: number; 
    visual?: 'ARROW' | 'FIREBALL' | 'BOLT' | 'SLASH' | 'SMASH' | 'BEAM' | 'BOMB';

    visualHitEffect?: string;  
    visualCastEffect?: string; 
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
    RUNNING = 'R'
}

export type LogActionType = 'MOVE' | 'CAST' | 'HIT' | 'DECISION' | 'DEATH' | 'SYSTEM' | 'HEAL' | 'CC' | 'HAZARD';

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

export interface Projectile {
    id: string;
    active: boolean; 
    createdAt: number; 
    lifespan: number; 

    x: number;
    y: number;
    startX: number; 
    startY: number; 
    startZ?: number; 
    targetId: string;
    targetPos: Point;
    speed: number;
    skill: Skill;
    sourceId: string;
    team: Team;
    trail: Point[];
}

export interface GroundHazard {
    id: string;
    q: number;
    r: number;
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

export type GameEventType = 'DAMAGE' | 'HEAL' | 'CC_APPLIED' | 'CAST_START' | 'CAST_FINISH' | 'PROJECTILE_SPAWN' | 'PROJECTILE_HIT' | 'DEATH' | 'SPAWN' | 'VISUAL_BEAM' | 'CAST_BREAK' | 'VISUAL_SLASH' | 'KILL' | 'IMPACT_AOE' | 'KILL_STREAK';

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
}

export enum ToolType {
    SELECT = 'SELECT',
    ADD_BLUE = 'ADD_BLUE',
    ADD_RED = 'ADD_RED',
    OBSTACLE = 'OBSTACLE',
    DELETE = 'DELETE'
}