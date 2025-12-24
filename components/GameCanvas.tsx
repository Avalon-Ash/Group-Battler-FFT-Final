
import React, { useRef, useEffect, useCallback } from 'react';
import { Agent, GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { SpriteManager } from '../engine/sprites';
import { Team, ToolType, Skill, Role } from '../types';

// Hooks
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameCamera } from '../hooks/useGameCamera';
import { useGameInput } from '../hooks/useGameInput';

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
    onWin: (team: Team) => void;
    winner: Team | null;
    rematch: () => void;
    transitionPhase: 'IDLE' | 'IN' | 'OUT';
}

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
    const { 
        engine, tool, selectedObstacle, hpInput, selectedAgent, hoveredSkill, 
        isShowcaseMode, spawnMode, draftRole, onSelect, onWin, winner, rematch, transitionPhase 
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
            // Speed of animation Adjusted: 0.4 for slower, majestic float (approx 2.5s duration)
            transitionProgress.current = Math.min(1.0, transitionProgress.current + dt * 0.4);
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
            ctx.translate(-x - logicalW / 2 / camZoom, -y - logicalH / 2 / camZoom);
            
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

    // Win Callback Sync
    useEffect(() => {
        engine.onWin = onWin;
    }, [engine, onWin]);

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
            
            {/* VICTORY SCREEN - Liquid Glass Style */}
            {winner !== null && !isShowcaseMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 pointer-events-auto">
                    <div className="text-center p-10 liquid-glass rounded-3xl animate-bounce-in max-w-md w-full">
                        <h2 className={`text-6xl font-black mb-2 tracking-tighter ${winner === Team.BLUE ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}>
                            {winner === Team.BLUE ? 'VICTORY' : 'DEFEAT'}
                        </h2>
                        <div className="h-1 w-20 mx-auto bg-white/20 rounded-full mb-8"></div>
                        <button onClick={rematch} className="liquid-btn px-10 py-4 rounded-full text-xl font-bold bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-lg w-full">
                            再戰一局
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
