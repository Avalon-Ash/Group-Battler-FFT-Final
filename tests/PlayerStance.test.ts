import { describe, it, expect } from 'vitest';
import { captureMatch, restoreMatch } from '../engine/core/MatchSnapshot';
import { buildBattle, emit, runTicks } from './contracts/simState';

/**
 * PLAY P7：玩家單位沒有指令時的姿態。COUNTER＝被打了就去打最後打自己的敵人（PLAY_PARAM.COUNTER_LEASH_HEX 內）；
 * HOLD＝原地堅守（契約 G3，預設）。手動模式的玩家單位不受影響。
 */
const setup = (seed: number) => {
    const e = buildBattle('TEAMS', seed);
    emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const hero = e.agents.find((a) => a.side === 0);
    if (!hero) throw new Error('沒有藍方單位');
    emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
    return { e, hero };
};

describe('玩家單位的姿態（PLAY P7）', () => {
    it('SET_STANCE 只收玩家單位；預設 HOLD；開戰快照帶得走', () => {
        const { e, hero } = setup(71);
        expect(hero.stance).toBe('HOLD');
        const ai = e.agents.find((a) => a.controller === 'AI');
        if (!ai) throw new Error('沒有 AI 單位');
        emit(e, { type: 'SET_STANCE', agentId: ai.id, stance: 'COUNTER' });
        expect(ai.stance).toBe('HOLD');
        emit(e, { type: 'SET_STANCE', agentId: hero.id, stance: 'COUNTER' });
        expect(hero.stance).toBe('COUNTER');
        const snap = captureMatch(e);
        expect(snap.units.find((u) => u.id === hero.id)?.stance).toBe('COUNTER');
        emit(e, { type: 'SET_STANCE', agentId: hero.id, stance: 'HOLD' });
        restoreMatch(e, snap);
        expect(e.agents.find((a) => a.id === hero.id)?.stance).toBe('COUNTER');
    });

    it('COUNTER：被打後會離開原地去打攻擊者；HOLD：同一場一步都不走', () => {
        const run = (stance: 'HOLD' | 'COUNTER') => {
            const { e, hero } = setup(73);
            emit(e, { type: 'SET_STANCE', agentId: hero.id, stance });
            emit(e, { type: 'START_GAME', seed: 9 });
            let hitBy: string | null = null;
            let chasedAttacker = false;
            let walked = false;
            runTicks(e, 1200, () => {
                if (hero.hp <= 0) return;
                // 自己起步才算（擊退之類的強制位移不設 isMoving，契約 G3 同一個判斷）
                if (hero.isMoving || hero.path.length > 0) walked = true;
                if (hero.lastHitSourceId && !hitBy) hitBy = hero.lastHitSourceId;
                if (hitBy && hero.target?.id === hitBy && hero.isMoving) chasedAttacker = true;
            });
            return { hitBy, chasedAttacker, walked };
        };
        const counter = run('COUNTER');
        const hold = run('HOLD');
        // 前提：這一場主角被不在身邊的敵人打到（種子 73：攻擊者在 3 格外；貼身的攻擊者原地就打得到，驗不到追擊）
        expect(counter.hitBy).not.toBeNull();
        expect(counter.chasedAttacker).toBe(true);
        expect(hold.walked).toBe(false);
    }, 60000);
});
