import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackgroundRenderer } from '../engine/renderers/background';
import { SCENE_DB } from '../data/scenes';
import { MapConfig } from '../engine/utils';
import { forceSetQualityTier, setPinnedTier, getQualityTier } from '../engine/renderers/RenderQuality';

/**
 * 棘輪基準（Ratchet Baseline）：
 * 記錄重構各階段的目標值。BG1 記錄現況，BG3/BG4/BG5 依任務目標歸零／啟用。
 */
export const BG_BASELINE = {
    // BG3 動態層已完全達成每幀零漸層、零 arc
    perFrameGradients: {
        VOID: 0,
        FOREST: 0,
        ICE: 0,
        MAGMA: 0,
        DESERT: 0,
    } as Record<string, number>,

    // BG3 動態層已改用預烘焙光點 Sprite，每幀 0 次 arc
    perFrameArcs: {
        VOID: 0,
        FOREST: 0,
        ICE: 0,
        MAGMA: 0,
        DESERT: 0,
    } as Record<string, number>,

    // BG4 靜態星星改用以索引為種子的純整數雜湊，達成 100% 確定性
    staticCacheDeterministic: true,

    // BG1 背景尚未整合品質階層；BG5 降級實作後 Tier 3 動態繪製數必須為 0
    tier3DynamicDisabled: false,
};

const dummyConfig: MapConfig = {
    w: 10,
    h: 10,
    offsetX: 0,
    offsetY: 0,
    layout: 'FLAT',
};

interface CtxStats {
    createLinearGradient: number;
    createRadialGradient: number;
    arc: number;
    createCanvas: number;
    drawImage: number;
    fillRect: number;
    stroke: number;
    fill: number;
    totalGradients: number;
    calls: Array<{ method: string; args: any[] }>;
}

let activeTracker: CtxStats | null = null;

function createMockContext(localStats?: CtxStats) {
    const gradientObj = {
        addColorStop: (_offset: number, _color: string) => {},
    };

    const record = (fn: (s: CtxStats) => void) => {
        if (localStats) fn(localStats);
        if (activeTracker && activeTracker !== localStats) fn(activeTracker);
    };

    const ctx: any = {
        canvas: null as any,
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        globalAlpha: 1.0,
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',

        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: (...args: any[]) => { record(s => s.calls.push({ method: 'moveTo', args })); },
        lineTo: (...args: any[]) => { record(s => s.calls.push({ method: 'lineTo', args })); },
        quadraticCurveTo: (...args: any[]) => { record(s => s.calls.push({ method: 'quadraticCurveTo', args })); },
        arc: (...args: any[]) => {
            record(s => {
                s.arc++;
                s.calls.push({ method: 'arc', args: [args[0], args[1], args[2]] });
            });
        },
        ellipse: (...args: any[]) => { record(s => s.calls.push({ method: 'ellipse', args })); },
        rect: (...args: any[]) => { record(s => s.calls.push({ method: 'rect', args })); },
        fillRect: (...args: any[]) => {
            record(s => {
                s.fillRect++;
                s.calls.push({ method: 'fillRect', args });
            });
        },
        clearRect: () => {},
        stroke: () => { record(s => { s.stroke++; }); },
        fill: () => { record(s => { s.fill++; }); },
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setTransform: () => {},
        resetTransform: () => {},
        drawImage: (...args: any[]) => {
            record(s => {
                s.drawImage++;
                s.calls.push({ method: 'drawImage', args: [args[0]?.width, args[0]?.height, args[1], args[2]] });
            });
        },
        createLinearGradient: (...args: any[]) => {
            record(s => {
                s.createLinearGradient++;
                s.totalGradients++;
            });
            return gradientObj;
        },
        createRadialGradient: (...args: any[]) => {
            record(s => {
                s.createRadialGradient++;
                s.totalGradients++;
            });
            return gradientObj;
        },
    };
    return ctx;
}

function setupMockDom() {
    const origDoc = (globalThis as any).document;
    const origWindow = (globalThis as any).window;

    const mockDocument = {
        createElement: (tag: string) => {
            if (tag === 'canvas') {
                if (activeTracker) activeTracker.createCanvas++;
                const statsForThisCanvas: CtxStats = {
                    createLinearGradient: 0,
                    createRadialGradient: 0,
                    arc: 0,
                    createCanvas: 0,
                    drawImage: 0,
                    fillRect: 0,
                    stroke: 0,
                    fill: 0,
                    totalGradients: 0,
                    calls: [],
                };
                const ctx = createMockContext(statsForThisCanvas);
                const canvasObj: any = {
                    width: 0,
                    height: 0,
                    getContext: (type: string) => (type === '2d' ? ctx : null),
                    __stats: statsForThisCanvas,
                };
                ctx.canvas = canvasObj;
                return canvasObj;
            }
            return origDoc ? origDoc.createElement(tag) : {};
        },
    };

    (globalThis as any).document = mockDocument;
    (globalThis as any).window = { devicePixelRatio: 1 };

    const restore = () => {
        (globalThis as any).document = origDoc;
        (globalThis as any).window = origWindow;
        activeTracker = null;
    };

    return { restore };
}

