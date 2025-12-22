
import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { UNIT_DB } from "../data/units";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, AnimState, SceneTheme, Hex } from "../types";
import { BTNode } from "./behaviorTree";
import { HexUtils, MapConfig, Vector } from "./utils";
import { COLORS } from "../constants";

// Systems
import { MovementSystem } from "./systems/movement";
import { StatusSystem } from "./systems/status";
import { CombatSystem } from "./systems/combat";
import { MapSystem } from "./systems/map";
import { AISystem } from "./systems/ai";
import { AgentManager } from "./systems/agentManager";

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
    
    // Status Effects (Managed by StatusSystem)
    public stunTimer: number = 0;
    public banishTimer: number = 0;
    public silenceTimer: number = 0;
    public banished: boolean = false;
    public dotTimer: number = 0;
    public dotDmg: number = 0;
    public hotTimer: number = 0;
    public hotVal: number = 0;
    
    // Visual State
    public visualStatus: SpecialVisualStatus = 'NONE';
    public spawnTimer: number = 0;

    // Lifecycle
    public deadLogged: boolean = false;
    public fullyDead: boolean = false;
    public animState: AnimState = AnimState.IDLE;
    public animTimer: number = 0; 
    public hitFlashTimer: number = 0;

    // Physics (Enhanced for 3D bounce)
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
            this.animTimer = 0;
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
        this.banishTimer = 0;
        this.silenceTimer = 0;
        this.banished = false;
        this.dotTimer = 0;
        this.hotTimer = 0;
        this.visualStatus = 'NONE';
        
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

export class GameEngine {
    public agents: Agent[] = [];
    
    // Delegated to MapSystem
    get mapKeys() { return this.map.mapKeys; }
    get obstacles() { return this.map.obstacles; }
    
    public projectiles: Projectile[] = [];

    public events: GameEvent[] = [];
    
