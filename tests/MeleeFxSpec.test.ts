// ╔══════════════════════════════════════════════════════════╗
// ║  tests/MeleeFxSpec.test.ts — 近戰攻擊與受擊特效規格測試 (MF1)║
// ║  職責：依 docs/MELEE_FX_AGENT_PROMPT.md 驗證近戰 M1～M4 規格 ║
// ║  棘輪規則：以 tests/melee-fx.baseline.json 為基準，只准減   ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';

export const MELEE_BASIC_IDS = [
    'tb_b1', 'tb_b2', 'tb_b3', 'tb_b4', 'tb_b5',
    'wb_b1', 'wb_b3', 'wb_b4', 'wb_b5',
    'tr_b1', 'tr_b2', 'tr_b3', 'tr_b4', 'tr_b5',
    'wr_b1', 'wr_b3', 'wr_b4', 'wr_b5',
] as const;

export const MELEE_ACTIVE_IDS = [
    'tb_a5', 'wb_a5', 'tr_a4', 'wr_a1', 'wr_a2', 'wr_a4', 'sr_a3',
] as const;

export type MeleeRuleCode = 'M1' | 'M2' | 'M3' | 'M4';
export const ALL_MELEE_RULES: readonly MeleeRuleCode[] = ['M1', 'M2', 'M3', 'M4'];

const maxOf = (v: number | [number, number] | undefined, d = 0): number =>
    v === undefined ? d : typeof v === 'number' ? v : v[1];

export function evaluateMeleeBasic(id: string): { pass: Record<'M1' | 'M2', boolean>; violations: ('M1' | 'M2')[] } {
    const skill = DEFAULT_SKILL_DB.find((s) => s.id === id);
    if (!skill) throw new Error(`Skill ${id} not found`);
    const sequence = SKILL_SEQUENCES[id];
    const actions = sequence?.actions ?? [];

    // M1: 每招近戰普攻的序列至少有 1 個揮擊動作（PARTICLE 或 BEAM），且不含 SHAKE、GRID_PULSE
    const hasSwing = actions.some((a) => a.type === 'PARTICLE' || a.type === 'BEAM');
    const hasForbidden = actions.some((a) => a.type === 'SHAKE' || a.type === 'GRID_PULSE');
    const m1Pass = hasSwing && !hasForbidden;

    // M2: 普攻的揮擊＋命中包，每個登記特效的發射器最晚結束 ≤ 0.35 s，粒子數上限總和 ≤ 14
    const registeredEffectIds = new Set<string>();
    if (skill.visualHitEffect) registeredEffectIds.add(skill.visualHitEffect);
    for (const a of actions) {
        if (a.type === 'PARTICLE' && a.id) {
            registeredEffectIds.add(a.id);
        }
    }

    let m2Pass = true;
    let skillTotalParticles = 0;
    for (const effectId of registeredEffectIds) {
        const asset = VFX_REGISTRY[effectId];
        if (!asset) {
            m2Pass = false;
            break;
        }
        let effectParticles = 0;
        for (const em of asset.emitters) {
            const end = maxOf(em.delay, 0) + maxOf(em.lifetime, 0);
            if (end > 0.35 + 1e-4) {
                m2Pass = false;
            }
            effectParticles += maxOf(em.count, 1);
        }
        if (effectParticles > 14) {
            m2Pass = false;
        }
        skillTotalParticles += effectParticles;
    }
    // Also verify any BEAM duration in sequence does not exceed 0.35s
    for (const a of actions) {
        if (a.type === 'BEAM') {
            const end = (a.delay ?? 0) + (a.duration ?? 0);
            if (end > 0.35 + 1e-4) {
                m2Pass = false;
            }
        }
    }
    if (skillTotalParticles > 14) {
        m2Pass = false;
    }

    const pass = { M1: m1Pass, M2: m2Pass };
    const violations: ('M1' | 'M2')[] = [];
    if (!m1Pass) violations.push('M1');
    if (!m2Pass) violations.push('M2');
    return { pass, violations };
}

