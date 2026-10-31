import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team } from '../types';

describe('BattleRoyale', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        // 清除測試座標上的障礙物，確保可放置
        for (const [q, r] of [[0, 0], [1, 0], [2, 0]]) {
            engine.map.removeObstacle(q, r);
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('支援 PLACE_AGENT 帶 side 寫入，並依 side 判定勝負與記錄 winnerId', () => {
        // ① 3 個單位用 PLACE_AGENT 帶 side 0、1、2（其中兩個 team 相同），side 都寫進去
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.BLUE,
            q: 0,
            r: 0,
            side: 0,
        });
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.BLUE,
            q: 1,
            r: 0,
            side: 1,
        });
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.RED,
            q: 2,
            r: 0,
            side: 2,
        });

        expect(engine.agents).toHaveLength(3);
        const agent0 = engine.agents[0];
        const agent1 = engine.agents[1];
        const agent2 = engine.agents[2];

        expect(agent0.side).toBe(0);
        expect(agent1.side).toBe(1);
        expect(agent2.side).toBe(2);
        expect(agent0.team).toBe(Team.BLUE);
        expect(agent1.team).toBe(Team.BLUE);
        expect(agent2.team).toBe(Team.RED);

        // ② 這時 VictorySystem.check 回傳 false（三方都活著）
        const contestedResult = engine.victorySystem.check(engine);
        expect(contestedResult).toBe(false);
        expect(engine.state.victory.isFinishing).toBe(false);

        // ③ 把其中兩個 hp 設 0 後 check 回傳 true，state.victory.winnerId 是剩下那個的 id、winningTeam 是它的 team
        agent0.hp = 0;
        agent1.hp = 0;
        const victoryResult = engine.victorySystem.check(engine);
        expect(victoryResult).toBe(true);
        expect(engine.state.victory.winnerId).toBe(agent2.id);
        expect(engine.state.victory.winningTeam).toBe(agent2.team);
    });

    it('④ 不帶 side 時 side === team', () => {
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.BLUE,
            q: 0,
            r: 0,
        });

        expect(engine.agents).toHaveLength(1);
        expect(engine.agents[0].side).toBe(Team.BLUE);
    });

    it('⑤ side: 1.5 的指令不生成單位', () => {
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.RED,
            q: 0,
            r: 0,
            side: 1.5,
        });

        expect(engine.agents).toHaveLength(0);
    });
});
