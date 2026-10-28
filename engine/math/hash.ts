// ╔══════════════════════════════════════════════════════════╗
// ║ hash — deterministic algorithms; preserve JS arithmetic exactly. ║
// ║ Origins: rng.ts / TerrainLoopAtlas seeded / PartSpec createPartRng ║
// ║ and Synth AudioPRNG: mulberry32; only rng.ts owns combat state.    ║
// ║ NoiseLib hash2: FLOAT multiplication + xor, deliberately no imul. ║
// ║ TerrainRenderer edgeHash: three-input imul; ObstacleSpriteStore:  ║
// ║ two-input imul; background starHash: murmur2; bodyTypes: FNV-1a.  ║
// ║ useMatrixRain: linear remainder. These callers affect appearance ║
// ║ or audio only; this module owns no shared simulation state.       ║
// ╚══════════════════════════════════════════════════════════╝

const HASH_PARAM = {
    VALUE_0: 1831565813,
    VALUE_1: 15,
    VALUE_2: 7,
    VALUE_3: 61,
    VALUE_4: 14,
    VALUE_5: 4294967296,
    VALUE_6: 2654435769,
    VALUE_7: 374761393,
    VALUE_8: 668265263,
    VALUE_9: 2246822519,
    VALUE_10: 13,
    VALUE_11: 1274126177,
    VALUE_12: 2654435761,
    VALUE_13: 2246822507,
    VALUE_14: 3266489909,
    VALUE_15: 739982445,
    VALUE_16: 12,
    VALUE_17: 1540483477,
    VALUE_18: 668265261,
    VALUE_19: 2166136261,
    VALUE_20: 16777619,
    VALUE_21: 0.1,
    VALUE_22: 15485863,
    VALUE_23: 1231,
    VALUE_24: 7919,
};

export function advanceMulberry32(state: number): number {
    return (state + HASH_PARAM.VALUE_0) >>> 0;
}

export function mulberry32Value(state: number): number {
    let t = state;
    t = Math.imul(t ^ (t >>> HASH_PARAM.VALUE_1), t | 1);
    t ^= t + Math.imul(t ^ (t >>> HASH_PARAM.VALUE_2), t | HASH_PARAM.VALUE_3);
    return ((t ^ (t >>> HASH_PARAM.VALUE_4)) >>> 0) / HASH_PARAM.VALUE_5;
}

export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = advanceMulberry32(state);
        return mulberry32Value(state);
    };
}

/** PartSpec's original seed offset, before uint32 coercion. */
export function offsetMulberry32(seed: number): () => number {
    return mulberry32((seed + HASH_PARAM.VALUE_6) >>> 0);
}

export function floatXorHash2(ix: number, iy: number, seed: number): number {
    let h = ix * HASH_PARAM.VALUE_7 + iy * HASH_PARAM.VALUE_8 + seed * HASH_PARAM.VALUE_9;
    h = (h ^ (h >>> HASH_PARAM.VALUE_10)) * HASH_PARAM.VALUE_11;
    h = h ^ (h >>> 16);
    return (h >>> 0) / HASH_PARAM.VALUE_5;
}

export function imulMix3(variant: number, edge: number, k: number): number {
    let h = Math.imul(variant + 1, HASH_PARAM.VALUE_12) ^ Math.imul(edge + HASH_PARAM.VALUE_2, HASH_PARAM.VALUE_13) ^ Math.imul(k + HASH_PARAM.VALUE_10, HASH_PARAM.VALUE_14);
    h ^= h >>> HASH_PARAM.VALUE_1; h = Math.imul(h, HASH_PARAM.VALUE_15); h ^= h >>> HASH_PARAM.VALUE_16;
    return (h >>> 0) / HASH_PARAM.VALUE_5;
}

export function murmur2Mix(i: number, salt: number): number {
    let h = Math.imul(i ^ salt, HASH_PARAM.VALUE_17);
    h ^= h >>> HASH_PARAM.VALUE_1;
    h = Math.imul(h, HASH_PARAM.VALUE_17);
    h ^= h >>> HASH_PARAM.VALUE_1;
    return (h >>> 0) / HASH_PARAM.VALUE_5;
}

export function imulVariant2(q: number, r: number, count: number): number {
    if (count <= 1) return 0;
    let h = Math.imul(q | 0, HASH_PARAM.VALUE_18) ^ Math.imul(r | 0, HASH_PARAM.VALUE_7);
    h ^= h >>> HASH_PARAM.VALUE_1;
    h = Math.imul(h, HASH_PARAM.VALUE_13);
    h ^= h >>> HASH_PARAM.VALUE_10;
    return (h >>> 0) % count;
}

export function fnv1a32(seedStr: string): number {
    let hash = HASH_PARAM.VALUE_19;
    for (let i = 0; i < seedStr.length; i++) {
        hash ^= seedStr.charCodeAt(i);
        hash = Math.imul(hash, HASH_PARAM.VALUE_20);
    }
    const u32 = hash >>> 0;
    return u32;
}

export const stableMatrixChar = (laneIdx: number, cellIdx: number, seed: number, charSet: string, volatility: number, time: number) => {
    const len = charSet.length;
    if (len === 0) return "";
    const timeStep = volatility > 0 ? Math.floor(time * volatility * HASH_PARAM.VALUE_21) : 0;
    const index = Math.abs((laneIdx * HASH_PARAM.VALUE_22 + cellIdx * HASH_PARAM.VALUE_23 + timeStep * HASH_PARAM.VALUE_24 + Math.floor(seed)) % len);
    return charSet[index];
};
