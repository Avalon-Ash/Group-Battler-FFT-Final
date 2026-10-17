import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { VisualMath } from '../engine/math/VisualMath';
import { ProjectileSystem } from '../engine/systems/combat/ProjectileSystem';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { CORE_VISUAL, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from '../constants';
import { MovementType, Team } from '../types';

// 核心位置（施法／投射物／光束起點）的唯一定義：VisualMath.getCoreAnchor。
// 核心屬於棋座（地面），飛行或跳躍的角色投影不影響它；目標端仍用身體中心（getUnitAnchor）。

describe('VisualMath.getCoreAnchor', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });
    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('sits above the pedestal ground, not at the body center', () => {
        const a = engine.addAgent(Team.BLUE, 3, 3)!;
        const ground = engine.getTerrainHeight(3, 3);
        const core = VisualMath.getCoreAnchor(a, engine);
        expect(core.x).toBeCloseTo(a.px + CORE_VISUAL.offsetX);
        expect(core.y).toBeCloseTo(a.py);
        expect(core.z).toBeCloseTo(ground + CORE_VISUAL.hoverHeight);
        expect(VisualMath.getUnitAnchor(a, engine).z).toBeCloseTo(ground + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET);
    });

    it('stays on the pedestal when the projection flies or jumps', () => {
        const a = engine.addAgent(Team.BLUE, 3, 3)!;
        const before = VisualMath.getCoreAnchor(a, engine);
        a.movementType = MovementType.FLYING;
        a.physics.z = 90;
        const after = VisualMath.getCoreAnchor(a, engine);
        expect(after.z).toBe(before.z);
        expect(VisualMath.getUnitAnchor(a, engine).z).toBeGreaterThan(after.z + 80);
    });

    it('follows physics knockback offsets like the pedestal does', () => {
        const a = engine.addAgent(Team.RED, 4, 2)!;
        a.physics.x = 7;
        a.physics.y = -5;
        const core = VisualMath.getCoreAnchor(a, engine);
        expect(core.x).toBeCloseTo(a.px + 7 + CORE_VISUAL.offsetX);
        expect(core.y).toBeCloseTo(a.py - 5);
    });

    it('rides the ground height blend while moving between heights', () => {
        const a = engine.addAgent(Team.BLUE, 2, 2)!;
        const heights = (q: number, r: number) => (q === 2 && r === 2 ? 0 : 100);
        const walker = { q: 2, r: 2, isMoving: true, path: [{ q: 3, r: 2 }], moveProgress: 0 };
        const start = VisualMath.coreAnchorAt(a.px, a.py, VisualMath.getUnitGroundHeight(walker, heights));
        walker.moveProgress = 1;
        const end = VisualMath.coreAnchorAt(a.px, a.py, VisualMath.getUnitGroundHeight(walker, heights));
        expect(start.z).toBeCloseTo(CORE_VISUAL.hoverHeight);
        expect(end.z).toBeCloseTo(100 + CORE_VISUAL.hoverHeight);
    });
});

describe('ProjectileSystem launch point', () => {
    it('launches from the core of a flying caster, aims at the target body', () => {
        const engine = new GameEngine();
        try {
            const src = engine.addAgent(Team.BLUE, 2, 2)!;
            const tgt = engine.addAgent(Team.RED, 4, 2)!;
            src.spawnTimer = 0;
            src.movementType = MovementType.FLYING;
            src.physics.z = 90;
            src.target = tgt;
            const skill = DEFAULT_SKILL_DB.find((s) => s.id === 'rb_b1')!;
            new ProjectileSystem().spawnProjectile(src, skill, engine);
            const p = engine.projectiles[engine.projectiles.length - 1];
            const core = VisualMath.getCoreAnchor(src, engine);
            const body = VisualMath.getUnitAnchor(tgt, engine);
            expect(p.startX).toBeCloseTo(core.x);
            expect(p.startY).toBeCloseTo(core.y);
            expect(p.startZ).toBeCloseTo(core.z);
            expect(p.endZ).toBeCloseTo(body.z);
            expect(p.startZ).toBeLessThan(VisualMath.getUnitAnchor(src, engine).z);
        } finally {
            engine.stop();
            engine.clear();
        }
    });
});
