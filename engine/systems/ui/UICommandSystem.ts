import { GameEngine } from '../../game';
import { UICommand, Role, Team } from '../../../types';
import type { GameCommand } from '../../../types';
import { isDeferredWhileRunning, isSimNeutral, isViewCommand } from '../../core/CommandQueue';
import { pending } from '../../core/ContractPending';
import { UI_SETTINGS } from '../../../constants';
import { HexUtils } from '../../utils';
import { SCENE_DB } from '../../../data/scenes';
import { AgentManager } from '../agentManager';
import { saveAgentState } from '../../core/AgentLifecycle';
import { buildSkillUpdate, isSkillEditableField } from '../../../data/ui/skillEditor';
import { querySpawnableHexes } from './editorQueries';
import { captureMatch, restoreMatch } from '../../core/MatchSnapshot';
import { UINT32_RANGE } from '../../math/rng';

type NumericRange = { readonly min: number; readonly max: number };

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clampToRange = (v: number, range: NumericRange): number =>
    Math.max(range.min, Math.min(range.max, v));

/**
 * 新的一場的模擬流種子（uint32）。全專案唯一允許用 crypto／Math.random 取模擬種子的地方（契約 S2）：
 * 種子寫回 START_GAME 指令再記錄，之後的一切都由它決定。
 */
function freshSeed(): number {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') return c.getRandomValues(new Uint32Array(1))[0];
    return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
}

/**
 * UICommandSystem — Single Mutation Gate for UI -> Engine writes.
 * Subscribes to UI_COMMAND events on engine.bus, validates parameters,
 * and applies state changes or emits corresponding engine events.
 */
export class UICommandSystem {
    private engine: GameEngine;

    constructor(engine: GameEngine) {
        this.engine = engine;
        this.engine.bus.on('UI_COMMAND', this.handleCommand);
    }

    public destroy(): void {
        this.engine.bus.off('UI_COMMAND', this.handleCommand);
    }

    /**
     * 匯流排入口。ViewCommand 立即套用、不記錄；GameCommand 在戰鬥中排到下一個 tick 開頭（flushQueued），
     * 其餘情況立即套用。立即套用前先清掉佇列，保持指令的先後順序（engine/core/CommandQueue.ts）。
     */
    public handleCommand = (cmd: UICommand): void => {
        if (!cmd || typeof cmd !== 'object') return;
        if (isViewCommand(cmd)) {
            this.apply(cmd);
            return;
        }
        // 回放進行中只吃紀錄裡的指令；暫停、繼續、倍率照常（契約 S3，engine/core/Replay.ts）
        if (this.engine.commands.blocksExternal && !isSimNeutral(cmd)) return;
        if (this.engine.isRunning && isDeferredWhileRunning(cmd)) {
            this.engine.commands.enqueue(cmd);
            return;
        }
        this.flushQueued();
        this.applyGame(cmd);
    };

    /** 依序套用排隊中的 GameCommand（GameEngine.tick 開頭呼叫）。 */
    public flushQueued(): void {
        if (this.engine.commands.pendingCount === 0) return;
        for (const cmd of this.engine.commands.drain()) this.applyGame(cmd);
    }

    private applyGame(cmd: GameCommand): void {
        // 開新的一場沒給種子：在這裡產生並寫回指令，紀錄裡的 START_GAME 一定帶種子
        const applied: GameCommand = cmd.type === 'START_GAME' && cmd.seed === undefined && this.startsNewMatch()
            ? { ...cmd, seed: freshSeed() }
            : cmd;
        this.engine.commands.record(this.engine.state.time.tick, applied);
        this.apply(applied);
    }

    /**
     * START_GAME 是開新的一場（還沒跑過任何 tick），還是暫停後繼續（togglePlay 用 STOP／START 暫停）。
     * 只有開新的一場才擷取快照、播種；繼續只是恢復運轉。
     */
    private startsNewMatch(): boolean {
        return !this.engine.battleStarted;
    }

