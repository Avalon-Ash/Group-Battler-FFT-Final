import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { Role } from '../types';
import { MatchFlowSystem } from '../engine/systems/match/MatchFlowSystem';
import { DT, emit } from './contracts/simState';

/**
 * PLAY 模式（docs/plans/play-mode.md P1）契約以外的規則：主角陣亡後這一場照打完，導播交回自己選主角。
 */
describe('PLAY：主角陣亡後觀戰到結束', () => {
    it('主角倒下不結束對局；導播改跟別人；最後照常分出勝負', () => {
        const e = new GameEngine({ audio: false });
        let seed = 900;
        const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
        flow.startPlay({ role: Role.SUPPORT });
        const heroId = flow.playHeroId;
        expect(heroId).not.toBeNull();
        const hero = e.agents.find((a) => a.id === heroId);
        if (!hero) throw new Error('沒有主角');
        expect(e.battleStarted).toBe(true);

        // 跑一下讓導播先框在主角身上，再讓主角倒下
        for (let i = 0; i < 60; i++) { flow.update(DT); e.tick(DT); }
        expect(e.state.director.targetId).toBe(hero.id);
        emit(e, { type: 'EDIT_AGENT', agentId: hero.id, hp: 0 });
        for (let i = 0; i < 120; i++) { flow.update(DT); e.tick(DT); }
        expect(hero.hp).toBeLessThanOrEqual(0);
        expect(flow.phase).toBe('PLAYING');
        expect(e.agents.some((a) => a.side === hero.side && a !== hero && a.hp > 0)).toBe(true);
        expect(e.state.director.targetId).not.toBe(hero.id);

        for (let i = 0; i < 60 * 60 * 20 && flow.phase !== 'RESULT_HOLD'; i++) {
            flow.update(DT);
            if (e.isRunning) e.tick(DT);
        }
        expect(flow.phase).toBe('RESULT_HOLD');
        expect(flow.isPlay).toBe(true);
    }, 60000);
});
