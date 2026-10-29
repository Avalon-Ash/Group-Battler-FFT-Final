// ╔══════════════════════════════════════════════════════════╗
// ║  MeleeAttack — 近戰「具體攻擊格」的判定（純函式、無狀態） ║
// ║  職責：判斷哪種單位／射程走「站到同層攻擊格」的追擊；      ║
// ║        判斷一格對指定目標位置是否為合法攻擊格。            ║
// ║  上游：TargetingSystem.getEffectiveRange（射程唯一規則，   ║
// ║        每層高低差消耗一格射程）；本檔不重寫該規則。        ║
// ║  [ARCH] Pathfinder（挑格＋尋路）、MovementSystem（沿用    ║
// ║  快取路徑）、BTRegistry（Reposition）共用這兩個判定，      ║
// ║  不得各寫一份「近戰」或「攻擊格」的條件。飛行與遠程不走此路。║
// ╚══════════════════════════════════════════════════════════╝

import { MovementType } from "../../types";
import type { Hex, SpatialProvider } from "../../types";
import { COMBAT_PARAM } from "../../constants";
import { HexUtils } from "../utils";
import type { Agent } from "../core/Agent";
import type { TargetingSystem } from "./TargetingSystem";

/** 地面近戰追擊：射程 > 0 且 <= 近戰射程，且不是飛行單位。 */
export function isGroundMeleeRange(a: Pick<Agent, 'movementType'>, range: number): boolean {
    return range > 0 && range <= COMBAT_PARAM.MELEE_RANGE && a.movementType !== MovementType.FLYING;
}

/** cell 站位對 (targetQ, targetR) 是否在有效射程內（含高低差折算）。 */
export function isMeleeAttackCell(
    targeting: TargetingSystem, cell: Hex, targetQ: number, targetR: number, range: number, spatial: SpatialProvider
): boolean {
    return HexUtils.dist(cell, { q: targetQ, r: targetR }) <= targeting.getEffectiveRange(cell, targetQ, targetR, range, spatial);
}
