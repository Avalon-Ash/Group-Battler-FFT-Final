
// ╔══════════════════════════════════════════════════════════════════╗
// ║  GameEngine — 引擎主控制器（核心入口）                           ║
// ║  職責：tick 主迴圈、系統初始化、Agent 生命週期派發               ║
// ║  上游：main.ts / UI 層呼叫                                       ║
// ║  下游：AgentManager / VFXSystem / ZoneSystem / Renderer          ║
// ║  tick 順序：ZoneSystem → AgentManager → VFX → Renderer           ║
// ║  [ARCH] engine.vfx 為 getter，指向 engine.renderer.vfx           ║
// ║                                                                  ║
// ║  [事件通道規範 SSOT Architecture Contract]                        ║
// ║  1. 視覺事件 (Visual Events) → engine.events[] / pushEvent:      ║
// ║     - 池化生命週期管理 (GameEventPool)，降低 GC 壓力             ║
// ║     - 在 tick 結尾批次發送給 VisualSystem (HUD, VFX, Sequence)   ║
// ║     - 嚴禁包含任何邏輯/系統間副作用                              ║
// ║  2. 系統間通知 (System-to-System) → engine.bus (EventBus):        ║
// ║     - 完全型別安全 (EventMap master contract)                     ║
// ║     - 系統間解藕通訊 (Director, Announcer, Renderer, Zones)       ║
// ║     - 發布/訂閱模型，嚴禁系統間直接跨越 facade 呼叫私有方法       ║
// ╚══════════════════════════════════════════════════════════════════╝

import { DEFAULT_SKILL_DB } from "../skillDatabase";
import { SCENE_DB } from "../data/scenes";
import { LogEntry, NodeState, Role, Skill, Team, Projectile, GameEvent, GameEventType, AnimState, SceneTheme, Hex, MovementType, LogActionType, HexLayout, GroundHazard, GlobalSessionState, ZoneConfig, ActionState, SpatialHazard, SpatialProvider } from "../types";
import { BTNode } from "./behaviorTree";
import { HexUtils, MapConfig } from "./utils";
import { DEFAULT_HEX_LAYOUT, DEFAULT_ZONE_CONFIG, SCREEN_CONSTANTS } from "../constants";
import { Agent } from "./core/Agent";
import type { SpecialVisualStatus } from "./core/Agent";
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
import { AnimationSystem } from "./systems/AnimationSystem";
import { validateAllVFXBindings } from "./systems/VFXValidator";
import type { GameRenderer } from "./renderer";

export { Agent, SpecialVisualStatus };

export const VICTORY_PHASE_DURATION = 0.5; 

export class GameEngine implements SpatialProvider {
    public agents: Agent[] = [];
    public initialRoster: Agent[] = [];
    public projectiles: Projectile[] = [];
    
    private _entityCounter: number = 0;

    public state = {
        director: { focusTimer: 0, priorityTimer: 0, targetId: null as string | null },
        spatialHazards: [] as SpatialHazard[],
        victory: { victoryTimer: 0, winningTeam: null as Team | null, isFinishing: false },
        time: { battleTime: 0, timeScale: 1.0, targetTimeScale: 1.0 },
        isLastStand: false,
        finalHex: null as Hex | null
    };

    public sessionState: GlobalSessionState = {
        killStreaks: new Map(),
        firstBloodTriggered: false
    };

    get spatialHazards(): SpatialHazard[] { return this.state.spatialHazards; }
    get battleTime(): number { return this.state.time.battleTime; }
    set battleTime(v: number) { this.state.time.battleTime = v; }
    get timeScale(): number { return this.state.time.timeScale; }
    set timeScale(v: number) { this.state.time.timeScale = v; }
    get targetTimeScale(): number { return this.state.time.targetTimeScale; }
    set targetTimeScale(v: number) { this.state.time.targetTimeScale = v; }
    get victory() { return this.state.victory; }
    get isLastStand(): boolean { return this.state.isLastStand; }
    
    get directorTargetId(): string | null { return this.state.director.targetId; }
    get mapKeys(): Set<string> { return this.map.mapKeys; }
    get obstacles(): Map<string, string> { return this.map.obstacles; }
    get agentMap(): Map<number, Agent> { return this.map.agentMap; }
    get logs(): LogEntry[] { return this.logger.logs; }

    public events: GameEvent[] = [];
    public bus: EventBus = new EventBus();
    public renderer?: GameRenderer; 
    
    // SSOT: engine.vfx is engine.renderer.vfx (確認同一實例)
    public get vfx() { return this.renderer?.vfx; }

    public isRunning: boolean = false;
    public mapVersion: number = 0; 
    
    public screenAspect: number = SCREEN_CONSTANTS.DEFAULT_ASPECT;
    public screenW: number = SCREEN_CONSTANTS.DEFAULT_WIDTH;
    public screenH: number = SCREEN_CONSTANTS.DEFAULT_HEIGHT;

