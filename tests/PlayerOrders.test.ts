import { describe, it, expect } from 'vitest';
import type { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { HexUtils } from '../engine/utils';
import { captureMatch } from '../engine/core/MatchSnapshot';
import { exportReplay, startReplay, stepSimulation, undoLastCommand } from '../engine/core/Replay';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { queryCastTargeting } from '../engine/systems/ui/castTargeting';
import { BTActions, BTConditions } from '../engine/ai/BTRegistry';
import { AI_MODE_GRAPH, PLAYER_MODE_GRAPH, type BTDef } from '../data/ai_profiles';
import { CCManager } from '../engine/systems/combat/CCManager';
import type { Skill } from '../types';
import { buildBattle, runTicks, emit, stateOf } from './contracts/simState';

/**
 * 玩家操控（契約 G3）在契約驗收以外的行為：開戰前下的指令能回放、指令可以 undo、
 * 目標沒了才清掉（冷卻中與魔力不足改為拒收，見 PlayerOrderInterrupt.test.ts／ADR 0026）、換控制者會換圖。
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
        // 指令清掉後回到一般的決策間隔：模式要等下一次決策才換回 HOLD（這段時間已經照堅守在做）
        runTicks(e, 60);
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

    // ── 預設對局會碰到的既有機制：縮圈、嘲諷、強制位移、定身、暫停下令 ──────────────────────

    it('縮圈：站在警告格上，下指令走到安全格，走得出去', () => {
        // 不關縮圈（setup 會關）
        // 前提不靠種子湊站位：全部交給玩家（沒指令＝原地堅守），縮圈掃到誰腳下就由誰當主角
        const e = buildBattle('TEAMS', 41);
        for (const a of e.agents) emit(e, { type: 'SET_CONTROLLER', agentId: a.id, controller: 'PLAYER' });
        emit(e, { type: 'START_GAME', seed: 1 });
        const onWarning = () => e.agents.find((a) => a.hp > 0 && !a.outOfBounds && e.isWarningTile(HexUtils.key(a)));
        for (let i = 0; i < 3000 && e.isRunning && !onWarning(); i++) runTicks(e, 1);
        const hero = onWarning();
        if (!hero) throw new Error('前提：3000 tick 內有單位站上警告格');

        const safe = [...e.map.mapKeys]
            .map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !e.isWarningTile(HexUtils.key(h)) && !e.hasObstacle(h.q, h.r) && !e.agents.some((a) => a.hp > 0 && a.q === h.q && a.r === h.r))
            .map((h) => ({ ...h, d: HexUtils.dist(h, hero) }))
            .sort((a, b) => a.d - b.d || a.q - b.q || a.r - b.r)[0];
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: safe.q, r: safe.r });
        for (let i = 0; i < 600 && e.isRunning && hero.hp > 0 && !(hero.q === safe.q && hero.r === safe.r && !hero.isMoving); i++) runTicks(e, 1);
        expect(hero.hp).toBeGreaterThan(0);
        expect(hero.outOfBounds).toBe(false);
        expect({ q: hero.q, r: hero.r }).toEqual({ q: safe.q, r: safe.r });
        expect(e.isWarningTile(HexUtils.key(hero))).toBe(false);
    }, 60000);

    it('目的地塌掉（不在地圖上了）就清掉移動指令', () => {
        const { e, hero } = setup();
        // 選最遠的空格，確保還沒走到
        const dest = querySpawnableHexes(e)
            .filter((h) => !e.agents.some((a) => a.q === h.q && a.r === h.r))
            .map((h) => ({ ...h, d: HexUtils.dist(h, hero) }))
            .sort((a, b) => b.d - a.d)[0];
        emit(e, { type: 'START_GAME', seed: 1 });
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, 5);
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
        e.map.removeTile(dest.q, dest.r);
        runTicks(e, 3);
        expect(hero.order).toBeNull();
    });

    it('嘲諷蓋過指令：被嘲諷時打嘲諷者，指令留著', () => {
        const { e, hero } = setup();
        const foe = nearestFoe(e, hero);
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        CCManager.applyCC(foe, hero, {} as Skill, 'TAUNT', 2, undefined, undefined, e);
        expect(hero.effects.TAUNT.remaining).toBeGreaterThan(0);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, 2);
        let checked = 0;
        runTicks(e, 60, () => {
            if (hero.hp > 0 && foe.hp > 0 && hero.effects.TAUNT.remaining > 0) { expect(hero.target?.id).toBe(foe.id); checked++; }
        });
        expect(checked).toBeGreaterThan(20);
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
    });

    it('堅守中被推開：強制位移照常發生，不被堅守取消', () => {
        const { e, hero } = setup();
        const foe = nearestFoe(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        const before = { x: hero.px + hero.physics.x, y: hero.py + hero.physics.y };
        const origin = HexUtils.toPx(hero.q - 1, hero.r, e.mapConfig);
        CCManager.applyCC(foe, hero, {} as Skill, 'KNOCKBACK', 0, 3, origin, e);
        let moved = 0;
        runTicks(e, 40, () => {
            moved = Math.max(moved, Math.hypot(hero.px + hero.physics.x - before.x, hero.py + hero.physics.y - before.y));
        });
        expect(moved).toBeGreaterThan(10);
    });

    it('指令被擋住（定身）時留在 ORDER 模式照堅守做，不來回切模式', () => {
        const { e, hero } = setup();
        const foe = nearestFoe(e, hero);
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        CCManager.applyCC(foe, hero, {} as Skill, 'ROOT', 2, undefined, undefined, e);
        expect(hero.effects.ROOT.remaining).toBeGreaterThan(0);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        runTicks(e, 3);
        const traceBefore = hero.aiModeTrace.length;
        runTicks(e, 60);
        expect(hero.aiMode).toBe('ORDER');
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
        expect(hero.aiModeTrace.length).toBe(traceBefore);
        expect({ q: hero.q, r: hero.r }).not.toEqual(dest);
    });

    it('暫停時下的指令：繼續之後照做，用回放檔重播結果相同', () => {
        const { e, hero } = setup();
        const dest = nearbyHex(e, hero);
        emit(e, { type: 'START_GAME', seed: 9 });
        runTicks(e, 50);
        emit(e, { type: 'STOP_GAME' });
        expect(e.isRunning).toBe(false);
        emit(e, { type: 'ORDER_MOVE', agentId: hero.id, q: dest.q, r: dest.r });
        expect(hero.order).toEqual({ type: 'MOVE', q: dest.q, r: dest.r });
        emit(e, { type: 'START_GAME' });
        expect(e.isRunning).toBe(true);
        expect(e.state.time.tick).toBe(50);
        runTicks(e, 250);
        const live = stateOf(e);
        const file = exportReplay(e);
        expect(file.commands.map((r) => r.tick + ':' + r.cmd.type)).toEqual(['50:ORDER_MOVE']);

        const again = buildBattle('TEAMS', 999);
        const session = startReplay(again, file);
        while (again.state.time.tick < file.endTick && again.isRunning) stepSimulation(again, session);
        expect(stateOf(again)).toBe(live);
    }, 60000);

    // 射程 0 的機動技是自身周圍的擊退（tb_m2、mb_m2 等），沒有位移。曾被歸成 UNIT_OR_GROUND：
    // 點地面後要站上那一格才放，走不到就一直卡著（2026-11-24 探針：12 種情況 15 秒內都沒放出）。
    it('射程 0 的機動技按一下就放：選目標是 SELF；敵人貼身時不帶目標的施放指令會放出去', () => {
        const { e, hero } = setup();
        const zeroRange = e.skillDB.filter((s) => s.tag === 'MOBILITY' && s.range === 0);
        expect(zeroRange.length).toBeGreaterThan(0);
        for (const s of zeroRange) {
            emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 3, skillId: s.id });
            expect(queryCastTargeting(e, hero, 3)?.mode).toBe('SELF');
        }

        emit(e, { type: 'SET_AGENT_SKILL', agentId: hero.id, slot: 3, skillId: zeroRange[0].id });
        emit(e, { type: 'START_GAME', seed: 7 });
        runTicks(e, 1);
        const foe = nearestFoe(e, hero);
        const adj = HexUtils.neighbors(hero).find((h) => e.isValid(h.q, h.r) && !e.isBlocked(h.q, h.r, foe.id));
        if (!adj) throw new Error('主角旁邊沒有空格');
        emit(e, { type: 'MOVE_AGENT', agentId: foe.id, q: adj.q, r: adj.r });
        runTicks(e, 1);
        expect(HexUtils.dist(foe, hero)).toBe(1);
        emit(e, { type: 'ORDER_CAST', agentId: hero.id, slot: 3 });
        // 詠唱 0.2～0.3 秒；給到 1 秒
        runTicks(e, 60);
        expect(hero.curCDs[3]).toBeGreaterThan(0);
        expect(hero.order).toBeNull();
    });
});
