// ╔══════════════════════════════════════════════════════════╗
// ║  SkillMechanics — 動作清單裡每種機制都要真的改變戰鬥      ║
// ║  用真的引擎結算一擊，每項都有對照組（沒有這個動作時不同）。║
// ║  資料段確認技能描述承諾的機制真的裝在那一招上。            ║
// ╚══════════════════════════════════════════════════════════╝

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { CombatSystem } from '../engine/systems/combat/CombatSystem';
import { CCManager } from '../engine/systems/combat/CCManager';
import { runImpactActions } from '../engine/systems/combat/SkillActions';
import { HexUtils } from '../engine/utils';
import { resetRandomSource, setRandomSource } from '../engine/math/rng';
import { isActionBlocked } from '../engine/core/Effects';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { Role, Team } from '../types';
import { ACTIVE_VISUALS } from '../data/vfx/active_visuals';
import type { EffectKind, EndAction, HitAction, Skill } from '../types';

const HP = 100000;

function makeSkill(over: Partial<Skill>): Skill {
    return {
        id: 'm_test', tag: 'ACTIVE', role: Role.WARRIOR, name: 'm_test', range: 5, cast: 0.2, cd: 1, cost: 0, gain: 0,
        type: 'SINGLE', power: 100, color: '#ffffff', visual: 'SLASH', projectileSpeed: 0, ...over,
    };
}

function arena(targetQ = 1) {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const spawn = (team: Team, q: number, r = 0, role = Role.WARRIOR) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, role);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP; a.hp = HP; a.shield = 0; a.spawnTimer = 0;
        return a;
    };
    const exec = new SkillExecutor();
    /** 結算一擊（不爆擊）；回傳目標掉的血 */
    const hit = (source: Agent, target: Agent, skill: Skill) => {
        const before = target.hp;
        exec.resolveHit(source, target, skill, undefined, engine, false);
        return before - target.hp;
    };
    return { engine, spawn, hit, exec, source: spawn(Team.BLUE, 0, 0), target: spawn(Team.RED, targetQ, 0) };
}

const withHit = (onHit: readonly HitAction[], over: Partial<Skill> = {}) => makeSkill({ onHit, ...over });
const skillById = (id: string) => {
    const s = DEFAULT_SKILL_DB.find((x) => x.id === id);
    if (!s) throw new Error(`no skill ${id}`);
    return s;
};

beforeEach(() => setRandomSource(() => 0.5));
afterEach(() => resetRandomSource());

