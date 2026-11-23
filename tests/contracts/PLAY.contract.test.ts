import { describe, expect } from 'vitest';
import { GameEngine } from '../../engine/game';
import type { Agent } from '../../engine/core/Agent';
import { Role, Team } from '../../types';
import type { Skill } from '../../types';
import { PLAY_PARAM, GAME_APP_PARAM } from '../../constants';
import { MatchFlowSystem } from '../../engine/systems/match/MatchFlowSystem';
import { selectSessionView, appModeOf } from '../../engine/systems/ui/views/session';
import { effectiveTimeScale } from '../../engine/core/FixedStep';
import { queryCastTargeting } from '../../engine/systems/ui/castTargeting';
import { contractTest } from './contractTest';
import { buildBattle, emit, runTicks, DT } from './simState';

/**
 * 契約 P1、P2、P5：PLAY 模式（docs/plans/play-mode.md、ADR 0025）。
 * P1 流程：選主角 → 自動佈陣 → 開戰 → 結算（不自己轉場）→ 再來一場／回主畫面。
 * P2 瞄準放慢：aimFactor 是另一個倍率因子，畫面指令、不進紀錄、不改模擬結果。
 * P5 選目標規則：一個純函式回答「這一槽能點誰」。
 */

const MS_PER_S = 1000;

/** 這個職業、藍方可用的四槽技能（奧義、主動、普攻、機動），各取資料庫裡的第一招 */
function loadoutOf(db: readonly Skill[], role: Role): string[] {
    const own = db.filter((s) => s.role === role && (s.team === undefined || s.team === Team.BLUE));
    return (['ULT', 'ACTIVE', 'BASIC', 'MOBILITY'] as const).map((tag) => {
        const s = own.find((k) => k.tag === tag);
        if (!s) throw new Error(`${role} 沒有 ${tag}`);
        return s.id;
    });
}

