
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
    
    // Lifecycle: Instantiate Renderer ONCE using Lazy Initialization.
    const rendererRef = useRef<GameRenderer | null>(null);
    if (rendererRef.current === null) {
        rendererRef.current = new GameRenderer();
    }

    // 1. Camera System
    const { camera, centerCamera, pan, zoom } = useGameCamera(engine);

    // 2. Input System
    // Note: hoveredHexRef is a RefObject now, keeping the value fresh across renders
    const { pressedAgent, draggedObstacle, hoveredHexRef } = useGameInput({
        canvasRef, engine, rendererRef: rendererRef as React.MutableRefObject<GameRenderer>, cameraRef: camera,
        tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
        onSelect, onCameraPan: pan, onCameraZoom: zoom
    });

    // 3. Render Handler (Memoized)
    const handleDraw = useCallback((ctx: CanvasRenderingContext2D, fps: number) => {
        if (!rendererRef.current) return;

        rendererRef.current.setTransition(0, transitionPhase); 
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
            // Note: Canvas Context is already scaled by DPR in renderer.draw(),
            // but we need to ensure this overlays correctly.
            // However, drawGhost is ad-hoc here.
            // For safety, let's rely on simple screen space mapping provided by the camera transform manually.
            
            // To be strict, we should implement Ghost rendering inside Renderer to share the DPR context state.
            // But for this patch, we assume standard behavior.
            
            const { type, px, py } = draggedObstacle;
            const { x, y, zoom: camZoom } = camera.current;
            const dpr = window.devicePixelRatio || 1;
            
            // Note: renderer.draw() ends with state restored. We need to re-apply DPR scale here manually
            // or trust the context is clean (identity).
            // Since we are drawing on top, we need to respect the scaling.
            
            ctx.save();
            ctx.scale(dpr, dpr); // Apply High-DPI scale
            
            // Camera Transform
            // We use the logical width/height for centering
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

    // Resize Logic (Called by useGameLoop via Debounce)
    // Now receives LOGICAL width/height to avoid DOM thrashing
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
                className="block shadow-inner w-full h-full"
                style={{ 
                    backgroundColor: engine.currentScene.background,
                    touchAction: 'none' 
                }} 
                onContextMenu={(e) => e.preventDefault()}
            />
            
            {/* VICTORY SCREEN */}
            {winner !== null && !isShowcaseMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50 pointer-events-auto">
                    <div className="text-center p-8 bg-slate-900 rounded-lg border border-slate-700 shadow-2xl animate-bounce-in">
                        <h2 className={`text-4xl font-bold mb-4 font-serif tracking-widest ${winner === Team.BLUE ? 'text-blue-400' : 'text-red-400'}`}>
                            {winner === Team.BLUE ? 'VICTORY' : 'DEFEAT'}
                        </h2>
                        <button onClick={rematch} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded border border-slate-500">REMATCH</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
