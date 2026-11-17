import type { Team } from '../../types';

export interface PlaybackHUDView {
    readonly isRunning: boolean;
    readonly timeScale: number;
    readonly targetTimeScale: number;
    readonly winner: Team | null;
    /** 正在照回放檔播（契約 S3）：遊戲指令被擋，播放列顯示「接手」 */
    readonly replaying: boolean;
    /** 這一場有開戰快照（可以存回放、回到開頭） */
    readonly hasMatch: boolean;
}
