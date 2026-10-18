import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { Team, Role, AnimState, ActionState, Skill } from '../types';
import { MapConfig } from '../engine/utils';
import {
    selectSpriteFrame,
    selectSpriteDirection,
    getAgentPhaseOffset
} from '../data/units/appearance/selectSpriteFrame';
import {
    SpriteUnitRenderer,
    computeSpriteScreenScale,
    computeSpriteLocalScale,
    computeSpriteDrawRect
} from '../engine/renderers/units/factions/SpriteUnitRenderer';
import { UnitDeathPainter } from '../engine/renderers/units/painters/UnitDeathPainter';
import { spriteAtlasStore, UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';
import { SHIELD_VISUAL, UNIT_SPRITE, UNIT_SCALE, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from '../constants';
import { VisualMath } from '../engine/math/VisualMath';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dummyConfig: MapConfig = {
    w: 10,
    h: 10,
    offsetX: 0,
    offsetY: 0,
    layout: 'FLAT'
};

const dummySkill: Skill = {
    id: 'test_skill',
    tag: 'ACTIVE',
    role: Role.MAGE,
    name: 'Test Spell',
    range: 3,
    cast: 1.0,
    cd: 5.0,
    cost: 20,
    gain: 0,
    type: 'SINGLE',
    power: 100,
    color: '#ff0000'
};

describe('Task A2b & T1 — SpriteUnitRenderer & Coordinate Alignment Test Suite', () => {

    describe('1. selectSpriteFrame Animation Priority', () => {
        let agent: Agent;

        beforeEach(() => {
            agent = new Agent('agent_p', Team.BLUE, 0, 0, dummyConfig);
            agent.role = Role.MAGE;
            agent.skills = [dummySkill];
        });

        it('Priority 1: Death takes precedence over all other animation states', () => {
            // Set all conflicting states active
            agent.hitFlashTimer = 0.15;
            agent.castingSkillIdx = 0;
            agent.castTimer = 0.5;
            agent.isMoving = true;
            agent.hp = 0;
            agent.deathTimer = 0.375; // 50% of 0.75s animation (6 frames @ 8 fps)

            const result = selectSpriteFrame(agent, 0);
            expect(result.anim).toBe('death');
            expect(result.frameIndex).toBe(3); // Frame 3 of 6
        });

        it('Death animation clamps at the final frame when finished', () => {
            agent.hp = 0;
            agent.deathTimer = 2.0; // exceeds DEATH_ANIM_DURATION (1.2s)

            const result = selectSpriteFrame(agent, 0);
            expect(result.anim).toBe('death');
            expect(result.frameIndex).toBe(5); // last frame of 6
            expect(result.isDeathFinished).toBe(true);
        });

        it('Priority 2: Hit reaction takes precedence over cast, attack, walk and idle', () => {
            agent.hp = 100;
            agent.hitFlashTimer = 0.12;
            agent.castingSkillIdx = 0;
            agent.isMoving = true;

            const result = selectSpriteFrame(agent, 0);
            expect(result.anim).toBe('hit');
            expect(result.frameIndex).toBeGreaterThanOrEqual(0);
            expect(result.frameIndex).toBeLessThanOrEqual(2);
        });

        it('Priority 3: Cast / Attack takes precedence over move and idle', () => {
            agent.hp = 100;
            agent.hitFlashTimer = 0;
            agent.castingSkillIdx = 0;
            agent.castTimer = 0.5; // halfway through 1.0s cast
            agent.isMoving = true;

            const result = selectSpriteFrame(agent, 0);
            expect(result.anim).toBe('cast');
            expect(result.frameIndex).toBe(3); // 50% cast progress -> frame 3
        });

        it('Cast falls back to attack when unit lacks cast animation', () => {
            agent.hp = 100;
            agent.hitFlashTimer = 0;
            agent.role = Role.WARRIOR; // Warrior does not have cast animation in KayKit
            agent.castingSkillIdx = 0;
            agent.castTimer = 0.5;

            const result = selectSpriteFrame(agent, 0, false);
            expect(result.anim).toBe('attack');
            expect(result.frameIndex).toBe(3);
        });

        it('Priority 4: Walk takes precedence over idle', () => {
            agent.hp = 100;
            agent.hitFlashTimer = 0;
            agent.castingSkillIdx = -1;
            agent.isMoving = true;

            const result = selectSpriteFrame(agent, 0.5);
            expect(result.anim).toBe('walk');
            expect(result.frameIndex).toBeGreaterThanOrEqual(0);
            expect(result.frameIndex).toBeLessThanOrEqual(5);
        });

        it('Priority 5: Idle when no active action or movement', () => {
            agent.hp = 100;
            agent.hitFlashTimer = 0;
            agent.castingSkillIdx = -1;
            agent.isMoving = false;
            agent.actionState = ActionState.IDLE;

            const result = selectSpriteFrame(agent, 0.2);
            expect(result.anim).toBe('idle');
            expect(result.frameIndex).toBeGreaterThanOrEqual(0);
            expect(result.frameIndex).toBeLessThanOrEqual(5);
        });
    });

    describe('2. Direction Selection & Hysteresis', () => {
        let agent: Agent;
        let target: Agent;

        beforeEach(() => {
            agent = new Agent('agent_dir', Team.BLUE, 0, 0, dummyConfig);
            target = new Agent('target_dir', Team.RED, 1, 0, dummyConfig);
        });

        it('faces SE when facing right and target is south (py > agent.py)', () => {
            agent.facing = 1;
            target.py = agent.py + 40;
            agent.target = target;

            const dir = selectSpriteDirection(agent, 0);
            expect(dir).toBe('SE');
        });

        it('faces NE when facing right and target is north (py < agent.py)', () => {
            agent.facing = 1;
            target.py = agent.py - 40;
            agent.target = target;

            const dir = selectSpriteDirection(agent, 0.5);
            expect(dir).toBe('NE');
        });

        it('faces SW when facing left and target is south (py > agent.py)', () => {
            agent.facing = -1;
            target.py = agent.py + 40;
            agent.target = target;

            const dir = selectSpriteDirection(agent, 1.0);
            expect(dir).toBe('SW');
        });

        it('faces NW when facing left and target is north (py < agent.py)', () => {
            agent.facing = -1;
            target.py = agent.py - 40;
            agent.target = target;

            const dir = selectSpriteDirection(agent, 1.5);
            expect(dir).toBe('NW');
        });

        it('applies hysteresis debounce for subtle vertical changes within threshold', () => {
            agent.facing = 1;
            target.py = agent.py + 40;
            agent.target = target;
            const initialDir = selectSpriteDirection(agent, 2.0);
            expect(initialDir).toBe('SE');

            // Move target very slightly above agent, within 6px threshold
            target.py = agent.py - 2;
            const debouncedDir = selectSpriteDirection(agent, 2.05); // only 50ms later
            expect(debouncedDir).toBe('SE'); // preserves SE
        });
    });

    describe('3. Unit Desync & Atlas Integration', () => {
        it('getAgentPhaseOffset yields different values for different IDs', () => {
            const p1 = getAgentPhaseOffset('unit_A');
            const p2 = getAgentPhaseOffset('unit_B');
            expect(p1).not.toBe(p2);
        });

        it('SpriteUnitRenderer canRender respects atlas availability', () => {
            const agent = new Agent('agent_render', Team.BLUE, 0, 0, dummyConfig);
            agent.role = Role.TANK;

            const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;
            spriteAtlasStore.setManifestForTesting(manifest);

            // Without loaded bitmap in Node, canRender checks readiness
            expect(SpriteUnitRenderer.canRender(agent)).toBe(false);
        });
    });

    describe('4. UnitDeathPainter Sprite & Fallback Integration (Task A2c)', () => {
        it('returns immediately when agent is fullyDead', () => {
            const agent = new Agent('dead_agent', Team.BLUE, 0, 0, dummyConfig);
            agent.hp = 0;
            agent.fullyDead = true;

            const mockCtx = {
                save: () => {},
                restore: () => {},
                drawImage: () => {}
            } as unknown as CanvasRenderingContext2D;

            // Should not throw or perform operations
            expect(() => {
                UnitDeathPainter.draw(mockCtx, agent, 0, 0, 1.0, 0);
            }).not.toThrow();
        });
    });

    describe('5. Task T1 — Shield Bounds, Foot Ground Alignment & Death Anchor', () => {
        const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;

        it('all 10 units x all anims x 4 directions satisfy screen width <= 2*SHIELD_VISUAL.radius and height <= SHIELD_VISUAL.height', () => {
            const refHeight = manifest.referenceHeightPx || UNIT_SPRITE.referenceHeightPx;
            const screenScale = computeSpriteScreenScale(refHeight, 1.0, UNIT_SPRITE.targetHeightCanvasUnits);
            const maxAllowedWidth = 2 * SHIELD_VISUAL.radius;
            const maxAllowedHeight = SHIELD_VISUAL.height;

            let observedMaxW = 0;
            let observedMaxH = 0;

            for (const unitDef of Object.values(manifest.units)) {
                for (const animDef of Object.values(unitDef.anims)) {
                    for (const frames of Object.values(animDef.frames)) {
                        for (const frame of frames) {
                            const screenW = frame.w * screenScale;
                            const screenH = frame.h * screenScale;
                            if (screenW > observedMaxW) observedMaxW = screenW;
                            if (screenH > observedMaxH) observedMaxH = screenH;
                            expect(screenW).toBeLessThanOrEqual(maxAllowedWidth);
                            expect(screenH).toBeLessThanOrEqual(maxAllowedHeight);
                        }
                    }
                }
            }

            expect(observedMaxW).toBeGreaterThan(0);
            expect(observedMaxH).toBeGreaterThan(0);
        });

        it('compensates UNIT_SCALE so reference sprite height equals targetHeightCanvasUnits on screen', () => {
            const refHeight = UNIT_SPRITE.referenceHeightPx;
            const localScale = computeSpriteLocalScale(refHeight, 1.0);
            const renderedCanvasUnits = refHeight * localScale * UNIT_SCALE;
            expect(renderedCanvasUnits).toBeCloseTo(UNIT_SPRITE.targetHeightCanvasUnits, 5);
        });

        it('aligns foot world Y exactly to surfaceY when drawn from getVisualBodyCenterY', () => {
            const surfaceY = 240;
            const z = 0;
            const bodyCenterY = VisualMath.getVisualBodyCenterY(surfaceY, z);

            // A frame whose foot anchor is at (0, 0) in sprite space has oy = -frame.h
            const dummyFrame = { w: 100, h: 158.3, ox: -50, oy: -158.3 };
            const rect = computeSpriteDrawRect(dummyFrame, 158.3, 1.0, 0);

            // In UnitBodyPainter: translate(px, bodyCenterY) -> scale(UNIT_SCALE, UNIT_SCALE) -> draw at rect.dy + rect.dh
            const footLocalY = rect.dy + rect.dh;
            const footWorldY = bodyCenterY + footLocalY * UNIT_SCALE;

            expect(footWorldY).toBeCloseTo(surfaceY, 5);
            expect(UNIT_SPRITE.footOffsetLocal * UNIT_SCALE).toBeCloseTo(UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET, 5);
        });

        it('UnitDeathPainter sprite branch applies identical bodyY + UNIT_SCALE transform as UnitBodyPainter', () => {
            const agent = new Agent('dead_sprite_agent', Team.BLUE, 0, 0, dummyConfig);
            agent.role = Role.WARRIOR;
            agent.hp = 0;
            agent.deathTimer = 0.2; // before fadeStart, so sinkY = 0

            spriteAtlasStore.setManifestForTesting(manifest);
            // Mock a ready atlas entry so canRender returns true
            const fakeCanvas = {} as unknown as CanvasImageSource;
            (spriteAtlasStore as unknown as { atlases: Map<string, unknown> }).atlases.set('BLUE:WARRIOR:MALE', {
                normalMips: new Map([[1.0, fakeCanvas], [0.5, fakeCanvas], [0.25, fakeCanvas]]),
                silhouetteMips: new Map([[1.0, fakeCanvas], [0.5, fakeCanvas], [0.25, fakeCanvas]])
            });

            const translations: { x: number; y: number }[] = [];
            const scales: { sx: number; sy: number }[] = [];
            let drawn = false;

            const mockCtx = {
                save: () => {},
                restore: () => {},
                translate: (x: number, y: number) => translations.push({ x, y }),
                scale: (sx: number, sy: number) => scales.push({ sx, sy }),
                drawImage: () => { drawn = true; },
                globalAlpha: 1
            } as unknown as CanvasRenderingContext2D;

            const surfaceY = 100;
            UnitDeathPainter.draw(mockCtx, agent, 0, surfaceY, 1.0, 0);

            expect(drawn).toBe(true);
            const expectedBodyY = VisualMath.getVisualBodyCenterY(surfaceY, agent.physics.z);
            expect(translations[0]).toEqual({ x: 0, y: expectedBodyY });
            expect(scales[0]).toEqual({ sx: UNIT_SCALE, sy: UNIT_SCALE });

            // Clean up fake atlas entry
            (spriteAtlasStore as unknown as { atlases: Map<string, unknown> }).atlases.delete('BLUE:WARRIOR:MALE');
        });
    });
});
