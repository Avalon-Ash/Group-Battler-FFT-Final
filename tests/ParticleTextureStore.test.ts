import { describe, it, expect, beforeEach } from 'vitest';
import {
    ParticleTextureStore,
    resolveAssetUrl,
    quantizeTintSize,
    quantizeTintColor
} from '../engine/renderers/ParticleTextureStore';
import { ParticlePainter } from '../engine/graphics/painters/ParticlePainter';
import { VFX_SPRITES } from '../constants';

describe('ParticleTextureStore & VFX_SPRITES', () => {
    let store: ParticleTextureStore;

    beforeEach(() => {
        store = new ParticleTextureStore();
    });

    describe('resolveAssetUrl', () => {
        it('resolves relative paths with base prefix', () => {
            const url = resolveAssetUrl('assets/vfx/light_01.png');
            expect(url).toContain('assets/vfx/light_01.png');
        });

        it('handles leading slash safely without double slashes', () => {
            const url = resolveAssetUrl('/assets/vfx/spark_01.png');
            expect(url).toContain('assets/vfx/spark_01.png');
            expect(url).not.toContain('//assets');
        });
    });

    describe('VFX_SPRITES configuration SSOT', () => {
        it('has all required particle keys and cache quantization parameters configured', () => {
            expect(VFX_SPRITES.textures.light).toBe('assets/vfx/light_01.png');
            expect(VFX_SPRITES.textures.spark).toBe('assets/vfx/spark_01.png');
            expect(VFX_SPRITES.textures.smoke).toBe('assets/vfx/smoke_01.png');
            expect(VFX_SPRITES.textures.magic).toBe('assets/vfx/magic_01.png');
            expect(VFX_SPRITES.textures.star).toBe('assets/vfx/star_01.png');
            expect(VFX_SPRITES.tintSizes).toEqual([32, 64, 128, 256]);
            expect(VFX_SPRITES.colorQuantBits).toBe(4);
            expect(VFX_SPRITES.maxTintCache).toBe(128);
            expect('enabled' in VFX_SPRITES).toBe(false);
        });

        it('quantizes targetSize to tintSizes steps and quantizes RGB colors to bounded buckets', () => {
            expect(quantizeTintSize(12)).toBe(32);
            expect(quantizeTintSize(32)).toBe(32);
            expect(quantizeTintSize(45)).toBe(64);
            expect(quantizeTintSize(100)).toBe(128);
            expect(quantizeTintSize(200)).toBe(256);
            expect(quantizeTintSize(400)).toBe(256);

            // Near-identical interpolated colors map to the same quantized key
            expect(quantizeTintColor('#ff8102', 4)).toBe(quantizeTintColor('#fd8000', 4));
            expect(quantizeTintColor('rgb(255, 129, 2)', 4)).toBe(quantizeTintColor('#fd8000', 4));
        });

        it('enforces maxTintCache capacity and evicts oldest entry without unbounded growth', () => {
            const origDoc = globalThis.document;
            globalThis.document = {
                createElement: () => ({
                    width: 0,
                    height: 0,
                    getContext: () => ({
                        drawImage: () => {},
                        fillRect: () => {},
                        globalCompositeOperation: 'source-over',
                        fillStyle: ''
                    })
                })
            } as unknown as Document;

            try {
                // Inject a fake base image so getTintedTexture executes caching logic
                (store as unknown as { baseImages: Map<string, HTMLImageElement> }).baseImages.set(
                    'light',
                    {} as HTMLImageElement
                );

                // Generate 200 distinct color/size combinations
                for (let i = 0; i < 200; i++) {
                    const r = (i * 17) % 256;
                    const g = (i * 37) % 256;
                    const b = (i * 73) % 256;
                    const size = VFX_SPRITES.tintSizes[i % VFX_SPRITES.tintSizes.length];
                    const tex = store.getTintedTexture('light', `rgb(${r},${g},${b})`, size);
                    expect(tex).not.toBeNull();
                }

                expect(store.getTintCacheSize()).toBeLessThanOrEqual(VFX_SPRITES.maxTintCache);
            } finally {
                globalThis.document = origDoc;
            }
        });
    });

    describe('ParticleTextureStore lifecycle & fallback', () => {
        it('reports not ready before textures are loaded in test environment', () => {
            expect(store.isReady('light')).toBe(false);
            expect(store.isReady('smoke')).toBe(false);
            expect(store.isReady('star')).toBe(false);
        });

        it('returns null tinted texture when base image is not ready', () => {
            expect(store.getTintedTexture('light', '#ff0000', 32)).toBeNull();
            expect(store.getTintedTexture('smoke', '#ffffff', 40)).toBeNull();
        });

        it('readyPromise resolves without crashing', async () => {
            await expect(store.readyPromise).resolves.toBeUndefined();
        });

        it('resets caches cleanly', () => {
            store.reset();
            expect(store.isReady('light')).toBe(false);
            expect(store.getTintCacheSize()).toBe(0);
        });
    });

    describe('ParticlePainter minimal solid circle fallback when texture is not ready', () => {
        const createMockCtx = () => {
            const calls: string[] = [];
            const ctx = {
                save: () => calls.push('save'),
                restore: () => calls.push('restore'),
                beginPath: () => calls.push('beginPath'),
                moveTo: () => calls.push('moveTo'),
                lineTo: () => calls.push('lineTo'),
                closePath: () => calls.push('closePath'),
                arc: () => calls.push('arc'),
                fill: () => calls.push('fill'),
                stroke: () => calls.push('stroke'),
                drawImage: () => calls.push('drawImage'),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                shadowColor: '',
                shadowBlur: 0,
            } as unknown as CanvasRenderingContext2D;
            return { ctx, calls };
        };

        it('draws a minimal solid circle for drawAtmosphere when the texture is not ready', () => {
            for (const fn of [
                ParticlePainter.drawAtmosphere,
            ]) {
                const { ctx, calls } = createMockCtx();
                fn(ctx, 30, '#3b82f6');
                expect(calls).toContain('arc');
                expect(calls).toContain('fill');
                expect(calls).not.toContain('drawImage');
            }
        });
    });
});
