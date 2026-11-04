// 技能狀態機：實戰中每個技能槽的階段轉移都要走在宣告的邊上；狀態宣告表決定能不能放
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GameEngine, type Agent } from '../engine/game';
import { resetRandomSource, setRandomSource } from '../engine/math/rng';
import { activationBlock, SKILL_PHASE_EDGES, skillPhase, type SkillPhase } from '../engine/systems/combat/SkillStateMachine';
import { isActionBlocked, EFFECT_KINDS } from '../engine/core/Effects';
import { EFFECT_DEFS } from '../data/status/effect_defs';
import { Role, Team } from '../types';
import type { EffectKind } from '../types';

beforeEach(() => setRandomSource(() => 0.5));
afterEach(() => resetRandomSource());

function duel() {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const blue = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 5000, Role.WARRIOR)!;
    const red = engine.agentManager.addAgent(engine, Team.RED, 2, 0, 5000, Role.TANK)!;
    return { engine, blue, red };
}

describe('階段轉移', () => {
    it('實戰中的轉移全部是宣告過的邊', () => {
        const { engine, blue, red } = duel();
        engine.play();
        const legal = new Set(SKILL_PHASE_EDGES.map((e) => `${e.from}>${e.to}`));
        const seen = new Set<string>();
        const prev = new Map<Agent, SkillPhase[]>();
        for (let t = 0; t < 30; t += 1 / 30) {
            engine.tick(1 / 30);
            for (const a of [blue, red]) {
                const phases = a.skills.map((_, i) => skillPhase(a, i));
                const before = prev.get(a);
                phases.forEach((p, i) => { if (before && before[i] !== p) seen.add(`${before[i]}>${p}`); });
                prev.set(a, phases);
            }
        }
        expect(seen.size).toBeGreaterThan(0);
        expect([...seen].filter((e) => !legal.has(e))).toEqual([]);
    });
});

describe('activationBlock', () => {
    const ready = () => {
        const { engine, blue } = duel();
        engine.play();
        blue.mp = blue.maxMp;
        const idx = blue.skills.findIndex((s) => s?.tag === 'ACTIVE');
        return { blue, idx, basic: blue.skills.findIndex((s) => s?.tag === 'BASIC') };
    };

    it('沒有阻礙時可以放', () => {
        const { blue, idx } = ready();
        expect(activationBlock(blue, idx)).toBeNull();
    });
    it('沒有技能', () => {
        const { blue } = ready();
        expect(activationBlock(blue, 99)).toBe('NO_SKILL');
    });
    it('沒魔、冷卻中、硬直中、在放別招', () => {
        const a = ready();
        a.blue.mp = 0;
        const cost = a.blue.skills[a.idx]!.cost;
        if (cost > 0) expect(activationBlock(a.blue, a.idx)).toBe('MANA');
        const b = ready();
        b.blue.curCDs[b.idx] = 5;
        expect(activationBlock(b.blue, b.idx)).toBe('COOLDOWN');
        const c = ready();
        c.blue._castCompleteCooldown = 1;
        expect(activationBlock(c.blue, c.idx)).toBe('RECOVERY');
        const d = ready();
        d.blue.castingSkillIdx = d.basic;
        expect(activationBlock(d.blue, d.idx)).toBe('BUSY');
    });
    it.each(['STUN', 'POLYMORPH', 'FEAR', 'BANISH'] as const)('%s 擋所有施法', (kind) => {
        const { blue, idx, basic } = ready();
        blue.effects[kind].remaining = 1;
        expect(activationBlock(blue, idx)).toBe('CONTROLLED');
        expect(activationBlock(blue, basic)).toBe('CONTROLLED');
    });
    it('SILENCE 只擋主動技和奧義', () => {
        const { blue, idx, basic } = ready();
        blue.effects.SILENCE.remaining = 1;
        expect(activationBlock(blue, idx)).toBe('SILENCED');
        expect(activationBlock(blue, basic)).toBeNull();
    });
});

describe('狀態宣告表', () => {
    it.each([
        ['STUN', ['MOVE', 'CAST']], ['POLYMORPH', ['MOVE', 'CAST']], ['BANISH', ['MOVE', 'CAST']],
        ['FEAR', ['CAST']], ['ROOT', ['MOVE']], ['SILENCE', ['SKILL']],
    ] as [EffectKind, string[]][])('%s 禁止 %j', (kind, blocks) => {
        expect([...(EFFECT_DEFS[kind].blocks ?? [])].sort()).toEqual([...blocks].sort());
        const { blue } = duel();
        for (const action of ['MOVE', 'CAST', 'SKILL'] as const) {
            blue.effects[kind].remaining = 0;
            expect(isActionBlocked(blue, action)).toBe(false);
            blue.effects[kind].remaining = 1;
            expect(isActionBlocked(blue, action)).toBe(blocks.includes(action));
        }
    });
    it('其他效果都不禁止行動', () => {
        const blocking = EFFECT_KINDS.filter((k) => (EFFECT_DEFS[k].blocks ?? []).length > 0).sort();
        expect(blocking).toEqual(['BANISH', 'FEAR', 'POLYMORPH', 'ROOT', 'SILENCE', 'STUN']);
    });
});

describe('施法狀態只有狀態機寫', () => {
    it.each(['engine/systems/combat/CombatSystem.ts', 'engine/systems/combat/CastingEngine.ts'])('%s 不直接寫施法欄位', (file) => {
        const source = readFileSync(file, 'utf8');
        expect(source).not.toMatch(/\b(castingSkillIdx|castTimer|castingAnimationTimer|_castCompleteCooldown|_interruptCooldown)\s*=[^=]/);
        expect(source).not.toMatch(/curCDs\[[^\]]+\]\s*=[^=]/);
    });
});
