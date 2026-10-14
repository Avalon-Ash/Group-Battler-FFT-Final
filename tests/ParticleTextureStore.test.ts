import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleTextureStore, resolveAssetUrl, particleTextureStore } from '../engine/renderers/ParticleTextureStore';
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
        it('has all required particle keys configured', () => {
            expect(VFX_SPRITES.textures.light).toBe('assets/vfx/light_01.png');
            expect(VFX_SPRITES.textures.spark).toBe('assets/vfx/spark_01.png');
            expect(VFX_SPRITES.textures.smoke).toBe('assets/vfx/smoke_01.png');
            expect(VFX_SPRITES.textures.magic).toBe('assets/vfx/magic_01.png');
            expect(VFX_SPRITES.textures.star).toBe('assets/vfx/star_01.png');
        });

        it('supports toggling enabled flag', () => {
            const prev = VFX_SPRITES.enabled;
            try {
                VFX_SPRITES.enabled = false;
                expect(VFX_SPRITES.enabled).toBe(false);
                VFX_SPRITES.enabled = true;
                expect(VFX_SPRITES.enabled).toBe(true);
            } finally {
                VFX_SPRITES.enabled = prev;
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
        });
    });

    describe('ParticlePainter procedural fallback integrity', () => {
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
                createRadialGradient: () => ({
                    addColorStop: () => calls.push('addColorStop'),
                }),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                shadowColor: '',
                shadowBlur: 0,
            } as unknown as CanvasRenderingContext2D;
            return { ctx, calls };
        };

        it('executes procedural drawAtmosphere fallback when sprite is not ready or disabled', () => {
            const { ctx, calls } = createMockCtx();
            const prev = VFX_SPRITES.enabled;
            try {
                VFX_SPRITES.enabled = false;
                ParticlePainter.drawAtmosphere(ctx, 30, '#3b82f6');
                expect(calls).toContain('addColorStop');
                expect(calls).toContain('fill');
                expect(calls).not.toContain('drawImage');
            } finally {
                VFX_SPRITES.enabled = prev;
            }
        });

        it('executes procedural drawSmoke fallback when sprite is disabled', () => {
            const { ctx, calls } = createMockCtx();
            const prev = VFX_SPRITES.enabled;
            try {
                VFX_SPRITES.enabled = false;
                ParticlePainter.drawSmoke(ctx, 30, '#ffffff');
                expect(calls).toContain('addColorStop');
                expect(calls).toContain('arc');
                expect(calls).toContain('fill');
                expect(calls).not.toContain('drawImage');
            } finally {
                VFX_SPRITES.enabled = prev;
            }
        });

        it('executes procedural drawSpike fallback when sprite is disabled', () => {
            const { ctx, calls } = createMockCtx();
            const prev = VFX_SPRITES.enabled;
            try {
                VFX_SPRITES.enabled = false;
                ParticlePainter.drawSpike(ctx, 25, '#fde047');
                expect(calls).toContain('beginPath');
                expect(calls).toContain('lineTo');
                expect(calls).toContain('fill');
                expect(calls).not.toContain('drawImage');
            } finally {
                VFX_SPRITES.enabled = prev;
            }
        });
    });
});
