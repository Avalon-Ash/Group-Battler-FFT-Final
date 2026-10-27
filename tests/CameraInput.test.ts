import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MutableRefObject } from 'react';
import { GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { UI_SETTINGS } from '../constants';
import { useCameraControl, wheelZoomFactor } from '../hooks/useCameraControl';
import { useGameCamera } from '../hooks/useGameCamera';

const lifecycle = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));
vi.mock('react', () => ({
    useRef: <T>(current: T) => ({ current }),
    useCallback: <T>(callback: T) => callback,
    useEffect: (effect: () => (() => void) | undefined) => {
        const cleanup = effect();
        if (cleanup) lifecycle.cleanups.push(cleanup);
    },
}));

afterEach(() => { for (const cleanup of lifecycle.cleanups.splice(0)) cleanup(); });

describe('R6 zoom inputs', () => {
    it('normalizes wheel modes, preserves trackpad magnitude, and gives reciprocal steps', () => {
        const c = UI_SETTINGS.CAMERA_ZOOM;
        expect(wheelZoomFactor(-c.wheelPixels, 0)).toBeCloseTo(c.wheelFactor);
        expect(wheelZoomFactor(c.wheelPixels, 0)).toBeCloseTo(1 / c.wheelFactor);
        expect(wheelZoomFactor(-c.wheelPixels / c.linePixels, 1)).toBeCloseTo(c.wheelFactor);
        expect(wheelZoomFactor(-c.wheelPixels / c.pagePixels, 2)).toBeCloseTo(c.wheelFactor);
        expect(wheelZoomFactor(-10, 0) ** 10).toBeCloseTo(c.wheelFactor);
    });

    it('uses pinch ratios, resets pinch on end, and dispatches double click / double tap reset commands', () => {
        const engine = new GameEngine();
        const canvas = new EventTarget();
        const onZoom = vi.fn();
        const emit = vi.spyOn(engine.bus, 'emit');
        useCameraControl({ canvasRef: { current: canvas } as MutableRefObject<HTMLCanvasElement | null>, onZoom, engine });
        const touch = (type: string, touches: { clientX: number; clientY: number }[], time: number, changedTouches = touches) => {
            const event = new Event(type, { cancelable: true });
            Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches }, timeStamp: { value: time } });
            canvas.dispatchEvent(event);
        };
        const pair = (dist: number) => [{ clientX: 0, clientY: 0 }, { clientX: dist, clientY: 0 }];
        touch('touchstart', pair(100), 0);
        touch('touchmove', pair(150), 10);
        touch('touchmove', pair(300), 20);
        expect(onZoom.mock.calls.map(c => c[0])).toEqual([1.5, 2]);
        touch('touchend', [], 30, pair(300));
        touch('touchstart', pair(50), 40);
        touch('touchmove', pair(100), 50);
        expect(onZoom).toHaveBeenLastCalledWith(2);
        touch('touchend', [], 60, pair(100));
        const finger = [{ clientX: 20, clientY: 20 }];
        touch('touchstart', finger, 100);
        touch('touchend', [], 150, finger);
        touch('touchstart', finger, 200);
        touch('touchend', [], 250, finger);
        expect(emit).toHaveBeenLastCalledWith('UI_COMMAND', { type: 'CAMERA_RESET_ZOOM' });
        canvas.dispatchEvent(new Event('dblclick'));
        expect(emit.mock.calls.filter(c => c[1] && 'type' in c[1] && c[1].type === 'CAMERA_RESET_ZOOM')).toHaveLength(2);
        engine.stop();
    });

    it('accumulates rapid wheel/pinch factors from the engine target, before any smoothing frame', () => {
        const originalDocument = (globalThis as Record<string, unknown>).document;
        (globalThis as Record<string, unknown>).document = { createElement: () => ({ getContext: () => ({}) }) };
        const engine = new GameEngine();
        try {
            const renderer = new GameRenderer();
            renderer.bind(engine);
            engine.renderer = renderer;
            const hook = useGameCamera(engine);
            hook.camera.current.zoom = 0.4;
            renderer.camera.snapTo(0, 0, 1.2);
            hook.zoom(1.5);
            hook.zoom(1.5);
            expect(renderer.camera.getTargetZoom()).toBeCloseTo(2.7);
            expect(hook.camera.current.zoom).toBe(0.4);
            hook.zoom(2);
            expect(renderer.camera.getTargetZoom()).toBe(3);
            engine.bus.emit('UI_COMMAND', { type: 'CAMERA_RESET_ZOOM' });
            renderer.camera.setDirectorTarget(0, 0, 0.8);
            expect(renderer.camera.getTargetZoom()).toBe(0.8);
        } finally {
            engine.stop();
            engine.clear();
            (globalThis as Record<string, unknown>).document = originalDocument;
        }
    });
});
