// ╔══════════════════════════════════════════════════════════╗
// ║  tapIntent — 指標手勢與點擊意圖（契約 G3、ADR 0026 K3/K4）║
// ║  職責：決定單指／多指指標手勢（pointerGesture、            ║
// ║        multiPointerGesture），以及把「選取中的單位＋游標   ║
// ║        位置」翻成意圖：選取、下指令（含 Quick Cast、技能鈕 ║
// ║        拖曳放開 resolveSkillDrop）、或不動作。純函式只讀。 ║
// ║  上游：hooks/useGameInput.ts、PlayHUD（照回傳分派，        ║
// ║        不自行判斷）。                                      ║
// ║  [ARCH] 規則只寫在這裡，輸入層不自己判斷按鍵、指數、敵我。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { Agent } from '../../core/Agent';
import type { Hex, UICommand } from '../../../types';
import { sameSide } from '../../core/Allegiance';
import { queryCastTargeting, isCastTarget } from './castTargeting';

/**
 * 指標按下時輸入層要走的手勢分支（ADR 0026 K3、K4）
 * - ORDER_ON_UP（K4，PLAY 觸控）：單指放開時在放開位置下令（resolveTap 用放開位置的格子與單位）；滑動不拖鏡頭。
 */
export type PointerGesture = 'ORDER_ON_DOWN' | 'ORDER_ON_UP' | 'TAP_ON_UP' | 'CAMERA' | 'CAMERA_OR_CANCEL' | 'IGNORE';

/**
 * 同時按著兩根以上指標時要做什麼（ADR 0026 K4）：
 * - CAMERA_TWO_FINGER：兩指拖曳平移鏡頭（CAMERA_PAN，位移取兩指中點）；捏合縮放沿用 hooks/useCameraControl.ts，不另做。
 * - CANCEL：取消還沒送出的單指動作（不下令、不拖），直到所有指標放開。
 */
export type MultiPointerGesture = 'CAMERA_TWO_FINGER' | 'CANCEL';

/** 技能鈕拖曳放開時的意圖（ADR 0026 K4）：施放、改成一般瞄準（停在該槽）、或取消瞄準 */
export type SkillDropIntent =
    | { kind: 'ORDER'; command: Extract<UICommand, { type: 'ORDER_CAST' }> }
    | { kind: 'AIM' }
    | { kind: 'CANCEL' };

/** 滑鼠按鍵編號（PointerEvent.button） */
const MOUSE_BUTTON_LEFT = 0;
const MOUSE_BUTTON_MIDDLE = 1;
const MOUSE_BUTTON_RIGHT = 2;
/** 按鍵編號對 PointerEvent.buttons 的位元（Pointer Events 規格：左 1、右 2、中 4），依左、右、中的順序 */
const MOUSE_BUTTON_BITS: ReadonlyArray<readonly [button: number, bit: number]> = [
    [MOUSE_BUTTON_LEFT, 1],
    [MOUSE_BUTTON_RIGHT, 2],
    [MOUSE_BUTTON_MIDDLE, 4],
];
/** pointermove 的 button：沒有按鍵變化 */
const NO_BUTTON_CHANGE = -1;

/**
 * 同一個滑鼠已按著一顆鍵時再按或放另一顆（chord），瀏覽器只發 pointermove（button 是變化的那一顆），
 * 不發 pointerdown／pointerup（K1～K4 終審 #3）。回傳這次是按下還是放開；沒有按鍵變化或不是滑鼠回傳 null。
 */
export function mouseChordChange(pointerType: string, button: number, buttons: number): 'PRESS' | 'RELEASE' | null {
    if (pointerType !== 'mouse' || button === NO_BUTTON_CHANGE) return null;
    const bit = MOUSE_BUTTON_BITS.find(([b]) => b === button)?.[1];
    if (bit === undefined) return null;
    return (buttons & bit) !== 0 ? 'PRESS' : 'RELEASE';
}

