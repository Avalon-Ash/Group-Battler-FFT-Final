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
export function getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
    if (phase === 'IDLE') return 0;
    const cx = mapConfig.offsetX;
    const cy = mapConfig.offsetY;
    const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
    const maxDist = 1000;
    const d = Math.min(1, dist / maxDist);
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
        if (config.layout === 'FLAT') {
            const q = col;
            const r = row - (col - (col & 1)) / 2;
            return { q, r };
        } else {
            const q = col - (row - (row & 1)) / 2;
            const r = row;
            return { q, r };
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