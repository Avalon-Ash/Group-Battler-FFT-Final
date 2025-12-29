
import { useEffect, useRef, MutableRefObject } from 'react';

interface CameraControlProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    cameraRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
    onPan: (dx: number, dy: number) => void;
    onZoom: (delta: number) => void;
    engine: any;
}

/**
 * 攝像機交互控制器 v25.0
 * 僅保留縮放功能，平移邏輯已整合至 useGameInput 以解決 PC 上的左鍵拖曳衝突
 */
export const useCameraControl = ({ canvasRef, cameraRef, onPan, onZoom, engine }: CameraControlProps) => {
    const lastPinchDist = useRef<number>(0);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            // 縮放不受平移衝突影響
            const delta = e.deltaY > 0 ? -0.15 : 0.15;
            onZoom(delta);
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
    }, [canvasRef, onZoom]);
};
