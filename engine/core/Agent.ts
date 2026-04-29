
import { Skill, Team, Role, MovementType, AnimState, Hex, AIState, ActionState } from "../../types";
import { HexUtils, MapConfig } from "../utils";
import { UNIT_DB } from "../../data/units";
import { BTNode } from "../behaviorTree";

export type SpecialVisualStatus = 'NONE' | 'FROZEN' | 'POLYMORPH' | 'STASIS' | 'DANGER';

export class Agent {
    public id: string;
    public team: Team;
    public role: Role;
    public q: number;
    public r: number;
    public px: number;
    public py: number;

    public hp: number = 100;
    public maxHp: number = 100;
    public shield: number = 0;
    public maxShield: number = 0;
    public mp: number = 0;
    public maxMp: number = 100;
    public moveSpeed: number = 1.0;
    public moveSpeedMult: number = 1.0;
    public jump: number = 1;
    public weight: number = 1;
    public movementType: MovementType = MovementType.GROUND;

    public skillIds: (string | null)[] = [null, null, null];
    public skills: (Skill | null)[] = [];
    public castingSkillIdx: number = -1;
    public castTimer: number = 0;
    public castingAnimationTimer: number = 0;
    public curCDs: number[] = [0, 0, 0];
    public currentTelegraph: {q: number, r: number}[] | null = null;

    public isMoving: boolean = false;
    public path: Hex[] = [];
    public trajectory: Hex[] = [];
    public moveProgress: number = 0;
    public stuckTicks: number = 0;
    public facing: number = 1;
    public target: Agent | null = null;
    public targetHex: Hex | null = null;
    public _savedCombatTarget?: Agent | null = null;
    public aiState: AIState = AIState.IDLE;
    public bt: BTNode | null = null;
    
    public aiUpdateTimer: number = 0;
    public aiUpdateInterval: number = 0.08;
    public forceAiUpdate: boolean = false;

    // SSOT Update: Store terrain height 'h' to ensure trails respect topography
    public trailHistory: {x: number, y: number, z: number, h: number}[] = [];

    public stunTimer: number = 0;
    public stunMax: number = 0;

    public banishTimer: number = 0;
    public banishMax: number = 0;

    public silenceTimer: number = 0;
    public silenceMax: number = 0;

    public banished: boolean = false;

    public rootTimer: number = 0;
    public fearTimer: number = 0;
    public tauntTimer: number = 0;
    public blindTimer: number = 0;
    public tauntTargetId: string | null = null;

    public dotTimer: number = 0;
    public dotDmg: number = 0;
    public dotType: string = 'POISON';
    public hotTimer: number = 0;
    public hotVal: number = 0;

    public drStacks: Record<string, number> = {};
    public drTimers: Record<string, number> = {};

    public visualStatus: SpecialVisualStatus = 'NONE';
    public activeCCVFX: string[] = [];
    public spawnTimer: number = 0;
    public escapeCooldown: number = 0; // Added missing property
    public _interruptCooldown: number = 0;
    public _castCompleteCooldown: number = 0;

    public deadLogged: boolean = false;
    public deathTimer: number = 0;
    public readonly DEATH_ANIM_DURATION = 5.5;
    public fullyDead: boolean = false;
    public animState: AnimState = AnimState.IDLE;
    public hitFlashTimer: number = 0;
    public lastHitDamage: number = 0;
    public lastHitSourceId: string | null = null;
    public actionState: ActionState = ActionState.IDLE;
    public fearMoveTimer: number = 0;
    public visualOffset = { x: 0, y: 0 };

    public physics = {
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        angle: 0, vAngle: 0
    };

    public initialState: { q: number, r: number, maxHp: number, skillIds: (string|null)[], role: Role };

    constructor(id: string, team: Team, q: number, r: number, config: MapConfig) {
        this.id = id;
        this.team = team;
        this.role = Role.WARRIOR;
        this.q = q;
        this.r = r;

        const p = HexUtils.toPx(q, r, config);
        this.px = p.x;
        this.py = p.y;
        this.facing = team === Team.BLUE ? 1 : -1;
        
        const stats = UNIT_DB[this.role];
        if (stats) {
            this.moveSpeed = stats.moveSpeed;
            this.maxMp = stats.maxMp;
            this.jump = stats.jump;
            this.weight = stats.weight;
            this.movementType = stats.movementType;
        }
        
        // Initial AI timing (will be refined by reset() usually, but safe to set here)
        this.aiUpdateInterval = 0.08;
        this.aiUpdateTimer = 0;

        this.initialState = { q, r, maxHp: 100, skillIds: [], role: Role.WARRIOR };
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
        this.shield = 0;
        this.maxShield = 0;
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

        // Set role-based AI interval with minor jitter to prevent frame-spiking
        let baseInterval = 0.08;
        switch (this.role) {
            case Role.TANK: baseInterval = 0.08; break;
            case Role.WARRIOR: baseInterval = 0.06; break;
            case Role.RANGER: baseInterval = 0.07; break;
            case Role.MAGE: baseInterval = 0.08; break;
            case Role.SUPPORT: baseInterval = 0.10; break;
        }
        this.aiUpdateInterval = baseInterval + Math.random() * 0.02;
        this.aiUpdateTimer = 0; // First frame execution as requested

        this.castingSkillIdx = -1;
        this.castTimer = 0;
        this.castingAnimationTimer = 0;
        this.curCDs = [0, 0, 0];
        this.currentTelegraph = null;

        this.isMoving = false;
        this.moveSpeedMult = 1.0;
        this.path = [];
        this.moveProgress = 0;
        this.stuckTicks = 0;

        this.stunTimer = 0;
        this.stunMax = 0;
        this.banishTimer = 0;
        this.banishMax = 0;
        this.silenceTimer = 0;
        this.silenceMax = 0;
        this.rootTimer = 0;
        this.fearTimer = 0;
        this.tauntTimer = 0;
        this.blindTimer = 0;
        this.tauntTargetId = null;

        this.banished = false;
        this.dotTimer = 0;
        this.dotType = 'POISON';
        this.hotTimer = 0;
        this.visualStatus = 'NONE';
        this.activeCCVFX = [];

        this.drStacks = {};
        this.drTimers = {};
        this.lastHitSourceId = null;
        this.hitFlashTimer = 0;
        this.lastHitDamage = 0;
        this.visualOffset = { x: 0, y: 0 };
        this.actionState = ActionState.IDLE;
        this.fearMoveTimer = 0;
        this.deathTimer = 0;
        this.deadLogged = false;
        this.fullyDead = false;
        this.animState = AnimState.IDLE;
        this.spawnTimer = 0.5;
        this._interruptCooldown = 0;
        this._castCompleteCooldown = 0;

        this.target = null;
        this.targetHex = null;
        
        this.physics = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, vAngle: 0 };
        this.trailHistory = [];
    }
}
