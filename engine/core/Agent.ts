
import { Skill, Team, Role, MovementType, AnimState, Hex } from "../../types";
import { HexUtils, MapConfig } from "../utils";
import { UNIT_DB } from "../../data/units";
import { BTNode } from "../behaviorTree";

export type SpecialVisualStatus = 'NONE' | 'FROZEN' | 'POLYMORPH' | 'STASIS';

export class Agent {
    public id: string;
    public team: Team;
    public role: Role;
    public q: number;
    public r: number;
    public px: number;
    public py: number;
    
    // Stats
    public hp: number = 100;
    public maxHp: number = 100;
    public mp: number = 0;
    public maxMp: number = 100;
    public moveSpeed: number = 1.0; 
    public moveSpeedMult: number = 1.0; 
    public jump: number = 1; // Vertical mobility tier
    public weight: number = 1; // Knockback resistance
    public movementType: MovementType = MovementType.GROUND;
    
    // Skills
    public skillIds: (string | null)[] = [null, null, null];
    public skills: (Skill | null)[] = [];
    public castingSkillIdx: number = -1;
    public castTimer: number = 0;
    public castingAnimationTimer: number = 0; 
    public curCDs: number[] = [0, 0, 0];
    
    // State / AI
    public isMoving: boolean = false;
    public path: Hex[] = []; 
    public trajectory: Hex[] = []; 
    public moveProgress: number = 0;
    public facing: number = 1; 
    public target: Agent | null = null;
    public targetHex: Hex | null = null; 
    public btStatus: string = "待機";
    public bt: BTNode | null = null;
    
    // Status Effects
    public stunTimer: number = 0;
    public stunMax: number = 0; 
    
    public banishTimer: number = 0;
    public banishMax: number = 0; 
    
    public silenceTimer: number = 0;
    public silenceMax: number = 0; 
    
    // --- NEW CC TIMERS ---
    public rootTimer: number = 0;
    public rootMax: number = 0;

    public slowTimer: number = 0;
    public slowMax: number = 0;

    public fearTimer: number = 0;
    public fearMax: number = 0;
    public fearSourceId: string | null = null; // To run away from

    public confusionTimer: number = 0;
    public confusionMax: number = 0;
    // ---------------------

    public banished: boolean = false;
    
    public dotTimer: number = 0;
    public dotDmg: number = 0;
    public hotTimer: number = 0;
    public hotVal: number = 0;

    // Diminishing Returns (DR) System
    // Tracks current stack count per CC type (STUN, SILENCE, etc.)
    public drStacks: Record<string, number> = {}; 
    // Tracks time until DR resets for that type
    public drTimers: Record<string, number> = {}; 
    
    // Visual State
    public visualStatus: SpecialVisualStatus = 'NONE';
    public spawnTimer: number = 0;
    
    // Lifecycle
    public deadLogged: boolean = false;
    public fullyDead: boolean = false;
    public animState: AnimState = AnimState.IDLE;
    public hitFlashTimer: number = 0;

    // Physics
    public physics = { 
        x: 0, y: 0, z: 0,          
        vx: 0, vy: 0, vz: 0,       
        angle: 0, vAngle: 0   
    };

    public initialState: { q: number, r: number, maxHp: number, skillIds: (string|null)[], role: Role };

    constructor(team: Team, q: number, r: number, config: MapConfig) {
        this.id = Math.random().toString(36).substr(2, 5).toUpperCase();
        this.team = team;
        this.role = Role.WARRIOR; 
        this.q = q;
        this.r = r;
        
        const p = HexUtils.toPx(q, r, config);
        this.px = p.x;
        this.py = p.y;
        this.facing = team === Team.BLUE ? 1 : -1;

        this.initialState = { q, r, maxHp: 100, skillIds: [], role: Role.WARRIOR };
    }

    setAnim(state: AnimState) {
        if (this.animState !== state && this.animState !== AnimState.DEAD) {
            this.animState = state;
        }
    }

    saveState() {
        this.initialState = {
            q: this.q,
            r: this.r,
            maxHp: this.maxHp,
            skillIds: [...this.skillIds],
            role: this.role
        };
    }

    reset(config: MapConfig) {
        this.q = this.initialState.q;
        this.r = this.initialState.r;
        const p = HexUtils.toPx(this.q, this.r, config);
        this.px = p.x;
        this.py = p.y;
        
        this.maxHp = this.initialState.maxHp;
        this.hp = this.maxHp;
        this.mp = 0;
        
        this.skillIds = [...this.initialState.skillIds];
        this.role = this.initialState.role;
        
        const stats = UNIT_DB[this.role];
        if (stats) {
            this.moveSpeed = stats.moveSpeed;
            this.maxMp = stats.maxMp;
            this.jump = stats.jump;
            this.weight = stats.weight;
            this.movementType = stats.movementType;
        }

        this.castingSkillIdx = -1;
        this.castTimer = 0;
        this.castingAnimationTimer = 0;
        this.curCDs = [0, 0, 0];
        
        this.isMoving = false;
        this.moveSpeedMult = 1.0; 
        this.path = [];
        this.moveProgress = 0;
        
        this.stunTimer = 0;
        this.stunMax = 0;
        this.banishTimer = 0;
        this.banishMax = 0;
        this.silenceTimer = 0;
        this.silenceMax = 0;
        
        // Reset New CCs
        this.rootTimer = 0; this.rootMax = 0;
        this.slowTimer = 0; this.slowMax = 0;
        this.fearTimer = 0; this.fearMax = 0; this.fearSourceId = null;
        this.confusionTimer = 0; this.confusionMax = 0;

        this.banished = false;
        this.dotTimer = 0;
        this.hotTimer = 0;
        this.visualStatus = 'NONE';
        
        // Reset DR
        this.drStacks = {};
        this.drTimers = {};

        this.hitFlashTimer = 0;
        this.deadLogged = false;
        this.fullyDead = false;
        this.animState = AnimState.IDLE;
        this.spawnTimer = 0.5; 
        
        this.target = null;
        this.targetHex = null;
        this.physics = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, vAngle: 0 };
    }
}