describe('PIERCE：傷害的一部分無視護盾', () => {
    const SHIELD = 50000;
    it('沒有穿透時護盾全擋（對照組）', () => {
        const w = arena();
        w.target.shield = SHIELD;
        expect(w.hit(w.source, w.target, makeSkill({}))).toBe(0);
        expect(w.target.shield).toBeLessThan(SHIELD);
    });
    it('value 1：完全無視，護盾不動，傷害和沒護盾時一樣', () => {
        const free = arena();
        const plain = free.hit(free.source, free.target, makeSkill({}));
        const w = arena();
        w.target.shield = SHIELD;
        expect(w.hit(w.source, w.target, withHit([{ action: 'PIERCE', value: 1 }]))).toBe(plain);
        expect(w.target.shield).toBe(SHIELD);
    });
    it('value 0.5：一半打血，一半打盾', () => {
        const free = arena();
        const plain = free.hit(free.source, free.target, makeSkill({}));
        const w = arena();
        w.target.shield = SHIELD;
        const lost = w.hit(w.source, w.target, withHit([{ action: 'PIERCE', value: 0.5 }]));
        expect(Math.abs(lost - plain / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(SHIELD - w.target.shield - plain / 2)).toBeLessThanOrEqual(1);
    });
});

describe('BREAK_SHIELD：打中後清掉目標的護盾', () => {
    it('對照組：沒有這個動作，打不完的護盾還在', () => {
        const w = arena();
        w.target.shield = 50000;
        w.hit(w.source, w.target, makeSkill({}));
        expect(w.target.shield).toBeGreaterThan(0);
    });
    it('打中後護盾歸零', () => {
        const w = arena();
        w.target.shield = 50000;
        w.hit(w.source, w.target, withHit([{ action: 'BREAK_SHIELD' }]));
        expect(w.target.shield).toBe(0);
    });
});

describe('TRUE_STRIKE：致盲也打得中', () => {
    it('對照組：致盲時會打空', () => {
        setRandomSource(() => 0.1);
        const w = arena();
        w.source.effects.BLIND.remaining = 5;
        expect(w.hit(w.source, w.target, makeSkill({}))).toBe(0);
    });
    it('有 TRUE_STRIKE 就打中', () => {
        setRandomSource(() => 0.1);
        const w = arena();
        w.source.effects.BLIND.remaining = 5;
        expect(w.hit(w.source, w.target, withHit([{ action: 'TRUE_STRIKE' }]))).toBeGreaterThan(0);
    });
});

describe('RAGE：施法者血越少傷害越高', () => {
    it('滿血時和沒有這個動作一樣', () => {
        const a = arena();
        const plain = a.hit(a.source, a.target, makeSkill({}));
        const b = arena();
        expect(b.hit(b.source, b.target, withHit([{ action: 'RAGE', value: 1 }]))).toBe(plain);
    });
    it('value 1、剩一半血：傷害 1.5 倍', () => {
        const a = arena();
        const plain = a.hit(a.source, a.target, makeSkill({}));
        const b = arena();
        b.source.hp = HP / 2;
        const lost = b.hit(b.source, b.target, withHit([{ action: 'RAGE', value: 1 }]));
        expect(Math.abs(lost - plain * 1.5)).toBeLessThanOrEqual(1);
    });
});

describe('RANDOM_POWER：傷害在範圍內隨機', () => {
    it.each([[0, 0.5], [0.999, 1.5]])('亂數 %s 時約為 %s 倍', (roll, ratio) => {
        const a = arena();
        const plain = a.hit(a.source, a.target, makeSkill({}));
        setRandomSource(() => roll);
        const b = arena();
        const lost = b.hit(b.source, b.target, withHit([{ action: 'RANDOM_POWER', min: 0.5, max: 1.5 }]));
        expect(Math.abs(lost - plain * ratio)).toBeLessThanOrEqual(plain * 0.01 + 1);
    });
});

describe('DISPEL：清掉指定極性的狀態', () => {
    const fx = (a: Agent, kind: EffectKind) => a.effects[kind].remaining;
    it('DEBUFF：清暈眩，留加速；被暈的人能動了', () => {
        const w = arena();
        w.target.effects.STUN.remaining = 5;
        w.target.effects.HASTE.remaining = 5;
        expect(isActionBlocked(w.target, 'CAST')).toBe(true);
        w.hit(w.source, w.target, withHit([{ action: 'DISPEL', polarity: 'DEBUFF' }]));
        expect(fx(w.target, 'STUN')).toBe(0);
        expect(fx(w.target, 'HASTE')).toBe(5);
        expect(isActionBlocked(w.target, 'CAST')).toBe(false);
    });
    it('BUFF：清加速，留暈眩', () => {
        const w = arena();
        w.target.effects.STUN.remaining = 5;
        w.target.effects.HASTE.remaining = 5;
        w.hit(w.source, w.target, withHit([{ action: 'DISPEL', polarity: 'BUFF' }]));
        expect(fx(w.target, 'HASTE')).toBe(0);
        expect(fx(w.target, 'STUN')).toBe(5);
    });
    it('對照組：沒有這個動作，狀態都在', () => {
        const w = arena();
        w.target.effects.STUN.remaining = 5;
        w.hit(w.source, w.target, makeSkill({}));
        expect(fx(w.target, 'STUN')).toBe(5);
    });
});

describe('CHANCE：機率觸發', () => {
    const skill = withHit([{ action: 'CHANCE', chance: 0.3, then: [{ action: 'STATUS', status: 'STUN', duration: 1 }] }]);
    it('骰中時觸發', () => {
        setRandomSource(() => 0.1);
        const w = arena();
        w.hit(w.source, w.target, skill);
        expect(w.target.effects.STUN.remaining).toBeGreaterThan(0);
    });
    it('沒骰中不觸發', () => {
        setRandomSource(() => 0.5);
        const w = arena();
        w.hit(w.source, w.target, skill);
        expect(w.target.effects.STUN.remaining).toBe(0);
    });
});

describe('RANDOM_OF：隨機挑一個', () => {
    const skill = withHit([{
        action: 'RANDOM_OF',
        options: [{ action: 'STATUS', status: 'STUN', duration: 1 }, { action: 'STATUS', status: 'SILENCE', duration: 1 }],
    }]);
    it('亂數小挑第一個，另一個不套', () => {
        setRandomSource(() => 0);
        const w = arena();
        w.hit(w.source, w.target, skill);
        expect(w.target.effects.STUN.remaining).toBeGreaterThan(0);
        expect(w.target.effects.SILENCE.remaining).toBe(0);
    });
    it('亂數大挑最後一個，另一個不套', () => {
        setRandomSource(() => 0.999);
        const w = arena();
        w.hit(w.source, w.target, skill);
        expect(w.target.effects.SILENCE.remaining).toBeGreaterThan(0);
        expect(w.target.effects.STUN.remaining).toBe(0);
    });
});

describe('CHAIN：打中後跳到下一個', () => {
    const skill = (jumps: number) => withHit([{ action: 'CHAIN', jumps, radius: 2, falloff: 0.5 }]);
    const lost = (a: Agent) => HP - a.hp;

    it('對照組：沒有這個動作，旁邊的人不掉血', () => {
        const w = arena();
        const near = w.spawn(Team.RED, 2, 0);
        w.hit(w.source, w.target, makeSkill({}));
        expect(lost(near)).toBe(0);
    });
    it('跳到半徑內的敵人，威力乘 falloff；半徑外的和友軍不受影響', () => {
        const base = arena();
        const plain = base.hit(base.source, base.target, makeSkill({}));
        const w = arena();
        const near = w.spawn(Team.RED, 2, 0);
        const far = w.spawn(Team.RED, 6, 0);
        const ally = w.spawn(Team.BLUE, 1, 1);
        w.hit(w.source, w.target, skill(1));
        expect(Math.abs(lost(near) - plain / 2)).toBeLessThanOrEqual(1);
        expect(lost(far)).toBe(0);
        expect(lost(ally)).toBe(0);
    });
    it('連跳：每跳再乘一次；同一個人不打第二次', () => {
        const base = arena();
        const plain = base.hit(base.source, base.target, makeSkill({}));
        const w = arena();
        const second = w.spawn(Team.RED, 2, 0);
        const third = w.spawn(Team.RED, 4, 0);
        const direct = w.hit(w.source, w.target, skill(5));
        expect(direct).toBe(plain);
        expect(Math.abs(lost(second) - plain / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(lost(third) - plain / 4)).toBeLessThanOrEqual(1);
    });
    it('多段命中只在第一段跳', () => {
        const w = arena();
        const near = w.spawn(Team.RED, 2, 0);
        w.exec.resolveHit(w.source, w.target, skill(1), undefined, w.engine, false, { hitIndex: 1, hitCount: 3, powerScale: 1 / 3 });
        expect(lost(near)).toBe(0);
    });
});

describe('LINE_THROUGH：穿過目標打後面的人', () => {
    const skill = withHit([{ action: 'LINE_THROUGH', tiles: 3, falloff: 0.5 }]);
    const lost = (a: Agent) => HP - a.hp;

    it('對照組：沒有這個動作，後面的人不掉血', () => {
        const w = arena();
        const behind = w.spawn(Team.RED, 3, 0);
        w.hit(w.source, w.target, makeSkill({}));
        expect(lost(behind)).toBe(0);
    });
    it('打到直線上 tiles 格內的敵人，線外、太遠、友軍不受影響', () => {
        const base = arena();
        const plain = base.hit(base.source, base.target, makeSkill({}));
        const w = arena();
        const behind = w.spawn(Team.RED, 3, 0);
        const beyond = w.spawn(Team.RED, 6, 0);
        const offLine = w.spawn(Team.RED, 2, 2);
        const ally = w.spawn(Team.BLUE, 2, 0);
        w.hit(w.source, w.target, skill);
        expect(Math.abs(lost(behind) - plain / 2)).toBeLessThanOrEqual(1);
        expect(lost(beyond)).toBe(0);
        expect(lost(offLine)).toBe(0);
        expect(lost(ally)).toBe(0);
    });
});

describe('SWAP：和目標交換位置', () => {
    it('對照組：沒有這個動作，位置不變', () => {
        const w = arena();
        w.hit(w.source, w.target, makeSkill({}));
        expect([w.source.q, w.target.q]).toEqual([0, 1]);
    });
    it('互換，格子佔用也跟著換', () => {
        const w = arena();
        const far = w.spawn(Team.RED, 4, 0);
        w.hit(w.source, far, withHit([{ action: 'SWAP' }]));
        expect([w.source.q, w.source.r]).toEqual([4, 0]);
        expect([far.q, far.r]).toEqual([0, 0]);
        expect(w.engine.getAgentAt(4, 0)).toBe(w.source);
        expect(w.engine.getAgentAt(0, 0)).toBe(far);
    });
});

describe('出手動作：不管瞬發、投射物、天降都會生效', () => {
    /** 真的走施法流程：前搖走完就出手 */
    const cast = (w: ReturnType<typeof arena>, source: Agent, target: Agent, skill: Skill) => {
        const combat = new CombatSystem();
        source.skills = [skill];
        source.curCDs = [0];
        source.target = target;
        source.targetHex = null;
        combat.initiateCast(source, 0, w.engine);
        combat.update(5, w.engine);
    };

    it('BLINK：落在目標身邊，比目標更遠', () => {
        const w = arena();
        const far = w.spawn(Team.RED, 3, 0);
        cast(w, w.source, far, makeSkill({ onCast: [{ action: 'BLINK' }] }));
        expect(HexUtils.dist(w.source, far)).toBe(1);
        expect(HexUtils.dist(w.source, { q: 0, r: 0 })).toBe(4);
    });
    it('BLINK：天降類在落下前就移動了', () => {
        const w = arena();
        const far = w.spawn(Team.RED, 3, 0);
        cast(w, w.source, far, { ...skillById('wb_u1'), cost: 0 });
        expect(HexUtils.dist(w.source, far)).toBe(1);
        expect(far.hp).toBe(HP);
    });
    it('RETREAT：往遠離目標的方向走 tiles 格；投射物技能也會', () => {
        const w = arena();
        const near = w.spawn(Team.RED, 4, 0);
        const shooter = w.spawn(Team.BLUE, 3, 0);
        cast(w, shooter, near, makeSkill({ projectileSpeed: 300, onCast: [{ action: 'RETREAT', tiles: 2 }] }));
        expect(HexUtils.dist(shooter, near)).toBe(3);
    });
    it('RETREAT：後面被擋住就走到擋住為止，不會穿過去', () => {
        const w = arena();
        const near = w.spawn(Team.RED, 4, 0);
        const shooter = w.spawn(Team.BLUE, 3, 0);
        for (const [q, r] of [[2, 0], [2, 1], [3, -1], [3, 1], [4, -1]]) w.spawn(Team.BLUE, q, r);
        cast(w, shooter, near, makeSkill({ onCast: [{ action: 'RETREAT', tiles: 2 }] }));
        expect([shooter.q, shooter.r]).toEqual([3, 0]);
    });
    it('DASH：投射物技能也會衝', () => {
        const w = arena();
        const shooter = w.spawn(Team.BLUE, 0, 2);
        const far = w.spawn(Team.RED, 4, 2);
        cast(w, shooter, far, makeSkill({ projectileSpeed: 300, onCast: [{ action: 'DASH' }] }));
        expect(HexUtils.dist(shooter, far)).toBe(1);
    });
});

describe('陷阱：敵人走進來才觸發', () => {
    const trapSkill = makeSkill({
        id: 'm_trap', type: 'AOE', aoeRadius: 1,
        onImpact: [{ action: 'HAZARD', kind: 'ICE', duration: 8, onEnter: [{ action: 'STATUS', status: 'ROOT', duration: 2 }] }],
    });
    const place = (w: ReturnType<typeof arena>, q: number, r: number) =>
        runImpactActions(w.source, trapSkill, [{ q, r }], { q, r }, w.engine);
    const tick = (w: ReturnType<typeof arena>) => w.engine.hazardSystem.update(1 / 30, w.engine);

    it('對照組：沒人踩，放下去不會定身誰', () => {
        const w = arena();
        place(w, 4, 0);
        tick(w);
        expect(w.target.effects.ROOT.remaining).toBe(0);
    });
    it('敵人站到格子上就定身', () => {
        const w = arena();
        place(w, 1, 0);
        tick(w);
        expect(w.target.effects.ROOT.remaining).toBeGreaterThan(0);
    });
    it('同一個人只觸發一次', () => {
        const w = arena();
        place(w, 1, 0);
        tick(w);
        w.target.effects.ROOT.remaining = 0;
        tick(w);
        expect(w.target.effects.ROOT.remaining).toBe(0);
    });
    it('友軍踩到不觸發', () => {
        const w = arena();
        place(w, 0, 0);
        tick(w);
        expect(w.source.effects.ROOT.remaining).toBe(0);
    });
    it('rb_a4 冰霜陷阱是真的陷阱', () => {
        const a = skillById('rb_a4').onImpact?.[0];
        expect(a?.onEnter).toContainEqual({ action: 'STATUS', status: 'ROOT', duration: 2.5 });
        expect(skillById('rb_a4').onHit).toBeUndefined();
    });
});

describe('強制位移：力道 2 以上一定推得動，職業決定少幾格', () => {
    const push = (role: Role, force: number) => {
        const w = arena();
        const unit = w.spawn(Team.RED, 2, 0, role);
        const before = { q: unit.q, r: unit.r };
        CCManager.applyCC(w.source, unit, makeSkill({}), 'KNOCKBACK', 0, force, undefined, w.engine);
        return HexUtils.dist(before, unit);
    };
    it.each([
        [Role.MAGE, 3, 3], [Role.RANGER, 3, 3], [Role.SUPPORT, 3, 3], [Role.WARRIOR, 3, 2], [Role.TANK, 3, 1],
        [Role.WARRIOR, 2, 1], [Role.TANK, 2, 1], [Role.MAGE, 2, 2],
        [Role.TANK, 1, 0], [Role.WARRIOR, 1, 0], [Role.MAGE, 1, 1],
    ])('%s 被力道 %i 推 %i 格', (role, force, tiles) => {
        expect(push(role, force)).toBe(tiles);
    });
});

describe('機動槽：AI 照技能宣告的條件施放', () => {
    /** 只有機動技的單位，對著不動的敵人跑一段時間 */
    const scene = (skill: Skill, q: number, rooted?: (unit: Agent) => void) => {
        const w = arena(q);
        const basic = makeSkill({ id: 'm_basic', tag: 'BASIC', range: 1, power: 1, cd: 99 });
        w.engine.skillDB = [...w.engine.skillDB, skill, basic];
        const unit = w.source;
        const enemy = w.target;
        unit.skillIds = [null, null, basic.id, skill.id];
        enemy.skillIds = [null, null, null, null];
        w.engine.play();
        for (const a of [unit, enemy]) {
            a.spawnTimer = 0;
            a.moveSpeed = 0;
        }
        rooted?.(unit);
        let casts = 0;
        for (let t = 0; t < 1.5; t += 1 / 30) {
            w.engine.tick(1 / 30);
            if (unit.castingSkillIdx === 3) casts++;
        }
        return { unit, enemy, casts };
    };
    const gap = makeSkill({
        id: 'm_gap', tag: 'MOBILITY', range: 5, cast: 0.2, cd: 30, power: 10, onCast: [{ action: 'DASH' }],
        activation: { targetBeyond: 1 }, intents: ['GAP_CLOSE'],
    });
    const escape = makeSkill({
        id: 'm_esc', tag: 'MOBILITY', range: 4, cast: 0.2, cd: 30, power: 10, onCast: [{ action: 'RETREAT', tiles: 3 }],
        activation: { enemyWithin: 2 }, intents: ['ESCAPE'],
    });

    it('突進：目標在射程內才放，放完貼身', () => {
        const r = scene(gap, 4);
        expect(r.casts).toBeGreaterThan(0);
        expect(HexUtils.dist(r.unit, r.enemy)).toBe(1);
    });
    it('突進：貼身不放（對照組）', () => {
        expect(scene(gap, 1).casts).toBe(0);
    });
    it('逃生：敵人靠近才放，放完拉開距離', () => {
        const r = scene(escape, 1);
        expect(r.casts).toBeGreaterThan(0);
        expect(HexUtils.dist(r.unit, r.enemy)).toBeGreaterThan(1);
    });
    it('逃生：沒人靠近不放（對照組）', () => {
        expect(scene(escape, 4).casts).toBe(0);
    });
    it('定身時不能放位移技', () => {
        expect(scene(escape, 1, (u) => { u.effects.ROOT.remaining = 99; }).casts).toBe(0);
    });
});

describe('技能自己宣告要打誰', () => {
    it('HIGHEST_HP：打血最多的，不打眼前殘血的', () => {
        const w = arena();
        const big = w.spawn(Team.RED, 3, 0);
        w.target.hp = 100;
        big.hp = HP;
        w.source.target = w.target;
        const skill = makeSkill({ range: 9, power: 1000, targetPreference: 'HIGHEST_HP' });
        expect(w.engine.calculateOptimalTarget(w.source, skill).targetAgent).toBe(big);
    });
    it('對照組：沒宣告就黏著現在的目標', () => {
        const w = arena();
        const big = w.spawn(Team.RED, 3, 0);
        w.target.hp = 100;
        big.hp = HP;
        w.source.target = w.target;
        w.source.targetLockUntil = 999;
        const skill = makeSkill({ range: 9, power: 1000 });
        expect(w.engine.calculateOptimalTarget(w.source, skill).targetAgent).toBe(w.target);
    });
    it('minTargets：範圍內人不夠不放', () => {
        const skill = makeSkill({ range: 0, type: 'AOE', aoeRadius: 5, power: 100, activation: { minTargets: 2 } });
        const one = arena();
        expect(one.engine.calculateOptimalTarget(one.source, skill).targetHex).toBeNull();
        const two = arena();
        two.spawn(Team.RED, 2, 0);
        expect(two.engine.calculateOptimalTarget(two.source, skill).targetHex).not.toBeNull();
    });
});

describe('機動技能池', () => {
    const mobility = DEFAULT_SKILL_DB.filter((s) => s.tag === 'MOBILITY');
    const HARD: readonly string[] = ['STUN', 'POLYMORPH', 'FEAR', 'BANISH', 'ROOT'];

    it.each(Object.values(Role).flatMap((role) => [Team.BLUE, Team.RED].map((team) => [role, team] as const)))('%s 隊伍 %s 有兩招', (role, team) => {
        expect(mobility.filter((s) => s.role === role && s.team === team).length).toBe(2);
    });
    it('不花魔力、回 10 魔、有意圖與施放條件、不帶硬控、有視覺', () => {
        expect(mobility.length).toBe(20);
        for (const s of mobility) {
            expect(s.cost, s.id).toBe(0);
            expect(s.gain, s.id).toBe(10);
            expect(s.intents?.length, s.id).toBeGreaterThan(0);
            expect(s.activation, s.id).toBeDefined();
            for (const a of [...(s.onHit ?? []), ...(s.onEnd ?? [])]) {
                if (a.action === 'STATUS') expect(HARD, s.id).not.toContain(a.status);
            }
            expect(ACTIVE_VISUALS[s.id], s.id).toBeDefined();
        }
    });
    it('單位開局就有自己職業的機動技，大逃殺也一樣', () => {
        for (const factions of [2, 4]) {
            const engine = new GameEngine();
            engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { factions, unitsPerFaction: 1 } });
            const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, HP, Role.MAGE);
            const s = DEFAULT_SKILL_DB.find((x) => x.id === a?.skillIds[3]);
            expect(s?.tag).toBe('MOBILITY');
            expect(s?.role).toBe(Role.MAGE);
        }
    });

    const exp = (id: string, want: Partial<Skill>) => [id, want] as [string, Partial<Skill>];
    const st = (status: string, duration?: number, force?: number) => ({ action: 'STATUS', status, ...(duration !== undefined ? { duration } : {}), ...(force !== undefined ? { force } : {}) });
    const gapBeyond = { targetBeyond: 1 };
    const near = { enemyWithin: 2 };
    const touching = { enemyWithin: 1 };
    it.each([
        exp('wb_m1', { range: 5, cd: 6.5, onCast: [{ action: 'DASH' }], onHit: [st('SLOW', 1.5, 0.4)] as HitAction[], intents: ['GAP_CLOSE'], activation: gapBeyond }),
        exp('wb_m2', { range: 4, cd: 7.5, onHit: [st('PULL', undefined, 3)] as HitAction[], intents: ['HOOK'], activation: gapBeyond }),
        exp('wr_m1', { range: 5, cd: 7, type: 'AOE', aoeRadius: 1, onCast: [{ action: 'DASH' }], intents: ['GAP_CLOSE'], activation: gapBeyond }),
        exp('wr_m2', { range: 4, cd: 7.5, onHit: [st('PULL', undefined, 3)] as HitAction[], intents: ['HOOK'], activation: gapBeyond }),
        exp('tb_m1', { range: 5, cd: 8, onHit: [st('PULL', undefined, 4), st('TAUNT', 1.5)] as HitAction[], intents: ['HOOK'], activation: gapBeyond }),
        exp('tb_m2', { range: 0, cd: 7.5, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], intents: ['PEEL'], activation: touching }),
        exp('tr_m1', { range: 6, cd: 8, onHit: [st('PULL', undefined, 4)] as HitAction[], intents: ['HOOK'], activation: gapBeyond }),
        exp('tr_m2', { range: 0, cd: 7.5, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], intents: ['PEEL'], activation: touching }),
        exp('rb_m1', { range: 4, cd: 7.5, onCast: [{ action: 'RETREAT', tiles: 3 }], onHit: [st('BLIND', 1.8)] as HitAction[], intents: ['ESCAPE'], activation: near }),
        exp('rb_m2', { range: 4, cd: 7, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], intents: ['PEEL'], activation: near }),
        exp('rr_m1', { range: 4, cd: 7.5, onCast: [{ action: 'RETREAT', tiles: 3 }], onHit: [st('SLOW', 1.8, 0.4)] as HitAction[], intents: ['ESCAPE'], activation: near }),
        exp('rr_m2', { range: 4, cd: 7, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], intents: ['PEEL'], activation: near }),
        exp('mb_m1', { range: 3, cd: 8.5, onCast: [{ action: 'RETREAT', tiles: 3 }], onHit: [st('SLOW', 1.5, 0.5)] as HitAction[], intents: ['ESCAPE'], activation: near }),
        exp('mb_m2', { range: 0, cd: 8, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3), st('SLOW', 2, 0.5)] as HitAction[], intents: ['PEEL'], activation: touching }),
        exp('mr_m1', { range: 3, cd: 8.5, onCast: [{ action: 'RETREAT', tiles: 3 }], onHit: [st('SLOW', 1.5, 0.5)] as HitAction[], intents: ['ESCAPE'], activation: near }),
        exp('mr_m2', { range: 0, cd: 8, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3), st('SLOW', 2, 0.5)] as HitAction[], intents: ['PEEL'], activation: touching }),
        exp('sb_m1', { range: 0, cd: 8.5, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], onEnd: [st('HASTE', 3, 35)] as EndAction[], intents: ['PEEL'], activation: touching }),
        exp('sb_m2', { range: 3, cd: 8.5, onCast: [{ action: 'RETREAT', tiles: 2 }], onEnd: [st('SHIELD', undefined, 180)] as EndAction[], intents: ['ESCAPE'], activation: near }),
        exp('sr_m1', { range: 0, cd: 8.5, type: 'AOE', aoeRadius: 1, onHit: [st('KNOCKBACK', undefined, 3)] as HitAction[], onEnd: [st('HASTE', 3, 35)] as EndAction[], intents: ['PEEL'], activation: touching }),
        exp('sr_m2', { range: 3, cd: 8.5, onCast: [{ action: 'RETREAT', tiles: 2 }], onEnd: [st('SHIELD', undefined, 180)] as EndAction[], intents: ['ESCAPE'], activation: near }),
    ])('%s', (id, want) => {
        expect(skillById(id)).toMatchObject(want);
    });
});

