import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpriteAtlasStore, type UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';
import { Team, Role } from '../types';

afterEach(() => vi.unstubAllGlobals());

describe('delivery atlas scale', () => {
    it.each([undefined, 1, 0.5])('preserves mip and logical frame geometry at atlasScale %s', async atlasScale => {
        const frame = { x: 23, y: 37, w: 91, h: 153, ox: -47, oy: -162.32 };
        const manifest: UnitManifest = {
            version: 1, cellPx: 448, anchor: { x: 224, y: 280.32 },
            pxPerWorldUnit: 71.111, elevationDeg: 30, directions: ['SE'],
            referenceHeightPx: 158.3, atlasScale,
            units: { 'BLUE:WARRIOR:MALE': { file: 'test.webp', atlas: { w: 2048, h: 2333 },
                idleHeightPx: 158.3, anims: { idle: { fps: 6, loop: true, frames: { SE: [frame] } } } } }
        };
        const drawImage = vi.fn();
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest })));
        vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
            getContext: () => ({ drawImage, fillRect: vi.fn() }) }) });
        vi.stubGlobal('Image', class {
            naturalWidth = Math.round(2048 * (atlasScale ?? 1));
            naturalHeight = Math.round(2333 * (atlasScale ?? 1));
            onload?: () => void;
            set src(_value: string) { queueMicrotask(() => this.onload?.()); }
        });
        const store = new SpriteAtlasStore();
        await vi.waitFor(() => expect(store.getManifest()).not.toBeNull());
        await store.loadAtlas('BLUE:WARRIOR:MALE');
        expect(store.getAtlas('BLUE:WARRIOR:MALE')).toMatchObject({ width: 1024, height: 1167 });
        expect(store.getSilhouette('BLUE:WARRIOR:MALE')).toMatchObject({ width: 1024, height: 1167 });
        expect(store.getFrame('BLUE:WARRIOR:MALE', 'idle', 'SE', 0)).toEqual(frame);
        expect(drawImage.mock.calls[0].slice(1)).toEqual(atlasScale === 0.5 ? [0, 0] : [0, 0, 1024, 1167]);
    });
});

describe('roster resource lifetime', () => {
    const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
    function setup() {
        const requests: ControlledImage[] = [];
        class ControlledImage {
            naturalWidth = 1024;
            naturalHeight = 600;
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_value: string) { requests.push(this); }
        }
        vi.stubGlobal('window', {});
        vi.stubGlobal('Image', ControlledImage);
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
            atlasScale: 0.5,
            units: Object.fromEntries([Role.TANK, Role.WARRIOR, Role.MAGE].map(role =>
                [`BLUE:${role}:MALE`, { file: `${role}.webp` }]))
        }) })));
        vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
            getContext: () => ({ drawImage: vi.fn(), fillRect: vi.fn() }) }) });
        return { requests, store: new SpriteAtlasStore() };
    }
    const roster = [Role.TANK, Role.WARRIOR, Role.MAGE].map(role => ({ team: Team.BLUE, role }));
    const ready = () => (window as unknown as { __UNIT_ASSETS_READY__: boolean }).__UNIT_ASSETS_READY__;

    it('loads only roster keys, limits concurrency, releases canvases and reloads on return', async () => {
        const { store, requests } = setup();
        await store.readyPromise;
        expect(requests).toHaveLength(0);
        store.syncRoster(roster);
        await tick();
        expect(requests).toHaveLength(2);
        expect(ready()).toBe(false);
        requests[0].onload!();
        await tick();
        expect(requests).toHaveLength(3);
        requests[1].onload!(); requests[2].onload!();
        await store.readyPromise;
        expect(ready()).toBe(true);
        const atlas = store.getAtlas('BLUE:TANK:MALE');
        const silhouette = store.getSilhouette('BLUE:TANK:MALE');
        const released = vi.fn();
        store.onRelease(released);
        store.syncRoster([roster[2]]);
        expect(atlas).toMatchObject({ width: 0, height: 0 });
        expect(silhouette).toMatchObject({ width: 0, height: 0 });
        expect(store.getAtlas('BLUE:TANK:MALE')).toBeNull();
        expect(released.mock.calls.map(c => c[0])).toEqual(['BLUE:TANK:MALE', 'BLUE:WARRIOR:MALE']);
        store.syncRoster([roster[0]]);
        await tick();
        expect(requests).toHaveLength(4);
        expect(ready()).toBe(false);
        requests[3].onload!();
        await store.readyPromise;
        expect(ready()).toBe(true);
    });

    it('discards obsolete in-flight images and queued keys after a roster change', async () => {
        const { store, requests } = setup();
        store.syncRoster(roster);
        await tick();
        expect(requests).toHaveLength(2);
        store.syncRoster([]);
        requests[0].onload!(); requests[1].onload!();
        await store.readyPromise;
        expect(requests).toHaveLength(2);
        for (const agent of roster) expect(store.getAtlas(`BLUE:${agent.role}:MALE`)).toBeNull();
        expect(ready()).toBe(true);
    });

    it('keeps readiness false on failure without retrying every frame', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const { store, requests } = setup();
            store.syncRoster([roster[0]]);
            await tick();
            requests[0].onerror!();
            await store.readyPromise;
            store.syncRoster([roster[0]]);
            await tick();
            expect(requests).toHaveLength(1);
            expect(ready()).toBe(false);
            store.syncRoster([]); store.syncRoster([roster[0]]);
            await tick();
            expect(requests).toHaveLength(2);
            requests[1].onload!();
            await store.readyPromise;
            expect(ready()).toBe(true);
        } finally { warn.mockRestore(); }
    });
});

