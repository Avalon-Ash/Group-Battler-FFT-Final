// ╔══════════════════════════════════════════════════════════╗
// ║  tapIntent — 一次點擊要做什麼（契約 G3 的輸入規則）        ║
// ║  職責：把「選取中的單位＋點到的格子與單位」翻成意圖：選取、 ║
// ║        下指令、或不動作。純函式，只讀引擎、不送指令。      ║
// ║  上游：hooks/useGameInput.ts（選取工具的點擊；指令由它送）。║
// ║  [ARCH] 規則只寫在這裡，輸入層不自己判斷敵我或能不能走。   ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { Agent } from '../../core/Agent';
import type { Hex, UICommand } from '../../../types';
import { sameSide } from '../../core/Allegiance';

export type TapIntent =
    /** 選取這個單位；null＝取消選取 */
    | { kind: 'SELECT'; agent: Agent | null }
    /** 對選取中的玩家單位下指令 */
    | { kind: 'ORDER'; command: Extract<UICommand, { type: 'ORDER_MOVE' | 'ORDER_ATTACK' }> }
    /** 點到不能走的地方：維持選取，不動作 */
    | { kind: 'NONE' };

/** 這個單位現在能不能接指令：還在場上、活著、玩家控制，而且這一場還沒分出勝負。 */
function canTakeOrders(engine: GameEngine, unit: Agent | null): unit is Agent {
    return unit !== null
        && unit.hp > 0
        && unit.controller === 'PLAYER'
        && !engine.state.victory.isFinishing
        && engine.agents.includes(unit);
}

/**
 * 選取中的單位是玩家控制的：點敵人＝攻擊、點空地＝移動、點自己或其他不是敵人的單位＝選取它、
 * 點到地圖外或障礙物＝不動作。
 * 其他情況照舊：點單位就選取，點空地取消選取。
 * @param hex 點到的格子（沒點在地圖上是 null）
 * @param tapped 按下時那一格上的單位（沒有是 null）
 */
export function resolveTap(engine: GameEngine, selected: Agent | null, hex: Hex | null, tapped: Agent | null): TapIntent {
    if (!canTakeOrders(engine, selected)) return { kind: 'SELECT', agent: tapped };

    if (tapped) {
        if (tapped !== selected && tapped.hp > 0 && !sameSide(tapped, selected)) {
            return { kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: selected.id, targetId: tapped.id } };
        }
        return { kind: 'SELECT', agent: tapped };
    }
    if (hex && engine.map.isValid(hex.q, hex.r) && !engine.hasObstacle(hex.q, hex.r)) {
        return { kind: 'ORDER', command: { type: 'ORDER_MOVE', agentId: selected.id, q: hex.q, r: hex.r } };
    }
    return { kind: 'NONE' };
}
