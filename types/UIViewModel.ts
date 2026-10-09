import { Team, Role, AnimState, Skill, LogEntry } from '../types';

/**
 * Read-only snapshot of an Agent for UI rendering.
 */
export interface AgentView {
    readonly id: string;
    readonly team: Team;
    readonly role: Role;
    readonly hp: number;
    readonly maxHp: number;
    readonly mp: number;
    readonly maxMp: number;
    readonly shield: number;
    readonly q: number;
    readonly r: number;
    readonly animState: AnimState;
    readonly isDead: boolean;
    readonly targetId?: string;
    readonly targetHex?: { q: number; r: number };
    readonly currentCastSkill?: Skill | null;
    readonly castProgress?: number;
    readonly skills: readonly Skill[];
}

/**
 * Read-only snapshot of the Director AI state.
 */
export interface DirectorView {
    readonly enabled: boolean;
    readonly targetAgentId: string | null;
    readonly targetAgent: AgentView | null;
}

/**
 * Read-only snapshot of Zone collapse status.
 */
export interface ZoneView {
    readonly enabled: boolean;
    readonly currentRadius: number;
    readonly initialRadius: number;
    readonly shrinkInterval: number;
    readonly minRadius: number;
    readonly nextShrinkCountdown: number;
    readonly isLastStand: boolean;
}

/**
 * Read-only snapshot of Camera tuning parameters.
 */
export interface CameraTuningView {
    readonly followStiffness: number;
    readonly zoomStiffness: number;
}

/**
 * Read-only snapshot of Combat and System Logs.
 */
export interface LogView {
    readonly logs: readonly LogEntry[];
    readonly totalCount: number;
}

/**
 * Read-only snapshot of game playback engine status.
 */
export interface GamePlaybackView {
    readonly isRunning: boolean;
    readonly timeScale: number;
    readonly turn: number;
    readonly winner: Team | null;
}