describe('補位與調整的技能資料', () => {
    const st = (status: string, duration?: number, force?: number) => ({ action: 'STATUS', status, ...(duration !== undefined ? { duration } : {}), ...(force !== undefined ? { force } : {}) });
    it('主動技仍然每職業每隊 5 招', () => {
        for (const role of Object.values(Role)) {
            for (const team of [Team.BLUE, Team.RED]) {
                expect(DEFAULT_SKILL_DB.filter((s) => s.tag === 'ACTIVE' && s.role === role && s.team === team).length).toBe(5);
            }
        }
    });
    it.each([
        ['wb_a2', { range: 1, power: 175, onHit: [st('VULNERABLE', 4), st('SLOW', 2.5, 0.4)] }],
        ['wb_a5', { hits: { count: 3, interval: 0.1 }, onHit: [{ action: 'MANA_BURN', value: 35 }] }],
        ['wr_a3', { range: 0, type: 'AOE', aoeRadius: 2, onHit: [{ action: 'VAMP', value: 0.5 }, st('VULNERABLE', 3.5)] }],
        ['tb_a1', { range: 0, type: 'SINGLE', power: 0, onEnd: [st('SHIELD', undefined, 450), st('HASTE', 3.5, 35)] }],
        ['tb_a4', { range: 0, type: 'AOE', aoeRadius: 2, onHit: [st('BLIND', 2.5), st('SLOW', 3, 0.5)] }],
        ['tr_a1', { range: 0, type: 'AOE', aoeRadius: 2, onHit: [st('VULNERABLE', 3.5), st('DOT', 4, 35)] }],
        ['rb_a3', { range: 7, power: 180, hits: { count: 3, interval: 0.1 }, onHit: [st('BLIND', 2.5), st('SLOW', 2, 0.4)] }],
        ['rr_a2', { range: 7, power: 190, onHit: [st('VULNERABLE', 4), st('DOT', 3, 25)] }],
        ['rr_a3', { range: 7, power: 140, onHit: [st('ROOT', 2.8), st('DOT', 3, 25)] }],
        ['tb_b1', { onHit: [st('SLOW', 1.5, 0.35)] }],
        ['tr_b2', { range: 2, power: 75, onHit: [st('SLOW', 1.5, 0.35)] }],
        ['rb_b4', { onHit: [st('SLOW', 1.5, 0.4)] }],
        ['rr_b1', { onHit: [st('VULNERABLE', 1.5)] }],
        ['mb_u2', { aoeRadius: 3 }],
        ['mb_u3', { power: 200, activation: { minTargets: 2 } }],
        ['tb_u3', { power: 450, onEnd: [st('SHIELD', undefined, 500)] }],
        ['tb_u4', { range: 5, type: 'AOE', aoeRadius: 2, power: 520, onCast: [{ action: 'DASH' }], onHit: [st('STUN', 2)], intents: ['GAP_CLOSE'] }],
    ] as [string, Partial<Skill>][])('%s', (id, want) => {
        expect(skillById(id)).toMatchObject(want);
    });
    it('移走位移的技能不再有位移', () => {
        for (const id of ['wb_a2', 'wr_a3', 'tb_a1', 'tb_a4', 'tr_a1', 'rb_a3', 'rr_a2', 'tb_b1', 'tr_b2', 'rb_b4', 'rr_b1']) {
            expect(skillById(id).onCast, id).toBeUndefined();
            expect(skillById(id).intents, id).toBeUndefined();
        }
    });
    it.each(['tr_b2', 'tr_b5', 'wr_b1', 'mr_a3', 'rb_u1', 'wr_u1', 'rr_u1', 'mr_u3', 'sr_u3'])('單體技能 %s 不留危害區', (id) => {
        expect(skillById(id).type).toBe('SINGLE');
        expect(skillById(id).onImpact).toBeUndefined();
    });
    it.each(['rb_u3', 'mr_u2', 'rr_u1', 'rr_u4', 'wb_u3', 'mr_u3'])('單體大招 %s 打血最多的敵人', (id) => {
        expect(skillById(id).targetPreference).toBe('HIGHEST_HP');
    });
});

