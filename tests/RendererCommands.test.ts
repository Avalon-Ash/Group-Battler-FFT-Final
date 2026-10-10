import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';

describe('GameRenderer UICommand Subscription (E8-e)', () => {
    let engine: GameEngine;
    let renderer: GameRenderer;
    const originalDocument = (globalThis as Record<string, unknown>).document;

    beforeEach(() => {
        (globalThis as Record<string, unknown>).document = {
            createElement: (tag: string) => {
                if (tag === 'canvas') {
                    return {
                        width: 0,
                        height: 0,
                        getContext: () => ({
                            imageSmoothingEnabled: true,
                        }),
                    };
                }
                return {};
            },
        };
        engine = new GameEngine();
        renderer = new GameRenderer();
        renderer.bind(engine);
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
        (globalThis as Record<string, unknown>).document = originalDocument;
    });

    it('handles CAMERA_ZOOM command', () => {
        engine.bus.emit('UI_COMMAND', { type: 'CAMERA_ZOOM', zoom: 1.8 });
        // CameraSystem applyZoom sets targetZoom
        // After small tick update or direct inspection:
        // CameraSystem applyZoom sets targetZoom to 1.8 and manualOverrideTimer to 1.0
        renderer.camera.update(0.1);
        expect(renderer.camera.zoom).toBeGreaterThan(1.0);
    });

    it('handles CAMERA_PAN command', () => {
        const initialX = renderer.camera.x;
        const initialY = renderer.camera.y;
        engine.bus.emit('UI_COMMAND', { type: 'CAMERA_PAN', dx: 50, dy: -30 });
        expect(renderer.camera.x).not.toBe(initialX);
        expect(renderer.camera.y).not.toBe(initialY);
    });

    it('handles CAMERA_SNAP command', () => {
        engine.bus.emit('UI_COMMAND', { type: 'CAMERA_SNAP', x: 250, y: -150, zoom: 2.2 });
        expect(renderer.camera.x).toBe(250);
        expect(renderer.camera.y).toBe(-150);
        expect(renderer.camera.zoom).toBe(2.2);
    });

    it('handles CAMERA_SNAP command with default zoom', () => {
        renderer.camera.zoom = 1.4;
        engine.bus.emit('UI_COMMAND', { type: 'CAMERA_SNAP', x: 100, y: 200 });
        expect(renderer.camera.x).toBe(100);
        expect(renderer.camera.y).toBe(200);
        expect(renderer.camera.zoom).toBe(1.4);
    });

    it('handles SET_VIEWPORT command', () => {
        engine.bus.emit('UI_COMMAND', { type: 'SET_VIEWPORT', width: 1920, height: 1080 });
        expect(engine.screenW).toBe(1920);
        expect(engine.screenH).toBe(1080);
        expect(engine.screenAspect).toBeCloseTo(1920 / 1080);
    });

    it('ignores invalid parameters safely without throwing', () => {
        expect(() => {
            engine.bus.emit('UI_COMMAND', { type: 'CAMERA_ZOOM', zoom: NaN });
            engine.bus.emit('UI_COMMAND', { type: 'CAMERA_PAN', dx: NaN, dy: 10 });
            engine.bus.emit('UI_COMMAND', { type: 'CAMERA_SNAP', x: Infinity, y: 10 });
            engine.bus.emit('UI_COMMAND', { type: 'SET_VIEWPORT', width: 0, height: -10 });
        }).not.toThrow();
    });
});
