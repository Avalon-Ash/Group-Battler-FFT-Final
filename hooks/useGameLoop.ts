
import { useRef, useEffect, MutableRefObject } from 'react';
import { GameEngine } from '../engine/game';
import { GameEvent } from '../types';
import { GameRenderer } from '../engine/renderer';

export const useGameLoop = (
    engine: GameEngine,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    wrapperRef: MutableRefObject<HTMLDivElement | null>,
    rendererRef: MutableRefObject<GameRenderer | null>,
    onDraw: (ctx: CanvasRenderingContext2D, fps: number) => void,
    onResize: (logicalWidth: number, logicalHeight: number) => void
) => {
    const fpsRef = useRef(60);
    const frameRef = useRef<number>(0);
    const isMountedRef = useRef(true);
    const resizeTimerRef = useRef<number | null>(null);
    
    // Store callbacks to prevent effect re-triggering
    const drawCallbackRef = useRef(onDraw);
    const resizeCallbackRef = useRef(onResize);

    useEffect(() => {
        drawCallbackRef.current = onDraw;
        resizeCallbackRef.current = onResize;
    }, [onDraw, onResize]);

    // 1. LIFECYCLE & RESIZE OBSERVER (High-DPI Support)
    useEffect(() => {
        isMountedRef.current = true;
        if (!wrapperRef.current || !canvasRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            if (!isMountedRef.current) return;

            window.requestAnimationFrame(() => {
                if (!isMountedRef.current || !canvasRef.current || !entries[0]) return;

                const { width, height } = entries[0].contentRect;
                
                // High-DPI Logic
                const dpr = window.devicePixelRatio || 1;
                const logicalW = Math.floor(width);
                const logicalH = Math.floor(height);
                
                // Physical pixels (Buffer size)
                const physicalW = Math.floor(width * dpr);
                const physicalH = Math.floor(height * dpr);

                if (logicalW === 0 || logicalH === 0) return;

                // Only update if dimensions actually changed to avoid flicker
                if (canvasRef.current.width !== physicalW || canvasRef.current.height !== physicalH) {
                    // 1. Set Physical Buffer Size (High Res)
                    canvasRef.current.width = physicalW;
                    canvasRef.current.height = physicalH;

                    // 2. Set CSS Display Size (Logical Res)
                    canvasRef.current.style.width = `${logicalW}px`;
                    canvasRef.current.style.height = `${logicalH}px`;

                    // 3. Debounce Logical Resize (Camera Recenter)
                    if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
                    resizeTimerRef.current = window.setTimeout(() => {
                        if (isMountedRef.current) {
                            // Pass LOGICAL dimensions to avoiding reading DOM again
                            resizeCallbackRef.current(logicalW, logicalH);
                        }
                    }, 50);
                }
            });
        });
        
        resizeObserver.observe(wrapperRef.current);

        return () => {
            isMountedRef.current = false;
            resizeObserver.disconnect();
            if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
            cancelAnimationFrame(frameRef.current);
        };
    }, [wrapperRef, canvasRef]);

    // 2. MAIN GAME LOOP
    useEffect(() => {
        let lastTime = 0;
        let acc = 0;
        const targetFPS = 60;
        const step = 1000 / targetFPS;
        let frameCount = 0;
        let lastFpsTime = 0;

        const loop = (t: number) => {
            if (!isMountedRef.current) return;

            if (!canvasRef.current || !rendererRef.current) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }

            if (!lastTime) lastTime = t;
            const dt = t - lastTime;
            lastTime = t;

            // FPS Counter
            frameCount++;
            if (t - lastFpsTime >= 1000) {
                fpsRef.current = frameCount;
                frameCount = 0;
                lastFpsTime = t;
            }

            // Logic Update
            if (engine.isRunning) {
                acc += dt;
                if (acc > 250) acc = 250; 
                
                const frameEvents: GameEvent[] = [];
                while (acc >= step) {
                    const sdt = (step / 1000) * engine.timeScale;
                    engine.tick(sdt);
                    engine.battleTime += sdt;
                    acc -= step;
                    frameEvents.push(...engine.events);
                }
                
                if (frameEvents.length > 0) {
                    rendererRef.current.processEventsWithEngine(frameEvents, engine);
                }
            }
            
            // Render Update
            rendererRef.current.update(dt / 1000, engine);
            drawCallbackRef.current(ctx, fpsRef.current);

            frameRef.current = requestAnimationFrame(loop);
        };

        frameRef.current = requestAnimationFrame(loop);
        
        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, [engine, canvasRef, rendererRef]);

    return { fpsRef };
};
