
import { Hex, Point, Cube } from "../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

/**
 * Cube Coordinate interface (x + y + z = 0)
 * Allows for symmetric arithmetic operations.
 */
export { Cube };

// Rotation Constants (45 degrees)
const ANGLE = Math.PI / 4;
const SIN = Math.sin(ANGLE);
const COS = Math.cos(ANGLE);

export const HexMath = {
    
    // --- CONVERSIONS ---

    axialToCube(h: Hex): Cube {
        return {
            x: h.q,
            z: h.r,
            y: -h.q - h.r
        };
    },

    cubeToAxial(c: Cube): Hex {
        return { q: c.x, r: c.z };
    },

    /**
     * Round floating point cube coordinates to the nearest valid hex
     * Essential for pixel-to-hex conversion logic
     */
    cubeRound(frac: Cube): Cube {
        let q = Math.round(frac.x);
        let r = Math.round(frac.z);
        let s = Math.round(frac.y);

        const q_diff = Math.abs(q - frac.x);
        const r_diff = Math.abs(r - frac.z);
        const s_diff = Math.abs(s - frac.y);

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r - s;
        } else if (r_diff > s_diff) {
            r = -q - s;
        } else {
            s = -q - r;
        }
        return { x: q, y: s, z: r };
    },

    // --- GEOMETRY ---

    /**
     * Exact distance in hex steps
     */
    distance(a: Hex, b: Hex): number {
        const ac = HexMath.axialToCube(a);
        const bc = HexMath.axialToCube(b);
        return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
    },

    /**
     * Linear interpolation between two hexes
     */
    lerp(a: Hex, b: Hex, t: number): Hex {
        const ac = HexMath.axialToCube(a);
        const bc = HexMath.axialToCube(b);
        
        const cubeLerp = {
            x: ac.x + (bc.x - ac.x) * t,
            y: ac.y + (bc.y - ac.y) * t,
            z: ac.z + (bc.z - ac.z) * t
        };
        return HexMath.cubeToAxial(HexMath.cubeRound(cubeLerp));
    },

    /**
     * Get all hexes forming a line between A and B
     */
    line(a: Hex, b: Hex): Hex[] {
        const N = HexMath.distance(a, b);
        const results: Hex[] = [];
        // Nudge endpoints slightly to avoid boundary edge cases in rounding
        const ac = { x: a.q + 1e-6, z: a.r + 1e-6, y: -a.q - a.r - 2e-6 };
        const bc = { x: b.q + 1e-6, z: b.r + 1e-6, y: -b.q - b.r - 2e-6 };

        for (let i = 0; i <= N; i++) {
            const t = N === 0 ? 0.0 : i / N;
            const cubeLerp = {
                x: ac.x + (bc.x - ac.x) * t,
                y: ac.y + (bc.y - ac.y) * t,
                z: ac.z + (bc.z - ac.z) * t
            };
            results.push(HexMath.cubeToAxial(HexMath.cubeRound(cubeLerp)));
        }
        return results;
    },

    /**
     * Get hexes in a cone/sector shape
     */
    cone(center: Hex, target: Hex, range: number): Hex[] {
        return HexMath.range(center, range);
    },

    /**
     * Get ring of hexes at exact radius
     */
    ring(center: Hex, radius: number): Hex[] {
        const results: Hex[] = [];
        if (radius === 0) return [center];

        let curr = HexMath.axialToCube({ q: center.q, r: center.r - radius });
        
        const directions = [
            {x:1, y:-1, z:0}, {x:1, y:0, z:-1}, {x:0, y:1, z:-1}, 
            {x:-1, y:1, z:0}, {x:-1, y:0, z:1}, {x:0, y:-1, z:1}
        ];

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                results.push(HexMath.cubeToAxial(curr));
                curr.x += directions[i].x;
                curr.y += directions[i].y;
                curr.z += directions[i].z;
            }
        }
        return results;
    },

    /**
     * Spiral (Filled Circle)
     */
    range(center: Hex, n: number): Hex[] {
        const results: Hex[] = [];
        for (let q = -n; q <= n; q++) {
            for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) {
                results.push({ q: center.q + q, r: center.r + r });
            }
        }
        return results;
    },

    // --- PROJECTION SYSTEM (The Source of Truth) ---

    /**
     * Converts Hex (q, r) to Screen Pixels (x, y).
     * Applies: Pointy-Top Conversion -> 45deg Rotation -> ISO Scale Y -> Offset
     */
    hexToPixel(q: number, r: number, offsetX: number, offsetY: number): Point {
        // 1. Pointy Top Basis
        const x_local = (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) * HEX_SIZE;
        const y_local = (1.5 * r) * HEX_SIZE;

        // 2. Rotate 45 degrees
        const x_rot = x_local * COS - y_local * SIN;
        const y_rot = x_local * SIN + y_local * COS;

        // 3. Scale Y (Isometric Squashing) & Translate
        return {
            x: offsetX + x_rot,
            y: offsetY + y_rot * ISO_SCALE_Y
        };
    },

    /**
     * Converts Screen Pixels (x, y) to Fractional Hex (q, r).
     * Applies strict inverse of hexToPixel:
     * Un-Offset -> Un-Scale Y -> Un-Rotate (-45deg) -> Pointy-Top Inverse
     */
    pixelToHex(x: number, y: number, offsetX: number, offsetY: number): Hex {
        // 1. Un-Offset
        const dx = x - offsetX;
        const dy = y - offsetY;

        // 2. Un-Scale Y
        // Visual Y was squashed, so we stretch it back
        const y_unsquashed = dy / ISO_SCALE_Y;

        // 3. Un-Rotate (-45 degrees)
        // x0 = x' cos(-a) - y' sin(-a) = x' cos(a) + y' sin(a)
        // y0 = x' sin(-a) + y' cos(-a) = -x' sin(a) + y' cos(a)
        const x_local = dx * COS + y_unsquashed * SIN;
        const y_local = -dx * SIN + y_unsquashed * COS;

        // 4. Pointy Top Inverse
        // r = y / (1.5 * size)
        // q = (x - sqrt(3)/2 * size * r) / (sqrt(3) * size)
        //   = (x / sqrt(3) / size) - (r / 2)
        const r = y_local / (1.5 * HEX_SIZE);
        const q = (x_local / (Math.sqrt(3) * HEX_SIZE)) - (r / 2.0);
        
        return { q, r }; // Returns fractional coordinates
    }
};
