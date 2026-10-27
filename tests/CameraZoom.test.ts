import { describe, it, expect } from 'vitest';
import { CameraSystem } from '../engine/presentation/CameraSystem';
import { CameraTargetGroup } from '../engine/presentation/CameraTargetGroup';
import { UI_SETTINGS } from '../constants';

describe('R6 camera zoom ownership', () => {
    it('keeps manual zoom beyond five seconds while the director can pan, then releases on reset', () => {
        const camera = new CameraSystem();
        camera.applyZoom(2.5);
        for (let i = 0; i < 360; i++) {
            camera.setDirectorTarget(100, 200, 0.8);
            camera.update(1 / 60);
        }
        expect(camera.getTargetZoom()).toBe(2.5);
        expect(camera.zoom).toBeCloseTo(2.5);
        expect(camera.x).toBeGreaterThan(0);
        camera.resetZoomControl();
        expect(camera.getTargetZoom()).toBe(0.8);
        camera.setDirectorTarget(0, 0, 1.2);
        expect(camera.getTargetZoom()).toBe(1.2);
        camera.applyZoom(2);
        camera.reset();
        camera.setDirectorTarget(0, 0, 0.6);
        expect(camera.getTargetZoom()).toBe(0.6);
    });

    it('ignores stale React state and keeps manual zoom through pan and viewport recenter', () => {
        const camera = new CameraSystem();
        camera.applyZoom(2.5);
        camera.applyPanOffset(30, 10);
        const snapshot = { x: 999, y: 999, zoom: 0.5 };
        camera.sync(snapshot);
        expect(camera.getTargetZoom()).toBe(2.5);
        expect(snapshot.zoom).toBe(camera.zoom);
        camera.snapTo(0, 0, 0.7);
        expect(camera.getTargetZoom()).toBe(2.5);
        camera.update(0.2);
        expect(camera.zoom).toBeGreaterThan(2.4);
        camera.update(5);
        camera.setDirectorTarget(100, 100, 0.7);
        expect(camera.getTargetZoom()).toBe(2.5);
    });

    it('clamps manual and snapped values to shared bounds; framing uses the director subrange', () => {
        const camera = new CameraSystem();
        camera.snapTo(0, 0, 99);
        expect(camera.zoom).toBe(UI_SETTINGS.CAMERA_ZOOM.max);
        camera.applyZoom(0.01);
        expect(camera.getTargetZoom()).toBe(UI_SETTINGS.CAMERA_ZOOM.min);
        camera.applyZoom(99);
        expect(camera.getTargetZoom()).toBe(UI_SETTINGS.CAMERA_ZOOM.max);
        camera.applyZoom(NaN);
        expect(camera.getTargetZoom()).toBe(UI_SETTINGS.CAMERA_ZOOM.max);
        const group = new CameraTargetGroup();
        group.add(0, 0, 1, 1);
        expect(group.solve(1000, 1000).zoom).toBe(UI_SETTINGS.CAMERA_ZOOM.directorMax);
        group.add(100000, 100000, 1, 1);
        expect(group.solve(1000, 1000).zoom).toBe(UI_SETTINGS.CAMERA_ZOOM.directorMin);
    });
});