describe('第二包的技能資料', () => {
    const chain = (id: string, action: HitAction) => expect(skillById(id).onHit).toContainEqual(action);
    it.each([
        ['mb_b4', { action: 'CHAIN', jumps: 2, radius: 2, falloff: 0.7 }],
        ['mb_a4', { action: 'CHAIN', jumps: 2, radius: 2, falloff: 0.7 }],
        ['mr_u5', { action: 'CHAIN', jumps: 1, radius: 2, falloff: 0.5 }],
        ['rb_a2', { action: 'LINE_THROUGH', tiles: 4, falloff: 0.8 }],
        ['mb_a3', { action: 'SWAP' }],
    ] as [string, HitAction][])('%s：%j', (id, action) => chain(id, action));

    it('彈跳類是單體，才不會每個範圍目標各跳一次', () => {
        for (const id of ['mb_b4', 'mb_a4']) {
            expect(skillById(id).type).toBe('SINGLE');
            expect(skillById(id).aoeRadius).toBeUndefined();
        }
    });
    it('mb_a3 不再是突進', () => {
        expect(skillById('mb_a3').onCast).toBeUndefined();
        expect(skillById('mb_a3').intents).toBeUndefined();
    });
    it.each([
        ['wb_u5', { action: 'BLINK' }, 'GAP_CLOSE'],
        ['wb_u1', { action: 'BLINK' }, 'GAP_CLOSE'],
    ] as const)('%s 出手動作與意圖', (id, action, intent) => {
        expect(skillById(id).onCast).toContainEqual(action);
        expect(skillById(id).intents).toContain(intent);
    });
});