describe('ImageBitmap decode path', () => {
    it('bakes from a fetched ImageBitmap and closes it, also when the roster moved on', async () => {
        const manifest: UnitManifest = {
            version: 1, cellPx: 448, anchor: { x: 224, y: 280.32 },
            pxPerWorldUnit: 71.111, elevationDeg: 30, directions: ['SE'],
            referenceHeightPx: 158.3, atlasScale: 0.5,
            units: {
                'BLUE:WARRIOR:MALE': { file: 'a.webp', atlas: { w: 2048, h: 2333 }, idleHeightPx: 158.3, anims: {} },
                'BLUE:WARRIOR:FEMALE': { file: 'b.webp', atlas: { w: 2048, h: 2333 }, idleHeightPx: 158.3, anims: {} },
            }
        };
        const closed: string[] = [];
        let release: (() => void) | null = null;
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('manifest.json')
            ? { ok: true, json: async () => manifest }
            : { ok: true, blob: async () => ({ url }) }));
        vi.stubGlobal('createImageBitmap', vi.fn(async (blob: { url: string }) => {
            if (blob.url.endsWith('b.webp')) await new Promise<void>(r => { release = r; });
            return { width: 1024, height: 1167, close: () => closed.push(blob.url) };
        }));
        vi.stubGlobal('Image', class {});
        vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
            getContext: () => ({ drawImage: vi.fn(), fillRect: vi.fn() }) }) });
        const store = new SpriteAtlasStore();
        await vi.waitFor(() => expect(store.getManifest()).not.toBeNull());
        store.syncRoster([{ team: Team.BLUE, role: Role.WARRIOR, bodyType: 'MALE' }]);
        await vi.waitFor(() => expect(store.getAtlas('BLUE:WARRIOR:MALE')).toMatchObject({ width: 1024, height: 1167 }));
        expect(closed.some(u => u.endsWith('a.webp'))).toBe(true);

        // 解碼途中陣容換走：不烘焙、不留快取，點陣仍要 close
        store.syncRoster([{ team: Team.BLUE, role: Role.WARRIOR, bodyType: 'FEMALE' }]);
        await vi.waitFor(() => expect(release).not.toBeNull());
        store.syncRoster([{ team: Team.BLUE, role: Role.WARRIOR, bodyType: 'MALE' }]);
        release!();
        await vi.waitFor(() => expect(closed.some(u => u.endsWith('b.webp'))).toBe(true));
        expect(store.getAtlas('BLUE:WARRIOR:FEMALE')).toBeNull();
    });
});
