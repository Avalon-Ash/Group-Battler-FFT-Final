/**
 * EditorQueries — Pure, read-only query functions for UI -> Engine state inspection.
 *
 * Invariant: All functions here are side-effect free.
 * Safe to call with null/undefined engine or renderer references, returning sensible fallbacks.
 */

import { BattleSetup, Hex, Camera, HexSpatialLookup } from '../../../types';
import { GameEngine, Agent } from '../../game';
import { PointerProjector } from '../../math/PointerProjector';
import { HexUtils } from '../../utils';
import { BATTLE_RULES, GAME_APP_PARAM } from '../../../constants';

/** Current engine-owned zoom target, including inputs not yet smoothed on screen. */
export function queryCameraTargetZoom(engine: GameEngine): number | undefined {
    return engine.renderer?.camera.getTargetZoom();
}

/**
 * Returns the agent at hex (q, r), or undefined if not present or dead.
 */
export function queryAgentAt(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): Agent | undefined {
    if (!engine) return undefined;
    return engine.getAgentAt(q, r);
}

/**
 * Checks whether hex (q, r) is a valid, active tile on the current map.
 */
export function queryIsValidHex(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): boolean {
    if (!engine) return false;
    return engine.isValid(q, r);
}

/**
 * Checks whether hex (q, r) has an obstacle.
 */
export function queryHasObstacle(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): boolean {
    if (!engine) return false;
    return engine.hasObstacle(q, r);
}

/**
 * Returns the obstacle type string at hex (q, r), or undefined.
 */
export function queryObstacleTypeAt(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): string | undefined {
    if (!engine) return undefined;
    return engine.map.obstacles.get(HexUtils.key({ q, r }));
}

/**
 * Checks whether hex (q, r) is blocked (out of bounds, obstacle, or occupied by another agent).
 */
export function queryIsBlocked(
    engine: GameEngine | null | undefined,
    q: number,
    r: number,
    ignoreAgentId?: string | null
): boolean {
    if (!engine) return true;
    return engine.isBlocked(q, r, ignoreAgentId ?? null);
}

/**
 * Returns the terrain height at hex (q, r).
 */
export function queryTerrainHeight(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): number {
    if (!engine) return 0;
    return engine.getTerrainHeight(q, r);
}

/**
 * Returns an array of all active map coordinate keys ("q,r").
 */
export function queryMapKeys(engine: GameEngine | null | undefined): string[] {
    if (!engine) return [];
    return Array.from(engine.mapKeys);
}

/**
 * Returns an array of hex coordinates where units can spawn.
 * Excludes tiles with obstacles and tiles on the extreme outer edge.
 */
export function querySpawnableHexes(engine: GameEngine): { q: number; r: number }[] {
    if (!engine) return [];
    const radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1;
    return dropSpawnPockets(queryMapKeys(engine)
        .map((k: string) => {
            const [q, r] = k.split(',').map(Number);
            return { q, r };
        })
        .filter((hex) => {
            if (queryHasObstacle(engine, hex.q, hex.r)) return false;
            return HexUtils.dist({ q: 0, r: 0 }, hex) < radius;
        }));
}

/** 被障礙物圍死的小區塊不能出生：單位整場走不出去也打不到人。順序不變，沒有小區塊時結果和輸入相同。 */
function dropSpawnPockets(cells: HexCoord[]): HexCoord[] {
    const open = new Set(cells.map(c => HexUtils.hash(c.q, c.r)));
    const seen = new Set<number>();
    const pockets = new Set<number>();
    for (const start of open) {
        if (seen.has(start)) continue;
        seen.add(start);
        const region = [start];
        for (let head = 0; head < region.length; head++) {
            for (const n of HexUtils.neighbors(HexUtils.unhash(region[head]))) {
                const h = HexUtils.hash(n.q, n.r);
                if (open.has(h) && !seen.has(h)) { seen.add(h); region.push(h); }
            }
        }
        if (region.length < cells.length * BATTLE_RULES.SPAWN_MIN_REGION_RATIO) region.forEach(h => pockets.add(h));
    }
    return cells.filter(c => !pockets.has(HexUtils.hash(c.q, c.r)));
}

export type HexCoord = { q: number; r: number };

