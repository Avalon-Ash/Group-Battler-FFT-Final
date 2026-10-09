import { describe, it, expect, afterEach } from 'vitest';
import { random, setRandomSource, resetRandomSource } from '../engine/math/rng';
import { Agent } from '../engine/core/Agent';
import { AgentManager } from '../engine/systems/agentManager';
import { DEFAULT_HEX_LAYOUT } from '../constants';
import { Role, Team } from '../types';

afterEach(() => resetRandomSource());

describe('rng', () => {
    it('injected source drives random()', () => {
        const seq = [0.1, 0.9];
        let i = 0;
        setRandomSource(() => seq[i++]);
        expect(random()).toBe(0.1);
        expect(random()).toBe(0.9);
    });

    it('AI jitter uses injected source and consumes exactly one value', () => {
        let calls = 0;
        setRandomSource(() => { calls++; return 0.5; });
        const a = new Agent('R', Team.BLUE, 0, 0, { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT });
        a.role = Role.WARRIOR;
        AgentManager.applyRoleStats(a, undefined, true);
        expect(calls).toBe(1);
        expect(a.aiUpdateInterval).toBeGreaterThan(0.06);
        expect(a.aiUpdateInterval).toBeLessThan(0.08);
    });
});