    public isRunning: boolean = false;
    public timeScale: number = 1.0;
    public battleTime: number = 0;
    public mapVersion: number = 0; 
    
    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0 };
    public currentScene: SceneTheme = SCENE_DB[0];
    
    public logs: LogEntry[] = [];
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
    public onWin?: (team: Team) => void;

    // AI Director State
    public directorTargetId: string | null = null;
    private directorTimer: number = 0;

    public agentMap: Map<number, Agent> = new Map();

    // Subsystems
    public movement: MovementSystem;
    public status: StatusSystem;
    public combat: CombatSystem;
    public map: MapSystem;
    public ai: AISystem;
    public agentManager: AgentManager;

    constructor() {
        this.movement = new MovementSystem();
        this.status = new StatusSystem();
        this.combat = new CombatSystem();
        this.map = new MapSystem();
        this.ai = new AISystem();
        this.agentManager = new AgentManager();
        
        this.map.randomizeEnvironment(this);
    }

    // --- Passthroughs ---
    
    addAgent(team: Team, q: number, r: number, hpOverride?: number) { return this.agentManager.addAgent(this, team, q, r, hpOverride); }
    
    // Updated to support Paint Mode
    setObstacle(q: number, r: number, type: string) { this.map.setObstacle(q, r, type); }
    removeObstacle(q: number, r: number) { this.map.removeObstacle(q, r); }
    toggleObstacle(q: number, r: number, type: string = 'WALL') { this.map.toggleObstacle(q, r, this, type); }
    
    isValid(q: number, r: number) { return this.map.isValid(q, r); }
    isBlocked(q: number, r: number, ignoreId?: string) { return this.map.isBlocked(q, r, this, ignoreId); }
    isValidHash(h: number) { return this.map.isValidHash(h); }
    hasObstacle(q: number, r: number) { return this.map.hasObstacle(q, r); }
    hasObstacleHash(h: number) { return this.map.hasObstacleHash(h); }
    randomizeEnvironment() { this.map.randomizeEnvironment(this); }
    rebuildMap() { this.map.rebuildMap(this); }

    removeAgent(q: number, r: number) {
        const hash = HexUtils.hash(q, r);
        const agent = this.agentMap.get(hash);
        if (agent) {
            this.agents = this.agents.filter(a => a !== agent);
            this.agentMap.delete(hash);
        }
    }

    getAgentAt(q: number, r: number): Agent | undefined {
        const agent = this.agentMap.get(HexUtils.hash(q, r));
        return (agent && agent.hp > 0) ? agent : undefined;
    }

    updateAgentPosition(agent: Agent, newQ: number, newR: number) {
        this.agentMap.delete(HexUtils.hash(agent.q, agent.r));
        agent.q = newQ;
        agent.r = newR;
        this.agentMap.set(HexUtils.hash(agent.q, agent.r), agent);
    }

    // --- Core Logic Control ---

    play() {
        if (!this.isRunning) {
            this.agents.forEach(a => a.saveState());
            this.battleTime = 0;
            this.logs = [];
            this.log(null, '開始', null, '戰鬥分析開始');
        }
        
        this.agentMap.clear();
        
        this.agents.forEach(a => {
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            a.bt = this.ai.buildAI(a, this); // Use AI System
            a.animState = AnimState.IDLE;
            if (a.hp > 0) {
                this.agentMap.set(HexUtils.hash(a.q, a.r), a);
            }
        });
        this.isRunning = true;
    }

    stop() { this.isRunning = false; }

    restart() {
        this.stop();
        this.agentMap.clear();
        this.agents.forEach(a => {
            a.reset(this.mapConfig);
            this.agentMap.set(HexUtils.hash(a.q, a.r), a);
        });
        this.projectiles = [];
        this.battleTime = 0;
        this.play();
    }

    clear(keepScene: boolean = false) {
        this.stop();
        this.agents = [];
        this.agentMap.clear();
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.projectiles = [];
        this.logs = [];
        this.directorTargetId = null;
        if (!keepScene) this.map.randomizeEnvironment(this); 
        else this.map.rebuildMap(this); 
    }

    // --- Main Game Loop ---

    tick(dt: number) {
        if (!this.isRunning) return;
        
        // Memory Optimization: Reuse array instead of reallocation
        this.events.length = 0;
        
        this.updateDirector(dt); // AI Director Logic

        // Win Condition Check
        let blue = 0, red = 0;
        for (const a of this.agents) {
            if (a.hp > 0) a.team === Team.BLUE ? blue++ : red++;
        }
        if (blue === 0 && red > 0) { this.stop(); this.onWin?.(Team.RED); }
        else if (red === 0 && blue > 0) { this.stop(); this.onWin?.(Team.BLUE); }

        for (const a of this.agents) {
            if (a.hitFlashTimer > 0) a.hitFlashTimer -= dt;
            
            // Physics delegated to MovementSystem
            this.movement.updatePhysics(a, dt, this);

            if (a.hp <= 0) {
                this.agentManager.handleDeadState(a, this);
                continue;
            }

            // --- DELEGATED SYSTEMS ---
            this.status.update(a, dt, this);
            
            // Movement Update
            if (a.isMoving && a.path.length > 0 && a.stunTimer <= 0) {
                this.movement.updateMovement(a, dt, this);
            }

            // AI Update
            if (a.bt) {
                const resetTree = (node: BTNode) => { 
                    node.status = null; 
                    if (node.c) node.c.forEach(resetTree); 
                };
                resetTree(a.bt);
                a.bt.tick(a);
            }
        }

        this.combat.update(dt, this);
        this.movement.resolveStacking(this);
    }

    // --- Loop Sub-Methods ---

    private updateDirector(dt: number) {
        this.directorTimer -= dt;
        
        // Ensure current target is still valid
        const current = this.agents.find(a => a.id === this.directorTargetId);
        if (!current || current.hp <= 0) {
            this.directorTimer = -1; // Force switch
        }

        if (this.directorTimer <= 0) {
            // Pick new target logic (simplified for brevity, logic remains same)
            const alive = this.agents.filter(a => a.hp > 0);
            if (alive.length > 0) {
                const ultCasters = alive.filter(a => a.castingSkillIdx !== -1 && a.skills[a.castingSkillIdx]?.tag === 'ULT');
                if (ultCasters.length > 0) {
                     this.directorTargetId = ultCasters[Math.floor(Math.random() * ultCasters.length)].id;
                     this.directorTimer = 4.0;
                     return;
                }
                
                this.directorTargetId = alive[Math.floor(Math.random() * alive.length)].id;
                this.directorTimer = 3.0;
            }
        }
    }

    performCast(a: Agent, i: number): NodeState {
        if (a.castingSkillIdx === -1) {
            a.castingSkillIdx = i;
            a.castTimer = a.skills[i]!.cast;
            a.castingAnimationTimer = a.skills[i]!.cast; 
            
            a.btStatus = `詠唱 ${a.skills[i]!.tag}`;
            
            let targetName = '地面';
            if (a.target) targetName = a.target.id;
            else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
            
            this.log(a, '詠唱', targetName, a.skills[i]!.name);
            this.events.push({ type: 'CAST_START', pos: {x: a.px, y: a.py}, sourceId: a.id, skill: a.skills[i]! });
            
            a.setAnim(AnimState.ATTACK);
            
            if (a.target) {
                a.facing = a.target.px > a.px ? 1 : -1;
            } else if (a.targetHex) {
                const tx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, this.mapConfig).x;
                a.facing = tx > a.px ? 1 : -1;
            }
        }
        return NodeState.RUNNING;
    }
    
    log(agent: Agent | null, action: string, targetId: string | null, detail: string) {
        const time = this.battleTime.toFixed(1);
        const entry: LogEntry = {
            id: Math.random().toString(36),
            time,
            action,
            target: targetId || '自身',
            detail,
            agentId: agent?.id || (agent === null ? '系統' : undefined),
            team: agent?.team,
            loc: agent ? `@(${agent.q},${agent.r})` : undefined
        };
        this.logs.push(entry);
        if (this.logs.length > 2000) this.logs.shift();
    }
}
