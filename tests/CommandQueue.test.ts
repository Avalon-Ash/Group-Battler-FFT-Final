import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { UICommand, ViewCommand } from '../types';
import { HexUtils } from '../engine/utils';
import { VIEW_COMMAND_TYPES, type CommandRecord } from '../engine/core/CommandQueue';
import { planFixedSteps } from '../engine/core/FixedStep';
import { GAME_LOOP_PARAM } from '../constants';

/**
 * 可玩地基 L1（指令佇列）＋L3（固定步長）：HANDOFF §2 L。
 * 同種子＋同一份指令紀錄＝同一場戰鬥，而且模擬結果和時間倍率無關。
 */

const STEP_MS = 1000 / GAME_LOOP_PARAM.SIM_HZ;
const DT = 1 / GAME_LOOP_PARAM.SIM_HZ;

describe('FixedStep', () => {
    it('倍率只改 tick 數：1 倍一幀一個、5 倍五個、0 倍不跑', () => {
        expect(planFixedSteps(0, STEP_MS, 1, STEP_MS, 15).ticks).toBe(1);
        expect(planFixedSteps(0, STEP_MS, 5, STEP_MS, 15).ticks).toBe(5);
        expect(planFixedSteps(0, STEP_MS, 0, STEP_MS, 15)).toEqual({ ticks: 0, acc: 0 });
    });

    it('0.5 倍：餘數留到下一幀，兩幀合計一個 tick', () => {
        const a = planFixedSteps(0, STEP_MS, 0.5, STEP_MS, 15);
        const b = planFixedSteps(a.acc, STEP_MS, 0.5, STEP_MS, 15);
        expect(a.ticks + b.ticks).toBe(1);
        expect(b.acc).toBeCloseTo(0, 9);
    });

    it('積欠超過上限的部分丟掉，不追趕；負的經過時間當 0', () => {
        const p = planFixedSteps(0, 5000, 5, STEP_MS, 15);
        expect(p.ticks).toBe(15);
        expect(p.acc).toBeLessThan(STEP_MS);
        expect(planFixedSteps(3, -100, 1, STEP_MS, 15)).toEqual({ ticks: 0, acc: 3 });
    });
});

