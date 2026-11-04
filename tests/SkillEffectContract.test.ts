// ╔══════════════════════════════════════════════════════════╗
// ║  SkillEffectContract — 每種技能效果都要真的改變戰鬥      ║
// ║  用真的引擎跑 tick，看單位行為和數值，不看欄位有沒有寫上  ║
// ║  去。每個控制都有對照組：沒中控制時單位確實會做那件事。   ║
// ║  資料段確認 150 個技能裡寫的欄位都有作用。                ║
// ╚══════════════════════════════════════════════════════════╝

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { CCManager } from '../engine/systems/combat/CCManager';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { runCastActions } from '../engine/systems/combat/SkillActions';
import { hexEventPos } from '../engine/events/EventPos';
import { HexUtils } from '../engine/utils';
import { resetRandomSource, setRandomSource } from '../engine/math/rng';
import { DAMAGE_RULES } from '../constants';
import { EFFECT_DEFS } from '../data/status/effect_defs';
import { ultImpactDelay } from '../data/vfx/ult_visuals';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { MovementType, Role, Team } from '../types';
import type { Skill, SkillStatus, SpatialHazard } from '../types';
import { flatSkill } from './helpers/flatSkill';
import { readFlatFields, type FlatSkillFields } from '../data/skills/flatView';

const TICK = 1 / 30;
const HP = 100000;

type SkillOver = Partial<Skill> & FlatSkillFields & { id: string; tag: Skill['tag'] };

function makeSkill(over: SkillOver): Skill {
    return flatSkill<Skill>({
        role: Role.WARRIOR, name: over.id, range: 1, cast: 0.2, cd: 1, cost: 0, gain: 0,
        type: 'SINGLE', power: 100, color: '#ffffff', visual: 'SLASH', projectileSpeed: 0, ...over,
    });
}

const BASIC = makeSkill({ id: 'c_basic', tag: 'BASIC', power: 10, cd: 0.5 });
const ACTIVE = makeSkill({ id: 'c_active', tag: 'ACTIVE', power: 10, cd: 0.5 });

function arena() {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    engine.skillDB = [...engine.skillDB, BASIC, ACTIVE];
    const spawn = (team: Team, q: number, r = 0, role = Role.WARRIOR, skills: (string | null)[] = [null, 'c_active', 'c_basic']) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, role);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP; a.hp = HP; a.shield = 0; a.spawnTimer = 0; a.skillIds = skills;
        return a;
    };
    const dummy = (team: Team, q: number, r = 0) => spawn(team, q, r, Role.WARRIOR, [null, null, null]);
    const start = () => {
        engine.play();
        for (const a of engine.agents) { a.hp = HP; a.mp = a.maxMp; a.spawnTimer = 0; }
    };
    /** 跑 seconds 秒；回傳單位有沒有施法、走了幾格 */
    const run = (a: Agent, seconds: number) => {
        const startHex = { q: a.q, r: a.r };
        const casting = new Set<number>();
        let moved = 0, last = { q: a.q, r: a.r };
        for (let t = 0; t < seconds; t += TICK) {
            engine.tick(TICK);
            if (a.castingSkillIdx !== -1) casting.add(a.castingSkillIdx);
            if (a.q !== last.q || a.r !== last.r) { moved++; last = { q: a.q, r: a.r }; }
        }
        return { casting, moved, dist: HexUtils.dist(startHex, a) };
    };
    const cc = (source: Agent, target: Agent, type: string, dur: number, force?: number, over: Partial<Skill> & FlatSkillFields = {}) =>
        CCManager.applyCC(source, target, makeSkill({ id: 'c_cc', tag: 'ACTIVE', ...over }), type, dur, force, undefined, engine);
    return { engine, spawn, dummy, start, run, cc, exec: new SkillExecutor() };
}

beforeEach(() => setRandomSource(() => 0.5));
afterEach(() => resetRandomSource());

