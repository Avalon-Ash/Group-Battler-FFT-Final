import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role, NodeState } from '../types';
import { BLOCK_HEIGHT } from '../constants';
import { HexUtils } from '../engine/utils';
import { BTActions } from '../engine/ai/BTRegistry';

/**
 * 近戰追擊挑「具體的同層攻擊格」並沿用路徑（規則 R6 的射程判定不變，見 TargetingSystem.getEffectiveRange）。
 */
describe('MeleeAttackCell', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    /** 釘住射程 1 的 BASIC（addAgent 會隨機抽射程 2 的普攻）。 */
    const mk = (team: Team, q: number, r: number, role: Role) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, 500, role);
        if (!a) throw new Error(`addAgent failed @${q},${r}`);
        const basic = engine.skillDB.find(s =>
            s.role === a.role && s.tag === 'BASIC' && s.range === 1 && (s.team === undefined || s.team === a.team));
        if (!basic) throw new Error(`no melee BASIC skill for ${a.role}`);
        a.skillIds[2] = basic.id;
        a.skills[2] = basic;
        return a;
    };

    const step = (a: ReturnType<typeof mk>) => {
        a.forceAiUpdate = true;
        a.bt.tick(a);
        engine.movement.updateMovement(a, 1 / 30, engine);
    };

    it('目標在高台、只有一側鄰格與它同層：繞到同層攻擊格站定並出手', () => {
        const a = mk(Team.BLUE, -3, 0, Role.WARRIOR);
        const e = mk(Team.RED, 0, 0, Role.WARRIOR);
        a.jump = 1;
        const ledge = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 1, r: -1 }];
        for (const h of ledge) engine.map.setHeight(HexUtils.key(h), BLOCK_HEIGHT);
        a.target = e;

        let started = false;
        for (let i = 0; i < 400 && !started; i++) {
            step(a);
            started = a.castingSkillIdx !== -1 || a.curCDs.some(cd => cd > 0);
        }

        expect(started).toBe(true);
        // 站在與目標同層的鄰格上（不是低處的鄰格）
        expect(ledge.some(h => h.q === a.q && h.r === a.r)).toBe(true);
        expect(HexUtils.dist(a, e)).toBeLessThanOrEqual(engine.getEffectiveRange(a, e.q, e.r, 1));
    });

    it('攻擊格沒變時路徑沿用，不是每個 tick 重算', () => {
        const a = mk(Team.BLUE, -5, 0, Role.WARRIOR);
        const e = mk(Team.RED, 3, 0, Role.WARRIOR);
        a.target = e;
        const spy = vi.spyOn(engine.movement.pathfinder, 'findPath');

        let ticks = 0;
        for (; ticks < 120; ticks++) {
            if (BTActions['ChaseTarget'](a, engine, { slot: 2 }) !== NodeState.RUNNING) break;
            engine.movement.updateMovement(a, 1 / 30, engine);
        }

        expect(ticks).toBeGreaterThan(20); // 真的走了一段
        expect(HexUtils.dist(a, e)).toBeLessThanOrEqual(1);
        expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    });
});
