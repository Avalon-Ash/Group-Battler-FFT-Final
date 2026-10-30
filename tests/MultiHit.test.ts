// ╔══════════════════════════════════════════════════════════╗
// ║  tests/MultiHit.test.ts — 多段命中引擎（docs/MULTI_HIT_DESIGN.md）║
// ║  職責：排程時間點、powerScale 總和＝1、硬控一次施放只套一次、   ║
// ║  位移與 SLOW 每段都套、目標死亡跳過、施法者陣亡不取消／被放逐  ║
// ║  取消、AOE 每段重新判定範圍、護盾量依段數分攤、SLOW 續約規則    ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { CCManager } from '../engine/systems/combat/CCManager';
import { DamageCalculator } from '../engine/systems/combat/DamageCalculator';
import { syncBanished } from '../engine/systems/status/ControlSystem';
import { teleportTo } from '../engine/systems/movement/MotionCommands';
import { slowSpeedMult } from '../engine/core/Effects';
import { setRandomSource, resetRandomSource } from '../engine/math/rng';
import { HexUtils } from '../engine/utils';
import { ULT_VISUALS } from '../data/vfx/ult_visuals';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { STATUS_VISUALS } from '../data/vfx/status_visuals';

const HP = 5000;

describe('Multi-hit skills (hits → MultiHitScheduler → resolveHit)', () => {
    let engine: GameEngine;
    let executor: SkillExecutor;

    beforeEach(() => {
        setRandomSource(() => 0.5); // 不爆擊、不致盲落空
        engine = new GameEngine();
        executor = new SkillExecutor();
    });

    afterEach(() => {
        resetRandomSource();
        engine.stop();
        engine.clear();
    });

    function spawn(team: Team, q: number, r: number = 0): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, Role.WARRIOR);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP;
        a.hp = HP;
        a.shield = 0;
        a.spawnTimer = 0;
        return a;
    }

    const baseSkill: Skill = {
        id: 'test_multi', name: '多段測試', tag: 'ULT', role: Role.WARRIOR,
        range: 5, cast: 0.1, cd: 1, cost: 0, gain: 0,
        type: 'SINGLE', power: 400, color: '#fff', element: 'PHYSICAL',
        hits: { count: 4, interval: 0.5 },
    };

    const aoeSkill = (extra: Partial<Skill> = {}): Skill => ({
        ...baseSkill, type: 'AOE', range: 0, aoeRadius: 1, ...extra,
    });

    /** 把引擎時間撥到 t 並讓排程器推進（不跑整個 tick，只測排程本身）。 */
    const advanceTo = (t: number) => {
        engine.battleTime = t;
        executor.multiHit.update(engine);
    };

    const damageEventsTo = (target: Agent) =>
        engine.events.filter(e => e.type === 'DAMAGE' && e.targetId === target.id && (e.value ?? 0) > 0).length;

    describe('排程', () => {
        it('第 i 段在施放時刻＋i×interval 打出，總傷害等於單發值', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;

            executor.executeInstantSkill(caster, baseSkill, engine);
            expect(enemy.hp).toBe(HP - 100); // 第 0 段：400 ÷ 4

            advanceTo(0.49);
            expect(enemy.hp).toBe(HP - 100);
            advanceTo(0.5);
            expect(enemy.hp).toBe(HP - 200);
            advanceTo(1.0);
            expect(enemy.hp).toBe(HP - 300);
            advanceTo(1.5);
            expect(enemy.hp).toBe(HP - 400);
            advanceTo(5);
            expect(enemy.hp).toBe(HP - 400); // 排完就結束，不再打
        });

        it('各段 powerScale 加總為 1，hitIndex／hitCount 正確', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            const calls: { scale: number; index: number; count: number }[] = [];
            const orig = executor.resolveHit.bind(executor);
            executor.resolveHit = (s, t, sk, o, e, c, opts = {}) => {
                calls.push({ scale: opts.powerScale ?? 1, index: opts.hitIndex ?? 0, count: opts.hitCount ?? 1 });
                return orig(s, t, sk, o, e, c, opts);
            };

            executor.executeInstantSkill(caster, { ...baseSkill, hits: { count: 8, interval: 0.05 } }, engine);
            advanceTo(1);

            expect(calls.length).toBe(8);
            expect(calls.map(c => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
            expect(calls.every(c => c.count === 8)).toBe(true);
            expect(calls.reduce((sum, c) => sum + c.scale, 0)).toBeCloseTo(1, 10);
        });

        it('沒有 hits 的技能維持單發（不進排程）', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            executor.executeInstantSkill(caster, { ...baseSkill, hits: undefined }, engine);
            expect(enemy.hp).toBe(HP - 400);
            advanceTo(10);
            expect(enemy.hp).toBe(HP - 400);
        });

        it('每一段各自有 DAMAGE 事件（飄字）', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            executor.executeInstantSkill(caster, baseSkill, engine);
            advanceTo(2);
            expect(damageEventsTo(enemy)).toBe(4);
        });

        it('battleTime 倒退（重開戰鬥）時丟棄舊排程', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            engine.battleTime = 30;
            executor.executeInstantSkill(caster, baseSkill, engine);
            const afterFirst = enemy.hp;
            advanceTo(0.6);
            advanceTo(40);
            expect(enemy.hp).toBe(afterFirst);
        });

        it('reset 清空排程', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            executor.executeInstantSkill(caster, baseSkill, engine);
            executor.multiHit.reset();
            advanceTo(5);
            expect(enemy.hp).toBe(HP - 100);
        });
    });

    describe('硬控、位移與 SLOW', () => {
        it('硬控一次施放對每個目標只套一次（暈眩層數 1）', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            const skill: Skill = { ...baseSkill, ccType: 'STUN', ccDur: 2 };

            executor.executeInstantSkill(caster, skill, engine);
            advanceTo(2);

            expect(enemy.drStacks.stun).toBe(1);
            expect(enemy.effects.STUN.remaining).toBe(2);
            const stunEvents = engine.events.filter(e => e.type === 'CC_APPLIED' && e.text?.startsWith(STATUS_VISUALS.STUN.label));
            expect(stunEvents.length).toBe(1);
        });

        it('AOE 對多個目標：每個目標各自只套一次硬控', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const e1 = spawn(Team.RED, 1, 0);
            const e2 = spawn(Team.RED, 0, 1);
            executor.executeInstantSkill(caster, aoeSkill({ ccType: 'STUN', ccDur: 2 }), engine);
            advanceTo(2);
            expect(e1.drStacks.stun).toBe(1);
            expect(e2.drStacks.stun).toBe(1);
        });

        it('第一段落空（致盲）時，硬控在第一次打中的那段套用', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            caster.effects.BLIND.remaining = 10;
            const rolls = [0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]; // 第 0 段致盲落空，其餘命中
            let i = 0;
            setRandomSource(() => rolls[Math.min(i++, rolls.length - 1)]);

            executor.executeInstantSkill(caster, { ...baseSkill, ccType: 'STUN', ccDur: 2 }, engine);
            expect(enemy.effects.STUN.remaining).toBe(0);
            advanceTo(0.5);
            expect(enemy.effects.STUN.remaining).toBe(2);
            advanceTo(2);
            expect(enemy.drStacks.stun).toBe(1);
        });

        it('位移每段都套（拉向中心，一段一格；戰士 weight 5，力道 5 = 1 格），SLOW 每段刷新', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 3, 0);
            const skill = aoeSkill({
                aoeRadius: 3, power: 90, ccType: 'PULL', ccForce: 5, ccType2: 'SLOW', ccForce2: 0.65, ccDur2: 0.3,
                hits: { count: 3, interval: 0.2 },
            });
            const dist = () => HexUtils.dist(enemy, { q: 0, r: 0 });

            executor.executeInstantSkill(caster, skill, engine);
            expect(dist()).toBe(2);
            expect(enemy.effects.SLOW.value).toBe(0.65);
            expect(enemy.effects.SLOW.remaining).toBeCloseTo(0.3, 10);

            enemy.effects.SLOW.remaining = 0.02; // 快過期的緩速，下一段要刷新回來
            advanceTo(0.2);
            expect(dist()).toBe(1);
            expect(enemy.effects.SLOW.remaining).toBeCloseTo(0.3, 10);

            advanceTo(0.4); // 已經貼在中心旁，不穿過去
            expect(dist()).toBe(1);
            expect(enemy.hp).toBeLessThan(HP);
        });

        it('SLOW：續約取較長時間與較大減速，過期後不留舊值，不吃遞減', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            const slow = (dur: number, force: number) => CCManager.applyCC(caster, enemy, {} as Skill, 'SLOW', dur, force, undefined, engine);

            slow(1, 0.3);
            slow(0.5, 0.6);
            expect(enemy.effects.SLOW.remaining).toBe(1);
            expect(enemy.effects.SLOW.value).toBe(0.6);
            slow(2, 0.1);
            expect(enemy.effects.SLOW.remaining).toBe(2);
            expect(enemy.effects.SLOW.value).toBe(0.6);

            enemy.effects.SLOW.remaining = 0;
            slow(1, 0.2);
            expect(enemy.effects.SLOW.value).toBe(0.2);

            for (let n = 0; n < 6; n++) slow(1, 0.5);
            expect(enemy.effects.SLOW.remaining).toBe(1); // 沒有被遞減縮短
            expect(Object.keys(enemy.drStacks)).toEqual([]);
        });

        it('移動速度取 SLOW 與危害倍率中較慢者（不寫進 moveSpeedMult）', () => {
            const mover = (q: number) => {
                const a = spawn(Team.RED, q, 3);
                a.path = [{ q: q, r: 4 }, { q: q, r: 5 }];
                a.moveSpeedMult = 1;
                a.moveProgress = 0;
                return a;
            };
            const plain = mover(-3);
            const slowed = mover(-1);
            const slowedAndIce = mover(1);
            const hostile = spawn(Team.BLUE, 0, 0);
            CCManager.applyCC(hostile, slowed, {} as Skill, 'SLOW', 5, 0.65, undefined, engine);
            CCManager.applyCC(hostile, slowedAndIce, {} as Skill, 'SLOW', 5, 0.2, undefined, engine);
            engine.state.spatialHazards.push({
                id: 'ice', type: 'ICE', cells: [{ q: 1, r: 3 }], duration: 10, sourceId: 'x', team: Team.BLUE,
                color: '#fff', power: 0, tickInterval: 1, lastTickTime: 0,
            });

            engine.movement.updateMovement(plain, 0.1, engine);
            engine.movement.updateMovement(slowed, 0.1, engine);
            engine.movement.updateMovement(slowedAndIce, 0.1, engine);

            expect(slowSpeedMult(slowed)).toBeCloseTo(0.35, 10);
            expect(slowed.moveProgress / plain.moveProgress).toBeCloseTo(0.35, 6);
            // SLOW 0.2 → 0.8 倍，ICE 0.5 倍：取 0.5
            expect(slowedAndIce.moveProgress / plain.moveProgress).toBeCloseTo(0.5, 6);
            expect(slowed.moveSpeedMult).toBe(1);
        });

        it('護盾量依段數分攤：全部段數加起來等於單發的量', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const ally = spawn(Team.BLUE, 1, 0);
            const skill = aoeSkill({ power: -400, ccType: 'SHIELD', ccForce: 400, hits: { count: 8, interval: 0.1 }, aoeRadius: 2 });
            ally.hp = 100;
            executor.executeInstantSkill(caster, skill, engine);
            advanceTo(1);
            expect(ally.shield).toBeCloseTo(400, 6);
            expect(ally.hp).toBeGreaterThan(100); // 治療也每段各自觸發
        });
    });

    describe('目標與施法者的中途變化', () => {
        it('單體鎖定原目標；目標中途死亡就跳過剩下的段', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            const bystander = spawn(Team.RED, 0, 1);
            caster.target = enemy;
            executor.executeInstantSkill(caster, baseSkill, engine);
            advanceTo(0.5);
            const before = damageEventsTo(enemy);
            enemy.hp = 0;
            advanceTo(2);
            expect(damageEventsTo(enemy)).toBe(before);
            expect(bystander.hp).toBe(HP); // 單體不會轉去打旁邊的人
        });

        it('施法者陣亡不取消已出手的段數', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            executor.executeInstantSkill(caster, baseSkill, engine);
            caster.hp = 0;
            advanceTo(2);
            expect(enemy.hp).toBe(HP - 400);
        });

        it('施法者被放逐就取消剩下的段', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            caster.target = enemy;
            executor.executeInstantSkill(caster, baseSkill, engine);
            advanceTo(0.5);
            expect(enemy.hp).toBe(HP - 200);
            caster.effects.BANISH.remaining = 3;
            syncBanished(caster);
            advanceTo(2);
            expect(enemy.hp).toBe(HP - 200);
        });

        it('AOE 每段重新判定範圍：後來走進範圍的單位會被打到，走出去的不再被打', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const leaver = spawn(Team.RED, 1, 0);
            const arriver = spawn(Team.RED, 4, 0);
            executor.executeInstantSkill(caster, aoeSkill(), engine);
            expect(leaver.hp).toBe(HP - 100);
            expect(arriver.hp).toBe(HP);

            teleportTo(leaver, 4, -2, engine);
            teleportTo(arriver, 0, 1, engine);
            advanceTo(0.5);
            expect(leaver.hp).toBe(HP - 100); // 已不在範圍內
            expect(arriver.hp).toBe(HP - 100); // 第 1 段起被打到

            advanceTo(2);
            expect(arriver.hp).toBe(HP - 300);
            expect(leaver.hp).toBe(HP - 100);
        });
    });

    describe('傷害通道與資料', () => {
        it('DamageCalculator 依 powerScale 縮放並記錄通道', () => {
            const caster = spawn(Team.BLUE, 0, 0);
            const enemy = spawn(Team.RED, 1, 0);
            const full = DamageCalculator.calculate(caster, enemy, { ...baseSkill, hits: undefined }, 0);
            const quarter = DamageCalculator.calculate(caster, enemy, baseSkill, 0, undefined, false, { powerScale: 0.25 });
            expect(full.channel).toBe('DIRECT');
            expect(Math.abs(quarter.finalValue)).toBe(Math.abs(full.finalValue) / 4);
            const periodic = DamageCalculator.calculate(caster, enemy, baseSkill, 0, undefined, false, { channel: 'PERIODIC' });
            expect(periodic.channel).toBe('PERIODIC');
        });

        it('STORM 類奧義與黑洞都有 hits；視覺表不再重複寫段數與節奏（落點讀技能資料，見 MultiHitVisuals.test.ts）', () => {
            const storms = ['wb_u4', 'rb_u2', 'rb_u5', 'mb_u4', 'sb_u3', 'sb_u5', 'wr_u2', 'wr_u4', 'rr_u3', 'rr_u5', 'mr_u5'];
            for (const id of storms) {
                const skill = DEFAULT_SKILL_DB.find(s => s.id === id);
                const visual = ULT_VISUALS[id];
                expect(skill?.hits, id).toBeDefined();
                expect(visual.archetype, id).toBe('STORM');
                expect(visual.count, id).toBeUndefined();
                expect(visual.timing, id).toBeUndefined();
            }
            const hole = DEFAULT_SKILL_DB.find(s => s.id === 'mb_u1')!;
            expect(hole.hits).toBeDefined();
            expect(hole.ccType2).toBe('SLOW');
            expect(hole.ccDur2!).toBeGreaterThan(hole.hits!.interval);
        });
    });
});