describe('控制效果：單位真的不能做那件事', () => {
    /** 目標貼著敵人，會施法 */
    const near = (type?: string, force?: number) => {
        const w = arena();
        const unit = w.spawn(Team.BLUE, 0);
        const enemy = w.dummy(Team.RED, 1);
        w.start();
        if (type) w.cc(enemy, unit, type, 3, force);
        return { ...w.run(unit, 2.5) };
    };
    /** 目標離敵人很遠，會走路 */
    const far = (type?: string, force?: number) => {
        const w = arena();
        const unit = w.spawn(Team.BLUE, 0);
        const enemy = w.dummy(Team.RED, 6);
        w.start();
        if (type) w.cc(enemy, unit, type, 3, force);
        return w.run(unit, 2.5);
    };

    it('對照組：沒中控制時會施法、會走路', () => {
        expect(near().casting.size).toBeGreaterThan(0);
        expect(far().moved).toBeGreaterThan(0);
    });

    it.each(['STUN', 'POLYMORPH', 'BANISH'])('%s：不能施法、不能走路', (type) => {
        expect(near(type).casting.size).toBe(0);
        expect(far(type).moved).toBe(0);
    });

    it('ROOT：不能走路，但可以施法', () => {
        expect(far('ROOT').moved).toBe(0);
        expect(near('ROOT').casting.size).toBeGreaterThan(0);
    });

    it('SILENCE：不能放主動技，普攻照打', () => {
        const casting = near('SILENCE').casting;
        expect(casting.has(1)).toBe(false);
        expect(casting.has(2)).toBe(true);
    });

    it('FEAR：不能施法，而且會跑開', () => {
        const r = near('FEAR');
        expect(r.casting.size).toBe(0);
        expect(r.moved).toBeGreaterThan(0);
    });

    it('TAUNT：放著身邊的敵人不打，改打嘲諷者', () => {
        const w = arena();
        const unit = w.spawn(Team.BLUE, 0);
        const close = w.dummy(Team.RED, 1);
        const taunter = w.dummy(Team.RED, 3);
        w.start();
        w.run(unit, 0.5);
        expect(unit.target).toBe(close);
        w.cc(taunter, unit, 'TAUNT', 3);
        w.run(unit, 0.5);
        expect(unit.target).toBe(taunter);
    });

    it('BLIND：攻擊會落空', () => {
        const hit = (roll: number) => {
            setRandomSource(() => roll);
            const w = arena();
            const a = w.spawn(Team.BLUE, 0);
            const b = w.dummy(Team.RED, 1);
            w.start();
            w.cc(b, a, 'BLIND', 3);
            const before = b.hp;
            w.exec.resolveHit(a, b, makeSkill({ id: 'x', tag: 'BASIC', power: 100 }), undefined, w.engine, false);
            return before - b.hp;
        };
        expect(hit(0.1)).toBe(0);
        expect(hit(0.9)).toBeGreaterThan(0);
    });
});

describe('增減益：數值真的有變', () => {
    const damageTo = (setup?: (w: ReturnType<typeof arena>, a: Agent, b: Agent) => void, skill: Partial<Skill> & FlatSkillFields = {}) => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 1);
        w.start();
        setup?.(w, a, b);
        const before = b.hp;
        w.exec.resolveHit(a, b, makeSkill({ id: 'x', tag: 'BASIC', power: 100, ...skill }), undefined, w.engine, false);
        return { dealt: before - b.hp, a, b };
    };
    const base = damageTo().dealt;

    it('VULNERABLE：受傷變多', () => {
        expect(damageTo((w, a, b) => w.cc(a, b, 'VULNERABLE', 3)).dealt).toBe(Math.floor(base * DAMAGE_RULES.VULNERABLE_MULTIPLIER));
    });

    it('SHIELD：擋傷害', () => {
        expect(damageTo((w, a, b) => w.cc(b, b, 'SHIELD', 0, 60)).dealt).toBe(base - 60);
    });

    it('INVINCIBLE：擋直接傷害、持續傷害和地面危害', () => {
        expect(damageTo((w, a, b) => w.cc(b, b, 'INVINCIBLE', 3)).dealt).toBe(0);

        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 3);
        w.start();
        w.cc(b, b, 'INVINCIBLE', 4);
        w.cc(a, b, 'DOT', 3, 100);
        w.exec.executeInstantSkill(a, makeSkill({ id: 'x', tag: 'ACTIVE', range: 9, type: 'AOE', aoeRadius: 1, power: 500, element: 'FIRE', hazardKind: 'FIRE', hazardDur: 2 }), w.engine, { center: { q: b.q, r: b.r }, target: b });
        const before = b.hp;
        w.run(b, 2);
        expect(before - b.hp).toBe(0);
    });

    it('BANISH：放逐中不受持續傷害', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 3);
        w.start();
        w.cc(a, b, 'DOT', 3, 100);
        w.cc(a, b, 'BANISH', 3);
        const before = b.hp;
        w.run(b, 2);
        expect(before - b.hp).toBe(0);
    });

    it('DOT／HOT：真的扣血、補血', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 3);
        w.start();
        w.cc(a, b, 'DOT', 2, 100);
        let before = b.hp;
        w.run(b, 2.2);
        expect(before - b.hp).toBeGreaterThan(100);

        b.hp = 1000;
        w.cc(b, b, 'HOT', 2, 100);
        before = b.hp;
        w.run(b, 2.2);
        expect(b.hp - before).toBeGreaterThan(100);
    });

    it('HASTE／SLOW：走得更快、更慢', () => {
        const moved = (type?: string, force?: number) => {
            const w = arena();
            const unit = w.spawn(Team.BLUE, 0);
            const enemy = w.dummy(Team.RED, 6);
            w.start();
            if (type) w.cc(type === 'HASTE' ? unit : enemy, unit, type, 4, force);
            return w.run(unit, 1.5).moved;
        };
        expect(moved('HASTE', 75)).toBeGreaterThan(moved());
        expect(moved('SLOW', 0.7)).toBeLessThan(moved());
    });

    it('REFLECT／LIFESTEAL：反傷、吸血', () => {
        const r = damageTo((w, a, b) => w.cc(b, b, 'REFLECT', 3, 50));
        expect(r.a.hp).toBeLessThan(HP);
        const l = damageTo((w, a) => { a.hp = 1000; w.cc(a, a, 'LIFESTEAL', 3, 50); });
        expect(l.a.hp).toBeGreaterThan(1000);
    });
});

