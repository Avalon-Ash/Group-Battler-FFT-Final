import { AUDIO, SCREEN_CONSTANTS } from '../../../constants';
import { GameEvent, Team } from '../../../types';
import { AudioEngine, PlayCueOptions } from '../../audio/AudioEngine';
import { EventBus } from '../../events/EventBus';

/**
 * AudioSystem — 音訊系統控制器（事件驅動橋接器）
 * 遵守 AGENTS.md §1.2 與 §1.3 核心架構約束：
 * 1. 僅透過 EventBus 訂閱遊戲事件，絕不直接呼叫其他系統的方法。
 * 2. 嚴禁在 tick() 迴圈或事件處理內分配大量新物件。
 * 3. 負責事件至音效 Cue 對映、左右聲像計算、戰鬥張力與 BGM 交叉淡化調度。
 */
export class AudioSystem {
    private bus: EventBus;
    private audioEngine: AudioEngine;
    private isDestroyed: boolean = false;

    // 戰鬥狀態追蹤（僅用於決定音樂張力層切換）
    private totalAgentsInBattle: number = 10;
    private remainingAgents: number = 10;
    private isBattleActive: boolean = false;

    // 儲存事件取消訂閱用之引用
    private unsubscribers: (() => void)[] = [];

    constructor(bus: EventBus, options?: { audioEngine?: AudioEngine }) {
        this.bus = bus;
        this.audioEngine = options?.audioEngine ?? new AudioEngine();
        this.bindEvents();

        // 預設啟動氛圍曲目
        this.audioEngine.playMusic('SHOWCASE_AMBIENT', 0.5);
    }

    /** 取得底層 AudioEngine 實例（供 UI 設定或測試使用） */
    public getEngine(): AudioEngine {
        return this.audioEngine;
    }

    /** 銷毀並清理所有監聽器與音訊資源 */
    public destroy(): void {
        this.isDestroyed = true;
        for (const unsub of this.unsubscribers) {
            unsub();
        }
        this.unsubscribers.length = 0;
        this.audioEngine.destroy();
    }

