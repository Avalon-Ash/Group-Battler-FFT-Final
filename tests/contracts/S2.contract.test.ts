import { describe, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '../../engine/game';
import { captureMatch, restoreMatch, matchStartOf, battleLogOf } from '../../engine/core/MatchSnapshot';
import type { MatchStart } from '../../types';
import type { CommandRecord } from '../../engine/core/CommandQueue';
import { contractTest, pendingIf } from './contractTest';
import { buildBattle, runTicks, battleScript, feeder, emit, stateOf, terrainOf, SCENARIOS, type ScenarioId } from './simState';

/**
 * 契約 S2：開戰快照＋種子（docs/plans/optimization-2026-11.md）。
 * 一場戰鬥＝開戰快照＋種子＋開戰後的指令。拿這三樣到一顆全新的引擎，要重播出同一場。
 */
const TICKS = 600;

describe('契約 S2 開戰快照＋種子', () => {
    /** 原場：佈陣→帶種子開戰→跑 TICKS（中途送指令）。回傳取樣與可序列化的起點、紀錄。 */
    const live = (scenario: ScenarioId, setupSeed: number, battleSeed: number) => {
        const e = buildBattle(scenario, setupSeed);
        emit(e, { type: 'START_GAME', seed: battleSeed });
        const samples = runTicks(e, TICKS, battleScript);
        const start = matchStartOf(e);
        const log = battleLogOf(e);
        // 起點與紀錄必須是純資料：過一趟 JSON 再用
        const wire = JSON.parse(JSON.stringify({ start, log })) as { start: MatchStart; log: CommandRecord[] };
        return { e, samples, final: stateOf(e), start: wire.start, log: wire.log };
    };

    /** 重播：全新引擎→還原快照→用紀錄的種子開戰→照紀錄餵指令。 */
    const replay = (start: MatchStart, log: readonly CommandRecord[], seed: number = start.seed) => {
        const e = new GameEngine({ audio: false });
        restoreMatch(e, start.snapshot);
        emit(e, { type: 'START_GAME', seed });
        const samples = runTicks(e, TICKS, feeder(log));
        return { samples, final: stateOf(e) };
    };

    for (const scenario of Object.keys(SCENARIOS) as ScenarioId[]) {
        contractTest('S2', `${scenario}：快照＋種子＋戰中指令在新引擎重播出同一場`, () => {
            const a = live(scenario, 41, 4100);
            expect(a.start.seed).toBe(4100);
            expect(a.log.map((r) => `${r.tick}:${r.cmd.type}`)).toEqual(['120:EDIT_AGENT', '180:SET_OBSTACLE', '240:PLACE_AGENT']);
            const b = replay(a.start, a.log);
            expect(b.samples).toEqual(a.samples);
            expect(b.final).toBe(a.final);
        });
    }

    contractTest('S2', '同一份快照：同種子兩次相同，換種子不同（種子真的決定模擬流）', () => {
        const a = live('TEAMS', 41, 4100);
        expect(replay(a.start, a.log).final).toBe(replay(a.start, a.log).final);
        expect(replay(a.start, a.log, 4101).final).not.toBe(a.final);
    });

    contractTest('S2', '開戰前怎麼抽亂數都不影響結果：模擬流在 START_GAME 重新播種', () => {
        const a = live('TEAMS', 41, 4100);
        const e = new GameEngine({ audio: false });
        e.seedSimulation(999);
        emit(e, { type: 'RANDOMIZE_MAP', randomizeScene: true });
        restoreMatch(e, a.start.snapshot);
        emit(e, { type: 'START_GAME', seed: a.start.seed });
        runTicks(e, TICKS, feeder(a.log));
        expect(stateOf(e)).toBe(a.final);
    });

    contractTest('S2', 'START_GAME 沒給種子時由引擎產生，並記在起點', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME' });
        const { seed } = matchStartOf(e);
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(0xffffffff);
    });

    contractTest('S2', '快照是純資料，內容和戰場一致', () => {
        const e = buildBattle('SQUADS', 41);
        const snap = captureMatch(e);
        expect(snap.v).toBe(1);
        expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
        expect(snap.tiles).toHaveLength(e.map.mapKeys.size);
        expect(snap.obstacles).toHaveLength(e.map.obstacles.size);
        expect(snap.sceneId).toBe(e.currentScene.id);
        expect(snap.units.map((u) => u.id)).toEqual(e.agents.map((a) => a.id));
        expect(snap.units.map((u) => `${u.q},${u.r},${u.side},${u.role},${u.skillIds.join('/')}`))
            .toEqual(e.agents.map((a) => `${a.q},${a.r},${a.side},${a.role},${a.skillIds.join('/')}`));
        expect(snap.skillEdits).toEqual([]);
        // 快照不和引擎共用物件：改引擎不會改到已取出的快照
        const before = JSON.stringify(snap);
        emit(e, { type: 'EDIT_AGENT', agentId: e.agents[0].id, maxHp: 777 });
        expect(JSON.stringify(snap)).toBe(before);
    });

    contractTest('S2', '還原到另一顆引擎後，戰場和原本一樣（未開戰）', () => {
        const a = buildBattle('ROYALE', 41);
        const snap = captureMatch(a);
        const b = new GameEngine({ audio: false });
        restoreMatch(b, JSON.parse(JSON.stringify(snap)));
        expect(b.isRunning).toBe(false);
        expect(terrainOf(b)).toBe(terrainOf(a));
        expect(stateOf(b)).toBe(stateOf(a));
        expect(captureMatch(b)).toEqual(snap);
    });

    contractTest('S2', 'RESET_GAME 還原開戰時的地圖與佈陣（現況會重新生成地形，單位可能站在障礙物上）', () => {
        const e = buildBattle('TEAMS', 41);
        const terrain = terrainOf(e);
        const spots = e.agents.map((a) => `${a.id}@${a.q},${a.r}`);
        emit(e, { type: 'START_GAME', seed: 7 });
        matchStartOf(e);
        runTicks(e, 240, battleScript);
        emit(e, { type: 'STOP_GAME' });
        emit(e, { type: 'RESET_GAME' });
        expect(e.isRunning).toBe(false);
        expect(terrainOf(e)).toBe(terrain);
        expect(e.agents.map((a) => `${a.id}@${a.q},${a.r}`)).toEqual(spots);
        expect(e.agents.every((a) => a.hp === a.maxHp && !e.hasObstacle(a.q, a.r))).toBe(true);
        expect(e.state.time.tick).toBe(0);
    });

    contractTest('S2', '重開後用同一顆種子再打一次，結果和第一次相同', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: 7 });
        matchStartOf(e);
        runTicks(e, TICKS);
        const first = stateOf(e);
        emit(e, { type: 'STOP_GAME' });
        emit(e, { type: 'RESET_GAME' });
        emit(e, { type: 'START_GAME', seed: 7 });
        runTicks(e, TICKS);
        expect(stateOf(e)).toBe(first);
    });

    contractTest('S2', '技能編輯進快照；還原時沒被編輯的技能回到出廠值', () => {
        const e = buildBattle('TEAMS', 41);
        const clean = captureMatch(e);
        const id = e.agents[0].skillIds[2] as string;
        const power = () => e.skillDB.find((s) => s.id === id)!.power;
        const original = power();
        emit(e, { type: 'UPDATE_SKILL', skillId: id, field: 'power', value: original + 7 });
        expect(power()).toBe(original + 7);
        const edited = captureMatch(e);
        expect(edited.skillEdits.map((s) => s.id)).toEqual([id]);
        expect(edited.skillEdits[0].power).toBe(original + 7);
        const other = new GameEngine({ audio: false });
        restoreMatch(other, edited);
        expect(other.skillDB.find((s) => s.id === id)!.power).toBe(original + 7);
        restoreMatch(e, clean);
        expect(power()).toBe(original);
        // 兩顆引擎的技能庫互不影響
        expect(other.skillDB.find((s) => s.id === id)!.power).toBe(original + 7);
        restoreMatch(other, clean);
    });

    contractTest('S2', 'hooks 與 components 不使用模擬亂數流（佈陣用獨立序列）', () => {
        const root = path.resolve(__dirname, '../..');
        const offenders: string[] = [];
        const walk = (dir: string) => {
            for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
                const rel = `${dir}/${ent.name}`;
                if (ent.isDirectory()) walk(rel);
                else if (/\.tsx?$/.test(ent.name)) {
                    const src = fs.readFileSync(path.join(root, rel), 'utf8');
                    if (/import\s*\{[^}]*\brandom\b[^}]*\}\s*from\s*['"][^'"]*math\/rng['"]/.test(src)) offenders.push(rel);
                }
            }
        };
        walk('hooks');
        walk('components');
        pendingIf('S2', offenders.length > 0, `仍 import 模擬流 random 的 UI 檔案：${offenders.join(', ')}`);
        expect(offenders).toEqual([]);
    });

    contractTest('S2', 'AgentManager 不再用 Date.now() 當 matchSalt', () => {
        const root = path.resolve(__dirname, '../..');
        const hits = ['engine/systems/agentManager.ts', 'engine/systems/ui/UICommandSystem.ts']
            .filter((f) => /matchSalt[^\n]*Date\.now\(\)/.test(fs.readFileSync(path.join(root, f), 'utf8')));
        pendingIf('S2', hits.length > 0, `matchSalt 仍來自 Date.now()：${hits.join(', ')}`);
        expect(hits).toEqual([]);
    });
});
