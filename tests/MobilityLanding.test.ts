// ╔══════════════════════════════════════════════════════════╗
// ║  MobilityLanding — 機動技的射程、落點與不出場規則          ║
// ║  規則與理由：docs/DECISIONS.md「機動技落點」。             ║
// ║  用真的引擎結算；每條都能對照改前的行為（改前全部失敗，    ║
// ║  標「對照組」的除外）。                                    ║
// ╚══════════════════════════════════════════════════════════╝

import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { CombatSystem } from '../engine/systems/combat/CombatSystem';
import { CCManager } from '../engine/systems/combat/CCManager';
import { BTConditions } from '../engine/ai/BTRegistry';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, MOBILITY_LANDING } from '../constants';
import { Role, Team } from '../types';
import type { Skill, SpatialHazard } from '../types';

type SkillTag = Skill['tag'];

const HP = 100000;

function makeSkill(over: Partial<Skill>): Skill {
    return {
        id: 'm_test', tag: 'MOBILITY', role: Role.WARRIOR, name: 'm_test', range: 5, cast: 0.2, cd: 1, cost: 0, gain: 0,
        type: 'SINGLE', power: 100, color: '#ffffff', visual: 'SLASH', projectileSpeed: 0, ...over,
    };
}

const engines: GameEngine[] = [];
afterEach(() => {
    for (const e of engines.splice(0)) { e.stop(); e.clear(); }
});

/** 全平地、沒有障礙的場地 */
function arena() {
    const engine = new GameEngine();
    engines.push(engine);
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    for (const k of engine.map.mapKeys) engine.map.heightMap.set(k, 0);
    const spawn = (team: Team, q: number, r: number, role = Role.WARRIOR) => {
        if (!engine.isValid(q, r)) throw new Error(`測試場地沒有這一格 ${q},${r}`);
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, role);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP; a.hp = HP; a.shield = 0; a.spawnTimer = 0;
        return a;
    };
    const setTier = (q: number, r: number, tier: number) => engine.map.heightMap.set(HexUtils.key({ q, r }), tier * BLOCK_HEIGHT);
    const warn = (q: number, r: number) => engine.map.warningTiles.add(HexUtils.key({ q, r }));
    const voidCell = (q: number, r: number) => engine.map.removeTile(q, r);
    const obstacle = (q: number, r: number) => engine.map.setObstacle(q, r, 'ROCK');
    const hazardAt = (cells: { q: number; r: number }[], owner: Agent) => {
        const h: SpatialHazard = {
            id: `hz_${cells.length}_${owner.id}`, type: 'FIRE', cells, duration: 99, sourceId: owner.id, team: owner.team, side: owner.side,
            color: '#ff0000', power: 1, tickInterval: 1, lastTickTime: 0,
        };
        engine.state.spatialHazards.push(h);
    };
    return { engine, spawn, setTier, warn, voidCell, obstacle, hazardAt };
}

/** 走完整的施放流程（詠唱、出手、結算） */
function cast(engine: GameEngine, source: Agent, target: Agent | null, skill: Skill, midCast?: () => void) {
    const combat = new CombatSystem();
    source.skills = [skill];
    source.curCDs = [0];
    source.target = target;
    source.targetHex = null;
    combat.initiateCast(source, 0, engine);
    midCast?.();
    combat.update(5, engine);
}

function worthIt(engine: GameEngine, source: Agent, target: Agent | null, skill: Skill): boolean {
    source.skills = [skill];
    source.curCDs = [0];
    source.target = target;
    return BTConditions['ActivationMet'](source, engine, { slot: 0 });
}

const dash = (over: Partial<Skill> = {}) => makeSkill({ onCast: [{ action: 'DASH' }], activation: { targetBeyond: 1 }, intents: ['GAP_CLOSE'], ...over });
const retreat = (tiles = 3, over: Partial<Skill> = {}) => makeSkill({
    range: 4, onCast: [{ action: 'RETREAT', tiles }], activation: { enemyWithin: 2 }, intents: ['ESCAPE'], ...over,
});
const moved = (a: Agent, from: { q: number; r: number }) => HexUtils.dist(a, from);

describe('機動技的射程不吃高度', () => {
    it('站高站低都是資料寫的射程；非機動技照舊（對照組）', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const s = makeSkill({ range: 5 });
        const active = makeSkill({ range: 5, tag: 'ACTIVE' });

        w.setTier(0, 0, 2);
        expect(w.engine.getSkillRange(a, 3, 0, s)).toBe(5);
        expect(w.engine.getSkillRange(a, 3, 0, active)).toBe(7);
        w.setTier(0, 0, 0);
        w.setTier(3, 0, 2);
        expect(w.engine.getSkillRange(a, 3, 0, s)).toBe(5);
        expect(w.engine.getSkillRange(a, 3, 0, active)).toBe(3);
    });
    it('站高地的突進：目標超過資料射程就不放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, -3, 0);
        w.setTier(-3, 0, 2);
        const far = w.spawn(Team.RED, 3, 0); // 距離 6，舊規則射程 7
        expect(worthIt(w.engine, a, far, dash())).toBe(false);
    });
    it('站高地的鉤子：目標超過資料射程就不放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, -3, 0);
        w.setTier(-3, 0, 2);
        const far = w.spawn(Team.RED, 4, 0); // 距離 7，舊規則射程 8
        expect(worthIt(w.engine, a, far, makeSkill({ range: 6, activation: { targetBeyond: 1 }, intents: ['HOOK'] }))).toBe(false);
    });
});

