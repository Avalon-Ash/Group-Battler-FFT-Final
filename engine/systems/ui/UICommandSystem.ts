import { GameEngine } from '../../game';
import { UICommand, Role } from '../../../types';

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
                if (
                    typeof cmd.config.initialRadius === 'number' &&
                    Number.isFinite(cmd.config.initialRadius)
                ) {
                    this.engine.zoneConfig.initialRadius = Math.max(
                        1,
                        Math.min(50, Math.round(cmd.config.initialRadius))
                    );
                }
                if (
                    typeof cmd.config.shrinkInterval === 'number' &&
                    Number.isFinite(cmd.config.shrinkInterval)
                ) {
                    this.engine.zoneConfig.shrinkInterval = Math.max(
                        1,
                        Math.min(120, Math.round(cmd.config.shrinkInterval))
                    );
                }
                if (
                    typeof cmd.config.minRadius === 'number' &&
                    Number.isFinite(cmd.config.minRadius)
                ) {
                    this.engine.zoneConfig.minRadius = Math.max(
                        0,
                        Math.min(this.engine.zoneConfig.initialRadius, Math.round(cmd.config.minRadius))
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
                if (typeof cmd.timeScale === 'number' && Number.isFinite(cmd.timeScale)) {
                    this.engine.state.time.timeScale = Math.max(
                        0.1,
                        Math.min(5.0, cmd.timeScale)
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
