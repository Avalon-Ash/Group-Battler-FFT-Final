// ╔══════════════════════════════════════════════════════════╗
// ║  views/l1 — L1 HUD 專用唯讀快照                           ║
// ║  職責：提供 PlaybackHUD 等 HUD 元件的穩定快照             ║
// ║  [ARCH] 內容沒變就回傳同一個物件，避免無限重繪            ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import type { PlaybackHUDView } from '../../../../types/ui/l1';

let prevPlaybackView: PlaybackHUDView | null = null;

export function selectL1PlaybackView(engine: GameEngine): PlaybackHUDView {
    const isRunning = engine.isRunning;
    const timeScale = engine.state.time.timeScale;
    const targetTimeScale = engine.state.time.targetTimeScale;
    const winner = engine.state.victory.winningTeam;
    const replaying = engine.commands.replay?.active === true;
    const hasMatch = engine.commands.matchStart !== null;

    if (
        prevPlaybackView &&
        prevPlaybackView.isRunning === isRunning &&
        prevPlaybackView.timeScale === timeScale &&
        prevPlaybackView.targetTimeScale === targetTimeScale &&
        prevPlaybackView.winner === winner &&
        prevPlaybackView.replaying === replaying &&
        prevPlaybackView.hasMatch === hasMatch
    ) {
        return prevPlaybackView;
    }

    const next: PlaybackHUDView = {
        isRunning,
        timeScale,
        targetTimeScale,
        winner,
        replaying,
        hasMatch,
    };
    prevPlaybackView = next;
    return next;
}
