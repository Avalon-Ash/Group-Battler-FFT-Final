// ╔══════════════════════════════════════════════════════════╗
// ║  tests/SkillDataIntegrity.test.ts — 技能資料完整性測試 (SK0) ║
// ║  職責：依據 AGENT_PROMPT §1 D 驗證全部 150 個技能的規則完整性║
// ║  棘輪規則：以 SK0 當下實測 56 筆違規為基準，只准減少不准回漲 ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import type { Skill } from '../types';

export interface SkillWithCcSelf extends Skill {
    ccSelf?: boolean;
    ccSelf2?: boolean;
}

const DUR_CC = new Set([
    'STUN', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND',
    'BANISH', 'POLYMORPH', 'INVINCIBLE', 'VULNERABLE',
    'DOT', 'HOT', 'HASTE', 'REFLECT', 'LIFESTEAL'
]);

const FORCE_CC = new Set([
    'SHIELD', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'HASTE', 'REFLECT', 'LIFESTEAL'
]);

const BUFF_CC = new Set([
    'SHIELD', 'HOT', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'
]);

const DEBUFF_CC = new Set([
    'STUN', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND',
    'BANISH', 'POLYMORPH', 'VULNERABLE', 'DOT', 'KNOCKBACK', 'PULL'
]);

const KEYWORD_MAP: readonly { kw: string; effects: readonly string[] }[] = [
    { kw: '暈', effects: ['STUN'] },
    { kw: '沉默', effects: ['SILENCE'] },
    { kw: '禁錮', effects: ['ROOT'] },
    { kw: '恐懼', effects: ['FEAR'] },
    { kw: '嘲諷', effects: ['TAUNT'] },
    { kw: '致盲', effects: ['BLIND'] },
    { kw: '放逐', effects: ['BANISH'] },
    { kw: '變羊', effects: ['POLYMORPH'] },
    { kw: '無敵', effects: ['INVINCIBLE'] },
    { kw: '易傷', effects: ['VULNERABLE'] },
    { kw: '擊退', effects: ['KNOCKBACK'] },
    { kw: '牽引', effects: ['PULL'] },
    { kw: '護盾', effects: ['SHIELD'] },
    { kw: '吸血', effects: ['VAMP', 'LIFESTEAL'] },
    { kw: '加速', effects: ['HASTE'] },
    { kw: '攻速', effects: ['HASTE'] },
    { kw: '反傷', effects: ['REFLECT'] },
    { kw: '突進', effects: ['DASH'] },
    { kw: '斬殺', effects: ['EXECUTE'] },
];

export interface IntegrityViolation {
    id: string;
    rule: string;
    sig: string;
    msg: string;
}

export function collectSkillIntegrityViolations(skills: readonly Skill[] = DEFAULT_SKILL_DB): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];

    for (const raw of skills) {
        const s = raw as SkillWithCcSelf;

        const ccSlots = [
            { type: s.ccType, dur: s.ccDur, force: s.ccForce, self: s.ccSelf, slot: 'cc' },
            { type: s.ccType2, dur: s.ccDur2, force: s.ccForce2, self: s.ccSelf2, slot: 'cc2' },
        ];

        for (const c of ccSlots) {
            if (!c.type || (c.type as string) === 'NONE') continue;

            if (DUR_CC.has(c.type) && !(c.dur !== undefined && c.dur > 0)) {
                violations.push({
                    id: s.id,
                    rule: 'CC_NO_DURATION',
                    sig: `${s.id}:CC_NO_DURATION:${c.slot}:${c.type}`,
                    msg: `${s.id} (${c.slot}): ${c.type} requires ccDur > 0`,
                });
            }

            if (FORCE_CC.has(c.type) && !(c.force !== undefined && c.force > 0)) {
                violations.push({
                    id: s.id,
                    rule: 'CC_NO_FORCE',
                    sig: `${s.id}:CC_NO_FORCE:${c.slot}:${c.type}`,
                    msg: `${s.id} (${c.slot}): ${c.type} requires ccForce > 0`,
                });
            }

            if (['HASTE', 'REFLECT', 'LIFESTEAL'].includes(c.type) && c.force !== undefined && c.force > 100) {
                violations.push({
                    id: s.id,
                    rule: 'CC_FORCE_LIMIT_EXCEEDED',
                    sig: `${s.id}:CC_FORCE_LIMIT_EXCEEDED:${c.slot}:${c.type}`,
                    msg: `${s.id} (${c.slot}): ${c.type} force ${c.force} > 100`,
                });
            }

            if (s.power > 0 && BUFF_CC.has(c.type) && !c.self) {
                violations.push({
                    id: s.id,
                    rule: 'DAMAGE_BUFF_NOT_SELF',
                    sig: `${s.id}:DAMAGE_BUFF_NOT_SELF:${c.slot}:${c.type}`,
                    msg: `${s.id} (${c.slot}): ${c.type} on damage skill (power ${s.power}) must have ccSelf=true`,
                });
            }

            if (s.power < 0 && DEBUFF_CC.has(c.type)) {
                violations.push({
                    id: s.id,
                    rule: 'HEAL_HAS_DEBUFF',
                    sig: `${s.id}:HEAL_HAS_DEBUFF:${c.slot}:${c.type}`,
                    msg: `${s.id} (${c.slot}): ${c.type} debuff on heal skill (power ${s.power})`,
                });
            }
        }

        if (s.effectType === 'VAMP' && !(s.power > 0)) {
            violations.push({
                id: s.id,
                rule: 'VAMP_NO_POWER',
                sig: `${s.id}:VAMP_NO_POWER:fx1`,
                msg: `${s.id}: VAMP on effectType requires power > 0, got ${s.power}`,
            });
        }
        if (s.effectType2 === 'VAMP' && !(s.power > 0)) {
            violations.push({
                id: s.id,
                rule: 'VAMP_NO_POWER',
                sig: `${s.id}:VAMP_NO_POWER:fx2`,
                msg: `${s.id}: VAMP on effectType2 requires power > 0, got ${s.power}`,
            });
        }

        if (s.type === 'AOE' && !(s.aoeRadius !== undefined && s.aoeRadius > 0)) {
            violations.push({
                id: s.id,
                rule: 'AOE_NO_RADIUS',
                sig: `${s.id}:AOE_NO_RADIUS`,
                msg: `${s.id}: AOE skill requires aoeRadius > 0`,
            });
        }

        if (!s.element) {
            violations.push({
                id: s.id,
                rule: 'NO_ELEMENT',
                sig: `${s.id}:NO_ELEMENT`,
                msg: `${s.id}: missing element`,
            });
        }

        if (!s.desc || s.desc.trim().length === 0) {
            violations.push({
                id: s.id,
                rule: 'NO_DESC',
                sig: `${s.id}:NO_DESC`,
                msg: `${s.id}: missing desc`,
            });
        }

        const desc = s.desc ?? '';
        const rawEffects: (string | undefined)[] = [s.ccType, s.ccType2, s.effectType, s.effectType2];
        const activeEffects = new Set<string>(
            rawEffects.filter((x): x is string => Boolean(x) && x !== 'NONE')
        );
        for (const { kw, effects } of KEYWORD_MAP) {
            if (desc.includes(kw)) {
                const matched = effects.some((e) => activeEffects.has(e));
                if (!matched) {
                    violations.push({
                        id: s.id,
                        rule: 'DESC_KEYWORD_MISMATCH',
                        sig: `${s.id}:DESC_KEYWORD_MISMATCH:${kw}`,
                        msg: `${s.id}: desc mentions '${kw}' but has none of [${effects.join(', ')}]`,
                    });
                }
            }
        }
    }

    return violations;
}

