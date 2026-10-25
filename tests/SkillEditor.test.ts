// ╔══════════════════════════════════════════════════════════════════╗
// ║  SkillEditor — 技能編輯器欄位驗證與 UICommandSystem 守門測試       ║
// ║  職責：檢查全部編輯欄位（SKILL_EDITABLE_FIELDS）的合法/非法值、     ║
// ║        負數規則、選填清除、enum/own-key 白名單、既有技能庫相容性與  ║
// ║        real UI_COMMAND 寫入與測試隔離原位還原                    ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    SKILL_EDITABLE_FIELDS,
    SkillEditableField,
    isSkillEditableField,
    validateSkillFieldValue,
    isSkillFieldOptional,
    SKILL_TAG_OPTIONS,
    SKILL_TYPE_OPTIONS,
    SKILL_VISUAL_OPTIONS,
    SKILL_ELEMENT_OPTIONS,
    SKILL_SPECIAL_VISUAL_STATUS_OPTIONS,
    SKILL_CC_TYPE_OPTIONS,
    SKILL_EFFECT_TYPE_OPTIONS,
} from '../data/ui/skillEditor';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { GameEngine } from '../engine/game';
import { Team, Skill } from '../types';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { PROJECTILE_VISUALS } from '../data/vfx/projectile_visuals';
import { SKILL_FIELD_GROUPS } from '../components/inspector/InspectorConstants';

interface SkillPropertySnapshot {
    ref: Record<string, unknown>;
    keys: string[];
    values: Map<string, unknown>;
}

function captureDbSnapshots(): SkillPropertySnapshot[] {
    return DEFAULT_SKILL_DB.map(s => {
        const ref = s as unknown as Record<string, unknown>;
        const keys = Object.keys(ref);
        const values = new Map<string, unknown>();
        for (const k of keys) {
            values.set(k, ref[k]);
        }
        return { ref, keys, values };
    });
}

function restoreDbSnapshots(snapshots: SkillPropertySnapshot[]): void {
    for (const snap of snapshots) {
        // Delete any keys added during tests
        const currentKeys = Object.keys(snap.ref);
        for (const k of currentKeys) {
            if (!snap.values.has(k)) {
                delete snap.ref[k];
            }
        }
        // In-place restore all original keys and values (including undefined values)
        for (const [k, v] of snap.values.entries()) {
            snap.ref[k] = v;
        }
    }
}

