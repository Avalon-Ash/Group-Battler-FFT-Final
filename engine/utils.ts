
import { HEX_SIZE, ISO_SCALE_Y } from "../constants";
import { Hex, Point } from "../types";
import { HexMath } from "./math/HexMath";

export interface MapConfig {
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
}

// --- Integer Hashing Constants ---
const Q_STEP = 1 << 16;
const R_STEP = 1;

export const NEIGHBOR_HASH_OFFSETS = [
    Q_STEP,             // (1, 0)
    Q_STEP - R_STEP,    // (1, -1)
    -R_STEP,            // (0, -1)
    -Q_STEP,            // (-1, 0)
    -Q_STEP + R_STEP,   // (-1, 1)
    R_STEP              // (0, 1)
];

// --- VISUAL UTILS ---

/**
 * Calculates the vertical visual offset for map transitions (Phase Jump).
 */
export function getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
    if (phase === 'IDLE') return 0;
    
    // Normalize distance from center (0 to 1)
    const centerQ = Math.floor(mapConfig.w / 2);
    const centerR = Math.floor(mapConfig.h / 2);
    
    // Use Pixel Distance estimation for smoothness
    const cx = mapConfig.offsetX;
    const cy = mapConfig.offsetY;
    const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
    const maxDist = 1000;
    const d = Math.min(1, dist / maxDist);
    
    // Base travel distance (Pixels)
    const BASE_OFFSET = 1500; 

    if (phase === 'OUT') {
        const startT = d * 0.3;
        if (t < startT) return 0; 
        let localT = (t - startT) * 1.8; 
        localT = Math.max(0, Math.min(1, localT));
        const s = 0.5; 
        const eased = localT * localT * ((s + 1) * localT - s);
        return eased * BASE_OFFSET;

    } else if (phase === 'IN') {
        const startT = d * 0.2;
        if (t < startT) return BASE_OFFSET; 
        let localT = (t - startT) * 1.5;
        localT = Math.max(0, Math.min(1, localT));
        const eased = 1 - Math.pow(1 - localT, 4);
        return (1 - eased) * BASE_OFFSET;
    }
    return 0;
}

export const HexUtils = {
    offsetToAxial: (col: number, row: number, config: MapConfig): Hex => {
        const q = col - (row - (row & 1)) / 2;
        const r = row;
        return { q: Math.floor(q), r };
    },

    /**
     * Converts Hex coordinates to Screen Pixels.
     * DELEGATES TO HexMath.hexToPixel for consistent geometry.
     */
    toPx: (q: number, r: number, config: MapConfig): Point => {
        return HexMath.hexToPixel(q, r, config.offsetX, config.offsetY);
    },

    /**
     * Converts Screen Pixels to Hex coordinates.
     * DELEGATES TO HexMath.pixelToHex for consistent picking.
     */
    fromPx: (x: number, y: number, config: MapConfig): Hex => {
        const frac = HexMath.pixelToHex(x, y, config.offsetX, config.offsetY);
        return HexMath.cubeToAxial(HexMath.cubeRound(HexMath.axialToCube(frac)));
    },

    round: (q: number, r: number): Hex => {
        const c = HexMath.cubeRound({x: q, z: r, y: -q-r});
        return { q: c.x, r: c.z };
    },

    dist: (a: Hex, b: Hex): number => {
        return HexMath.distance(a, b);
    },

    lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

    key: (h: Hex): string => `${h.q},${h.r}`,

    hash: (q: number, r: number): number => {
        return (q + 128) << 16 | (r + 128);
    },

    unhash: (h: number): Hex => {
        const r = (h & 0xFFFF) - 128;
        const q = (h >> 16) - 128;
        return { q, r };
    },

    neighbors: (h: Hex): Hex[] => {
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        return dirs.map(d => ({ q: h.q + d[0], r: h.r + d[1] }));
    },

    range: (center: Hex, n: number): Hex[] => {
        return HexMath.range(center, n);
    }
};

export const Vector = {
    sub: (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y }),
    add: (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y }),
    mult: (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s }),
    lerp: (a: Point, b: Point, t: number): Point => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    }),
    mag: (a: Point): number => Math.sqrt(a.x * a.x + a.y * a.y),
    normalize: (a: Point): Point => {
        const m = Vector.mag(a);
        return m === 0 ? { x: 0, y: 0 } : { x: a.x / m, y: a.y / m };
    },
    dist: (a: Point, b: Point): number => Vector.mag(Vector.sub(a, b))
};
