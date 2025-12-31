
import { useEffect, useRef, MutableRefObject } from 'react';

interface CameraControlProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    cameraRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
    onZoom: (delta: number) => void;
    engine: any;
}

/**
 * 攝像機交互控制器 v26.0
 * 縮放操作也會暫時覆蓋自動運鏡
 */
export const useCameraControl = ({ canvasRef, cameraRef, onZoom, engine }: CameraControlProps) => {
    const lastPinchDist = useRef<number>(0);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const notifyEngine = (newZoom: number) => {
            if (engine.renderer && engine.renderer.camera) {
                engine.renderer.camera.applyZoom(newZoom);
            }
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.15 : 0.15;
            onZoom(delta);
            // Notify physics system
            notifyEngine(cameraRef.current.zoom);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                lastPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if (lastPinchDist.current > 0) {
                    const delta = (dist - lastPinchDist.current) * 0.008;
                    onZoom(delta);
                    // Notify physics system
                    notifyEngine(cameraRef.current.zoom);
                }
                lastPinchDist.current = dist;
            }
        };

        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });

        return () => {
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
        };
    }, [canvasRef, onZoom, engine]);
};
