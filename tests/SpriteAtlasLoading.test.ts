import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpriteAtlasStore, type UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';

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
