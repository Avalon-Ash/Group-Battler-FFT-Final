// [契約 G3] 玩家操控的資料形狀（docs/plans/optimization-2026-11.md）。
// 控制者決定單位用哪一張模式圖：AI 用 AI_MODE_GRAPH；PLAYER 用玩家圖（受控中斷 → 執行指令 → 沒指令時原地堅守）。
// 外部仍只看到 a.bt.tick(a)。指令一律經 GameCommand（ORDER_*、SET_CONTROLLER）寫入，所以會進佇列、進紀錄、可回放。

export type ControllerKind = 'AI' | 'PLAYER';

/**
 * 玩家單位目前的指令（Agent.order；null＝沒有指令）。
 *  - MOVE：走到那一格；到了就清掉。走不到（被擋、被定身）時保留，能走了再走。
 *  - ATTACK：鎖定這個目標並用普攻打它（不在射程內就靠近）；目標死亡或消失就清掉。
 *  - CAST：對目標（targetId）或地面（q、r）放第 slot 槽的技能，射程不夠先靠近；放出去（或確定放不了）就清掉。
 * 沒有指令時原地堅守：不追人、不逃跑，射程內有敵人就普攻。
 */
export type Order =
    | { type: 'MOVE'; q: number; r: number }
    | { type: 'ATTACK'; targetId: string }
    | { type: 'CAST'; slot: number; targetId?: string; q?: number; r?: number };
