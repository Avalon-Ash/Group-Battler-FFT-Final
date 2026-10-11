import { describe, it, expect, beforeEach } from 'vitest';
import {
    createGlowSpriteStore,
    quantizeGlowRadius,
    quantizeGlowBlur,
    drawGlowSprite,
    GlowSpriteEntry,
} from '../engine/renderers/GlowSpriteCache';
import {
    isGlowSpritesEnabled,
    setGlowSpritesEnabledForTest,
    forceSetQualityTier,
} from '../engine/renderers/RenderQuality';
import { RENDER_GLOW, RENDER_QUALITY } from '../constants';

describe('GlowSpriteCache & Quantization', () => {
    let mockSurfaceFactory: (w: number, h: number) => { canvas: any; ctx: any };

    beforeEach(() => {
        setGlowSpritesEnabledForTest(null);
        forceSetQualityTier(0);
        mockSurfaceFactory = (w: number, h: number) => ({
            canvas: { width: w, height: h } as HTMLCanvasElement,
            ctx: {
                shadowColor: '',
                shadowBlur: 0,
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                roundRect: () => {},
                rect: () => {},
            } as any,
        });
    });

    describe('Quantization functions', () => {
        it('quantizes radius to nearest step', () => {
            expect(quantizeGlowRadius(3)).toBe(4);
            expect(quantizeGlowRadius(4)).toBe(4);
            expect(quantizeGlowRadius(5)).toBe(8);
            expect(quantizeGlowRadius(10)).toBe(12);
            expect(quantizeGlowRadius(100)).toBe(64);
        });

        it('quantizes blur to nearest step', () => {
            expect(quantizeGlowBlur(1)).toBe(2);
            expect(quantizeGlowBlur(3)).toBe(4);
            expect(quantizeGlowBlur(7)).toBe(8);
            expect(quantizeGlowBlur(50)).toBe(32);
        });
    });

    describe('Glow Sprite Store', () => {
        it('bakes and returns glow sprite for disc, ring, and rect', () => {
            const store = createGlowSpriteStore(mockSurfaceFactory);

            const disc = store.getGlowSprite('disc', '#cyan', 8, 4);
            expect(disc.canvas).toBeDefined();
            expect(disc.anchorX).toBeGreaterThan(0);
            expect(disc.anchorY).toBeGreaterThan(0);

            const ring = store.getGlowSprite('ring', '#cyan', 8, 4, { lineWidth: 3 });
            expect(ring.canvas).toBeDefined();

            const rect = store.getGlowSprite('rect', '#cyan', 0, 4, { width: 40, height: 10 });
            expect(rect.canvas).toBeDefined();

            const stats = store.getStats();
            expect(stats.size).toBe(3);
            expect(stats.misses).toBe(3);
        });

        it('hits cache on repeated requests for quantized parameters', () => {
            const store = createGlowSpriteStore(mockSurfaceFactory);

            const entry1 = store.getGlowSprite('disc', '#00ffff', 8, 4);
            const entry2 = store.getGlowSprite('disc', '#00ffff', 8, 4);
            // Slightly different input that quantizes to same step
            const entry3 = store.getGlowSprite('disc', '#00ffff', 7.9, 3.9);

            expect(entry2).toBe(entry1);
            expect(entry3).toBe(entry1);

            const stats = store.getStats();
            expect(stats.size).toBe(1);
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
        });

        it('respects capacity limit and evicts oldest entries', () => {
            const store = createGlowSpriteStore(mockSurfaceFactory);

            // Add entries up to MAX_GLOW_SPRITES + 5
            for (let i = 0; i < RENDER_GLOW.MAX_GLOW_SPRITES + 5; i++) {
                store.getGlowSprite('disc', `#color_${i}`, 8, 4);
            }

            const stats = store.getStats();
            expect(stats.size).toBeLessThanOrEqual(RENDER_GLOW.MAX_GLOW_SPRITES);
        });

        it('draws sprite with anchor offset and restores alpha', () => {
            let drawnImg: any = null;
            let drawnX = 0;
            let drawnY = 0;
            let currentAlpha = 1.0;

            const fakeCtx = {
                get globalAlpha() { return currentAlpha; },
                set globalAlpha(v) { currentAlpha = v; },
                drawImage: (img: any, x: number, y: number) => {
                    drawnImg = img;
                    drawnX = x;
                    drawnY = y;
                },
            } as any;

            const entry: GlowSpriteEntry = {
                canvas: { w: 32, h: 32 } as any,
                anchorX: 16,
                anchorY: 16,
                width: 32,
                height: 32,
            };

            drawGlowSprite(fakeCtx, entry, 100, 200, 0.5);

            expect(drawnX).toBe(84); // 100 - 16
            expect(drawnY).toBe(184); // 200 - 16
            expect(currentAlpha).toBe(1.0); // restored
        });
    });

    describe('GLOW_SPRITES Quality Flag', () => {
        it('is false by default in Tier 0 and Tier 1', () => {
            forceSetQualityTier(0);
            expect(isGlowSpritesEnabled()).toBe(false);

            forceSetQualityTier(1);
            expect(isGlowSpritesEnabled()).toBe(false);
        });

        it('is true automatically in Tier 2 and Tier 3', () => {
            forceSetQualityTier(2);
            expect(isGlowSpritesEnabled()).toBe(true);

            forceSetQualityTier(3);
            expect(isGlowSpritesEnabled()).toBe(true);
        });

        it('can be overridden explicitly for testing', () => {
            setGlowSpritesEnabledForTest(true);
            expect(isGlowSpritesEnabled()).toBe(true);

            setGlowSpritesEnabledForTest(false);
            expect(isGlowSpritesEnabled()).toBe(false);
        });
    });
});
