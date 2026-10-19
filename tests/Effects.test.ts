import { describe, it, expect } from 'vitest';
import { EFFECT_KINDS, createEffectSlots, resetEffectSlots, isEffectActive, effectRemaining, applyEffect } from '../engine/core/Effects';
import { EFFECT_DEFS } from '../data/status/effect_defs';
import type { EffectKind } from '../types';
import { Agent } from '../engine/core/Agent';
import { Team } from '../engine/types/Enums';

// CCManager 現行的硬編碼分類清單，用於回歸比對
const CCMANAGER_BUFFS = ['HOT', 'INVINCIBLE']; // SHIELD 不是持續效果，不在 EFFECT_DEFS
const CCMANAGER_DEBUFFS = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT', 'DOT', 'BLIND', 'POLYMORPH', 'VULNERABLE']; // KNOCKBACK, PULL 為即時位移
const CCMANAGER_HARD_CC = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT'];

describe('Effects core and definitions (ECS-lite S1 - SE1)', () => {
    it('EFFECT_KINDS contains exactly 13 effect kinds', () => {
        expect(EFFECT_KINDS.length).toBe(13);
        const unique = new Set(EFFECT_KINDS);
        expect(unique.size).toBe(13);
    });

    it('every kind has a slot in createEffectSlots() initialized to zero/null', () => {
        const slots = createEffectSlots();
        for (const kind of EFFECT_KINDS) {
            expect(slots[kind]).toBeDefined();
            expect(slots[kind].remaining).toBe(0);
            expect(slots[kind].max).toBe(0);
            expect(slots[kind].value).toBe(0);
            expect(slots[kind].tag).toBeNull();
            expect(slots[kind].sourceId).toBeNull();
        }
    });

    it('every kind has a corresponding definition in EFFECT_DEFS', () => {
        for (const kind of EFFECT_KINDS) {
            expect(EFFECT_DEFS[kind], `Missing definition for ${kind}`).toBeDefined();
            expect(['BUFF', 'DEBUFF']).toContain(EFFECT_DEFS[kind].polarity);
            expect(typeof EFFECT_DEFS[kind].hardCC).toBe('boolean');
            expect(Array.isArray(EFFECT_DEFS[kind].clearsOnApply)).toBe(true);
        }
    });

    it('polarity in EFFECT_DEFS strictly matches CCManager baseline arrays', () => {
        for (const buff of CCMANAGER_BUFFS) {
            expect(EFFECT_DEFS[buff as EffectKind].polarity).toBe('BUFF');
        }
        for (const debuff of CCMANAGER_DEBUFFS) {
            expect(EFFECT_DEFS[debuff as EffectKind].polarity).toBe('DEBUFF');
        }
    });

    it('hardCC in EFFECT_DEFS strictly matches CCManager isHardCC array', () => {
        for (const kind of EFFECT_KINDS) {
            const expectedHard = CCMANAGER_HARD_CC.includes(kind);
            expect(EFFECT_DEFS[kind].hardCC, `${kind} hardCC flag mismatch`).toBe(expectedHard);
        }
    });

    it('clearsOnApply in EFFECT_DEFS matches CCManager exclusion table (BANISH clears ROOT & FEAR)', () => {
        expect(EFFECT_DEFS.BANISH.clearsOnApply).toEqual(['ROOT', 'FEAR']);
        for (const kind of EFFECT_KINDS) {
            if (kind !== 'BANISH') {
                expect(EFFECT_DEFS[kind].clearsOnApply).toEqual([]);
            }
        }
    });

    it('resetEffectSlots resets all modified slots back to default zeroes and nulls', () => {
        const slots = createEffectSlots();
        // Modify all slots
        for (const kind of EFFECT_KINDS) {
            slots[kind].remaining = 5.0;
            slots[kind].max = 5.0;
            slots[kind].value = 10;
            slots[kind].tag = 'POISON';
            slots[kind].sourceId = 'agent-1';
        }

        resetEffectSlots(slots);

        for (const kind of EFFECT_KINDS) {
            expect(slots[kind].remaining).toBe(0);
            expect(slots[kind].max).toBe(0);
            expect(slots[kind].value).toBe(0);
            expect(slots[kind].tag).toBeNull();
            expect(slots[kind].sourceId).toBeNull();
        }
    });

    it('Agent instance has effects initialized and reset() calls resetEffectSlots', () => {
        const dummyConfig = { w: 30, h: 30, offsetX: 400, offsetY: 300, layout: 'POINTY' as const };
        const agent = new Agent('test-1', Team.BLUE, 0, 0, dummyConfig);
        expect(agent.effects).toBeDefined();
        for (const kind of EFFECT_KINDS) {
            expect(agent.effects[kind].remaining).toBe(0);
        }

        agent.effects.STUN.remaining = 3.5;
        agent.effects.STUN.max = 3.5;
        expect(isEffectActive(agent, 'STUN')).toBe(true);
        expect(effectRemaining(agent, 'STUN')).toBe(3.5);

        agent.reset(dummyConfig);
        expect(agent.effects.STUN.remaining).toBe(0);
        expect(isEffectActive(agent, 'STUN')).toBe(false);
        expect(effectRemaining(agent, 'STUN')).toBe(0);
    });

    it('applyEffect helper sets duration, max, and options properly', () => {
        const slots = createEffectSlots();
        applyEffect(slots, 'DOT', 4.0, { value: 25, tag: 'BURN' });
        expect(slots.DOT.remaining).toBe(4.0);
        expect(slots.DOT.max).toBe(4.0);
        expect(slots.DOT.value).toBe(25);
        expect(slots.DOT.tag).toBe('BURN');

        // Smaller duration should not overwrite remaining
        applyEffect(slots, 'DOT', 2.0);
        expect(slots.DOT.remaining).toBe(4.0);
    });

    it('iterating EFFECT_KINDS applies, decrements, and expires every kind without modifying defs', () => {
        const dummyConfig = { w: 30, h: 30, offsetX: 400, offsetY: 300, layout: 'POINTY' as const };
        const agent = new Agent('test-loop', Team.BLUE, 0, 0, dummyConfig);

        for (const kind of EFFECT_KINDS) {
            // 1. Definition check: every kind in EFFECT_KINDS must have polarity & hardCC defined
            expect(EFFECT_DEFS[kind], `Missing definition for ${kind}`).toBeDefined();
            expect(['BUFF', 'DEBUFF']).toContain(EFFECT_DEFS[kind].polarity);

            // 2. Application
            applyEffect(agent.effects, kind, 2.0, { value: 15, tag: 'TAG', sourceId: 'src-1' });
            expect(isEffectActive(agent, kind)).toBe(true);
            expect(effectRemaining(agent, kind)).toBe(2.0);
            expect(agent.effects[kind].max).toBe(2.0);
            expect(agent.effects[kind].value).toBe(15);
            expect(agent.effects[kind].tag).toBe('TAG');
            expect(agent.effects[kind].sourceId).toBe('src-1');

            // 3. Decrement
            agent.effects[kind].remaining = Math.max(0, agent.effects[kind].remaining - 1.0);
            expect(effectRemaining(agent, kind)).toBe(1.0);
            expect(isEffectActive(agent, kind)).toBe(true);

            // 4. Expiration
            agent.effects[kind].remaining = Math.max(0, agent.effects[kind].remaining - 1.0);
            expect(effectRemaining(agent, kind)).toBe(0);
            expect(isEffectActive(agent, kind)).toBe(false);
        }
    });
});
