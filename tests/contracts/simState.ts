import type { GameEngine } from '../../engine/game';
import type { CommandRecord } from '../../engine/core/CommandQueue';
import { Team } from '../../types';
import { DT, emit, unitState } from '../../tools/balance/simFingerprint';

/**
 * 契約驗收共用：佈陣、步進、狀態字串。只用現有引擎的功能，
 * tests/contracts/SimState.test.ts 先驗過它自己（同種子相同、不同種子不同）。
 * 情境表、佈陣、步長與單位狀態欄位和 tools/balance/sim-fingerprint.mjs 共用
 * tools/balance/simFingerprint.ts，這裡只轉出，不另外定義。
 */

export { DT, emit, buildBattle, SIM_SCENARIOS as SCENARIOS } from '../../tools/balance/simFingerprint';
export type { SimScenarioId as ScenarioId } from '../../tools/balance/simFingerprint';

/** 整個戰場的狀態字串：tick、戰鬥時間、地圖格數、障礙物、所有單位。 */
export function stateOf(e: GameEngine): string {
    const obstacles = [...e.map.obstacles.entries()].map(([k, t]) => `${k}=${t}`).sort().join(';');
    return [`tick=${e.state.time.tick}`, `t=${e.battleTime}`, `tiles=${e.map.mapKeys.size}`, `obs=${obstacles}`, ...e.agents.map(unitState)].join('\n');
}

/** 地形（高度與障礙物）的字串，重開前後比對用。 */
export function terrainOf(e: GameEngine): string {
    const heights = [...e.map.heightMap.entries()].map(([k, h]) => `${k}=${h}`).sort().join(';');
    const obstacles = [...e.map.obstacles.entries()].map(([k, t]) => `${k}=${t}`).sort().join(';');
    return `${heights}#${obstacles}`;
}

/** 沒有障礙物也沒有人站的格子，依 q、r 排序後取第 n 個（決定性）。 */
function freeHex(e: GameEngine, n: number = 0): { q: number; r: number } {
    const free = [...e.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
        .filter((h) => !e.hasObstacle(h.q, h.r) && !e.agents.some((a) => a.q === h.q && a.r === h.r))
        .sort((a, b) => a.q - b.q || a.r - b.r);
    if (!free[n]) throw new Error('沒有空格');
    return free[n];
}

/**
 * 用現有的 engine.tick 跑 n 個 tick（引擎停了就提早結束）。
 * before：每個 tick 之前呼叫（送指令用）；每 sampleEvery 個 tick 取一次狀態字串。
 */
export function runTicks(e: GameEngine, n: number, before?: (e: GameEngine, tick: number) => void, sampleEvery: number = 30): string[] {
    const samples: string[] = [];
    for (let i = 0; i < n && e.isRunning; i++) {
        before?.(e, e.state.time.tick);
        e.tick(DT);
        if (e.state.time.tick % sampleEvery === 0) samples.push(stateOf(e));
    }
    return samples;
}

/** 照紀錄餵指令：回傳的函式交給 runTicks 的 before，會在紀錄的 tick 送出同一個指令。 */
export function feeder(log: readonly CommandRecord[]): (e: GameEngine, tick: number) => void {
    let idx = 0;
    return (e, tick) => {
        while (idx < log.length && log[idx].tick <= tick) emit(e, log[idx++].cmd);
    };
}

/** 驗收共用的戰中指令：tick 120 把第二個單位打到 1 血、180 放一個障礙物、240 生成一個單位（不指定體型與技能）。 */
export function battleScript(e: GameEngine, tick: number): void {
    if (tick === 120) emit(e, { type: 'EDIT_AGENT', agentId: e.agents[1].id, hp: 1 });
    if (tick === 180) { const h = freeHex(e, 0); emit(e, { type: 'SET_OBSTACLE', q: h.q, r: h.r }); }
    if (tick === 240) { const h = freeHex(e, 3); emit(e, { type: 'PLACE_AGENT', team: Team.BLUE, q: h.q, r: h.r }); }
}
