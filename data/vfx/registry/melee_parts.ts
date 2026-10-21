// ╔══════════════════════════════════════════════════════════╗
// ║  data/vfx/registry/melee_parts.ts — 近戰揮擊與受擊特效零件庫 ║
// ║  職責：定義近戰普攻揮擊（刀弧、下劈重擊）與專屬受擊零件     ║
// ║  ART_SPEC §4～§6：獅心乾淨對稱，灰燼崩裂殘渣；時長 ≤ 0.2s ║
// ╚══════════════════════════════════════════════════════════╝

import { VFXAsset } from "../../../types/VFXSchema";
import { part } from "./ult_parts";
import { flash, groundRing, spray, debris } from "./basic_parts";

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

    // ================= 近戰主動技專屬命中特效（MF4） =================

    // tb_a5 稜鏡反射：反傷護盾／聖雷稜鏡（4 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_BLUE_PRISM_REFLECT': {
        id: 'FX_ACTIVE_BLUE_PRISM_REFLECT',
        emitters: [
            flash('LION_LIGHTNING', 48, 0.25),
            groundRing('LION_LIGHTNING', 52, 1.8, 0.45, { thickness: 8, delay: 0.04 }),
            part({
                particleType: 'PART',
                part: { kind: 'rays', radius: 48, count: 6, ramp: 'LION_LIGHTNING' },
                count: 1,
                lifetime: 0.3,
                delay: 0.04,
                size: 48,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.6 },
            }),
            spray('LION_LIGHTNING', [5, 6], [80, 180], [0.35, 0.55], 5, 0.05),
        ],
    },

    // wb_a5 斷罪一擊：鋼銀斷罪重斬（5 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_BLUE_JUDGMENT_SLASH': {
        id: 'FX_ACTIVE_BLUE_JUDGMENT_SLASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 56, arcDeg: 140, thickness: 14, ramp: 'LION_PHYSICAL' },
                count: 1,
                lifetime: 0.28,
                delay: 0,
                size: 56,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.25, fadeOut: 0.6, rotation: -0.5 },
            }),
            flash('LION_PHYSICAL', 44, 0.2, 0.02),
            groundRing('LION_PHYSICAL', 48, 1.7, 0.4, { thickness: 7, delay: 0.04 }),
            part({
                particleType: 'PART',
                part: { kind: 'rays', radius: 50, count: 8, ramp: 'LION_HOLY' },
                count: 1,
                lifetime: 0.32,
                delay: 0.04,
                size: 50,
                partAnim: { scaleFrom: 0.5, scaleTo: 1.2, fadeOut: 0.7, rotation: 0.4 },
            }),
            spray('LION_HOLY', [4, 6], [120, 240], [0.25, 0.42], 4, 0.05),
        ],
    },

    // tr_a4 鮮血護盾：鮮血凝盾（4 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_RED_BLOOD_BARRIER': {
        id: 'FX_ACTIVE_RED_BLOOD_BARRIER',
        emitters: [
            part({
                particleType: 'PART_GROUND',
                part: { kind: 'sigil', radius: 52, emblem: 'invTriangle', ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.55,
                delay: 0,
                size: 52,
                partAnim: { scaleFrom: 1.1, scaleTo: 1.0, fadeIn: 0.1, fadeOut: 0.5 },
            }),
            flash('ASH_BLOOD', 40, 0.25, 0.02),
            groundRing('ASH_BLOOD', 48, 1.6, 0.45, { rough: 1, seed: 4, thickness: 9, delay: 0.03 }),
            part({
                particleType: 'PART_DEBRIS',
                part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' },
                count: [5, 6],
                lifetime: [0.4, 0.6],
                delay: [0.02, 0.1],
                size: 6,
                shape: 'CIRCLE',
                shapeRadius: 28,
                speed: [10, 30],
                vz: [140, 260],
                gravity: 1200,
                partAnim: { fadeOut: 0.35 },
            }),
        ],
    },

    // wr_a1 旋風斬：狂暴旋風斬（5 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_RED_WHIRLWIND': {
        id: 'FX_ACTIVE_RED_WHIRLWIND',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 58, arcDeg: 180, thickness: 14, ramp: 'ASH_FIRE' },
                count: 1,
                lifetime: 0.32,
                delay: 0,
                size: 58,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.25, fadeOut: 0.6, rotation: -0.8 },
            }),
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 52, arcDeg: 160, thickness: 12, ramp: 'ASH_PHYSICAL' },
                count: 1,
                lifetime: 0.3,
                delay: 0.08,
                size: 52,
                partAnim: { scaleFrom: 0.7, scaleTo: 1.2, fadeOut: 0.6, rotation: 1.2 },
            }),
            flash('ASH_FIRE', 46, 0.22, 0.04),
            groundRing('ASH_PHYSICAL', 56, 1.8, 0.45, { rough: 1, seed: 5, thickness: 10, delay: 0.05 }),
            debris('rock', 'ASH_PHYSICAL', [4, 5], 8, [140, 280], [0.35, 0.5], 0.05),
        ],
    },

    // wr_a2 斷筋打擊：重擊定身（5 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_RED_HAMSTRING_STRIKE': {
        id: 'FX_ACTIVE_RED_HAMSTRING_STRIKE',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 48, arcDeg: 110, thickness: 12, ramp: 'ASH_PHYSICAL' },
                count: 1,
                lifetime: 0.25,
                delay: 0,
                size: 48,
                partAnim: { scaleFrom: 0.6, scaleTo: 1.2, fadeOut: 0.6, rotation: -0.3 },
            }),
            flash('ASH_BLOOD', 38, 0.2, 0.02),
            groundRing('ASH_PHYSICAL', 44, 1.5, 0.38, { rough: 1, seed: 2, thickness: 9, delay: 0.03 }),
            debris('bone', 'ASH_PHYSICAL', [4, 5], 8, [120, 240], [0.3, 0.45], 0.04),
            part({
                particleType: 'PART_DEBRIS',
                part: { kind: 'droplet', size: 6, ramp: 'ASH_BLOOD' },
                count: [3, 4],
                lifetime: [0.3, 0.45],
                delay: 0.03,
                size: 6,
                shape: 'BURST_DIR',
                speed: [80, 160],
                gravity: 1600,
                partAnim: { fadeOut: 0.3 },
            }),
        ],
    },

    // wr_a4 殘忍處決：嗜血處決（5 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_RED_EXECUTE_SLASH': {
        id: 'FX_ACTIVE_RED_EXECUTE_SLASH',
        emitters: [
            part({
                particleType: 'PART',
                part: { kind: 'slashArc', radius: 60, arcDeg: 145, thickness: 15, ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.32,
                delay: 0,
                size: 60,
                partAnim: { scaleFrom: 0.75, scaleTo: 1.3, fadeOut: 0.65, rotation: -0.6 },
            }),
            part({
                particleType: 'PART_GROUND',
                part: { kind: 'sigil', radius: 46, emblem: 'hornSkull', ramp: 'ASH_FIRE' },
                count: 1,
                lifetime: 0.45,
                delay: 0.02,
                size: 46,
                partAnim: { scaleFrom: 1.2, scaleTo: 1.0, fadeIn: 0.08, fadeOut: 0.5 },
            }),
            flash('ASH_FIRE', 48, 0.22, 0.02),
            groundRing('ASH_BLOOD', 48, 1.8, 0.45, { rough: 1, seed: 6, thickness: 10, delay: 0.04 }),
            part({
                particleType: 'PART_DEBRIS',
                part: { kind: 'droplet', size: 7, ramp: 'ASH_BLOOD' },
                count: [6, 8],
                lifetime: [0.35, 0.52],
                delay: 0.04,
                size: 7,
                shape: 'BURST_DIR',
                speed: [120, 260],
                gravity: 1600,
                partAnim: { fadeOut: 0.3 },
            }),
        ],
    },

    // sr_a3 治療圖騰：範圍回血（4 層，≤ 0.8 s，粒子數 ≤ 36）
    'FX_ACTIVE_RED_BLOOD_TOTEM': {
        id: 'FX_ACTIVE_RED_BLOOD_TOTEM',
        emitters: [
            part({
                particleType: 'PART_GROUND',
                part: { kind: 'sigil', radius: 56, emblem: 'invTriangle', ramp: 'ASH_BLOOD' },
                count: 1,
                lifetime: 0.7,
                delay: 0,
                size: 56,
                partAnim: { scaleFrom: 0.8, scaleTo: 1.1, fadeIn: 0.15, fadeOut: 0.5 },
            }),
            flash('ASH_BLOOD', 48, 0.28, 0.05),
            groundRing('ASH_BLOOD', 60, 1.8, 0.55, { rough: 1, seed: 1, thickness: 8, delay: 0.05 }),
            part({
                particleType: 'PART_DEBRIS',
                part: { kind: 'droplet', size: 5, ramp: 'ASH_BLOOD' },
                count: [6, 8],
                lifetime: [0.45, 0.65],
                delay: [0.05, 0.15],
                size: 5,
                shape: 'CIRCLE',
                shapeRadius: 36,
                speed: [0, 20],
                vz: [120, 220],
                drag: 0.02,
                partAnim: { fadeIn: 0.15, fadeOut: 0.5 },
            }),
        ],
    },
};
