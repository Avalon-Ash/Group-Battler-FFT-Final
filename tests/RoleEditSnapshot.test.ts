import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/core/Agent';
import { captureMatch, restoreMatch } from '../engine/core/MatchSnapshot';
import { Role, Team } from '../types';
import { buildBattle, runTicks, emit, stateOf } from './contracts/simState';

/**
 * 開戰前用 EDIT_AGENT 換職業：職業導出、快照不存的欄位（移速、移動類型、跳躍、重量）要跟著換，
 * 還原快照後才和現場一致（契約 S2；職業→數值只在 AgentManager.applyRoleMotion 對應）。
 */
const ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
const derived = (a: Agent) => [a.role, a.moveSpeed, a.movementType, a.jump, a.weight].join('/');

/** 直接生成該職業的單位時的導出欄位 */
const spawned = (role: Role): string => {
    const e = new GameEngine({ audio: false });
    const a = e.agentManager.addAgent(e, Team.BLUE, 0, 0, undefined, role);
    if (!a) throw new Error('spawn failed');
    return derived(a);
};

describe('開戰前換職業與開戰快照', () => {
    it('每個職業換成另一個職業，還原後導出欄位相同、重播出同一場', () => {
        const a = buildBattle('TEAMS', 41);
        a.agents.forEach((u) => {
            const next = ROLES[(ROLES.indexOf(u.role) + 1) % ROLES.length];
            emit(a, { type: 'EDIT_AGENT', agentId: u.id, role: next });
        });
        // 每個職業都被換到過
        expect(new Set(a.agents.map((u) => u.role))).toEqual(new Set(ROLES));
        for (const u of a.agents) expect(derived(u)).toBe(spawned(u.role));

        const snapshot = JSON.parse(JSON.stringify(captureMatch(a)));
        const b = new GameEngine({ audio: false });
        restoreMatch(b, snapshot);
        expect(b.agents.map(derived)).toEqual(a.agents.map(derived));

        // 模擬流是模組層級共用的：一顆跑完再換另一顆，不交錯
        emit(a, { type: 'START_GAME', seed: 5 });
        runTicks(a, 600);
        emit(b, { type: 'START_GAME', seed: 5 });
        runTicks(b, 600);
        expect(stateOf(b)).toBe(stateOf(a));
    });
});
