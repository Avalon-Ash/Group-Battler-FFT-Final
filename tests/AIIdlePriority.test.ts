import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role, NodeState } from '../types';
import { BLOCK_HEIGHT } from '../constants';
import { HexUtils } from '../engine/utils';
import { BTActions, BTConditions } from '../engine/ai/BTRegistry';
import { STANDARD_AI_PROFILE, type BTDef } from '../data/ai_profiles';

/**
 * BR 發呆：每個成因一則回歸測試，外加行為樹優先序測試。
 */
describe('AIIdlePriority', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    /** 預設地圖有障礙物，測試前把周圍清成平地（也避免 addAgent 靜默回 null 讓測試空轉）。 */
    const clearArea = () => {
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
    };

    describe('成因 A：range 0 的高低差加成讓「相鄰逃生格」算成已抵達', () => {
        beforeEach(clearArea);

        it('getEffectiveRange 在 baseRange 0 時永遠回 0（不受高低差影響）', () => {
            engine.map.setHeight('0,0', 3 * BLOCK_HEIGHT);
            engine.map.setHeight('0,-1', 0);
            expect(engine.getEffectiveRange({ q: 0, r: 0 }, 0, -1, 0)).toBe(0);
            expect(engine.getEffectiveRange({ q: 0, r: -1 }, 0, 0, 0)).toBe(0);
            // 遠程仍吃高低差加成
            expect(engine.getEffectiveRange({ q: 0, r: 0 }, 0, -1, 2)).toBe(4);
        });

        it('站在高處逃往相鄰低格：moveAgentToHex 回 RUNNING 並開始移動，不是原地 SUCCESS', () => {
            const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
            if (!a) throw new Error('addAgent failed');
            engine.map.setHeight('0,0', 3 * BLOCK_HEIGHT);
            engine.map.setHeight('0,-1', 0);
            const state = engine.moveAgentToHex(a, { q: 0, r: -1 }, 0, 1.8, true);
            expect(state).toBe(NodeState.RUNNING);
            expect(a.isMoving).toBe(true);
            expect(a.path.length).toBeGreaterThan(0);
        });
    });

    describe('Survival 優先序', () => {
        beforeEach(clearArea);

        it('敵方 hazard 在腳下：Run! 要真的離開那一格（不可 SUCCESS 卻不動）', () => {
            const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
            const e = engine.agentManager.addAgent(engine, Team.RED, 3, 0, 100, Role.RANGER);
            if (!a || !e) throw new Error('addAgent failed');
            engine.map.setHeight('0,0', 3 * BLOCK_HEIGHT);
            engine.state.spatialHazards.push({
                id: 'h1', type: 'GRAVITY', cells: [{ q: 0, r: 0 }], duration: 5, sourceId: e.id, team: Team.RED,
                color: '#fff', power: 0, tickInterval: 1, lastTickTime: 0,
            });
            a.target = e;
            for (let i = 0; i < 60; i++) {
                a.forceAiUpdate = true;
                a.bt.tick(a);
                engine.movement.updateMovement(a, 1 / 30, engine);
            }
            expect(a.q === 0 && a.r === 0).toBe(false);
        });
    });
    /**
     * addAgent 會從該職業的 BASIC 技能池隨機抽（例如 wb_b2 射程 2、其餘 1），而測試斷言的是「射程 1 的近戰」
     * 追擊路徑；不釘住技能時結果會隨抽籤變動（成因 D 曾約三成機率失敗）。這裡固定成射程 1 的 BASIC。
     */
    const pinMeleeBasic = (a: NonNullable<ReturnType<typeof engine.agentManager.addAgent>>) => {
        const basic = engine.skillDB.find(s =>
            s.role === a.role && s.tag === 'BASIC' && s.range === 1 && (s.team === undefined || s.team === a.team));
        if (!basic) throw new Error(`no melee BASIC skill for ${a.role}`);
        a.skillIds[2] = basic.id;
        a.skills[2] = basic;
    };
    const mk = (team: Team, q: number, r: number, role: Role) => {
        const a = engine.agentManager.addAgent(engine, team, q, r, 500, role);
        if (!a) throw new Error(`addAgent failed @${q},${r}`);
        pinMeleeBasic(a);
        return a;
    };
    const addHazard = (q: number, r: number, team: Team) => {
        engine.state.spatialHazards.push({
            id: `h${q}_${r}`, type: 'ICE', cells: [{ q, r }], duration: 9, sourceId: 'x', team,
            color: '#fff', power: 0, tickInterval: 1, lastTickTime: 0,
        });
    };

    describe('R6：近戰不黏住孤立高台', () => {
        beforeEach(clearArea);
        it('有同層攻擊鄰格但超過爬升能力：換目標並移動', () => {
            const a = mk(Team.BLUE, -3, 0, Role.WARRIOR);
            const tower = mk(Team.RED, 0, 0, Role.WARRIOR);
            const reachable = mk(Team.RED, -3, 3, Role.WARRIOR);
            a.jump = 1;
            for (const h of [tower, ...HexUtils.neighbors(tower)]) {
                engine.map.setHeight(HexUtils.key(h), 3 * BLOCK_HEIGHT);
            }
            a.target = tower;
            engine.updateTarget(a);
            expect(a.target).toBe(reachable);
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).toBe(NodeState.RUNNING);
            expect(a.isMoving).toBe(true);
        });
        it('高台四周沒有同層攻擊格：換目標並追擊', () => {
            const a = mk(Team.BLUE, -2, 0, Role.WARRIOR);
            const tower = mk(Team.RED, 0, 0, Role.WARRIOR);
            const reachable = mk(Team.RED, 2, 0, Role.WARRIOR);
            engine.map.setHeight('0,0', BLOCK_HEIGHT);
            a.target = tower;
            engine.updateTarget(a);
            expect(a.target).toBe(reachable);
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).toBe(NodeState.RUNNING);
            expect(a.isMoving).toBe(true);
        });
    });

    describe('成因 B：被定身（root）時 Run! 不可永遠 RUNNING', () => {
        beforeEach(clearArea);

        it('CanMove 在 root／stun／fear 時為假', () => {
            const a = mk(Team.BLUE, 0, 0, Role.WARRIOR);
            expect(BTConditions['CanMove'](a, engine, {})).toBe(true);
            a.effects.ROOT.remaining = 2;
            expect(BTConditions['CanMove'](a, engine, {})).toBe(false);
        });

        it('定身 + 腳下敵方 hazard：EscapeWarning／Chase／MoveToOptimal 都不回 RUNNING，敵人貼身時照常出手', () => {
            const a = mk(Team.BLUE, 0, 0, Role.WARRIOR);
            const e = mk(Team.RED, 1, 0, Role.WARRIOR);
            addHazard(0, 0, Team.RED);
            a.effects.ROOT.remaining = 3;
            a.target = e;
            expect(BTActions['EscapeWarning'](a, engine, {})).toBe(NodeState.FAILURE);
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).not.toBe(NodeState.RUNNING);
            expect(BTActions['MoveToOptimal'](a, engine, { slot: 2 })).toBe(NodeState.FAILURE);
            a.forceAiUpdate = true;
            a.bt.tick(a);
            const startedSkill = a.castingSkillIdx !== -1 || a.curCDs.some(cd => cd > 0);
            expect(startedSkill).toBe(true);
        });

        it('定身且敵人在射程外：Chase 失敗（不是假裝在追）', () => {
            const a = mk(Team.BLUE, 0, 0, Role.WARRIOR);
            const e = mk(Team.RED, 3, 0, Role.WARRIOR);
            a.effects.ROOT.remaining = 3;
            a.target = e;
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).toBe(NodeState.FAILURE);
        });
    });

    describe('成因 C：被困在塌陷格時原地戰鬥', () => {
        beforeEach(clearArea);

        const surroundByWarning = (a: { q: number; r: number }) => {
            engine.map.warningTiles.add(HexUtils.key(a));
            for (const n of HexUtils.neighbors(a)) engine.map.warningTiles.add(HexUtils.key(n));
        };

        it('有安全鄰格可逃：SkillReady 仍拒絕在塌陷格站樁普攻', () => {
            const a = mk(Team.BLUE, 0, 0, Role.WARRIOR);
            mk(Team.RED, 1, 0, Role.WARRIOR);
            engine.map.warningTiles.add(HexUtils.key(a));
            expect(BTConditions['IsPinned'](a, engine, {})).toBe(false);
            expect(BTConditions['SkillReady'](a, engine, { slot: 2 })).toBe(false);
        });

        it('四面全是塌陷格（無路可逃）：IsPinned 為真，SkillReady 放行普攻，BT 真的出手', () => {
            const a = mk(Team.BLUE, 0, 0, Role.WARRIOR);
            const e = mk(Team.RED, 1, 0, Role.WARRIOR);
            surroundByWarning(a);
            expect(BTConditions['IsPinned'](a, engine, {})).toBe(true);
            expect(BTConditions['SkillReady'](a, engine, { slot: 2 })).toBe(true);
            a.target = e;
            a.forceAiUpdate = true;
            a.bt.tick(a);
            expect(a.castingSkillIdx !== -1 || a.curCDs.some(cd => cd > 0)).toBe(true);
        });
    });

    describe('成因 D：追擊只看「停下來的格子」是否塌陷', () => {
        beforeEach(clearArea);

        it('目標站在敵方（對我而言）hazard 裡：照樣追（RUNNING），不因此原地不動', () => {
            const a = mk(Team.BLUE, -3, 0, Role.WARRIOR);
            const e = mk(Team.RED, 1, 0, Role.WARRIOR);
            addHazard(1, 0, Team.RED); // 對 BLUE 而言是敵方 hazard
            a.target = e;
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).toBe(NodeState.RUNNING);
        });

        it('目標站在塌陷格、我在射程外且停下格也會塌：Chase 失敗，改由 Reposition 往安全格挪', () => {
            const a = mk(Team.BLUE, -3, 0, Role.WARRIOR);
            const e = mk(Team.RED, 1, 0, Role.WARRIOR);
            // 目標與它周圍一圈都是塌陷格 → 近戰靠近必停在塌陷格
            engine.map.warningTiles.add(HexUtils.key(e));
            for (const n of HexUtils.neighbors(e)) engine.map.warningTiles.add(HexUtils.key(n));
            a.target = e;
            expect(BTActions['ChaseTarget'](a, engine, { slot: 2 })).toBe(NodeState.FAILURE);
            const before = HexUtils.dist(a, e);
            expect(BTActions['Reposition'](a, engine, {})).toBe(NodeState.RUNNING);
            expect(a.isMoving).toBe(true);
            const dest = a.path[a.path.length - 1];
            expect(HexUtils.dist(dest, e)).toBeLessThan(before);
            expect(engine.isWarningTile(HexUtils.key(dest))).toBe(false);
        });

        it('Reposition 找不到更近的安全格時回 FAILURE（不原地假裝動）', () => {
            const a = mk(Team.BLUE, -3, 0, Role.WARRIOR);
            const e = mk(Team.RED, -2, 0, Role.WARRIOR); // 已貼身
            a.target = e;
            expect(BTActions['Reposition'](a, engine, {})).toBe(NodeState.FAILURE);
        });
    });

    describe('優先序（資料驅動的 BT 順序）', () => {
        const find = (d: BTDef, name: string): BTDef | undefined => {
            if (d.name === name) return d;
            for (const c of d.children ?? []) { const r = find(c, name); if (r) return r; }
            return undefined;
        };
        const names = (d: BTDef | undefined) => (d?.children ?? []).map(c => c.name);

        it('Root：死亡 > CC > Survival > Combat', () => {
            expect(names(STANDARD_AI_PROFILE)).toEqual(['Dead Check', 'CC Check', 'Survival', 'Combat']);
        });

        it('Survival Tactics：逃跑 > 背水一戰推拉', () => {
            expect(names(find(STANDARD_AI_PROFILE, 'Survival Tactics'))).toEqual(['Run!', 'Last Stand']);
        });

        it('Combat Actions：技能 > 追擊 > 走位 > 待命（Idle 一定最後）', () => {
            expect(names(find(STANDARD_AI_PROFILE, 'Combat Actions'))).toEqual(['Skill Priority', 'Gap Close', 'Reposition', 'Idle']);
            expect(names(find(STANDARD_AI_PROFILE, 'Skill Priority'))).toEqual(['Try Ultimate', 'Try Active', 'Try Basic']);
        });
    });
});
