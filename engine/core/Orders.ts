// ╔══════════════════════════════════════════════════════════╗
// ║  Orders — 玩家單位的指令（契約 G3）                        ║
// ║  職責：Agent.order 的唯一寫入處。資料形狀在 types/Orders.ts ║
// ║  上游：UICommandSystem（ORDER_*、SET_CONTROLLER 驗證後下達 ║
// ║        或清掉）、engine/ai/BTRegistry.ts 的執行節點（完成   ║
// ║        或確定做不了時清掉）、SkillStateMachine（技能放出去  ║
// ║        時回報）、MatchSnapshot（還原開戰前下的指令）。       ║
// ║  [ARCH] 指令一律經 GameCommand 進來，所以會進佇列、進紀錄、 ║
// ║  可回放；這裡不判斷指令合不合法（那是 UICommandSystem 的事）║
// ║  ，也不執行指令（那是玩家模式圖的事）。                     ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from './Agent';
import type { Order } from '../../types';

/** 下指令：取代原本的指令，下一個 tick 就決策（不等這個單位的決策間隔）。 */
export function issueOrder(a: Agent, order: Order): void {
    a.order = order;
    a.forceAiUpdate = true;
}

/** 清掉指令：完成了、確定做不了、被 ORDER_STOP 取消、換控制者。 */
export function clearOrder(a: Agent): void {
    a.order = null;
}

/** 施法管線回報「第 slot 槽的技能放出去了」（前搖走完）：對應的施放指令到此完成。被打斷不算，指令留著重試。 */
export function onSkillReleased(a: Agent, slot: number): void {
    if (a.order?.type === 'CAST' && a.order.slot === slot) a.order = null;
}
