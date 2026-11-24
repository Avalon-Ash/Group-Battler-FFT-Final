import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { HexUtils } from '../engine/utils';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { SKILL_SLOTS } from '../constants';
import { buildBattle, runTicks, emit } from './contracts/simState';

/**
 * ADR 0026（K1）：玩家指令的打斷規則。主代理寫的紅色驗收，執行代理不得修改。
 * - 新的玩家指令取消自己的前搖（不進冷卻、不設中斷鎖定、不扣魔）。
 * - 玩家移動指令立即換路（不套 AI 的換路間隔）。
 * - 冷卻中、魔力不足的施放指令在驗證時拒收（不寫入 order、不打斷正在做的事）。
 * - 射程 0 的技能，玩家下令就放，不看 AI 的「值不值得放」。
 * 指令在下一個 tick 開頭套用（ADR 0015），所以「立即」＝2 tick 內。
 */
const IMMEDIATE_TICKS = 2;
const MAX_WAIT_TICKS = 180;

const setup = (seed = 41) => {
    const e = buildBattle('TEAMS', seed);
    emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const hero = e.agents[0];
    emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
    return { e, hero };
};
const nearestFoe = (e: GameEngine, hero: Agent): Agent =>
    e.agents.filter((a) => a.side !== hero.side && a.hp > 0).sort((a, b) => HexUtils.dist(a, hero) - HexUtils.dist(b, hero))[0];
const freeHex = (e: GameEngine, from: Agent, minD: number, maxD: number, awayFrom?: { q: number; r: number }) => {
    const cands = querySpawnableHexes(e)
        .filter((h) => !e.agents.some((a) => a.hp > 0 && a.q === h.q && a.r === h.r))
        .map((h) => ({ q: h.q, r: h.r, d: HexUtils.dist(h, from) }))
        .filter((h) => h.d >= minD && h.d <= maxD)
        .sort((a, b) => (awayFrom ? HexUtils.dist(b, awayFrom) - HexUtils.dist(a, awayFrom) : 0) || a.d - b.d || a.q - b.q || a.r - b.r);
    if (!cands.length) throw new Error('找不到空格');
    return { q: cands[0].q, r: cands[0].r };
};
/** 把最近的敵人搬到主角旁邊（開戰後用 MOVE_AGENT） */
const foeAdjacent = (e: GameEngine, hero: Agent): Agent => {
    const foe = nearestFoe(e, hero);
    const adj = HexUtils.neighbors(hero).find((h) => e.isValid(h.q, h.r) && !e.isBlocked(h.q, h.r, foe.id));
    if (!adj) throw new Error('主角旁邊沒有空格');
    emit(e, { type: 'MOVE_AGENT', agentId: foe.id, q: adj.q, r: adj.r });
    runTicks(e, 1);
    expect(HexUtils.dist(foe, hero)).toBe(1);
    return foe;
};
/** 跑到主角開始第 slot 槽的前搖，而且前搖還剩 ≥ 0.1 秒 */
const untilWindup = (e: GameEngine, hero: Agent, slot: number) => {
    for (let i = 0; i < MAX_WAIT_TICKS && hero.castingSkillIdx !== slot; i++) runTicks(e, 1);
    expect(hero.castingSkillIdx).toBe(slot);
    expect(hero.castTimer).toBeGreaterThan(0.1);
};
const pathGoal = (a: Agent) => a.path[a.path.length - 1];

