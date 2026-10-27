import { describe, it, expect, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { BLOCK_HEIGHT } from '../constants';
import { Team, Role } from '../types';
import { GridRenderStrategy } from '../engine/renderers/grid/GridRenderStrategy';
import { HexUtils } from '../engine/utils';

describe('R6 range SSOT', () => {
    const engine = new GameEngine();
    afterEach(() => engine.clear());

    it('melee spends one range per tier in either direction; ranged keeps its old bonus and floor', () => {
        const source = { q: 0, r: 0 };
        for (const tiers of [0, 1, 2, 3, 6]) {
            engine.map.setHeight('0,0', tiers * BLOCK_HEIGHT);
            engine.map.setHeight('1,0', 0);
            expect(engine.getEffectiveRange(source, 1, 0, 1)).toBe(1 - tiers);
            expect(engine.getEffectiveRange({ q: 1, r: 0 }, 0, 0, 1)).toBe(1 - tiers);
            expect(engine.getEffectiveRange(source, 1, 0, 2)).toBe(2 + Math.min(2, tiers));
            expect(engine.getEffectiveRange({ q: 1, r: 0 }, 0, 0, 2)).toBe(Math.max(1, 2 - tiers));
            expect(engine.getEffectiveRange(source, 1, 0, 0)).toBe(0);
        }
    });

    it('hover range agrees with the combat SSOT on both sides of a height step', () => {
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
        const agent = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        if (!agent) throw new Error('addAgent failed');
        const strategy = new GridRenderStrategy();
        const skill = { ...agent.skills[2], range: 1 };
        for (const height of [0, BLOCK_HEIGHT, 3 * BLOCK_HEIGHT]) {
            engine.map.setHeight('0,0', height);
            for (const q of [1, 2, 3]) {
                const expected = HexUtils.dist(agent, { q, r: 0 }) <= engine.getEffectiveRange(agent, q, 0, skill.range);
                expect(strategy['checkIsRange'](q, 0, 0, skill, agent, engine)).toBe(expected);
                expect(expected).toBe(height === 0 && q === 1);
            }
        }
    });
});
