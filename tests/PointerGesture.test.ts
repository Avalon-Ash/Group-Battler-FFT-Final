// ADR 0026（K3）：PLAY 桌機輸入對應與 Quick Cast 的純規則。主代理寫的紅色驗收，執行代理不得修改。
// 規則只寫在 engine/systems/ui/tapIntent.ts；hooks/useGameInput.ts 只照它分派、不自己判斷按鍵或敵我。
import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import type { Hex } from '../types';
import { pointerGesture, resolveQuickCast, resolveTap } from '../engine/systems/ui/tapIntent';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { buildBattle, emit } from './contracts/simState';

/** 滑鼠按鍵編號（PointerEvent.button） */
const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

describe('pointerGesture：哪個指標、哪個鍵做什麼', () => {
    it('PLAY 模式滑鼠：左鍵按下就下令、中鍵拖鏡頭、右鍵拖鏡頭或點一下取消瞄準', () => {
        expect(pointerGesture(true, 'mouse', LEFT)).toBe('ORDER_ON_DOWN');
        expect(pointerGesture(true, 'mouse', MIDDLE)).toBe('CAMERA');
        expect(pointerGesture(true, 'mouse', RIGHT)).toBe('CAMERA_OR_CANCEL');
    });

    it('PLAY 模式觸控與觸控筆：照舊放開才判斷（K4 才改觸控）', () => {
        expect(pointerGesture(true, 'touch', LEFT)).toBe('TAP_ON_UP');
        expect(pointerGesture(true, 'pen', LEFT)).toBe('TAP_ON_UP');
    });

    it('非 PLAY（手動、編輯、展示）：左鍵與觸控照舊放開才判斷；滑鼠其他鍵不處理', () => {
        expect(pointerGesture(false, 'mouse', LEFT)).toBe('TAP_ON_UP');
        expect(pointerGesture(false, 'mouse', MIDDLE)).toBe('IGNORE');
        expect(pointerGesture(false, 'mouse', RIGHT)).toBe('IGNORE');
        expect(pointerGesture(false, 'touch', LEFT)).toBe('TAP_ON_UP');
    });
});

describe('resolveQuickCast：按技能鍵直接對游標下施放', () => {
    const setup = () => {
        const e = buildBattle('TEAMS', 41);
        const hero = e.agents[0];
        const friend = e.agents.find((a) => a !== hero && a.side === hero.side) as Agent;
        const foe = e.agents.find((a) => a.side !== hero.side) as Agent;
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        const aoe = e.skillDB.find((s) => s.type === 'AOE' && s.range > 0 && s.tag !== 'MOBILITY');
        const hit = e.skillDB.find((s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power > 0 && s.tag !== 'MOBILITY');
        if (!aoe || !hit) throw new Error('資料庫缺範圍技或單體傷害技');
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 1, skillId: aoe.id });
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 2, skillId: hit.id });
        return { e, hero, friend, foe };
    };
    const emptyHex = (e: GameEngine) => {
        const hex = querySpawnableHexes(e).find((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r));
        if (!hex) throw new Error('沒有空格');
        return { q: hex.q, r: hex.r };
    };

    it('單體技：游標在敵人身上＝對它施放；不需要先進入瞄準，也不改瞄準狀態', () => {
        const { e, hero, foe } = setup();
        expect(e.state.aim).toBeNull();
        expect(resolveQuickCast(e, hero, 2, { q: foe.q, r: foe.r }, foe)).toEqual({
            kind: 'ORDER',
            command: { type: 'ORDER_CAST', agentId: hero.id, slot: 2, targetId: foe.id },
        });
        expect(e.state.aim).toBeNull();
    });

    it('單體技：游標在空地或隊友身上＝不施放（呼叫端改成一般瞄準）', () => {
        const { e, hero, friend } = setup();
        expect(resolveQuickCast(e, hero, 2, emptyHex(e), null)).toEqual({ kind: 'NONE' });
        expect(resolveQuickCast(e, hero, 2, { q: friend.q, r: friend.r }, friend)).toEqual({ kind: 'NONE' });
    });

    it('範圍技：游標在空地＝對那一格施放；地圖外＝不施放', () => {
        const { e, hero } = setup();
        const empty = emptyHex(e);
        expect(resolveQuickCast(e, hero, 1, empty, null)).toEqual({
            kind: 'ORDER',
            command: { type: 'ORDER_CAST', agentId: hero.id, slot: 1, q: empty.q, r: empty.r },
        });
        expect(resolveQuickCast(e, hero, 1, null, null)).toEqual({ kind: 'NONE' });
    });

    it('和「先瞄準再點」是同一條規則：每種游標位置的結果都等於瞄準中的 resolveTap', () => {
        const { e, hero, friend, foe } = setup();
        const cases: Array<[Hex | null, Agent | null]> = [
            [emptyHex(e), null],
            [{ q: foe.q, r: foe.r }, foe],
            [{ q: friend.q, r: friend.r }, friend],
            [{ q: hero.q, r: hero.r }, hero],
            [null, null],
            [{ q: 999, r: 999 }, null],
        ];
        for (const slot of [1, 2]) {
            const quick = cases.map(([h, t]) => resolveQuickCast(e, hero, slot, h, t));
            emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot } });
            const aimed = cases.map(([h, t]) => resolveTap(e, hero, h, t));
            emit(e, { type: 'SET_AIM', aim: null });
            expect(quick).toEqual(aimed);
        }
    });

    it('不能接指令的單位（AI 控制、陣亡、已分勝負）：不施放', () => {
        const { e, hero, foe } = setup();
        const at = { q: foe.q, r: foe.r };
        e.state.victory.isFinishing = true;
        expect(resolveQuickCast(e, hero, 2, at, foe)).toEqual({ kind: 'NONE' });
        e.state.victory.isFinishing = false;
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'AI' });
        expect(resolveQuickCast(e, hero, 2, at, foe)).toEqual({ kind: 'NONE' });
        expect(resolveQuickCast(e, null, 2, at, foe)).toEqual({ kind: 'NONE' });
    });
});
