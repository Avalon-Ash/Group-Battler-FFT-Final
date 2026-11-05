// ╔══════════════════════════════════════════════════════════╗
// ║ STATUS_ART — 核可附件、毒材質與職業對位的資料 SSOT        ║
// ║ [ARCH] 附件以精靈腳底為原點，隨 UNIT op 排序（RenderSpec §4）。║
// ╚══════════════════════════════════════════════════════════╝
import { Role } from '../../types';

export const STATUS_ART = {
    path: 'assets/cc_bodies/status-effects.png',
    cell: 128, columns: 8, anchorX: 64, anchorY: 112, pixelsPerUnit: 2,
    fpsByTier: [8, 8, 4, 2],
    stun: { first: 0, count: 8, ringHeight: 48, headGap: 7, sway: 0.065, scaleY: 0.96 },
    burn: { first: 8, count: 8 },
    poison: { first: 16, count: 4 },
    root: { first: 20, count: 1, backBands: [[0, 90], [100, 106]], frontBands: [[90, 100], [106, 128]] },
    sheep: { torsoScaleX: 1.05, torsoScaleY: 0.7, rootScaleX: 1.1 },
} as const;

/** Torso/ankle profiles exclude hats and weapons. Same geometry for all hues/body types.
 * The atlas has bilateral attachments; mirroring it follows the native E/W direction.
 * North-facing units retain the attachments on the visible back/near leg. */
export const STATUS_ART_FIT: Record<Role, { torsoX: number; torsoY: number; rootX: number; offsetY: number }> = {
    [Role.WARRIOR]: { torsoX: 1, torsoY: 1, rootX: 1, offsetY: 0 },
    [Role.TANK]: { torsoX: 1.12, torsoY: 1, rootX: 1.12, offsetY: -1 },
    [Role.RANGER]: { torsoX: 0.86, torsoY: 1, rootX: 0.9, offsetY: 0 },
    [Role.MAGE]: { torsoX: 0.78, torsoY: 1, rootX: 0.85, offsetY: -2 },
    [Role.SUPPORT]: { torsoX: 0.9, torsoY: 1, rootX: 0.95, offsetY: -1 },
};

export const POISON_MATERIAL = {
    width: 768, height: 1024, cellW: 96, cellH: 128, columns: 8,
    pages: 2, pageColumns: 1, framesPerPage: 30, framesPerTask: 2, unusedStamp: -2,
    sourceScale: 0.5, mix: 0.47,
    luminance: [0.2126, 0.7152, 0.0722],
    low: [45, 90, 24], range: [85, 155, 55], byteMax: 255, channels: 4,
} as const;

/** Combat pool: eight complete appearances; 8 MiB, plus the shared 48 KiB scratch.
 * POISON_MATERIAL retains the small layout used by isolated preview/cache tests. */
export const POISON_COMBAT_POOL = {
    width: 2048, height: 1024, pages: 8, pageColumns: 4,
} as const;
