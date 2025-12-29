
import { useEffect, useRef, MutableRefObject } from 'react';

interface CameraControlProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    cameraRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
    onPan: (dx: number, dy: number) => void;
    onZoom: (delta: number) => void;
}

export const useCameraControl = ({ canvasRef, cameraRef, onPan, onZoom }: CameraControlProps) => {
    // State for drag/pinch
    const isPanning = useRef(false);
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const lastPinchDist = useRef<number>(0);

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const handleStart = (x: number, y: number, isRightClick: boolean) => {
            if (isRightClick) {
                isPanning.current = true;
                lastPointerPos.current = { x, y };
                cvs.style.cursor = 'move';
            }
        };

        const handleMove = (x: number, y: number) => {
            if (isPanning.current && lastPointerPos.current) {
                const dx = x - lastPointerPos.current.x;
                const dy = y - lastPointerPos.current.y;
                onPan(dx, dy);
                lastPointerPos.current = { x, y };
            }
        };

        const handleEnd = () => {
            if (isPanning.current) {
                isPanning.current = false;
                lastPointerPos.current = null;
                cvs.style.cursor = 'default';
            }
        };

        // --- Event Listeners ---

        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 2) { // Right Click
                e.preventDefault();
                e.stopPropagation();
                handleStart(e.clientX, e.clientY, true);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isPanning.current) {
                e.preventDefault();
                handleMove(e.clientX, e.clientY);
            }
        };

        const onMouseUp = () => handleEnd();
        
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            onZoom(delta);
        };

        // --- Touch Logic (Pinch & Pan) ---
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Pinch Start
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                lastPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            } else if (e.touches.length === 1 && isPanning.current) {
                // Should not happen usually as Right Click is not touch, 
                // but if we mapped 2-finger pan here in future, this structure supports it.
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Pinch Move
                e.preventDefault();
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                if (lastPinchDist.current > 0) {
                    const delta = (dist - lastPinchDist.current) * 0.005;
                    onZoom(delta);
                }
                lastPinchDist.current = dist;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                lastPinchDist.current = 0;
            }
        };

        cvs.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd);

        return () => {
            cvs.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
        };
    }, [canvasRef, onPan, onZoom]);
};
