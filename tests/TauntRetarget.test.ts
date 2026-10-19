import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { BTConditions } from '../engine/ai/BTRegistry';
import { CCManager } from '../engine/systems/combat/CCManager';

/**
 * P7a：嘲諷的目標鎖定只存在 TargetingSystem.updateTarget；
 * CCManager 不再直接寫 target.target，由 BT HasTarget 在 effects.TAUNT.remaining > 0 時重選。
 */
describe('Taunt retarget (state ownership P7a)', () => {
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

    const taunt = (source: ReturnType<GameEngine['agentManager']['addAgent']>, victim: NonNullable<ReturnType<GameEngine['agentManager']['addAgent']>>, dur: number) => {
        if (!source) throw new Error('addAgent failed');
        const skill = { element: 'PHYSICAL' } as Skill;
        CCManager.applyCC(source, victim, skill, 'TAUNT', dur, undefined, undefined, engine);
    };

    it('被嘲諷者切換到嘲諷者並維持鎖定，到期後釋放', () => {
        const victim = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const bystander = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 100, Role.WARRIOR);
        const taunter = engine.agentManager.addAgent(engine, Team.RED, 0, 3, 100, Role.WARRIOR);
        if (!victim || !bystander || !taunter) throw new Error('addAgent failed');

        victim.target = bystander;
        taunt(taunter, victim, 2);
        // CCManager 自己不寫目標
        expect(victim.target).toBe(bystander);
        expect(victim.effects.TAUNT.remaining).toBeGreaterThan(0);

        // BT HasTarget 發現目標不是嘲諷者 → 交給 TargetingSystem 重選
        expect(BTConditions['HasTarget'](victim, engine, {})).toBe(true);
        expect(victim.target).toBe(taunter);
        // 持續維持（即使近身敵人比較划算）
        expect(BTConditions['HasTarget'](victim, engine, {})).toBe(true);
        expect(victim.target).toBe(taunter);

        // 到期釋放：不再被鎖定，可選回其他目標
        victim.effects.TAUNT.remaining = 0;
        victim.effects.TAUNT.sourceId = null;
        engine.updateTarget(victim);
        expect(victim.target).toBe(bystander);
    });

    it('嘲諷者死亡後鎖定失效，改選其他敵人', () => {
        const victim = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const bystander = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 100, Role.WARRIOR);
        const taunter = engine.agentManager.addAgent(engine, Team.RED, 0, 3, 100, Role.WARRIOR);
        if (!victim || !bystander || !taunter) throw new Error('addAgent failed');
        taunt(taunter, victim, 5);
        BTConditions['HasTarget'](victim, engine, {});
        expect(victim.target).toBe(taunter);
        taunter.hp = 0;
        BTConditions['HasTarget'](victim, engine, {});
        expect(victim.target).toBe(bystander);
    });
});
