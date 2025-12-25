
import { HEX_SIZE, ISO_SCALE_Y } from "../constants";
import { Hex, Point } from "../types";

export interface MapConfig {
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
}

// FFT Style Isometric Constants
const ANGLE = Math.PI / 4;
const SIN_A = Math.sin(ANGLE);
const COS_A = Math.cos(ANGLE);

// --- Integer Hashing Constants ---
// Hash = (q + 128) << 16 | (r + 128)
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
 * Calculates the vertical visual offset for map transitions (Flying in/out).
 */
export function getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
    if (phase === 'IDLE') return 0;
    
    const centerQ = Math.floor(mapConfig.w / 2);
    const centerR = Math.floor(mapConfig.h / 2);
    const hex = HexUtils.fromPx(x, y, mapConfig);
    
    const maxDist = Math.max(mapConfig.w, mapConfig.h) / 2;
    const dist = Math.sqrt((hex.q - centerQ)**2 + (hex.r - centerR)**2);
    const d = dist / maxDist;
    
    if (phase === 'OUT') {
        const trigger = d * 0.3;
        if (t > trigger) {
            const fallT = Math.min(1, (t - trigger) * 2.5);
            return fallT * fallT * fallT * 1000;
        }
    } else if (phase === 'IN') {
        const trigger = d * 0.3;
        const riseT = Math.max(0, Math.min(1, (t - trigger) * 2.5));
        const easedRise = 1 - Math.pow(1 - riseT, 3);
        return (1 - easedRise) * 1000;
    }
    return 0;
}

export const HexUtils = {
    offsetToAxial: (col: number, row: number, config: MapConfig): Hex => {
        const q = col - (row - (row & 1)) / 2;
        const r = row;
        return { q: Math.floor(q), r };
    },

    toPx: (q: number, r: number, config: MapConfig): Point => {
        const cx = (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) * HEX_SIZE;
        const cy = (1.5 * r) * HEX_SIZE; 
        
        const rx = cx * COS_A - cy * SIN_A;
        const ry = cx * SIN_A + cy * COS_A;
        
        return { 
            x: config.offsetX + rx, 
            y: config.offsetY + ry * ISO_SCALE_Y 
        };
    },

    fromPx: (x: number, y: number, config: MapConfig): Hex => {
        const dx = x - config.offsetX;
        const dy = y - config.offsetY;
        const unsquashedY = dy / ISO_SCALE_Y;

        const cx = dx * COS_A + unsquashedY * SIN_A;
        const cy = -dx * SIN_A + unsquashedY * COS_A;

        const q = (Math.sqrt(3)/3 * cx - 1/3 * cy) / HEX_SIZE;
        const r = (2/3 * cy) / HEX_SIZE;

        return HexUtils.round(q, r);
    },

    round: (q: number, r: number): Hex => {
        let s = -q - r;
        let qi = Math.round(q);
        let ri = Math.round(r);
        let si = Math.round(s);
        const q_diff = Math.abs(qi - q);
        const r_diff = Math.abs(ri - r);
        const s_diff = Math.abs(si - s);
        
        if (q_diff > r_diff && q_diff > s_diff) qi = -ri - si;
        else if (r_diff > s_diff) ri = -qi - si;
        
        return { q: qi, r: ri };
    },

    dist: (a: Hex, b: Hex): number => {
        const aq = Math.round(a.q); const ar = Math.round(a.r);
        const bq = Math.round(b.q); const br = Math.round(b.r);
        return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
    },

    key: (h: Hex): string => `${h.q},${h.r}`,

    hash: (q: number, r: number): number => {
        return (q + 128) << 16 | (r + 128);
    },

    unhash: (h: number): Hex => {
        const r = (h & 0xFFFF) - 128;
        const q = (h >> 16) - 128;
        return { q, r };
    },

    lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

    neighbors: (h: Hex): Hex[] => {
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        return dirs.map(d => ({ q: h.q + d[0], r: h.r + d[1] }));
    },

    range: (center: Hex, n: number): Hex[] => {
        const results: Hex[] = [];
        for (let q = -n; q <= n; q++) {
            for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) {
                results.push({ q: center.q + q, r: center.r + r });
            }
        }
        return results;
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
