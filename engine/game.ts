
import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, AnimState, SceneTheme, Hex, MovementType, LogActionType } from "../types";
import { BTNode } from "./behaviorTree";
import { HexUtils, MapConfig, Vector } from "./utils";

// Core Entities
import { Agent, SpecialVisualStatus } from "./core/Agent";

// Systems
import { MovementSystem } from "./systems/movement";
import { PhysicsSystem } from "./systems/PhysicsSystem"; // New
import { StatusSystem } from "./systems/status";
import { CombatSystem } from "./systems/combat";
import { MapSystem } from "./systems/map";
import { AISystem } from "./systems/ai";
import { AgentManager } from "./systems/agentManager";
import { AnnouncerSystem } from "./systems/AnnouncerSystem"; 
import { DirectorSystem } from "./systems/DirectorSystem"; 
import { BattleLogger } from "./systems/BattleLogger"; 
import { TimeSystem } from "./systems/TimeSystem"; 
import { VictorySystem } from "./systems/VictorySystem"; 
import { ZoneSystem } from "./systems/ZoneSystem"; 
import { EventBus } from "./events/EventBus";
import type { GameRenderer } from "./renderer";

export { Agent, SpecialVisualStatus };

// Constants
export const VICTORY_PHASE_DURATION = 0.5; 

export class GameEngine {
    public agents: Agent[] = [];
    
    get mapKeys() { return this.map.mapKeys; }
    get obstacles() { return this.map.obstacles; }
    get projectiles() { return this.combat.projectiles; }
    
    get logs() { return this.logger.logs; }

    public events: GameEvent[] = [];
    public bus: EventBus = new EventBus();
    public renderer?: GameRenderer;
    
    public isRunning: boolean = false;
    public mapVersion: number = 0; 
    
    // Time & Victory Proxies
    get timeScale() { return this.time.timeScale; }
    set timeScale(v: number) { this.time.timeScale = v; }
    get targetTimeScale() { return this.time.targetTimeScale; }
    set targetTimeScale(v: number) { this.time.targetTimeScale = v; }
    get battleTime() { return this.time.battleTime; }
    set battleTime(v: number) { this.time.battleTime = v; }
    
    get isFinishing() { return this.victory.isFinishing; }
    get victoryTimer() { return this.victory.victoryTimer; }
    get winningTeam() { return this.victory.winningTeam; }

    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0 };
    public currentScene: SceneTheme = SCENE_DB[0];
    
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
    public agentMap: Map<number, Agent> = new Map();

    // Systems
    public movement: MovementSystem;
    public physics: PhysicsSystem; // New
    public status: StatusSystem;
    public combat: CombatSystem;
    public map: MapSystem;
    public ai: AISystem;
    public agentManager: AgentManager;
    public announcer: AnnouncerSystem; 
    public director: DirectorSystem;
    public logger: BattleLogger; 
    public time: TimeSystem; 
    public victory: VictorySystem; 
    public zones: ZoneSystem; 

    get directorTargetId() { return this.director.targetId; }

    constructor() {
        this.movement = new MovementSystem();
        this.physics = new PhysicsSystem();
        this.status = new StatusSystem();
        this.combat = new CombatSystem();
        this.map = new MapSystem();
        this.ai = new AISystem();
        this.agentManager = new AgentManager();
        this.announcer = new AnnouncerSystem(); 
        this.director = new DirectorSystem();
        this.logger = new BattleLogger();
        this.time = new TimeSystem();
        this.victory = new VictorySystem();
        this.zones = new ZoneSystem();
        this.map.randomizeEnvironment(this);
    }

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
        const oldH = this.map.getTerrainHeight(agent.q, agent.r);
        const newH = this.map.getTerrainHeight(newQ, newR);
        const deltaH = oldH - newH;
        
        agent.physics.z += deltaH;

        this.agentMap.delete(HexUtils.hash(agent.q, agent.r));
        agent.q = newQ;
        agent.r = newR;
        this.agentMap.set(HexUtils.hash(agent.q, agent.r), agent);
    }

    play() {
        if (!this.isRunning) {
            this.agents.forEach(a => a.saveState());
            this.time.reset();
            this.logger.clear();
            this.victory.reset();
            this.log(null, 'SYSTEM', '開始', null, '戰鬥分析開始');
            this.bus.emit('GAME_START', {});
        }
        this.agentMap.clear();
        this.agents.forEach(a => {
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            a.bt = this.ai.buildAI(a, this); 
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
        this.victory.reset();
        this.time.reset();
        this.agentMap.clear();
        this.announcer.reset(); 
        this.director.reset();
        
        this.agents.forEach(a => {
            a.reset(this.mapConfig);
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            this.agentMap.set(HexUtils.hash(a.q, a.r), a);
        });
        
        this.events = []; 
        this.combat.reset(); 
        
        if (this.renderer) {
            this.renderer.reset();
            this.renderer.grid.reset(); 
            this.renderer.vfx.reset(); 
        }
        
        this.log(null, 'SYSTEM', '重置', null, '戰場狀態已重置');
        this.bus.emit('GAME_RESET', {});
    }

    clear(keepScene: boolean = false) {
        this.stop();
        this.agents = [];
        this.agentMap.clear();
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.announcer.reset();
        this.director.reset();
        
        this.combat.reset(); 
        this.events = [];
        
        if (this.renderer) {
            this.renderer.reset();
            this.renderer.grid.reset();
            this.renderer.vfx.reset();
        }
        
        this.logger.clear();
        
        if (!keepScene) this.map.randomizeEnvironment(this); 
        else this.map.rebuildMap(this); 
        
        this.bus.emit('GAME_CLEAR', {});
    }

    tick(dt: number) {
        if (!this.isRunning) return;
        
        this.time.update(dt);
        this.events.length = 0;
        this.director.update(dt, this);
        this.zones.update(this); 

        // Check Victory
        if (this.victory.check(this)) {
            this.victory.updateFinishing(dt, this);
            this.updateEntities(dt);
            return;
        }

        this.updateEntities(dt);
    }

    private updateEntities(dt: number) {
        // 1. Physics (Global)
        this.physics.update(dt, this);

        // 2. Logic
        for (const a of this.agents) {
            if (a.hitFlashTimer > 0) a.hitFlashTimer -= dt;
            
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
        
        // 3. Combat
        this.combat.update(dt, this);
        this.movement.resolveStacking(this);
        this.announcer.update(dt, this);
    }
    
    public log(agent: Agent | null, type: LogActionType, actionName: string, targetInfo: string | null, detail: string = '') {
        this.logger.log(this.battleTime, this.battleTime * 10, agent, type, actionName, targetInfo, detail);
    }
}
