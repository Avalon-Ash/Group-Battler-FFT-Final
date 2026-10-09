import { describe, it, expect } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { applyDirectDamage } from '../engine/systems/combat/DirectDamage';
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
