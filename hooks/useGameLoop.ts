
import { useRef, useEffect, MutableRefObject } from 'react';
import { GameEngine } from '../engine/game';
import { GameEvent } from '../types';
import { GameRenderer } from '../engine/renderer';
import { getRenderDpr, getDefaultQualityGovernor } from '../engine/renderers/RenderQuality';

export const useGameLoop = (
    engine: GameEngine,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    wrapperRef: MutableRefObject<HTMLDivElement | null>,
    rendererRef: MutableRefObject<GameRenderer | null>,
    onDraw: (ctx: CanvasRenderingContext2D, fps: number) => void,
    onResize: (logicalWidth: number, logicalHeight: number) => void,
    cameraRef?: MutableRefObject<{ x: number; y: number; zoom: number }> // 新增攝像機引用傳遞
) => {
    const fpsRef = useRef(60);
    const frameRef = useRef<number>(0);
    const isMountedRef = useRef(true);
    const resizeTimerRef = useRef<number | null>(null);
    const realTimeRef = useRef(0); // Add strict monotonic real time tracking
    
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
                const dpr = getRenderDpr();
                const logicalW = Math.floor(width);
                const logicalH = Math.floor(height);
                const physicalW = Math.floor(width * dpr);
                const physicalH = Math.floor(height * dpr);

                if (logicalW === 0 || logicalH === 0) return;

                // Sync Viewport to Engine via UICommand
                engine.bus.emit('UI_COMMAND', { type: 'SET_VIEWPORT', width: logicalW, height: logicalH });

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
        let lastDpr = getRenderDpr();

        const loop = (t: number) => {
            if (!isMountedRef.current) return;

            if (!canvasRef.current || !rendererRef.current) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }
            const ctx = canvasRef.current.getContext('2d', { alpha: false });
            if (!ctx) {
                frameRef.current = requestAnimationFrame(loop);
                return;
            }

            if (!lastTime) lastTime = t;
            const dt = t - lastTime;
            lastTime = t;

            // Main-thread work time of this frame (vsync independent) feeds the quality governor's upgrade decision.
            const workStart = performance.now();

            // Increment Real Time strictly by dt
            realTimeRef.current += dt / 1000;

            frameCount++;
            if (t - lastFpsTime >= 1000) {
                fpsRef.current = frameCount;
                frameCount = 0;
                lastFpsTime = t;

                // 每秒檢查一次 getRenderDpr() 是否變動，變動則重設畫布實體尺寸
                const currentDpr = getRenderDpr();
                if (currentDpr !== lastDpr && canvasRef.current && wrapperRef.current) {
                    lastDpr = currentDpr;
                    const logicalW = Math.floor(wrapperRef.current.clientWidth);
                    const logicalH = Math.floor(wrapperRef.current.clientHeight);
                    const physicalW = Math.floor(logicalW * currentDpr);
                    const physicalH = Math.floor(logicalH * currentDpr);

                    if (logicalW > 0 && logicalH > 0 && (canvasRef.current.width !== physicalW || canvasRef.current.height !== physicalH)) {
                        canvasRef.current.width = physicalW;
                        canvasRef.current.height = physicalH;
                        canvasRef.current.style.width = `${logicalW}px`;
                        canvasRef.current.style.height = `${logicalH}px`;
                        engine.bus.emit('UI_COMMAND', { type: 'SET_VIEWPORT', width: logicalW, height: logicalH });

                        if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
                        resizeTimerRef.current = window.setTimeout(() => {
                            if (isMountedRef.current) {
                                resizeCallbackRef.current(logicalW, logicalH);
                            }
                        }, 50);
                    }
                }
            }

            if (engine.isRunning) {
                acc += dt;
                if (acc > 250) acc = 250; 
                
                while (acc >= step) {
                    const sdt = (step / 1000) * engine.timeScale;
                    // D13: engine.tick encapsulates battleTime accumulation internally
                    engine.tick(sdt);
                    acc -= step;
                }
            }
            
            // Renderer update now handles time splitting internally using Engine state
            rendererRef.current.update(dt / 1000, engine, cameraRef);
            drawCallbackRef.current(ctx, fpsRef.current);

            if (dt > 0 && (typeof document === 'undefined' || !document.hidden)) {
                getDefaultQualityGovernor().feedFrame(dt, undefined, performance.now() - workStart);
            }

            frameRef.current = requestAnimationFrame(loop);
        };

        frameRef.current = requestAnimationFrame(loop);
        
        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, [engine, canvasRef, rendererRef, cameraRef]);

    return { fpsRef };
};
