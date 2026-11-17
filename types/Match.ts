// [契約 S2／S3] 開戰快照與回放檔的資料形狀（docs/plans/optimization-2026-11.md）。
// 全部是純資料：只能放數字、字串、布林、陣列與純物件，JSON 來回一趟必須完全相同
// （不放 Map、Set、Agent 參考、函式）。欄位增減要改版本號 v。

import type { Team, Role, Skill, ZoneConfig, BattleSetup, HexLayout, BodyTypeId, FactionLook } from '../types';
import type { CommandRecord } from '../engine/core/CommandQueue';

/** 開戰瞬間的一個單位。其餘欄位（速度、跳躍、技能物件、行為樹）由職業與 skillIds 導出，不存。 */
interface MatchUnitSnapshot {
    id: string;
    team: Team;
    side: number;
    role: Role;
    q: number;
    r: number;
    hp: number;
    maxHp: number;
    maxMp: number;
    skillIds: (string | null)[];
    bodyType?: BodyTypeId;
    look: FactionLook;
    /** AI 決策間隔（生成或重置時抽的抖動，會影響模擬） */
    aiUpdateInterval: number;
}

/**
 * 開戰快照：START_GAME 套用當下的戰場。回放、重開（RESET_GAME）、undo 都從它還原，
 * 不重播佈陣指令，也不重新生成地圖。
 */
export interface MatchSnapshot {
    v: 1;
    mapConfig: { w: number; h: number; offsetX: number; offsetY: number; layout: HexLayout };
    /** SCENE_DB 的 id */
    sceneId: string;
    /** 每一格與它的高度（px，＝MapSystem.heightMap 的值）；依 q、r 由小到大排序 */
    tiles: { q: number; r: number; h: number }[];
    /** 依 q、r 由小到大排序 */
    obstacles: { q: number; r: number; type: string }[];
    zoneConfig: ZoneConfig;
    battleSetup: BattleSetup;
    /** 和出廠技能庫不同的技能（整筆）。還原後引擎的技能庫＝出廠副本套上這些，且不和其他引擎共用物件 */
    skillEdits: Skill[];
    /** 依 engine.agents 的順序 */
    units: MatchUnitSnapshot[];
    /** GameEngine 的實體流水號（戰鬥中生成的單位、投射物靠它取 id） */
    entityCounter: number;
}

/** 一場的起點：快照＋模擬流種子（uint32）。唯一寫入者 UICommandSystem（START_GAME）。 */
export interface MatchStart {
    snapshot: MatchSnapshot;
    seed: number;
}

/** 回放檔：起點＋開戰之後套用的指令（不含 START_GAME 本身）。 */
export interface ReplayFile {
    v: 1;
    /** 產生這份回放的程式版本（git 短雜湊）；和目前版本不同時載入要警告 */
    build: string;
    start: MatchStart;
    commands: CommandRecord[];
    /** 匯出當下已跑完的 tick 數 */
    endTick: number;
}
