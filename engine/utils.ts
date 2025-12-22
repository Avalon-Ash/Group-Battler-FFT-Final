
import { HEX_SIZE } from "../constants";
import { Hex, Point } from "../types";

export interface MapConfig {
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
}

// FFT Style Isometric Constants
// Projection Angle: ~35 degrees
// Scale Y to simulate 3D perspective on standard hex grid
export const ISO_SCALE_Y = 0.58; 

// Rotation Constants (45 degrees)
const ANGLE = Math.PI / 4;
const SIN_A = Math.sin(ANGLE);
const COS_A = Math.cos(ANGLE);

// --- Integer Hashing Constants ---
// Hash = (q + 128) << 16 | (r + 128)
// This maps q,r to a unique 32-bit integer.
// Neighbors can be found by adding constant offsets directly to the hash.
// Directions: [1,0], [1,-1], [0,-1], [-1,0], [-1,1], [0,1]
// Q is high 16 bits (step = 65536)
// R is low 16 bits (step = 1)
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

export const Easing = {
    // Smooth start and end (Quadratic)
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // Overshoot slightly (Elastic-like)
    easeOutBack: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    
    // Pull back before shooting forward
    easeInBack: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    }
};

export const HexUtils = {
    /**
     * Converts Offset Coordinates to Axial.
     * Uses Odd-R offset logic.
     */
    offsetToAxial: (col: number, row: number, config: MapConfig): Hex => {
        const q = col - (row - (row & 1)) / 2;
        const r = row;
        return { q: Math.floor(q), r };
    },

    /**
     * ROTATED ISOMETRIC PROJECTION
     * 1. Convert Hex to orthogonal (Cartesian Pointy-Topped)
     * 2. Rotate 45 degrees
     * 3. Squash Y for 2.5D effect
     */
    toPx: (q: number, r: number, config: MapConfig): Point => {
        // 1. Standard Pointy-topped Hex Conversion (Cartesian)
        const cx = (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) * HEX_SIZE;
        const cy = (1.5 * r) * HEX_SIZE; // Fixed 3.0/2 -> 1.5
        
        // 2. Rotate 45 degrees (Rotation Matrix)
        const rx = cx * COS_A - cy * SIN_A;
        const ry = cx * SIN_A + cy * COS_A;
        
        // 3. Apply Offset and Y-Compression
        return { 
            x: config.offsetX + rx, 
            y: config.offsetY + ry * ISO_SCALE_Y 
        };
    },

    /**
     * Inverse Projection (Mouse Picking)
     * Reverses the Rotated Isometric Projection.
     */
    fromPx: (x: number, y: number, config: MapConfig): Hex => {
        // 1. Remove Offset
        const dx = x - config.offsetX;
        const dy = y - config.offsetY;

        // 2. Un-squash Y
        const unsquashedY = dy / ISO_SCALE_Y;

        // 3. Inverse Rotation (-45 degrees)
        // x = x'*cos + y'*sin
        // y = -x'*sin + y'*cos
        const cx = dx * COS_A + unsquashedY * SIN_A;
        const cy = -dx * SIN_A + unsquashedY * COS_A;

        // 4. Standard Hex Inverse Calculation
        const q = (Math.sqrt(3)/3 * cx - 1/3 * cy) / HEX_SIZE;
        const r = (2/3 * cy) / HEX_SIZE;

        return HexUtils.round(q, r);
    },

    /**
     * Rounds floating point axial coords to the nearest valid Hex.
     */
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

    /**
     * Manhattan distance on a hex grid.
     */
    dist: (a: Hex, b: Hex): number => {
        const aq = Math.round(a.q); const ar = Math.round(a.r);
        const bq = Math.round(b.q); const br = Math.round(b.r);
        return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
    },

    key: (h: Hex): string => `${h.q},${h.r}`,

    /**
     * High-performance Integer Hashing for Hex Coordinates.
     * Replaces string keys in critical loops.
     * Supports range roughly -128 to 127, sufficient for game maps.
     */
    hash: (q: number, r: number): number => {
        return (q + 128) << 16 | (r + 128);
    },

    /**
     * Decodes hash back to Hex.
     */
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
    
    // Linear Interpolation between two vectors
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
