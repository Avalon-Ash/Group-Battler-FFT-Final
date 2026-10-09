import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { DamageCalculator } from '../engine/systems/combat/DamageCalculator';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { DEFAULT_HEX_LAYOUT } from '../constants';
import { Role, Skill, Team } from '../types';
import type { MapConfig } from '../engine/utils';

const MAP: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };

function makeAgent(team: Team, role: Role = Role.WARRIOR): Agent {
    const a = new Agent(`T-${team}-${role}`, team, 0, 0, MAP);
    a.role = role;
    a.hp = a.maxHp = 1000;
    return a;
}

function makeSkill(overrides: Partial<Skill>): Skill {
    return { ...DEFAULT_SKILL_DB[0], ccType: undefined, ccType2: undefined, effectType: undefined, effectType2: undefined, ...overrides };
}

describe('DamageCalculator.calculate (deterministic paths)', () => {
    it('plain damage is negative and equals skill power', () => {
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED), makeSkill({ power: 100 }), 0, false);
        expect(r.finalValue).toBe(-100);
        expect(r.isCrit).toBe(false);
    });

    it('heal is positive', () => {
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.BLUE), makeSkill({ power: -80 }), 0, false);
        expect(r.finalValue).toBe(80);
    });

    it('pre-rolled crit multiplies damage by 1.5', () => {
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED), makeSkill({ power: 100 }), 0, true);
        expect(r.isCrit).toBe(true);
        expect(r.finalValue).toBe(-150);
    });

    it('preRollCrit=undefined falls back to Math.random (10% crit chance)', () => {
        const spy = vi.spyOn(Math, 'random');
        spy.mockReturnValue(0.05);
        const crit = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED), makeSkill({ power: 100 }));
        expect(crit.isCrit).toBe(true);
        expect(crit.finalValue).toBe(-150);
        spy.mockReturnValue(0.5);
        const normal = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED), makeSkill({ power: 100 }));
        expect(normal.isCrit).toBe(false);
        expect(normal.finalValue).toBe(-100);
        spy.mockRestore();
    });

    it('tank blocks 15% of damage', () => {
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED, Role.TANK), makeSkill({ power: 100 }), 0, false);
        expect(r.isBlock).toBe(true);
        expect(r.finalValue).toBe(-85);
    });

    it('vulnerable target takes 35% more', () => {
        const target = makeAgent(Team.RED);
        target.vulnerableTimer = 5;
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), target, makeSkill({ power: 100 }), 0, false);
        expect(r.finalValue).toBe(-135);
    });

    it('shield absorbs first and is consumed', () => {
        const target = makeAgent(Team.RED);
        target.shield = 30;
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), target, makeSkill({ power: 100 }), 0, false);
        expect(r.shieldAbsorb).toBe(30);
        expect(r.finalValue).toBe(-70);
        expect(target.shield).toBe(0);
    });

    it('banished and invincible targets take nothing', () => {
        const banished = makeAgent(Team.RED); banished.banished = true;
        const invincible = makeAgent(Team.RED); invincible.invincibleTimer = 3;
        const skill = makeSkill({ power: 100 });
        expect(DamageCalculator.calculate(makeAgent(Team.BLUE), banished, skill, 0, false).finalValue).toBe(0);
        expect(DamageCalculator.calculate(makeAgent(Team.BLUE), invincible, skill, 0, false).finalValue).toBe(0);
    });

    it('sudden death after 60s: +5% damage per second', () => {
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.RED), makeSkill({ power: 100 }), 70, false);
        expect(r.finalValue).toBe(-150);
    });

    it('last stand: triple damage, ignores shield and heal is embargoed', () => {
        const target = makeAgent(Team.RED);
        target.shield = 999;
        const dmg = DamageCalculator.calculate(makeAgent(Team.BLUE), target, makeSkill({ power: 100 }), 0, false, true);
        expect(dmg.finalValue).toBe(-300);
        expect(dmg.shieldAbsorb).toBe(0);
        const heal = DamageCalculator.calculate(makeAgent(Team.BLUE), makeAgent(Team.BLUE), makeSkill({ power: -50 }), 0, false, true);
        expect(heal.finalValue).toBe(0);
    });

    it('reports overkill beyond remaining HP', () => {
        const target = makeAgent(Team.RED);
        target.hp = 40;
        const r = DamageCalculator.calculate(makeAgent(Team.BLUE), target, makeSkill({ power: 100 }), 0, false);
        expect(r.overkill).toBe(60);
    });
});
