import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { HexUtils } from '../engine/utils';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { SKILL_SLOTS } from '../constants';
import { buildBattle, runTicks, emit } from './contracts/simState';

/**
 * K1～K4 終審（2026-11-25，WORKLOG §2 DL）找到的兩個指令規則漏洞。主代理寫的紅色驗收。
 * #1 奧義前搖中改下同一招、但不是延續同一個前搖的指令（換目標）：用取消後的狀態判斷魔力。
 *    魔力不夠就拒收、不打斷（不然已扣的魔力不退，新指令又因為魔力不足原地乾等）。
 * #2 施放指令被拒收（冷卻、魔力）時，這個單位的瞄準一併結束（不然瞄準卡在放不了的那一槽，點擊全被吞）。
 * 指令在下一個 tick 開頭套用（ADR 0015），所以「立即」＝2 tick 內。
 */
const IMMEDIATE_TICKS = 2;
const MAX_WAIT_TICKS = 300;
/** 前搖走了一段、魔力已扣掉一部分 */
const DRAIN_TICKS = 4;

const setup = (seed = 41) => {
    const e = buildBattle('TEAMS', seed);
    emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const hero = e.agents[0];
    emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
    emit(e, { type: 'START_GAME', seed: 1 });
    runTicks(e, 1);
    return { e, hero };
};
const nearestFoe = (e: GameEngine, hero: Agent): Agent =>
    e.agents.filter((a) => a.side !== hero.side && a.hp > 0).sort((a, b) => HexUtils.dist(a, hero) - HexUtils.dist(b, hero))[0];
const foeAdjacent = (e: GameEngine, hero: Agent): Agent => {
    const foe = nearestFoe(e, hero);
    const adj = HexUtils.neighbors(hero).find((h) => e.isValid(h.q, h.r) && !e.isBlocked(h.q, h.r, foe.id));
    if (!adj) throw new Error('主角旁邊沒有空格');
    emit(e, { type: 'MOVE_AGENT', agentId: foe.id, q: adj.q, r: adj.r });
    runTicks(e, 1);
    expect(HexUtils.dist(foe, hero)).toBe(1);
    return foe;
};
const freeHexNear = (e: GameEngine, from: Agent) => {
    const h = querySpawnableHexes(e)
        .filter((x) => !e.agents.some((a) => a.hp > 0 && a.q === x.q && a.r === x.r) && (x.q !== from.targetHex?.q || x.r !== from.targetHex?.r))
        .sort((a, b) => HexUtils.dist(a, from) - HexUtils.dist(b, from) || a.q - b.q || a.r - b.r)[0];
    if (!h) throw new Error('找不到空格');
    return { q: h.q, r: h.r };
};

describe('K1～K4 終審 #1：奧義前搖中換目標', () => {
    it('換目標會重開前搖：魔力已不足 cost 就拒收，原本的前搖照常進行', () => {
        const { e, hero } = setup();
        foeAdjacent(e, hero);
        const ult = SKILL_SLOTS.ULT;
        const skill = hero.skills[ult];
        if (!skill) throw new Error('主角沒有奧義');
        hero.mp = skill.cost;
        hero.curCDs[ult] = 0;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: ult });
        for (let i = 0; i < MAX_WAIT_TICKS && hero.castingSkillIdx !== ult; i++) runTicks(e, 1);
        expect(hero.castingSkillIdx).toBe(ult);
        runTicks(e, DRAIN_TICKS);
        expect(hero.castingSkillIdx).toBe(ult);
        expect(hero.mp).toBeLessThan(skill.cost);
        const orderBefore = hero.order;
        const elsewhere = freeHexNear(e, hero);
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: ult, q: elsewhere.q, r: elsewhere.r });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(ult);
        expect(hero.order).toBe(orderBefore);
    });

    it('延續同一個前搖的指令（同一招、不指定目標）照舊接受、不打斷', () => {
        const { e, hero } = setup();
        foeAdjacent(e, hero);
        const ult = SKILL_SLOTS.ULT;
        const skill = hero.skills[ult];
        if (!skill) throw new Error('主角沒有奧義');
        hero.mp = skill.cost;
        hero.curCDs[ult] = 0;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: ult });
        for (let i = 0; i < MAX_WAIT_TICKS && hero.castingSkillIdx !== ult; i++) runTicks(e, 1);
        runTicks(e, DRAIN_TICKS);
        expect(hero.mp).toBeLessThan(skill.cost);
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: ult });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.castingSkillIdx).toBe(ult);
    });
});

describe('K1～K4 終審 #2：施放被拒收時結束瞄準', () => {
    it('瞄準的那一槽冷卻中：對敵人下施放被拒收，瞄準一併結束、不寫入指令', () => {
        const { e, hero } = setup();
        const foe = foeAdjacent(e, hero);
        const slot = SKILL_SLOTS.ACTIVE;
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot } });
        expect(e.state.aim).toEqual({ agentId: hero.id, slot });
        hero.curCDs[slot] = 99;
        const orderBefore = hero.order;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        runTicks(e, IMMEDIATE_TICKS);
        expect(hero.order).toBe(orderBefore);
        expect(e.state.aim).toBeNull();
    });

    it('拒收的是別的槽：正在瞄準的那一槽不受影響', () => {
        const { e, hero } = setup();
        const foe = foeAdjacent(e, hero);
        emit(e, { type: 'SET_AIM', aim: { agentId: hero.id, slot: SKILL_SLOTS.ACTIVE } });
        hero.curCDs[SKILL_SLOTS.MOBILITY] = 99;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: SKILL_SLOTS.MOBILITY, targetId: foe.id });
        runTicks(e, IMMEDIATE_TICKS);
        expect(e.state.aim).toEqual({ agentId: hero.id, slot: SKILL_SLOTS.ACTIVE });
    });
});
