import { describe, expect, it } from 'vitest';
import { GameEngine } from '../engine/game';
import { battleLogOf } from '../engine/core/MatchSnapshot';
import { exportReplay, isReplayFile, startReplay, stepSimulation } from '../engine/core/Replay';
import type { ReplayFile } from '../types';
import { buildBattle, battleScript, emit, stateOf } from './contracts/simState';

/**
 * S3 契約以外的回放行為（engine/core/Replay.ts）：暫停、繼續不影響模擬；回放中觀看者可以暫停；
 * 打完之後回放自動結束、不再擋指令。原場一律走 stepSimulation（模擬前進的唯一入口）。
 */
describe('回放：暫停與結束', () => {
    const SEED = 4100;

    /** 原場：佈陣、開戰，跑 ticks 個 tick；pauseAt 那個 tick 先暫停再繼續。 */
    const play = (ticks: number, pauseAt: number | null) => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: SEED });
        for (let i = 0; i < ticks && e.isRunning; i++) {
            const t = e.state.time.tick;
            battleScript(e, t);
            if (t === pauseAt) {
                emit(e, { type: 'STOP_GAME' });
                emit(e, { type: 'START_GAME' });
            }
            stepSimulation(e);
        }
        return e;
    };

    it('暫停後繼續不改模擬：和沒暫停的同一場相同（以前繼續會把戰鬥時間歸零、重建 AI）', () => {
        const plain = stateOf(play(600, null));
        const paused = play(600, 300);
        expect(battleLogOf(paused).some((r) => r.cmd.type === 'STOP_GAME')).toBe(true);
        expect(stateOf(paused)).toBe(plain);
    });

    it('回放檔不收暫停、繼續、倍率；有暫停的原場照樣回放得出來', () => {
        const a = play(600, 300);
        emit(a, { type: 'SET_TIME_SCALE', timeScale: 2 });
        const file = JSON.parse(JSON.stringify(exportReplay(a))) as ReplayFile;
        expect(isReplayFile(file)).toBe(true);
        expect(file.commands.map((r) => r.cmd.type)).toEqual(['EDIT_AGENT', 'SET_OBSTACLE', 'PLACE_AGENT']);

        const b = new GameEngine({ audio: false });
        const session = startReplay(b, file);
        while (b.state.time.tick < file.endTick && b.isRunning) stepSimulation(b, session);
        expect(stateOf(b)).toBe(stateOf(a));
    });

    it('回放中觀看者暫停再繼續，結果和原場相同', () => {
        const a = play(600, null);
        const file = JSON.parse(JSON.stringify(exportReplay(a))) as ReplayFile;
        const b = new GameEngine({ audio: false });
        const session = startReplay(b, file);
        while (b.state.time.tick < file.endTick && b.isRunning) {
            if (b.state.time.tick === 200) {
                emit(b, { type: 'STOP_GAME' });
                expect(b.isRunning).toBe(false);
                emit(b, { type: 'START_GAME' });
                expect(b.isRunning).toBe(true);
            }
            stepSimulation(b, session);
        }
        expect(session.active).toBe(true);
        expect(stateOf(b)).toBe(stateOf(a));
    });

    it('回放打到分出勝負就結束，之後清盤不再被擋', () => {
        const a = buildBattle('TEAMS', 41);
        emit(a, { type: 'START_GAME', seed: SEED });
        for (let guard = 0; a.isRunning && guard < 100000; guard++) stepSimulation(a);
        expect(a.state.victory.isFinishing).toBe(true);
        const file = JSON.parse(JSON.stringify(exportReplay(a))) as ReplayFile;

        const b = new GameEngine({ audio: false });
        const session = startReplay(b, file);
        for (let guard = 0; b.isRunning && guard < 100000; guard++) stepSimulation(b, session);
        expect(b.state.time.tick).toBe(file.endTick);
        expect(stateOf(b)).toBe(stateOf(a));
        expect(session.active).toBe(false);
        expect(b.commands.replay).toBeNull();
        emit(b, { type: 'CLEAR_BOARD', keepScene: true });
        expect(b.agents).toHaveLength(0);
    });

    it('戰鬥中換技能當下生效（不再要等暫停後繼續）', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: SEED });
        stepSimulation(e);
        const unit = e.agents[0];
        const slot = unit.skillIds.findIndex((id, i) => id !== null && i !== unit.castingSkillIdx);
        const other = e.skillDB.find((s) => !unit.skillIds.includes(s.id))!;
        emit(e, { type: 'SET_AGENT_SKILL', agentId: unit.id, slot, skillId: other.id });
        stepSimulation(e);
        expect(unit.skillIds[slot]).toBe(other.id);
        expect(unit.skills[slot]?.id).toBe(other.id);
    });
});
