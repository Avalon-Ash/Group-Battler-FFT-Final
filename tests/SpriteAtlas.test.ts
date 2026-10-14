import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Agent } from '../engine/core/Agent';
import { Team, Role } from '../types';
import { MapConfig } from '../engine/utils';
import {
    BODY_TYPE_PROFILE,
    BODY_TYPE_SPAWN,
    pickBodyType,
    resolveBodyType
} from '../data/units/appearance/bodyTypes';
import {
    SPRITE_APPEARANCE,
    lookupSpriteAppearance,
    formatTeamName,
    formatRoleName
} from '../data/units/appearance/sprite';
import {
    selectMipLevel,
    UnitManifest
} from '../engine/renderers/units/SpriteAtlasStore';
import { UNIT_RENDER_MODE, UNIT_SPRITE } from '../constants';

const dummyConfig: MapConfig = {
    w: 10,
    h: 10,
    offsetX: 0,
    offsetY: 0,
    layout: 'FLAT'
};

describe('Task A2a — Unit Sprite SSOT & Atlas Store Test Suite', () => {

    describe('1. Manifest & Asset Verification', () => {
        const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');

        it('manifest.json exists and is valid JSON', () => {
            expect(existsSync(manifestPath)).toBe(true);
            const content = readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(content) as UnitManifest;

            expect(manifest.version).toBe(1);
            expect(manifest.cellPx).toBe(256);
            expect(manifest.anchor.x).toBe(128);
            expect(manifest.anchor.y).toBeCloseTo(184.32, 2);
            expect(manifest.directions).toEqual(['SE', 'SW', 'NE', 'NW']);
            expect(manifest.referenceHeightPx).toBeCloseTo(158.3, 1);
            expect(Object.keys(manifest.units).length).toBe(10);
        });

        it('all 10 unit combinations exist in manifest.json', () => {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;
            const teams = ['BLUE', 'RED'];
            const roles = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT'];

            for (const team of teams) {
                for (const role of roles) {
                    const key = `${team}:${role}:MALE`;
                    expect(manifest.units[key]).toBeDefined();
                    const unit = manifest.units[key];
                    expect(unit.file).toContain('.webp');
                    expect(existsSync(join(process.cwd(), 'public', 'assets', 'units', unit.file))).toBe(true);

                    // Required animations
                    expect(unit.anims.idle).toBeDefined();
                    expect(unit.anims.walk).toBeDefined();
                    expect(unit.anims.attack).toBeDefined();
                    expect(unit.anims.hit).toBeDefined();
                    expect(unit.anims.death).toBeDefined();
                    if (role === 'MAGE' || role === 'SUPPORT') {
                        expect(unit.anims.cast).toBeDefined();
                    }
                }
            }
        });
    });

    describe('2. BodyType SSOT, pickBodyType & resolveBodyType', () => {
        it('BODY_TYPE_PROFILE has MALE enabled and FEMALE disabled with MALE fallback', () => {
            expect(BODY_TYPE_PROFILE.MALE.enabled).toBe(true);
            expect(BODY_TYPE_PROFILE.MALE.fallback).toBeNull();
            expect(BODY_TYPE_PROFILE.FEMALE.enabled).toBe(false);
            expect(BODY_TYPE_PROFILE.FEMALE.fallback).toBe('MALE');
        });

        it('resolveBodyType defaults to MALE and falls back when disabled', () => {
            expect(resolveBodyType(null)).toBe('MALE');
            expect(resolveBodyType(undefined)).toBe('MALE');
            expect(resolveBodyType({ bodyType: 'MALE' })).toBe('MALE');
            // FEMALE is disabled in production profile -> resolves to MALE
            expect(resolveBodyType({ bodyType: 'FEMALE' })).toBe('MALE');
        });

        it('resolveBodyType resolves FEMALE when custom profile has FEMALE enabled', () => {
            const testProfile = {
                MALE: { label: '男', enabled: true, heightScale: 1.0, shadowScale: 1.0, anchorYOffset: 0, fallback: null },
                FEMALE: { label: '女', enabled: true, heightScale: 1.0, shadowScale: 1.0, anchorYOffset: 0, fallback: 'MALE' as const }
            };
            expect(resolveBodyType({ bodyType: 'FEMALE' }, testProfile)).toBe('FEMALE');
        });

        it('resolveBodyType breaks cyclical fallbacks safely', () => {
            const cyclicProfile = {
                MALE: { label: '男', enabled: false, heightScale: 1.0, shadowScale: 1.0, anchorYOffset: 0, fallback: 'FEMALE' as const },
                FEMALE: { label: '女', enabled: false, heightScale: 1.0, shadowScale: 1.0, anchorYOffset: 0, fallback: 'MALE' as const }
            };
            expect(resolveBodyType({ bodyType: 'MALE' }, cyclicProfile)).toBe('MALE');
        });

        it('pickBodyType is deterministic and purely functional', () => {
            const r1 = pickBodyType('agent-1', 42);
            const r2 = pickBodyType('agent-1', 42);
            expect(r1).toBe(r2);
            expect(r1).toBe('MALE');
        });

        it('pickBodyType yields balanced distribution when both MALE and FEMALE are enabled', () => {
            const dualProfile = {
                MALE: { enabled: true },
                FEMALE: { enabled: true }
            };
            const dualWeights = {
                MALE: 1,
                FEMALE: 1
            };

            let maleCount = 0;
            let femaleCount = 0;
            const N = 1000;

            for (let i = 0; i < N; i++) {
                const picked = pickBodyType(`unit_${i}`, 99999, dualProfile, dualWeights);
                if (picked === 'MALE') maleCount++;
                else femaleCount++;
            }

            // Expect roughly 50% split (within 40% - 60%)
            const maleRatio = maleCount / N;
            expect(maleRatio).toBeGreaterThanOrEqual(0.40);
            expect(maleRatio).toBeLessThanOrEqual(0.60);
        });
    });

    describe('3. SPRITE_APPEARANCE & lookupSpriteAppearance', () => {
        it('formatTeamName and formatRoleName work symmetrically', () => {
            expect(formatTeamName(Team.BLUE)).toBe('BLUE');
            expect(formatTeamName(Team.RED)).toBe('RED');
            expect(formatRoleName(Role.TANK)).toBe('TANK');
            expect(formatRoleName(Role.WARRIOR)).toBe('WARRIOR');
            expect(formatRoleName(Role.RANGER)).toBe('RANGER');
            expect(formatRoleName(Role.MAGE)).toBe('MAGE');
            expect(formatRoleName(Role.SUPPORT)).toBe('SUPPORT');
        });

        it('lookupSpriteAppearance returns valid config for all 10 MALE units', () => {
            const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;

            const teams = [Team.BLUE, Team.RED];
            const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

            for (const t of teams) {
                for (const r of roles) {
                    const appearance = lookupSpriteAppearance(t, r, 'MALE');
                    expect(appearance).not.toBeNull();
                    expect(manifest.units[appearance!.manifestKey]).toBeDefined();
                    expect(appearance!.targetHeight).toBeGreaterThan(0);
                    expect(appearance!.shadowRadius).toBeGreaterThan(0);
                }
            }
        });

        it('lookupSpriteAppearance falls back from FEMALE to MALE when FEMALE is disabled', () => {
            const femaleConfig = lookupSpriteAppearance(Team.BLUE, Role.MAGE, 'FEMALE');
            const maleConfig = lookupSpriteAppearance(Team.BLUE, Role.MAGE, 'MALE');
            expect(femaleConfig).not.toBeNull();
            expect(femaleConfig?.manifestKey).toBe(maleConfig?.manifestKey);
            expect(femaleConfig?.manifestKey).toBe('BLUE:MAGE:MALE');
        });
    });

    describe('4. Mip Level Pure Function & Constants', () => {
        it('UNIT_RENDER_MODE and UNIT_SPRITE constants are properly defined', () => {
            expect(UNIT_RENDER_MODE).toBe('sprite');
            expect(UNIT_SPRITE.targetHeightCanvasUnits).toBe(52);
            expect(UNIT_SPRITE.referenceHeightPx).toBeCloseTo(158.3, 1);
            expect(UNIT_SPRITE.mipLevels).toEqual([1.0, 0.5, 0.25]);
        });

        it('selectMipLevel picks the smallest mip scale >= desiredScale', () => {
            expect(selectMipLevel(1.5)).toBe(1.0);
            expect(selectMipLevel(1.0)).toBe(1.0);
            expect(selectMipLevel(0.85)).toBe(1.0);
            expect(selectMipLevel(0.5)).toBe(0.5);
            expect(selectMipLevel(0.45)).toBe(0.5);
            expect(selectMipLevel(0.25)).toBe(0.25);
            expect(selectMipLevel(0.1)).toBe(0.25);
        });
    });

    describe('5. Agent Entity Pure Data & State Preservation', () => {
        it('Agent preserves bodyType in saveState and reset', () => {
            const agent = new Agent('agent_001', Team.BLUE, 0, 0, dummyConfig);
            expect(agent.bodyType).toBeUndefined();

            agent.bodyType = 'MALE';
            agent.saveState();
            expect(agent.initialState.bodyType).toBe('MALE');

            agent.bodyType = 'FEMALE';
            agent.reset(dummyConfig);
            expect(agent.bodyType).toBe('MALE');
        });
    });
});