describe('位移：格子真的有換', () => {
    it.each([['KNOCKBACK', 3, 2], ['PULL', 3, 3]])('%s 力道 %i：輕的單位會動', (type, force, startQ) => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.spawn(Team.RED, startQ as number, 0, Role.MAGE, [null, null, null]);
        w.start();
        const before = HexUtils.dist(a, b);
        w.cc(a, b, type as string, 0, force as number);
        const after = HexUtils.dist(a, b);
        if (type === 'KNOCKBACK') expect(after).toBeGreaterThan(before);
        else expect(after).toBeLessThan(before);
    });

    it('DASH：距離 2 以上會跳過去', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 4);
        w.start();
        a.target = b;
        runCastActions(a, makeSkill({ id: 'x', tag: 'ACTIVE', range: 6, effectType: 'DASH' }), { q: 4, r: 0 }, hexEventPos(4, 0, w.engine), w.engine);
        expect(HexUtils.dist(a, b)).toBe(1);
    });
});

describe('技能附帶效果', () => {
    const hit = (skill: Partial<Skill> & FlatSkillFields, setup?: (a: Agent, b: Agent) => void) => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 1);
        w.start();
        setup?.(a, b);
        w.exec.resolveHit(a, b, makeSkill({ id: 'x', tag: 'ACTIVE', power: 100, ...skill }), undefined, w.engine, false);
        return { a, b };
    };

    it('VAMP：打人回血', () => {
        expect(hit({ effectType: 'VAMP', effectVal: 0.5 }, (a) => { a.hp = 1000; }).a.hp).toBeGreaterThan(1000);
    });
    it('MANA_BURN：燒魔', () => {
        expect(hit({ effectType: 'MANA_BURN', effectVal: 30 }, (_, b) => { b.mp = 50; }).b.mp).toBe(20);
    });
    it('MANA_RESTORE：回魔', () => {
        expect(hit({ power: -10, effectType: 'MANA_RESTORE', effectVal: 30 }, (_, b) => { b.mp = 50; }).b.mp).toBe(80);
    });
    it('EXECUTE：殘血直接死', () => {
        expect(hit({ effectType: 'EXECUTE', effectVal: 2 }, (_, b) => { b.hp = b.maxHp * 0.2; }).b.hp).toBe(0);
        expect(hit({ effectType: 'EXECUTE', effectVal: 2 }).b.hp).toBeGreaterThan(0);
    });
    it('SELF_DAMAGE：自己扣血', () => {
        expect(hit({ effectType: 'SELF_DAMAGE', effectVal: 100 }).a.hp).toBe(HP - 100);
    });
    it('ccSelf：效果給自己，不給目標', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 1);
        w.start();
        a.target = b;
        w.exec.executeInstantSkill(a, makeSkill({ id: 'x', tag: 'ACTIVE', ccType: 'SHIELD', ccForce: 300, ccSelf: true }), w.engine);
        expect(a.shield).toBe(300);
        expect(b.shield).toBe(0);
    });
    it('hits：多段總傷害等於一次打完', () => {
        const one = hit({ power: 300 });
        const w = arena();
        const a = w.spawn(Team.BLUE, 0);
        const b = w.dummy(Team.RED, 1);
        w.start();
        a.target = b;
        w.exec.executeInstantSkill(a, makeSkill({ id: 'x', tag: 'ACTIVE', power: 300, hits: { count: 3, interval: 0.1 } }), w.engine);
        for (let t = 0; t < 1; t += TICK) { w.engine.state.time.battleTime += TICK; w.exec.multiHit.update(w.engine); }
        expect(HP - b.hp).toBe(HP - one.b.hp);
    });
});

