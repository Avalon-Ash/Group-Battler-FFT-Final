import type { Team } from '../../types';

export interface PlaybackHUDView {
    readonly isRunning: boolean;
    readonly timeScale: number;
    readonly targetTimeScale: number;
    readonly winner: Team | null;
}
