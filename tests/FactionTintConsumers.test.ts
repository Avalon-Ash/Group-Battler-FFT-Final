import { describe, it, expect, beforeEach } from 'vitest';
import { Team, Role } from '../types';
import { spriteAtlasStore, UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';
import { SpriteUnitRenderer, createResolvedSpriteFrame } from '../engine/renderers/units/factions/SpriteUnitRenderer';
import { Agent } from '../engine/core/Agent';
import { MapConfig } from '../engine/utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dummyConfig: MapConfig = {
    w: 10,
    h: 10,
    offsetX: 0,
    offsetY: 0,
    layout: 'FLAT',
};

describe('faction tint consumers', () => {
    beforeEach(() => {
        const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;
        spriteAtlasStore.setManifestForTesting(manifest);
    });

    it('SpriteAtlasStore 支援變體鍵查詢 getUnitDef 與 getFrame', () => {
        const baseDef = spriteAtlasStore.getUnitDef('BLUE:MAGE:MALE');
        expect(baseDef).not.toBeNull();

        const variantDef = spriteAtlasStore.getUnitDef('BLUE:MAGE:MALE@135');
        expect(variantDef).toBe(baseDef);

        const frameBase = spriteAtlasStore.getFrame('BLUE:MAGE:MALE', 'idle', 'SE', 0);
        const frameVariant = spriteAtlasStore.getFrame('BLUE:MAGE:MALE@135', 'idle', 'SE', 0);
        expect(frameBase).not.toBeNull();
        expect(frameVariant).toEqual(frameBase);
    });

    it('SpriteAtlasStore syncRoster 與 prefetchRoster 支援 look 變體鍵', () => {
        const store = spriteAtlasStore as unknown as { wantedKeys: Set<string> };
        spriteAtlasStore.syncRoster([
            { team: Team.BLUE, role: Role.TANK, bodyType: 'MALE', look: { skinTeam: Team.BLUE, hue: 135 } },
            { team: Team.RED, role: Role.MAGE, bodyType: 'FEMALE', look: { skinTeam: Team.RED, hue: null } },
        ]);
        expect(store.wantedKeys.has('BLUE:TANK:MALE@135')).toBe(true);
        expect(store.wantedKeys.has('RED:MAGE:FEMALE')).toBe(true);

        spriteAtlasStore.prefetchRoster([
            { team: Team.BLUE, role: Role.RANGER, bodyType: 'MALE', look: { skinTeam: Team.BLUE, hue: 285 } },
        ]);
        expect(store.wantedKeys.has('BLUE:RANGER:MALE@285')).toBe(true);
    });

    it('SpriteUnitRenderer resolveFrame 與 canRender 支援帶 hue 的 agent', () => {
        const agent = new Agent('agent_tint_test', Team.BLUE, 0, 0, dummyConfig);
        agent.role = Role.TANK;
        agent.look = { skinTeam: Team.BLUE, hue: 135 };

        // Node 環境無真實點陣，canRender 依變體鍵檢查 isReady
        expect(SpriteUnitRenderer.canRender(agent)).toBe(false);

        const out = createResolvedSpriteFrame();
        const resolved = SpriteUnitRenderer.resolveFrame(agent, 0, out);
        expect(resolved).toBe(true);
        expect(out.manifestKey).toBe('BLUE:TANK:MALE@135');

        // hue 為 null 時維持原本基底鍵
        agent.look = { skinTeam: Team.BLUE, hue: null };
        const outPlain = createResolvedSpriteFrame();
        expect(SpriteUnitRenderer.resolveFrame(agent, 0, outPlain)).toBe(true);
        expect(outPlain.manifestKey).toBe('BLUE:TANK:MALE');
    });
});
