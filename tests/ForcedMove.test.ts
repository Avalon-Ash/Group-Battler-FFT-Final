import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role, MovementType } from '../types';
import type { Skill } from '../types';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, FORCED_MOVE } from '../constants';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { CCManager } from '../engine/systems/combat/CCManager';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';
import { resolveForcedMove, planDashPath, computeImpactDamage } from '../engine/systems/combat/ForcedMove';
import { canStepUp } from '../engine/math/ClimbRule';

// 強制位移（擊退／拉扯／突進）遵守地形高度，撞牆吃撞擊傷害（Tactics Ogre 式）。
// 一律沿 r = 0 這一排的 +q 方向推：q = -2 … 4。

const HP = 200;

describe('ForcedMove', () => {
    let engine: GameEngine;
    const skill: Skill = DEFAULT_SKILL_DB[0];

    function spawn(team: Team, q: number, opts: { jump?: number; flying?: boolean; weight?: number } = {}): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, 0, HP, Role.WARRIOR);
        if (!a) throw new Error(`cannot spawn at ${q},0`);
        a.maxHp = HP;
        a.hp = HP;
        a.shield = 0;
        a.weight = opts.weight ?? 1;
        a.jump = opts.jump ?? 1;
        if (opts.flying) a.movementType = MovementType.FLYING;
        return a;
    }
    const setHeight = (q: number, tiers: number) => engine.map.heightMap.set(HexUtils.key({ q, r: 0 }), tiers * BLOCK_HEIGHT);
    const dirPlusQ = () => {
        const a = HexUtils.toPx(0, 0, engine.mapConfig);
        const b = HexUtils.toPx(1, 0, engine.mapConfig);
        return { x: b.x - a.x, y: b.y - a.y };
    };
    /** 從目標左邊一格往右推 */
    const push = (src: Agent, tgt: Agent, force: number, type: 'KNOCKBACK' | 'PULL' = 'KNOCKBACK') => {
        const o = HexUtils.toPx(tgt.q - 1, 0, engine.mapConfig);
        CCManager.applyCC(src, tgt, skill, type, 0, force, o, engine);
    };

    beforeEach(() => {
        engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        for (let q = -6; q <= 6; q++) setHeight(q, 0);
    });
    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('flat push moves N tiles with no impact', () => {
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0);
        push(src, tgt, 3);
        expect(tgt.q).toBe(3);
        expect(tgt.hp).toBe(HP);
    });

    it('a wall above the jump limit stops the push and deals impact proportional to remaining tiles', () => {
        setHeight(1, 3); // 3 格高、跳躍 1 → 擋下
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0);
        push(src, tgt, 3);
        expect(tgt.q).toBe(0);
        const expected = computeImpactDamage(HP, { reason: 'WALL', hex: { q: 1, r: 0 }, heightDiff: 3 * BLOCK_HEIGHT, remaining: 3 });
        expect(tgt.hp).toBe(HP - expected);
        const hud = engine.events.find(e => e.type === 'DAMAGE' && e.text === FORCED_MOVE.IMPACT_TEXT);
        expect(hud).toBeDefined();

        // 剩的格數越多，傷害越大
        const a = computeImpactDamage(HP, { reason: 'WALL', hex: { q: 1, r: 0 }, heightDiff: 3 * BLOCK_HEIGHT, remaining: 1 });
        const b = computeImpactDamage(HP, { reason: 'WALL', hex: { q: 1, r: 0 }, heightDiff: 3 * BLOCK_HEIGHT, remaining: 3 });
        expect(b).toBeGreaterThan(a);
    });

    it('impact damage is capped by IMPACT_MAX_PCT of maxHp', () => {
        const d = computeImpactDamage(HP, { reason: 'WALL', hex: { q: 1, r: 0 }, heightDiff: 50 * BLOCK_HEIGHT, remaining: 20 });
        expect(d).toBe(Math.floor(HP * FORCED_MOVE.IMPACT_MAX_PCT));
    });

    it('jump-3 climbs the wall that blocks jump-1 (ring of 2 tiers)', () => {
        setHeight(1, 2);
        const src = spawn(Team.RED, -2);
        const low = spawn(Team.BLUE, 0, { jump: 1 });
        push(src, low, 1);
        expect(low.q).toBe(0);
        expect(low.hp).toBeLessThan(HP);

        // 同一格不能疊；先移走 low
        engine.map.unregisterAgent(low);
        const high = spawn(Team.BLUE, 0, { jump: 3 });
        push(src, high, 1);
        expect(high.q).toBe(1);
        expect(high.hp).toBe(HP);
    });

    it('a flying target ignores the wall', () => {
        setHeight(1, 4);
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0, { flying: true });
        push(src, tgt, 2);
        expect(tgt.q).toBe(2);
        expect(tgt.hp).toBe(HP);
    });

    it('an obstacle blocks the push and hurts', () => {
        engine.map.obstacles.set(HexUtils.key({ q: 2, r: 0 }), 'WALL');
        engine.map.obstaclesHash.add(HexUtils.hash(2, 0));
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0);
        push(src, tgt, 3);
        expect(tgt.q).toBe(1);
        expect(tgt.hp).toBeLessThan(HP);
    });

    it('a unit blocks the push and both units are hurt', () => {
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0);
        const other = spawn(Team.BLUE, 2);
        push(src, tgt, 3);
        expect(tgt.q).toBe(1);
        expect(tgt.hp).toBeLessThan(HP);
        expect(other.hp).toBeLessThan(HP);
        expect(HP - other.hp).toBeLessThanOrEqual(HP - tgt.hp);
        expect(other.q).toBe(2);
    });

    it('pull stops next to the caster without impact damage', () => {
        const src = spawn(Team.RED, 0);
        const tgt = spawn(Team.BLUE, 3);
        // PULL 的 origin 是拉人的位置：往 -q 拉向施法者
        const o = HexUtils.toPx(0, 0, engine.mapConfig);
        CCManager.applyCC(src, tgt, skill, 'PULL', 0, 4, o, engine);
        expect(tgt.q).toBe(1);
        expect(tgt.hp).toBe(HP);
    });

    it('pushing off a cliff edge goes down with no impact damage', () => {
        setHeight(0, 3);
        const src = spawn(Team.RED, -2);
        const tgt = spawn(Team.BLUE, 0);
        push(src, tgt, 2);
        expect(tgt.q).toBe(2);
        expect(tgt.hp).toBe(HP);
    });

    it('a push into the void is allowed (ring-out) with no impact', () => {
        const src = spawn(Team.RED, 5);
        const tgt = spawn(Team.BLUE, 6);
        push(src, tgt, 3);
        // 6 之後的第一個虛空格即終點
        expect(engine.map.isValid(tgt.q, tgt.r)).toBe(false);
        expect(tgt.hp).toBe(HP);
    });

    it('dash stops below a cliff it cannot climb', () => {
        setHeight(2, 3);
        const caster = spawn(Team.RED, -2);
        const path = planDashPath(caster, { q: 3, r: 0 }, engine);
        const res = resolveForcedMove(caster, path, path.length, 'DASH', engine);
        expect(res.finalHex).toEqual({ q: 1, r: 0 });
        expect(res.blocked?.reason).toBe('WALL');
        expect(res.blocked?.heightDiff).toBe(3 * BLOCK_HEIGHT);
    });

    it('dash ends adjacent to an enemy target, and never on void', () => {
        const caster = spawn(Team.RED, -2);
        const enemy = spawn(Team.BLUE, 2);
        const path = planDashPath(caster, { q: 2, r: 0 }, engine);
        const res = resolveForcedMove(caster, path, path.length, 'DASH', engine);
        expect(res.finalHex).toEqual({ q: 1, r: 0 });
        expect(res.blocked).toBeNull();

        // 目標在虛空外：EDGE 擋下，停在最後一個合法格
        engine.map.unregisterAgent(enemy);
        const voidPath = planDashPath(caster, { q: 9, r: 0 }, engine);
        const res2 = resolveForcedMove(caster, voidPath, voidPath.length, 'DASH', engine);
        expect(engine.map.isValid(res2.finalHex.q, res2.finalHex.r)).toBe(true);
        expect(res2.blocked?.reason).toBe('EDGE');
    });

    it('SkillExecutor DASH respects the climb rule end to end', () => {
        setHeight(1, 3);
        const caster = spawn(Team.RED, -2);
        const enemy = spawn(Team.BLUE, 3);
        const dash: Skill = { ...skill, effectType: 'DASH', range: 6, power: 0, type: 'SINGLE' };
        caster.target = enemy;
        caster.targetHex = { q: 3, r: 0 };
        new SkillExecutor().executeInstantSkill(caster, dash, engine);
        expect(caster.q).toBe(0);
    });

    it('canStepUp matches the Pathfinder rule', () => {
        const ground = { jump: 1, movementType: MovementType.GROUND };
        expect(canStepUp(ground, 0, BLOCK_HEIGHT)).toBe(true);
        expect(canStepUp(ground, 0, BLOCK_HEIGHT + 1)).toBe(false);
        expect(canStepUp({ jump: 0, movementType: MovementType.GROUND }, 0, BLOCK_HEIGHT)).toBe(true);
        expect(canStepUp(ground, 5 * BLOCK_HEIGHT, 0)).toBe(true);
        expect(canStepUp({ jump: 1, movementType: MovementType.FLYING }, 0, 9 * BLOCK_HEIGHT)).toBe(true);
    });
});
