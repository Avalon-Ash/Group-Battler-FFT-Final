// 陣營皮膚表（data/units/factionSkin.ts）守門測試：
// 1. 每個 Team × Role × BodyType 都有完整皮膚；2. 每個貼圖槽都能解析（資產或程序化退路）；
// 3. public/assets/factions/manifest.json 合法且登記的檔案存在；4. 單位／棋座繪製器不再自行判斷陣營。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Team, Role, BodyTypeId } from '../types';
import { BODY_TYPE_PROFILE } from '../data/units/appearance/bodyTypes';
import {
    FACTION_SKINS,
    FACTION_KEY,
    FACTION_TEXTURE_SLOTS,
    FACTION_TEXTURE_SPEC,
    FACTION_ASSET_ROOT,
    FactionAssetManifest,
    FactionSkin,
    getFactionSkin,
    getFactionSkinByAtlasKey,
    resolveTextureSlot,
    textureSlotKeys,
    isValidTextureSlotKey,
} from '../data/units/factionSkin';

const ROOT = join(__dirname, '..');
const TEAMS = [Team.BLUE, Team.RED];
const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
const BODIES = Object.keys(BODY_TYPE_PROFILE) as BodyTypeId[];

function collectLeaves(value: unknown, path: string, out: { path: string; value: unknown }[]): void {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const [k, v] of Object.entries(value)) collectLeaves(v, `${path}.${k}`, out);
    } else {
        out.push({ path, value });
    }
}

describe('FACTION_SKINS completeness', () => {
    it('every Team x Role x BodyType has a complete skin', () => {
        for (const team of TEAMS) {
            for (const role of ROLES) {
                for (const body of BODIES) {
                    const skin = FACTION_SKINS[FACTION_KEY[team]][role][body];
                    expect(skin, `${team}:${role}:${body}`).toBeDefined();
                    expect(skin.team).toBe(team);
                    const leaves: { path: string; value: unknown }[] = [];
                    collectLeaves(skin, `${FACTION_KEY[team]}:${role}:${body}`, leaves);
                    for (const leaf of leaves) {
                        if (leaf.path.endsWith('.tint')) continue; // null = 不染色
                        expect(leaf.value, leaf.path).not.toBeUndefined();
                        if (typeof leaf.value === 'string') expect(leaf.value.length, leaf.path).toBeGreaterThan(0);
                        if (typeof leaf.value === 'number') expect(Number.isFinite(leaf.value), leaf.path).toBe(true);
                        if (Array.isArray(leaf.value)) expect(leaf.value.length, leaf.path).toBeGreaterThan(0);
                    }
                    expect(skin.pedestal.radius).toBeGreaterThan(0);
                    expect(skin.sprite.atlasKey).toBe(`${FACTION_KEY[team]}:${role}:${body}`);
                    expect(getFactionSkinByAtlasKey(skin.sprite.atlasKey)).toBe(skin);
                }
            }
        }
    });

    it('factions use distinct pedestal and death styles (readability)', () => {
        const blue = getFactionSkin(Team.BLUE);
        const red = getFactionSkin(Team.RED);
        expect(blue.pedestal.style).not.toBe(red.pedestal.style);
        expect(blue.projection.trailColor).not.toBe(red.projection.trailColor);
        expect(blue.death.style).not.toBe(red.death.style);
        expect(blue.pedestal.rim).not.toBe(red.pedestal.rim);
    });

    it('getFactionSkin never throws and falls back for unknown keys', () => {
        const unknownTeam = 99 as unknown as Team;
        const unknownRole = 'BARD' as unknown as Role;
        const unknownBody = 'GIANT' as unknown as BodyTypeId;
        expect(getFactionSkin(unknownTeam).key).toBe('BLUE');
        expect(getFactionSkin(Team.RED, unknownRole).key).toBe('RED');
        expect(getFactionSkin(Team.RED, Role.MAGE, unknownBody).sprite.atlasKey).toBe('RED:MAGE:MALE');
        expect(getFactionSkinByAtlasKey('nonsense')).toBeNull();
    });
});

