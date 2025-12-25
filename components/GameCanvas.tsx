
import React, { useRef, useEffect, useCallback } from 'react';
import { Agent, GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { SpriteManager } from '../engine/sprites';
import { Team, ToolType, Skill, Role } from '../types';

// Hooks
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameCamera } from '../hooks/useGameCamera';
import { useGameInput } from '../hooks/useGameInput';
import { Icons } from './ui/icons';

interface GameCanvasProps {
    engine: GameEngine;
    tool: ToolType;
    selectedObstacle: string; 
    hpInput: number;
    selectedAgent: Agent | null; 
    hoveredSkill: Skill | null;
    isShowcaseMode: boolean; 
    spawnMode: 'RANDOM' | 'DRAFT';
    draftRole: Role; 
    onSelect: (a: Agent | null) => void;
    // onWin removed - handled by EventBus in parent
    winner: Team | null;
    rematch: () => void;
    nextLevel: () => void; // New Prop
    transitionPhase: 'IDLE' | 'IN' | 'OUT';
}

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
    const { 
        engine, tool, selectedObstacle, hpInput, selectedAgent, hoveredSkill, 
        isShowcaseMode, spawnMode, draftRole, onSelect, winner, rematch, nextLevel, transitionPhase 
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    // Animation State ref (Mutable to avoid re-renders during loop)
    const transitionProgress = useRef(0);
    const lastPhase = useRef(transitionPhase);

    // Lifecycle: Instantiate Renderer ONCE using Lazy Initialization.
    const rendererRef = useRef<GameRenderer | null>(null);
    if (rendererRef.current === null) {
        rendererRef.current = new GameRenderer();
        // Link renderer to engine for camera control
        engine.renderer = rendererRef.current;
    }

    // 1. Camera System
    const { camera, centerCamera, pan, zoom } = useGameCamera(engine);

    // 2. Input System
    const { pressedAgent, draggedObstacle, hoveredHexRef } = useGameInput({
        canvasRef, engine, rendererRef: rendererRef as React.MutableRefObject<GameRenderer>, cameraRef: camera,
        tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
        onSelect, onCameraPan: pan, onCameraZoom: zoom
    });

    // Reset progress when phase changes
    useEffect(() => {
        if (transitionPhase !== lastPhase.current) {
            transitionProgress.current = 0;
            lastPhase.current = transitionPhase;
        }
    }, [transitionPhase]);

    // 3. Render Handler (Memoized)
    const handleDraw = useCallback((ctx: CanvasRenderingContext2D, fps: number) => {
        if (!rendererRef.current) return;

        // --- ANIMATION LOGIC FIX ---
        // Increment progress if we are in a transition
        if (transitionPhase !== 'IDLE') {
            const dt = 1 / 60; // Assume 60fps delta for smoothness or use real dt
            // SPEED ADJUSTED: 0.8 multiplier = ~1.25s duration.
            // Very slow, deliberate movement to allow the Blur to sync perfectly.
            transitionProgress.current = Math.min(1.0, transitionProgress.current + dt * 0.8);
        } else {
            transitionProgress.current = 0;
        }

        rendererRef.current.setTransition(transitionProgress.current, transitionPhase); 
        const highlight = pressedAgent || selectedAgent || null;
        
        // Access fresh hover state directly from ref during render loop
        const currentHoverHex = hoveredHexRef.current;

        rendererRef.current.draw(
            ctx, 
            engine, 
            camera.current, 
            highlight, 
            fps, 
            currentHoverHex, 
            hoveredSkill
        );

        // Draw Ghost Obstacle (Drag Visual Overlay)
        if (draggedObstacle && canvasRef.current) {
            const { type, px, py } = draggedObstacle;
            const { x, y, zoom: camZoom } = camera.current;
            const dpr = window.devicePixelRatio || 1;
            
            ctx.save();
            ctx.scale(dpr, dpr); // Apply High-DPI scale
            
            // Camera Transform
            const logicalW = canvasRef.current.width / dpr;
            const logicalH = canvasRef.current.height / dpr;
            
            ctx.translate(logicalW / 2, logicalH / 2);
            ctx.scale(camZoom, camZoom);
            ctx.translate(-x, -y); // Use simpler translation matching CameraSystem
            
            const sprite = SpriteManager.getObstacleSprite(type);
            const liftOffset = 40; 
            
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 30;
            ctx.globalAlpha = 0.9;
            
            ctx.drawImage(sprite, px - 32, py - 80 - liftOffset);
            ctx.restore();
        }
    }, [engine, transitionPhase, pressedAgent, selectedAgent, hoveredHexRef, hoveredSkill, draggedObstacle, camera]);

    // Resize Logic
    const handleResize = useCallback((w: number, h: number) => {
        if (w > 0 && h > 0) {
            centerCamera(w, h);
        }
    }, [centerCamera]);

    // 4. Game Loop Hook
    const { fpsRef } = useGameLoop(
        engine, 
        canvasRef, 
        wrapperRef, 
        rendererRef, 
        handleDraw, 
        handleResize
    );

    // Initial Camera Center
    useEffect(() => {
        if (wrapperRef.current) {
            const t = setTimeout(() => {
                if (wrapperRef.current) {
                    centerCamera(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight);
                }
            }, 100);
            return () => clearTimeout(t);
        }
    }, [engine.mapConfig.w, engine.mapConfig.h, isShowcaseMode, transitionPhase, centerCamera]);

    return (
        <div ref={wrapperRef} className="w-full h-full overflow-hidden relative bg-slate-950">
            <canvas 
                ref={canvasRef} 
                className="block w-full h-full"
                style={{ 
                    backgroundColor: engine.currentScene.background,
                    touchAction: 'none' 
                }} 
                onContextMenu={(e) => e.preventDefault()}
            />
            
            {/* VICTORY SCREEN - God View Style */}
            {winner !== null && !isShowcaseMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 pointer-events-auto">
                    <div className="text-center p-10 liquid-glass rounded-3xl animate-bounce-in max-w-lg w-full border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        
                        {/* Winner Label */}
                        <div className="mb-6">
                            <span className="text-xs font-mono font-bold tracking-[0.5em] text-slate-400 uppercase block mb-2">Simulation Complete</span>
                            <h2 className={`text-5xl md:text-6xl font-black tracking-tighter ${winner === Team.BLUE ? 'text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]' : 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]'}`}>
                                {winner === Team.BLUE ? 'IMPERIAL' : 'COVENANT'}
                            </h2>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-widest mt-1 opacity-90">
                                VICTORY
                            </h2>
                        </div>

                        <div className="h-px w-24 mx-auto bg-white/20 rounded-full mb-8"></div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={rematch} 
                                className="liquid-btn px-8 py-4 rounded-xl text-lg font-bold bg-white/5 hover:bg-white/10 border-white/20 text-slate-200 shadow-lg w-full flex items-center justify-center gap-3 group"
                            >
                                <Icons.Restart className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:-rotate-90 transition-all" />
                                <span>再戰一局 (Rematch)</span>
                            </button>
                            
                            <button 
                                onClick={nextLevel} 
                                className="liquid-btn-primary px-8 py-4 rounded-xl text-lg font-bold shadow-lg w-full flex items-center justify-center gap-3 group"
                            >
                                <Icons.Dice className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>前進下一關 (Next Level)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
