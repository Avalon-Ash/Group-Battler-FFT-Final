
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
 * WAVE LOGIC V3: Continuous motion.
 * No 'trigger wait' dead zone. Everyone moves from T=0.
 * Distance (d) adds 'drag' or 'lag' to the easing function.
 */
export function getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
    if (phase === 'IDLE') return 0;
    
    const centerQ = Math.floor(mapConfig.w / 2);
    const centerR = Math.floor(mapConfig.h / 2);
    const hex = HexUtils.fromPx(x, y, mapConfig);
    
    const maxDist = Math.max(mapConfig.w, mapConfig.h) / 2;
    const dist = Math.sqrt((hex.q - centerQ)**2 + (hex.r - centerR)**2);
    
    // Normalize distance 0 to 1
    const d = Math.min(1, dist / maxDist);
    
    const BASE_OFFSET = 1200;

    if (phase === 'OUT') {
        // LEAVING: Center falls first, edges follow (Wave Out)
        // t goes 0 -> 1
        // We want effectiveT to be slower for edges (high d)
        // Effective T = t ^ (1 + d * lagFactor)
        
        const lag = 1 + d * 2.0; // Edges are 3x slower to start falling
        const effectiveT = Math.pow(t, lag);
        
        // Quadratic acceleration down
        return effectiveT * effectiveT * BASE_OFFSET;

    } else if (phase === 'IN') {
        // ARRIVING: Center lands first, edges lag behind (Wave In)
        // t goes 0 -> 1
        // Start position is BASE_OFFSET
        // End position is 0
        
        // Edges should reach 1.0 (landed) LATER than center
        // Center: reaches 1.0 quickly. Edges: reach 1.0 slowly.
        // We use Power to curve the completion.
        
        // Invert d for incoming wave? No, center should land first.
        // So edges have higher lag.
        
        const lag = 1 + d * 1.5; 
        
        // progress: 0 -> 1
        // We want edge progress to be < center progress at any given t < 1
        const progress = Math.pow(t, lag); 
        
        // Easing: Elastic overshoot or cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        
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