/**
 * 展示模式這一局的陣營×人數：一半機率雙陣營，其餘大逃殺（三個以上陣營）；
 * 總人數落在 SHOWCASE_SETUP 的範圍內。rand 回傳 [0, 1)。
 */
export function rollShowcaseSetup(rand: () => number): BattleSetup {
    const { TEAMS_CHANCE, TEAMS_MIN_PER_SIDE, MIN_UNITS, MAX_UNITS, ROYALE_MIN_FACTIONS } = GAME_APP_PARAM.SHOWCASE_SETUP;
    const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
    if (rand() < TEAMS_CHANCE) {
        return { factions: 2, unitsPerFaction: between(TEAMS_MIN_PER_SIDE, Math.floor(MAX_UNITS / 2)) };
    }
    // 大逃殺先抽每陣營人數再抽陣營數：先抽陣營數的話，陣營一多就只剩每陣營 1 人，組合很單調
    const unitsPerFaction = between(1, Math.floor(MAX_UNITS / ROYALE_MIN_FACTIONS));
    const minFactions = Math.max(ROYALE_MIN_FACTIONS, Math.ceil(MIN_UNITS / unitsPerFaction));
    return { factions: between(minFactions, Math.floor(MAX_UNITS / unitsPerFaction)), unitsPerFaction };
}

/**
 * 開局陣容第 side 陣營第 i 人用第幾個職業：每陣營人數夠排滿一輪時各陣營自己從頭排（標準 5v5），
 * 不夠時全場接續排，否則每陣營 1 人會全部是第一個職業。
 */
export function factionRoleIndex(side: number, i: number, unitsPerFaction: number, roleCount: number): number {
    const index = unitsPerFaction >= roleCount ? i : side * unitsPerFaction + i;
    return index % roleCount;
}

/**
 * 三個以上陣營的開局站位：最遠點取樣選各陣營據點（第一個取 hexes 的第一格，呼叫端先洗牌），
 * 陣營輪流取離自己據點最近的空格。回傳每個陣營的格子（格子不夠時後面的陣營會較少）。
 */
export function layoutFactionHexes(hexes: readonly HexCoord[], factions: number, unitsPerFaction: number): HexCoord[][] {
    const anchors = hexes.slice(0, 1);
    while (anchors.length < factions && anchors.length < hexes.length) {
        let best = hexes[0];
        let bestDist = -1;
        for (const hex of hexes) {
            const d = Math.min(...anchors.map(a => HexUtils.dist(a, hex)));
            if (d > bestDist) {
                bestDist = d;
                best = hex;
            }
        }
        anchors.push(best);
    }
    const nearest = anchors.map(a => [...hexes].sort((x, y) => HexUtils.dist(a, x) - HexUtils.dist(a, y)));
    const used = new Set<string>();
    const layout: HexCoord[][] = anchors.map(() => []);
    for (let i = 0; i < unitsPerFaction; i++) {
        for (let side = 0; side < anchors.length; side++) {
            const hex = nearest[side].find(h => !used.has(`${h.q},${h.r}`));
            if (!hex) continue;
            used.add(`${hex.q},${hex.r}`);
            layout[side].push(hex);
        }
    }
    return layout;
}

/**
 * Converts screen/pointer coordinates into the corresponding Hex using Camera and GridCache.
 */
export function queryHexAtScreenPoint(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement | null | undefined,
    camera: Camera | null | undefined,
    engine: GameEngine | null | undefined,
    spatialCache: HexSpatialLookup | null | undefined,
    cachedRect?: DOMRect
): Hex | null {
    if (!canvas || !camera || !engine || !spatialCache) return null;
    return PointerProjector.cssToHex(
        clientX,
        clientY,
        canvas,
        camera,
        engine,
        spatialCache,
        cachedRect
    );
}

/**
 * Snaps a hex coordinate to 2D world pixel center and retrieves terrain height.
 */
export function queryHexToWorldSnap(
    engine: GameEngine | null | undefined,
    q: number,
    r: number
): { worldX: number; worldY: number; terrainHeight: number } {
    if (!engine) return { worldX: 0, worldY: 0, terrainHeight: 0 };
    return PointerProjector.hexToWorldSnap(
        q,
        r,
        engine.mapConfig,
        (hq, hr) => engine.getTerrainHeight(hq, hr)
    );
}
