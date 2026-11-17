import { describe, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '../../engine/game';
import { Team, Role, type Skill } from '../../types';
import { BTConditions } from '../../engine/ai/BTRegistry';
import { AGENT_FIELD_OWNERS } from '../../engine/core/AgentOwnership';
import { contractTest, pendingIf } from './contractTest';

/**
 * 契約 G2：施法目標（castTarget）和戰鬥目標（target）分開，拆掉 _savedCombatTarget。
 * 設計：docs/AI_ROYALE_DESIGN.md §10 M2；docs/plans/optimization-2026-11.md。
 */
describe('契約 G2 施法目標與戰鬥目標分開', () => {
    const scene = () => {
        const engine = new GameEngine({ audio: false });
        engine.play();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
        const ally = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500, Role.SUPPORT);
        const friend = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 500, Role.WARRIOR);
        const enemy = engine.agentManager.addAgent(engine, Team.RED, 4, 0, 500, Role.TANK);
        if (!ally || !friend || !enemy) throw new Error('addAgent failed');
        const heal: Skill = {
            id: 'test_heal', tag: 'ACTIVE', role: Role.SUPPORT, name: '測試治療',
            range: 6, cast: 0.5, cd: 5, cost: 0, gain: 0,
            type: 'SINGLE', power: -200, color: '#fff',
        };
        ally.skills[1] = heal;
        ally.target = enemy;
        return { engine, ally, friend, enemy };
    };

    contractTest('G2', '對友軍選招：target 留在敵人，castTarget 指向友軍；選不到時清掉', () => {
        const { engine, ally, friend, enemy } = scene();
        friend.hp = 200;
        expect(BTConditions['FindOptimalTarget'](ally, engine, { slot: 1 })).toBe(true);
        pendingIf('G2', ally.castTarget === null, 'FindOptimalTarget 還沒寫 castTarget');
        expect(ally.castTarget?.id).toBe(friend.id);
        expect(ally.target?.id).toBe(enemy.id);

        friend.hp = friend.maxHp;
        expect(BTConditions['FindOptimalTarget'](ally, engine, { slot: 1 })).toBe(false);
        expect(ally.castTarget).toBeNull();
        expect(ally.target?.id).toBe(enemy.id);
    });

    contractTest('G2', '對友軍施法從開始到結束，戰鬥目標都沒被換掉；施法結束後 castTarget 清空', () => {
        const { engine, ally, friend, enemy } = scene();
        friend.hp = 200;
        expect(BTConditions['FindOptimalTarget'](ally, engine, { slot: 1 })).toBe(true);
        pendingIf('G2', ally.castTarget === null, 'FindOptimalTarget 還沒寫 castTarget');
        engine.initiateCast(ally, 1);
        expect(ally.castingSkillIdx).toBe(1);
        const healedFrom = friend.hp;
        for (let i = 0; i < 90 && ally.castingSkillIdx !== -1; i++) {
            engine.combat.update(1 / 60, engine);
            expect(ally.target?.id).toBe(enemy.id);
        }
        expect(ally.castingSkillIdx).toBe(-1);
        expect(friend.hp).toBeGreaterThan(healedFrom);
        expect(ally.castTarget).toBeNull();
        expect(ally.target?.id).toBe(enemy.id);
    });

    contractTest('G2', '_savedCombatTarget 已移除（Agent 欄位與引擎程式碼都沒有）', () => {
        const root = path.resolve(__dirname, '../..');
        const hits: string[] = [];
        const walk = (dir: string) => {
            for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
                const rel = `${dir}/${ent.name}`;
                if (ent.isDirectory()) walk(rel);
                else if (/\.tsx?$/.test(ent.name) && fs.readFileSync(path.join(root, rel), 'utf8').includes('_savedCombatTarget')) hits.push(rel);
            }
        };
        walk('engine');
        pendingIf('G2', hits.length > 0, `仍提到 _savedCombatTarget：${hits.join(', ')}`);
        expect(hits).toEqual([]);
    });

    contractTest('G2', 'castTarget 登記在欄位所有權表', () => {
        const owner = AGENT_FIELD_OWNERS.castTarget;
        pendingIf('G2', owner === undefined, 'AGENT_FIELD_OWNERS 還沒有 castTarget');
        expect(owner!.owners.length).toBeGreaterThan(0);
    });
});