    private apply(cmd: UICommand): void {
        switch (cmd.type) {
            case 'SET_SHAKE_TUNING': {
                this.engine.director.setShakeTuning({
                    strength: cmd.strength,
                    offFocusScale: cmd.offFocusScale,
                    maxTrauma: cmd.maxTrauma,
                });
                break;
            }

            case 'SET_DIRECTOR_ENABLED': {
                this.engine.director.enabled = Boolean(cmd.enabled);
                break;
            }

            case 'SET_WATCH_AGENT': {
                // 記陣營而不是單位：單位死後仍算它的陣營，直到玩家改點
                const agent = typeof cmd.agentId === 'string'
                    ? this.engine.agents.find(a => a.id === cmd.agentId)
                    : undefined;
                this.engine.director.setPickedSide(agent ? agent.side : null);
                break;
            }

            case 'SET_ZONE_CONFIG': {
                if (!cmd.config || typeof cmd.config !== 'object') break;
                if (typeof cmd.config.enabled === 'boolean') {
                    this.engine.zoneConfig.enabled = cmd.config.enabled;
                }
                if (isFiniteNumber(cmd.config.initialRadius)) {
                    this.engine.zoneConfig.initialRadius = clampToRange(
                        Math.round(cmd.config.initialRadius),
                        UI_SETTINGS.ZONE_INITIAL_RADIUS
                    );
                }
                if (isFiniteNumber(cmd.config.shrinkInterval)) {
                    this.engine.zoneConfig.shrinkInterval = clampToRange(
                        Math.round(cmd.config.shrinkInterval),
                        UI_SETTINGS.ZONE_SHRINK_INTERVAL
                    );
                }
                if (isFiniteNumber(cmd.config.minRadius)) {
                    this.engine.zoneConfig.minRadius = clampToRange(
                        Math.round(cmd.config.minRadius),
                        { min: UI_SETTINGS.ZONE_MIN_RADIUS.min, max: Math.min(UI_SETTINGS.ZONE_MIN_RADIUS.max, this.engine.zoneConfig.initialRadius) }
                    );
                }
                break;
            }

            case 'SET_BATTLE_SETUP': {
                if (!cmd.setup || typeof cmd.setup !== 'object') break;
                const setup = this.engine.battleSetup;
                const pool = Math.min(querySpawnableHexes(this.engine).length - 1, UI_SETTINGS.BATTLE_MAX_UNITS);
                if (isFiniteNumber(cmd.setup.factions)) {
                    setup.factions = Math.round(cmd.setup.factions);
                }
                setup.factions = clampToRange(setup.factions, {
                    min: UI_SETTINGS.BATTLE_FACTIONS.min,
                    max: Math.max(UI_SETTINGS.BATTLE_FACTIONS.min, pool),
                });
                if (isFiniteNumber(cmd.setup.unitsPerFaction)) {
                    setup.unitsPerFaction = Math.round(cmd.setup.unitsPerFaction);
                }
                setup.unitsPerFaction = clampToRange(setup.unitsPerFaction, {
                    min: UI_SETTINGS.BATTLE_UNITS_PER_FACTION.min,
                    max: Math.max(UI_SETTINGS.BATTLE_UNITS_PER_FACTION.min, Math.floor(pool / setup.factions)),
                });
                break;
            }

            case 'APPLY_BATTLE_SETUP':
                this.engine.bus.emit('BATTLE_SETUP_APPLY', { ...this.engine.battleSetup });
                break;

            case 'EDIT_AGENT': {
                if (!cmd.agentId) break;
                const agent = this.engine.agents.find((a) => a.id === cmd.agentId);
                if (!agent) break;

                if (cmd.role && Object.values(Role).includes(cmd.role)) {
                    agent.role = cmd.role;
                    // 職業導出的移動數值跟著換；血量、魔力、技能、體型等編輯器欄位維持原值
                    AgentManager.applyRoleMotion(agent);
                }
                if (
                    typeof cmd.maxHp === 'number' &&
                    Number.isFinite(cmd.maxHp) &&
                    cmd.maxHp > 0
                ) {
                    agent.maxHp = Math.round(cmd.maxHp);
                    if (agent.hp > agent.maxHp) {
                        agent.hp = agent.maxHp;
                    }
                }
                if (typeof cmd.hp === 'number' && Number.isFinite(cmd.hp)) {
                    agent.hp = Math.max(0, Math.min(agent.maxHp, Math.round(cmd.hp)));
                }
                if (
                    typeof cmd.maxMp === 'number' &&
                    Number.isFinite(cmd.maxMp) &&
                    cmd.maxMp >= 0
                ) {
                    agent.maxMp = Math.round(cmd.maxMp);
                    if (agent.mp > agent.maxMp) {
                        agent.mp = agent.maxMp;
                    }
                }
                if (cmd.bodyType) {
                    agent.bodyType = cmd.bodyType;
                }
                break;
            }

            case 'SET_AGENT_SKILL': {
                const agent = this.engine.agents.find((a) => a.id === cmd.agentId);
                if (!agent || !Number.isInteger(cmd.slot) || cmd.slot < 0 || cmd.slot >= agent.skillIds.length) break;
                if (cmd.skillId !== null && !this.engine.skillDB.some((s) => s.id === cmd.skillId)) break;
                // 正在詠唱這一格時不換：計時與演出已依這一招排定（ULT-T01）
                if (agent.castingSkillIdx === cmd.slot) break;
                agent.skillIds[cmd.slot] = cmd.skillId;
                // 開戰後當下就換上技能物件（繼續不再重跑 prepareForBattle）；開戰前 skills 還是空的，開戰時才依 id 取
                if (this.engine.battleStarted) agent.skills[cmd.slot] = cmd.skillId === null ? null : this.engine.skillDB.find((s) => s.id === cmd.skillId) ?? null;
                break;
            }

            case 'UPDATE_SKILL': {
                const skill = this.engine.skillDB.find((s) => s.id === cmd.skillId);
                if (!skill || !isSkillEditableField(cmd.field)) break;
                // 有單位正在詠唱這一招時拒絕：計時、讀條與演出排程已依目前的 cast／序列排定（ULT-T01）
                if (this.engine.agents.some((a) => a.castingSkillIdx !== -1 && a.skills[a.castingSkillIdx]?.id === skill.id)) break;
                // 驗證欄位，並以完整候選技能套用奧義詠唱下限（data/ui/skillEditor.ts）
                const patch = buildSkillUpdate(skill, cmd.field, cmd.value);
                if (!patch) break;
                // 技能物件同時被單位的 skills 引用，改這裡即時生效（開戰時 prepareForBattle 也會依 id 重新取）
                Object.assign(skill, patch);
                break;
            }

            case 'REBUILD_AGENT_AI': {
                if (!cmd.agentId) break;
                const agent = this.engine.agents.find((a) => a.id === cmd.agentId);
                if (agent) {
                    agent.bt = this.engine.ai.buildAI(agent, this.engine);
                    this.engine.bus.emit('AGENT_RESET', { agentId: agent.id });
                }
                break;
            }

            case 'RESET_GAME': {
                // 還原開戰快照：同一張地圖、同一批單位站回原位（契約 S2）。不播種，下一個 START_GAME 才播種
                const start = this.engine.commands.matchStart;
                if (start) {
                    restoreMatch(this.engine, start.snapshot);
                    this.engine.log(null, 'SYSTEM', '重置', null, '戰場狀態已重置');
                    this.engine.bus.emit('GAME_START', { sceneId: this.engine.currentScene.id });
                } else {
                    this.engine.restart();
                }
                this.engine.bus.emit('GAME_RESET', {});
                break;
            }

            case 'SET_TIME_SCALE': {
                // TimeSystem eases `timeScale` toward `targetTimeScale`; writing the target is the
                // same contract the existing playback controls use.
                if (isFiniteNumber(cmd.timeScale)) {
                    this.engine.state.time.targetTimeScale = clampToRange(
                        cmd.timeScale,
                        UI_SETTINGS.TIME_SCALE
                    );
                }
                break;
            }

            case 'SET_CAMERA_TUNING': {
                // Handled in GameRenderer via UI_COMMAND event subscription
                break;
            }

            case 'PLACE_AGENT': {
                if (cmd.team !== Team.BLUE && cmd.team !== Team.RED) break;
                if (!isFiniteNumber(cmd.q) || !isFiniteNumber(cmd.r)) break;
                const q = Math.round(cmd.q);
                const r = Math.round(cmd.r);
                if (!this.engine.isValid(q, r)) break;
                if (this.engine.hasObstacle(q, r)) break;
                if (this.engine.getAgentAt(q, r)) break;

                let hpOverride: number | undefined = undefined;
                if (cmd.hp !== undefined) {
                    if (!isFiniteNumber(cmd.hp) || cmd.hp <= 0) break;
                    hpOverride = Math.round(cmd.hp);
                }

                let roleOverride: Role | undefined = undefined;
                if (cmd.role !== undefined) {
                    if (!Object.values(Role).includes(cmd.role)) break;
                    roleOverride = cmd.role;
                }

                let sideOverride: number | undefined = undefined;
                if (cmd.side !== undefined) {
                    if (!Number.isInteger(cmd.side)) break;
                    sideOverride = cmd.side;
                }

                const agent = this.engine.agentManager.addAgent(this.engine, cmd.team, q, r, hpOverride, roleOverride, cmd.bodyType, sideOverride, cmd.look);
                if (agent) {
                    if (roleOverride) {
                        agent.role = roleOverride;
                    }
                    if (cmd.bodyType) {
                        agent.bodyType = cmd.bodyType;
                    }
                    saveAgentState(agent);
                }
                break;
            }

            case 'REMOVE_AGENT_AT': {
                if (!isFiniteNumber(cmd.q) || !isFiniteNumber(cmd.r)) break;
                const q = Math.round(cmd.q);
                const r = Math.round(cmd.r);
                if (!this.engine.isValid(q, r)) break;
                this.engine.removeAgent(q, r);
                break;
            }

            case 'SET_OBSTACLE': {
                if (!isFiniteNumber(cmd.q) || !isFiniteNumber(cmd.r)) break;
                const q = Math.round(cmd.q);
                const r = Math.round(cmd.r);
                if (!this.engine.isValid(q, r)) break;
                if (this.engine.getAgentAt(q, r)) break;
                const obsType = typeof cmd.obstacleType === 'string' && cmd.obstacleType.trim().length > 0
                    ? cmd.obstacleType
                    : 'WALL';
                this.engine.map.setObstacle(q, r, obsType);
                break;
            }

            case 'REMOVE_OBSTACLE': {
                if (!isFiniteNumber(cmd.q) || !isFiniteNumber(cmd.r)) break;
                const q = Math.round(cmd.q);
                const r = Math.round(cmd.r);
                if (!this.engine.isValid(q, r)) break;
                this.engine.map.removeObstacle(q, r);
                break;
            }

            case 'MOVE_AGENT': {
                if (typeof cmd.agentId !== 'string' || !cmd.agentId) break;
                const agent = this.engine.agents.find((a) => a.id === cmd.agentId);
                if (!agent) break;

                if (!isFiniteNumber(cmd.q) || !isFiniteNumber(cmd.r)) {
                    const p = HexUtils.toPx(agent.q, agent.r, this.engine.mapConfig);
                    agent.px = p.x;
                    agent.py = p.y;
                    agent.dragOverQ = null;
                    agent.dragOverR = null;
                    break;
                }

                const targetQ = Math.round(cmd.q);
                const targetR = Math.round(cmd.r);
                const isValid = this.engine.isValid(targetQ, targetR);
                const isBlocked = isValid ? this.engine.isBlocked(targetQ, targetR, agent.id) : true;

                if (!isValid || isBlocked) {
                    const p = HexUtils.toPx(agent.q, agent.r, this.engine.mapConfig);
                    agent.px = p.x;
                    agent.py = p.y;
                    agent.dragOverQ = null;
                    agent.dragOverR = null;
                    break;
                }

                this.engine.updateAgentPosition(agent, targetQ, targetR);
                const p = HexUtils.toPx(targetQ, targetR, this.engine.mapConfig);
                agent.px = p.x;
                agent.py = p.y;
                agent.dragOverQ = null;
                agent.dragOverR = null;
                break;
            }

            case 'START_GAME': {
                if (this.engine.isRunning) break;
                if (this.startsNewMatch()) {
                    // 開新的一場：先記下起點（開戰快照＋種子），再用種子重設模擬流與體型鹽（契約 S2）
                    const seed = (cmd.seed ?? freshSeed()) >>> 0;
                    this.engine.commands.beginMatch({ snapshot: captureMatch(this.engine), seed });
                    this.engine.agentManager.matchSalt = seed;
                    this.engine.seedSimulation(seed);
                }
                this.engine.play();
                break;
            }

            case 'STOP_GAME': {
                if (this.engine.isRunning) {
                    this.engine.stop();
                }
                break;
            }

            case 'CLEAR_BOARD': {
                this.engine.clear(Boolean(cmd.keepScene), Boolean(cmd.skipRebuild));
                this.engine.commands.endMatch();
                break;
            }

            case 'RANDOMIZE_MAP': {
                if (cmd.layout === 'FLAT' || cmd.layout === 'POINTY') {
                    this.engine.mapConfig.layout = cmd.layout;
                }
                if (typeof cmd.sceneId === 'string') {
                    const scene = SCENE_DB.find((s) => s.id === cmd.sceneId);
                    if (scene) {
                        this.engine.currentScene = scene;
                    }
                }
                if (cmd.randomizeScene !== false) {
                    this.engine.randomizeEnvironment();
                }
                let dimensionsChanged = false;
                if (isFiniteNumber(cmd.w)) {
                    this.engine.mapConfig.w = clampToRange(Math.round(cmd.w), UI_SETTINGS.MAP_WIDTH);
                    dimensionsChanged = true;
                }
                if (isFiniteNumber(cmd.h)) {
                    this.engine.mapConfig.h = clampToRange(Math.round(cmd.h), UI_SETTINGS.MAP_HEIGHT);
                    dimensionsChanged = true;
                }
                if (dimensionsChanged || cmd.sceneId || cmd.randomizeScene === false) {
                    this.engine.map.rebuildMap(this.engine);
                }
                break;
            }

            case 'SET_AUDIO_VOLUME': {
                if (isFiniteNumber(cmd.volume) && (cmd.bus === 'master' || cmd.bus === 'music' || cmd.bus === 'sfx' || cmd.bus === 'ui')) {
                    const clamped = clampToRange(cmd.volume, { min: 0, max: 1 });
                    this.engine.audio?.getEngine().setVolume(cmd.bus, clamped);
                }
                break;
            }

            case 'SET_AUDIO_MUTED': {
                if (typeof cmd.muted === 'boolean') {
                    this.engine.audio?.getEngine().setMuted(cmd.muted);
                }
                break;
            }

            case 'SET_AUDIO_ANNOUNCER': {
                if (typeof cmd.enabled === 'boolean') {
                    this.engine.audio?.getEngine().setAnnouncerEnabled(cmd.enabled);
                }
                break;
            }

            // [契約 R3] 導播避讓：型別已定，處理還沒實作
            case 'SET_VIEW_INSETS':
                return pending('R3', cmd.type);

            // [契約 G3] 玩家操控：型別已定（types/Orders.ts），處理還沒實作
            case 'SET_CONTROLLER':
            case 'ORDER_MOVE':
            case 'ORDER_ATTACK':
            case 'ORDER_CAST':
            case 'ORDER_STOP':
                return pending('G3', cmd.type);

            default: {
                // Unknown command: ignore gracefully
                break;
            }
        }
    }
}
