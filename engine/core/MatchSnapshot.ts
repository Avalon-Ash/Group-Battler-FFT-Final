// ╔══════════════════════════════════════════════════════════╗
// ║  MatchSnapshot — 開戰快照的擷取與還原（契約 S2，空殼）     ║
// ║  職責：把「開戰瞬間的戰場」變成純資料，再從純資料還原。    ║
// ║        回放、重開、undo 都從快照開始，不重播佈陣指令、      ║
// ║        不重新生成地圖（MapGenerator.rebuild 會抽亂數）。    ║
// ║  [ARCH] 起點（快照＋種子）與開戰後的指令紀錄存在           ║
// ║  CommandQueue，唯一寫入者 UICommandSystem（START_GAME）。   ║
// ║  restoreMatch 走既有的清盤與生成路徑，不另寫一套初始化；    ║
// ║  不得為了讓驗收通過而在這裡補個別欄位的特例。              ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../game';
import type { MatchSnapshot, MatchStart } from '../../types';
import type { CommandRecord } from './CommandQueue';
import { pending } from './ContractPending';

/** 擷取目前戰場（未開戰或剛開戰都可）。回傳值是純資料，和引擎不共用任何物件。 */
export function captureMatch(engine: GameEngine): MatchSnapshot {
    void engine;
    return pending('S2', 'captureMatch');
}

/**
 * 把引擎還原成快照的樣子：停機、清盤、地圖／障礙物／設定／技能庫／單位照快照重建。
 * 完成後引擎處於「佈陣完成、尚未開戰」，可以直接送 START_GAME。
 */
export function restoreMatch(engine: GameEngine, snapshot: MatchSnapshot): void {
    void engine; void snapshot;
    return pending('S2', 'restoreMatch');
}

/** 這一場的起點。還沒開過戰就丟錯（呼叫端的錯誤，不是待辦）。 */
export function matchStartOf(engine: GameEngine): MatchStart {
    void engine;
    return pending('S2', 'matchStartOf');
}

/** 這一場開戰之後套用過的指令，依套用順序；不含 START_GAME 本身。 */
export function battleLogOf(engine: GameEngine): readonly CommandRecord[] {
    void engine;
    return pending('S2', 'battleLogOf');
}