describe('地面危害', () => {
    const fieldAt = (type: Partial<Skill> & FlatSkillFields, role = Role.WARRIOR) => {
        const w = arena();
        const a = w.dummy(Team.BLUE, 0);
        const b = w.spawn(Team.RED, 3, 0, role, [null, null, null]);
        w.start();
        const before = b.hp;
        const stand = () => { b.isMoving = false; };
        w.exec.executeInstantSkill(a, makeSkill({ id: 'x', tag: 'ACTIVE', range: 9, type: 'AOE', aoeRadius: 1, power: 100, ...type }), w.engine, { center: { q: b.q, r: b.r }, target: null });
        const direct = before - b.hp;
        stand();
        for (let t = 0; t < 2; t += TICK) w.engine.tick(TICK);
        return { direct, periodic: before - b.hp - direct, hazards: w.engine.state.spatialHazards.length };
    };

    const HAZARD_BY_ELEM: Record<'FIRE' | 'ICE' | 'VOID', SpatialHazard['type']> = {
        FIRE: 'FIRE',
        ICE: 'ICE',
        VOID: 'GRAVITY',
    };
    it.each(['FIRE', 'ICE', 'VOID'] as const)('%s 屬性會留危害區並造成傷害', (element) => {
        const r = fieldAt({ element, hazardKind: HAZARD_BY_ELEM[element], hazardDur: 2 });
        expect(r.periodic).toBeGreaterThan(0);
    });
    it('DOT 會留毒區', () => {
        expect(fieldAt({ ccType: 'DOT', ccDur: 3, ccForce: 1, hazardKind: 'POISON', hazardDur: 3 }).periodic).toBeGreaterThan(0);
    });
    it('飛行單位不吃火', () => {
        const r = fieldAt({ element: 'FIRE', hazardKind: 'FIRE', hazardDur: 2 }, Role.MAGE);
        expect(r.periodic).toBe(0);
    });
    it('沒有屬性就不留', () => {
        expect(fieldAt({}).periodic).toBe(0);
    });
});

describe('技能資料：寫了的欄位都要有作用', () => {
    const skills = DEFAULT_SKILL_DB as readonly Skill[];
    const DUR_FREE = new Set(['SHIELD', 'KNOCKBACK', 'PULL']);
    const polarity = (t: string) => t === 'SHIELD' ? 'BUFF' : (t === 'KNOCKBACK' || t === 'PULL') ? 'DEBUFF' : EFFECT_DEFS[t as keyof typeof EFFECT_DEFS]?.polarity;

    const problems = (s: Skill): string[] => {
        const out: string[] = [];
        const check = (type: string | undefined, dur?: number, force?: number, self?: boolean) => {
            if (!type) {
                if (dur !== undefined || force !== undefined || self) out.push('控制欄位寫了但沒有 ccType');
                return;
            }
            if (!DUR_FREE.has(type) && !dur) out.push(`${type} 沒有持續時間`);
            if (self) return;
            if (s.power > 0 && polarity(type) === 'BUFF') out.push(`${type} 是增益但這招只打敵人`);
            if (s.power < 0 && polarity(type) === 'DEBUFF') out.push(`${type} 是減益但這招只打友軍`);
        };
        const flat = readFlatFields(s);
        check(flat.ccType, flat.ccDur, flat.ccForce, flat.ccSelf);
        check(flat.ccType2, flat.ccDur2, flat.ccForce2, flat.ccSelf2);
        for (const e of [flat.effectType, flat.effectType2]) {
            if (e !== 'DASH') continue;
            if ((s.projectileSpeed ?? 0) > 0) out.push('投射物不會突進');
            if (ultImpactDelay(s.id) > 0) out.push('天降類不會突進');
        }
        if (flat.effectType === undefined && flat.effectVal !== undefined) out.push('effectVal 沒有 effectType');
        if (flat.effectType2 === undefined && flat.effectVal2 !== undefined) out.push('effectVal2 沒有 effectType2');
        if (s.type !== 'AOE' && s.aoeRadius) out.push('單體技能寫了 aoeRadius');
        return out;
    };

    it('150 個技能都沒有沒作用的欄位', () => {
        const bad = skills.flatMap((s) => problems(s).map((p) => `${s.id}: ${p}`));
        expect(bad).toEqual([]);
    });

    it('技能用到的控制種類，引擎都認得', () => {
        const known = new Set<string>([...Object.keys(EFFECT_DEFS), 'SHIELD', 'KNOCKBACK', 'PULL', 'SLOW']);
        const used = new Set(skills.flatMap((s) => {
            const f = readFlatFields(s);
            return [f.ccType, f.ccType2];
        }).filter((t): t is NonNullable<SkillStatus> => !!t));
        expect([...used].filter((t) => !known.has(t))).toEqual([]);
    });
});

// 飛行判定常數存在才有意義（避免職業資料改動後測試默默失效）
it('法師仍是飛行單位', () => {
    const w = arena();
    const m = w.spawn(Team.BLUE, 0, 0, Role.MAGE);
    expect(m.movementType).toBe(MovementType.FLYING);
});