describe('BackgroundRenderer Pipeline Verification', () => {
    let mockDom: ReturnType<typeof setupMockDom>;

    beforeEach(() => {
        mockDom = setupMockDom();
        setPinnedTier(null);
        forceSetQualityTier(0);
    });

    afterEach(() => {
        mockDom.restore();
        setPinnedTier(null);
        forceSetQualityTier(0);
    });

    describe('1. Per-frame gradient and arc counts (Warmup + 120 frames)', () => {
        for (const scene of SCENE_DB) {
            it(`Scene ${scene.id}: matches ratchet baseline for gradients and arcs`, () => {
                const renderer = new BackgroundRenderer();
                const screenStats: CtxStats = {
                    createLinearGradient: 0,
                    createRadialGradient: 0,
                    arc: 0,
                    createCanvas: 0,
                    drawImage: 0,
                    fillRect: 0,
                    stroke: 0,
                    fill: 0,
                    totalGradients: 0,
                    calls: [],
                };
                const screenCtx = createMockContext(screenStats);
                const w = 1920;
                const h = 1080;

                // Frame 0: Warmup / static cache creation
                renderer.draw(screenCtx, w, h, scene, dummyConfig, 0);

                // Reset counters before measuring 120 frames
                screenStats.createLinearGradient = 0;
                screenStats.createRadialGradient = 0;
                screenStats.arc = 0;
                screenStats.totalGradients = 0;
                screenStats.drawImage = 0;

                const FRAMES = 120;
                activeTracker = screenStats;
                for (let i = 1; i <= FRAMES; i++) {
                    const t = i / 60;
                    renderer.draw(screenCtx, w, h, scene, dummyConfig, t);
                }
                activeTracker = null;

                const gradPerFrame = screenStats.totalGradients / FRAMES;
                const arcPerFrame = screenStats.arc / FRAMES;

                const expectedGrad = BG_BASELINE.perFrameGradients[scene.id];
                const expectedArc = BG_BASELINE.perFrameArcs[scene.id];

                expect(gradPerFrame).toBe(expectedGrad);
                expect(arcPerFrame).toBe(expectedArc);
            });
        }
    });

    describe('2. Static cache determinism across rebuilds', () => {
        for (const scene of SCENE_DB) {
            it(`Scene ${scene.id}: static cache reproducibility`, () => {
                // Rebuild 1
                const r1 = new BackgroundRenderer();
                const s1: CtxStats = {
                    createLinearGradient: 0,
                    createRadialGradient: 0,
                    arc: 0,
                    createCanvas: 0,
                    drawImage: 0,
                    fillRect: 0,
                    stroke: 0,
                    fill: 0,
                    totalGradients: 0,
                    calls: [],
                };
                const ctx1 = createMockContext(s1);
                r1.draw(ctx1, 1920, 1080, scene, dummyConfig, 0);
                const staticCanvas1 = (r1 as any).staticCache;
                const calls1 = staticCanvas1?.__stats?.calls ?? [];

                // Rebuild 2
                const r2 = new BackgroundRenderer();
                const s2: CtxStats = {
                    createLinearGradient: 0,
                    createRadialGradient: 0,
                    arc: 0,
                    createCanvas: 0,
                    drawImage: 0,
                    fillRect: 0,
                    stroke: 0,
                    fill: 0,
                    totalGradients: 0,
                    calls: [],
                };
                const ctx2 = createMockContext(s2);
                r2.draw(ctx2, 1920, 1080, scene, dummyConfig, 0);
                const staticCanvas2 = (r2 as any).staticCache;
                const calls2 = staticCanvas2?.__stats?.calls ?? [];

                if (BG_BASELINE.staticCacheDeterministic) {
                    expect(calls1).toEqual(calls2);
                } else {
                    // In BG1, Math.random() produces variations in star sizes and opacities
                    // so calls may differ unless seeded
                    expect(calls1.length).toBeGreaterThan(0);
                    expect(calls2.length).toBeGreaterThan(0);
                }
            });
        }
    });

    describe('3. Quality Tier 3 degradation', () => {
        it('Tier 3 suppresses dynamic background draw calls when enabled', () => {
            forceSetQualityTier(3);
            const renderer = new BackgroundRenderer();
            const screenStats: CtxStats = {
                createLinearGradient: 0,
                createRadialGradient: 0,
                arc: 0,
                createCanvas: 0,
                drawImage: 0,
                fillRect: 0,
                stroke: 0,
                fill: 0,
                totalGradients: 0,
                calls: [],
            };
            const screenCtx = createMockContext(screenStats);
            const scene = SCENE_DB[0]; // VOID

            // Warmup
            renderer.draw(screenCtx, 1920, 1080, scene, dummyConfig, 0);

            screenStats.calls = [];
            screenStats.drawImage = 0;
            screenStats.fillRect = 0;
            screenStats.arc = 0;

            // Draw at t = 1.0
            renderer.draw(screenCtx, 1920, 1080, scene, dummyConfig, 1.0);

            if (BG_BASELINE.tier3DynamicDisabled) {
                // Tier 3: only draws static cache (1 drawImage), no dynamic calls
                expect(screenStats.drawImage).toBe(1);
                expect(screenStats.fillRect).toBe(0);
                expect(screenStats.arc).toBe(0);
            } else {
                // Before BG5, dynamic layer is not gated by tier yet, so motes drawImage calls occur
                expect(screenStats.drawImage).toBeGreaterThan(1);
            }
        });
    });
});
