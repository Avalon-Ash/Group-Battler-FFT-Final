import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { MatchFlowSystem } from '../engine/systems/match/MatchFlowSystem';
import { selectSessionView } from '../engine/systems/ui/views/session';
import { SIM_STEP_S } from '../engine/core/Replay';
import { GAME_APP_PARAM } from '../constants';
import type { MatchPhase, UICommand } from '../types';

/**
 * 對局流程（契約 R2）在契約驗收以外的行為：結果鎖存、平手、時間跳躍、手動結算、
 * 展示／手動切換時的陣營設定與公布順序。全部無畫面，用假時鐘推進。
 */
const make = () => {
    const e = new GameEngine({ audio: false });
    let seed = 500;
    const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
    return { e, flow };
};

/** 一個畫面：流程前進一步，引擎在跑就走一個 tick */
const frame = (e: GameEngine, flow: MatchFlowSystem): void => {
    flow.update(SIM_STEP_S);
    if (e.isRunning) e.tick(SIM_STEP_S);
};

const runUntil = (e: GameEngine, flow: MatchFlowSystem, done: () => boolean, maxFrames = 60 * 60 * 5): void => {
    for (let i = 0; i < maxFrames && !done(); i++) frame(e, flow);
    expect(done()).toBe(true);
};

/** 讓這一場馬上分出勝負：只留第一個單位的陣營（draw＝全滅，平手）。回傳留下的陣營 */
const finish = (e: GameEngine, draw = false): number => {
    const keep = e.agents[0].side;
    for (const a of e.agents) if (draw || a.side !== keep) a.hp = 0;
    return keep;
};

const setupOf = (e: GameEngine): string => `${e.battleSetup.factions}x${e.battleSetup.unitsPerFaction}`;

