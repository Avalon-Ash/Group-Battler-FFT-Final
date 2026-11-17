// ╔══════════════════════════════════════════════════════════╗
// ║  Replay — 回放、跳轉與 undo（契約 S3）                     ║
// ║  職責：stepSimulation 是模擬前進一步的唯一入口（遊戲迴圈、  ║
// ║        平衡工具、測試都叫它，步長只在這裡決定）；回放時它   ║
// ║        先送出到期的指令再 tick。seekTo 從開戰快照快轉到     ║
// ║        指定 tick；undo＝跳回最後一個指令套用之前並丟掉它。  ║
// ║  上游：hooks/useGameLoop.ts（每幀步進）、hooks/useGameApp.ts ║
// ║        （存檔、載入、回到開頭）、tools/balance、測試。      ║
// ║  [ARCH] 快轉期間不得觸發表現層：匯流排靜音（只放行          ║
// ║  UI_COMMAND），引擎因此不發 GAME_EVENT、不呼叫 renderer、   ║
// ║  不更新導播；快轉結束發 REPLAY_SEEKED，表現層重新同步一次。 ║
// ║  回放進行中 UICommandSystem 擋下 GameCommand（畫面指令、     ║
// ║  暫停、繼續、倍率照常），takeOver 之後才恢復；擋不擋只看    ║
// ║  session.active，session 掛在 engine.commands.replay。       ║
// ║  不影響模擬的指令（CommandQueue 的 isSimNeutral）不進回放檔、 ║
// ║  不餵、undo 不算。不做中途狀態快照：無畫面約 1.9 萬 tick／秒，║
// ║  重跑就夠快。模擬亂數是模組層單一狀態，兩顆引擎不能交錯步進。║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../game';
import type { EventMap, ReplayFile } from '../../types';
import type { CommandRecord } from './CommandQueue';
import { isSimNeutral } from './CommandQueue';
import { matchStartOf, restoreMatch } from './MatchSnapshot';
import { GAME_LOOP_PARAM } from '../../constants';

/** 固定步長（秒）。全專案只有這裡把 SIM_HZ 換成 tick 的 dt；工具與測試要步長就讀它 */
export const SIM_STEP_S = 1 / GAME_LOOP_PARAM.SIM_HZ;

const REPLAY_FILE_VERSION = 1;

/** 快轉時匯流排只放行的事件：回放自己要靠 UI_COMMAND 餵指令 */
const FAST_FORWARD_ALLOW: ReadonlySet<keyof EventMap> = new Set<keyof EventMap>(['UI_COMMAND']);

declare const __BUILD_ID__: string | undefined;

/** 這份程式的版本（Vite define 注入 git 短雜湊；沒注入時是 'dev'） */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** 一次回放的進度。active＝還在照紀錄餵指令。 */
export interface ReplaySession {
    readonly file: ReplayFile;
    /** 下一個要送出的指令在 file.commands 的索引 */
    cursor: number;
    active: boolean;
}

/** 會影響模擬的紀錄（回放檔收的、回放時餵的、undo 算的）。 */
function simRecordsOf(log: readonly CommandRecord[]): CommandRecord[] {
    return log.filter((r) => !isSimNeutral(r.cmd));
}

/** 把這一場（起點＋開戰後的指令）匯出成純資料。 */
export function exportReplay(engine: GameEngine): ReplayFile {
    return structuredClone({
        v: REPLAY_FILE_VERSION,
        build: BUILD_ID,
        start: matchStartOf(engine),
        commands: simRecordsOf(engine.commands.battleLog),
        endTick: engine.state.time.tick,
    });
}

/** 讀進來的回放檔是不是這個版本看得懂的形狀（只檢查結構，不檢查模擬版本；版本不同由呼叫端警告）。 */
export function isReplayFile(data: unknown): data is ReplayFile {
    if (!data || typeof data !== 'object') return false;
    const f = data as Partial<ReplayFile>;
    return f.v === REPLAY_FILE_VERSION
        && typeof f.build === 'string'
        && typeof f.endTick === 'number'
        && Array.isArray(f.commands)
        && !!f.start && typeof f.start.seed === 'number' && !!f.start.snapshot;
}

