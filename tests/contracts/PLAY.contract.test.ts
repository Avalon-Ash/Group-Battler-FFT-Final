import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../engine/game';
import type { Agent } from '../../engine/core/Agent';
import { Role, Team } from '../../types';
import type { Skill } from '../../types';
import { PLAY_PARAM, GAME_APP_PARAM } from '../../constants';
import { MatchFlowSystem } from '../../engine/systems/match/MatchFlowSystem';
import { selectSessionView, appModeOf } from '../../engine/systems/ui/views/session';
import { effectiveTimeScale } from '../../engine/core/FixedStep';
import { queryCastTargeting, isCastTarget } from '../../engine/systems/ui/castTargeting';
import { resolveTap } from '../../engine/systems/ui/tapIntent';
import { querySpawnableHexes } from '../../engine/systems/ui/editorQueries';
import { contractTest } from './contractTest';
import { buildBattle, emit, runTicks, DT } from './simState';

/**
 * 契約 P1、P2、P5：PLAY 模式（docs/plans/play-mode.md、ADR 0025）。
 * P1 流程：選主角 → 自動佈陣 → 開戰 → 結算（不自己轉場）→ 再來一場／回主畫面。
 * P2 瞄準：engine.state.aim（畫面指令 SET_AIM 唯一寫入），瞄準中放慢；不進紀錄、不改模擬結果。
 * P5 選目標規則：一個判斷（isCastTarget）回答「這一槽能點誰」，HUD、點擊、ORDER_CAST 驗證共用。
 * Fable 終審（2026-11-23）後修訂：瞄準狀態放引擎、開新局取消瞄準、P1 等待條件、P5 前提自檢與 ORDER_CAST 一致。
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

const makeFlow = () => {
    const e = new GameEngine({ audio: false });
    let seed = 500;
    const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
    let starts = 0;
    e.bus.on('GAME_START', () => { starts++; });
    return { e, flow, starts: () => starts };
};
/** 跑流程（含模擬 tick）直到 GAME_START 的次數超過 before（最多 20 秒的畫面） */
const untilStartedAfter = (e: GameEngine, flow: MatchFlowSystem, starts: () => number, before: number) => {
    for (let frame = 0; frame < 60 * 20 && starts() <= before; frame++) {
        flow.update(DT);
        if (e.isRunning) e.tick(DT);
    }
    expect(starts()).toBeGreaterThan(before);
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

describe('契約 P1 PLAY 流程', () => {
    contractTest('P1', 'startPlay：一隻主角在藍方交給玩家，其他單位 AI，兩個陣營，開戰', () => {
        const { e, flow, starts } = makeFlow();
        flow.setShowcase(true);
        const before = starts();
        flow.startPlay({ role: Role.TANK });
        untilStartedAfter(e, flow, starts, before);
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
        expect(view.playHeroId).toBe(hero.id);
        expect(appModeOf(view)).toBe('PLAY');
        // 主角是玩家控制這件事在開戰快照裡：回放重開時還是玩家的
        const snap = e.commands.matchStart?.snapshot.units.find((u) => u.id === hero.id);
        expect(snap?.controller).toBe('PLAYER');
    }, 60000);

    contractTest('P1', 'startPlay 帶技能：主角的四槽照選的；undefined 的槽照一般生成、null 空著', () => {
        const { e, flow, starts } = makeFlow();
        const chosen = loadoutOf(e.skillDB, Role.MAGE);
        flow.startPlay({ role: Role.MAGE, skillIds: chosen });
        untilStartedAfter(e, flow, starts, 0);
        expect(heroOf(e).skillIds).toEqual(chosen);

        const second = makeFlow();
        second.flow.startPlay({ role: Role.MAGE, skillIds: [chosen[0], undefined, null, chosen[3]] });
        untilStartedAfter(second.e, second.flow, second.starts, 0);
        const ids = heroOf(second.e).skillIds;
        expect(ids[0]).toBe(chosen[0]);
        expect(typeof ids[1]).toBe('string');
        expect(ids[2]).toBeNull();
        expect(ids[3]).toBe(chosen[3]);
    }, 60000);

    contractTest('P1', '結算停在 RESULT_HOLD，不像展示模式自己轉場開下一局', () => {
        const { e, flow, starts } = makeFlow();
        flow.startPlay({ role: Role.WARRIOR });
        untilStartedAfter(e, flow, starts, 0);
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
        const { e, flow, starts } = makeFlow();
        flow.startPlay({ role: Role.RANGER });
        untilStartedAfter(e, flow, starts, 0);
        const firstSeed = e.commands.matchStart?.seed;
        untilOver(e, flow);
        const before = starts();
        flow.nextPlayMatch();
        untilStartedAfter(e, flow, starts, before);
        expect(e.commands.matchStart?.seed).not.toBe(firstSeed);
        const hero = heroOf(e);
        expect(hero.role).toBe(Role.RANGER);
        expect(hero.side).toBe(0);
        expect(flow.playHeroId).toBe(hero.id);
        expect(flow.isPlay).toBe(true);
    }, 60000);

    contractTest('P1', 'exitPlay（戰鬥中）：回到展示模式，下一場沒有玩家單位', () => {
        const { e, flow, starts } = makeFlow();
        flow.startPlay({ role: Role.SUPPORT });
        untilStartedAfter(e, flow, starts, 0);
        runTicks(e, 60);
        const before = starts();
        flow.exitPlay();
        expect(flow.isPlay).toBe(false);
        expect(flow.isShowcase).toBe(true);
        expect(flow.playHeroId).toBeNull();
        untilStartedAfter(e, flow, starts, before);
        expect(e.agents.some((a) => a.controller === 'PLAYER')).toBe(false);
        expect(appModeOf(selectSessionView(e))).toBe('SHOWCASE');
    }, 60000);
});

describe('契約 P2 瞄準與放慢', () => {
    /** TEAMS 佈陣，藍方第一個單位交給玩家，第 2 槽（普攻）一定有技能 */
    const setup = (seed: number) => {
        const e = buildBattle('TEAMS', seed);
        const hero = e.agents.find((a) => a.side === 0);
        if (!hero) throw new Error('沒有藍方單位');
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        return { e, hero };
    };

    contractTest('P2', 'SET_AIM：瞄準中倍率相乘、取消回原速，不進指令紀錄', () => {
        const { e, hero } = setup(61);
        emit(e, { type: 'START_GAME', seed: 3 });
        runTicks(e, 10);
        const logged = e.commands.log.length;
        emit(e, { type: 'SET_TIME_SCALE', timeScale: 2 });
        runTicks(e, 120);
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        expect(e.state.aim).toEqual({ agentId: hero.id, slot: 2 });
        expect(effectiveTimeScale(e.state)).toBeCloseTo(e.state.time.timeScale * PLAY_PARAM.AIM_SLOWMO_FACTOR, 9);
        emit(e, { type: 'SET_AIM', aim: null });
        expect(e.state.aim).toBeNull();
        expect(effectiveTimeScale(e.state)).toBeCloseTo(e.state.time.timeScale, 9);
        // SET_TIME_SCALE 照舊進紀錄，SET_AIM 不進
        expect(e.commands.log.slice(logged).map((r) => r.cmd.type)).toEqual(['SET_TIME_SCALE']);
    });

    contractTest('P2', 'SET_AIM 只收玩家單位、有技能的槽；其他一律當取消', () => {
        const { e, hero } = setup(64);
        const ai = e.agents.find((a) => a.controller === 'AI');
        if (!ai) throw new Error('沒有 AI 單位');
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        emit(e, { type: 'SET_AIM', aim: { agentId: ai.id, slot: 2 } });
        expect(e.state.aim).toBeNull();
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 1, skillId: null });
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 1 } });
        expect(e.state.aim).toBeNull();
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 7 } });
        expect(e.state.aim).toBeNull();
    });

    contractTest('P2', '開新的一場、RESET_GAME 都會取消瞄準（放慢不會帶到下一場）', () => {
        const { e, hero } = setup(65);
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        expect(e.state.aim).not.toBeNull();
        emit(e, { type: 'START_GAME', seed: 5 });
        expect(e.state.aim).toBeNull();
        runTicks(e, 30);
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        expect(e.state.aim).not.toBeNull();
        emit(e, { type: 'RESET_GAME' });
        runTicks(e, 1);
        expect(e.state.aim).toBeNull();
    });

    contractTest('P2', '瞄準開關不改模擬結果', () => {
        const run = (toggle: boolean) => {
            const { e, hero } = setup(62);
            emit(e, { type: 'START_GAME', seed: 4 });
            return runTicks(e, 600, (eng, tick) => {
                if (toggle && tick % 50 === 0) emit(eng, { type: 'SET_AIM', aim: (tick / 50) % 2 === 0 ? { agentId: hero.id, slot: 2 } : null });
            });
        };
        const plain = run(false);
        const toggled = run(true);
        expect(plain.length).toBeGreaterThan(0);
        expect(toggled).toEqual(plain);
    });
});