describe('MatchFlowSystem', () => {
    it('轉場期間 UI 仍讀得到上一局的結果與陣營設定，下一局開打才清', () => {
        const { e, flow } = make();
        flow.setShowcase(true);
        const keep = finish(e);
        runUntil(e, flow, () => flow.phase === 'RESULT_HOLD');
        const held = selectSessionView(e);
        expect(held.winner).not.toBeNull();
        expect(held.winnerSide).toBe(keep);

        for (const phase of ['TRANSITION_OUT', 'TRANSITION_IN', 'SPAWN_WAIT'] as const) {
            runUntil(e, flow, () => flow.phase === phase);
            const view = selectSessionView(e);
            expect(view.winner).toBe(held.winner);
            expect(view.winnerId).toBe(held.winnerId);
            expect(view.winnerSide).toBe(keep);
            expect(view.battleSetup).toEqual(held.battleSetup);
            expect(view.unitCount).toBe(0);
        }

        runUntil(e, flow, () => flow.phase === 'PLAYING');
        const next = selectSessionView(e);
        expect(next.winner).toBeNull();
        expect(next.winnerId).toBeNull();
        expect(next.unitCount).toBeGreaterThan(1);
    }, 60000);

    it('平手（全滅）也會進下一局', () => {
        const { e, flow } = make();
        let starts = 0;
        e.bus.on('GAME_START', () => { starts++; });
        flow.setShowcase(true);
        expect(starts).toBe(1);
        finish(e, true);
        runUntil(e, flow, () => flow.phase === 'RESULT_HOLD');
        expect(selectSessionView(e).winner).toBeNull();
        runUntil(e, flow, () => starts === 2);
        expect(flow.phase).toBe('PLAYING');
    }, 60000);

    it('一個畫面隔了很久（分頁回到前景）不會跳過階段', () => {
        const { e, flow } = make();
        flow.setShowcase(true);
        finish(e);
        runUntil(e, flow, () => flow.phase === 'RESULT_HOLD');

        // 每次都給 10 秒：每個計時階段仍要走滿自己的時間（每次最多前進 FLOW_MAX_FRAME_MS）
        const calls = new Map<MatchPhase, number>();
        for (let i = 0; i < 400 && flow.phase !== 'PLAYING'; i++) {
            calls.set(flow.phase, (calls.get(flow.phase) ?? 0) + 1);
            flow.update(10);
        }
        expect(flow.phase).toBe('PLAYING');
        const atLeast = (ms: number) => Math.floor(ms / GAME_APP_PARAM.FLOW_MAX_FRAME_MS);
        expect(calls.get('TRANSITION_OUT')).toBeGreaterThanOrEqual(atLeast(GAME_APP_PARAM.TRANSITION_OUT_MS));
        expect(calls.get('TRANSITION_IN')).toBeGreaterThanOrEqual(atLeast(GAME_APP_PARAM.TRANSITION_IN_MS));
        expect(calls.get('SPAWN_WAIT')).toBeGreaterThanOrEqual(GAME_APP_PARAM.SPAWN_AFTER_IDLE_FRAMES);
    }, 60000);

    it('手動模式打完停在結算，不自己換場', () => {
        const { e, flow } = make();
        flow.newBattlefield(true);
        expect(flow.phase).toBe('PLAYING');
        let starts = 0;
        e.bus.on('GAME_START', () => { starts++; });
        finish(e);
        runUntil(e, flow, () => flow.phase === 'RESULT_HOLD');
        for (let i = 0; i < 600; i++) frame(e, flow);
        expect(flow.phase).toBe('RESULT_HOLD');
        expect(e.agents.length).toBeGreaterThan(0);
        expect(starts).toBe(0);
    }, 60000);

    it('重開之後立刻讀（還沒 update）就沒有上一場的勝方', () => {
        const { e, flow } = make();
        flow.newBattlefield(true);
        finish(e);
        runUntil(e, flow, () => flow.phase === 'RESULT_HOLD');
        expect(selectSessionView(e).winner).not.toBeNull();

        e.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
        const view = selectSessionView(e);
        expect(view.phase).toBe('LOBBY');
        expect(view.winner).toBeNull();
        expect(view.winnerId).toBeNull();
    }, 60000);

    it('切進展示可以沿用玩家的陣營設定；之後每局隨機，回到手動時還原', () => {
        const { e, flow } = make();
        // 2×3 展示模式抽不到（雙陣營每邊至少 TEAMS_MIN_PER_SIDE 人）
        const manual = { factions: 2, unitsPerFaction: GAME_APP_PARAM.SHOWCASE_SETUP.TEAMS_MIN_PER_SIDE - 2 };
        e.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: manual });
        const manualSetup = setupOf(e);

        flow.setShowcase(true, 'KEEP_SETUP');
        expect(flow.isShowcase).toBe(true);
        expect(setupOf(e)).toBe(manualSetup);
        expect(e.agents.length).toBe(manual.factions * manual.unitsPerFaction);
        expect(selectSessionView(e).battleSetup).toEqual(e.battleSetup);

        finish(e);
        runUntil(e, flow, () => flow.phase === 'TRANSITION_IN');
        runUntil(e, flow, () => flow.phase === 'PLAYING');
        expect(setupOf(e)).not.toBe(manualSetup);

        flow.setShowcase(false);
        expect(flow.phase).toBe('LOBBY');
        expect(e.agents.length).toBe(0);
        expect(setupOf(e)).toBe(manualSetup);
    }, 60000);

    it('展示旗標在指令之後才公布，而且同一個值不重複公布', () => {
        const { e, flow } = make();
        const sent: UICommand[] = [];
        e.bus.on('UI_COMMAND', (cmd: UICommand) => { sent.push(cmd); });
        const announced = () => sent.filter((c) => c.type === 'SET_SHOWCASE_MODE');
        const indexOf = (type: UICommand['type']) => sent.map((c) => c.type).lastIndexOf(type);

        flow.setShowcase(true);
        expect(announced()).toEqual([{ type: 'SET_SHOWCASE_MODE', enabled: true }]);
        // 音訊處理開戰指令時還是切換前的模式
        expect(indexOf('SET_SHOWCASE_MODE')).toBeGreaterThan(indexOf('START_GAME'));

        flow.setShowcase(true);
        expect(announced().length).toBe(1);

        flow.setShowcase(false);
        expect(announced().length).toBe(2);
        expect(indexOf('SET_SHOWCASE_MODE')).toBeGreaterThan(indexOf('CLEAR_BOARD'));
        flow.setShowcase(false);
        expect(announced().length).toBe(2);
    }, 60000);
});
