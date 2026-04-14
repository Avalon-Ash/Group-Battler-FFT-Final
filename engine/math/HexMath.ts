
import { Hex, Point, HexLayout } from "../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

export interface Cube {
    x: number;
    y: number;
    z: number;
}

const SQRT3 = Math.sqrt(3);

export const HexMath = {
    
    // Axial directions in (q, r)
    // Used for neighbor finding and pathfinding
    directions: [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ],

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

    /**
     * Diamond Hex Mapping (SRPG Standard) - V2
     * Implementation of Duality for Flat and Pointy layouts.
     */
    hexToPixel(q: number, r: number, offsetX: number, offsetY: number, layout: HexLayout): Point {
        // Restore Diamond Projection for that "Isometric" look the user missed.
        // This projection tilts the grid by 45 degrees and provides depth.
        const x = (q - r) * HEX_SIZE * 0.8;
        const y = (q + r) * HEX_SIZE * ISO_SCALE_Y;

        return {
            x: x + offsetX,
            y: y + offsetY
        };
    },

    /**
     * Inverse mapping for standard Hex Grid
     */
    pixelToHex(x: number, y: number, offsetX: number, offsetY: number, layout: HexLayout): Hex {
        const dx = (x - offsetX) / (HEX_SIZE * 0.8);
        const dy = (y - offsetY) / (HEX_SIZE * ISO_SCALE_Y);
        
        // Inverse of the Diamond Projection
        const q = (dx + dy) / 2;
        const r = (dy - dx) / 2;

        return { q, r };
    },

    distance(a: Hex, b: Hex): number {
        const ac = this.axialToCube(a);
        const bc = this.axialToCube(b);
        return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
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

    line(a: Hex, b: Hex): Hex[] {
        const N = this.distance(a, b);
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
            results.push(this.cubeToAxial(this.cubeRound(cubeLerp)));
        }
        return results;
    },

    neighbors(h: Hex): Hex[] {
        return this.directions.map(d => ({ q: h.q + d.q, r: h.r + d.r }));
    }
};