/** buttons 位元裡還按著的滑鼠鍵（按鍵編號，左、右、中的順序） */
export function heldMouseButtons(buttons: number): number[] {
    return MOUSE_BUTTON_BITS.filter(([, bit]) => (buttons & bit) !== 0).map(([b]) => b);
}

/**
 * 這個指標的這一顆鍵按下要做什麼（ADR 0026 K3、K4）：
 * - PLAY 模式觸控：單指放開時在放開位置下令（ORDER_ON_UP），滑動不拖鏡頭。
 * - 觸控筆與非 PLAY 觸控：照舊放開才判斷（TAP_ON_UP）。
 * - PLAY 模式滑鼠：左鍵按下就下令、中鍵拖鏡頭、右鍵拖鏡頭或點一下取消瞄準、其他鍵不處理。
 * - 非 PLAY 滑鼠（手動、編輯、展示）：左鍵照舊放開才判斷、其他鍵不處理。
 */
export function pointerGesture(isPlay: boolean, pointerType: string, button: number): PointerGesture {
    if (pointerType !== 'mouse') return isPlay && pointerType === 'touch' ? 'ORDER_ON_UP' : 'TAP_ON_UP';
    if (isPlay) {
        if (button === MOUSE_BUTTON_LEFT) return 'ORDER_ON_DOWN';
        if (button === MOUSE_BUTTON_MIDDLE) return 'CAMERA';
        if (button === MOUSE_BUTTON_RIGHT) return 'CAMERA_OR_CANCEL';
        return 'IGNORE';
    }
    return button === MOUSE_BUTTON_LEFT ? 'TAP_ON_UP' : 'IGNORE';
}

/**
 * 同時按著 activeCount 根指標時要做什麼（ADR 0026 K4）：
 * 只有 PLAY 模式觸控且剛好兩指回傳 CAMERA_TWO_FINGER（平移鏡頭），其他一律 CANCEL。
 */
export function multiPointerGesture(isPlay: boolean, pointerType: string, activeCount: number): MultiPointerGesture {
    return isPlay && pointerType === 'touch' && activeCount === 2 ? 'CAMERA_TWO_FINGER' : 'CANCEL';
}

/**
 * 技能鈕拖曳放開（ADR 0026 K4）：onBoard＝放開位置在戰場畫布上（不在按鈕或其他介面上）。
 * 不在畫布上或不能接指令＝CANCEL；在畫布上時呼叫 resolveQuickCast，有合法目標＝ORDER，沒有＝AIM。
 */
export function resolveSkillDrop(engine: GameEngine, selected: Agent | null, slot: number, hex: Hex | null, tapped: Agent | null, onBoard: boolean): SkillDropIntent {
    if (!onBoard || !canTakeOrders(engine, selected)) return { kind: 'CANCEL' };
    const intent = resolveQuickCast(engine, selected, slot, hex, tapped);
    return intent.kind === 'ORDER' && intent.command.type === 'ORDER_CAST'
        ? { kind: 'ORDER', command: intent.command }
        : { kind: 'AIM' };
}

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
 * PLAY：己方（主角或隊友）的身體框比格子高（含觸控容差），會蓋到後面的地面。
 * 指標那一格不是它站的格子，這次點擊就當點那一格地面（移動與瞄準施放共用這一條）。
 */
function ownBodyOverGround(engine: GameEngine, selected: Agent, hex: Hex | null, tapped: Agent): boolean {
    return engine.matchFlow?.isPlay === true
        && sameSide(tapped, selected)
        && hex !== null
        && !(hex.q === tapped.q && hex.r === tapped.r);
}

