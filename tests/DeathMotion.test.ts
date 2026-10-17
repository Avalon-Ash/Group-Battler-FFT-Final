import { describe, it, expect } from 'vitest';
import { computeDeathOffset, computeDeathGround } from '../data/units/appearance/deathMotion';
import { AgentManager } from '../engine/systems/agentManager';
import { AnimationSystem } from '../engine/systems/AnimationSystem';
import { Agent } from '../engine/core/Agent';
import type { GameEngine } from '../engine/game';
import { Team } from '../types';
import { DEATH_KNOCKBACK, DEFAULT_HEX_LAYOUT } from '../constants';

const MAP = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };

describe('computeDeathOffset', () => {
    it('is zero at (or before) the moment of death', () => {
        expect(computeDeathOffset(150, 80, 150, 0)).toEqual({ x: 0, y: 0, lift: 0 });
        expect(computeDeathOffset(150, 80, 150, -1)).toEqual({ x: 0, y: 0, lift: 0 });
    });

    it('slides away along the impact direction and never exceeds MAX_SLIDE', () => {
        const early = computeDeathOffset(150, 0, 0, 0.1);
        const later = computeDeathOffset(150, 0, 0, 1.0);
        expect(early.x).toBeGreaterThan(0);
        expect(later.x).toBeGreaterThan(early.x);
        expect(early.y).toBe(0);
        const huge = computeDeathOffset(5000, 5000, 0, 3);
        expect(Math.hypot(huge.x, huge.y)).toBeLessThanOrEqual(DEATH_KNOCKBACK.MAX_SLIDE + 1e-6);
    });

    it('hops off the ground, then settles flat after the bounces are used up', () => {
        const mid = computeDeathOffset(0, 0, 150, 0.2);
        expect(mid.lift).toBeGreaterThan(0);
        for (let t = 0; t < 3; t += 0.05) {
            expect(computeDeathOffset(0, 0, 150, t).lift).toBeGreaterThanOrEqual(0);
        }
        expect(computeDeathOffset(0, 0, 150, 5).lift).toBe(0);
    });

    it('without upward velocity there is no hop', () => {
        expect(computeDeathOffset(100, 0, 0, 0.3).lift).toBe(0);
    });
});

describe('death timer lifecycle (single writer)', () => {
    it('accumulates deathTimer across ticks and only then marks the unit fullyDead', () => {
        const agent = new Agent('D', Team.BLUE, 0, 0, MAP);
        agent.hp = 0;
        agent.deadLogged = true;
        agent.deathTimer = 0;

        const manager = new AgentManager();
        const animation = new AnimationSystem();
        const engine = { agents: [agent] } as unknown as GameEngine;

        const dt = 0.016;
        let elapsed = 0;
        // 一半時間：計時必須持續增加、單位仍在播放死亡動畫
        while (elapsed < agent.DEATH_ANIM_DURATION * 0.5) {
            manager.updateDeathState(agent, dt);
            animation.update(dt, engine);
            elapsed += dt;
        }
        expect(agent.deathTimer).toBeGreaterThan(agent.DEATH_ANIM_DURATION * 0.45);
        expect(agent.fullyDead).toBe(false);

        // 超過總時長：必須被標記為 fullyDead
        while (elapsed < agent.DEATH_ANIM_DURATION + 0.5) {
            manager.updateDeathState(agent, dt);
            animation.update(dt, engine);
            elapsed += dt;
        }
        expect(agent.fullyDead).toBe(true);
    });
});

describe('computeDeathGround (corpse slide vs. collapsed tiles)', () => {
    // 一維地面：x < 50 有地面（高 48），x >= 50 是虛空；x < -50 有較高地面（72）
    const query = {
        hexAt: (x: number) => ({ q: Math.floor(x / 50), r: 0 }),
        hasGround: (q: number) => q < 1,
        heightAt: (q: number) => (q < -1 ? 72 : 48),
    };

    it('rides the ground under the slide point (higher or lower)', () => {
        const stay = computeDeathGround(0, 0, 0, 0, 0, 3, query);
        expect(stay).toEqual({ height: 48, fellAt: null });
        const toHigher = computeDeathGround(-10, 0, -150, 0, 0, 3, query);
        expect(toHigher.fellAt).toBeNull();
        expect(toHigher.height).toBe(72);
    });

    it('falls from the moment the slide leaves the tiles and keeps falling', () => {
        const out = (t: number) => computeDeathGround(20, 0, 150, 0, 0, t, query);
        const early = out(0.05);
        expect(early.fellAt).toBeNull();
        const a = out(1.0), b = out(1.5), c = out(3.0);
        expect(a.fellAt).not.toBeNull();
        expect(a.height).toBeLessThan(48);
        expect(b.height).toBeLessThan(a.height);
        expect(c.height).toBeLessThan(b.height);
        // 回收仍由死亡計時決定，這裡只保證終點在虛空時高度單調下降
    });

    it('does nothing special when it died with no ground under it (physics already handles the fall)', () => {
        const none = { ...query, hasGround: () => false };
        expect(computeDeathGround(0, 0, 150, 0, 0, 2, none)).toEqual({ height: 0, fellAt: null });
    });
});

