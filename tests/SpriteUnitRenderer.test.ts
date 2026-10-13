import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { Team, Role, AnimState, ActionState, Skill } from '../types';
import { MapConfig } from '../engine/utils';
import {
    selectSpriteFrame,
    selectSpriteDirection,
    getAgentPhaseOffset
} from '../data/units/appearance/selectSpriteFrame';
import { SpriteUnitRenderer } from '../engine/renderers/units/factions/SpriteUnitRenderer';
import { spriteAtlasStore, UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';
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

describe('Task A2b — SpriteUnitRenderer & selectSpriteFrame Test Suite', () => {

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
});
