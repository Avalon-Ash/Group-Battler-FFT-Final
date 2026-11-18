import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { resolveTap } from '../engine/systems/ui/tapIntent';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { buildBattle, emit } from './contracts/simState';

/** 點擊規則（契約 G3 的輸入）：選取中的單位是玩家控制的，點擊才會變成指令。 */
const setup = () => {
    const e = buildBattle('TEAMS', 41);
    const hero = e.agents[0];
    const friend = e.agents.find((a) => a !== hero && a.side === hero.side) as Agent;
    const foe = e.agents.find((a) => a.side !== hero.side) as Agent;
    return { e, hero, friend, foe };
};
const emptyHex = (e: GameEngine) => {
    const hex = querySpawnableHexes(e).find((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r));
    if (!hex) throw new Error('沒有空格');
    return { q: hex.q, r: hex.r };
};

describe('resolveTap', () => {
    it('沒有選取、或選取的是 AI 單位：點單位選取，點空地取消選取', () => {
        const { e, hero, foe } = setup();
        expect(resolveTap(e, null, foe, foe)).toEqual({ kind: 'SELECT', agent: foe });
        expect(resolveTap(e, null, emptyHex(e), null)).toEqual({ kind: 'SELECT', agent: null });
        expect(resolveTap(e, hero, foe, foe)).toEqual({ kind: 'SELECT', agent: foe });
        expect(resolveTap(e, hero, emptyHex(e), null)).toEqual({ kind: 'SELECT', agent: null });
    });

    it('選取的是玩家單位：點敵人攻擊、點空地移動', () => {
        const { e, hero, foe } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        expect(resolveTap(e, hero, foe, foe)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id } });
        const dest = emptyHex(e);
        expect(resolveTap(e, hero, dest, null)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r } });
    });

    it('選取的是玩家單位：點自己或友軍是選取，不是指令', () => {
        const { e, hero, friend } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        expect(resolveTap(e, hero, hero, hero)).toEqual({ kind: 'SELECT', agent: hero });
        expect(resolveTap(e, hero, friend, friend)).toEqual({ kind: 'SELECT', agent: friend });
    });

    it('點到地圖外或障礙物：不動作，選取不變', () => {
        const { e, hero } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        expect(resolveTap(e, hero, null, null)).toEqual({ kind: 'NONE' });
        expect(resolveTap(e, hero, { q: 999, r: 999 }, null)).toEqual({ kind: 'NONE' });
        const wall = emptyHex(e);
        emit(e, { type: 'SET_OBSTACLE', q: wall.q, r: wall.r, obstacleType: 'WALL' });
        expect(resolveTap(e, hero, wall, null)).toEqual({ kind: 'NONE' });
    });

    it('玩家單位陣亡、或這一場已分出勝負：不下指令', () => {
        const { e, hero, foe } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        e.state.victory.isFinishing = true;
        expect(resolveTap(e, hero, foe, foe)).toEqual({ kind: 'SELECT', agent: foe });
        e.state.victory.isFinishing = false;
        hero.hp = 0;
        expect(resolveTap(e, hero, foe, foe)).toEqual({ kind: 'SELECT', agent: foe });
    });

    it('resolveTap 產生的指令引擎都接受', () => {
        const { e, hero, foe } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        const attack = resolveTap(e, hero, foe, foe);
        if (attack.kind !== 'ORDER') throw new Error('expected an order');
        emit(e, attack.command);
        expect(hero.order).toEqual({ type: 'ATTACK', targetId: foe.id });
        const dest = emptyHex(e);
        const move = resolveTap(e, hero, dest, null);
        if (move.kind !== 'ORDER') throw new Error('expected an order');
        emit(e, move.command);
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
    });
});