describe('ADR 0026 K1：玩家指令打斷規則', () => {
    it('普攻前搖中下移動：2 tick 內取消前搖並朝新目的地走；不進冷卻、沒有中斷鎖定', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = foeAdjacent(e, hero);
        emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        untilWindup(e, hero, SKILL_SLOTS.BASIC);
        const cdBefore = hero.curCDs[SKILL_SLOTS.BASIC];
        const dest = freeHex(e, hero, 2, 3, foe);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(-1);
        expect(hero.isMoving).toBe(true);
        expect(pathGoal(hero)).toEqual(expect.objectContaining({ q: dest.q, r: dest.r }));
        expect(hero.curCDs[SKILL_SLOTS.BASIC]).toBeLessThanOrEqual(cdBefore);
        expect(hero._interruptCooldown).toBe(0);
    });

    it('主動技前搖中下移動：取消前搖，不扣魔、不進冷卻', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = foeAdjacent(e, hero);
        const slot = SKILL_SLOTS.ACTIVE;
        const skill = hero.skills[slot];
        if (!skill) throw new Error('主角沒有主動技');
        hero.mp = hero.maxMp;
        hero.curCDs[slot] = 0;
        // 和 HUD 同一種送法：射程 0 的招不帶目標（castTargeting 的 SELF）；射程外會先走過去，給足時間
        emit(e, skill.range === 0
            ? { type: 'ORDER_CAST', agentId: hero.id, slot }
            : { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        untilWindup(e, hero, slot);
        const mpBefore = hero.mp;
        const dest = freeHex(e, hero, 2, 3, foe);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(-1);
        expect(hero.mp).toBe(mpBefore);
        expect(hero.curCDs[slot]).toBe(0);
        expect(hero._interruptCooldown).toBe(0);
    });

    it('停止指令也會取消前搖', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = foeAdjacent(e, hero);
        emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        untilWindup(e, hero, SKILL_SLOTS.BASIC);
        emit(e, { type: 'ORDER_STOP', agentId: hero.id });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(-1);
        expect(hero.order).toBeNull();
    });

    it('走路中改目的地：2 tick 內路徑終點換成新目的地', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const first = freeHex(e, hero, 3, 3);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: first.q, r: first.r });
        runTicks(e, 10);
        expect(hero.isMoving).toBe(true);
        const second = freeHex(e, hero, 3, 4, first);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: second.q, r: second.r });
        runTicks(e, IMMEDIATE_TICKS);
        expect(pathGoal(hero)).toEqual(expect.objectContaining({ q: second.q, r: second.r }));
    });

    it('冷卻中的施放指令拒收：不寫入指令，也不打斷正在放的普攻', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = foeAdjacent(e, hero);
        emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        untilWindup(e, hero, SKILL_SLOTS.BASIC);
        const slot = SKILL_SLOTS.ACTIVE;
        hero.mp = hero.maxMp;
        hero.curCDs[slot] = 2;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        runTicks(e, 1);
        expect(hero.order).toEqual({ type: 'ATTACK', targetId: foe.id });
        expect(hero.castingSkillIdx).toBe(SKILL_SLOTS.BASIC);
    });

    it('魔力不足的施放指令拒收', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = nearestFoe(e, hero);
        const slot = [SKILL_SLOTS.ACTIVE, SKILL_SLOTS.ULT].find((s) => (hero.skills[s]?.cost ?? 0) > 0);
        if (slot === undefined) throw new Error('主角沒有耗魔的技能');
        hero.mp = 0;
        hero.curCDs[slot] = 0;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        runTicks(e, 1);
        expect(hero.order).toBeNull();
    });

    it('普攻的冷卻只是攻擊間隔：冷卻中按普攻照樣收下（MOBA 不拒收攻擊指令）', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 1);
        const foe = nearestFoe(e, hero);
        hero.curCDs[SKILL_SLOTS.BASIC] = 1;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: SKILL_SLOTS.BASIC, targetId: foe.id });
        runTicks(e, 1);
        expect(hero.order).toEqual({ type: 'CAST', slot: SKILL_SLOTS.BASIC, targetId: foe.id });
    });

    it('射程 0 的技能：身邊沒有敵人，玩家下令也在 2 tick 內開始前搖', () => {
        const { e, hero } = setup();
        const zeroRange = e.skillDB.filter((s) => s.range === 0 && s.tag !== 'ULT' && s.cost === 0);
        expect(zeroRange.length).toBeGreaterThan(0);
        const skill = zeroRange[0];
        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 3, skillId: skill.id });
        emit(e, { type: 'START_GAME', seed: 7 });
        runTicks(e, 1);
        const foe = nearestFoe(e, hero);
        expect(HexUtils.dist(foe, hero)).toBeGreaterThan((skill.aoeRadius ?? 1) + 1);
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: 3 });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(3);
    });
});
