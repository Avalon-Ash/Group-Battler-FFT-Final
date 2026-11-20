// ╔══════════════════════════════════════════════════════════╗
// ║  HazardRisk — 站在敵方危害區上要不要走（單一判斷點）        ║
// ║  職責：算留到危害結束會吃多少傷害，依血量與出口遠近決定     ║
// ║        STAY／LEAVE。參數在 constants/ai.ts 的 HAZARD_RISK。 ║
// ║  上游：SpatialHazard（power＝每跳傷害、tickInterval、       ║
// ║        duration＝剩餘秒數，HazardSystem 每 tick 遞減）、    ║
// ║        Pathfinder.stepsToSafety。                          ║
// ║  [ARCH] BT 的危險判定（WantsRetreat、IsInUrgentDanger、    ║
// ║  IsInWarningZone）對敵方危害區一律問這裡，不各自判斷。     ║
// ║  縮圈警告格不歸這裡管：塌陷會直接出局，照舊一定逃。        ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../core/Agent";
import type { SpatialHazard } from "../../types";
import { sameSide } from "../core/Allegiance";
import { HAZARD_RISK } from "../../constants";

/** NONE＝腳下沒有敵方危害；STAY＝有但留下來繼續打；LEAVE＝該走 */
export type HazardVerdict = 'NONE' | 'STAY' | 'LEAVE';

export interface HazardRiskContext {
    getSpatialHazardsAt(q: number, r: number): readonly SpatialHazard[];
    /** 走到最近安全格（非警告、無敵方危害）的步數；走不到回 Infinity */
    stepsToSafety(a: Agent): number;
}

/** 留在 (q, r) 直到各個敵方危害結束會吃的傷害（不扣護盾，偏保守）。友方危害不算。 */
export function hazardStayDamage(a: Agent, hazards: readonly SpatialHazard[]): number {
    let dmg = 0;
    for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (sameSide(h, a) || h.tickInterval <= 0 || h.power <= 0) continue;
        dmg += (h.power / h.tickInterval) * Math.max(0, h.duration);
    }
    return dmg;
}

function hasEnemyHazard(a: Agent, hazards: readonly SpatialHazard[]): boolean {
    for (let i = 0; i < hazards.length; i++) {
        if (!sameSide(hazards[i], a)) return true;
    }
    return false;
}

/**
 * 這些危害扛不扛得住（不看出口）：沒有敵方危害、不扣血、或留到結束不致命且血量不低 → true。
 * 尋路、接近、重新站位用它決定能不能走進或站上這格（第二階段）；去留判斷也以它為底。
 */
export function hazardTolerable(a: Agent, hazards: readonly SpatialHazard[]): boolean {
    if (!hasEnemyHazard(a, hazards)) return true;
    const dmg = hazardStayDamage(a, hazards);
    if (dmg <= 0) return true;
    if (a.maxHp > 0 && a.hp / a.maxHp < HAZARD_RISK.LOW_HP_FRAC) return false;
    return dmg < a.hp * HAZARD_RISK.LETHAL_HP_FRAC;
}

/** 站在 (q, r) 的去留判斷。q, r 可以是預測的落點（擊退中），出口步數仍從單位目前位置算。 */
export function hazardVerdict(a: Agent, q: number, r: number, ctx: HazardRiskContext): HazardVerdict {
    const hazards = ctx.getSpatialHazardsAt(q, r);
    if (!hasEnemyHazard(a, hazards)) return 'NONE';
    if (!hazardTolerable(a, hazards)) return 'LEAVE';
    if (ctx.stepsToSafety(a) <= HAZARD_RISK.NEAR_EXIT_STEPS) return 'LEAVE';
    return 'STAY';
}
