
import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, AnimState, SceneTheme, Hex, MovementType, LogActionType } from "../types";
import { BTNode } from "./behaviorTree";
import { HexUtils, MapConfig, Vector } from "./utils";
import { COLORS, LOG_COLORS } from "../constants";

// Core Entities
import { Agent, SpecialVisualStatus } from "./core/Agent";

// Systems
import { MovementSystem } from "./systems/movement";
import { StatusSystem } from "./systems/status";
import { CombatSystem } from "./systems/combat";
import { MapSystem } from "./systems/map";
import { AISystem } from "./systems/ai";
import { AgentManager } from "./systems/agentManager";
import { EventBus } from "./events/EventBus";
// Import Renderer Type ONLY (to avoid circular value dependency issue if possible, though strict loop might need loose coupling)
import type { GameRenderer } from "./renderer";

// Re-export for compatibility
export { Agent, SpecialVisualStatus };

export class GameEngine {
    public agents: Agent[] = [];
    
    // Delegated to MapSystem
    get mapKeys() { return this.map.mapKeys; }
    get obstacles() { return this.map.obstacles; }
    
    // Delegated to CombatSystem (Single Source of Truth)
    get projectiles() { return this.combat.projectiles; }

    public events: GameEvent[] = [];
    
    // NEW: Central Event Bus
    public bus: EventBus = new EventBus();
    
    // Weak reference to renderer for camera control
    public renderer?: GameRenderer;
    
    public isRunning: boolean = false;
    public timeScale: number = 1.0;
    public battleTime: number = 0;
    public mapVersion: number = 0; 
    
    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0 };
    public currentScene: SceneTheme = SCENE_DB[0];
    
    public logs: LogEntry[] = [];
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
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
    
    setObstacle(q: number, r: number, type: string) { this.map.setObstacle(q, r, type); }
    removeObstacle(q: number, r: number) { this.map.removeObstacle(q, r); }
    toggleObstacle(q: number, r: number, type: string = 'WALL') { this.map.toggleObstacle(q, r, this, type); }
    
    isValid(q: number, r: number) { return this.map.isValid(q, r); }
    isBlocked(q: number, r: number, ignoreId?: string, movementType: MovementType = MovementType.GROUND) { return this.map.isBlocked(q, r, this, ignoreId, movementType); }
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
            this.log(null, 'SYSTEM', '開始', null, '戰鬥分析開始');
            this.bus.emit('GAME_START', {});
        }
        
        this.agentMap.clear();
        
        this.agents.forEach(a => {
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            a.bt = this.ai.buildAI(a, this); // Use New Data-Driven AI System
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
            
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });

            this.agentMap.set(HexUtils.hash(a.q, a.r), a);
        });
        
        this.combat.projectiles = []; 
        this.events = []; 
        this.battleTime = 0;
        this.log(null, 'SYSTEM', '重置', null, '戰場狀態已重置');
        this.bus.emit('GAME_RESET', {});
    }

    clear(keepScene: boolean = false) {
        this.stop();
        this.agents = [];
        this.agentMap.clear();
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.combat.projectiles = [];
        this.logs = [];
        this.directorTargetId = null;
        if (!keepScene) this.map.randomizeEnvironment(this); 
        else this.map.rebuildMap(this); 
        this.bus.emit('GAME_CLEAR', {});
    }

    // --- Main Game Loop ---

    tick(dt: number) {
        if (!this.isRunning) return;
        
        this.events.length = 0;
        
        this.updateDirector(dt);

        // Win Condition Check
        let blue = 0, red = 0;
        for (const a of this.agents) {
            if (a.hp > 0) a.team === Team.BLUE ? blue++ : red++;
        }
        if (blue === 0 && red > 0) { 
            this.stop(); 
            this.bus.emit('GAME_OVER', { winner: Team.RED });
        }
        else if (red === 0 && blue > 0) { 
            this.stop(); 
            this.bus.emit('GAME_OVER', { winner: Team.BLUE });
        }

        for (const a of this.agents) {
            if (a.hitFlashTimer > 0) a.hitFlashTimer -= dt;
            
            this.movement.updatePhysics(a, dt, this);

            if (a.hp <= 0) {
                this.agentManager.handleDeadState(a, this);
                continue;
            }

            this.status.update(a, dt, this);
            
            if (a.isMoving && a.path.length > 0 && a.stunTimer <= 0) {
                this.movement.updateMovement(a, dt, this);
            }

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
        
        const current = this.agents.find(a => a.id === this.directorTargetId);
        if (!current || current.hp <= 0) {
            this.directorTimer = -1;
        }

        if (this.directorTimer <= 0) {
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
            
            this.log(a, 'CAST', '詠唱', targetName, `開始引導 ${a.skills[i]!.name} (需 ${a.skills[i]!.cast} 秒)`);
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
    
    log(agent: Agent | null, typeOrAction: LogActionType | string, actionNameOrTarget: string | null, detailOrTargetInfo: string, legacyDetail?: string) {
        const time = this.battleTime.toFixed(1);
        
        let actionType: LogActionType = 'SYSTEM';
        let actionName = 'Action';
        let targetInfo = '';
        let detail = '';
        let color = LOG_COLORS.SYSTEM;

        const isLegacy = !this.isLogActionType(typeOrAction);

        if (isLegacy) {
            const rawAction = typeOrAction as string;
            actionName = rawAction;
            targetInfo = actionNameOrTarget || '';
            detail = detailOrTargetInfo;

            if (rawAction === '死亡') { actionType = 'DEATH'; color = LOG_COLORS.DEATH; }
            else if (rawAction === '放逐結束') { actionType = 'CC'; color = LOG_COLORS.CC; }
            else if (rawAction === '中斷') { actionType = 'CC'; color = LOG_COLORS.CC; }
            else if (rawAction === '命中') { actionType = 'HIT'; color = LOG_COLORS.HIT; }
            else { actionType = 'SYSTEM'; }
        } else {
            actionType = typeOrAction as LogActionType;
            actionName = actionNameOrTarget || '';
            targetInfo = detailOrTargetInfo || '';
            detail = legacyDetail || '';

            switch(actionType) {
                case 'MOVE': color = LOG_COLORS.MOVE; break;
                case 'CAST': color = LOG_COLORS.CAST; break;
                case 'HIT': color = LOG_COLORS.HIT; break;
                case 'HEAL': color = LOG_COLORS.HEAL; break;
                case 'DECISION': color = LOG_COLORS.DECISION; break;
                case 'DEATH': color = LOG_COLORS.DEATH; break;
                case 'CC': color = LOG_COLORS.CC; break;
                default: color = LOG_COLORS.SYSTEM; break;
            }
        }

        const entry: LogEntry = {
            id: Math.random().toString(36),
            time,
            turn: Math.floor(this.battleTime * 10),
            agentId: agent?.id || 'SYSTEM',
            team: agent?.team,
            location: agent ? `(${agent.q},${agent.r})` : 'global',
            actionType: actionType,
            actionName: actionName,
            targetInfo: targetInfo,
            detail: detail,
            visualColor: color,
            action: actionName,
            target: targetInfo,
            loc: agent ? `@(${agent.q},${agent.r})` : ''
        };

        this.logs.push(entry);
        if (this.logs.length > 2000) this.logs.shift();
    }

    private isLogActionType(val: any): val is LogActionType {
        return ['MOVE','CAST','HIT','DECISION','DEATH','SYSTEM','HEAL','CC'].includes(val);
    }
}
