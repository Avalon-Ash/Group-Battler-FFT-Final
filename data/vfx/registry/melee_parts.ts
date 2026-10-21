// ╔══════════════════════════════════════════════════════════╗
// ║  data/vfx/registry/melee_parts.ts — 近戰揮擊與受擊特效零件庫 ║
// ║  職責：定義近戰普攻揮擊（刀弧、下劈重擊）與專屬受擊零件     ║
// ║  ART_SPEC §4～§6：獅心乾淨對稱，灰燼崩裂殘渣；時長 ≤ 0.2s ║
// ╚══════════════════════════════════════════════════════════╝

import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { flash, groundRing } from "./basic_parts";

export const MELEE_PART_VFX: Record<string, VFXAsset> = {
    // ================= 獅心騎士團（BLUE）揮擊 =================

    // 鋼銀劍弧：快速一閃（0.16 s）
    'FX_SWING_BLUE_SLASH': {
        id: 'FX_SWING_BLUE_SLASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 36, arcDeg: 120, thickness: 8, ramp: 'LION_PHYSICAL' },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.15, fadeOut: 0.6, rotation: -0.4 },
            }),
        ],
    },

    // 聖光刀弧：金色劍弧
    'FX_SWING_BLUE_SLASH_HOLY': {
        id: 'FX_SWING_BLUE_SLASH_HOLY',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 36, arcDeg: 125, thickness: 8, ramp: 'LION_HOLY' },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.15, fadeOut: 0.6, rotation: -0.4 },
            }),
        ],
    },

    // 橫掃重斬：弧度大、較粗
    'FX_SWING_BLUE_CLEAVE': {
        id: 'FX_SWING_BLUE_CLEAVE',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 44, arcDeg: 150, thickness: 12, ramp: 'LION_PHYSICAL' },
                count: 1,
                lifetime: 0.18,
                delay: 0,
                size: 44,
                partAnim: { scaleFrom: 0.75, scaleTo: 1.2, fadeOut: 0.6, rotation: -0.6 },
            }),
        ],
    },

    // 奧術大弧斬：皇家藍橫掃
    'FX_SWING_BLUE_CLEAVE_ARCANE': {
        id: 'FX_SWING_BLUE_CLEAVE_ARCANE',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 44, arcDeg: 150, thickness: 12, ramp: 'LION_ARCANE' },
                count: 1,
                lifetime: 0.18,
                delay: 0,
                size: 44,
                partAnim: { scaleFrom: 0.75, scaleTo: 1.2, fadeOut: 0.6, rotation: -0.6 },
            }),
        ],
    },

    // 雙劍十字斬第一道（左斜斬）
    'FX_SWING_BLUE_CROSS_1': {
        id: 'FX_SWING_BLUE_CROSS_1',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 34, arcDeg: 110, thickness: 7, ramp: 'LION_LIGHTNING' },
                count: 1,
                lifetime: 0.15,
                delay: 0,
                size: 34,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.1, fadeOut: 0.6, rotation: -0.8 },
            }),
        ],
    },

    // 雙劍十字斬第二道（右斜斬）
    'FX_SWING_BLUE_CROSS_2': {
        id: 'FX_SWING_BLUE_CROSS_2',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 34, arcDeg: 110, thickness: 7, ramp: 'LION_LIGHTNING' },
                count: 1,
                lifetime: 0.15,
                delay: 0,
                size: 34,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.1, fadeOut: 0.6, rotation: 0.8 },
            }),
        ],
    },

    // 鋼銀鈍擊／重擊：下壓放射＋地面微環（無震動）
    'FX_SWING_BLUE_SMASH': {
        id: 'FX_SWING_BLUE_SMASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'rays', radius: 32, count: 6, ramp: 'LION_PHYSICAL' },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.6, rotation: 0 },
            }),
            groundRing('LION_PHYSICAL', 22, 1.2, 0.18, { thickness: 4, delay: 0.02 }),
        ],
    },

    // 聖雷重擊：雷弧下壓＋六角地面微環
    'FX_SWING_BLUE_SMASH_LIGHTNING': {
        id: 'FX_SWING_BLUE_SMASH_LIGHTNING',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'bolt', length: 48, branches: 1, ramp: 'LION_LIGHTNING', seed: 3 },
                count: 1,
                lifetime: 0.15,
                delay: 0,
                size: 24,
                partAnim: { fadeOut: 0.5 },
            }),
            groundRing('LION_LIGHTNING', 22, 1.2, 0.18, { thickness: 4, delay: 0.02 }),
        ],
    },

    // 聖光重擊：日輪光芒下壓＋聖金地面微環
    'FX_SWING_BLUE_SMASH_HOLY': {
        id: 'FX_SWING_BLUE_SMASH_HOLY',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'rays', radius: 30, count: 6, ramp: 'LION_HOLY' },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 30,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.6 },
            }),
            groundRing('LION_HOLY', 22, 1.2, 0.18, { thickness: 4, delay: 0.02 }),
        ],
    },

    // 刺擊尖端閃光
    'FX_SWING_BLUE_PIERCE_TIP': {
        id: 'FX_SWING_BLUE_PIERCE_TIP',
        emitters: [
            flash('LION_PHYSICAL', 20, 0.12, 0.02),
        ],
    },

    // ================= 灰燼軍團（RED）揮擊 =================

    // 灰燼血月斬：緋紅劍弧（0.16 s）
    'FX_SWING_RED_SLASH': {
        id: 'FX_SWING_RED_SLASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 38, arcDeg: 125, thickness: 9, ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 38,
                partAnim: { scaleFrom: 0.75, scaleTo: 1.15, fadeOut: 0.6, rotation: -0.5 },
            }),
        ],
    },

    // 灰燼重劈／橫掃：崩裂鏽色大弧斬（0.18 s）
    'FX_SWING_RED_CLEAVE': {
        id: 'FX_SWING_RED_CLEAVE',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 46, arcDeg: 155, thickness: 13, ramp: 'ASH_PHYSICAL' },
                count: 1,
                lifetime: 0.18,
                delay: 0,
                size: 46,
                partAnim: { scaleFrom: 0.8, scaleTo: 1.2, fadeOut: 0.6, rotation: -0.6 },
            }),
        ],
    },

    // 灰燼雙刃十字斬第一道（左斜斬）
    'FX_SWING_RED_CROSS_1': {
        id: 'FX_SWING_RED_CROSS_1',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 36, arcDeg: 115, thickness: 8, ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.15,
                delay: 0,
                size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.1, fadeOut: 0.6, rotation: -0.8 },
            }),
        ],
    },

    // 灰燼雙刃十字斬第二道（右斜斬）
    'FX_SWING_RED_CROSS_2': {
        id: 'FX_SWING_RED_CROSS_2',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 36, arcDeg: 115, thickness: 8, ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.15,
                delay: 0,
                size: 36,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.1, fadeOut: 0.6, rotation: 0.8 },
            }),
        ],
    },

    // 灰燼重擊：崩裂放射＋鋸齒落點裂紋（無震動，0.20 s）
    'FX_SWING_RED_SMASH': {
        id: 'FX_SWING_RED_SMASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'rays', radius: 32, count: 6, ramp: 'ASH_PHYSICAL', lengthJitter: 0.4, seed: 4 },
                count: 1,
                lifetime: 0.16,
                delay: 0,
                size: 32,
                partAnim: { scaleFrom: 0.4, scaleTo: 1.1, fadeOut: 0.6, rotation: 0 },
            }),
            groundRing('ASH_PHYSICAL', 24, 1.2, 0.18, { thickness: 5, rough: 1, seed: 1, delay: 0.02 }),
        ],
    },

    // 灰燼刺擊尖端閃光（血色）
    'FX_SWING_RED_PIERCE_TIP': {
        id: 'FX_SWING_RED_PIERCE_TIP',
        emitters: [
            flash('ASH_BLOOD', 22, 0.12, 0.02),
        ],
    },
};
