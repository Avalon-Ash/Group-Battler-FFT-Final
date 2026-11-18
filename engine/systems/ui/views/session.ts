import type { GameEngine } from '../../../game';
import type { AppMode, HexLayout, SessionView } from '../../../../types';
import { enginePhase, liveResult, matchSetupOf } from '../../match/MatchFlowSystem';

const sessionCache = new WeakMap<GameEngine, SessionView>();

/**
 * [契約 R2] 對局狀態給 UI 的投影：階段、是否進行中、勝方、單位數。
 * 取代 useGameApp 的 session state 與 unitCount 輪詢。內容沒變時回傳同一個物件（useEngineView 靠它略過重繪）。
 * 有對局流程（engine.matchFlow）就讀它（含轉場階段與鎖存的上一場結果）；沒有（工具、測試）只看引擎狀態。
 */
export function selectSessionView(engine: GameEngine): SessionView {
    const flow = engine.matchFlow;
    const phase = flow ? flow.phase : enginePhase(engine);
    const result = flow ? flow.result : liveResult(engine);
    const setup = flow ? flow.matchSetup : matchSetupOf(engine, engine.battleSetup);
    const isShowcase = flow ? flow.isShowcase : false;
    const winner = result ? result.winner : null;
    const winnerId = result ? result.winnerId : null;
    const winnerSide = result ? result.winnerSide : null;
    const unitCount = engine.agents.length;

    const prev = sessionCache.get(engine);
    if (prev
        && prev.phase === phase
        && prev.isPlaying === engine.isRunning
        && prev.isShowcase === isShowcase
        && prev.winner === winner
        && prev.winnerId === winnerId
        && prev.winnerSide === winnerSide
        && prev.unitCount === unitCount
        && prev.battleSetup.factions === setup.factions
        && prev.battleSetup.unitsPerFaction === setup.unitsPerFaction) {
        return prev;
    }
    // battleSetup 存自己的副本：引擎的設定物件會被原地覆寫（restoreMatch），直接拿來比永遠相等
    const next: SessionView = { phase, isPlaying: engine.isRunning, isShowcase, winner, winnerId, winnerSide, unitCount, battleSetup: { ...setup } };
    sessionCache.set(engine, next);
    return next;
}

/**
 * [契約 U1] 目前的應用模式：決定哪些視窗可用（WindowDef.modes）、要不要收起操作列。
 * 展示模式優先；手動模式分出勝方＝結算畫面。PLAY、REPLAY、EDIT 之後由 G3、S3、G5 接上。
 */
export function appModeOf(view: SessionView): AppMode {
    if (view.isShowcase) return 'SHOWCASE';
    return view.winner !== null ? 'GAME_OVER' : 'MANUAL';
}

/** 戰場的大小、佈局與場景（編輯面板顯示用）。 */
export interface BoardView {
    readonly mapW: number;
    readonly mapH: number;
    readonly hexLayout: HexLayout;
    readonly sceneId: string;
}

const boardCache = new WeakMap<GameEngine, BoardView>();

/**
 * 戰場設定給 UI 的投影：取代 useGameApp 裡跟著引擎同步的鏡像欄位（地圖寬高、佈局、場景）。
 * 內容沒變時回傳同一個物件。
 */
export function selectBoardView(engine: GameEngine): BoardView {
    const { w, h, layout } = engine.mapConfig;
    const sceneId = engine.currentScene.id;
    const prev = boardCache.get(engine);
    if (prev && prev.mapW === w && prev.mapH === h && prev.hexLayout === layout && prev.sceneId === sceneId) return prev;
    const next: BoardView = { mapW: w, mapH: h, hexLayout: layout, sceneId };
    boardCache.set(engine, next);
    return next;
}
