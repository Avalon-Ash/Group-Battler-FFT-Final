import { describe, it, expect } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { applyDirectDamage, applyHeal, applyLethal, absorbWithShield } from '../engine/systems/combat/DirectDamage';
import { DEFAULT_HEX_LAYOUT } from '../constants';
import { Team } from '../types';

const MAP = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
const make = () => { const a = new Agent('D', Team.BLUE, 0, 0, MAP); a.hp = a.maxHp = 100; return a; };

describe('applyDirectDamage', () => {
    it('plain damage reduces hp', () => {
        const a = make();
        expect(applyDirectDamage(a, 30)).toEqual({ absorbed: 0, dealt: 30 });
        expect(a.hp).toBe(70);
    });
    it('shield absorbs first, remainder hits hp', () => {
        const a = make(); a.shield = 20;
        expect(applyDirectDamage(a, 50)).toEqual({ absorbed: 20, dealt: 30 });
        expect(a.shield).toBe(0);
        expect(a.hp).toBe(70);
    });
    it('shield fully absorbing leaves hp untouched', () => {
        const a = make(); a.shield = 80;
        expect(applyDirectDamage(a, 50)).toEqual({ absorbed: 50, dealt: 0 });
        expect(a.shield).toBe(30);
        expect(a.hp).toBe(100);
    });
    it('bypassShield (true damage) ignores shield', () => {
        const a = make(); a.shield = 80;
        expect(applyDirectDamage(a, 40, true)).toEqual({ absorbed: 0, dealt: 40 });
        expect(a.shield).toBe(80);
        expect(a.hp).toBe(60);
    });
    it('hp never drops below 0', () => {
        const a = make();
        applyDirectDamage(a, 999);
        expect(a.hp).toBe(0);
    });
});

describe('applyDirectDamage attribution', () => {
    it('sets lastHitSourceId when a source is given', () => {
        const a = make();
        applyDirectDamage(a, 10, false, 'X');
        expect(a.lastHitSourceId).toBe('X');
    });
    it('keeps the previous attribution when no source is given (environment / self damage)', () => {
        const a = make(); a.lastHitSourceId = 'Y';
        applyDirectDamage(a, 10);
        expect(a.lastHitSourceId).toBe('Y');
    });
    it('does not attribute when the shield absorbed everything', () => {
        const a = make(); a.shield = 80;
        applyDirectDamage(a, 50, false, 'X');
        expect(a.lastHitSourceId).toBeNull();
    });
});

describe('applyHeal', () => {
    it('heals and reports the actual amount', () => {
        const a = make(); a.hp = 50;
        expect(applyHeal(a, 30)).toBe(30);
        expect(a.hp).toBe(80);
    });
    it('clamps at maxHp', () => {
        const a = make(); a.hp = 90;
        expect(applyHeal(a, 30)).toBe(10);
        expect(a.hp).toBe(100);
    });
});

describe('applyLethal', () => {
    it('zeroes hp and attributes the kill', () => {
        const a = make();
        applyLethal(a, 'X');
        expect(a.hp).toBe(0);
        expect(a.lastHitSourceId).toBe('X');
    });
    it('without a source keeps the previous attribution', () => {
        const a = make(); a.lastHitSourceId = 'Y';
        applyLethal(a);
        expect(a.hp).toBe(0);
        expect(a.lastHitSourceId).toBe('Y');
    });
});

describe('absorbWithShield', () => {
    it('absorbs up to the shield and returns the amount', () => {
        const a = make(); a.shield = 20;
        expect(absorbWithShield(a, 50)).toBe(20);
        expect(a.shield).toBe(0);
        expect(a.hp).toBe(100);
    });
    it('leaves the remainder of a larger shield', () => {
        const a = make(); a.shield = 80;
        expect(absorbWithShield(a, 50)).toBe(50);
        expect(a.shield).toBe(30);
    });
    it('does nothing without a shield or for non-positive amounts', () => {
        const a = make();
        expect(absorbWithShield(a, 50)).toBe(0);
        a.shield = 10;
        expect(absorbWithShield(a, 0)).toBe(0);
        expect(absorbWithShield(a, -5)).toBe(0);
        expect(a.shield).toBe(10);
    });
});