describe('突進：落點由規劃決定', () => {
    it('對照組：平地、直線暢通，衝到目標身邊', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 4, 0);
        expect(worthIt(w.engine, a, t, dash())).toBe(true);
        cast(w.engine, a, t, dash());
        expect(HexUtils.dist(a, t)).toBe(1);
        expect(t.hp).toBeLessThan(HP);
    });
    it('目標在詠唱中跑遠：位移不超過資料射程，也不隔空打中', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, -3, 0);
        const t = w.spawn(Team.RED, 0, 0);
        cast(w.engine, a, t, dash(), () => w.engine.updateAgentPosition(t, 5, 0)); // 距離變 8
        expect(moved(a, { q: -3, r: 0 })).toBeLessThanOrEqual(5);
        expect(t.hp).toBe(HP);
    });
    it('直線被障礙物擋住：改落目標身邊走得到的另一格', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 4, 0);
        w.obstacle(2, 0);
        // 前提：確實有另一格直線走得到
        const open = HexUtils.neighbors(t).filter((n) => HexUtils.dist(a, n) <= 5
            && !HexUtils.line(a, n).some((h) => h.q === 2 && h.r === 0));
        expect(open.length).toBeGreaterThan(0);
        expect(worthIt(w.engine, a, t, dash())).toBe(true);
        cast(w.engine, a, t, dash());
        expect(HexUtils.dist(a, t)).toBe(1);
    });
    it('目標身邊全部到不了：不放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 4, 0);
        for (const n of HexUtils.neighbors(t)) w.obstacle(n.q, n.r);
        expect(worthIt(w.engine, a, t, dash())).toBe(false);
    });
    it('目標在高柱上，落地也打不到：不放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0);
        w.setTier(3, 0, 6);
        expect(worthIt(w.engine, a, t, dash())).toBe(false);
    });
    it('詠唱途中路被封死：不隔空打中', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 4, 0);
        cast(w.engine, a, t, dash(), () => { for (const n of HexUtils.neighbors(t)) w.obstacle(n.q, n.r); });
        expect(t.hp).toBe(HP);
    });
    it('不落在警告格', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0);
        w.warn(2, 0); // 最近的那一格
        cast(w.engine, a, t, dash());
        expect(HexUtils.dist(a, t)).toBe(1);
        expect(w.engine.isWarningTile(HexUtils.key(a))).toBe(false);
    });
    it('不落在敵方危害區；自己人的不用避（對照組）', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0);
        w.hazardAt([{ q: 2, r: 0 }], t);
        cast(w.engine, a, t, dash());
        expect(HexUtils.dist(a, t)).toBe(1);
        expect([a.q, a.r]).not.toEqual([2, 0]);

        const w2 = arena();
        const a2 = w2.spawn(Team.BLUE, 0, 0);
        const t2 = w2.spawn(Team.RED, 3, 0);
        w2.hazardAt([{ q: 2, r: 0 }], a2);
        cast(w2.engine, a2, t2, dash());
        expect([a2.q, a2.r]).toEqual([2, 0]);
    });
    it('範圍突進：震擊以落地格為中心', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0);
        const beside = w.spawn(Team.RED, 1, 1); // 落地格 (2,0) 的鄰格，離目標 2 格
        cast(w.engine, a, t, dash({ type: 'AOE', aoeRadius: 1 }));
        expect([a.q, a.r]).toEqual([2, 0]);
        expect(t.hp).toBeLessThan(HP);
        expect(beside.hp).toBeLessThan(HP);
    });
});

