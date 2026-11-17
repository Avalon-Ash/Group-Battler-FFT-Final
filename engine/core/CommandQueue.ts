// ╔══════════════════════════════════════════════════════════╗
// ║  CommandQueue — 遊戲指令的佇列與紀錄（回放、undo 的地基）   ║
// ║  職責：戰鬥進行中收到的 GameCommand 先排隊，到下一個 tick   ║
// ║        開頭才依序套用；每個套用過的指令連同當時的 tick 編號 ║
// ║        記進 log。同種子＋同一份 log＝同一場戰鬥。            ║
// ║  上游：UICommandSystem（唯一的 enqueue／record 呼叫者）、    ║
// ║        GameEngine.tick（每 tick 開頭 flush）。               ║
// ║  [ARCH] ViewCommand（只影響畫面與聲音）不進佇列也不進 log。 ║
// ║  IMMEDIATE_GAME_COMMANDS 是「戰鬥中也立即套用」的例外：停機、 ║
// ║  倍率（固定步長後不影響模擬）、只對下一場生效的設定。          ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameCommand, UICommand, ViewCommand, MatchStart } from '../../types';
import type { ReplaySession } from './Replay';

/** 只影響畫面與聲音的指令。必須和 types.ts 的 ViewCommand 完全相同（tests/CommandQueue.test.ts 做型別檢查）。 */
export const VIEW_COMMAND_TYPES = [
    'SET_DIRECTOR_ENABLED',
    'SET_CAMERA_TUNING',
    'SET_SHAKE_TUNING',
    'SET_WATCH_AGENT',
    'CAMERA_ZOOM',
    'CAMERA_RESET_ZOOM',
    'CAMERA_PAN',
    'CAMERA_SNAP',
    'SET_VIEWPORT',
    'SET_VIEW_INSETS',
    'SET_AUDIO_VOLUME',
    'SET_AUDIO_MUTED',
    'SET_AUDIO_ANNOUNCER',
] as const satisfies readonly ViewCommand['type'][];

/**
 * 戰鬥中也立即套用的 GameCommand：
 * STOP_GAME（停機前會先套用佇列裡排在它前面的指令）、SET_TIME_SCALE（固定步長下只改 tick 數，不改模擬）、
 * SET_BATTLE_SETUP、SET_SHOWCASE_MODE（只對下一場生效）。
 */
const IMMEDIATE_GAME_COMMANDS: ReadonlySet<GameCommand['type']> = new Set<GameCommand['type']>([
    'STOP_GAME',
    'SET_TIME_SCALE',
    'SET_BATTLE_SETUP',
    'SET_SHOWCASE_MODE',
]);

/**
 * 不影響模擬的 GameCommand（契約 S3）：暫停、繼續（tick > 0 的 START_GAME 只恢復運轉）、倍率、
 * 展示模式旗標（只有音訊在聽）。
 * 它們照樣進 log，但回放檔不收、回放時不餵、undo 不算；回放進行中也照常放行（觀看者可以暫停、調速）。
 */
const SIM_NEUTRAL_COMMANDS: ReadonlySet<GameCommand['type']> = new Set<GameCommand['type']>([
    'STOP_GAME',
    'START_GAME',
    'SET_TIME_SCALE',
    'SET_SHOWCASE_MODE',
]);

export function isSimNeutral(cmd: GameCommand): boolean {
    return SIM_NEUTRAL_COMMANDS.has(cmd.type);
}

const VIEW_SET: ReadonlySet<string> = new Set<string>(VIEW_COMMAND_TYPES);

export function isViewCommand(cmd: UICommand): cmd is ViewCommand {
    return VIEW_SET.has(cmd.type);
}

/** 戰鬥進行中是否要排到下一個 tick 開頭才套用。 */
export function isDeferredWhileRunning(cmd: GameCommand): boolean {
    return !IMMEDIATE_GAME_COMMANDS.has(cmd.type);
}

export interface CommandRecord {
    /** 套用當下已跑完的 tick 數（engine.state.time.tick）：0＝開戰前 */
    tick: number;
    cmd: GameCommand;
}

export class CommandQueue {
    private pending: GameCommand[] = [];
    private readonly records: CommandRecord[] = [];
    /** 這一場的起點（契約 S2）。START_GAME 開新的一場時寫入；RESET_GAME 不清（重開要用它），CLEAR_BOARD 清掉 */
    private start: MatchStart | null = null;
    /** 開戰之後第一筆紀錄的位置（START_GAME 自己那筆之後）；-1＝這一段還沒開戰 */
    private battleFrom = -1;

    public enqueue(cmd: GameCommand): void {
        this.pending.push(cmd);
    }

    public get pendingCount(): number {
        return this.pending.length;
    }

    /** 取出目前排隊的全部指令（套用途中又排進來的留到下一次）。 */
    public drain(): GameCommand[] {
        const out = this.pending;
        this.pending = [];
        return out;
    }

    public record(tick: number, cmd: GameCommand): void {
        this.records.push({ tick, cmd });
    }

    /** 這一段（上次 clear 之後）套用過的指令，依套用順序。 */
    public get log(): readonly CommandRecord[] {
        return this.records;
    }

    /** 清盤（GameEngine.clear）時呼叫：新的一段從空白開始記。起點留著（RESET_GAME 經 clear 還原後還要用）。 */
    public resetLog(): void {
        this.records.length = 0;
        this.battleFrom = -1;
    }

    /** 開新的一場：記下起點，之後套用的指令算這一場的戰中紀錄（唯一呼叫者 UICommandSystem 的 START_GAME）。 */
    public beginMatch(start: MatchStart): void {
        this.start = start;
        this.battleFrom = this.records.length;
    }

    /** 丟掉起點（CLEAR_BOARD：棋盤換掉了，舊起點不再代表場上）。 */
    public endMatch(): void {
        this.start = null;
        this.battleFrom = -1;
    }

    public get matchStart(): MatchStart | null {
        return this.start;
    }

    /** 進行中的回放（契約 S3，唯一寫入者 engine/core/Replay.ts）。是否擋指令只看 session.active，不另存一份旗標 */
    private replaySession: ReplaySession | null = null;
    /** 回放自己正在餵紀錄裡的指令（這時不擋） */
    private feeding = false;

    public get replay(): ReplaySession | null {
        return this.replaySession;
    }

    public attachReplay(session: ReplaySession | null): void {
        this.replaySession = session;
    }

    /** 回放進行中、而且不是回放自己在餵：外部送來的 GameCommand（不影響模擬的除外）要擋下 */
    public get blocksExternal(): boolean {
        return this.replaySession?.active === true && !this.feeding;
    }

    /** 在 fn 期間送出的指令算回放餵的（不擋）。 */
    public feed(fn: () => void): void {
        this.feeding = true;
        try {
            fn();
        } finally {
            this.feeding = false;
        }
    }

    /** 丟掉還沒套用的排隊指令（回放跳轉、undo 換掉整場時，不能讓舊排隊混進新的起點）。 */
    public discardPending(): void {
        this.pending = [];
    }

    /** 這一場開戰之後套用的指令（不含 START_GAME 本身）；還沒開戰是空的。 */
    public get battleLog(): readonly CommandRecord[] {
        return this.battleFrom < 0 ? [] : this.records.slice(this.battleFrom);
    }
}
