// STATE_OWNERSHIP_DESIGN §1.10 / P1a：CC 施加的特殊視覺狀態在完整 tick 後是否仍存在。
// 若 AnimationSystem（tick 最後執行）把 CCManager／ControlSystem 寫的值覆寫掉，
// 渲染層（GaugePainter、UnitBodyPainter…）永遠看不到 FROZEN／POLYMORPH／INVINCIBLE。
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import type { Agent } from '../engine/core/Agent';
import { CCManager } from '../engine/systems/combat/CCManager';

const TICK = 0.05;
const TICKS = 6;

function ccSkill(overrides: Partial<Skill>): Skill {
    return {
        id: 'TEST_CC', tag: 'ACTIVE', role: Role.MAGE, name: 'test', range: 9, cast: 0, cd: 0,
        cost: 0, gain: 0, type: 'SINGLE', power: 0, color: '#ffffff',
        ...overrides,
    };
}

describe('visualStatus ownership (P1a)', () => {
    let engine: GameEngine;
    let blue: Agent;
    let red: Agent;
    let blueAlly: Agent;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
        const b = engine.agentManager.addAgent(engine, Team.BLUE, 2, 2, 1000, Role.WARRIOR);
        const bAlly = engine.agentManager.addAgent(engine, Team.BLUE, 3, 2, 1000, Role.WARRIOR);
        const r = engine.agentManager.addAgent(engine, Team.RED, -2, -2, 1000, Role.WARRIOR);
        if (!b || !r || !bAlly) throw new Error('spawn failed');
        blue = b; red = r; blueAlly = bAlly;
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    function statusesOverTicks(agent: Agent): string[] {
        const seen: string[] = [];
        for (let i = 0; i < TICKS; i++) {
            engine.tick(TICK);
            seen.push(agent.view.visualStatus);
        }
        return seen;
    }

    // P1a 曾證實此案例在修正前 6/6 tick 皆為 NONE（AnimationSystem 覆寫）；P1c 後轉綠。
    it('ICE stun shows FROZEN while stunned', () => {
        CCManager.applyCC(red, blue, ccSkill({ element: 'ICE', ccType: 'STUN' }), 'STUN', 2, 0, undefined, engine);
        expect(blue.effects.STUN.remaining).toBeGreaterThan(0);
        expect(statusesOverTicks(blue)).toEqual(Array(TICKS).fill('FROZEN'));
    });

    // P1a 曾證實此案例在修正前 6/6 tick 皆為 NONE（AnimationSystem 覆寫）；P1c 後轉綠。
    it('POLYMORPH shows POLYMORPH while polymorphed', () => {
        CCManager.applyCC(red, blue, ccSkill({ ccType: 'POLYMORPH', specialVisualStatus: 'POLYMORPH' }), 'POLYMORPH', 2, 0, undefined, engine);
        expect(blue.effects.POLYMORPH.remaining).toBeGreaterThan(0);
        expect(statusesOverTicks(blue)).toEqual(Array(TICKS).fill('POLYMORPH'));
    });

    // P1a 曾證實此案例在修正前 6/6 tick 皆為 NONE（AnimationSystem 覆寫）；P1c 後轉綠。
    it('INVINCIBLE shows INVINCIBLE while invincible', () => {
        CCManager.applyCC(blueAlly, blue, ccSkill({ ccType: 'INVINCIBLE', specialVisualStatus: 'INVINCIBLE' }), 'INVINCIBLE', 2, 0, undefined, engine);
        expect(blue.effects.INVINCIBLE.remaining).toBeGreaterThan(0);
        expect(statusesOverTicks(blue)).toEqual(Array(TICKS).fill('INVINCIBLE'));
    });

    it('STASIS banish shows STASIS while in stasis', () => {
        CCManager.applyCC(red, blue, ccSkill({ ccType: 'BANISH', specialVisualStatus: 'STASIS' }), 'BANISH', 2, 0, undefined, engine);
        expect(blue.effects.STASIS.remaining).toBeGreaterThan(0);
        expect(statusesOverTicks(blue)).toEqual(Array(TICKS).fill('STASIS'));
    });

    it('returns to NONE after the CC expires', () => {
        CCManager.applyCC(red, blue, ccSkill({ ccType: 'POLYMORPH', specialVisualStatus: 'POLYMORPH' }), 'POLYMORPH', 0.1, 0, undefined, engine);
        for (let i = 0; i < 10; i++) engine.tick(TICK);
        expect(blue.effects.POLYMORPH.remaining).toBe(0);
        expect(blue.view.visualStatus).not.toBe('POLYMORPH');
    });
});
