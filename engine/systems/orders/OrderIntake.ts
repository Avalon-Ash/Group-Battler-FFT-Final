// ╔══════════════════════════════════════════════════════════╗
// ║  OrderIntake — 指令的套用點（ADR 0027）                    ║
// ║  職責：把一道已驗證的指令套到單位上：照 Orders 的打斷規則  ║
// ║        （orderInterrupts，ADR 0026）取消前搖、停步、解除   ║
// ║        換路節流，再寫入或清掉指令。                        ║
// ║  上游：UICommandSystem（ORDER_* 驗證通過後呼叫）。         ║
// ║  [ARCH] 這裡不擁有任何欄位，只呼叫各欄位擁有者開的 API：   ║
// ║  前搖 → CombatSystem.cancelCast、移動 → MotionCommands、   ║
// ║  換路節流 → MovementSystem、指令 → engine/core/Orders.ts。 ║
// ║  [ARCH] 不驗證指令合不合法（呼叫端的事）；打斷規則目前只   ║
// ║  給玩家指令用，AI 單位要走這裡之前先看 ADR 0026、0027。    ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { Agent, Order } from '../../../types';
import { issueOrder, clearOrder, orderInterrupts } from '../../core/Orders';
import { stopMovement } from '../movement/MotionCommands';

/** 套用一道已驗證的指令（null＝停止）：依 Orders.orderInterrupts 統一處理打斷與立即換路（ADR 0026）。 */
export function applyOrder(engine: GameEngine, agent: Agent, order: Order | null): void {
    const effect = orderInterrupts(agent, order);
    if (effect.cancelWindup) engine.combat.cancelCast(agent, engine);
    if (effect.stopMove && agent.isMoving) stopMovement(agent);
    if (effect.repath) engine.movement.allowImmediateRepath(agent);
    if (order === null) {
        clearOrder(agent);
        // 停下時保留一個決策間隔再交回 HOLD，避免停止指令取消前搖當 tick 又被堅守立刻起手普攻
        agent.aiUpdateTimer = agent.aiUpdateInterval;
        agent.forceAiUpdate = false;
    } else {
        issueOrder(agent, order);
    }
}
