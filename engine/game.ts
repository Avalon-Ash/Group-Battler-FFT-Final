import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, GameEventType, AnimState, SceneTheme, Hex, MovementType, LogActionType, HexLayout, GroundHazard, GlobalSessionState } from "../types";
import { BTNode } from "./behaviorTree";
import { HexUtils, MapConfig, Vector } from "./utils";
import { DEFAULT_HEX_LAYOUT } from "../constants";

import { Agent, SpecialVisualStatus } from "./core/Agent";
import { MovementSystem } from "./systems/movement";
import { PhysicsSystem } from "./systems/PhysicsSystem"; 
import { CombatSystem } from "./systems/combat";
import { MapSystem } from "./systems/map";
import { HazardSystem } from "./systems/HazardSystem"; 
import { AISystem } from "./systems/ai";
import { AgentManager } from "./systems/agentManager";
import { AnnouncerSystem } from "./systems/AnnouncerSystem"; 
import { DirectorSystem } from "./systems/DirectorSystem"; 
import { BattleLogger } from "./systems/BattleLogger"; 
import { TimeSystem } from "./systems/TimeSystem"; 
import { VictorySystem } from "./systems/VictorySystem"; 
import { ZoneSystem } from "./systems/ZoneSystem"; 
import { EventBus } from "./events/EventBus";
import { EventBus as EventBusType } from "./events/EventBus";
import { EventPool } from "./events/GameEventPool"; 

import { CooldownSystem } from "./systems/status/CooldownSystem";
import { EffectSystem } from "./systems/status/EffectSystem";
import { ControlSystem } from "./systems/status/ControlSystem";

import type { GameRenderer } from "./renderer";

export { Agent, SpecialVisualStatus };

export const VICTORY_PHASE_DURATION = 0.5; 

export class GameEngine {
    public agents: Agent[] = [];
    public projectiles: Projectile[] = [];
    public hazards: Map<string, GroundHazard> = new Map();
    public sessionState: GlobalSessionState = {
        killStreaks: new Map(),
        firstBloodTriggered: false,
        directorTargetId: null,
        directorTimer: 0,
        directorPriorityTimer: 0
    };

    get mapKeys() { return this.map.mapKeys; }
    get obstacles() { return this.map.obstacles; }
    get agentMap() { return this.map.agentMap; }
    get logs() { return this.logger.logs; }

    public events: GameEvent[] = [];
    public bus: EventBusType = new EventBus();
    public renderer?: GameRenderer;
    public isRunning: boolean = false;
    public mapVersion: number = 0; 
    
    public timeScale: number = 1.0;
    public targetTimeScale: number = 1.0;
    public battleTime: number = 0;
    
    get isFinishing() { return this.victory.isFinishing; }
    get victoryTimer() { return this.victory.victoryTimer; }
    get winningTeam() { return this.victory.winningTeam; }

    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
    public currentScene: SceneTheme = SCENE_DB[0];
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
    // Core systems exposed to allow interaction between decoupled modules
    public movement: MovementSystem = new MovementSystem();
    public physics: PhysicsSystem = new PhysicsSystem(); 
    public combat: CombatSystem = new CombatSystem();
    public map: MapSystem = new MapSystem();
    public hazardSystem: HazardSystem = new HazardSystem();
    public ai: AISystem = new AISystem();
    public agentManager: AgentManager = new AgentManager();
    public announcer: AnnouncerSystem = new AnnouncerSystem(); 
    public director: DirectorSystem = new DirectorSystem();
    public logger: BattleLogger = new BattleLogger(); 
    public victory: VictorySystem = new VictorySystem(); 
    public zones: ZoneSystem = new ZoneSystem(); 
    public cooldowns: CooldownSystem = new CooldownSystem();
    public effects: EffectSystem = new EffectSystem();
    public controls: ControlSystem = new ControlSystem();
    public time: TimeSystem = new TimeSystem();

    get directorTargetId() { return this.sessionState.directorTargetId; }

    constructor() {
        this.map.randomizeEnvironment(this);
    }

    addAgent(team: Team, q: number, r: number, hpOverride?: number) { return this.agentManager.addAgent(this, team, q, r, hpOverride); }
    setObstacle(q: number, r: number, type: string) { this.map.setObstacle(q, r, type); }
    removeObstacle(q: number, r: number) { this.map.removeObstacle(q, r); }
    toggleObstacle(q: number, r: number, engine: GameEngine, type: string = 'WALL') { this.map.toggleObstacle(q, r, this, type); }
    
    isValid(q: number, r: number) { return this.map.isValid(q, r); }
    isBlocked(q: number, r: number, ignoreId?: string, movementType: MovementType = MovementType.GROUND) { return this.map.isBlocked(q, r, this, ignoreId, movementType); }
    isValidHash(h: number) { return this.map.isValidHash(h); }
    hasObstacle(q: number, r: number) { return this.map.hasObstacle(q, r); }
    hasObstacleHash(h: number) { return this.map.hasObstacleHash(h); }
    
    getTerrainHeight(q: number, r: number) { return this.map.getTerrainHeight(q, r); }

    randomizeEnvironment() { 
        this.hazards.clear(); 
        if (this.renderer) this.renderer.vfx.reset(); 
        this.map.randomizeEnvironment(this); 
    }
    
