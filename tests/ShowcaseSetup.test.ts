import { describe, it, expect } from 'vitest';
import { rollShowcaseSetup } from '../engine/systems/ui/editorQueries';
import { random, seedSimulation } from '../engine/math/rng';
import { GAME_APP_PARAM } from '../constants';

describe('rollShowcaseSetup', () => {
    const { MIN_UNITS, MAX_UNITS, ROYALE_MIN_FACTIONS, TEAMS_CHANCE } = GAME_APP_PARAM.SHOWCASE_SETUP;
    const rolls = (() => {
        seedSimulation(7);
        return Array.from({ length: 2000 }, () => rollShowcaseSetup(random));
    })();

    it('總人數一定落在範圍內，也至少每陣營一人', () => {
        for (const r of rolls) {
            expect(r.factions * r.unitsPerFaction).toBeGreaterThanOrEqual(MIN_UNITS);
            expect(r.factions * r.unitsPerFaction).toBeLessThanOrEqual(MAX_UNITS);
            expect(r.unitsPerFaction).toBeGreaterThanOrEqual(1);
        }
    });

    it('雙陣營與大逃殺都會出現，比例接近設定', () => {
        const teams = rolls.filter(r => r.factions === 2).length / rolls.length;
        expect(Math.abs(teams - TEAMS_CHANCE)).toBeLessThan(0.05);
        const royale = rolls.filter(r => r.factions !== 2);
        expect(Math.min(...royale.map(r => r.factions))).toBe(ROYALE_MIN_FACTIONS);
        expect(Math.max(...royale.map(r => r.factions))).toBe(MAX_UNITS);
        // 不能幾乎都是每陣營 1 人
        expect(royale.filter(r => r.unitsPerFaction === 1).length / royale.length).toBeLessThan(0.3);
    });

    it('rand 的邊界值不會超出範圍', () => {
        for (const v of [0, 0.999999]) {
            const r = rollShowcaseSetup(() => v);
            expect(r.factions * r.unitsPerFaction).toBeLessThanOrEqual(MAX_UNITS);
            expect(r.factions * r.unitsPerFaction).toBeGreaterThanOrEqual(MIN_UNITS);
        }
    });
});
