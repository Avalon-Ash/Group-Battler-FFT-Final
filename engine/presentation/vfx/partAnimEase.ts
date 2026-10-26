import type { PartAnim, RiseKey } from "../../../types/VFXSchema";

/** 零件動畫的內插曲線（PartPainter 的縮放、VFXPhysics 的高度路徑共用）：out＝快起慢收（預設），in＝慢起快收。 */
export function partAnimEase(t: number, kind: PartAnim['ease']): number {
    if (kind === 'in') return t * t * t;
    if (kind === 'linear') return t;
    return 1 - Math.pow(1 - t, 3);
}

/** 高度關鍵影格在生命進度 t（0～1）的偏移：第一格之前取第一格、最後一格之後取最後一格，中間依目標格的 ease 內插。 */
export function riseOffsetAt(keys: readonly RiseKey[], t: number): number {
    if (keys.length === 0) return 0;
    if (t <= keys[0].at) return keys[0].z;
    for (let i = 1; i < keys.length; i++) {
        const b = keys[i];
        if (t <= b.at) {
            const a = keys[i - 1];
            const span = b.at - a.at;
            const u = span > 0 ? (t - a.at) / span : 1;
            return a.z + (b.z - a.z) * partAnimEase(u, b.ease);
        }
    }
    return keys[keys.length - 1].z;
}
