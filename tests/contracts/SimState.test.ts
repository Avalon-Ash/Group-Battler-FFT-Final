import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../engine/game';
import { buildBattle, runTicks, battleScript, emit, stateOf, terrainOf, SCENARIOS, type ScenarioId } from './simState';

/**
 * 契約驗收用的工具自己的檢查（現在就要通過）：佈陣與狀態字串是決定性的、分得出不同的戰鬥，
 * 這樣紅色驗收在碰到空殼之前的步驟才可信。
 */
describe('contracts/simState', () => {
    const run = (scenario: ScenarioId, seed: number, scripted: boolean) => {
        const e = buildBattle(scenario, seed);
        // S2 之後 START_GAME 沒給種子就是新種子：同一個種子也帶進開戰
        emit(e, { type: 'START_GAME', seed });
        const samples = runTicks(e, 600, scripted ? battleScript : undefined);
        return { samples, final: stateOf(e), log: e.commands.log.map((r) => `${r.tick}:${r.cmd.type}`) };
    };

    for (const scenario of Object.keys(SCENARIOS) as ScenarioId[]) {
        it(`${scenario}：同種子兩次跑出同一場，不同種子不同`, () => {
            const a = run(scenario, 41, true);
            const b = run(scenario, 41, true);
            expect(a.samples).toHaveLength(20);
            expect(a.log.slice(-3)).toEqual(['120:EDIT_AGENT', '180:SET_OBSTACLE', '240:PLACE_AGENT']);
            expect(b.samples).toEqual(a.samples);
            expect(b.final).toBe(a.final);
            expect(run(scenario, 42, true).final).not.toBe(a.final);
        });
    }

    it('戰中指令真的套用在紀錄的 tick，而且會改變結果', () => {
        const scripted = run('TEAMS', 41, true);
        expect(scripted.log).toContain('120:EDIT_AGENT');
        expect(scripted.log).toContain('180:SET_OBSTACLE');
        expect(scripted.log).toContain('240:PLACE_AGENT');
        expect(run('TEAMS', 41, false).final).not.toBe(scripted.final);
    });

    it('terrainOf 分得出不同的地圖', () => {
        expect(terrainOf(buildBattle('TEAMS', 41))).toBe(terrainOf(buildBattle('TEAMS', 41)));
        expect(terrainOf(buildBattle('TEAMS', 41))).not.toBe(terrainOf(buildBattle('TEAMS', 43)));
    });

    it('GameEngine 的 audio: false 不建立 AudioSystem', () => {
        expect(new GameEngine({ audio: false }).audio).toBeUndefined();
    });
});
