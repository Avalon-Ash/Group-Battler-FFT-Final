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
import { UNIT_SPRITE } from '../constants';

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
            expect(manifest.cellPx).toBe(448);
            expect(manifest.anchor.x).toBe(224);
            expect(manifest.anchor.y).toBeCloseTo(280.32, 2);
            expect(manifest.directions).toEqual(['SE', 'SW', 'NE', 'NW']);
            expect(manifest.referenceHeightPx).toBeCloseTo(158.3, 1);
            expect(Object.keys(manifest.units).length).toBe(20);
            expect(manifest.atlasScale).toBe(0.5);
        });

        it('all 20 unit combinations exist in manifest.json', () => {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;
            const teams = ['BLUE', 'RED'];
            const roles = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT'];

            for (const team of teams) {
                for (const role of roles) for (const body of ['MALE', 'FEMALE']) {
                    const key = `${team}:${role}:${body}`;
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
        it('BODY_TYPE_PROFILE enables both bodies with MALE fallback', () => {
            expect(BODY_TYPE_PROFILE.MALE.enabled).toBe(true);
            expect(BODY_TYPE_PROFILE.MALE.fallback).toBeNull();
            expect(BODY_TYPE_PROFILE.FEMALE.enabled).toBe(true);
            expect(BODY_TYPE_PROFILE.FEMALE.fallback).toBe('MALE');
        });

        it('resolveBodyType defaults to MALE and preserves enabled FEMALE', () => {
            expect(resolveBodyType(null)).toBe('MALE');
            expect(resolveBodyType(undefined)).toBe('MALE');
            expect(resolveBodyType({ bodyType: 'MALE' })).toBe('MALE');
            // Production enables both appearances without changing their geometry.
            expect(resolveBodyType({ bodyType: 'FEMALE' })).toBe('FEMALE');
            expect(resolveBodyType({ bodyType: 'FEMALE' }, { ...BODY_TYPE_PROFILE, FEMALE: { ...BODY_TYPE_PROFILE.FEMALE, enabled: false } })).toBe('MALE');
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
            expect(['MALE', 'FEMALE']).toContain(r1);
            expect(BODY_TYPE_SPAWN.weights).toEqual({ MALE: 50, FEMALE: 50 });
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

        it('lookupSpriteAppearance selects the enabled female atlas', () => {
            const femaleConfig = lookupSpriteAppearance(Team.BLUE, Role.MAGE, 'FEMALE');
            const maleConfig = lookupSpriteAppearance(Team.BLUE, Role.MAGE, 'MALE');
            expect(femaleConfig).not.toBeNull();
            expect(femaleConfig?.manifestKey).not.toBe(maleConfig?.manifestKey);
            expect(femaleConfig?.manifestKey).toBe('BLUE:MAGE:FEMALE');
        });
    });

    describe('4. Mip Level Pure Function & Constants', () => {
        it('UNIT_SPRITE constants are properly defined', () => {
            expect(UNIT_SPRITE.targetHeightCanvasUnits).toBe(59);
            expect(UNIT_SPRITE.referenceHeightPx).toBeCloseTo(158.3, 1);
            expect(UNIT_SPRITE.mipLevels).toEqual([0.5]);
        });

        it('selectMipLevel picks the smallest mip scale >= desiredScale', () => {
            expect(selectMipLevel(1.5, [1.0, 0.5, 0.25])).toBe(1.0);
            expect(selectMipLevel(1.0, [1.0, 0.5, 0.25])).toBe(1.0);
            expect(selectMipLevel(0.85, [1.0, 0.5, 0.25])).toBe(1.0);
            expect(selectMipLevel(0.5, [1.0, 0.5, 0.25])).toBe(0.5);
            expect(selectMipLevel(0.45, [1.0, 0.5, 0.25])).toBe(0.5);
            expect(selectMipLevel(0.25, [1.0, 0.5, 0.25])).toBe(0.25);
            expect(selectMipLevel(0.1, [1.0, 0.5, 0.25])).toBe(0.25);
            // 預設只烘 0.5（實際縮放約 0.37，從未選到 1.0 與 0.25）：任何縮放都回 0.5
            expect(selectMipLevel(1.5)).toBe(0.5);
            expect(selectMipLevel(0.37)).toBe(0.5);
            expect(selectMipLevel(0.1)).toBe(0.5);
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