/** SK0 當下實測基準：共 56 筆違規，後續任務只准減少不准新增。 */
export const SK0_BASELINE_VIOLATIONS: readonly string[] = [
    'wb_b5:DAMAGE_BUFF_NOT_SELF:cc:SHIELD',
    'tb_a1:DAMAGE_BUFF_NOT_SELF:cc:SHIELD',
    'tb_a5:DESC_KEYWORD_MISMATCH:反傷',
    'sb_a5:DESC_KEYWORD_MISMATCH:加速',
    'tb_u1:NO_ELEMENT',
    'tb_u2:NO_ELEMENT',
    'tb_u3:NO_ELEMENT',
    'tb_u4:NO_ELEMENT',
    'tb_u5:NO_ELEMENT',
    'wb_u1:NO_ELEMENT',
    'wb_u2:NO_ELEMENT',
    'wb_u3:NO_ELEMENT',
    'wb_u4:NO_ELEMENT',
    'wb_u5:NO_ELEMENT',
    'rb_u2:NO_ELEMENT',
    'rb_u3:NO_ELEMENT',
    'rb_u4:NO_ELEMENT',
    'rb_u5:NO_ELEMENT',
    'mb_u3:NO_ELEMENT',
    'mb_u4:NO_ELEMENT',
    'mb_u5:NO_ELEMENT',
    'sb_u1:HEAL_HAS_DEBUFF:cc:BANISH',
    'sb_u1:NO_ELEMENT',
    'sb_u1:DESC_KEYWORD_MISMATCH:無敵',
    'sb_u2:NO_ELEMENT',
    'sb_u3:NO_ELEMENT',
    'sb_u4:NO_ELEMENT',
    'sb_u5:NO_ELEMENT',
    'tr_b3:DAMAGE_BUFF_NOT_SELF:cc:SHIELD',
    'tr_b3:DESC_KEYWORD_MISMATCH:反傷',
    'tr_a2:DAMAGE_BUFF_NOT_SELF:cc2:SHIELD',
    'wr_a5:VAMP_NO_POWER:fx1',
    'wr_a5:DESC_KEYWORD_MISMATCH:攻速',
    'tr_u1:NO_ELEMENT',
    'tr_u2:NO_ELEMENT',
    'tr_u3:NO_ELEMENT',
    'tr_u4:NO_ELEMENT',
    'tr_u5:NO_ELEMENT',
    'wr_u1:NO_ELEMENT',
    'wr_u2:NO_ELEMENT',
    'wr_u3:NO_ELEMENT',
    'wr_u3:DESC_KEYWORD_MISMATCH:吸血',
    'wr_u3:DESC_KEYWORD_MISMATCH:攻速',
    'wr_u4:NO_ELEMENT',
    'wr_u5:NO_ELEMENT',
    'rr_u1:NO_ELEMENT',
    'rr_u2:NO_ELEMENT',
    'rr_u4:NO_ELEMENT',
    'rr_u5:NO_ELEMENT',
    'mr_u2:NO_ELEMENT',
    'mr_u4:NO_ELEMENT',
    'sr_u1:NO_ELEMENT',
    'sr_u2:NO_ELEMENT',
    'sr_u4:NO_ELEMENT',
    'sr_u4:DESC_KEYWORD_MISMATCH:吸血',
    'sr_u5:NO_ELEMENT',
];

describe('SkillDataIntegrity (SK3)', () => {
    it('skills count is exactly 150', () => {
        expect(DEFAULT_SKILL_DB.length).toBe(150);
    });

    it('violations ratchet: zero violations permitted across all skills (SK3)', () => {
        const violations = collectSkillIntegrityViolations();
        expect(violations).toEqual([]);
        expect(violations.length).toBe(0);
    });
});
