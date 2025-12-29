
import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, GameEventType, AnimState, SceneTheme, Hex, MovementType, LogActionType, HexLayout } from "../types";
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
import { EventPool } from "./events/GameEventPool"; 

import { CooldownSystem } from "./systems/status/CooldownSystem";
import { EffectSystem } from "./systems/status/EffectSystem";
import { ControlSystem } from "./systems/status/ControlSystem";

import type { GameRenderer } from "./renderer";

export { Agent, SpecialVisualStatus };

export const VICTORY_PHASE_DURATION = 0.5; 

export class GameEngine {
    public agents: Agent[] = [];
    
    get mapKeys() { return this.map.mapKeys; }
    get obstacles() { return this.map.obstacles; }
    get projectiles() { return this.combat.projectiles; }
    get agentMap() { return this.map.agentMap; }
    get logs() { return this.logger.logs; }

    public events: GameEvent[] = [];
    public bus: EventBus = new EventBus();
    public renderer?: GameRenderer;
    public isRunning: boolean = false;
    public mapVersion: number = 0; 
    
    get timeScale() { return this.time.timeScale; }
    set timeScale(v: number) { this.time.timeScale = v; }
    get targetTimeScale() { return this.time.targetTimeScale; }
    set targetTimeScale(v: number) { this.time.targetTimeScale = v; }
    get battleTime() { return this.time.battleTime; }
    set battleTime(v: number) { this.time.battleTime = v; }
    
    get isFinishing() { return this.victory.isFinishing; }
    get victoryTimer() { return this.victory.victoryTimer; }
    get winningTeam() { return this.victory.winningTeam; }

    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
    public currentScene: SceneTheme = SCENE_DB[0];
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
    public movement: MovementSystem;
    public physics: PhysicsSystem; 
    public combat: CombatSystem;
    public map: MapSystem;
    public hazards: HazardSystem;
    public ai: AISystem;
    public agentManager: AgentManager;
    public announcer: AnnouncerSystem; 
    public director: DirectorSystem;
    public logger: BattleLogger; 
    public time: TimeSystem; 
    public victory: VictorySystem; 
    public zones: ZoneSystem; 
    public cooldowns: CooldownSystem;
    public effects: EffectSystem;
    public controls: ControlSystem;

    get directorTargetId() { return this.director.targetId; }

    constructor() {
        this.movement = new MovementSystem();
        this.physics = new PhysicsSystem();
        this.combat = new CombatSystem();
        this.map = new MapSystem();
        this.hazards = new HazardSystem();
        this.ai = new AISystem();
        this.agentManager = new AgentManager();
        this.announcer = new AnnouncerSystem(); 
        this.director = new DirectorSystem();
        this.logger = new BattleLogger();
        this.time = new TimeSystem();
        this.victory = new VictorySystem();
        this.zones = new ZoneSystem();
        this.cooldowns = new CooldownSystem();
        this.effects = new EffectSystem();
        this.controls = new ControlSystem();

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
    
    randomizeEnvironment() { 
        this.hazards.reset(); 
        if (this.renderer) this.renderer.vfx.reset(); 
        this.map.randomizeEnvironment(this); 
    }
    
    rebuildMap() { 
        this.hazards.reset();
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
        
        // --- CINEMATIC DIRECTOR HOOK ---
        if (type === 'KILL' && opts.sourceId) {
            this.director.forceFocus(opts.sourceId, 2.5);
        } else if (type === 'CAST_START' && opts.skill?.tag === 'ULT' && opts.sourceId) {
            this.director.forceFocus(opts.sourceId, 3.0);
        }

        this.events.push(evt);
    }

    public play() {
        if (!this.isRunning) {
            this.agents.forEach(a => a.saveState());
            this.time.reset();
            this.logger.clear();
            this.victory.reset();
            this.log(null, 'SYSTEM', '開始', null, '戰鬥分析開始');
            this.bus.emit('GAME_START', {});
        }
        
        this.map.clearAgents();
        this.agents.forEach(a => {
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            a.bt = this.ai.buildAI(a, this); 
            a.animState = AnimState.IDLE;
            if (a.hp > 0) {
                this.map.registerAgent(a);
            }
        });
        this.isRunning = true;
    }

    public stop() { this.isRunning = false; }

    public restart() {
        this.stop();
        this.victory.reset();
        this.time.reset();
        this.map.clearAgents();
        this.hazards.reset(); 
        this.announcer.reset(); 
        this.director.reset();
        
        this.agents.forEach(a => {
            a.reset(this.mapConfig);
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return this.skillDB.find(s => s.id === id) || null;
            });
            this.map.registerAgent(a);
        });
        
        this.flushEvents();
        this.combat.reset(); 
        
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
        this.map.clearAgents();
        this.hazards.reset(); 
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.announcer.reset();
        this.director.reset();
        this.combat.reset(); 
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
        
        this.time.update(dt);
        this.flushEvents(); 
        this.director.update(dt, this);
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
        this.hazards.update(dt, this); 
        this.movement.resolveStacking(this);
        this.announcer.update(dt, this);
    }
    
    public log(agent: Agent | null, type: LogActionType, actionName: string, targetInfo: string | null, detail: string = '') {
        this.logger.log(this.battleTime, this.battleTime * 10, agent, type, actionName, targetInfo, detail);
    }
}
