import { useEffect, useRef, MutableRefObject } from 'react';
import type { GameEngine } from '../engine/game';
import { UI_SETTINGS } from '../constants';

interface CameraControlProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    onZoom: (factor: number) => void;
    engine: GameEngine;
}

/** Wheel delta modes are normalized to pixels; trackpads keep their continuous magnitude. */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
    const config = UI_SETTINGS.CAMERA_ZOOM;
    const pixels = deltaY * (deltaMode === 1 ? config.linePixels : deltaMode === 2 ? config.pagePixels : 1);
    return Math.exp(-pixels * Math.log(config.wheelFactor) / config.wheelPixels);
}

/** 手動縮放持續保留；雙擊／短距離雙點交還導播。 */
export const useCameraControl = ({ canvasRef, onZoom, engine }: CameraControlProps) => {
    const lastPinchDist = useRef(0);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const config = UI_SETTINGS.CAMERA_ZOOM;
        let tap: { x: number; y: number; time: number } | null = null;
        let lastTap: { x: number; y: number; time: number } | null = null;
        const resetZoom = () => engine.bus.emit('UI_COMMAND', { type: 'CAMERA_RESET_ZOOM' });
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.deltaY !== 0) onZoom(wheelZoomFactor(e.deltaY, e.deltaMode));
        };
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                tap = lastTap = null;
                const [t1, t2] = [e.touches[0], e.touches[1]];
                lastPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            } else if (e.touches.length === 1) {
                const t = e.touches[0];
                tap = { x: t.clientX, y: t.clientY, time: e.timeStamp };
            } else {
                tap = lastTap = null;
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const [t1, t2] = [e.touches[0], e.touches[1]];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if (lastPinchDist.current > 0 && dist > 0) onZoom(dist / lastPinchDist.current);
                lastPinchDist.current = dist;
            } else if (tap && e.touches.length === 1) {
                const t = e.touches[0];
                if (Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > config.tapDistance) tap = null;
            }
        };
        const onTouchEnd = (e: TouchEvent) => {
            lastPinchDist.current = 0;
            if (e.touches.length === 0 && tap && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                if (e.timeStamp - tap.time <= config.tapMaxMs &&
                    Math.hypot(t.clientX - tap.x, t.clientY - tap.y) <= config.tapDistance) {
                    if (lastTap && e.timeStamp - lastTap.time <= config.doubleTapMs &&
                        Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) <= config.tapDistance) {
                        e.preventDefault();
                        resetZoom();
                        lastTap = null;
                    } else lastTap = { x: t.clientX, y: t.clientY, time: e.timeStamp };
                }
            }
            tap = null;
        };
        const onTouchCancel = () => { tap = lastTap = null; lastPinchDist.current = 0; };
        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('dblclick', resetZoom);
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd, { passive: false });
        cvs.addEventListener('touchcancel', onTouchCancel);
        return () => {
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('dblclick', resetZoom);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
            cvs.removeEventListener('touchcancel', onTouchCancel);
        };
    }, [canvasRef, onZoom, engine]);
};
