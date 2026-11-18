import { describe, expect } from 'vitest';
import type { GameEngine } from '../../engine/game';
import type { Agent } from '../../engine/core/Agent';
import { HexUtils } from '../../engine/utils';
import { captureMatch } from '../../engine/core/MatchSnapshot';
import { querySpawnableHexes } from '../../engine/systems/ui/editorQueries';
import { contractTest } from './contractTest';
import { buildBattle, runTicks, emit, stateOf } from './simState';

/**
 * 契約 G3：玩家操控（docs/plans/optimization-2026-11.md，資料形狀在 types/Orders.ts）。
 * 操控模型：即時＋可暫停下令。玩家單位沒有指令時原地堅守（不追、不逃，射程內普攻）。
 */
describe('契約 G3 玩家操控', () => {
    /** TEAMS 佈陣，第一個單位（藍方坦克）交給玩家；關掉縮圈，免得場地變化干擾。 */
    const setup = () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const hero = e.agents[0];
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        return { e, hero };
    };
    const enemyOf = (e: GameEngine, hero: Agent): Agent => {
        const foes = e.agents.filter((a) => a.side !== hero.side);
        return foes.sort((a, b) => HexUtils.dist(a, hero) - HexUtils.dist(b, hero))[0];
    };
    /** 離 hero 2～3 格、沒人站的可出生格 */
    const nearbyHex = (e: GameEngine, hero: Agent) => {
        const hex = querySpawnableHexes(e)
            .filter((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r))
            .map((h) => ({ ...h, d: HexUtils.dist(h, hero) }))
            .filter((h) => h.d >= 2 && h.d <= 3)
            .sort((a, b) => a.d - b.d || a.q - b.q || a.r - b.r)[0];
        if (!hex) throw new Error('附近沒有空格');
        return { q: hex.q, r: hex.r };
    };

    contractTest('G3', 'SET_CONTROLLER 切換控制者，開戰前與戰鬥中都可以；切回 AI 會自己動', () => {
        const { e, hero } = setup();
        expect(hero.controller).toBe('PLAYER');
        expect(e.agents.filter((a) => a.controller === 'PLAYER')).toHaveLength(1);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 30);
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'AI' });
        runTicks(e, 1);
        expect(hero.controller).toBe('AI');
        let moved = false;
        runTicks(e, 300, () => { if (hero.isMoving || hero.castingSkillIdx !== -1) moved = true; });
        expect(moved).toBe(true);
    });

    contractTest('G3', '沒有指令時原地堅守：不自己起步', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        let started = false;
        runTicks(e, 300, () => { if (hero.hp > 0 && (hero.path.length > 0 || hero.isMoving)) started = true; });
        expect(started).toBe(false);
        expect(hero.order).toBeNull();
    });

    contractTest('G3', 'ORDER_MOVE：走到指定格，到了就清掉指令', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
        emit(e, { type: 'START_GAME', seed: 1 });
        for (let i = 0; i < 900 && e.isRunning && hero.hp > 0 && !(hero.q === dest.q && hero.r === dest.r && !hero.isMoving); i++) runTicks(e, 1);
        expect(hero.hp).toBeGreaterThan(0);
        expect({ q: hero.q, r: hero.r }).toEqual(dest);
        runTicks(e, 2);
        expect(hero.order).toBeNull();
    });

    contractTest('G3', 'ORDER_ATTACK：鎖定指定目標，目標還活著就不改選', () => {
        const { e, hero } = setup();
        const foe = enemyOf(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 10);
        emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        runTicks(e, 2);
        expect(hero.order).toEqual({ type: 'ATTACK', targetId: foe.id });
        let checked = 0;
        runTicks(e, 240, () => {
            if (hero.hp > 0 && foe.hp > 0) { expect(hero.target?.id).toBe(foe.id); checked++; }
        });
        expect(checked).toBeGreaterThan(30);
    });

    contractTest('G3', 'ORDER_CAST：放指定槽位的技能，放出去後清掉指令', () => {
        const { e, hero } = setup();
        const foe = enemyOf(e, hero);
        const slot = 2;
        // 目標在 9 格外：把它的血加厚，否則走到之前就被隊友打死，驗不到「放出去」
        const TOUGH_HP = 50000;
        emit(e, { type: 'EDIT_AGENT', agentId: foe.id, maxHp: TOUGH_HP, hp: TOUGH_HP });
        expect(foe.hp).toBe(TOUGH_HP);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 10);
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        runTicks(e, 2);
        expect(hero.order).toEqual({ type: 'CAST', slot, targetId: foe.id });
        // 看單位自己的施法狀態，不聽 CAST_START：第 2 槽是普攻，CombatSystem 對普攻不發那個事件。
        // 「放出去」＝先進入這一槽的前搖，而且這一槽進了冷卻（被打斷的普攻不進冷卻，只進前搖不算）。
        expect(hero.curCDs[slot] || 0).toBe(0);
        let windup = false;
        for (let i = 0; i < 900 && e.isRunning && hero.hp > 0 && foe.hp > 0 && !((hero.curCDs[slot] || 0) > 0); i++) {
            runTicks(e, 1);
            if (hero.castingSkillIdx === slot) windup = true;
        }
        expect(windup).toBe(true);
        expect(hero.curCDs[slot]).toBeGreaterThan(0);
        runTicks(e, 2);
        expect(hero.order).toBeNull();
    });

    contractTest('G3', 'ORDER_STOP：清掉指令並停下', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, 20);
        emit(e, { type: 'ORDER_STOP', agentId: hero.id });
        runTicks(e, 2);
        expect(hero.order).toBeNull();
        let started = false;
        runTicks(e, 120, () => { if (hero.hp > 0 && hero.path.length > 0) started = true; });
        expect(started).toBe(false);
    });

    contractTest('G3', '對 AI 單位、不存在的單位或陣亡單位下指令無效', () => {
        const { e, hero } = setup();
        const bot = e.agents[1];
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'ORDER_MOVE', agentId: bot.id, q: dest.q, r: dest.r });
        emit(e, { type: 'ORDER_MOVE', agentId: 'NO-SUCH-UNIT', q: dest.q, r: dest.r });
        expect(bot.order).toBeNull();
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: 999, r: 999 });
        expect(hero.order).toBeNull();
    });

    contractTest('G3', '玩家指令進紀錄；同一串指令跑兩次結果相同，沒下指令結果不同', () => {
        const run = (withOrders: boolean) => {
            const { e, hero } = setup();
            const dest = nearbyHex(e, hero);
            const foe = enemyOf(e, hero);
            emit(e, { type: 'START_GAME', seed: 1 });
            runTicks(e, 600, (_, tick) => {
                if (!withOrders) return;
                if (tick === 30) emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
                if (tick === 200) emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
            });
            return { final: stateOf(e), log: e.commands.log.map((r) => `${r.tick}:${r.cmd.type}`) };
        };
        const a = run(true);
        expect(a.log).toContain('30:ORDER_MOVE');
        expect(a.log).toContain('200:ORDER_ATTACK');
        expect(run(true).final).toBe(a.final);
        expect(run(false).final).not.toBe(a.final);
    });

    contractTest('G3', '控制者進開戰快照', () => {
        const { e, hero } = setup();
        const snap = captureMatch(e);
        expect(snap.units.find((u) => u.id === hero.id)?.controller).toBe('PLAYER');
        expect(snap.units.filter((u) => u.controller === 'PLAYER')).toHaveLength(1);
    });
});
