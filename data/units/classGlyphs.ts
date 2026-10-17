// data/units/classGlyphs.ts
// 職業圖示字形表（SSOT）：刻在棋座頂面的幻想系向量符號（俯視，烘焙時等距壓扁），座標以圖示畫布中心為原點（約 ±15）。
// 獅心＝乾淨圓角的金色符號；灰燼＝焦黑鋸齒的破損符號。UnitFactory.drawClassGlyph 只負責描繪。
// 手繪貼圖槽（classIcon）有登記時完全繞過本表（docs/FACTION_SLOTS.md）。

import { Role } from '../../types';

export type GlyphStyleId = 'CLEAN' | 'JAGGED';

/** 多邊形／折線：pts 為 [x, y, x, y, ...]；fillAlpha > 0 時以描邊色填半透明底；solid 為實心填色 */
export interface GlyphPoly { kind: 'poly'; pts: readonly number[]; close?: boolean; fillAlpha?: number; width?: number; solid?: boolean }
export interface GlyphCircle { kind: 'circle'; x: number; y: number; r: number; fillAlpha?: number; solid?: boolean }
export type GlyphShape = GlyphPoly | GlyphCircle;

export interface GlyphStyleDef {
    lineJoin: CanvasLineJoin;
    lineCap: CanvasLineCap;
    lineWidth: number;
}

export const CLASS_GLYPH_STYLE: Record<GlyphStyleId, GlyphStyleDef> = {
    CLEAN: { lineJoin: 'round', lineCap: 'round', lineWidth: 2.5 },
    JAGGED: { lineJoin: 'miter', lineCap: 'butt', lineWidth: 2.2 },
};

const SHIELD_CLEAN: GlyphShape[] = [
    { kind: 'poly', pts: [-10, -12, 10, -12, 10, 2, 0, 14, -10, 2], close: true, fillAlpha: 0.35 },
    { kind: 'poly', pts: [0, -8, 0, 9] },
    { kind: 'poly', pts: [-6, -3, 6, -3] },
];
const SHIELD_JAGGED: GlyphShape[] = [
    { kind: 'poly', pts: [-11, -12, -5, -9, 0, -13, 5, -9, 11, -12, 9, 0, 4, 4, 0, 14, -5, 5, -10, 2], close: true, fillAlpha: 0.35 },
    { kind: 'poly', pts: [-1, -7, 2, -1, -1, 4, 1, 10], width: 1.6 },
];

const SWORD_CLEAN: GlyphShape[] = [
    { kind: 'poly', pts: [0, -15, 3, -10, 3, 3, -3, 3, -3, -10], close: true, fillAlpha: 0.45 },
    { kind: 'poly', pts: [-8, 4, 8, 4], width: 3.2 },
    { kind: 'poly', pts: [0, 5, 0, 11] },
    { kind: 'circle', x: 0, y: 13.5, r: 2, solid: true },
];
const SWORD_JAGGED: GlyphShape[] = [
    { kind: 'poly', pts: [0, -15, 3, -11, 1.5, -8, 3.5, -4, 1.5, -1, 3, 3, -3, 3, -3.5, -2, -1.5, -5, -3, -9], close: true, fillAlpha: 0.45 },
    { kind: 'poly', pts: [-9, 5, -4, 3, 4, 3, 9, 5, 5, 6, -5, 6], close: true, solid: true },
    { kind: 'poly', pts: [0, 6, 0, 12], width: 2.6 },
];

const BOW_CLEAN: GlyphShape[] = [
    { kind: 'poly', pts: [-3, -14, 3, -10, 7, -5, 8, 0, 7, 5, 3, 10, -3, 14] },
    { kind: 'poly', pts: [-3, -14, -3, 14], width: 1 },
    { kind: 'poly', pts: [-9, 0, 12, 0], width: 1.6 },
    { kind: 'poly', pts: [15, 0, 9, -3.5, 9, 3.5], close: true, solid: true },
];
const BOW_JAGGED: GlyphShape[] = [
    { kind: 'poly', pts: [-5, -15, -2, -11, 4, -8, 7, -4, 9, 0, 7, 4, 4, 8, -2, 11, -5, 15] },
    { kind: 'poly', pts: [7, -4, 10, -7, 9, -2, 11, 0, 9, 2, 10, 7, 7, 4], width: 1.4 },
    { kind: 'poly', pts: [-4, -14, -4, 14], width: 1 },
    { kind: 'poly', pts: [-9, 0, 11, 0], width: 1.6 },
    { kind: 'poly', pts: [15, 0, 8, -4, 10, 0, 8, 4], close: true, solid: true },
];

const STAFF_CLEAN: GlyphShape[] = [
    { kind: 'poly', pts: [0, -3, 0, 14] },
    { kind: 'circle', x: 0, y: -9, r: 5, fillAlpha: 0.4 },
    { kind: 'poly', pts: [-9, -9, -7.5, -9], width: 1.4 },
    { kind: 'poly', pts: [7.5, -9, 9, -9], width: 1.4 },
    { kind: 'poly', pts: [0, -16, 0, -17.5], width: 1.4 },
];
const STAFF_JAGGED: GlyphShape[] = [
    { kind: 'poly', pts: [0, -2, 1, 5, -1, 14] },
    { kind: 'poly', pts: [0, -18, 4, -12, 8, -13, 7, -7, 4, -4, 0, -1, -4, -4, -7, -7, -8, -13, -4, -12], close: true, fillAlpha: 0.4 },
    { kind: 'poly', pts: [0, -12, 1.5, -8, 0, -5, -1.5, -8], close: true, solid: true },
];

const CHALICE_CLEAN: GlyphShape[] = [
    { kind: 'poly', pts: [-9, -11, 9, -11, 7, 0, 0, 5, -7, 0], close: true, fillAlpha: 0.4 },
    { kind: 'poly', pts: [0, 5, 0, 11] },
    { kind: 'poly', pts: [-6, 12, 6, 12], width: 3 },
    { kind: 'circle', x: 0, y: -15, r: 1.6, solid: true },
];
const CHALICE_JAGGED: GlyphShape[] = [
    { kind: 'poly', pts: [-9, -12, -5, -9, -1, -12, 3, -9, 9, -12, 7, -1, 1, 5, -2, 1, -7, 0], close: true, fillAlpha: 0.4 },
    { kind: 'poly', pts: [0, 5, 1, 11], width: 2.6 },
    { kind: 'poly', pts: [-7, 12, -2, 10.5, 3, 12, 7, 12], width: 2.6 },
    { kind: 'poly', pts: [-1, -8, 1, -3, -1, 0], width: 1.2 },
];

export const CLASS_GLYPHS: Record<GlyphStyleId, Record<Role, readonly GlyphShape[]>> = {
    CLEAN: {
        [Role.TANK]: SHIELD_CLEAN,
        [Role.WARRIOR]: SWORD_CLEAN,
        [Role.RANGER]: BOW_CLEAN,
        [Role.MAGE]: STAFF_CLEAN,
        [Role.SUPPORT]: CHALICE_CLEAN,
    },
    JAGGED: {
        [Role.TANK]: SHIELD_JAGGED,
        [Role.WARRIOR]: SWORD_JAGGED,
        [Role.RANGER]: BOW_JAGGED,
        [Role.MAGE]: STAFF_JAGGED,
        [Role.SUPPORT]: CHALICE_JAGGED,
    },
};
