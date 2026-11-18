import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { HexUtils } from '../engine/utils';
import { captureMatch } from '../engine/core/MatchSnapshot';
import { exportReplay, startReplay, stepSimulation, undoLastCommand } from '../engine/core/Replay';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { BTActions, BTConditions } from '../engine/ai/BTRegistry';
import { AI_MODE_GRAPH, PLAYER_MODE_GRAPH, type BTDef } from '../data/ai_profiles';
import { SKILL_SLOTS } from '../constants';
import { buildBattle, runTicks, emit, stateOf } from './contracts/simState';

/**
 * 玩家操控（契約 G3）在契約驗收以外的行為：開戰前下的指令能回放、指令可以 undo、
 * 施放指令在冷卻中不會被丟掉、目標沒了才清掉、換控制者會換圖。
 */
const setup = (seed = 41) => {
    const e = buildBattle('TEAMS', seed);
    emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const hero = e.agents[0];
    emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
    return { e, hero };
};
const nearestFoe = (e: GameEngine, hero: Agent): Agent =>
    e.agents.filter((a) => a.side !== hero.side).sort((a, b) => HexUtils.dist(a, hero) - HexUtils.dist(b, hero))[0];
const nearbyHex = (e: GameEngine, hero: Agent) => {
    const hex = querySpawnableHexes(e)
        .filter((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r))
        .map((h) => ({ ...h, d: HexUtils.dist(h, hero) }))
        .filter((h) => h.d >= 2 && h.d <= 3)
        .sort((a, b) => a.d - b.d || a.q - b.q || a.r - b.r)[0];
    return { q: hex.q, r: hex.r };
};

describe('玩家操控（契約 G3 以外的行為）', () => {
    it('開戰前下的指令進開戰快照；沒有指令的單位不帶 order 欄位', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        const snap = captureMatch(e);
        expect(snap.units.find((u) => u.id === hero.id)?.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
        expect(snap.units.filter((u) => 'order' in u)).toHaveLength(1);
        expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    });

    it('先下指令再開戰的一場，用回放檔重播結果相同', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        const foe = nearestFoe(e, hero);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        emit(e, { type: 'START_GAME', seed: 7 });
        runTicks(e, 400, (_, tick) => {
            if (tick === 150) emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        });
        const live = stateOf(e);
        const file = exportReplay(e);
        expect(file.commands.map((r) => `${r.tick}:${r.cmd.type}`)).toContain('150:ORDER_ATTACK');

        // 模擬亂數是模組層單一狀態：第一顆引擎跑完才開第二顆
        const again = buildBattle('TEAMS', 999);
        const session = startReplay(again, file);
        while (again.state.time.tick < file.endTick && again.isRunning) stepSimulation(again, session);
        expect(stateOf(again)).toBe(live);
    }, 60000);

    it('指令可以 undo：回到下指令之前，指令從紀錄裡消失', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'START_GAME', seed: 3 });
        runTicks(e, 30);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, 90);
        expect(e.commands.battleLog.map((r) => r.cmd.type)).toContain('ORDER_MOVE');

        expect(undoLastCommand(e)).toBe(true);
        const restored = e.agents.find((a) => a.id === hero.id) as Agent;
        expect(restored.controller).toBe('PLAYER');
        expect(restored.order).toBeNull();
        expect(e.commands.battleLog.map((r) => r.cmd.type)).not.toContain('ORDER_MOVE');
        expect(e.isRunning).toBe(true);
    }, 60000);

    it('冷卻中下的施放指令不會被丟掉，等得到', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        const slot = SKILL_SLOTS.BASIC;
        const foe = nearestFoe(e, hero);
        hero.curCDs[slot] = 2;
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot, targetId: foe.id });
        runTicks(e, 60);
        expect(hero.order).toEqual({ type: 'CAST', slot, targetId: foe.id });
    });

    it('攻擊指令的目標陣亡就清掉指令，回到堅守', () => {
        const { e, hero } = setup();
        const foe = nearestFoe(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        emit(e, { type: 'ORDER_ATTACK', agentId: hero.id, targetId: foe.id });
        runTicks(e, 3);
        expect(hero.aiMode).toBe('ORDER');
        foe.hp = 0;
        runTicks(e, 3);
        expect(hero.order).toBeNull();
        expect(hero.aiMode).toBe('HOLD');
    });

    it('換控制者就換圖：玩家圖只有 HOLD／ORDER，切回 AI 就離開', () => {
        const { e, hero } = setup();
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 3);
        expect(hero.aiMode).toBe('HOLD');
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'AI' });
        runTicks(e, 3);
        expect(Object.keys(AI_MODE_GRAPH.modes)).toContain(hero.aiMode);
        expect(hero.order).toBeNull();
    });

    it('玩家圖用到的節點鍵都在登錄表裡', () => {
        const keys: { key: string; kind: 'CONDITION' | 'ACTION' }[] = [];
        const walk = (def: BTDef): void => {
            if ((def.type === 'CONDITION' || def.type === 'ACTION') && def.key) keys.push({ key: def.key, kind: def.type });
            def.children?.forEach(walk);
        };
        Object.values(PLAYER_MODE_GRAPH.modes).forEach((m) => walk(m.tree));
        for (const { key, kind } of keys) expect((kind === 'ACTION' ? BTActions : BTConditions)[key], `${kind} ${key}`).toBeTypeOf('function');
        for (const edge of PLAYER_MODE_GRAPH.edges) {
            expect(BTConditions[(edge.when ?? edge.unless) as string], `edge ${edge.when ?? edge.unless}`).toBeTypeOf('function');
            expect(Object.keys(PLAYER_MODE_GRAPH.modes)).toContain(edge.to);
        }
        expect(Object.keys(PLAYER_MODE_GRAPH.modes)).toContain(PLAYER_MODE_GRAPH.initial);
    });
});