export function evaluateMeleeActive(id: string): { pass: Record<'M3' | 'M4', boolean>; violations: ('M3' | 'M4')[] } {
    const skill = DEFAULT_SKILL_DB.find((s) => s.id === id);
    if (!skill) throw new Error(`Skill ${id} not found`);
    const sequence = SKILL_SEQUENCES[id];
    const actions = sequence?.actions ?? [];

    const allBasicHitPacks = new Set(
        DEFAULT_SKILL_DB.filter((s) => s.tag === 'BASIC' && s.visualHitEffect).map((s) => s.visualHitEffect!)
    );

    // M3: 近戰主動技的 visualHitEffect 不得是任何普攻用到的命中包；發射器 2～6 個、最晚結束 ≤ 0.8 s、粒子數上限總和 ≤ 36
    const hitFxId = skill.visualHitEffect;
    let m3Pass = false;
    if (hitFxId && !allBasicHitPacks.has(hitFxId)) {
        const asset = VFX_REGISTRY[hitFxId];
        if (asset && asset.emitters.length >= 2 && asset.emitters.length <= 6) {
            let latestEnd = 0;
            let totalParticles = 0;
            for (const em of asset.emitters) {
                const end = maxOf(em.delay, 0) + maxOf(em.lifetime, 0);
                if (end > latestEnd) latestEnd = end;
                totalParticles += maxOf(em.count, 1);
            }
            if (latestEnd <= 0.8 + 1e-4 && totalParticles <= 36) {
                m3Pass = true;
            }
        }
    }

    // M4: 同一招主動技的序列 PARTICLE 不得與它的 visualHitEffect 是同一個 id
    const hasSameId = hitFxId ? actions.some((a) => a.type === 'PARTICLE' && a.id === hitFxId) : false;
    const m4Pass = !hasSameId;

    const pass = { M3: m3Pass, M4: m4Pass };
    const violations: ('M3' | 'M4')[] = [];
    if (!m3Pass) violations.push('M3');
    if (!m4Pass) violations.push('M4');
    return { pass, violations };
}

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'tests', 'melee-fx.baseline.json');

describe('MeleeFxSpec (MF1: Melee Combat VFX Rules M1~M4 Ratchet)', () => {
    it('evaluates all 18 melee basics and 7 melee actives against ratchet baseline', () => {
        expect(MELEE_BASIC_IDS).toHaveLength(18);
        expect(MELEE_ACTIVE_IDS).toHaveLength(7);

        const currentViolationsByRule: Record<MeleeRuleCode, string[]> = {
            M1: [],
            M2: [],
            M3: [],
            M4: [],
        };

        for (const id of MELEE_BASIC_IDS) {
            const res = evaluateMeleeBasic(id);
            for (const v of res.violations) {
                currentViolationsByRule[v].push(id);
            }
        }

        for (const id of MELEE_ACTIVE_IDS) {
            const res = evaluateMeleeActive(id);
            for (const v of res.violations) {
                currentViolationsByRule[v].push(id);
            }
        }

        for (const r of ALL_MELEE_RULES) {
            currentViolationsByRule[r].sort();
        }

        if (!fs.existsSync(BASELINE_PATH)) {
            expect.fail(`Baseline file missing at ${BASELINE_PATH}; run with UPDATE_BASELINE=1 to generate.`);
        }
        if (process.env.UPDATE_BASELINE === '1') {
            fs.writeFileSync(BASELINE_PATH, JSON.stringify(currentViolationsByRule, null, 2) + '\n', 'utf8');
        }

        const baseline: Record<MeleeRuleCode, string[]> = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

        for (const rule of ALL_MELEE_RULES) {
            const curr = currentViolationsByRule[rule] ?? [];
            const base = (baseline[rule] ?? []).slice().sort();

            const unexpected = curr.filter((id) => !base.includes(id));
            expect(unexpected, `Rule ${rule} has new/unexpected violations not in baseline`).toEqual([]);

            const fixed = base.filter((id) => !curr.includes(id));
            expect(fixed, `Rule ${rule} baseline entries were fixed and must be removed from baseline`).toEqual([]);
        }
    });
});
