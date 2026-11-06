import { describe, it, expect, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { GameEngine } from '../engine/game';
import { AgentManager } from '../engine/systems/agentManager';
import { Role, Team, type Skill } from '../types';
import { CCManager } from '../engine/systems/combat/CCManager';
import { StatusPresentationSystem } from '../engine/presentation/StatusPresentationSystem';
import { setRandomSource, resetRandomSource } from '../engine/math/rng';
import { advanceMulberry32, mulberry32Value } from '../engine/math/hash';
import { HexUtils } from '../engine/utils';

const oldSalt = AgentManager.matchSalt;
afterEach(() => { resetRandomSource(); AgentManager.matchSalt = oldSalt; });

function run(seed: number, observe: boolean) {
    // Use the production PRNG arithmetic through the supported source seam, exposing its exact state and draw count.
    let rngState = seed;
    let draws = 0;
    setRandomSource(() => {
        rngState = advanceMulberry32(rngState);
        draws++;
        return mulberry32Value(rngState);
    });
    AgentManager.matchSalt = 12345;
    const engine = new GameEngine();
    const ticks: string[] = [];
    let observations = 0;
    let damageEvents = 0;
    try {
        const hexes = HexUtils.range({ q: 0, r: 0 }, 5).filter(h => engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r));
        const left = hexes.filter(h => h.q < -1);
        const right = hexes.filter(h => h.q > 1);
        const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        for (let i = 0; i < 5; i++) {
            const a = engine.agentManager.addAgent(engine, Team.BLUE, left[i].q, left[i].r, 1800, roles[i]);
            const b = engine.agentManager.addAgent(engine, Team.RED, right[i].q, right[i].r, 1800, roles[i]);
            if (!a || !b) throw new Error('determinism spawn failed');
        }
        engine.play();
        const a = engine.agents[0], b = engine.agents[1];
        const s: Skill = { id: 'det-dot', name: 'det', element: 'BLOOD', tag: 'ACTIVE', role: Role.MAGE, range: 8, cast: 0, cd: 0, cost: 0, gain: 0, type: 'SINGLE', power: 0, color: '#ffffff' };
        engine.bus.on('GAME_EVENT', event => {
            if (event.type === 'DAMAGE') damageEvents++;
            if (event.effectKind !== undefined) observations++;
            if (observe) StatusPresentationSystem.process(event, engine.agents);
        });
        for (let tick = 0; tick < 1200; tick++) {
            // Fixed real applications exercise sourceId, split SLOW receipts, HOT, shield, DR and DOT variant switches.
            if (tick % 120 === 0 && a.hp > 0 && b.hp > 0) {
                CCManager.applyCC(a, b, s, 'DOT', 3, 20, undefined, engine);
                CCManager.applyCC(a, b, s, 'SLOW', 3, 0.4, undefined, engine);
                CCManager.applyCC(a, b, s, 'STUN', 1, 0, undefined, engine);
                CCManager.applyCC(a, a, s, 'HOT', 3, 10, undefined, engine);
                CCManager.applyCC(a, a, s, 'SHIELD', 3, 25, undefined, engine);
                // These events occur outside tick's start-of-frame clear, so dispatch the actual batch explicitly.
                for (const event of engine.events) if (observe) StatusPresentationSystem.process(event, engine.agents);
            }
            engine.tick(1 / 30);
            const state = engine.agents.map(unit => ({
                id: unit.id, hp: unit.hp, mp: unit.mp, shield: unit.shield, maxShield: unit.maxShield,
                q: unit.q, r: unit.r, px: unit.px, py: unit.py, physics: unit.physics,
                targetId: unit.target === null ? null : unit.target.id, targetHex: unit.targetHex,
                effects: unit.effects, drStacks: unit.drStacks, drTimers: unit.drTimers,
                banished: unit.banished, outOfBounds: unit.outOfBounds, fullyDead: unit.fullyDead,
                aiState: unit.aiState, actionState: unit.actionState, curCDs: unit.curCDs,
                castingSkillIdx: unit.castingSkillIdx, castTimer: unit.castTimer,
            }));
            ticks.push(createHash('sha256').update(JSON.stringify({ state, rngState, draws, time: engine.battleTime })).digest('hex'));
        }
        const recorded = engine.agents.some(unit => Object.values(unit.view.statusPresentation.effects).some(r => r.duration.recorded));
        return { ticks, draws, rngState, observations, damageEvents, recorded };
    } finally {
        engine.stop(); engine.clear(); resetRandomSource();
    }
}

describe('status observation on/off determinism', () => {
    it.each([1234, 21000000, 21200000])('matches all effect fields including sourceId, DR and RNG each tick: seed %s', seed => {
        const off = run(seed, false);
        const on = run(seed, true);
        expect(off.ticks).toHaveLength(1200);
        expect(on.ticks).toEqual(off.ticks);
        expect(on.draws).toBe(off.draws);
        expect(on.rngState).toBe(off.rngState);
        expect(on.observations).toBe(off.observations);
        expect(on.damageEvents).toBeGreaterThan(0);
        expect(on.observations).toBeGreaterThan(0);
        expect(on.recorded).toBe(true);
        expect(off.recorded).toBe(false);
    });
});
