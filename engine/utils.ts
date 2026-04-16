
import { HEX_SIZE, ISO_SCALE_Y } from "../constants";
import { Hex, Point, HexLayout } from "../types";
import { HexMath } from "./math/HexMath";

export interface MapConfig {
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
    layout: HexLayout;
}

// Bitwise constants for Hex Hashing
const Q_BIT_SHIFT = 16;
const Q_OFFSET = 128;
const R_OFFSET = 128;

export const NEIGHBOR_HASH_OFFSETS = [
    (1 << Q_BIT_SHIFT),
    (1 << Q_BIT_SHIFT) - 1,
    -1,
    -(1 << Q_BIT_SHIFT),
    -(1 << Q_BIT_SHIFT) + 1,
    1
];

export const HexUtils = {
    offsetToAxial: (col: number, row: number, config: MapConfig): Hex => {
        if (config.layout === 'FLAT') {
            const q = col;
            const r = row - Math.floor(col / 2);
            return { q, r };
        } else {
            const q = col - Math.floor(row / 2);
            const r = row;
            return { q, r };
        }
    },
    axialToOffset: (q: number, r: number, config: MapConfig): {col: number, row: number} => {
        if (config.layout === 'FLAT') {
            const col = q;
            const row = r + Math.floor(q / 2);
            return { col, row };
        } else {
            const col = q + Math.floor(r / 2);
            const row = r;
            return { col, row };
        }
    },
    toPx: (q: number, r: number, config: MapConfig): Point => {
        return HexMath.hexToPixel(q, r, config.offsetX, config.offsetY, config.layout);
    },
    fromPx: (x: number, y: number, config: MapConfig): Hex => {
        const frac = HexMath.pixelToHex(x, y, config.offsetX, config.offsetY, config.layout);
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
    key: (h: Hex): string => `${Math.round(h.q)},${Math.round(h.r)}`,
    hash: (q: number, r: number): number => {
        return (Math.round(q) + Q_OFFSET) << Q_BIT_SHIFT | (Math.round(r) + R_OFFSET);
    },
    unhash: (h: number): Hex => {
        const r = (h & 0xFFFF) - R_OFFSET;
        const q = (h >> Q_BIT_SHIFT) - Q_OFFSET;
        return { q, r };
    },
    neighbors: (h: Hex): Hex[] => {
        return HexMath.neighbors(h);
    },
    range: (center: Hex, n: number): Hex[] => {
        return HexMath.range(center, n);
    },
    line: (a: Hex, b: Hex): Hex[] => {
        return HexMath.line(a, b);
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
