// ╔══════════════════════════════════════════════════════════╗
// ║  ClimbRule — 「爬得上去嗎」的唯一判定（純函式、無狀態）   ║
// ║  規則：向上一步的高度差 ≤ max(1, jump) × BLOCK_HEIGHT；    ║
// ║        飛行單位無視；向下任意高度皆可（落地傷害由物理處理）║
// ║  [ARCH] 自走與強制位移共用此規則，不得各寫一份門檻。      ║
// ╚══════════════════════════════════════════════════════════╝

import { MovementType } from "../../types";
import { BLOCK_HEIGHT } from "../../constants";

export interface Climber {
    jump: number;
    movementType: MovementType;
}

/** 單位一步最多能爬的高度（世界單位）。 */
export function getJumpLimit(climber: Pick<Climber, 'jump'>): number {
    return Math.max(1, climber.jump) * BLOCK_HEIGHT;
}

/** 從高度 fromH 走到 toH 是否合法（只檢查向上攀爬）。 */
export function canStepUp(climber: Climber, fromH: number, toH: number): boolean {
    if (climber.movementType === MovementType.FLYING) return true;
    return toH - fromH <= getJumpLimit(climber);
}
