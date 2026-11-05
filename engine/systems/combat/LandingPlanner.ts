// ╔══════════════════════════════════════════════════════════╗
// ║ LandingPlanner — 確定性的技能落點（純函式）                ║
// ║ 職責：合法落點與評分分離；不寫 Agent、不發事件。           ║
// ║ 規則：直線 DASH 必須完整抵達，避開警告格與敵方危害區。     ║
// ║ 突進：近戰可及、最短路程、最小落差、固定候選順序。         ║
// ║ 後撤：全場敵距封頂、內側、落差、路程、固定候選順序。       ║
// ║ 上游：BTRegistry、SkillActions；高度攻擊規則由 MeleeAttack。║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent, GameEngine } from '../../game';
import type { Hex, Skill } from '../../../types';
import { COMBAT_PARAM, MOBILITY_LANDING } from '../../../constants';
import { HexUtils } from '../../utils';
import { sameSide } from '../../core/Allegiance';
import { isMeleeAttackCell } from '../../ai/MeleeAttack';
import { resolveForcedMove } from './ForcedMove';

/** 瞬移也共用的落點安全條件；友方危害區不排除。 */
export function isSafeLanding(agent: Agent, cell: Hex, engine: GameEngine): boolean {
    return !engine.isWarningTile(HexUtils.key(cell))
        && !engine.getSpatialHazardsAt(cell.q, cell.r).some(h => !sameSide(h, agent));
}

/** 保留輸入順序，供自動評分或未來手動選格使用。 */
function legalLandings(agent: Agent, candidates: readonly Hex[], range: number, engine: GameEngine): Hex[] {
    return candidates.filter(cell => {
        const dist = HexUtils.dist(agent, cell);
        if (dist === 0 || dist > range || !isSafeLanding(agent, cell, engine)) return false;
        const path = HexUtils.line(agent, cell).slice(1).map(h => ({ q: h.q || 0, r: h.r || 0 }));
        const result = resolveForcedMove(agent, path, range, 'DASH', engine);
        return result.blocked === null && result.finalHex.q === cell.q && result.finalHex.r === cell.r;
    }).map(h => ({ q: h.q || 0, r: h.r || 0 }));
}

function drop(agent: Agent, cell: Hex, engine: GameEngine): number {
    return Math.abs(engine.getTerrainHeight(agent.q, agent.r) - engine.getTerrainHeight(cell.q, cell.r));
}

/** 已經站在打得到目標的格就回 null：不移動，由呼叫端退回前衝。 */
export function planDashLanding(agent: Agent, target: Hex, skill: Skill, engine: GameEngine): Hex | null {
    const canHit = (cell: Hex) => isMeleeAttackCell(engine.movement.targeting, cell, target.q, target.r, COMBAT_PARAM.MELEE_RANGE, engine, agent.jump);
    if (canHit(agent)) return null;
    const candidates = HexUtils.neighbors(target);
    if (!engine.getAgentAt(target.q, target.r)) candidates.push(target);
    const legal = legalLandings(agent, candidates, engine.getSkillRange(agent, target.q, target.r, skill), engine).filter(canHit);
    legal.sort((a, b) => HexUtils.dist(agent, a) - HexUtils.dist(agent, b) || drop(agent, a, engine) - drop(agent, b, engine));
    return legal[0] ?? null;
}

export function planRetreatLanding(agent: Agent, tiles: number, engine: GameEngine): Hex | null {
    const enemies = engine.agents.filter(e => e.hp > 0 && !e.banished && !e.outOfBounds && !sameSide(e, agent));
    const nearest = (cell: Hex) => enemies.reduce((dist, e) => Math.min(dist, HexUtils.dist(cell, e)), Infinity);
    const current = nearest(agent);
    const interior = (cell: Hex) => Number(HexUtils.neighbors(cell).every(n => engine.isValid(n.q, n.r)));
    const legal = legalLandings(agent, HexUtils.range(agent, tiles), tiles, engine)
        .filter(cell => nearest(cell) > current);
    legal.sort((a, b) => Math.min(nearest(b), MOBILITY_LANDING.ESCAPE_SAFE_DIST) - Math.min(nearest(a), MOBILITY_LANDING.ESCAPE_SAFE_DIST)
        || interior(b) - interior(a) || drop(agent, a, engine) - drop(agent, b, engine)
        || HexUtils.dist(agent, a) - HexUtils.dist(agent, b));
    return legal[0] ?? null;
}