    public mapConfig: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
    public zoneConfig: ZoneConfig = { ...DEFAULT_ZONE_CONFIG };
    public currentScene: SceneTheme = SCENE_DB[0];
    public skillDB: Skill[] = [...DEFAULT_SKILL_DB];
    
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
    public victorySystem: VictorySystem = new VictorySystem(); 
    public zones: ZoneSystem = new ZoneSystem(); 
    public cooldowns: CooldownSystem = new CooldownSystem();
    public effects: EffectSystem = new EffectSystem();
    public controls: ControlSystem = new ControlSystem();
    public animation: AnimationSystem = new AnimationSystem();
    public timeSystem: TimeSystem = new TimeSystem();

    constructor() {
        validateAllVFXBindings(this.skillDB);
        this.director.bind(this);
        this.map.randomizeEnvironment(this);
    }

    public nextId(prefix: string = 'ENT'): string {
        this._entityCounter++;
        return `${prefix}-${this._entityCounter.toString().padStart(4, '0')}`;
    }

    public addAgent(team: Team, q: number, r: number, hpOverride?: number, roleOverride?: Role) { 
        return this.agentManager.addAgent(this, team, q, r, hpOverride, roleOverride); 
    }
    public isValid(q: number, r: number) { return this.map.isValid(q, r); }
    public isBlocked(q: number, r: number, ignoreId?: string, movementType: MovementType = MovementType.GROUND) { return this.map.isBlocked(q, r, this, ignoreId, movementType); }
    public isValidHash(h: number) { return this.map.isValidHash(h); }
    public hasObstacle(q: number, r: number) { return this.map.hasObstacle(q, r); }
    public hasObstacleHash(h: number) { return this.map.hasObstacleHash(h); }
    public getTerrainHeight(q: number, r: number) { 
        const key = `${q},${r}`;
        const collapsing = this.zones.collapsingTiles.get(key);
        if (collapsing) {
            return collapsing.h + collapsing.z; // Return dynamic height as it falls
        }
        return this.map.getTerrainHeight(q, r); 
    }
    public getObstacleTypeHash(h: number): string | undefined { return this.map.obstacles.get(HexUtils.key(HexUtils.unhash(h))); }
    public getAgentHash(h: number): Agent | undefined { return this.map.agentMap.get(h); }
    public getMapConfig(): MapConfig { return this.mapConfig; }
    public getAgents(): Agent[] { return this.agents; }
    public isWarningTile(key: string): boolean { return this.map.warningTiles.has(key); }
    public getSpatialHazardsAt(q: number, r: number): SpatialHazard[] {
        return this.state.spatialHazards.filter(h => h.cells.some(c => c.q === q && c.r === r));
    }

    public getTileDepth(q: number, r: number): number { return this.zones.getTileDepth(q, r); }
    public getCurrentShrinkLevel(): number { return this.zones.currentShrinkLevel; }

    public randomizeEnvironment() { 
        this.state.spatialHazards = []; 
        this.map.randomizeEnvironment(this); 
        this.bus.emit('ENV_UPDATE', {});
    }
    
    public rebuildMap() { 
        this.state.spatialHazards = [];
        this.map.rebuildMap(this); 
        this.bus.emit('ENV_UPDATE', {});
    }

    public removeAgent(q: number, r: number) {
        const agent = this.map.getAgentAt(q, r);
        if (agent) {
            this.agents = this.agents.filter(a => a !== agent);
            this.map.unregisterAgent(agent);
        }
    }

    public getAgentAt(q: number, r: number): Agent | undefined {
        return this.map.getAgentAt(q, r);
    }

    public updateAgentPosition(agent: Agent, newQ: number, newR: number) {
        this.map.updateAgentPosition(agent, newQ, newR, this);
    }

    /**
     * 視覺事件管線：將事件放入池化佇列，於 tick 結尾批次發送給 VisualSystem。
     * 系統間通知請走 this.bus.emit()。
     */
    public pushEvent(type: GameEventType, pos: {x: number, y: number}, opts: any = {}) {
        const evt = EventPool.get(type, pos, opts);
        this.events.push(evt);
    }

