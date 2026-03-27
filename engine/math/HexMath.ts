
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
        const w = layout === 'FLAT' ? 2 * HEX_SIZE : SQRT3 * HEX_SIZE;
        const h = layout === 'FLAT' ? SQRT3 * HEX_SIZE : 2 * HEX_SIZE;

        // Standard Flat: width = 2*size, spacing = 3/2 * size
        // Standard Pointy: width = sqrt(3)*size, spacing = sqrt(3) * size
        
        // This custom Diamond Projection logic rotates the axis to fit a square-ish screen space
        const stepX = layout === 'FLAT' ? w * 0.75 : w * 0.5;
        const stepY = layout === 'FLAT' ? h * 0.5 : h * 0.75;

        const x = (q - r) * stepX;
        const y = (q + r) * stepY;

        return {
            x: x + offsetX,
            y: y * ISO_SCALE_Y + offsetY
        };
    },

    /**
     * Inverse mapping for Diamond Grid
     */
    pixelToHex(x: number, y: number, offsetX: number, offsetY: number, layout: HexLayout): Hex {
        const dx = x - offsetX;
        const dy = (y - offsetY) / ISO_SCALE_Y;
        
        const w = layout === 'FLAT' ? 2 * HEX_SIZE : SQRT3 * HEX_SIZE;
        const h = layout === 'FLAT' ? SQRT3 * HEX_SIZE : 2 * HEX_SIZE;

        const stepX = layout === 'FLAT' ? w * 0.75 : w * 0.5;
        const stepY = layout === 'FLAT' ? h * 0.5 : h * 0.75;

        const q_minus_r = dx / stepX;
        const q_plus_r = dy / stepY;

        const q = (q_minus_r + q_plus_r) / 2;
        const r = (q_plus_r - q_minus_r) / 2;

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
