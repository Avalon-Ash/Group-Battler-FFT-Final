import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { stepSimulation } from '../engine/core/Replay';
import { sameSide } from '../engine/core/Allegiance';
import { Team, Role, type Skill } from '../types';
import type { Agent } from '../engine/core/Agent';

/**
 * 契約 G2 的整場版本：契約只推進 combat.update，這裡連行為樹一起跑（stepSimulation），
 * 確認前搖中照常重跑的選招（這時已選不到人）不會把施放中的治療換人或清掉，戰鬥目標也從不變成友軍。
 */
describe('施法目標與戰鬥目標分開（完整 tick）', () => {
    it('對友軍治療從選招、前搖到結算：施法目標固定、戰鬥目標始終是敵人', () => {
        const engine = new GameEngine({ audio: false });
        engine.play();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
        const ally = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
        const friend = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.WARRIOR);
        const enemy = engine.agentManager.addAgent(engine, Team.RED, 5, 0, 500, Role.TANK);
        if (!ally || !friend || !enemy) throw new Error('addAgent failed');
        const heal: Skill = {
            id: 'test_heal', tag: 'ACTIVE', role: Role.SUPPORT, name: '測試治療',
            range: 6, cast: 0.5, cd: 5, cost: 0, gain: 0,
            type: 'SINGLE', power: -200, color: '#fff',
        };
        ally.skills[1] = heal;
        friend.hp = 200;

        let castFrozenAt: Agent | null | undefined;
        let healCasts = 0;
        let healed = false;
        let lastFriendHp = friend.hp;
        for (let i = 0; i < 600 && engine.isRunning && !healed; i++) {
            const wasCasting = ally.castingSkillIdx === 1;
            stepSimulation(engine);
            if (ally.target) expect(sameSide(ally.target, ally)).toBe(false);
            if (ally.castingSkillIdx === 1) {
                if (!wasCasting) {
                    castFrozenAt = ally.castTarget;
                    healCasts++;
                    // 前搖一開始就把友軍補到治療門檻以上：前搖中重跑的選招會選不到人，施法目標仍不得被清掉
                    friend.hp = friend.maxHp - 1;
                    lastFriendHp = friend.hp;
                }
                expect(ally.castTarget).toBe(castFrozenAt);
            }
            if (friend.hp > lastFriendHp) healed = true;
            lastFriendHp = friend.hp;
        }
        expect(healCasts).toBeGreaterThan(0);
        expect(castFrozenAt?.id).toBe(friend.id);
        expect(healed).toBe(true);
    });
});
