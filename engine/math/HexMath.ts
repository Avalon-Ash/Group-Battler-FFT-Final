
import { Hex, Point, Cube } from "../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

/**
 * Cube Coordinate interface (x + y + z = 0)
 */
export { Cube };

// Constants for Isometric Projection (Pointy Top)
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

    // --- PROJECTION CORE (THE SOURCE OF TRUTH) ---

    /**
     * Converts Hex(q, r) to Screen Pixel(x, y).
     * @returns The CENTER POINT of the hexagon's BASE (Ground Level).
     */
    hexToPixel(q: number, r: number, offsetX: number, offsetY: number): Point {
        // Standard Pointy Top Hex to Pixel conversion
        const x = (SQRT3 * q + SQRT3 / 2 * r) * HEX_SIZE;
        const y = (3 / 2 * r) * HEX_SIZE;

        // Apply ISO Squash (2.5D Projection)
        // We only scale Y to simulate the viewing angle
        return {
            x: x + offsetX,
            y: (y * ISO_SCALE_Y) + offsetY
        };
    },

    /**
     * Converts Screen Pixel(x, y) to Fractional Hex.
     * Inverse of hexToPixel.
     */
    pixelToHex(x: number, y: number, offsetX: number, offsetY: number): Hex {
        const dx = x - offsetX;
        const dy = (y - offsetY) / ISO_SCALE_Y; // Un-squash

        const q = (SQRT3 / 3 * dx - 1 / 3 * dy) / HEX_SIZE;
        const r = (2 / 3 * dy) / HEX_SIZE;

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
    },
    
    ring(center: Hex, radius: number): Hex[] {
        const results: Hex[] = [];
        if (radius === 0) return [center];
        let curr = HexMath.axialToCube({ q: center.q, r: center.r - radius });
        const directions = [{x:1, y:-1, z:0}, {x:1, y:0, z:-1}, {x:0, y:1, z:-1}, {x:-1, y:1, z:0}, {x:-1, y:0, z:1}, {x:0, y:-1, z:1}];
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                results.push(HexMath.cubeToAxial(curr));
                curr.x += directions[i].x;
                curr.y += directions[i].y;
                curr.z += directions[i].z;
            }
        }
        return results;
    }
};