    rebuildMap() { 
        this.hazards.clear();
        this.map.rebuildMap(this); 
    }

    removeAgent(q: number, r: number) {
        const agent = this.map.getAgentAt(q, r);
        if (agent) {
            this.agents = this.agents.filter(a => a !== agent);
            this.map.unregisterAgent(agent);
        }
    }

    getAgentAt(q: number, r: number): Agent | undefined {
        return this.map.getAgentAt(q, r);
    }

    updateAgentPosition(agent: Agent, newQ: number, newR: number) {
        this.map.updateAgentPosition(agent, newQ, newR);
    }

    public pushEvent(
        type: GameEventType, 
        pos: {x: number, y: number}, 
        opts: { value?: number, text?: string, color?: string, skill?: Skill, sourceId?: string, targetId?: string, team?: Team } = {}
    ) {
        const evt = EventPool.get(type, pos, opts);
        if (type === 'KILL' && opts.sourceId) {
            this.director.forceFocus(this, opts.sourceId, 2.5);
        } else if (type === 'CAST_START' && opts.skill?.tag === 'ULT' && opts.sourceId) {
            this.director.forceFocus(this, opts.sourceId, 3.0);
        }
        this.events.push(evt);
    }

    public play() {
        if (!this.isRunning) {
            this.agents.forEach(a => a.saveState());
            this.battleTime = 0;
            this.logger.clear();
            this.victory.reset();
            this.sessionState.killStreaks.clear();
            this.sessionState.firstBloodTriggered = false;
            this.log(null, 'SYSTEM', '開始', null, '戰鬥分析開始');
            this.bus.emit('GAME_START', {});
        }
        
        this.map.clearAgents();
        this.agents.forEach(a => {
            a.skills = a.skillIds.map(id => this.skillDB.find(s => s.id === id) || null);
            a.bt = this.ai.buildAI(a, this); 
            a.animState = AnimState.IDLE;
            if (a.hp > 0) this.map.registerAgent(a);
        });
        this.isRunning = true;
    }

    public stop() { this.isRunning = false; }

    public restart() {
        this.stop();
        this.victory.reset();
        this.battleTime = 0;
        this.map.clearAgents();
        this.hazards.clear(); 
        this.director.reset(this);
        this.sessionState.killStreaks.clear();
        this.sessionState.firstBloodTriggered = false;
        
        this.agents.forEach(a => {
            a.reset(this.mapConfig);
            a.skills = a.skillIds.map(id => this.skillDB.find(s => s.id === id) || null);
            this.map.registerAgent(a);
        });
        
        this.flushEvents();
        this.projectiles = [];
        
        if (this.renderer) {
            this.renderer.reset();
            this.renderer.grid.reset(); 
            this.renderer.vfx.reset(); 
        }
        
        this.log(null, 'SYSTEM', '重置', null, '戰場狀態已重置');
        this.bus.emit('GAME_RESET', {});
    }

    public clear(keepScene: boolean = false) {
        this.stop();
        this.agents = [];
        this.projectiles = [];
        this.map.clearAgents();
        this.hazards.clear(); 
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.director.reset(this);
        this.flushEvents();
        
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

    private flushEvents() {
        for(const e of this.events) EventPool.release(e);
        this.events.length = 0;
    }

    public tick(dt: number) {
        if (!this.isRunning) return;
        
        if (Math.abs(this.targetTimeScale - this.timeScale) > 0.01) {
            this.timeScale += (this.targetTimeScale - this.timeScale) * 5.0 * dt; 
        } else {
            this.timeScale = this.targetTimeScale;
        }

        this.flushEvents(); 
        this.director.update(this, dt);
        this.zones.update(this); 

        if (this.victory.check(this)) {
            this.victory.updateFinishing(dt, this);
            this.updateEntities(dt);
            return;
        }

        this.updateEntities(dt);
    }

    private updateEntities(dt: number) {
        this.physics.update(dt, this);

        for (const a of this.agents) {
            if (a.hitFlashTimer > 0) a.hitFlashTimer -= dt;
            if (a.hp <= 0) {
                this.agentManager.handleDeadState(a, this);
                continue;
            }
            this.cooldowns.update(a, dt);
            this.effects.update(a, dt, this);
            this.controls.update(a, dt, this);
            
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
        this.hazardSystem.update(dt, this); 
        this.movement.resolveStacking(this);
        this.announcer.update(dt, this);
    }
    
    public log(agent: Agent | null, type: LogActionType, actionName: string, targetInfo: string | null, detail: string = '') {
        this.logger.log(this.battleTime, this.battleTime * 10, agent, type, actionName, targetInfo, detail);
    }

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number): number {
        return this.movement.getEffectiveRange(a, targetQ, targetR, baseRange, this);
    }

    public calculateOptimalTarget(source: Agent, skill: Skill) {
        return this.movement.calculateOptimalTarget(source, skill, this);
    }

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, speedMult: number = 1.0): NodeState {
        return this.movement.moveAgentToHex(a, targetHex, r, this, speedMult);
    }

    public initiateCast(a: Agent, skillIdx: number): NodeState {
        return this.combat.initiateCast(a, skillIdx, this);
    }

    public updateTarget(a: Agent) {
        this.movement.updateTarget(a, this);
    }
}