describe('後撤：看全場威脅選落點', () => {
    it('對照組：後方安全就拉開', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        cast(w.engine, a, e, retreat());
        expect(HexUtils.dist(a, e)).toBeGreaterThan(1);
    });
    it('跳開前瞄準的敵人照樣打中，落地超出射程也一樣', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        cast(w.engine, a, e, retreat(3, { range: 3 }));
        expect(HexUtils.dist(a, e)).toBeGreaterThan(3);
        expect(e.hp).toBeLessThan(HP);
    });
    it('不跳進警告格', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        for (const k of w.engine.map.mapKeys) {
            const [q, r] = k.split(',').map(Number);
            if (q <= -2) w.warn(q, r);
        }
        cast(w.engine, a, e, retreat());
        expect(moved(a, { q: 0, r: 0 })).toBeGreaterThan(0);
        expect(w.engine.isWarningTile(HexUtils.key(a))).toBe(false);
    });
    it('不跳進敵方危害區', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        const behind: { q: number; r: number }[] = [];
        for (const k of w.engine.map.mapKeys) {
            const [q, r] = k.split(',').map(Number);
            if (q <= -2) behind.push({ q, r });
        }
        w.hazardAt(behind, e);
        cast(w.engine, a, e, retreat());
        expect(moved(a, { q: 0, r: 0 })).toBeGreaterThan(0);
        expect(w.engine.getSpatialHazardsAt(a.q, a.r).length).toBe(0);
    });
    it('看所有敵人，不躲一個撞上另一個', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        const other = w.spawn(Team.RED, -3, 0);
        cast(w.engine, a, e, retreat());
        expect(Math.min(HexUtils.dist(a, e), HexUtils.dist(a, other))).toBeGreaterThanOrEqual(3);
    });
    it('拉開到安全距離就停，不必走滿', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, MOBILITY_LANDING.ESCAPE_SAFE_DIST - 2, 0);
        cast(w.engine, a, e, retreat(3));
        expect(moved(a, { q: 0, r: 0 })).toBe(2);
        expect(HexUtils.dist(a, e)).toBe(MOBILITY_LANDING.ESCAPE_SAFE_DIST);
    });
    it('有別的選擇時不貼場邊', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 1, 0);
        for (const k of [...w.engine.map.mapKeys]) {
            const [q, r] = k.split(',').map(Number);
            if (q <= -4) w.voidCell(q, r);
        }
        cast(w.engine, a, e, retreat());
        expect(moved(a, { q: 0, r: 0 })).toBeGreaterThan(0);
        expect(HexUtils.neighbors(a).every((n) => w.engine.isValid(n.q, n.r))).toBe(true);
    });
    it('沒有比現在更安全的格：不放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 2, 0);
        for (const n of HexUtils.neighbors(a)) w.obstacle(n.q, n.r);
        expect(worthIt(w.engine, a, e, retreat())).toBe(false);
    });
    it('對照組：真的有路可退就放', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const e = w.spawn(Team.RED, 2, 0);
        expect(worthIt(w.engine, a, e, retreat())).toBe(true);
    });
});

describe('瞬移（奧義）：射程不改，只加落點安全', () => {
    it('不落在警告格或敵方危害區', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0);
        // 離施法者最遠的三格（舊規則會選它們）
        w.warn(4, 0);
        w.warn(4, -1);
        w.hazardAt([{ q: 3, r: 1 }], t);
        cast(w.engine, a, t, makeSkill({ tag: 'ULT', range: 6, onCast: [{ action: 'BLINK' }] }));
        expect(HexUtils.dist(a, t)).toBe(1);
        expect(w.engine.isWarningTile(HexUtils.key(a))).toBe(false);
        expect(w.engine.getSpatialHazardsAt(a.q, a.r).length).toBe(0);
    });
    it('奧義射程照舊吃高度（對照組）', () => {
        const w = arena();
        const a = w.spawn(Team.BLUE, 0, 0);
        w.setTier(0, 0, 2);
        expect(w.engine.getSkillRange(a, 3, 0, makeSkill({ tag: 'ULT', range: 6 }))).toBe(8);
    });
});

describe('拉扯：最多拉到身邊，任何技能都不會拉出場', () => {
    const pull = (tag: SkillTag) => makeSkill({ tag });

    it('斜向拉扯不會穿過施法者', () => {
        const w = arena();
        const src = w.spawn(Team.BLUE, 2, -2);
        const t = w.spawn(Team.RED, 3, 0, Role.MAGE); // 距離 3、力道 4：舊規則拉 4 格，穿過去
        CCManager.applyCC(src, t, pull('MOBILITY'), 'PULL', 0, 4, undefined, w.engine);
        expect(HexUtils.dist(t, src)).toBe(1);
        expect(HexUtils.dist(t, { q: 3, r: 0 })).toBe(2);
    });
    it.each(['MOBILITY', 'ULT'] as const)('%s：路上是虛空就停在原地前一格', (tag) => {
        const w = arena();
        const src = w.spawn(Team.BLUE, 0, 0);
        const t = w.spawn(Team.RED, 3, 0, Role.MAGE);
        w.voidCell(2, 0);
        CCManager.applyCC(src, t, pull(tag), 'PULL', 0, 4, undefined, w.engine);
        expect(w.engine.isValid(t.q, t.r)).toBe(true);
    });
});

describe('擊退：機動技推到場邊就停，奧義可擊出場外', () => {
    const scene = (tag: SkillTag) => {
        const w = arena();
        for (const k of [...w.engine.map.mapKeys]) {
            const [q, r] = k.split(',').map(Number);
            if (q >= 3) w.voidCell(q, r);
        }
        const src = w.spawn(Team.BLUE, 1, 0);
        const t = w.spawn(Team.RED, 2, 0, Role.MAGE);
        CCManager.applyCC(src, t, makeSkill({ tag }), 'KNOCKBACK', 0, 3, undefined, w.engine);
        return { w, t };
    };
    it('機動技：停在場內，沒有撞擊傷害', () => {
        const { w, t } = scene('MOBILITY');
        expect(w.engine.isValid(t.q, t.r)).toBe(true);
        expect(t.hp).toBe(HP);
    });
    it('奧義：照舊擊出場外（對照組）', () => {
        const { w, t } = scene('ULT');
        expect(w.engine.isValid(t.q, t.r)).toBe(false);
    });
});
