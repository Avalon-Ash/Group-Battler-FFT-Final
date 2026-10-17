import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { VisualMath } from '../engine/math/VisualMath';
import { ProjectileSystem } from '../engine/systems/combat/ProjectileSystem';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { MovementType, Team } from '../types';
import { resolveBodyType } from '../data/units/appearance/bodyTypes';
import { projectionCenterHeight } from '../data/units/appearance/projection';

// 發射點（getCoreAnchor）與受擊點（getUnitAnchor）都是投影中心（VisualMath.projectionCenterAt）：
// 腳下地面 + physics.z + projectionCenterHeight(體型)，沒有水平位移。

describe('projection center anchors', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });
    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('standing unit: emission anchor == hit anchor == projection center', () => {
        const a = engine.addAgent(Team.BLUE, 3, 3)!;
        const ground = engine.getTerrainHeight(3, 3);
        const center = VisualMath.projectionCenterAt(a.px, a.py, ground, 0, resolveBodyType(a));
        const core = VisualMath.getCoreAnchor(a, engine);
        const hit = VisualMath.getUnitAnchor(a, engine);
        expect(core).toEqual(center);
        expect(hit).toEqual(center);
        expect(core.x).toBeCloseTo(a.px);
        expect(core.y).toBeCloseTo(a.py);
        expect(core.z).toBeCloseTo(ground + projectionCenterHeight(resolveBodyType(a)));
    });

    it('flying or jumping unit: both anchors include physics.z (emit from the body center)', () => {
        const a = engine.addAgent(Team.BLUE, 3, 3)!;
        const before = VisualMath.getCoreAnchor(a, engine);
        a.movementType = MovementType.FLYING;
        a.physics.z = 90;
        const core = VisualMath.getCoreAnchor(a, engine);
        expect(core.z).toBeCloseTo(before.z + 90);
        expect(VisualMath.getUnitAnchor(a, engine)).toEqual(core);
    });

    it('follows physics knockback offsets (no horizontal core offset)', () => {
        const a = engine.addAgent(Team.RED, 4, 2)!;
        a.physics.x = 7;
        a.physics.y = -5;
        const core = VisualMath.getCoreAnchor(a, engine);
        expect(core.x).toBeCloseTo(a.px + 7);
        expect(core.y).toBeCloseTo(a.py - 5);
    });

    it('rides the ground height blend while moving between heights', () => {
        const a = engine.addAgent(Team.BLUE, 2, 2)!;
        const heights = (q: number, r: number) => (q === 2 && r === 2 ? 0 : 100);
        const walker = { q: 2, r: 2, isMoving: true, path: [{ q: 3, r: 2 }], moveProgress: 0, px: a.px, py: a.py, physics: a.physics };
        const body = resolveBodyType(a);
        const at = () => VisualMath.projectionCenterAt(a.px, a.py, VisualMath.getUnitGroundHeight(walker, heights), 0, body);
        const start = at();
        walker.moveProgress = 1;
        const end = at();
        expect(start.z).toBeCloseTo(projectionCenterHeight(body));
        expect(end.z).toBeCloseTo(100 + projectionCenterHeight(body));
    });

    it('screen-space projection center is the same height the anchors use', () => {
        const a = engine.addAgent(Team.BLUE, 3, 3)!;
        const body = resolveBodyType(a);
        for (const z of [0, 40]) {
            // floorY = 0（ctx 原點在腳底）：螢幕 Y 往上為負，距離 = physics.z + 中心高度
            expect(-VisualMath.getProjectionCenterY(0, z, body)).toBeCloseTo(z + projectionCenterHeight(body));
        }
    });
});

describe('ProjectileSystem launch point', () => {
    it('launches from the caster projection center (incl. physics.z) and aims at the target projection center', () => {
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
            expect(p.startZ).toBeCloseTo(VisualMath.getUnitAnchor(src, engine).z);
        } finally {
            engine.stop();
            engine.clear();
        }
    });
});
