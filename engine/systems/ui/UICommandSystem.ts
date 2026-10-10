import { GameEngine } from '../../game';
import { UICommand, Role } from '../../../types';
import { UI_SETTINGS } from '../../../constants';

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

            default: {
                // Unknown command: ignore gracefully
                break;
            }
        }
    };
}