describe('Faction texture slots', () => {
    it('every slot resolves to procedural fallback without a manifest', () => {
        for (const team of TEAMS) for (const role of ROLES) for (const body of BODIES) {
            for (const slot of FACTION_TEXTURE_SLOTS) {
                expect(resolveTextureSlot(null, team, slot, role, body)).toEqual({ kind: 'procedural' });
            }
        }
    });

    it('every slot resolves to an asset when registered, most specific key first', () => {
        for (const slot of FACTION_TEXTURE_SLOTS) {
            const manifest: FactionAssetManifest = {
                version: 1,
                factions: {
                    RED: {
                        [slot]: `red/${slot}.png`,
                        [`${slot}:MAGE`]: `red/${slot}_mage.png`,
                        [`${slot}:MAGE:FEMALE`]: `red/${slot}_mage_female.png`,
                    },
                },
            };
            expect(resolveTextureSlot(manifest, Team.RED, slot, Role.TANK, 'MALE'))
                .toEqual({ kind: 'asset', key: slot, path: `${FACTION_ASSET_ROOT}red/${slot}.png` });
            expect(resolveTextureSlot(manifest, Team.RED, slot, Role.MAGE, 'MALE'))
                .toEqual({ kind: 'asset', key: `${slot}:MAGE`, path: `${FACTION_ASSET_ROOT}red/${slot}_mage.png` });
            expect(resolveTextureSlot(manifest, Team.RED, slot, Role.MAGE, 'FEMALE'))
                .toEqual({ kind: 'asset', key: `${slot}:MAGE:FEMALE`, path: `${FACTION_ASSET_ROOT}red/${slot}_mage_female.png` });
            // 其他陣營不受影響
            expect(resolveTextureSlot(manifest, Team.BLUE, slot, Role.MAGE, 'MALE')).toEqual({ kind: 'procedural' });
            expect(FACTION_TEXTURE_SPEC[slot].sizePx).toBeGreaterThan(0);
        }
    });

    it('slot key grammar', () => {
        expect(textureSlotKeys('emblem', Role.TANK, 'MALE')).toEqual(['emblem:TANK:MALE', 'emblem:TANK', 'emblem']);
        expect(isValidTextureSlotKey('classIcon:RANGER')).toBe(true);
        expect(isValidTextureSlotKey('pedestalRim:TANK:FEMALE')).toBe(true);
        expect(isValidTextureSlotKey('classicon')).toBe(false);
        expect(isValidTextureSlotKey('emblem:BARD')).toBe(false);
        expect(isValidTextureSlotKey('emblem:TANK:MALE:X')).toBe(false);
    });

    it('shipped manifest is valid and every listed file exists', () => {
        const dir = join(ROOT, 'public', FACTION_ASSET_ROOT);
        const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf-8')) as FactionAssetManifest;
        expect(manifest.version).toBe(1);
        for (const [teamKey, entries] of Object.entries(manifest.factions)) {
            expect(['BLUE', 'RED']).toContain(teamKey);
            for (const [key, file] of Object.entries(entries ?? {})) {
                expect(isValidTextureSlotKey(key), `${teamKey}.${key}`).toBe(true);
                expect(existsSync(join(dir, file)), `${teamKey}.${key} -> ${file}`).toBe(true);
            }
        }
    });
});

describe('Renderers read faction visuals only from FACTION_SKINS', () => {
    const FILES = [
        'engine/sprites.ts',
        'engine/graphics/UnitFactory.ts',
        'engine/graphics/units/ImperialTokenFactory.ts',
        'engine/graphics/units/CovenantTokenFactory.ts',
        'engine/graphics/units/PedestalGeometry.ts',
        'engine/renderers/units/painters/UnitShadowPainter.ts',
        'engine/renderers/units/painters/UnitBodyPainter.ts',
        'engine/renderers/units/painters/UnitDeathPainter.ts',
        'engine/renderers/status/painters/ShieldPainter.ts',
        'engine/renderers/hud/BarPainter.ts',
        'engine/systems/visuals/effects/UnitShatter.ts',
    ];
    const PEDESTAL_FILES = FILES.filter((f) => f.startsWith('engine/graphics/units/'));

    it('no team branching or team palette lookups', () => {
        for (const f of FILES) {
            const src = readFileSync(join(ROOT, f), 'utf-8');
            expect(src, f).not.toMatch(/Team\.(BLUE|RED)|\.team\s*===|PALETTE\.TEAMS|HUD_COLORS\.HP|FACTION_VISUALS|UNIT_APPEARANCE/);
        }
    });

    it('pedestal painters contain no color literals', () => {
        for (const f of PEDESTAL_FILES) {
            const src = readFileSync(join(ROOT, f), 'utf-8');
            expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
        }
    });

    it('skin type stays exported for painters', () => {
        const skin: FactionSkin = getFactionSkin(Team.BLUE);
        expect(skin.key).toBe('BLUE');
    });
});
