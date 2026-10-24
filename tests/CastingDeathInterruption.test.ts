import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { CastingEngine, type BreakCastContext } from '../engine/systems/combat/CastingEngine';
import { unitEventPos } from '../engine/events/EventPos';
import { Team, Role, type Skill, type GameEvent } from '../types';
import { CAST_LOCKOUT, DEFAULT_HEX_LAYOUT } from '../constants';
import type { MapConfig } from '../engine/utils';

const MAP: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };

const aoeSkill: Skill = {
    id: 'test_aoe',
    tag: 'ACTIVE',
    role: Role.MAGE,
    name: 'Meteor Strike',
    range: 3,
    cast: 2.0,
    cd: 5,
    cost: 20,
    gain: 0,
    type: 'AOE',
    power: 100,
    color: '#ff4400',
};

const singleSkill: Skill = {
    id: 'test_single',
    tag: 'ACTIVE',
    role: Role.WARRIOR,
    name: 'Heavy Strike',
    range: 1,
    cast: 1.5,
    cd: 3,
    cost: 10,
    gain: 0,
    type: 'SINGLE',
    power: 80,
    color: '#00ffff',
};

const basicSkill: Skill = {
    id: 'test_basic',
    tag: 'BASIC',
    role: Role.WARRIOR,
    name: 'Normal Attack',
    range: 1,
    cast: 1.0,
    cd: 1,
    cost: 0,
    gain: 10,
    type: 'SINGLE',
    power: 20,
    color: '#ffffff',
};

const zeroCastSkill: Skill = {
    id: 'test_zero_cast',
    tag: 'ACTIVE',
    role: Role.MAGE,
    name: 'Instant Burst',
    range: 2,
    cast: 0,
    cd: 5,
    cost: 10,
    gain: 0,
    type: 'SINGLE',
    power: 50,
    color: '#ffff00',
};

function createTestContext() {
    const events: GameEvent[] = [];
    const log = vi.fn();
    const ctx = {
        events,
        log,
        getTerrainHeight: (_q: number, _r: number) => 0,
        mapConfig: MAP,
    } satisfies BreakCastContext;
    return { ctx, events, log };
}