describe('契約 P5 選目標規則', () => {
    const pickFrom = (db: readonly Skill[]) => {
        const pick = (what: string, f: (s: Skill) => boolean) => {
            const s = db.find(f);
            if (!s) throw new Error(`資料庫裡沒有${what}`);
            return s;
        };
        return {
            self: pick('射程 0 的技能', (s) => s.range === 0),
            aoe: pick('有射程的範圍技', (s) => s.type === 'AOE' && s.range > 0),
            hit: pick('單體傷害技', (s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power > 0),
            heal: pick('單體治療技', (s) => s.type === 'SINGLE' && s.range > 0 && s.teams === undefined && s.power < 0),
            mobility: pick('機動技', (s) => s.tag === 'MOBILITY'),
        };
    };
    /** 主角＝藍方第一個單位、玩家控制；四槽換成：自身、範圍、單體傷害、單體治療（開戰前，讀 skillIds） */
    const setup = () => {
        const e = buildBattle('TEAMS', 63);
        const hero = e.agents.find((a) => a.side === 0);
        if (!hero) throw new Error('沒有藍方單位');
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        const k = pickFrom(e.skillDB);
        [k.self, k.aoe, k.hit, k.heal].forEach((s, slot) => emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot, skillId: s.id }));
        return { e, hero, ...k };
    };
    const enemiesOf = (e: GameEngine, hero: Agent) => e.agents.filter((a) => a.side !== hero.side && a.hp > 0);
    const alliesOf = (e: GameEngine, hero: Agent) => e.agents.filter((a) => a.side === hero.side && a.hp > 0);

    // 前提自檢（不是契約，現在就要綠）：上面挑得到這五種技能、塞得進四槽
    it('[P5 前提] 資料庫有這五種技能，SET_AGENT_SKILL 不分職業都塞得進去', () => {
        const { hero, self, aoe, hit, heal } = setup();
        expect(hero.controller).toBe('PLAYER');
        expect(hero.skillIds.slice(0, 4)).toEqual([self.id, aoe.id, hit.id, heal.id]);
    });

    contractTest('P5', '射程 0＝SELF；範圍技＝UNIT_OR_GROUND；單體＝UNIT；射程照技能', () => {
        const { e, hero, self, aoe, hit, heal } = setup();
        expect(queryCastTargeting(e, hero, 0)).toMatchObject({ slot: 0, mode: 'SELF', range: self.range });
        expect(queryCastTargeting(e, hero, 1)).toMatchObject({ slot: 1, mode: 'UNIT_OR_GROUND', range: aoe.range });
        expect(queryCastTargeting(e, hero, 2)).toMatchObject({ slot: 2, mode: 'UNIT', teams: 'ENEMY', range: hit.range });
        expect(queryCastTargeting(e, hero, 3)).toMatchObject({ slot: 3, mode: 'UNIT', teams: 'ALLY', range: heal.range });
    });

    contractTest('P5', '機動技＝UNIT_OR_GROUND（點地面往那裡位移）', () => {
        const { e, hero, mobility } = setup();
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 3, skillId: mobility.id });
        expect(queryCastTargeting(e, hero, 3)).toMatchObject({ slot: 3, mode: 'UNIT_OR_GROUND', range: mobility.range });
    });

    contractTest('P5', 'unitIds 和 isCastTarget 一致；ORDER_CAST 對名單內成立、名單外被拒', () => {
        const { e, hero } = setup();
        const foes = enemiesOf(e, hero);
        const friends = alliesOf(e, hero);
        expect(queryCastTargeting(e, hero, 2)?.unitIds).toEqual(foes.map((a) => a.id));
        const allies = queryCastTargeting(e, hero, 3)?.unitIds ?? [];
        expect(allies).toEqual(friends.map((a) => a.id));
        expect(allies).toContain(hero.id);
        for (const a of e.agents) {
            expect(isCastTarget(e, hero, 2, a)).toBe(a.side !== hero.side);
            expect(isCastTarget(e, hero, 3, a)).toBe(a.side === hero.side);
        }
        // ORDER_CAST 用同一個判斷：傷害技對隊友不成立，對敵人成立
        const friend = friends.find((a) => a !== hero);
        if (!friend) throw new Error('沒有隊友');
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: 2, targetId: friend.id });
        expect(hero.order).toBeNull();
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: 2, targetId: foes[0].id });
        expect(hero.order).toEqual({ type: 'CAST', slot: 2, targetId: foes[0].id });
    });

    contractTest('P5', '空槽、超出範圍的槽是 null', () => {
        const { e, hero } = setup();
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 2, skillId: null });
        expect(queryCastTargeting(e, hero, 2)).toBeNull();
        expect(queryCastTargeting(e, hero, 9)).toBeNull();
        expect(queryCastTargeting(e, hero, -1)).toBeNull();
    });

    contractTest('P5', '瞄準中點擊：點目標＝ORDER_CAST；範圍技點空地＝對那一格；點不能選的單位不動作', () => {
        const { e, hero } = setup();
        const foe = enemiesOf(e, hero)[0];
        const friend = alliesOf(e, hero).find((a) => a !== hero);
        if (!friend) throw new Error('沒有隊友');
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        expect(resolveTap(e, hero, { q: foe.q, r: foe.r }, foe)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: hero.id, slot: 2, targetId: foe.id } });
        expect(resolveTap(e, hero, { q: friend.q, r: friend.r }, friend)).toEqual({ kind: 'NONE' });

        const empty = querySpawnableHexes(e).find((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r));
        if (!empty) throw new Error('沒有空格');
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 1 } });
        expect(resolveTap(e, hero, empty, null)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_CAST', agentId: hero.id, slot: 1, q: empty.q, r: empty.r } });
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: 2 } });
        expect(resolveTap(e, hero, empty, null)).toEqual({ kind: 'NONE' });
    });

    contractTest('P5', 'PLAY 模式不瞄準時：點隊友不改選取，點敵人照舊攻擊', () => {
        const { e, flow, starts } = makeFlow();
        flow.startPlay({ role: Role.TANK });
        untilStartedAfter(e, flow, starts, 0);
        const hero = heroOf(e);
        const friend = e.agents.find((a) => a.side === hero.side && a !== hero);
        const foe = e.agents.find((a) => a.side !== hero.side);
        if (!friend || !foe) throw new Error('沒有隊友或敵人');
        expect(resolveTap(e, hero, { q: friend.q, r: friend.r }, friend)).toEqual({ kind: 'NONE' });
        expect(resolveTap(e, hero, { q: foe.q, r: foe.r }, foe)).toEqual({ kind: 'ORDER', command: { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id } });
    }, 60000);
});
