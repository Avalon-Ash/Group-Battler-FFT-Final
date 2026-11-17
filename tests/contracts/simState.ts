import { GameEngine } from '../../engine/game';
import type { Agent } from '../../engine/core/Agent';
import type { CommandRecord } from '../../engine/core/CommandQueue';
import { Team, Role } from '../../types';
import type { UICommand, EffectSlot } from '../../types';
import { querySpawnableHexes, layoutFactionHexes } from '../../engine/systems/ui/editorQueries';
import { random } from '../../engine/math/rng';
import { GAME_LOOP_PARAM } from '../../constants';

/**
 * 契約驗收共用：佈陣、步進、狀態字串。只用現有引擎的功能，
 * tests/contracts/SimState.test.ts 先驗過它自己（同種子相同、不同種子不同）。
 */

export const DT = 1 / GAME_LOOP_PARAM.SIM_HZ;

export const SCENARIOS = {
    TEAMS: { factions: 2, units: 5 },
    ROYALE: { factions: 10, units: 1 },
    SQUADS: { factions: 4, units: 3 },
} as const;
export type ScenarioId = keyof typeof SCENARIOS;

const ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

export const emit = (e: GameEngine, cmd: UICommand): void => e.bus.emit('UI_COMMAND', cmd);

/** 佈陣完成、尚未開戰的引擎（和 tools/balance/sim-fingerprint.mjs 同一套佈陣）。 */
export function buildBattle(scenario: ScenarioId, seed: number): GameEngine {
    const sc = SCENARIOS[scenario];
    const e = new GameEngine({ audio: false });
    e.seedSimulation(seed);
    emit(e, { type: 'SET_BATTLE_SETUP', setup: { factions: sc.factions, unitsPerFaction: sc.units } });
    emit(e, { type: 'RANDOMIZE_MAP', randomizeScene: true });
    const hexes = [...querySpawnableHexes(e)];
    for (let i = hexes.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [hexes[i], hexes[j]] = [hexes[j], hexes[i]];
    }
    const layout = layoutFactionHexes(hexes, sc.factions, sc.units);
    for (let f = 0; f < sc.factions; f++) {
        for (let u = 0; u < sc.units; u++) {
            const hex = layout[f]?.[u];
            if (!hex) throw new Error(`${scenario}: 陣營 ${f} 第 ${u} 人沒有出生格`);
            emit(e, { type: 'PLACE_AGENT', team: f % 2 === 0 ? Team.BLUE : Team.RED, side: f, q: hex.q, r: hex.r, role: ROLES[(f + u) % ROLES.length] });
        }
    }
    if (e.agents.length !== sc.factions * sc.units) throw new Error(`${scenario}: 只生成了 ${e.agents.length} 人`);
    return e;
}

/** 一個單位會影響模擬的狀態（沿用 sim-fingerprint 的欄位，另加體型）。 */
function unitState(a: Agent): string {
    const fx = (Object.entries(a.effects) as [string, EffectSlot][])
        .filter(([, s]) => s.remaining > 0)
        .map(([k, s]) => `${k}=${s.remaining}/${s.value}/${s.tag ?? ''}`).join(',');
    return [a.id, a.team, a.side, a.role, a.bodyType ?? '-', a.q, a.r, a.px, a.py, a.hp, a.maxHp, a.mp, a.shield, a.castingSkillIdx, a.castTimer,
        a.curCDs.join('/'), a.skillIds.join('/'), a.target?.id ?? '-', a.targetHex ? `${a.targetHex.q},${a.targetHex.r}` : '-', a.isMoving, a.aiState,
        a.actionState, a.physics.x, a.physics.y, a.physics.z, a.outOfBounds, a.banished, fx].join('|');
}

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
