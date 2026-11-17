import type { GameEngine } from '../../../game';
import type { SessionView } from '../../../../types';
import { pending } from '../../../core/ContractPending';

/**
 * [契約 R2] 對局狀態給 UI 的投影：階段、是否進行中、勝方、單位數。
 * 取代 useGameApp 的 session state 與 unitCount 輪詢。內容沒變時回傳同一個物件（useEngineView 靠它略過重繪）。
 */
export function selectSessionView(engine: GameEngine): SessionView {
    void engine;
    return pending('R2', 'selectSessionView');
}
