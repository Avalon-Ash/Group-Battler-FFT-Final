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

import type { GameCommand, UICommand, ViewCommand } from '../../types';

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

    /** 清盤（GameEngine.clear）時呼叫：新的一段從空白開始記。 */
    public resetLog(): void {
        this.records.length = 0;
    }
}