describe('SkillEditor Field Validation Rules', () => {
    it('covers all 31 editable fields', () => {
        expect(SKILL_EDITABLE_FIELDS.length).toBe(31);
        for (const f of SKILL_EDITABLE_FIELDS) {
            expect(isSkillEditableField(f)).toBe(true);
        }
        expect(isSkillEditableField('id')).toBe(false);
        expect(isSkillEditableField('role')).toBe(false);
        expect(isSkillEditableField('nonExistentField')).toBe(false);
    });

    describe('Non-negative required numeric fields (range, cast, cd, cost, gain)', () => {
        const requiredNonNegative = ['range', 'cast', 'cd', 'cost', 'gain'] as const;

        for (const field of requiredNonNegative) {
            it(`${field}: accepts non-negative finite numbers and decimals`, () => {
                expect(validateSkillFieldValue(field, 0)).toBe(true);
                expect(validateSkillFieldValue(field, 1)).toBe(true);
                expect(validateSkillFieldValue(field, 0.5)).toBe(true);
                expect(validateSkillFieldValue(field, 100.25)).toBe(true);
            });

            it(`${field}: rejects negative numbers`, () => {
                expect(validateSkillFieldValue(field, -0.1)).toBe(false);
                expect(validateSkillFieldValue(field, -1)).toBe(false);
                expect(validateSkillFieldValue(field, -100)).toBe(false);
            });

            it(`${field}: rejects undefined, null, NaN, Infinity, strings`, () => {
                expect(validateSkillFieldValue(field, undefined)).toBe(false);
                expect(validateSkillFieldValue(field, null)).toBe(false);
                expect(validateSkillFieldValue(field, NaN)).toBe(false);
                expect(validateSkillFieldValue(field, Infinity)).toBe(false);
                expect(validateSkillFieldValue(field, -Infinity)).toBe(false);
                expect(validateSkillFieldValue(field, '10')).toBe(false);
                expect(validateSkillFieldValue(field, true)).toBe(false);
            });
        }
    });

    describe('Non-negative optional numeric fields (aoeRadius, projectileSpeed, ccDur, ccDur2)', () => {
        const optionalNonNegative = ['aoeRadius', 'projectileSpeed', 'ccDur', 'ccDur2'] as const;

        for (const field of optionalNonNegative) {
            it(`${field}: accepts undefined and non-negative finite numbers including 0`, () => {
                expect(validateSkillFieldValue(field, undefined)).toBe(true);
                expect(validateSkillFieldValue(field, 0)).toBe(true);
                expect(validateSkillFieldValue(field, 100)).toBe(true);
                expect(validateSkillFieldValue(field, 1.5)).toBe(true);
            });

            it(`${field}: rejects negative numbers`, () => {
                expect(validateSkillFieldValue(field, -1)).toBe(false);
                expect(validateSkillFieldValue(field, -0.01)).toBe(false);
            });

            it(`${field}: rejects null, NaN, strings, booleans`, () => {
                expect(validateSkillFieldValue(field, null)).toBe(false);
                expect(validateSkillFieldValue(field, NaN)).toBe(false);
                expect(validateSkillFieldValue(field, Infinity)).toBe(false);
                expect(validateSkillFieldValue(field, '0')).toBe(false);
                expect(validateSkillFieldValue(field, false)).toBe(false);
            });
        }
    });

    describe('Signed numeric fields (power, ccForce, ccForce2, effectVal, effectVal2)', () => {
        it('power: is required, accepts negative numbers for valid heals, zero, and positive', () => {
            expect(validateSkillFieldValue('power', -90)).toBe(true);
            expect(validateSkillFieldValue('power', -1100)).toBe(true);
            expect(validateSkillFieldValue('power', 0)).toBe(true);
            expect(validateSkillFieldValue('power', 250)).toBe(true);

            expect(validateSkillFieldValue('power', undefined)).toBe(false);
            expect(validateSkillFieldValue('power', null)).toBe(false);
            expect(validateSkillFieldValue('power', NaN)).toBe(false);
            expect(validateSkillFieldValue('power', Infinity)).toBe(false);
            expect(validateSkillFieldValue('power', '-90')).toBe(false);
        });

        const optionalSigned = ['ccForce', 'ccForce2', 'effectVal', 'effectVal2'] as const;
        for (const field of optionalSigned) {
            it(`${field}: is optional, accepts undefined, negative, zero, and positive numbers`, () => {
                expect(validateSkillFieldValue(field, undefined)).toBe(true);
                expect(validateSkillFieldValue(field, -50)).toBe(true);
                expect(validateSkillFieldValue(field, 0)).toBe(true);
                expect(validateSkillFieldValue(field, 50)).toBe(true);

                expect(validateSkillFieldValue(field, null)).toBe(false);
                expect(validateSkillFieldValue(field, NaN)).toBe(false);
                expect(validateSkillFieldValue(field, '50')).toBe(false);
            });
        }
    });

    describe('Boolean fields (ccSelf, ccSelf2)', () => {
        const boolFields = ['ccSelf', 'ccSelf2'] as const;
        for (const field of boolFields) {
            it(`${field}: accepts undefined, true, and false; rejects strings 'false'/'true' and numbers 0/1`, () => {
                expect(validateSkillFieldValue(field, undefined)).toBe(true);
                expect(validateSkillFieldValue(field, true)).toBe(true);
                expect(validateSkillFieldValue(field, false)).toBe(true);

                expect(validateSkillFieldValue(field, 'false')).toBe(false);
                expect(validateSkillFieldValue(field, 'true')).toBe(false);
                expect(validateSkillFieldValue(field, 0)).toBe(false);
                expect(validateSkillFieldValue(field, 1)).toBe(false);
                expect(validateSkillFieldValue(field, null)).toBe(false);
            });
        }
    });

    describe('String fields (name, color, desc)', () => {
        it('name and color: required strings', () => {
            expect(validateSkillFieldValue('name', '測試技能')).toBe(true);
            expect(validateSkillFieldValue('color', '#ff0000')).toBe(true);

            expect(validateSkillFieldValue('name', undefined)).toBe(false);
            expect(validateSkillFieldValue('color', undefined)).toBe(false);
            expect(validateSkillFieldValue('name', 123)).toBe(false);
            expect(validateSkillFieldValue('color', null)).toBe(false);
        });

        it('desc: optional string', () => {
            expect(validateSkillFieldValue('desc', undefined)).toBe(true);
            expect(validateSkillFieldValue('desc', '技能描述說明')).toBe(true);

            expect(validateSkillFieldValue('desc', null)).toBe(false);
            expect(validateSkillFieldValue('desc', 123)).toBe(false);
        });
    });

    describe('Enum fields and white-list validation', () => {
        it('tag: requires BASIC | ACTIVE | ULT', () => {
            for (const t of SKILL_TAG_OPTIONS) {
                expect(validateSkillFieldValue('tag', t)).toBe(true);
            }
            expect(validateSkillFieldValue('tag', 'PASSIVE')).toBe(false);
            expect(validateSkillFieldValue('tag', undefined)).toBe(false);
            expect(validateSkillFieldValue('tag', '')).toBe(false);
        });

        it('type: requires SINGLE | AOE', () => {
            for (const t of SKILL_TYPE_OPTIONS) {
                expect(validateSkillFieldValue('type', t)).toBe(true);
            }
            expect(validateSkillFieldValue('type', 'MULTI')).toBe(false);
            expect(validateSkillFieldValue('type', undefined)).toBe(false);
        });

        it('specialVisualStatus: accepts POLYMORPH, STASIS, FROZEN, INVINCIBLE, undefined; rejects DANGER, NONE', () => {
            expect(validateSkillFieldValue('specialVisualStatus', undefined)).toBe(true);
            for (const s of SKILL_SPECIAL_VISUAL_STATUS_OPTIONS) {
                expect(validateSkillFieldValue('specialVisualStatus', s)).toBe(true);
            }
            expect(validateSkillFieldValue('specialVisualStatus', 'DANGER')).toBe(false);
            expect(validateSkillFieldValue('specialVisualStatus', 'NONE')).toBe(false);
            expect(validateSkillFieldValue('specialVisualStatus', '')).toBe(false);
        });

        it('ccType and ccType2: accepts all 17 CC options and undefined; rejects GRAVITY, NONE', () => {
            for (const field of ['ccType', 'ccType2'] as const) {
                expect(validateSkillFieldValue(field, undefined)).toBe(true);
                for (const cc of SKILL_CC_TYPE_OPTIONS) {
                    expect(validateSkillFieldValue(field, cc)).toBe(true);
                }
                expect(validateSkillFieldValue(field, 'GRAVITY')).toBe(false);
                expect(validateSkillFieldValue(field, 'NONE')).toBe(false);
                expect(validateSkillFieldValue(field, 'STUNNED')).toBe(false);
            }
        });

        it('effectType and effectType2: accepts all 6 effect types and undefined; rejects unknown', () => {
            for (const field of ['effectType', 'effectType2'] as const) {
                expect(validateSkillFieldValue(field, undefined)).toBe(true);
                for (const ef of SKILL_EFFECT_TYPE_OPTIONS) {
                    expect(validateSkillFieldValue(field, ef)).toBe(true);
                }
                expect(validateSkillFieldValue(field, 'NONE')).toBe(false);
                expect(validateSkillFieldValue(field, 'BLEED')).toBe(false);
            }
        });

        it('element: accepts all 9 element options and undefined', () => {
            expect(validateSkillFieldValue('element', undefined)).toBe(true);
            for (const el of SKILL_ELEMENT_OPTIONS) {
                expect(validateSkillFieldValue('element', el)).toBe(true);
            }
            expect(validateSkillFieldValue('element', 'DARK')).toBe(false);
        });

        it('visual: accepts all 7 visual options and undefined', () => {
            expect(validateSkillFieldValue('visual', undefined)).toBe(true);
            for (const v of SKILL_VISUAL_OPTIONS) {
                expect(validateSkillFieldValue('visual', v)).toBe(true);
            }
            expect(validateSkillFieldValue('visual', 'UNKNOWN_VISUAL')).toBe(false);
        });

        it('team: accepts Team.BLUE (0), Team.RED (1) and undefined; rejects string names', () => {
            expect(validateSkillFieldValue('team', undefined)).toBe(true);
            expect(validateSkillFieldValue('team', Team.BLUE)).toBe(true);
            expect(validateSkillFieldValue('team', Team.RED)).toBe(true);

            expect(validateSkillFieldValue('team', 'BLUE')).toBe(false);
            expect(validateSkillFieldValue('team', 'RED')).toBe(false);
            expect(validateSkillFieldValue('team', 2)).toBe(false);
        });
    });

    describe('VFX Registry and Projectile Visuals Own-Key Validation', () => {
        it('visualHitEffect: accepts own keys of VFX_REGISTRY, undefined; rejects empty string, inherited keys, unknown keys', () => {
            expect(validateSkillFieldValue('visualHitEffect', undefined)).toBe(true);
            const firstKey = Object.keys(VFX_REGISTRY)[0];
            expect(validateSkillFieldValue('visualHitEffect', firstKey)).toBe(true);

            expect(validateSkillFieldValue('visualHitEffect', '')).toBe(false);
            expect(validateSkillFieldValue('visualHitEffect', 'toString')).toBe(false);
            expect(validateSkillFieldValue('visualHitEffect', 'valueOf')).toBe(false);
            expect(validateSkillFieldValue('visualHitEffect', 'constructor')).toBe(false);
            expect(validateSkillFieldValue('visualHitEffect', 'NON_EXISTENT_EFFECT')).toBe(false);
            expect(validateSkillFieldValue('visualHitEffect', 123)).toBe(false);
        });

        it('visualProjectileEffect: accepts own keys of PROJECTILE_VISUALS, undefined; rejects empty string, inherited keys, unknown keys', () => {
            expect(validateSkillFieldValue('visualProjectileEffect', undefined)).toBe(true);
            const firstKey = Object.keys(PROJECTILE_VISUALS)[0];
            expect(validateSkillFieldValue('visualProjectileEffect', firstKey)).toBe(true);

            expect(validateSkillFieldValue('visualProjectileEffect', '')).toBe(false);
            expect(validateSkillFieldValue('visualProjectileEffect', 'toString')).toBe(false);
            expect(validateSkillFieldValue('visualProjectileEffect', 'constructor')).toBe(false);
            expect(validateSkillFieldValue('visualProjectileEffect', 'NON_EXISTENT_PROJECTILE')).toBe(false);
        });
    });

    describe('Existing Skill Database Compatibility', () => {
        it('all skills in DEFAULT_SKILL_DB pass validation on all editable fields (including required field presence)', () => {
            const failures: { skillId: string; field: string; value: unknown }[] = [];

            for (const skill of DEFAULT_SKILL_DB) {
                const record = skill as unknown as Record<string, unknown>;
                for (const field of SKILL_EDITABLE_FIELDS) {
                    const val = record[field];
                    const ok = validateSkillFieldValue(field, val);
                    if (!ok) {
                        failures.push({ skillId: skill.id, field, value: val });
                    }
                }
            }

            expect(failures).toEqual([]);
        });
    });

    describe('Inspector Form Alignment', () => {
        it('all fields in SKILL_FIELD_GROUPS are editable fields', () => {
            for (const group of SKILL_FIELD_GROUPS) {
                for (const fieldDef of group.fields) {
                    expect(isSkillEditableField(fieldDef.key as string)).toBe(true);
                }
            }
        });

        it('select options only offer values the data layer accepts', () => {
            const fields = SKILL_FIELD_GROUPS.flatMap((g) => g.fields);
            const hit = fields.find((f) => f.key === 'visualHitEffect')!;
            const proj = fields.find((f) => f.key === 'visualProjectileEffect')!;
            for (const v of hit.simpleOptions!) if (v !== 'NONE') expect(VFX_REGISTRY[v]).toBeDefined();
            for (const v of proj.simpleOptions!) if (v !== 'NONE') expect(PROJECTILE_VISUALS[v]).toBeDefined();
            expect(fields.find((f) => f.key === 'visual')!.simpleOptions!.some((v) => v.startsWith('HEX_'))).toBe(false);
        });

        it('all select options in SKILL_FIELD_GROUPS convert via real form transforms to valid values', () => {
            for (const group of SKILL_FIELD_GROUPS) {
                for (const field of group.fields) {
                    if (field.type !== 'select') continue;
                    const rawOptions: string[] = [];
                    if (field.options) {
                        rawOptions.push(...field.options.map(o => o.value));
                    }
                    if (field.simpleOptions) {
                        rawOptions.push(...field.simpleOptions);
                    }

                    for (const rawVal of rawOptions) {
                        let convertedVal: unknown;
                        if (field.key === 'ccSelf' || field.key === 'ccSelf2') {
                            convertedVal = rawVal === 'true';
                        } else if (field.key === 'team') {
                            convertedVal = rawVal === 'BLUE' ? Team.BLUE : rawVal === 'RED' ? Team.RED : undefined;
                        } else if (rawVal === 'NONE' || rawVal === 'ANY' || rawVal === '') {
                            convertedVal = undefined;
                        } else {
                            convertedVal = rawVal;
                        }

                        const ok = validateSkillFieldValue(field.key as SkillEditableField, convertedVal);
                        expect(ok).toBe(true);
                    }
                }
            }
        });
    });
});

