// ╔══════════════════════════════════════════════════════════════╗
// ║  ForcedMove — 強制位移（擊退／拉扯／突進）的唯一裁決（純函式） ║
// ║  職責：逐格推進，遵守「爬得上去嗎」的規則，回報停在哪、為何停 ║
// ║  規則：向上高度差 > max(1,jump)×BLOCK_HEIGHT → WALL 擋下       ║
// ║        （飛行單位無視高度，與 Pathfinder 共用 ClimbRule）；     ║
// ║        障礙物 → OBSTACLE；單位 → UNIT；向下任意高度皆可。       ║
// ║        虛空格：擊退／拉扯照舊推出去（ring-out，落地傷害歸物理）；║
// ║        突進絕不停在虛空（EDGE）。                               ║
// ║  [ARCH] 本檔不寫 Agent 欄位、不發事件；位置與傷害由呼叫端套用。 ║
// ║  撞擊傷害公式見 computeImpactDamage（參數在 FORCED_MOVE）。     ║
// ╚══════════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import type { Hex, Point } from "../../../types";
import { BLOCK_HEIGHT, FORCED_MOVE } from "../../../constants";
import { HexUtils, Vector } from "../../utils";
import type { MapConfig } from "../../utils";
import { canStepUp } from "../../math/ClimbRule";

export type ForcedMoveKind = 'KNOCKBACK' | 'PULL' | 'DASH';
type ForcedMoveBlockReason = 'WALL' | 'OBSTACLE' | 'UNIT' | 'EDGE';

/** 解析器需要的地圖查詢（GameEngine 滿足；測試可用簡單替身）。 */
export interface ForcedMoveSpatial {
    mapConfig: MapConfig;
    isValid(q: number, r: number): boolean;
    getTerrainHeight(q: number, r: number): number;
    hasObstacle(q: number, r: number): boolean;
    getAgentAt(q: number, r: number): Agent | undefined;
}

export interface ForcedMoveBlock {
    reason: ForcedMoveBlockReason;
    /** 擋住的那一格 */
    hex: Hex;
    /** 擋住的格相對目前所在格的高度差（世界單位，正＝更高） */
    heightDiff: number;
    /** 被擋下時還沒走完的格數（含被擋的這一步） */
    remaining: number;
    otherAgentId?: string;
}

export interface ForcedMoveResult {
    finalHex: Hex;
    stepsTaken: number;
    blocked: ForcedMoveBlock | null;
}

/** 在 hex 的六個鄰格中，挑出方向最貼近 dir（像素空間）的那一格。 */
function pickStepToward(hex: Hex, dir: Point, mapConfig: MapConfig): Hex | null {
    const cPx = HexUtils.toPx(hex.q, hex.r, mapConfig);
    let best: Hex | null = null;
    let bestDot = -2.0;
    for (const n of HexUtils.neighbors(hex)) {
        const nPx = HexUtils.toPx(n.q, n.r, mapConfig);
        const nDir = Vector.normalize(Vector.sub(nPx, cPx));
        const dot = nDir.x * dir.x + nDir.y * dir.y;
        if (dot > bestDot) {
            bestDot = dot;
            best = n;
        }
    }
    return best;
}

/**
 * 沿方向（Point，像素向量）或指定路徑（Hex[]，不含起點）推進 agent 最多 tiles 格。
 * 不修改 agent；回傳終點與被擋原因。
 */
export function resolveForcedMove(
    agent: Agent,
    dirOrPath: Point | readonly Hex[],
    tiles: number,
    kind: ForcedMoveKind,
    spatial: ForcedMoveSpatial
): ForcedMoveResult {
    const path = Array.isArray(dirOrPath) ? (dirOrPath as readonly Hex[]) : null;
    const dir = path ? null : (dirOrPath as Point);
    const total = path ? Math.min(tiles, path.length) : tiles;

    let current: Hex = { q: agent.q, r: agent.r };
    let stepsTaken = 0;

    for (let k = 0; k < total; k++) {
        const next = path ? path[k] : pickStepToward(current, dir as Point, spatial.mapConfig);
        if (!next) break;

        const remaining = total - k;
        const heightDiff = spatial.isValid(next.q, next.r)
            ? spatial.getTerrainHeight(next.q, next.r) - spatial.getTerrainHeight(current.q, current.r)
            : 0;
        const block = (reason: ForcedMoveBlockReason, otherAgentId?: string): ForcedMoveResult => ({
            finalHex: current,
            stepsTaken,
            blocked: { reason, hex: next, heightDiff, remaining, otherAgentId }
        });

        if (!spatial.isValid(next.q, next.r)) {
            if (kind === 'DASH') return block('EDGE');
            // 擊退／拉扯：被推出邊界（ring-out），到此為止，墜落由物理處理
            return { finalHex: next, stepsTaken: stepsTaken + 1, blocked: null };
        }
        if (spatial.hasObstacle(next.q, next.r)) return block('OBSTACLE');
        const occupant = spatial.getAgentAt(next.q, next.r);
        if (occupant && occupant !== agent) return block('UNIT', occupant.id);
        if (!canStepUp(agent, spatial.getTerrainHeight(current.q, current.r), spatial.getTerrainHeight(next.q, next.r))) {
            return block('WALL');
        }

        current = next;
        stepsTaken++;
    }

    return { finalHex: current, stepsTaken, blocked: null };
}

/**
 * 突進路徑：從 agent 到 targetHex 的六角直線（不含起點）。
 * 目標格上有別的單位時，路徑止於它前面一格（貼身）；目標格空著則可直接衝上去。
 */
export function planDashPath(agent: Agent, targetHex: Hex, spatial: ForcedMoveSpatial): Hex[] {
    // || 0：把 cubeRound 可能產生的 -0 正規化
    const line = HexUtils.line({ q: agent.q, r: agent.r }, targetHex).slice(1).map(h => ({ q: h.q || 0, r: h.r || 0 }));
    if (line.length === 0) return line;
    const last = line[line.length - 1];
    const occupant = spatial.getAgentAt(last.q, last.r);
    if (occupant && occupant !== agent) line.pop();
    return line;
}

/** 撞擊是否造成傷害：只有被擋下且還有沒走完的格數。突進不受傷。 */
export function isImpactBlock(block: ForcedMoveBlock | null, kind: ForcedMoveKind): block is ForcedMoveBlock {
    return kind !== 'DASH' && block !== null && block.reason !== 'EDGE' && block.remaining > 0;
}

/** 撞擊傷害（對被推的目標）：每個未走完的格＋撞牆時的高度差，依 maxHp 比例，封頂。 */
export function computeImpactDamage(maxHp: number, block: ForcedMoveBlock): number {
    const heightLevels = block.reason === 'WALL' ? Math.max(0, block.heightDiff / BLOCK_HEIGHT) : 0;
    const pct = FORCED_MOVE.IMPACT_BASE_PCT * block.remaining + FORCED_MOVE.IMPACT_PER_HEIGHT_PCT * heightLevels;
    const capped = Math.min(pct, FORCED_MOVE.IMPACT_MAX_PCT);
    return Math.max(FORCED_MOVE.IMPACT_MIN, Math.floor(maxHp * capped));
}
