import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import { COMBAT_PARAM, TARGET_RULES } from '../constants';

/**
 * 被打回頭（TargetingSystem.updateTarget）：剛被敵人打到、而現有目標還在射程外時，改鎖定攻擊者。
 * 受擊判定靠系統自己記的上次血量（不在 Agent 上加欄位）。
 */
describe('Retaliate on hit (melee)', () => {
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

    const spawn = (team: Team, q: number, r: number) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, 100, Role.WARRIOR);
        if (!a) throw new Error('addAgent failed');
        // 戰士的普攻有 2/10 射程超過 1（隨機抽）：固定成近戰，才不會偶發失敗
        a.skills = a.skills.map(s => (s?.tag === 'BASIC' ? { ...s, range: COMBAT_PARAM.MELEE_RANGE } : s));
        return a;
    };

    it('目標在射程外、被另一個敵人打到 → 鎖定攻擊者', () => {
        const victim = spawn(Team.BLUE, 0, 0);
        const far = spawn(Team.RED, 0, 5);
        const attacker = spawn(Team.RED, 0, 2);
        victim.target = far;
        victim.targetLockUntil = engine.battleTime + 10;
        engine.updateTarget(victim);
        expect(victim.target).toBe(far);

        victim.hp -= 10;
        victim.lastHitSourceId = attacker.id;
        engine.updateTarget(victim);
        expect(victim.target).toBe(attacker);
        expect(victim.targetLockUntil).toBeCloseTo(engine.battleTime + TARGET_RULES.LOCK_S);
    });

    it('目標已在射程內 → 不轉頭', () => {
        const victim = spawn(Team.BLUE, 0, 0);
        const near = spawn(Team.RED, 0, 1);
        const attacker = spawn(Team.RED, 0, 2);
        victim.target = near;
        victim.targetLockUntil = engine.battleTime + 10;
        engine.updateTarget(victim);

        victim.hp -= 10;
        victim.lastHitSourceId = attacker.id;
        engine.updateTarget(victim);
        expect(victim.target).toBe(near);
    });

    it('沒有掉血（lastHitSourceId 只是舊紀錄）→ 不轉頭', () => {
        const victim = spawn(Team.BLUE, 0, 0);
        const far = spawn(Team.RED, 0, 5);
        const attacker = spawn(Team.RED, 0, 2);
        victim.target = far;
        victim.targetLockUntil = engine.battleTime + 10;
        victim.lastHitSourceId = attacker.id;
        engine.updateTarget(victim);
        engine.updateTarget(victim);
        expect(victim.target).toBe(far);
    });

    it('遠程單位被打 → 不轉頭（只限近戰）', () => {
        const victim = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.RANGER);
        if (!victim) throw new Error('addAgent failed');
        const far = spawn(Team.RED, 6, 0);
        const basicRange = victim.skills.find(s => s?.tag === 'BASIC')?.range;
        expect(basicRange).toBeGreaterThan(1);
        expect(basicRange).toBeLessThan(6); // 目標確實在射程外，才測得到「遠程不轉頭」
        const attacker = spawn(Team.RED, 0, 2);
        victim.target = far;
        victim.targetLockUntil = engine.battleTime + 10;
        engine.updateTarget(victim);

        victim.hp -= 10;
        victim.lastHitSourceId = attacker.id;
        engine.updateTarget(victim);
        expect(victim.target).toBe(far);
    });

    it('被嘲諷時嘲諷優先，不因受擊轉頭', () => {
        const victim = spawn(Team.BLUE, 0, 0);
        const taunter = spawn(Team.RED, 0, 6);
        const attacker = spawn(Team.RED, 0, 2);
        victim.effects.TAUNT.remaining = 5;
        victim.effects.TAUNT.sourceId = taunter.id;
        engine.updateTarget(victim);
        expect(victim.target).toBe(taunter);

        victim.hp -= 10;
        victim.lastHitSourceId = attacker.id;
        engine.updateTarget(victim);
        expect(victim.target).toBe(taunter);
    });
});