describe('契約 P1 PLAY 流程', () => {
    const make = () => {
        const e = new GameEngine({ audio: false });
        let seed = 500;
        const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
        let starts = 0;
        e.bus.on('GAME_START', () => { starts++; });
        return { e, flow, starts: () => starts };
    };
    /** 跑流程直到開戰（最多 10 秒的畫面） */
    const untilStarted = (e: GameEngine, flow: MatchFlowSystem) => {
        for (let frame = 0; frame < 600 && !e.battleStarted; frame++) flow.update(DT);
        expect(e.battleStarted).toBe(true);
    };
    /** 打到分出勝負（最多 20 分鐘的模擬時間） */
    const untilOver = (e: GameEngine, flow: MatchFlowSystem) => {
        for (let frame = 0; frame < 60 * 60 * 20 && flow.phase !== 'RESULT_HOLD'; frame++) {
            flow.update(DT);
            if (e.isRunning) e.tick(DT);
        }
        expect(flow.phase).toBe('RESULT_HOLD');
    };
    const heroOf = (e: GameEngine): Agent => {
        const players = e.agents.filter((a) => a.controller === 'PLAYER');
        expect(players).toHaveLength(1);
        return players[0];
    };

    contractTest('P1', 'startPlay：一隻主角在藍方交給玩家，其他單位 AI，兩個陣營，開戰', () => {
        const { e, flow, starts } = make();
        flow.setShowcase(true);
        flow.startPlay({ role: Role.TANK });
        untilStarted(e, flow);
        expect(starts()).toBeGreaterThanOrEqual(1);
        const hero = heroOf(e);
        expect(hero.side).toBe(0);
        expect(hero.team).toBe(Team.BLUE);
        expect(hero.role).toBe(Role.TANK);
        expect(flow.playHeroId).toBe(hero.id);
        expect(e.agents.filter((a) => a !== hero).every((a) => a.controller === 'AI')).toBe(true);
        expect(new Set(e.agents.map((a) => a.side)).size).toBe(2);
        expect(flow.isPlay).toBe(true);
        expect(flow.isShowcase).toBe(false);
        const view = selectSessionView(e);
        expect(view.isPlay).toBe(true);
        expect(appModeOf(view)).toBe('PLAY');
        // 主角是玩家控制這件事在開戰快照裡：回放重開時還是玩家的
        const snap = e.commands.matchStart?.snapshot.units.find((u) => u.id === hero.id);
        expect(snap?.controller).toBe('PLAYER');
    }, 60000);

    contractTest('P1', 'startPlay 帶技能：主角的四槽照選的；undefined 的槽照一般生成', () => {
        const { e, flow } = make();
        const chosen = loadoutOf(e.skillDB, Role.MAGE);
        flow.startPlay({ role: Role.MAGE, skillIds: chosen });
        untilStarted(e, flow);
        expect(heroOf(e).skillIds).toEqual(chosen);

        const { e: e2, flow: flow2 } = make();
        flow2.startPlay({ role: Role.MAGE, skillIds: [chosen[0], undefined, null, chosen[3]] });
        untilStarted(e2, flow2);
        const ids = heroOf(e2).skillIds;
        expect(ids[0]).toBe(chosen[0]);
        expect(typeof ids[1]).toBe('string');
        expect(ids[2]).toBeNull();
        expect(ids[3]).toBe(chosen[3]);
    }, 60000);

    contractTest('P1', '結算停在 RESULT_HOLD，不像展示模式自己轉場開下一局', () => {
        const { e, flow, starts } = make();
        flow.startPlay({ role: Role.WARRIOR });
        untilStarted(e, flow);
        untilOver(e, flow);
        expect(flow.result).not.toBeNull();
        const before = starts();
        const frames = Math.ceil((GAME_APP_PARAM.RESULT_HOLD_MS * 3) / (DT * MS_PER_S));
        for (let frame = 0; frame < frames; frame++) flow.update(DT);
        expect(flow.phase).toBe('RESULT_HOLD');
        expect(starts()).toBe(before);
        expect(appModeOf(selectSessionView(e))).toBe('PLAY');
    }, 60000);

    contractTest('P1', 'nextPlayMatch：同一個主角設定、新戰場、新種子', () => {
        const { e, flow, starts } = make();
        flow.startPlay({ role: Role.RANGER });
        untilStarted(e, flow);
        const firstSeed = e.commands.matchStart?.seed;
        untilOver(e, flow);
        const before = starts();
        flow.nextPlayMatch();
        untilStarted(e, flow);
        expect(starts()).toBe(before + 1);
        expect(e.commands.matchStart?.seed).not.toBe(firstSeed);
        const hero = heroOf(e);
        expect(hero.role).toBe(Role.RANGER);
        expect(hero.side).toBe(0);
        expect(flow.playHeroId).toBe(hero.id);
        expect(flow.isPlay).toBe(true);
    }, 60000);

    contractTest('P1', 'exitPlay：回到展示模式，場上不再有玩家單位', () => {
        const { e, flow } = make();
        flow.startPlay({ role: Role.SUPPORT });
        untilStarted(e, flow);
        flow.exitPlay();
        expect(flow.isPlay).toBe(false);
        expect(flow.isShowcase).toBe(true);
        expect(flow.playHeroId).toBeNull();
        for (let frame = 0; frame < 600 && !e.battleStarted; frame++) flow.update(DT);
        expect(e.agents.some((a) => a.controller === 'PLAYER')).toBe(false);
        expect(appModeOf(selectSessionView(e))).toBe('SHOWCASE');
    }, 60000);
});

