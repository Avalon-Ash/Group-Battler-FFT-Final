
import { Hex, Point, Cube } from "../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

export { Cube };

const SQRT3 = Math.sqrt(3);

export const HexMath = {
    
    // --- COORDINATE SYSTEMS ---

    axialToCube(h: Hex): Cube {
        return { x: h.q, z: h.r, y: -h.q - h.r };
    },

    cubeToAxial(c: Cube): Hex {
        return { q: c.x, r: c.z };
    },

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

    // --- PROJECTION CORE (FLAT-TOP SOURCE OF TRUTH) ---

    /**
     * Converts Hex(q, r) to Screen Pixel(x, y).
     * @returns The CENTER POINT of the hexagon's GROUND BASE (Z=0).
     * Updated for FLAT TOP orientation.
     */
    hexToPixel(q: number, r: number, offsetX: number, offsetY: number): Point {
        // Flat Top Hex to Pixel
        // x = size * 3/2 * q
        // y = size * sqrt(3) * (r + q/2)
        const x = (3 / 2 * q) * HEX_SIZE;
        const y = (SQRT3 * (r + q / 2)) * HEX_SIZE;

        // Apply ISO Squash (2.5D Projection)
        // Only scale Y.
        return {
            x: x + offsetX,
            y: (y * ISO_SCALE_Y) + offsetY
        };
    },

    /**
     * Converts Screen Pixel(x, y) to Fractional Hex.
     * Inverse of hexToPixel (Flat Top). Assumes Z=0 input.
     */
    pixelToHex(x: number, y: number, offsetX: number, offsetY: number): Hex {
        const dx = x - offsetX;
        const dy = (y - offsetY) / ISO_SCALE_Y; // Un-squash

        // Inverse Flat Top Matrix
        const q = (2 / 3 * dx) / HEX_SIZE;
        const r = (-1 / 3 * dx + SQRT3 / 3 * dy) / HEX_SIZE;

        return { q, r };
    },

    // --- GEOMETRY UTILS ---

    distance(a: Hex, b: Hex): number {
        const ac = HexMath.axialToCube(a);
        const bc = HexMath.axialToCube(b);
        return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
    },

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

    line(a: Hex, b: Hex): Hex[] {
        const N = HexMath.distance(a, b);
        const results: Hex[] = [];
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

    range(center: Hex, n: number): Hex[] {
        const results: Hex[] = [];
        for (let q = -n; q <= n; q++) {
            for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) {
                results.push({ q: center.q + q, r: center.r + r });
            }
        }
        return results;
    }
};