describe('CommandQueue', () => {
    it('VIEW_COMMAND_TYPES 和 types.ts 的 ViewCommand 完全相同', () => {
        const exhaustive: [Exclude<ViewCommand['type'], (typeof VIEW_COMMAND_TYPES)[number]>] extends [never] ? true : false = true;
        expect(exhaustive).toBe(true);
        expect(new Set(VIEW_COMMAND_TYPES).size).toBe(VIEW_COMMAND_TYPES.length);
    });

    const setup = (seed: number): GameEngine => {
        const e = new GameEngine();
        e.seedSimulation(seed);
        e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
        const radius = Math.floor(Math.max(e.mapConfig.w, e.mapConfig.h) / 2) + 1;
        const valid = [...e.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !e.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
        const left = valid.filter((h) => h.q < -1), right = valid.filter((h) => h.q > 1);
        const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        for (let i = 0; i < 5; i++) {
            e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: left[i].q, r: left[i].r, role: roles[i] });
            e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: right[i].q, r: right[i].r, role: roles[i] });
        }
        return e;
    };

    it('沒開戰時立即套用並記在 tick 0；開戰後排到下一個 tick 開頭才套用', () => {
        const e = setup(11);
        expect(e.agents).toHaveLength(10);
        expect(e.commands.log.every((r) => r.tick === 0)).toBe(true);
        e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        expect(e.isRunning).toBe(true);
        for (let i = 0; i < 3; i++) e.tick(DT);
        const a = e.agents[0];
        const hpBefore = a.hp;
        e.bus.emit('UI_COMMAND', { type: 'EDIT_AGENT', agentId: a.id, hp: 1 });
        expect(e.commands.pendingCount).toBe(1);
        expect(a.hp).toBe(hpBefore);
        e.tick(DT);
        expect(e.commands.pendingCount).toBe(0);
        const last = e.commands.log[e.commands.log.length - 1];
        expect(last.cmd.type).toBe('EDIT_AGENT');
        expect(last.tick).toBe(3);
    });

    it('畫面指令戰鬥中也立即套用、不記錄；停機前先套用排在前面的指令', () => {
        const e = setup(12);
        e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        e.tick(DT);
        const logged = e.commands.log.length;
        e.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: null });
        expect(e.commands.log.length).toBe(logged);
        expect(e.commands.pendingCount).toBe(0);
        const a = e.agents[0];
        e.bus.emit('UI_COMMAND', { type: 'EDIT_AGENT', agentId: a.id, maxHp: 777 });
        e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        expect(e.isRunning).toBe(false);
        expect(a.maxHp).toBe(777);
        expect(e.commands.log.slice(-2).map((r) => r.cmd.type)).toEqual(['EDIT_AGENT', 'STOP_GAME']);
    });

    /** 跑一場：setup → 開戰 → 指定 tick 送指令 → 跑到 ticks。回傳狀態指紋與指令紀錄 */
    const runBattle = (seed: number, ticks: number, script: (e: GameEngine, tick: number) => void, timeScale = 1) => {
        const e = setup(seed);
        e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        e.state.time.targetTimeScale = timeScale;
        for (let i = 0; i < ticks && e.isRunning; i++) {
            script(e, e.state.time.tick);
            e.tick(DT);
        }
        return { print: fingerprint(e), log: [...e.commands.log] };
    };

    /** 從空白引擎照紀錄重播：每個指令在它記錄的 tick 數時送出 */
    const replay = (seed: number, ticks: number, log: readonly CommandRecord[]) => {
        const e = new GameEngine();
        e.seedSimulation(seed);
        let idx = 0;
        const sendDue = () => { while (idx < log.length && log[idx].tick === e.state.time.tick) e.bus.emit('UI_COMMAND', log[idx++].cmd as UICommand); };
        sendDue();
        for (let i = 0; i < ticks && e.isRunning; i++) {
            e.tick(DT);
            sendDue();
        }
        return fingerprint(e);
    };

    const fingerprint = (e: GameEngine) => JSON.stringify({
        tick: e.state.time.tick,
        t: e.battleTime.toFixed(6),
        agents: e.agents.map((a) => [a.id, a.q, a.r, a.hp.toFixed(4), a.mp.toFixed(4), a.castingSkillIdx]),
    });

    const TICKS = 600;
    const script = (at: number) => (e: GameEngine, tick: number) => {
        if (tick === at) e.bus.emit('UI_COMMAND', { type: 'EDIT_AGENT', agentId: e.agents[1].id, hp: 1 });
        if (tick === at + 60) {
            const free = [...e.map.mapKeys].map((k) => k.split(',').map(Number)).find(([q, r]) => !e.hasObstacle(q, r) && !e.agents.some((a) => a.q === q && a.r === r))!;
            e.bus.emit('UI_COMMAND', { type: 'SET_OBSTACLE', q: free[0], r: free[1] });
        }
    };

    it('同種子＋同一份指令紀錄重播出同一場戰鬥', () => {
        const live = runBattle(31, TICKS, script(120));
        expect(live.log.some((r) => r.cmd.type === 'EDIT_AGENT' && r.tick === 120)).toBe(true);
        expect(live.log.some((r) => r.cmd.type === 'SET_OBSTACLE' && r.tick === 180)).toBe(true);
        expect(replay(31, TICKS, live.log)).toBe(live.print);
    });

    it('不送指令結果就不同（上一則不是空測；套用的 tick 由第一則鎖住）', () => {
        expect(runBattle(31, TICKS, () => {}).print).not.toBe(runBattle(31, TICKS, script(120)).print);
    });

    it('模擬結果和時間倍率無關（固定步長）', () => {
        expect(runBattle(31, TICKS, script(120), 5).print).toBe(runBattle(31, TICKS, script(120), 1).print);
    });
});
