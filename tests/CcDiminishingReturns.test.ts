// ╔══════════════════════════════════════════════════════════╗
// ║  tests/CcDiminishingReturns.test.ts — WoW 式控制遞減          ║
// ║  職責：同類別連續套用 100% → 50% → 25% → 免疫；遞減倒數從控制  ║
// ║  「結束」才開始；恐懼與變形同屬迷惑類；位移與緩速不吃遞減      ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { CCManager } from '../engine/systems/combat/CCManager';
import { ControlSystem } from '../engine/systems/status/ControlSystem';
import { COMBAT_PARAM } from '../constants';
import { EFFECT_DEFS, DR_CATEGORY_KINDS } from '../data/status/effect_defs';
import { EFFECT_KINDS } from '../engine/core/Effects';
import { STATUS_VISUALS } from '../data/vfx/status_visuals';

describe('CC diminishing returns (WoW style)', () => {
    let engine: GameEngine;
    let caster: Agent;
    let target: Agent;
    const control = new ControlSystem();

    beforeEach(() => {
        engine = new GameEngine();
        caster = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 1000, Role.MAGE)!;
        target = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 1000, Role.WARRIOR)!;
        target.spawnTimer = 0;
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    const apply = (type: Skill['ccType'], dur: number) => CCManager.applyCC(caster, target, {} as Skill, type, dur, undefined, undefined, engine);
    const tick = (seconds: number, step = 0.1) => {
        for (let t = 0; t < seconds - 1e-9; t += step) control.update(target, step, engine);
    };

    it('同類別連續套用：100% → 50% → 25% → 免疫', () => {
        const applied: number[] = [];
        for (let n = 0; n < 4; n++) {
            target.effects.STUN.remaining = 0; // 每次都在上一個結束後再套（不是控制中追加）
            apply('STUN', 2);
            applied.push(target.effects.STUN.remaining);
        }
        expect(applied).toEqual([2, 1, 0.5, 0]);
        expect(engine.events.some(e => e.text === STATUS_VISUALS.IMMUNE.label)).toBe(true);
    });

    it('遞減倒數從控制結束才開始（控制期間不倒數）', () => {
        apply('STUN', 6);
        expect(target.drStacks.stun).toBe(1);

        tick(5.9); // 暈眩還在：倒數不動
        expect(target.effects.STUN.remaining).toBeGreaterThan(0);
        expect(target.drTimers.stun).toBe(COMBAT_PARAM.DR_RESET_TIME);

        tick(0.3); // 暈眩結束
        expect(target.effects.STUN.remaining).toBe(0);

        tick(COMBAT_PARAM.DR_RESET_TIME - 0.5); // 結束後還沒滿 10 秒：層數還在
        expect(target.drStacks.stun).toBe(1);

        tick(1.0); // 滿 10 秒：層數歸零
        expect(target.drStacks.stun).toBe(0);
        expect(target.drTimers.stun).toBeUndefined();

        apply('STUN', 2);
        expect(target.effects.STUN.remaining).toBe(2); // 回到 100%
    });

    it('恐懼與變形共用「迷惑」類別，不同類別互不影響', () => {
        apply('FEAR', 2);
        expect(target.effects.FEAR.remaining).toBe(2);
        apply('POLYMORPH', 2);
        expect(target.effects.POLYMORPH.remaining).toBe(1); // 第 2 次：50%
        apply('SILENCE', 2);
        expect(target.effects.SILENCE.remaining).toBe(2); // 另一類，100%
        expect(target.drStacks.disorient).toBe(2);
        expect(target.drStacks.silence).toBe(1);
    });

    it('位移與緩速不吃遞減', () => {
        for (let n = 0; n < 6; n++) apply('SLOW', 1);
        expect(target.effects.SLOW.remaining).toBe(1);
        for (let n = 0; n < 6; n++) apply('KNOCKBACK', 1);
        expect(target.drStacks).toEqual({});
        expect(target.drTimers).toEqual({});
    });

    it('遞減類別與硬控旗標一致（hardCC ⇔ 有類別）；類別表涵蓋所有硬控', () => {
        for (const kind of EFFECT_KINDS) {
            expect(EFFECT_DEFS[kind].hardCC, kind).toBe(EFFECT_DEFS[kind].drCategory !== null);
        }
        const covered = Object.values(DR_CATEGORY_KINDS).flat().sort();
        const hard = EFFECT_KINDS.filter(k => EFFECT_DEFS[k].hardCC).sort();
        expect(covered).toEqual(hard);
        expect(EFFECT_DEFS.SLOW.hardCC).toBe(false);
    });
});