describe('CastingDeathInterruption (F01)', () => {
    it('emits CAST_BREAK on death during non-BASIC cast with valid progress, pos, and AOE hexes', () => {
        const castingEngine = new CastingEngine();
        const { ctx, events } = createTestContext();
        const a = new Agent('dead-caster', Team.BLUE, 2, 3, MAP);
        a.skills = [aoeSkill];
        a.castingSkillIdx = 0;
        a.castTimer = 1.2;
        a.castingAnimationTimer = 0.5;
        a.currentTelegraph = [{ q: 3, r: 3 }, { q: 3, r: 4 }];
        a.hp = 0;

        const expectedPos = unitEventPos(a, ctx);
        castingEngine.handleInterruption(a, ctx);

        expect(events).toHaveLength(1);
        const ev = events[0];
        expect(ev.type).toBe('CAST_BREAK');
        expect(ev.sourceId).toBe(a.id);
        expect(ev.team).toBe(a.team);
        expect(ev.skill).toBe(aoeSkill);
        expect(ev.color).toBe(aoeSkill.color);
        expect(Number.isFinite(ev.value)).toBe(true);
        expect(ev.value).toBeCloseTo(1 - 1.2 / 2.0, 5);
        expect(ev.pos).toEqual(expectedPos);
        expect(ev.hexes).toEqual([{ q: 3, r: 3 }, { q: 3, r: 4 }]);
        expect(a.currentTelegraph).toBeNull();
    });

    it('emits CAST_BREAK on death even when _interruptCooldown > 0; second call does not re-emit; CD/lockout/log untouched', () => {
        const castingEngine = new CastingEngine();
        const { ctx, events, log } = createTestContext();
        const a = new Agent('dead-cd-caster', Team.RED, 1, 1, MAP);
        a.skills = [aoeSkill];
        a.castingSkillIdx = 0;
        a.castTimer = 1.0;
        a.curCDs[0] = 0;
        a._interruptCooldown = 0.8;
        a.hp = -10;

        castingEngine.handleInterruption(a, ctx);

        expect(events).toHaveLength(1);
        expect(a._interruptCooldown).toBe(0.8);
        expect(a.curCDs[0]).toBe(0);
        expect(log).not.toHaveBeenCalled();

        // Second call should not emit another event
        castingEngine.handleInterruption(a, ctx);
        expect(events).toHaveLength(1);
    });

    it('resets caster state on interruption', () => {
        const castingEngine = new CastingEngine();
        const { ctx } = createTestContext();
        const a = new Agent('reset-test', Team.BLUE, 0, 0, MAP);
        a.skills = [aoeSkill];
        a.castingSkillIdx = 0;
        a.castTimer = 1.0;
        a.castingAnimationTimer = 0.8;
        a.currentTelegraph = [{ q: 0, r: 1 }];
        a.hp = 0;

        castingEngine.handleInterruption(a, ctx);

        expect(a.castingSkillIdx).toBe(-1);
        expect(a.castTimer).toBe(0);
        expect(a.castingAnimationTimer).toBe(0);
        expect(a.currentTelegraph).toBeNull();
    });

    it('does not emit CAST_BREAK on death if castingSkillIdx is -1, tag is BASIC, or cast is 0', () => {
        const castingEngine = new CastingEngine();

        // 1. castingSkillIdx is -1
        {
            const { ctx, events } = createTestContext();
            const a = new Agent('no-cast', Team.BLUE, 0, 0, MAP);
            a.skills = [aoeSkill];
            a.castingSkillIdx = -1;
            a.hp = 0;
            castingEngine.handleInterruption(a, ctx);
            expect(events).toHaveLength(0);
        }

        // 2. tag is BASIC
        {
            const { ctx, events } = createTestContext();
            const a = new Agent('basic-cast', Team.BLUE, 0, 0, MAP);
            a.skills = [basicSkill];
            a.castingSkillIdx = 0;
            a.castTimer = 0.5;
            a.hp = 0;
            castingEngine.handleInterruption(a, ctx);
            expect(events).toHaveLength(0);
        }

        // 3. cast is 0
        {
            const { ctx, events } = createTestContext();
            const a = new Agent('instant-cast', Team.BLUE, 0, 0, MAP);
            a.skills = [zeroCastSkill];
            a.castingSkillIdx = 0;
            a.castTimer = 0;
            a.hp = 0;
            castingEngine.handleInterruption(a, ctx);
            expect(events).toHaveLength(0);
        }
    });

    it('sets hexes to undefined for SINGLE skill interruption on death', () => {
        const castingEngine = new CastingEngine();
        const { ctx, events } = createTestContext();
        const a = new Agent('single-caster', Team.BLUE, 1, 2, MAP);
        a.skills = [singleSkill];
        a.castingSkillIdx = 0;
        a.castTimer = 0.5;
        a.currentTelegraph = [{ q: 1, r: 3 }];
        a.hp = 0;

        castingEngine.handleInterruption(a, ctx);

        expect(events).toHaveLength(1);
        expect(events[0].hexes).toBeUndefined();
    });

    it('alive interruption control: emits event, sets lockout and cooldown floor, and throttles when on cooldown', () => {
        const castingEngine = new CastingEngine();
        const { ctx, events, log } = createTestContext();
        const a = new Agent('alive-caster', Team.BLUE, 0, 0, MAP);
        a.skills = [aoeSkill];
        a.castingSkillIdx = 0;
        a.castTimer = 1.0;
        a.curCDs[0] = 0.1;
        a._interruptCooldown = 0;
        a.hp = 100;

        castingEngine.handleInterruption(a, ctx);

        // First interruption while alive: emits event, updates cooldown & lockout, logs
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('CAST_BREAK');
        expect(a._interruptCooldown).toBe(CAST_LOCKOUT.INTERRUPT);
        expect(a.curCDs[0]).toBe(0.5);
        expect(log).toHaveBeenCalled();
        expect(a.castingSkillIdx).toBe(-1);

        // Second interruption while _interruptCooldown > 0: throttled (no new event)
        a.castingSkillIdx = 0;
        a.castTimer = 0.8;
        castingEngine.handleInterruption(a, ctx);
        expect(events).toHaveLength(1);
        expect(a.castingSkillIdx).toBe(-1);
    });
});
