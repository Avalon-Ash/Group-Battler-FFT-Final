// ╔══════════════════════════════════════════════════════════╗
// ║  MatchSnapshot — 開戰快照的擷取與還原（契約 S2）           ║
// ║  職責：把「開戰瞬間的戰場」變成純資料，再從純資料還原。    ║
// ║        回放、重開、undo 都從快照開始，不重播佈陣指令、      ║
// ║        不重新生成地圖（MapGenerator.rebuild 會抽亂數）。    ║
// ║  上游：UICommandSystem（START_GAME 擷取、RESET_GAME 還原）、║
// ║        回放（engine/core/Replay.ts）、工具與測試。          ║
// ║  [ARCH] 起點（快照＋種子）與開戰後的指令紀錄存在           ║
// ║  CommandQueue，唯一寫入者 UICommandSystem（START_GAME）。   ║
// ║  restoreMatch 走既有的清盤與生成路徑（GameEngine.clear、    ║
// ║  AgentManager.addAgent），不另寫一套初始化；                ║
// ║  不得為了讓驗收通過而在這裡補個別欄位的特例。              ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../game';
import type { MatchSnapshot, MatchStart, Skill } from '../../types';
import type { CommandRecord } from './CommandQueue';
import { DEFAULT_SKILL_DB } from '../../skillDatabase';
import { SCENE_DB } from '../../data/scenes';
import { HexUtils } from '../utils';
import { saveAgentState } from './AgentLifecycle';
import { issueOrder } from './Orders';

const SNAPSHOT_VERSION = 1;

/** 出廠技能庫的獨立副本：每顆引擎各有一份，編輯技能不會改到出廠值或別的引擎。 */
export function factorySkills(): Skill[] {
    return DEFAULT_SKILL_DB.map((s) => structuredClone(s));
}

const byQR = (a: { q: number; r: number }, b: { q: number; r: number }): number => a.q - b.q || a.r - b.r;

const parseKey = (key: string): { q: number; r: number } => {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
};

/** 和出廠值不同的技能（整筆副本）。出廠沒有的技能也算。 */
function skillEditsOf(skillDB: readonly Skill[]): Skill[] {
    const factory = new Map(DEFAULT_SKILL_DB.map((s) => [s.id, JSON.stringify(s)]));
    return skillDB.filter((s) => factory.get(s.id) !== JSON.stringify(s)).map((s) => structuredClone(s));
}

/** 擷取目前戰場（未開戰或剛開戰都可）。回傳值是純資料，和引擎不共用任何物件。 */
export function captureMatch(engine: GameEngine): MatchSnapshot {
    const { w, h, offsetX, offsetY, layout } = engine.mapConfig;
    return {
        v: SNAPSHOT_VERSION,
        mapConfig: { w, h, offsetX, offsetY, layout },
        sceneId: engine.currentScene.id,
        tiles: [...engine.map.mapKeys].map((k) => ({ ...parseKey(k), h: engine.map.getHeightByKey(k) })).sort(byQR),
        obstacles: [...engine.map.obstacles].map(([k, type]) => ({ ...parseKey(k), type })).sort(byQR),
        zoneConfig: { ...engine.zoneConfig },
        battleSetup: { ...engine.battleSetup },
        skillEdits: skillEditsOf(engine.skillDB),
        units: engine.agents.map((a) => ({
            id: a.id,
            team: a.team,
            side: a.side,
            role: a.role,
            q: a.q,
            r: a.r,
            hp: a.hp,
            maxHp: a.maxHp,
            maxMp: a.maxMp,
            skillIds: [...a.skillIds],
            ...(a.bodyType !== undefined ? { bodyType: a.bodyType } : {}),
            look: { ...a.look },
            ...(a.controller !== 'AI' ? { controller: a.controller } : {}),
            ...(a.stance !== 'HOLD' ? { stance: a.stance } : {}),
            ...(a.order ? { order: { ...a.order } } : {}),
            aiUpdateInterval: a.aiUpdateInterval,
        })),
        entityCounter: engine.entityCounter,
    };
}

/**
 * 把引擎還原成快照的樣子：停機、清盤、地圖／障礙物／設定／技能庫／單位照快照重建。
 * 完成後引擎處於「佈陣完成、尚未開戰」，可以直接送 START_GAME。
 */
export function restoreMatch(engine: GameEngine, snapshot: MatchSnapshot): void {
    const scene = SCENE_DB.find((s) => s.id === snapshot.sceneId);
    if (!scene) throw new Error(`restoreMatch: 找不到場景 ${snapshot.sceneId}`);

    // 清盤但不重新生成地圖（重新生成會抽亂數、換地形）
    engine.clear(true, true);

    // 設定物件原地覆寫：畫面與面板可能持有同一個物件
    Object.assign(engine.mapConfig, snapshot.mapConfig);
    Object.assign(engine.zoneConfig, snapshot.zoneConfig);
    Object.assign(engine.battleSetup, snapshot.battleSetup);
    engine.currentScene = scene;

    const edits = new Map(snapshot.skillEdits.map((s) => [s.id, s]));
    const skills = factorySkills().map((s) => (edits.has(s.id) ? structuredClone(edits.get(s.id)!) : s));
    for (const s of snapshot.skillEdits) if (!DEFAULT_SKILL_DB.some((f) => f.id === s.id)) skills.push(structuredClone(s));
    engine.skillDB.length = 0;
    engine.skillDB.push(...skills);

    // 地圖：格子、高度、障礙物照快照寫回；版本號照 MapGenerator.rebuild 的做法遞增，讓快取重烘
    const map = engine.map;
    map.resetData();
    for (const t of snapshot.tiles) {
        map.registerTile(t.q, t.r);
        map.setHeight(HexUtils.key(t), t.h);
    }
    for (const o of snapshot.obstacles) map.setObstacle(o.q, o.r, o.type);
    engine.mapVersion++;
    map.generation++;

    // 單位：走一般的生成路徑，再把快照的欄位蓋上去（同 PLACE_AGENT）
    for (const u of snapshot.units) {
        const a = engine.agentManager.addAgent(engine, u.team, u.q, u.r, u.maxHp, u.role, u.bodyType, u.side, { ...u.look }, u.id);
        if (!a) throw new Error(`restoreMatch: 單位 ${u.id} 無法放在 ${u.q},${u.r}`);
        a.skillIds = [...u.skillIds];
        a.hp = u.hp;
        a.maxMp = u.maxMp;
        a.aiUpdateInterval = u.aiUpdateInterval;
        a.controller = u.controller ?? 'AI';
        a.stance = u.stance ?? 'HOLD';
        if (u.order) issueOrder(a, { ...u.order });
        saveAgentState(a);
    }
    engine.restoreEntityCounter(snapshot.entityCounter);
    engine.bus.emit('ENV_UPDATE', {});
}

/** 這一場的起點。還沒開過戰就丟錯（呼叫端的錯誤，不是待辦）。 */
export function matchStartOf(engine: GameEngine): MatchStart {
    const start = engine.commands.matchStart;
    if (!start) throw new Error('matchStartOf: 這顆引擎還沒開過戰（沒有 START_GAME）');
    return start;
}

/** 這一場開戰之後套用過的指令，依套用順序；不含 START_GAME 本身。 */
export function battleLogOf(engine: GameEngine): readonly CommandRecord[] {
    return engine.commands.battleLog;
}
