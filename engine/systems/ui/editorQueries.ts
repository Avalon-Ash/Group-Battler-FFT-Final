/**
 * EditorQueries — Pure, read-only query functions for UI -> Engine state inspection.
 *
 * Invariant: All functions here are side-effect free.
 * Safe to call with null/undefined engine or renderer references, returning sensible fallbacks.
 */

import { Hex } from '../../../types';
import { GameEngine, Agent } from '../../game';
import { Camera } from '../CameraSystem';
import { GridCache } from '../grid/GridCache';
import { PointerProjector } from '../../math/PointerProjector';
import { HexUtils } from '../../utils';

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
 * Converts screen/pointer coordinates into the corresponding Hex using Camera and GridCache.
 */
export function queryHexAtScreenPoint(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement | null | undefined,
    camera: Camera | null | undefined,
    engine: GameEngine | null | undefined,
    spatialCache: GridCache | null | undefined,
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
