import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { resolveTap, hoverHexOf } from '../engine/systems/ui/tapIntent';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { MatchFlowSystem } from '../engine/systems/match/MatchFlowSystem';
import { Role } from '../types';
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

/** 真的開一場 PLAY（和 CameraInput 同一種建法） */
const playSetup = () => {
    const e = new GameEngine({ audio: false });
    let seed = 900;
    const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
    e.matchFlow = flow;
    flow.startPlay({ role: Role.TANK });
    const hero = e.agents.find((a) => a.id === flow.playHeroId) as Agent;
    const friend = e.agents.find((a) => a !== hero && a.side === hero.side) as Agent;
    const foe = e.agents.find((a) => a.side !== hero.side) as Agent;
    return { e, hero, friend, foe };
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

    // 11-26：己方的身體框會蓋到後面的地面（含觸控容差），PLAY 不能因此吞掉移動指令
    it('PLAY 模式：點到主角或隊友的身體框、指標那一格是別的地面＝移動到那一格', () => {
        const { e, hero, friend } = playSetup();
        const dest = emptyHex(e);
        const move = { kind: 'ORDER', command: { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r } };
        expect(resolveTap(e, hero, dest, hero)).toEqual(move);
        expect(resolveTap(e, hero, dest, friend)).toEqual(move);
        e.stop();
    });

    it('PLAY 模式：指標就在主角或隊友自己站的那一格＝不動作；敵人的身體框照舊攻擊', () => {
        const { e, hero, friend, foe } = playSetup();
        expect(resolveTap(e, hero, { q: hero.q, r: hero.r }, hero)).toEqual({ kind: 'NONE' });
        expect(resolveTap(e, hero, { q: friend.q, r: friend.r }, friend)).toEqual({ kind: 'NONE' });
        expect(resolveTap(e, hero, emptyHex(e), foe)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id } });
        e.stop();
    });

    it('PLAY 模式：己方身體框蓋到地圖外或障礙物＝不動作', () => {
        const { e, hero, friend } = playSetup();
        expect(resolveTap(e, hero, null, friend)).toEqual({ kind: 'NONE' });
        expect(resolveTap(e, hero, { q: 999, r: 999 }, hero)).toEqual({ kind: 'NONE' });
        const wall = emptyHex(e);
        emit(e, { type: 'SET_OBSTACLE', q: wall.q, r: wall.r, obstacleType: 'WALL' });
        e.uiCommands.flushQueued(); // 戰鬥中 GameCommand 排到下一個 tick 開頭才套用
        expect(e.hasObstacle(wall.q, wall.r)).toBe(true);
        expect(resolveTap(e, hero, wall, friend)).toEqual({ kind: 'NONE' });
        e.stop();
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

/** 瞄準引導的游標格：預覽必須等於點擊（同一個 resolveTap），範圍預覽與目標加粗都讀它 */
describe('hoverHexOf', () => {
    const aimSetup = () => {
        const { e, hero, friend, foe } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        const aoe = e.skillDB.find((s) => s.type === 'AOE' && s.range > 0 && s.tag !== 'MOBILITY');
        const hit = e.skillDB.find((s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power > 0 && s.tag !== 'MOBILITY');
        if (!aoe || !hit) throw new Error('資料庫缺範圍技或單體傷害技');
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 1, skillId: aoe.id });
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 2, skillId: hit.id });
        return { e, hero, friend, foe };
    };

    it('沒在瞄準：就是游標所在的格子，地圖外是 null；不去取指標下的單位', () => {
        const { e, hero } = aimSetup();
        const empty = emptyHex(e);
        const never = () => { throw new Error('沒瞄準時不該取單位'); };
        expect(hoverHexOf(e, hero, empty, never)).toEqual(empty);
        expect(hoverHexOf(e, hero, { q: 999, r: 999 }, never)).toBeNull();
        expect(hoverHexOf(e, hero, null, never)).toBeNull();
    });

    it('瞄準單體技：停在敵人身上＝敵人的格子；停在空地或隊友身上＝null（點了不會施放）', () => {
        const { e, hero, friend, foe } = aimSetup();
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        const empty = emptyHex(e);
        expect(hoverHexOf(e, hero, empty, () => foe)).toEqual({ q: foe.q, r: foe.r });
        expect(hoverHexOf(e, hero, empty, () => null)).toBeNull();
        expect(hoverHexOf(e, hero, friend, () => friend)).toBeNull();
    });

    it('瞄準範圍技：停在空地＝那一格；停在敵人身上＝敵人的格子（和 resolveTap 的施放位置一致）', () => {
        const { e, hero, foe } = aimSetup();
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 1 } });
        const empty = emptyHex(e);
        expect(hoverHexOf(e, hero, empty, () => null)).toEqual(empty);
        expect(resolveTap(e, hero, empty, null)).toMatchObject({ kind: 'ORDER', command: { q: empty.q, r: empty.r } });
        expect(hoverHexOf(e, hero, empty, () => foe)).toEqual({ q: foe.q, r: foe.r });
    });
});
