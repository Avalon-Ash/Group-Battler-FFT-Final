// ╔══════════════════════════════════════════════════════════════════╗
// ║  SequenceTargetBinding — 單體序列動態目標綁定與鎖定時點回歸測試    ║
// ║  職責：驗證 SequenceSystem 目標動態追蹤、結算鎖定、死傷邊界、     ║
// ║        VisualSystem 路由資格門控及 CAST_BREAK 中斷清理             ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { SequenceSystem, SequenceRunOptions } from '../engine/presentation/visuals/SequenceSystem';
import { VisualSystem } from '../engine/presentation/VisualSystem';
import { VFXSystem } from '../engine/presentation/vfx';
import { HUDSystem } from '../engine/presentation/hud';
import { GridSystem } from '../engine/systems/grid';
import { CameraSystem } from '../engine/presentation/CameraSystem';
import { VisualMath, Point3D } from '../engine/math/VisualMath';
import { Team, Role, GameEvent, Skill } from '../types';
import { VFXSequence, VFXAction } from '../types/VFXSchema';

describe('SequenceTargetBinding (F02)', () => {
    let engine: GameEngine;
    let sequenceSystem: SequenceSystem;
    let visualSystem: VisualSystem;
    let vfxSystem: VFXSystem;
    let hudSystem: HUDSystem;
    let gridSystem: GridSystem;
    let cameraSystem: CameraSystem;

    beforeEach(() => {
        engine = new GameEngine();
        sequenceSystem = new SequenceSystem();
        visualSystem = new VisualSystem();
        vfxSystem = new VFXSystem();
        hudSystem = new HUDSystem();
        gridSystem = new GridSystem();
        cameraSystem = new CameraSystem();

        // Place caster and target agents
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.BLUE,
            q: 0,
            r: 0,
            hp: 1000,
            role: Role.MAGE,
        });
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: Team.RED,
            q: 2,
            r: 0,
            hp: 1000,
            role: Role.TANK,
        });
    });

    afterEach(() => {
        if (engine) engine.destroy();
    });

    describe('SequenceSystem Dynamic Target Sampling & Locking', () => {
        it('tracks moving target before lockAt and uses updated anchor', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const dispatchedTargets: Point3D[] = [];
            const testAction: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.3 };
            const sequence: VFXSequence = { id: 'test_seq', actions: [testAction] };

            const options: SequenceRunOptions = {
                targetId: target.id,
                lockAt: engine.battleTime + 0.5,
            };

            // Run sequence with delay 0.3s, lockAt = 0.5s
            sequenceSystem.run(sequence, initialAnchor, engine, vfxSystem, caster.id, 0, options);

            // Spy on dispatch by checking internal execution via update
            // Advance battleTime by 0.1s (target moves to px + 50)
            engine.battleTime += 0.1;
            target.px += 50;
            sequenceSystem.update(engine, vfxSystem);

            // Action has not executed yet (executeAt = 0.3, battleTime = 0.1)
            // Advance battleTime to 0.3s (action is due)
            engine.battleTime = 0.3;
            target.px += 30; // target moved further before lockAt
            const anchorAt03 = VisualMath.getUnitAnchor(target, engine);

            // Intercept playBeam
            let passedBeamTarget: Point3D | undefined;
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_style, _source, beamTarget, ..._rest) => {
                passedBeamTarget = { ...beamTarget };
            };

            try {
                sequenceSystem.update(engine, vfxSystem);
                expect(passedBeamTarget).toBeDefined();
                // Verified: beam was dispatched to updated anchor at 0.3s, NOT initialAnchor
                expect(passedBeamTarget!.x).toBeCloseTo(anchorAt03.x, 1);
                expect(passedBeamTarget!.x).not.toBeCloseTo(initialAnchor.x, 1);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
            }
        });

        it('permanently locks anchor at lockAt; subsequent actions use locked anchor even if target moves further', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            // Sequence with two actions: first at 0.5s (lockAt), second lingering wave at 0.8s
            const action1: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const action2: VFXAction = { type: 'PARTICLE', id: 'FX_GRID_IMPACT_BLUE', delay: 0.8 };
            const sequence: VFXSequence = { id: 'test_seq', actions: [action1, action2] };

            const lockAt = engine.battleTime + 0.5;
            const options: SequenceRunOptions = {
                targetId: target.id,
                lockAt,
            };

            sequenceSystem.run(sequence, initialAnchor, engine, vfxSystem, caster.id, 0, options);

            // Move target during cast to px + 100
            target.px += 100;
            engine.battleTime = lockAt; // reach lockAt exactly (0.5s)
            const lockedAnchor = VisualMath.getUnitAnchor(target, engine);

            let beamTargetPos: Point3D | undefined;
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_style, _source, t, ..._rest) => {
                beamTargetPos = { ...t };
            };

            let particleTargetPos: Point3D | undefined;
            const origPlayEffect = vfxSystem.playEffect.bind(vfxSystem);
            vfxSystem.playEffect = (_id, x, y, z, ..._rest) => {
                particleTargetPos = { x, y, z };
                return null as any;
            };

            try {
                // Update at 0.5s: locks binding and dispatches action1
                sequenceSystem.update(engine, vfxSystem);
                expect(beamTargetPos).toBeDefined();
                expect(beamTargetPos!.x).toBeCloseTo(lockedAnchor.x, 1);

                // Now move target far away AFTER lockAt (at 0.8s)
                target.px += 200;
                engine.battleTime = 0.8;
                sequenceSystem.update(engine, vfxSystem);

                expect(particleTargetPos).toBeDefined();
                // Lingering action must use the LOCKED anchor at 0.5s, NOT the target's new position at 0.8s!
                expect(particleTargetPos!.x).toBeCloseTo(lockedAnchor.x, 1);
                expect(particleTargetPos!.x).not.toBeCloseTo(VisualMath.getUnitAnchor(target, engine).x, 1);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
                vfxSystem.playEffect = origPlayEffect;
            }
        });

        it('dispatches multiple actions in the same frame with identical target anchors', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            // Co-frame actions: both at delay 0.4s
            const action1: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.4 };
            const action2: VFXAction = { type: 'PARTICLE', id: 'FX_GRID_IMPACT_BLUE', delay: 0.4 };
            const sequence: VFXSequence = { id: 'test_seq', actions: [action1, action2] };

            sequenceSystem.run(sequence, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: engine.battleTime + 0.4,
            });

            target.px += 80;
            engine.battleTime = 0.4;

            const capturedPositions: Point3D[] = [];
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_s, _src, t) => { capturedPositions.push({ ...t }); };
            const origPlayEffect = vfxSystem.playEffect.bind(vfxSystem);
            vfxSystem.playEffect = (_id, x, y, z) => { capturedPositions.push({ x, y, z }); return null as any; };

            try {
                sequenceSystem.update(engine, vfxSystem);
                expect(capturedPositions.length).toBe(2);
                expect(capturedPositions[0].x).toBe(capturedPositions[1].x);
                expect(capturedPositions[0].y).toBe(capturedPositions[1].y);
                expect(capturedPositions[0].z).toBe(capturedPositions[1].z);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
                vfxSystem.playEffect = origPlayEffect;
            }
        });

        it('maintains independent bindings for consecutive runs by same caster', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            // Run 1 for target at (0, 0)
            sequenceSystem.run(seq, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: 0.5,
            });

            // Target moves, run 2 for target at new position
            target.px += 100;
            const secondAnchor = VisualMath.getUnitAnchor(target, engine);
            sequenceSystem.run(seq, secondAnchor, engine, vfxSystem, caster.id, 0.2, {
                targetId: target.id,
                lockAt: 0.7,
            });

            // Two distinct bindings exist and don't overwrite each other
            expect(sequenceSystem['actionQueue'].length).toBe(2);
            expect(sequenceSystem['actionQueue'][0].binding).not.toBe(sequenceSystem['actionQueue'][1].binding);
        });

        it('samples anchor cleanly when target has hp <= 0 but is still in agents list', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            sequenceSystem.run(seq, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: 0.5,
            });

            // Target killed on this frame: hp = 0, but still in engine.agents
            target.hp = 0;
            target.px += 60;
            engine.battleTime = 0.5;

            let beamTargetPos: Point3D | undefined;
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_s, _src, t) => { beamTargetPos = { ...t }; };

            try {
                sequenceSystem.update(engine, vfxSystem);
                expect(beamTargetPos).toBeDefined();
                expect(beamTargetPos!.x).toBeCloseTo(VisualMath.getUnitAnchor(target, engine).x, 1);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
            }
        });

        it('falls back cleanly to lastAnchor when target is removed from agents list', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            sequenceSystem.run(seq, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: 0.5,
            });

            target.px += 50;
            engine.battleTime = 0.2;
            sequenceSystem.update(engine, vfxSystem);
            const anchorBeforeRemoval = VisualMath.getUnitAnchor(target, engine);

            // Remove target from engine.agents (e.g. banished or deleted)
            engine.agents = engine.agents.filter(a => a.id !== target.id);

            engine.battleTime = 0.5;
            let beamTargetPos: Point3D | undefined;
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_s, _src, t) => { beamTargetPos = { ...t }; };

            try {
                sequenceSystem.update(engine, vfxSystem);
                expect(beamTargetPos).toBeDefined();
                // Verified: used last valid anchor before removal
                expect(beamTargetPos!.x).toBeCloseTo(anchorBeforeRemoval.x, 1);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
            }
        });

        it('preserves static target position when run() is called without options', () => {
            const caster = engine.agents[0];
            const staticTarget: Point3D = { x: 200, y: 150, z: 20 };
            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.3 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            // Call run without options (legacy caller pattern)
            sequenceSystem.run(seq, staticTarget, engine, vfxSystem, caster.id, 0);

            engine.battleTime = 0.3;
            let beamTargetPos: Point3D | undefined;
            const origPlayBeam = vfxSystem.playBeam.bind(vfxSystem);
            vfxSystem.playBeam = (_s, _src, t) => { beamTargetPos = { ...t }; };

            try {
                sequenceSystem.update(engine, vfxSystem);
                expect(beamTargetPos).toEqual(staticTarget);
            } finally {
                vfxSystem.playBeam = origPlayBeam;
            }
        });
    });

    describe('VisualSystem CAST_START Qualification & Routing', () => {
        it('passes targetId and lockAt to SequenceSystem only for eligible SINGLE skills', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];

            let lastRunOptions: SequenceRunOptions | undefined;
            const origRun = sequenceSystem.run.bind(sequenceSystem);
            sequenceSystem.run = (...args) => {
                lastRunOptions = args[6];
                return origRun(...args);
            };

            const singleSkill: Skill = {
                id: 'mb_a2',
                name: '冰封禁錮',
                role: Role.MAGE,
                tag: 'ACTIVE',
                range: 3,
                cast: 0.5,
                cd: 5,
                cost: 20,
                gain: 0,
                type: 'SINGLE',
                power: 130,
                projectileSpeed: 0,
                color: '#4fc3f7',
            };

            const castEvent: GameEvent = {
                type: 'CAST_START',
                sourceId: caster.id,
                targetId: target.id,
                skill: singleSkill,
                pos: { x: target.px, y: target.py, z: 10 },
            };

            try {
                visualSystem.flush([castEvent], engine, vfxSystem, hudSystem, gridSystem, cameraSystem, sequenceSystem);
                expect(lastRunOptions).toBeDefined();
                expect(lastRunOptions!.targetId).toBe(target.id);
                expect(lastRunOptions!.lockAt).toBe(engine.battleTime + 0.5);
            } finally {
                sequenceSystem.run = origRun;
            }
        });

        it('does NOT pass binding options for AOE skills', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];

            let lastRunOptions: SequenceRunOptions | undefined;
            const origRun = sequenceSystem.run.bind(sequenceSystem);
            sequenceSystem.run = (...args) => {
                lastRunOptions = args[6];
                return origRun(...args);
            };

            const aoeSkill: Skill = {
                id: 'mb_u1',
                name: '奧術漩渦',
                role: Role.MAGE,
                tag: 'ULT',
                range: 4,
                cast: 1.0,
                cd: 15,
                cost: 100,
                gain: 0,
                type: 'AOE',
                aoeRadius: 2,
                power: 300,
                color: '#9c27b0',
            };

            const castEvent: GameEvent = {
                type: 'CAST_START',
                sourceId: caster.id,
                targetId: target.id,
                skill: aoeSkill,
                pos: { x: target.px, y: target.py, z: 10 },
            };

            try {
                visualSystem.flush([castEvent], engine, vfxSystem, hudSystem, gridSystem, cameraSystem, sequenceSystem);
                expect(lastRunOptions).toBeUndefined();
            } finally {
                sequenceSystem.run = origRun;
            }
        });

        it('does NOT pass binding options for projectile skills with projectileSpeed > 0', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];

            let lastRunOptions: SequenceRunOptions | undefined;
            const origRun = sequenceSystem.run.bind(sequenceSystem);
            sequenceSystem.run = (...args) => {
                lastRunOptions = args[6];
                return origRun(...args);
            };

            const projSkill: Skill = {
                id: 'mb_b1',
                name: '法力箭',
                role: Role.MAGE,
                tag: 'BASIC',
                range: 3,
                cast: 0.3,
                cd: 0,
                cost: 0,
                gain: 10,
                type: 'SINGLE',
                power: 80,
                projectileSpeed: 600,
                color: '#2196f3',
            };

            const castEvent: GameEvent = {
                type: 'CAST_START',
                sourceId: caster.id,
                targetId: target.id,
                skill: projSkill,
                pos: { x: target.px, y: target.py, z: 10 },
            };

            try {
                visualSystem.flush([castEvent], engine, vfxSystem, hudSystem, gridSystem, cameraSystem, sequenceSystem);
                expect(lastRunOptions).toBeUndefined();
            } finally {
                sequenceSystem.run = origRun;
            }
        });

        it('does NOT pass binding options for ground-only targetId', () => {
            const caster = engine.agents[0];

            let lastRunOptions: SequenceRunOptions | undefined;
            const origRun = sequenceSystem.run.bind(sequenceSystem);
            sequenceSystem.run = (...args) => {
                lastRunOptions = args[6];
                return origRun(...args);
            };

            const singleSkill: Skill = {
                id: 'mb_a2',
                name: '冰封禁錮',
                role: Role.MAGE,
                tag: 'ACTIVE',
                range: 3,
                cast: 0.5,
                cd: 5,
                cost: 20,
                gain: 0,
                type: 'SINGLE',
                power: 130,
                projectileSpeed: 0,
                color: '#4fc3f7',
            };

            const castEvent: GameEvent = {
                type: 'CAST_START',
                sourceId: caster.id,
                targetId: 'ground-2,0',
                skill: singleSkill,
                pos: { x: 100, y: 100, z: 10 },
            };

            try {
                visualSystem.flush([castEvent], engine, vfxSystem, hudSystem, gridSystem, cameraSystem, sequenceSystem);
                expect(lastRunOptions).toBeUndefined();
            } finally {
                sequenceSystem.run = origRun;
            }
        });
    });

    describe('CAST_BREAK and Interruption Lifecycle', () => {
        it('clears pending sequence actions on CAST_BREAK', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            sequenceSystem.run(seq, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: 0.5,
            });

            expect(sequenceSystem['actionQueue'].length).toBe(1);

            // Stub playEffect to avoid canvas creation in node test environment
            const origPlayEffect = vfxSystem.playEffect.bind(vfxSystem);
            vfxSystem.playEffect = () => null as any;

            try {
                // Emit CAST_BREAK event through visualSystem
                const breakEvent: GameEvent = {
                    type: 'CAST_BREAK',
                    sourceId: caster.id,
                    pos: { x: caster.px, y: caster.py },
                };
                visualSystem.flush([breakEvent], engine, vfxSystem, hudSystem, gridSystem, cameraSystem, sequenceSystem);

                expect(sequenceSystem['actionQueue'].length).toBe(0);
            } finally {
                vfxSystem.playEffect = origPlayEffect;
            }
        });

        it('clears all queued actions on clear()', () => {
            const caster = engine.agents[0];
            const target = engine.agents[1];
            const initialAnchor = VisualMath.getUnitAnchor(target, engine);

            const action: VFXAction = { type: 'BEAM', style: 'GENERIC_BEAM', delay: 0.5 };
            const seq: VFXSequence = { id: 'test_seq', actions: [action] };

            sequenceSystem.run(seq, initialAnchor, engine, vfxSystem, caster.id, 0, {
                targetId: target.id,
                lockAt: 0.5,
            });

            expect(sequenceSystem['actionQueue'].length).toBe(1);
            sequenceSystem.clear();
            expect(sequenceSystem['actionQueue'].length).toBe(0);
        });
    });
});