    public play() {
        if (!this.isRunning) {
            this.initialRoster = [...this.agents];
            this.agents.forEach(a => a.saveState());
            this.state.time.battleTime = 0;
            this.logger.clear();
            this.victorySystem.reset(this);
            this.effects.reset();

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
            a.actionState = ActionState.IDLE;
            if (a.hp > 0) this.map.registerAgent(a);
        });
        this.isRunning = true;
    }

    public stop() { this.isRunning = false; }

    public restart() {
        this.stop();
        this.agents = [...this.initialRoster];
        this.victorySystem.reset(this);
        this.effects.reset();
        this.zones.reset(this);
        this.state.isLastStand = false;
        this.state.finalHex = null;
        this.state.time.battleTime = 0;
        this.state.time.timeScale = 1.0;
        this.state.time.targetTimeScale = 1.0;
        this.map.clearAgents();
        this.state.spatialHazards = []; 
        this.map.rebuildMap(this); // Restore tiles removed by zone system
        this.director.reset(this);
        this.sessionState.killStreaks.clear();
        this.sessionState.firstBloodTriggered = false;
        this.agents.forEach(a => {
            a.reset(this.mapConfig);
            a.skills = a.skillIds.map(id => this.skillDB.find(s => s.id === id) || null);
            a.bt = this.ai.buildAI(a, this); 
            a.animState = AnimState.IDLE;
            this.map.registerAgent(a);
        });
        this.projectiles = [];
        
        this.log(null, 'SYSTEM', '重置', null, '戰場狀態已重置');
        this.bus.emit('GAME_START', {}); // Use Game Start on restart
    }

    public clear(keepScene: boolean = false, skipRebuild: boolean = false) {
        this.stop();
        this._entityCounter = 0; 
        this.agents = [];
        this.initialRoster = [];
        this.projectiles = [];
        this.map.clearAgents();
        this.state.spatialHazards = []; 
        this.map.obstacles.clear();
        this.map.obstaclesHash.clear();
        this.director.reset(this);
        this.zones.reset(this);
        this.state.isLastStand = false;
        this.logger.clear();
        this.victorySystem.reset(this); 
        this.effects.reset();
        this.state.time.timeScale = 1.0;
        this.state.time.targetTimeScale = 1.0;
        this.sessionState.killStreaks.clear();
        this.sessionState.firstBloodTriggered = false;
        
        if (!skipRebuild) {
            if (!keepScene) this.map.randomizeEnvironment(this); 
            else this.map.rebuildMap(this); 
        }
        this.bus.emit('GAME_CLEAR', {});
    }

    public tick(dt: number) {
        if (!this.isRunning) return;
        
        const deadCountBefore = this.agents.length;
        if (deadCountBefore > 0) {
            this.agents = this.agents.filter(a => !a.fullyDead);
        }

        this.timeSystem.update(dt, this);
        this.events.length = 0; 
        this.director.update(this, dt);
        this.zones.update(dt, this); 
        if (this.victorySystem.check(this)) {
            this.victorySystem.updateFinishing(dt, this);
            this.updateEntities(dt);
            this.flushVisualEvents();
            return;
        }
        this.updateEntities(dt);
        this.flushVisualEvents();
    }

    private flushVisualEvents() {
        // P1: Visual events should be processed at the end of tick
        if (this.renderer && this.events.length > 0) {
            this.renderer.processVisualEvents(this.events);
        }
    }

    private updateEntities(dt: number) {
        this.physics.update(dt, this);
        for (const a of this.agents) {
            if (a.hp <= 0) {
                this.agentManager.handleDeadState(a, this);
                this.agentManager.updateDeathState(a, dt);
                continue;
            }
            this.cooldowns.update(a, dt);
            this.effects.update(a, dt, this);
            this.controls.update(a, dt, this);
            if (a.escapeCooldown > 0) a.escapeCooldown -= dt;
            if (a.isMoving && a.path.length > 0 && a.stunTimer <= 0) {
                this.movement.updateMovement(a, dt, this);
            }
            if (a.bt && a.aiUpdateTimer > 0) {
                a.aiUpdateTimer -= dt;
            }
        }
        this.combat.update(dt, this);
        this.movement.applyLastStandPull(dt, this);

        // Run AI tick after combat update so and CD/Cast status is from the current frame
        for (const a of this.agents) {
            if (a.hp <= 0) {
                continue;
            }
            if (a.bt && (a.aiUpdateTimer <= 0 || a.forceAiUpdate)) {
                const inDanger = this.isWarningTile(HexUtils.key(a));
                if (inDanger) {
                    this.log(a, 'SYSTEM', '危險決策', '', `單位處於塌陷區，啟動行為樹決策...`);
                }
                a.bt.tick(a);
                a.aiUpdateTimer = a.aiUpdateInterval;
                a.forceAiUpdate = false;
            }
            // [FIX] Decrement lockout timers after BT tick if needed, but CooldownSystem already does this.
            // Removing redundant decrements to avoid double-taxing the timers.
        }

        this.hazardSystem.update(dt, this); 

        this.movement.resolveStacking(this, this);
        this.announcer.update(dt, this);
        
        // SSOT Enforcement: Animation state is derived last
        this.animation.update(dt, this);
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

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, speedMult: number = 1.0, isEscaping: boolean = false): NodeState {
        return this.movement.moveAgentToHex(a, targetHex, r, this, speedMult, isEscaping);
    }

    public initiateCast(a: Agent, skillIdx: number): NodeState {
        return this.combat.initiateCast(a, skillIdx, this);
    }

    public updateTarget(a: Agent) {
        this.movement.updateTarget(a, this);
    }
}
