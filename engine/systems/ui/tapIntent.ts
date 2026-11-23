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
import { queryCastTargeting, isCastTarget } from './castTargeting';

export type TapIntent =
    /** 選取這個單位；null＝取消選取 */
    | { kind: 'SELECT'; agent: Agent | null }
    /** 對選取中的玩家單位下指令 */
    | { kind: 'ORDER'; command: Extract<UICommand, { type: 'ORDER_MOVE' | 'ORDER_ATTACK' | 'ORDER_CAST' }> }
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
 *
 * [契約 P5] 瞄準中（engine.state.aim 是選取中的單位）：點到 isCastTarget 的單位＝ORDER_CAST 對它；
 * UNIT_OR_GROUND 的招點到空地（地圖上、不是障礙物）＝ORDER_CAST 對那一格；其他點擊不動作（不改選取、不移動）。
 * PLAY 模式不瞄準時：點隊友不改選取（主角一直是選取中的單位），其餘照上面的規則。
 */
export function resolveTap(engine: GameEngine, selected: Agent | null, hex: Hex | null, tapped: Agent | null): TapIntent {
    if (!canTakeOrders(engine, selected)) return { kind: 'SELECT', agent: tapped };

    const aim = engine.state.aim;
    if (aim !== null && aim.agentId === selected.id) {
        const targeting = queryCastTargeting(engine, selected, aim.slot);
        if (!targeting) return { kind: 'NONE' };
        if (tapped) {
            return isCastTarget(engine, selected, aim.slot, tapped)
                ? { kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: selected.id, slot: aim.slot, targetId: tapped.id } }
                : { kind: 'NONE' };
        }
        if (targeting.mode === 'UNIT_OR_GROUND' && hex && engine.map.isValid(hex.q, hex.r) && !engine.hasObstacle(hex.q, hex.r)) {
            return { kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: selected.id, slot: aim.slot, q: hex.q, r: hex.r } };
        }
        return { kind: 'NONE' };
    }

    if (tapped) {
        if (tapped !== selected && tapped.hp > 0 && !sameSide(tapped, selected)) {
            return { kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: selected.id, targetId: tapped.id } };
        }
        // PLAY 模式：主角一直是選取中的單位，點隊友不換選取
        if (engine.matchFlow?.isPlay) return { kind: 'NONE' };
        return { kind: 'SELECT', agent: tapped };
    }
    if (hex && engine.map.isValid(hex.q, hex.r) && !engine.hasObstacle(hex.q, hex.r)) {
        return { kind: 'ORDER', command: { type: 'ORDER_MOVE', agentId: selected.id, q: hex.q, r: hex.r } };
    }
    return { kind: 'NONE' };
}

/**
 * 游標停在這裡時要標的格子（給戰場的滑過格、範圍預覽與目標圈）。
 * 沒在瞄準：游標所在的格子（地圖外是 null）。瞄準中：這時點下去會施放的位置——點到的單位所在的格子
 * 或那一格地面；點了不會施放就是 null。和點擊用同一個 resolveTap，預覽一定等於點擊。
 * @param tapped 取指標下的單位（和點擊同一個 pickAgentAt）；只在瞄準中才呼叫
 */
export function hoverHexOf(engine: GameEngine, selected: Agent | null, hex: Hex | null, tapped: () => Agent | null): Hex | null {
    const aim = engine.state.aim;
    if (aim === null || selected === null || aim.agentId !== selected.id) {
        return hex && engine.isValid(hex.q, hex.r) ? hex : null;
    }
    const intent = resolveTap(engine, selected, hex, tapped());
    if (intent.kind !== 'ORDER' || intent.command.type !== 'ORDER_CAST') return null;
    const cmd = intent.command;
    if (cmd.targetId !== undefined) {
        const unit = engine.agents.find((a) => a.id === cmd.targetId);
        return unit ? { q: unit.q, r: unit.r } : null;
    }
    return cmd.q !== undefined && cmd.r !== undefined ? { q: cmd.q, r: cmd.r } : null;
}
