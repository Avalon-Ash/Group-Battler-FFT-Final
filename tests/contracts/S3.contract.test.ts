import { describe, expect } from 'vitest';
import { GameEngine } from '../../engine/game';
import { battleLogOf } from '../../engine/core/MatchSnapshot';
import { exportReplay, startReplay, stepSimulation, seekTo, takeOver, undoLastCommand } from '../../engine/core/Replay';
import type { ReplayFile } from '../../types';
import { contractTest } from './contractTest';
import { buildBattle, runTicks, battleScript, emit, stateOf, DT } from './simState';

/**
 * 契約 S3：回放、跳轉、undo（docs/plans/optimization-2026-11.md）。依賴 S2。
 * 原場用現有的 engine.tick 跑；回放端一律走 stepSimulation（模擬前進的唯一入口）。
 */
describe('契約 S3 回放與 undo', () => {
    /** 原場跑到 ticks，沿途記下指定 tick 的狀態，最後匯出回放檔（過一趟 JSON）。 */
    const record = (ticks: number, marks: readonly number[] = []) => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: 4100 });
        const at = new Map<number, string>();
        for (let i = 0; i < ticks && e.isRunning; i++) {
            battleScript(e, e.state.time.tick);
            e.tick(DT);
            if (marks.includes(e.state.time.tick)) at.set(e.state.time.tick, stateOf(e));
        }
        const file = JSON.parse(JSON.stringify(exportReplay(e))) as ReplayFile;
        return { e, at, final: stateOf(e), file };
    };

    const stepUntil = (e: GameEngine, session: Parameters<typeof stepSimulation>[1], tick: number) => {
        for (let guard = 0; e.state.time.tick < tick && e.isRunning && guard < 100000; guard++) stepSimulation(e, session);
    };

    contractTest('S3', '回放檔是純資料，記了起點、種子、指令與長度', () => {
        const a = record(600);
        expect(a.file.v).toBe(1);
        expect(typeof a.file.build).toBe('string');
        expect(a.file.start.seed).toBe(4100);
        expect(a.file.endTick).toBe(a.e.state.time.tick);
        expect(a.file.commands.map((r) => `${r.tick}:${r.cmd.type}`)).toEqual(['120:EDIT_AGENT', '180:SET_OBSTACLE', '240:PLACE_AGENT']);
    });

    contractTest('S3', '從頭回放到底，和原場相同', () => {
        const a = record(600, [300]);
        const b = new GameEngine({ audio: false });
        const session = startReplay(b, a.file);
        expect(session.active).toBe(true);
        expect(b.isRunning).toBe(true);
        stepUntil(b, session, 300);
        expect(stateOf(b)).toBe(a.at.get(300));
        stepUntil(b, session, a.file.endTick);
        expect(stateOf(b)).toBe(a.final);
    });

    contractTest('S3', 'stepSimulation 一次剛好一個固定步長', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: 1 });
        const t0 = e.battleTime;
        stepSimulation(e);
        stepSimulation(e, null);
        expect(e.state.time.tick).toBe(2);
        expect(e.battleTime - t0).toBeCloseTo(2 * DT, 9);
    });

    contractTest('S3', 'seekTo 跳到中間再跑到底，和直接跑相同；往回跳也可以', () => {
        const a = record(900, [300, 600]);
        const b = new GameEngine({ audio: false });
        let session = seekTo(b, a.file, 600);
        expect(b.state.time.tick).toBe(600);
        expect(stateOf(b)).toBe(a.at.get(600));
        session = seekTo(b, a.file, 300);
        expect(stateOf(b)).toBe(a.at.get(300));
        stepUntil(b, session, a.file.endTick);
        expect(stateOf(b)).toBe(a.final);
    });

    contractTest('S3', '快轉期間不發 GAME_EVENT（不觸發表現層與音訊），結束後恢復', () => {
        const a = record(600);
        const b = new GameEngine({ audio: false });
        let events = 0;
        b.bus.on('GAME_EVENT', () => { events++; });
        const session = seekTo(b, a.file, 400);
        expect(events).toBe(0);
        stepUntil(b, session, 600);
        expect(events).toBeGreaterThan(0);
    });

    contractTest('S3', '回放進行中擋下遊戲指令；接手後恢復，指令接在紀錄後面', () => {
        const a = record(600);
        const b = new GameEngine({ audio: false });
        const session = startReplay(b, a.file);
        stepUntil(b, session, 60);
        const unit = b.agents[0];
        emit(b, { type: 'EDIT_AGENT', agentId: unit.id, maxHp: 777 });
        stepUntil(b, session, 65);
        expect(unit.maxHp).not.toBe(777);
        expect(battleLogOf(b).some((r) => r.cmd.type === 'EDIT_AGENT' && r.tick < 120)).toBe(false);
        // 畫面指令照常
        emit(b, { type: 'SET_DIRECTOR_ENABLED', enabled: false });
        expect(b.director.enabled).toBe(false);

        takeOver(b, session);
        expect(session.active).toBe(false);
        expect(b.isRunning).toBe(true);
        emit(b, { type: 'EDIT_AGENT', agentId: unit.id, maxHp: 777 });
        stepSimulation(b);
        expect(unit.maxHp).toBe(777);
        const last = battleLogOf(b).at(-1)!;
        expect(`${last.tick}:${last.cmd.type}`).toBe('65:EDIT_AGENT');
        // 接手後不再餵舊紀錄：原場 tick 120 的指令不會出現
        stepUntil(b, null, 130);
        expect(battleLogOf(b).some((r) => r.tick === 120)).toBe(false);
    });

    contractTest('S3', 'undo 最後一個指令＝從來沒送過', () => {
        const never = buildBattle('TEAMS', 41);
        emit(never, { type: 'START_GAME', seed: 4100 });
        runTicks(never, 600);

        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: 4100 });
        runTicks(e, 200);
        emit(e, { type: 'EDIT_AGENT', agentId: e.agents[1].id, hp: 1 });
        runTicks(e, 60);
        expect(battleLogOf(e).map((r) => `${r.tick}:${r.cmd.type}`)).toEqual(['200:EDIT_AGENT']);

        expect(undoLastCommand(e)).toBe(true);
        expect(e.isRunning).toBe(true);
        expect(e.state.time.tick).toBe(200);
        expect(battleLogOf(e)).toHaveLength(0);
        stepUntil(e, null, 600);
        expect(stateOf(e)).toBe(stateOf(never));
        expect(undoLastCommand(e)).toBe(false);
    });
});