/** 送出 tick 已到（≤ 目前 tick）的紀錄。 */
function feedDue(engine: GameEngine, session: ReplaySession): void {
    const cmds = session.file.commands;
    const now = engine.state.time.tick;
    engine.commands.feed(() => {
        while (session.cursor < cmds.length && cmds[session.cursor].tick <= now) {
            const { cmd } = cmds[session.cursor++];
            if (!isSimNeutral(cmd)) engine.bus.emit('UI_COMMAND', cmd);
        }
    });
}

/** 回放結束：不再餵、不再擋，之後是即時模擬。 */
function finish(engine: GameEngine, session: ReplaySession): void {
    session.active = false;
    if (engine.commands.replay === session) engine.commands.attachReplay(null);
}

/** 還原快照、用紀錄的種子開戰，回傳進度物件；之後每一步都把它交給 stepSimulation。 */
export function startReplay(engine: GameEngine, file: ReplayFile): ReplaySession {
    const prev = engine.commands.replay;
    if (prev) finish(engine, prev);
    // 舊的排隊指令屬於被換掉的那一場，不能套用到新的起點上
    engine.commands.discardPending();
    restoreMatch(engine, file.start.snapshot);
    const session: ReplaySession = { file, cursor: 0, active: true };
    engine.commands.attachReplay(session);
    engine.commands.feed(() => engine.bus.emit('UI_COMMAND', { type: 'START_GAME', seed: file.start.seed }));
    return session;
}

/**
 * 模擬前進一步（固定步長 1 / GAME_LOOP_PARAM.SIM_HZ）。
 * 有回放且 active：先送出 tick 等於目前 tick 的紀錄，再 tick。紀錄播完、或這一場打完，回放就結束。
 */
export function stepSimulation(engine: GameEngine, replay?: ReplaySession | null): void {
    if (replay?.active && engine.isRunning) {
        feedDue(engine, replay);
        if (replay.cursor >= replay.file.commands.length && engine.state.time.tick >= replay.file.endTick) finish(engine, replay);
    }
    engine.tick(SIM_STEP_S);
    // 引擎自己停了＝分出勝負（VictorySystem）：回放到此為止，之後的清盤、換圖不再被擋
    if (replay?.active && !engine.isRunning) finish(engine, replay);
}

/** 從開戰快照快轉到「已跑完 tick 個 tick」的狀態，回傳停在那裡的進度物件（仍是 active）。 */
export function seekTo(engine: GameEngine, file: ReplayFile, tick: number): ReplaySession {
    let session: ReplaySession;
    engine.bus.mute(FAST_FORWARD_ALLOW);
    try {
        session = startReplay(engine, file);
        while (engine.state.time.tick < tick && engine.isRunning) stepSimulation(engine, session);
    } finally {
        engine.bus.unmute();
    }
    engine.bus.emit('REPLAY_SEEKED', {});
    return session;
}

/** 接手：停止照紀錄餵指令，保留目前狀態繼續即時模擬；之後的指令接在已套用的紀錄後面。 */
export function takeOver(engine: GameEngine, session: ReplaySession): void {
    if (!session.active) return;
    // 同一個 tick 還沒送的紀錄先送：它們在原場排在這個 tick 開頭，接手後的新指令接在它們後面
    if (engine.isRunning) feedDue(engine, session);
    finish(engine, session);
}

/**
 * 取消這一場最後一個套用過的指令：回到它套用之前（tick 等於它紀錄的 tick）、紀錄裡不再有它，
 * 引擎維持進行中。沒有指令可取消時回傳 false。
 */
export function undoLastCommand(engine: GameEngine): boolean {
    if (!engine.commands.matchStart) return false;
    const records = simRecordsOf(engine.commands.battleLog);
    const last = records.at(-1);
    if (!last) return false;
    const file = exportReplay(engine);
    file.commands = records.slice(0, -1).map((r) => structuredClone(r));
    const session = seekTo(engine, file, last.tick);
    takeOver(engine, session);
    return true;
}