describe('技能描述承諾的機制真的裝上了', () => {
    const has = (id: string, action: HitAction) => expect(skillById(id).onHit).toContainEqual(action);
    it.each([
        ['wb_b2', { action: 'PIERCE', value: 0.5 }],
        ['mr_b5', { action: 'PIERCE', value: 0.5 }],
        ['rr_u1', { action: 'PIERCE', value: 1 }],
        ['wb_a4', { action: 'PIERCE', value: 1 }],
        ['wb_a4', { action: 'BREAK_SHIELD' }],
        ['rb_b3', { action: 'TRUE_STRIKE' }],
        ['wr_b5', { action: 'RAGE', value: 1 }],
        ['mr_b1', { action: 'RANDOM_POWER', min: 0.5, max: 1.5 }],
        ['sb_b4', { action: 'DISPEL', polarity: 'DEBUFF' }],
        ['sr_b4', { action: 'SELF_DAMAGE', value: 30 }],
        ['tb_b2', { action: 'CHANCE', chance: 0.3, then: [{ action: 'STATUS', status: 'STUN', duration: 0.5 }] }],
        ['rb_b2', { action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.3 }],
        ['mb_b3', { action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.3 }],
        ['mr_b4', { action: 'STATUS', status: 'VULNERABLE', duration: 1.5 }],
        ['sr_a4', { action: 'STATUS', status: 'VULNERABLE', duration: 3 }],
    ] as [string, HitAction][])('%s：%j', (id, action) => has(id, action));

    it('wr_b5 不再是斬殺，mb_b3 不再是定身，tb_b2 的暈眩不再必中', () => {
        expect(skillById('wr_b5').onHit).not.toContainEqual({ action: 'EXECUTE', value: 1.25 });
        expect(skillById('mb_b3').onHit).not.toContainEqual({ action: 'STATUS', status: 'ROOT', duration: 0.5 });
        expect(skillById('tb_b2').onHit).not.toContainEqual({ action: 'STATUS', status: 'STUN', duration: 0.5 });
    });

    it('sr_b3 隨機給一種負面', () => {
        const a = skillById('sr_b3').onHit?.find((x) => x.action === 'RANDOM_OF');
        if (a?.action !== 'RANDOM_OF') throw new Error('sr_b3 has no RANDOM_OF');
        expect(a.options.map((o) => (o.action === 'STATUS' ? o.status : o.action)).sort()).toEqual(['BLIND', 'DOT', 'SLOW', 'VULNERABLE']);
    });

    it('wb_b5 防禦反擊：給自己護盾和反傷', () => {
        const statuses = (skillById('wb_b5').onEnd ?? []).map((a) => a.status);
        expect(statuses).toContain('SHIELD');
        expect(statuses).toContain('REFLECT');
    });
});
