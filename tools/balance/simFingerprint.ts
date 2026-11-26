// ╔══════════════════════════════════════════════════════════╗
// ║  simFingerprint — 「兩場戰鬥是否相同」的唯一定義          ║
// ║  職責：情境表、隨機佈陣開戰、單位與整場狀態字串、步長。    ║
// ║  下游：tools/balance/sim-fingerprint.mjs（ssrLoadModule）、 ║
// ║        tests/contracts/simState.ts（契約驗收轉呼叫）。     ║
// ║  [ARCH] 兩邊只讀這裡，不得各自再定義欄位、情境或佈陣步驟。 ║
// ║  放在 tools/ 而不是 engine/core/：它要 new GameEngine，    ║
// ║  模擬層不得反過來 import 組合根 engine/game.ts。           ║
// ╚══════════════════════════════════════════════════════════╝
import { GameEngine } from '../../engine/game';
import type { Agent } from '../../engine/core/Agent';
import { Team, Role } from '../../types';
import type { UICommand, EffectSlot, BattleSetup } from '../../types';
import { querySpawnableHexes, layoutFactionHexes } from '../../engine/systems/ui/editorQueries';
import { random } from '../../engine/math/rng';
import { SIM_STEP_S } from '../../engine/core/Replay';

/** 模擬步長＝遊戲的固定步長（engine/core/Replay.ts 的 SIM_STEP_S，不另算）。 */
export const DT = SIM_STEP_S;

/**
 * 情境表。順序有意義：指紋工具用索引算種子（TEAMS、ROYALE、SQUADS），
 * 改順序或插入新情境就要重錄 fingerprint.baseline.json。
 */
export const SIM_SCENARIOS = {
    TEAMS: { factions: 2, unitsPerFaction: 5 },
    ROYALE: { factions: 10, unitsPerFaction: 1 },
    SQUADS: { factions: 4, unitsPerFaction: 3 },
} as const satisfies Record<string, BattleSetup>;
export type SimScenarioId = keyof typeof SIM_SCENARIOS;

/** 第 f 陣營第 u 人的職業是 ROLES[(f + u) % 5]。 */
const ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

export const emit = (e: GameEngine, cmd: UICommand): void => e.bus.emit('UI_COMMAND', cmd);

/**
 * 佈陣完成、尚未開戰的引擎：設定陣營、隨機地圖、洗牌出生格後依陣營排人。
 * matchSalt：有傳就在放單位之前設給 agentManager（體型在 addAgent 時由鹽決定）；
 * 指紋工具傳它基準專屬的 SALT，契約驗收不傳（沿用引擎初值）。
 */
export function buildBattle(scenario: SimScenarioId, seed: number, matchSalt?: number): GameEngine {
    const sc = SIM_SCENARIOS[scenario];
    const e = new GameEngine({ audio: false });
    if (matchSalt !== undefined) e.agentManager.matchSalt = matchSalt;
    e.seedSimulation(seed);
    emit(e, { type: 'SET_BATTLE_SETUP', setup: { factions: sc.factions, unitsPerFaction: sc.unitsPerFaction } });
    emit(e, { type: 'RANDOMIZE_MAP', randomizeScene: true });
    const hexes = [...querySpawnableHexes(e)];
    for (let i = hexes.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [hexes[i], hexes[j]] = [hexes[j], hexes[i]];
    }
    const layout = layoutFactionHexes(hexes, sc.factions, sc.unitsPerFaction);
    for (let f = 0; f < sc.factions; f++) {
        for (let u = 0; u < sc.unitsPerFaction; u++) {
            const hex = layout[f]?.[u];
            if (!hex) throw new Error(`${scenario}: 陣營 ${f} 第 ${u} 人沒有出生格`);
            emit(e, { type: 'PLACE_AGENT', team: f % 2 === 0 ? Team.BLUE : Team.RED, side: f, q: hex.q, r: hex.r, role: ROLES[(f + u) % ROLES.length] });
        }
    }
    if (e.agents.length !== sc.factions * sc.unitsPerFaction) throw new Error(`${scenario}: 只生成了 ${e.agents.length} 人`);
    return e;
}

const effectsOf = (a: Agent): string => (Object.entries(a.effects) as [string, EffectSlot][])
    .filter(([, s]) => s.remaining > 0)
    .map(([k, s]) => `${k}=${s.remaining}/${s.value}/${s.tag ?? ''}`).join(',');

/**
 * 單位狀態欄位，唯一一張表；字串依表的順序以 | 串接。
 * fingerprint=true 的欄位組成指紋（unitFingerprint），全部欄位組成契約驗收的狀態（unitState）。
 * fingerprint=false 的是身分與設定（陣營、職業、體型、血量上限、技能），指紋基準錄製時沒有它們：
 * 把欄位改成 true、或在 true 的欄位之間增刪換序，都要重錄 fingerprint.baseline.json。
 */
const UNIT_FIELDS: readonly { readonly get: (a: Agent) => unknown; readonly fingerprint: boolean }[] = [
    { get: (a) => a.id, fingerprint: true },
    { get: (a) => a.team, fingerprint: false },
    { get: (a) => a.side, fingerprint: false },
    { get: (a) => a.role, fingerprint: false },
    { get: (a) => a.bodyType ?? '-', fingerprint: false },
    { get: (a) => a.q, fingerprint: true },
    { get: (a) => a.r, fingerprint: true },
    { get: (a) => a.px, fingerprint: true },
    { get: (a) => a.py, fingerprint: true },
    { get: (a) => a.hp, fingerprint: true },
    { get: (a) => a.maxHp, fingerprint: false },
    { get: (a) => a.mp, fingerprint: true },
    { get: (a) => a.shield, fingerprint: true },
    { get: (a) => a.castingSkillIdx, fingerprint: true },
    { get: (a) => a.castTimer, fingerprint: true },
    { get: (a) => a.curCDs.join('/'), fingerprint: true },
    { get: (a) => a.skillIds.join('/'), fingerprint: false },
    { get: (a) => a.target?.id ?? '-', fingerprint: true },
    { get: (a) => (a.targetHex ? `${a.targetHex.q},${a.targetHex.r}` : '-'), fingerprint: true },
    { get: (a) => a.isMoving, fingerprint: true },
    { get: (a) => a.aiState, fingerprint: true },
    { get: (a) => a.actionState, fingerprint: true },
    { get: (a) => a.physics.x, fingerprint: true },
    { get: (a) => a.physics.y, fingerprint: true },
    { get: (a) => a.physics.z, fingerprint: true },
    { get: (a) => a.outOfBounds, fingerprint: true },
    { get: (a) => a.banished, fingerprint: true },
    { get: effectsOf, fingerprint: true },
];
const FINGERPRINT_FIELDS = UNIT_FIELDS.filter((f) => f.fingerprint);

/** 一個單位會影響模擬的完整狀態（契約驗收用）。 */
export const unitState = (a: Agent): string => UNIT_FIELDS.map((f) => f.get(a)).join('|');

/** 指紋用的單位狀態（UNIT_FIELDS 裡 fingerprint=true 的子集）。 */
export const unitFingerprint = (a: Agent): string => FINGERPRINT_FIELDS.map((f) => f.get(a)).join('|');

/** 指紋工具每次取樣的整場字串：取樣時的 tick 計數與所有單位的指紋。 */
export const fingerprintFrame = (e: GameEngine, tick: number): string => `${tick}#${e.agents.map(unitFingerprint).join('\n')}`;
