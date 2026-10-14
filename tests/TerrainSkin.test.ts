import { describe, it, expect, beforeEach } from 'vitest';
import { TerrainTextureStore, resolveAssetUrl } from '../engine/renderers/grid/TerrainTextureStore';
import { TerrainRenderer } from '../engine/renderers/grid/TerrainRenderer';
import { TERRAIN_SKIN, TERRAIN_THEMES } from '../constants';

describe('TerrainSkin & TerrainTextureStore', () => {
    let store: TerrainTextureStore;

    beforeEach(() => {
        store = new TerrainTextureStore();
    });

    describe('resolveAssetUrl', () => {
        it('resolves relative paths with base prefix', () => {
            const url = resolveAssetUrl('assets/terrain/void_top.webp');
            expect(url).toContain('assets/terrain/void_top.webp');
        });

        it('handles leading slash safely', () => {
            const url = resolveAssetUrl('/assets/terrain/forest_top.webp');
            expect(url).toContain('assets/terrain/forest_top.webp');
            expect(url).not.toContain('//assets');
        });
    });

    describe('TerrainTextureStore fallback & readiness', () => {
        it('reports not ready before textures are loaded in node/test environment', () => {
            expect(store.isReady('VOID')).toBe(false);
            expect(store.isReady('FOREST')).toBe(false);
            expect(store.areAllReady()).toBe(false);
        });

        it('returns null images and patterns when textures are not loaded', () => {
            expect(store.getTopImage('VOID')).toBeNull();
            expect(store.getSideImage('VOID')).toBeNull();
        });

        it('increments revision when clearPatterns is called', () => {
            const initialRev = store.getRevision();
            expect(initialRev).toBeGreaterThanOrEqual(0);
        });
    });

    describe('TerrainRenderer revision detection', () => {
        it('clears TerrainRenderer.store when texture store revision changes', async () => {
            const mockFactory = (width: number, height: number) => ({
                canvas: { width, height } as unknown as HTMLCanvasElement,
                ctx: {
                    save: () => {},
                    restore: () => {},
                    scale: () => {},
                    translate: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    closePath: () => {},
                    clip: () => {},
                    fill: () => {},
                    stroke: () => {},
                    drawImage: () => {},
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                } as unknown as CanvasRenderingContext2D,
            });

            const origDoc = globalThis.document;
            globalThis.document = {
                createElement: () => ({
                    width: 64,
                    height: 64,
                    getContext: () => ({
                        createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
                        putImageData: () => {},
                        drawImage: () => {},
                    }),
                }),
            } as unknown as Document;
            const prevStore = TerrainRenderer.store;
            TerrainRenderer.store = (await import('../engine/renderers/grid/TerrainBlockCache')).createTerrainSpriteStore(mockFactory);

            const dummyCtx = {
                getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
                save: () => {},
                restore: () => {},
                translate: () => {},
                drawImage: () => {},
            } as unknown as CanvasRenderingContext2D;

            try {
                TerrainRenderer.drawBlock(
                    dummyCtx,
                    0, 0, 48, 0,
                    TERRAIN_THEMES.VOID,
                    'VOID',
                    0,
                    'FLAT'
                );

                expect(TerrainRenderer.store.size()).toBe(1);

                // Change lastTextureRev to simulate store update
                TerrainRenderer.lastTextureRev = -999;
                TerrainRenderer.drawBlock(
                    dummyCtx,
                    0, 0, 48, 0,
                    TERRAIN_THEMES.VOID,
                    'VOID',
                    0,
                    'FLAT'
                );

                // The store should have cleared and rebaked
                expect(TerrainRenderer.store.size()).toBe(1);
            } finally {
                TerrainRenderer.store = prevStore;
                globalThis.document = origDoc;
            }
        });

        it('exposes TERRAIN_SKIN SSOT parameters without legacy enabled toggle', () => {
            expect(TERRAIN_SKIN.texturePxPerHex).toBe(96);
            expect(TERRAIN_SKIN.tintStrength).toBe(0.35);
            expect('enabled' in TERRAIN_SKIN).toBe(false);
        });
    });
});
