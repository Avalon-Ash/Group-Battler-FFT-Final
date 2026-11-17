// ╔══════════════════════════════════════════════════════════╗
// ║  Replay — 回放、跳轉與 undo（契約 S3，空殼）               ║
// ║  職責：stepSimulation 是模擬前進一步的唯一入口（遊戲迴圈、  ║
// ║        平衡工具、測試都叫它，步長只在這裡決定）；回放時它   ║
// ║        先送出到期的指令再 tick。seekTo 從開戰快照快轉到     ║
// ║        指定 tick；undo＝跳回最後一個指令套用之前並丟掉它。  ║
// ║  [ARCH] 快轉期間不得觸發表現層：不發 GAME_EVENT、不呼叫     ║
// ║  renderer、不更新導播；快轉結束後由表現層重新同步一次。     ║
// ║  回放進行中 UICommandSystem 擋下 GameCommand（畫面指令、     ║
// ║  倍率、停止照常），takeOver 之後才恢復。不做中途狀態快照： ║
// ║  無畫面約 1.9 萬 tick／秒，重跑就夠快。                     ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../game';
import type { ReplayFile } from '../../types';
import { pending } from './ContractPending';

/** 一次回放的進度。active＝還在照紀錄餵指令。 */
export interface ReplaySession {
    readonly file: ReplayFile;
    /** 下一個要送出的指令在 file.commands 的索引 */
    cursor: number;
    active: boolean;
}

/** 把這一場（起點＋開戰後的指令）匯出成純資料。 */
export function exportReplay(engine: GameEngine): ReplayFile {
    void engine;
    return pending('S3', 'exportReplay');
}

/** 還原快照、用紀錄的種子開戰，回傳進度物件；之後每一步都把它交給 stepSimulation。 */
export function startReplay(engine: GameEngine, file: ReplayFile): ReplaySession {
    void engine; void file;
    return pending('S3', 'startReplay');
}

/**
 * 模擬前進一步（固定步長 1 / GAME_LOOP_PARAM.SIM_HZ）。
 * 有回放且 active：先送出 tick 等於目前 tick 的紀錄，再 tick。
 */
export function stepSimulation(engine: GameEngine, replay?: ReplaySession | null): void {
    void engine; void replay;
    return pending('S3', 'stepSimulation');
}

/** 從開戰快照快轉到「已跑完 tick 個 tick」的狀態，回傳停在那裡的進度物件（仍是 active）。 */
export function seekTo(engine: GameEngine, file: ReplayFile, tick: number): ReplaySession {
    void engine; void file; void tick;
    return pending('S3', 'seekTo');
}

/** 接手：停止照紀錄餵指令，保留目前狀態繼續即時模擬；之後的指令接在已套用的紀錄後面。 */
export function takeOver(engine: GameEngine, session: ReplaySession): void {
    void engine; void session;
    return pending('S3', 'takeOver');
}

/**
 * 取消這一場最後一個套用過的指令：回到它套用之前（tick 等於它紀錄的 tick）、紀錄裡不再有它，
 * 引擎維持進行中。沒有指令可取消時回傳 false。
 */
export function undoLastCommand(engine: GameEngine): boolean {
    void engine;
    return pending('S3', 'undoLastCommand');
}
