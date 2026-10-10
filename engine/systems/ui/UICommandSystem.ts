import { GameEngine } from '../../game';
import { UICommand, Role, Team } from '../../../types';
import { UI_SETTINGS } from '../../../constants';
import { HexUtils } from '../../utils';

type NumericRange = { readonly min: number; readonly max: number };

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clampToRange = (v: number, range: NumericRange): number =>
    Math.max(range.min, Math.min(range.max, v));

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

    public handleCommand = (cmd: UICommand): void => {
        if (!cmd || typeof cmd !== 'object') return;

        switch (cmd.type) {
            case 'SET_DIRECTOR_ENABLED': {
                this.engine.director.enabled = Boolean(cmd.enabled);
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

            case 'EDIT_AGENT': {
                if (!cmd.agentId) break;
                const agent = this.engine.agents.find((a) => a.id === cmd.agentId);
                if (!agent) break;

                if (cmd.role && Object.values(Role).includes(cmd.role)) {
                    agent.role = cmd.role;
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
                // NOTE: no system subscribes to GAME_RESET yet; session reset is still driven by
                // useGameApp. This command is reserved and gets wired up together with E8.
                this.engine.bus.emit('GAME_RESET', {});
                break;
            }

            case 'PAUSE_GAME': {
                this.engine.isRunning = false;
                break;
            }

            case 'RESUME_GAME': {
                this.engine.isRunning = true;
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

                const agent = this.engine.addAgent(cmd.team, q, r, hpOverride, roleOverride);
                if (agent) {
                    if (roleOverride) {
                        agent.role = roleOverride;
                    }
                    agent.saveState();
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
                if (!this.engine.isRunning) {
                    this.engine.play();
                }
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
                break;
            }

            case 'RANDOMIZE_MAP': {
                if (cmd.layout === 'FLAT' || cmd.layout === 'POINTY') {
                    this.engine.mapConfig.layout = cmd.layout;
                }
                this.engine.randomizeEnvironment();
                let dimensionsChanged = false;
                if (isFiniteNumber(cmd.w)) {
                    this.engine.mapConfig.w = clampToRange(Math.round(cmd.w), UI_SETTINGS.MAP_WIDTH);
                    dimensionsChanged = true;
                }
                if (isFiniteNumber(cmd.h)) {
                    this.engine.mapConfig.h = clampToRange(Math.round(cmd.h), UI_SETTINGS.MAP_HEIGHT);
                    dimensionsChanged = true;
                }
                if (dimensionsChanged) {
                    this.engine.map.rebuildMap(this.engine);
                }
                break;
            }

            default: {
                // Unknown command: ignore gracefully
                break;
            }
        }
    };
}
