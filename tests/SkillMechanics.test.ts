// ╔══════════════════════════════════════════════════════════╗
// ║  SkillMechanics — 動作清單裡每種機制都要真的改變戰鬥      ║
// ║  用真的引擎結算一擊，每項都有對照組（沒有這個動作時不同）。║
// ║  資料段確認技能描述承諾的機制真的裝在那一招上。            ║
// ╚══════════════════════════════════════════════════════════╝

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { CombatSystem } from '../engine/systems/combat/CombatSystem';
import { HexUtils } from '../engine/utils';
import { resetRandomSource, setRandomSource } from '../engine/math/rng';
import { isActionBlocked } from '../engine/core/Effects';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { Role, Team } from '../types';
import type { EffectKind, HitAction, Skill } from '../types';

const HP = 100000;

function makeSkill(over: Partial<Skill>): Skill {
    return {
        id: 'm_test', tag: 'ACTIVE', role: Role.WARRIOR, name: 'm_test', range: 5, cast: 0.2, cd: 1, cost: 0, gain: 0,
        type: 'SINGLE', power: 100, color: '#ffffff', visual: 'SLASH', projectileSpeed: 0, ...over,
    };
}

function arena() {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const spawn = (team: Team, q: number, r = 0) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, Role.WARRIOR);
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
    return { engine, spawn, hit, exec, source: spawn(Team.BLUE, 0, 0), target: spawn(Team.RED, 1, 0) };
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
        const far = w.spawn(Team.RED, 4, 0);
        cast(w, w.source, far, makeSkill({ projectileSpeed: 300, onCast: [{ action: 'DASH' }] }));
        expect(HexUtils.dist(w.source, far)).toBe(1);
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
        ['rb_a3', { action: 'RETREAT', tiles: 2 }, 'ESCAPE'],
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
        ['rb_b2', { action: 'STATUS', status: 'SLOW', duration: 1.5, force: 30 }],
        ['mb_b3', { action: 'STATUS', status: 'SLOW', duration: 1.5, force: 30 }],
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
