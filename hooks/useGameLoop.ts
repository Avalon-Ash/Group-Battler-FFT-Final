
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
    onResize: (logicalWidth: number, logicalHeight: number) => void,
    cameraRef?: any // 新增攝像機引用傳遞
) => {
    const fpsRef = useRef(60);
    const frameRef = useRef<number>(0);
    const isMountedRef = useRef(true);
    const resizeTimerRef = useRef<number | null>(null);
    
    const drawCallbackRef = useRef(onDraw);
    const resizeCallbackRef = useRef(onResize);

    useEffect(() => {
        drawCallbackRef.current = onDraw;
        resizeCallbackRef.current = onResize;
    }, [onDraw, onResize]);

    useEffect(() => {
        isMountedRef.current = true;
        if (!wrapperRef.current || !canvasRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            if (!isMountedRef.current) return;

            window.requestAnimationFrame(() => {
                if (!isMountedRef.current || !canvasRef.current || !entries[0]) return;

                const { width, height } = entries[0].contentRect;
                const dpr = window.devicePixelRatio || 1;
                const logicalW = Math.floor(width);
                const logicalH = Math.floor(height);
                const physicalW = Math.floor(width * dpr);
                const physicalH = Math.floor(height * dpr);

                if (logicalW === 0 || logicalH === 0) return;

                // Sync Aspect Ratio to Engine
                engine.screenAspect = logicalW / logicalH;

                if (canvasRef.current.width !== physicalW || canvasRef.current.height !== physicalH) {
                    canvasRef.current.width = physicalW;
                    canvasRef.current.height = physicalH;
                    canvasRef.current.style.width = `${logicalW}px`;
                    canvasRef.current.style.height = `${logicalH}px`;

                    if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
                    resizeTimerRef.current = window.setTimeout(() => {
                        if (isMountedRef.current) {
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
    }, [wrapperRef, canvasRef, engine]);

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

            frameCount++;
            if (t - lastFpsTime >= 1000) {
                fpsRef.current = frameCount;
                frameCount = 0;
                lastFpsTime = t;
            }

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
            
            // 傳入 cameraRef 進行座標同步，防止「強制拉回」
            rendererRef.current.update(dt / 1000, engine, cameraRef);
            drawCallbackRef.current(ctx, fpsRef.current);

            frameRef.current = requestAnimationFrame(loop);
        };

        frameRef.current = requestAnimationFrame(loop);
        
        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, [engine, canvasRef, rendererRef, cameraRef]);

    return { fpsRef };
};