    private bindEvents(): void {
        // 1. 遊戲核心視覺/音訊事件流
        this.subscribe('GAME_EVENT', (evt: GameEvent) => {
            this.handleGameEvent(evt);
        });

        // 2. 系統級事件
        this.subscribe('GAME_START', () => {
            this.isBattleActive = true;
            this.totalAgentsInBattle = 10;
            this.remainingAgents = 10;
            this.audioEngine.playCue('UI_START');
            this.audioEngine.playMusic('BATTLE_NORMAL', AUDIO.BGM_CROSSFADE_SEC);
        });

        this.subscribe('GAME_OVER', (data: { winner: Team | null }) => {
            this.isBattleActive = false;
            if (data.winner === Team.BLUE) {
                this.audioEngine.playCue('VICTORY');
                this.audioEngine.playMusic('VICTORY_STING', 0.2);
            } else {
                this.audioEngine.playCue('DEFEAT');
                this.audioEngine.playMusic('DEFEAT_STING', 0.2);
            }
        });

        this.subscribe('GAME_CLEAR', () => {
            this.isBattleActive = false;
            this.audioEngine.playMusic('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);
        });

        this.subscribe('ENV_UPDATE', () => {
            if (!this.isBattleActive) {
                this.audioEngine.playMusic('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);
            }
        });

        this.subscribe('CAMERA_SHAKE', (data: { intensity: number }) => {
            const intensity = Math.min(1.5, Math.max(0.4, data.intensity * 2.0));
            this.audioEngine.playCue('RUMBLE', { intensity });
        });

        this.subscribe('TILE_COLLAPSED', (data: { q: number; r: number; worldX?: number; worldY?: number }) => {
            const x = data.worldX !== undefined ? data.worldX : (data.q + 6) * 100;
            const pan = this.calculateScreenXRatio(x);
            this.audioEngine.playCue('COLLAPSE', { x: pan, intensity: 1.1 });
        });

        this.subscribe('ZONE_SHRUNK', () => {
            this.audioEngine.playCue('COLLAPSE', { intensity: 0.9 });
        });

        this.subscribe('LAST_STAND_TRIGGERED', (data: { q: number; r: number }) => {
            const pan = this.calculateScreenXRatio((data.q + 6) * 100);
            this.audioEngine.playCue('RUMBLE', { x: pan, intensity: 1.4 });
        });

        this.subscribe('AGENT_DIED', (data: { impactX: number }) => {
            const pan = this.calculateScreenXRatio(data.impactX);
            this.audioEngine.playCue('DEATH', { x: pan });

            if (this.isBattleActive) {
                this.remainingAgents = Math.max(0, this.remainingAgents - 1);
                // 存活單位 <= 4 時切換至緊張音樂層
                if (this.remainingAgents <= 4) {
                    this.audioEngine.playMusic('BATTLE_TENSE', AUDIO.BGM_CROSSFADE_SEC);
                }
            }
        });

        this.subscribe('KILL', () => {
            this.audioEngine.playCue('HIT_HEAVY', { intensity: 1.2 });
        });

        this.subscribe('CAST_START', () => {
            this.audioEngine.playCue('SPELL_CAST', { intensity: 0.8 });
        });

        this.subscribe('UI_COMMAND', (cmd: { type: string }) => {
            if (!cmd) return;
            if (cmd.type === 'START_GAME') {
                this.audioEngine.playCue('UI_START');
            } else if (cmd.type === 'RESET_GAME' || cmd.type === 'CLEAR_BOARD') {
                this.audioEngine.playCue('UI_CLICK');
            }
        });
    }

    private handleGameEvent(evt: GameEvent): void {
        const pan = this.calculateScreenXRatio(evt.pos.x);
        const cueOpts: PlayCueOptions = { x: pan };

        switch (evt.type) {
            case 'DAMAGE': {
                const val = evt.value ?? 0;
                const isCrit = evt.text === 'CRITICAL' || val >= 80;
                const isMissOrBlock = evt.text === 'MISS' || evt.text === 'BLOCK';

                if (isMissOrBlock) {
                    cueOpts.intensity = 0.5;
                    this.audioEngine.playCue('SLASH', cueOpts);
                } else if (isCrit) {
                    cueOpts.intensity = Math.min(1.4, Math.max(0.9, val / 60));
                    this.audioEngine.playCue('HIT_HEAVY', cueOpts);
                } else {
                    cueOpts.intensity = Math.min(1.2, Math.max(0.6, val / 40));
                    this.audioEngine.playCue('HIT_LIGHT', cueOpts);
                }
                break;
            }

            case 'HEAL': {
                cueOpts.intensity = 1.0;
                this.audioEngine.playCue('MAGIC_HEAL', cueOpts);
                break;
            }

            case 'CC_APPLIED': {
                this.audioEngine.playCue('CC_STUN', cueOpts);
                break;
            }

            case 'CAST_START': {
                this.audioEngine.playCue('SPELL_CAST', cueOpts);
                break;
            }

            case 'PROJECTILE_SPAWN': {
                const skillType = evt.skill?.element || evt.skill?.type;
                if (skillType === 'FIRE') {
                    this.audioEngine.playCue('MAGIC_FIRE', cueOpts);
                } else if (skillType === 'ICE') {
                    this.audioEngine.playCue('MAGIC_ICE', cueOpts);
                } else {
                    this.audioEngine.playCue('BOW', cueOpts);
                }
                break;
            }

            case 'PROJECTILE_HIT': {
                this.audioEngine.playCue('HIT_LIGHT', cueOpts);
                break;
            }

            case 'DEATH': {
                this.audioEngine.playCue('DEATH', cueOpts);
                break;
            }

            case 'SPAWN': {
                this.audioEngine.playCue('SPAWN', cueOpts);
                break;
            }

            case 'IMPACT_AOE': {
                cueOpts.intensity = 1.2;
                this.audioEngine.playCue('COLLAPSE', cueOpts);
                break;
            }

            case 'HAZARD_SPAWN': {
                this.audioEngine.playCue('MAGIC_FIRE', cueOpts);
                break;
            }

            case 'GROUND_IMPACT': {
                cueOpts.intensity = 1.1;
                this.audioEngine.playCue('IMPACT_GROUND', cueOpts);
                break;
            }

            default:
                break;
        }
    }

    /**
     * 計算螢幕 X 軸比例 (0..1) 供聲像平移
     */
    private calculateScreenXRatio(worldX: number): number {
        const width = SCREEN_CONSTANTS.DEFAULT_WIDTH;
        if (width <= 0) return 0.5;
        const ratio = worldX / width;
        return Math.max(0, Math.min(1, ratio));
    }

    private subscribe<K extends keyof import('../../../types').EventMap>(
        event: K,
        handler: (data: import('../../../types').EventMap[K]) => void
    ): void {
        this.bus.on(event, handler);
        this.unsubscribers.push(() => {
            this.bus.off(event, handler);
        });
    }
}