describe('契約 P2 瞄準放慢', () => {
    contractTest('P2', 'SET_AIM_SLOWMO 只改 aimFactor，倍率相乘，不進指令紀錄', () => {
        const e = buildBattle('TEAMS', 61);
        emit(e, { type: 'START_GAME', seed: 3 });
        runTicks(e, 10);
        const logged = e.commands.log.length;
        emit(e, { type: 'SET_TIME_SCALE', timeScale: 2 });
        runTicks(e, 120);
        emit(e, { type: 'SET_AIM_SLOWMO', active: true });
        expect(e.state.time.aimFactor).toBe(PLAY_PARAM.AIM_SLOWMO_FACTOR);
        expect(effectiveTimeScale(e.state.time)).toBeCloseTo(e.state.time.timeScale * PLAY_PARAM.AIM_SLOWMO_FACTOR, 9);
        emit(e, { type: 'SET_AIM_SLOWMO', active: false });
        expect(e.state.time.aimFactor).toBe(1);
        expect(effectiveTimeScale(e.state.time)).toBeCloseTo(e.state.time.timeScale, 9);
        // SET_TIME_SCALE 照舊進紀錄，SET_AIM_SLOWMO 不進
        expect(e.commands.log.slice(logged).map((r) => r.cmd.type)).toEqual(['SET_TIME_SCALE']);
    });

    contractTest('P2', '放慢開關不改模擬結果', () => {
        const run = (toggle: boolean) => {
            const e = buildBattle('TEAMS', 62);
            emit(e, { type: 'START_GAME', seed: 4 });
            return runTicks(e, 600, (eng, tick) => {
                if (toggle && tick % 50 === 0) emit(eng, { type: 'SET_AIM_SLOWMO', active: (tick / 50) % 2 === 0 });
            });
        };
        const plain = run(false);
        const toggled = run(true);
        expect(toggled).toEqual(plain);
        expect(plain.length).toBeGreaterThan(0);
    });
});

describe('契約 P5 選目標規則', () => {
    /** 主角＝藍方第一個單位；四槽換成：自身、範圍、單體傷害、單體治療（開戰前，讀 skillIds） */
    const setup = () => {
        const e = buildBattle('TEAMS', 63);
        const hero = e.agents.find((a) => a.side === 0);
        if (!hero) throw new Error('沒有藍方單位');
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        const db = e.skillDB;
        const pick = (what: string, f: (s: Skill) => boolean) => {
            const s = db.find(f);
            if (!s) throw new Error(`資料庫裡沒有${what}`);
            return s;
        };
        const self = pick('射程 0 的技能', (s) => s.range === 0);
        const aoe = pick('有射程的範圍技', (s) => s.type === 'AOE' && s.range > 0);
        const hit = pick('單體傷害技', (s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power > 0);
        const heal = pick('單體治療技', (s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power < 0);
        [self, aoe, hit, heal].forEach((s, slot) => emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot, skillId: s.id }));
        return { e, hero, self, aoe, hit, heal };
    };
    const enemiesOf = (e: GameEngine, hero: Agent) => e.agents.filter((a) => a.side !== hero.side && a.hp > 0).map((a) => a.id);
    const alliesOf = (e: GameEngine, hero: Agent) => e.agents.filter((a) => a.side === hero.side && a.hp > 0).map((a) => a.id);

    contractTest('P5', '射程 0＝SELF；範圍技＝UNIT_OR_GROUND；單體＝UNIT；射程照技能', () => {
        const { e, hero, self, aoe, hit, heal } = setup();
        expect(queryCastTargeting(e, hero, 0)).toMatchObject({ slot: 0, mode: 'SELF', range: self.range });
        expect(queryCastTargeting(e, hero, 1)).toMatchObject({ slot: 1, mode: 'UNIT_OR_GROUND', range: aoe.range });
        expect(queryCastTargeting(e, hero, 2)).toMatchObject({ slot: 2, mode: 'UNIT', teams: 'ENEMY', range: hit.range });
        expect(queryCastTargeting(e, hero, 3)).toMatchObject({ slot: 3, mode: 'UNIT', teams: 'ALLY', range: heal.range });
    });

    contractTest('P5', '點得下去的單位：傷害技＝活著的敵人；治療技＝活著的友軍含自己', () => {
        const { e, hero } = setup();
        expect(queryCastTargeting(e, hero, 2)?.unitIds).toEqual(enemiesOf(e, hero));
        const allies = queryCastTargeting(e, hero, 3)?.unitIds ?? [];
        expect(allies).toEqual(alliesOf(e, hero));
        expect(allies).toContain(hero.id);
    });

    contractTest('P5', '空槽、超出範圍的槽是 null', () => {
        const { e, hero } = setup();
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 2, skillId: null });
        expect(queryCastTargeting(e, hero, 2)).toBeNull();
        expect(queryCastTargeting(e, hero, 9)).toBeNull();
        expect(queryCastTargeting(e, hero, -1)).toBeNull();
    });
});