describe('GameEngine UPDATE_SKILL Mutation Gate via UI_COMMAND', () => {
    let engine: GameEngine;
    let dbSnapshots: SkillPropertySnapshot[];

    beforeEach(() => {
        dbSnapshots = captureDbSnapshots();
        engine = new GameEngine();
        const skill = engine.skillDB.find(s => s.id === 'mb_u1');
        if (!skill) throw new Error('Skill mb_u1 not found in test engine');
    });

    afterEach(() => {
        try {
            if (dbSnapshots && dbSnapshots.length > 0) {
                restoreDbSnapshots(dbSnapshots);
            }
        } finally {
            if (engine) {
                engine.destroy();
            }
        }
    });

    it('maintains strict isolation: DEFAULT_SKILL_DB object identities and fields remain identical across mutations and restores', () => {
        const mbU1 = DEFAULT_SKILL_DB.find(s => s.id === 'mb_u1')!;
        const origKeys = Object.keys(mbU1).sort();
        const origRange = mbU1.range;
        const origPower = mbU1.power;

        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'range',
            value: 99,
        });
        (mbU1 as unknown as Record<string, unknown>).tempFieldForTest = 'polluted';

        expect(mbU1.range).toBe(99);
        expect((mbU1 as unknown as Record<string, unknown>).tempFieldForTest).toBe('polluted');

        restoreDbSnapshots(dbSnapshots);

        expect(DEFAULT_SKILL_DB.find(s => s.id === 'mb_u1')).toBe(mbU1);
        expect(mbU1.range).toBe(origRange);
        expect(mbU1.power).toBe(origPower);
        expect((mbU1 as unknown as Record<string, unknown>).tempFieldForTest).toBeUndefined();
        expect(Object.keys(mbU1).sort()).toEqual(origKeys);
    });

    it('accepts valid update and updates engine.skillDB in place', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'range',
            value: 9,
        });
        expect(skill.range).toBe(9);
    });

    it('accepts valid negative heal power', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'power',
            value: -200,
        });
        expect(skill.power).toBe(-200);
    });

    it('rejects negative cast and leaves skill unchanged', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        const origCast = skill.cast;
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'cast',
            value: -2,
        });
        expect(skill.cast).toBe(origCast);
    });

    it('rejects string on numeric field', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        const origRange = skill.range;
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'range',
            value: '5',
        });
        expect(skill.range).toBe(origRange);
    });

    it('rejects invalid enum values (GRAVITY, DANGER)', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        const origCc = skill.ccType;
        const origVisual = skill.specialVisualStatus;

        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'ccType',
            value: 'GRAVITY',
        });
        expect(skill.ccType).toBe(origCc);

        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'specialVisualStatus',
            value: 'DANGER',
        });
        expect(skill.specialVisualStatus).toBe(origVisual);
    });

    it('rejects string ccSelf', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        const origSelf = skill.ccSelf;
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'ccSelf',
            value: 'false',
        });
        expect(skill.ccSelf).toBe(origSelf);
    });

    it('rejects undefined on required fields but accepts on optional fields', () => {
        const skill = engine.skillDB.find(s => s.id === 'mb_u1')!;
        const origRange = skill.range;

        // Required field
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'range',
            value: undefined,
        });
        expect(skill.range).toBe(origRange);

        // Optional field
        engine.bus.emit('UI_COMMAND', {
            type: 'UPDATE_SKILL',
            skillId: 'mb_u1',
            field: 'aoeRadius',
            value: undefined,
        });
        expect(skill.aoeRadius).toBeUndefined();
    });
});