/** 瞄準中與 Quick Cast 共用的施放判定：對指定技能槽把格子與單位翻成 ORDER_CAST 或 NONE。 */
function resolveAimCast(engine: GameEngine, caster: Agent, slot: number, hex: Hex | null, tapped: Agent | null): TapIntent {
    const targeting = queryCastTargeting(engine, caster, slot);
    if (!targeting) return { kind: 'NONE' };
    if (tapped) {
        if (isCastTarget(engine, caster, slot, tapped)) {
            return { kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: caster.id, slot, targetId: tapped.id } };
        }
        // 點到的己方單位不是這招的目標：身體框蓋到別的地面時改看那一格（落到下面的地面判斷）
        if (!ownBodyOverGround(engine, caster, hex, tapped)) return { kind: 'NONE' };
    }
    if (targeting.mode === 'UNIT_OR_GROUND' && hex && engine.map.isValid(hex.q, hex.r) && !engine.hasObstacle(hex.q, hex.r)) {
        return { kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: caster.id, slot, q: hex.q, r: hex.r } };
    }
    return { kind: 'NONE' };
}

/**
 * 選取中的單位是玩家控制的：點敵人＝攻擊、點空地＝移動、點自己或其他不是敵人的單位＝選取它、
 * 點到地圖外或障礙物＝不動作。
 * 其他情況照舊：點單位就選取，點空地取消選取。
 * @param hex 點到的格子（沒點在地圖上是 null）
 * @param tapped 指標下的單位（身體框命中，身體框比格子高，可能不站在 hex 那一格；沒有是 null）
 *
 * [契約 P5] 瞄準中（engine.state.aim 是選取中的單位）：點到 isCastTarget 的單位＝ORDER_CAST 對它；
 * UNIT_OR_GROUND 的招點到空地（地圖上、不是障礙物）＝ORDER_CAST 對那一格；PLAY 點到不是這招目標的己方身體框、
 * 指標那一格不是它站的格子＝照那一格當點地面；其他點擊不動作（不改選取、不移動）。
 * PLAY 模式不瞄準時：點隊友不改選取（主角一直是選取中的單位）；點到主角或隊友的身體框、但指標那一格
 * 不是它站的格子（身體框蓋到後面的地面）＝照那一格當點地面；其餘照上面的規則。
 */
export function resolveTap(engine: GameEngine, selected: Agent | null, hex: Hex | null, tapped: Agent | null): TapIntent {
    if (!canTakeOrders(engine, selected)) return { kind: 'SELECT', agent: tapped };

    const aim = engine.state.aim;
    if (aim !== null && aim.agentId === selected.id) {
        return resolveAimCast(engine, selected, aim.slot, hex, tapped);
    }

    if (tapped) {
        if (tapped !== selected && tapped.hp > 0 && !sameSide(tapped, selected)) {
            return { kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: selected.id, targetId: tapped.id } };
        }
        if (!engine.matchFlow?.isPlay) return { kind: 'SELECT', agent: tapped };
        // PLAY：主角一直是選取中的單位，點隊友不換選取；身體框蓋到別的地面時當點地面（落到下面的移動判斷）
        if (!ownBodyOverGround(engine, selected, hex, tapped)) return { kind: 'NONE' };
    }
    if (hex && engine.map.isValid(hex.q, hex.r) && !engine.hasObstacle(hex.q, hex.r)) {
        return { kind: 'ORDER', command: { type: 'ORDER_MOVE', agentId: selected.id, q: hex.q, r: hex.r } };
    }
    return { kind: 'NONE' };
}

/**
 * Quick Cast（ADR 0026 K3）：按技能鍵時直接對游標下施放；不修改 engine.state.aim。
 * 與瞄準中的 resolveTap 共用 resolveAimCast；不能接指令的單位回 NONE。
 */
export function resolveQuickCast(engine: GameEngine, selected: Agent | null, slot: number, hex: Hex | null, tapped: Agent | null): TapIntent {
    if (!canTakeOrders(engine, selected)) return { kind: 'NONE' };
    return resolveAimCast(engine, selected, slot, hex, tapped);
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
