import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { CAST_LOCKOUT } from '../constants';
import { CCManager } from '../engine/systems/combat/CCManager';
import { syncBanished, clearBanishedFlag } from '../engine/systems/status/ControlSystem';

/** P7b（_interruptCooldown 施法域）與 P8（banished 只由 ControlSystem 寫入）的行為測試。 */
describe('Status/casting domain APIs (state ownership P7b/P8)', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('BANISH 施加後 banished 立刻為 true，計時器歸零後 syncBanished 清除', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const b = engine.agentManager.addAgent(engine, Team.RED, 0, 2, 100, Role.WARRIOR);
        if (!a || !b) throw new Error('addAgent failed');
        CCManager.applyCC(b, a, { element: 'PHYSICAL' } as Skill, 'BANISH', 2, undefined, undefined, engine);
        expect(a.banished).toBe(true);
        a.banishTimer = 0;
        syncBanished(a);
        expect(a.banished).toBe(false);
    });

    it('clearBanishedFlag 只清旗標、不動計時器', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        if (!a) throw new Error('addAgent failed');
        a.banishTimer = 3;
        syncBanished(a);
        expect(a.banished).toBe(true);
        clearBanishedFlag(a);
        expect(a.banished).toBe(false);
        expect(a.banishTimer).toBe(3);
    });

    it('breakCast(lockout) 延長 _interruptCooldown 但不縮短既有值', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        if (!a) throw new Error('addAgent failed');
        engine.combat.breakCast(a, engine, CAST_LOCKOUT.FATAL_BREAK);
        expect(a._interruptCooldown).toBe(CAST_LOCKOUT.FATAL_BREAK);
        engine.combat.breakCast(a, engine, CAST_LOCKOUT.INTERRUPT);
        expect(a._interruptCooldown).toBe(CAST_LOCKOUT.FATAL_BREAK);
    });
});

describe('lastHitSourceId routing (state ownership step 3)', () => {
    let engine: GameEngine;
    beforeEach(() => { engine = new GameEngine(); engine.play(); });
    afterEach(() => { engine.stop(); engine.clear(); });

    it('撞擊傷害經 applyDirectDamage 設定擊殺歸屬', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const b = engine.agentManager.addAgent(engine, Team.RED, 0, 2, 100, Role.WARRIOR);
        if (!a || !b) throw new Error('addAgent failed');
        a.lastHitSourceId = null;
        CCManager.applyImpact(a, b, { reason: 'WALL', hex: { q: 0, r: 1 }, heightDiff: 0, remaining: 2 }, engine);
        expect(a.lastHitSourceId).toBe(b.id);
    });
});
