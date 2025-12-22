
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { HexUtils } from '../engine/utils';
import { Team, ToolType, Hex, Skill, GameEvent } from '../types';
import { BLOCK_HEIGHT, HEX_SIZE } from '../constants'; 

interface GameCanvasProps {
    engine: GameEngine;
    tool: ToolType;
    selectedObstacle: string; // New: Specific type
    hpInput: number;
    selectedAgent: Agent | null; 
    hoveredSkill: Skill | null;
    isShowcaseMode: boolean; 
    onSelect: (a: Agent | null) => void;
    onWin: (team: Team) => void;
    winner: Team | null;
    rematch: () => void;
    transitionPhase: 'IDLE' | 'IN' | 'OUT';
}

const GameCanvas: React.FC<GameCanvasProps> = ({ engine, tool, selectedObstacle, hpInput, selectedAgent, hoveredSkill, isShowcaseMode, onSelect, onWin, winner, rematch, transitionPhase }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 }); // Adjusted default zoom
    const fpsRef = useRef(60);
    
    // Instantiate Renderer
    const rendererRef = useRef(new GameRenderer());
    const transitionStartTime = useRef(0);
    
    // Bridge for Synchronous Redraw (Fixes black flash on resize)
    const drawCurrentFrameRef = useRef<() => void>(() => {});

    // Handle Transition Phase Timing
    useEffect(() => {
        transitionStartTime.current = performance.now();
    }, [transitionPhase]);

    // Interaction State
    const draggedAgentRef = useRef<Agent | null>(null);
    const dragStartHex = useRef<{q: number, r: number} | null>(null);
    const isDraggingUnit = useRef(false);
    
    const isPanning = useRef(false);
    const isPainting = useRef(false); // New: Track if painting
    const lastPaintHex = useRef<string>(""); // Prevent spamming same tile

    const pointerDownStart = useRef<{x: number, y: number} | null>(null);
    const pendingAction = useRef<boolean>(false); 
    
    // Track hovered hex for visual feedback
    const hoveredHexRef = useRef<Hex | null>(null);

    // Track selected agent for the render loop
    const selectedAgentRef = useRef<Agent | null>(selectedAgent);
    useEffect(() => {
        selectedAgentRef.current = selectedAgent;
    }, [selectedAgent]);

    // --- Camera Control Logic ---
    const centerCamera = () => {
        if (!canvasRef.current || !wrapperRef.current) return;
        
        // Ensure dims are fresh
        canvasRef.current.width = wrapperRef.current.clientWidth;
        canvasRef.current.height = wrapperRef.current.clientHeight;

        const cw = engine.mapConfig.w;
        const ch = engine.mapConfig.h;
        
        // Calculate grid visual center
        // Grid Top-Left is roughly (0,0) in Axial
        // Center is (w/2, h/2)
        const centerHex = { q: Math.floor(cw / 2), r: Math.floor(ch / 2) };
        const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
        
        // Visual adjustments
        // 1. Terrain Height offset: Blocks go "up" (negative Y), so the visual center of the top face is higher than p.y
        // We estimate average height to be around 2 blocks
        const verticalOffset = -BLOCK_HEIGHT * 2; 

        // Center Point Formula: WorldPos - (ScreenSize / Zoom) / 2
        camera.current.x = p.x - (canvasRef.current.width / camera.current.zoom) / 2;
        camera.current.y = p.y + verticalOffset - (canvasRef.current.height / camera.current.zoom) / 2;
    };

    // Auto-Center Triggers
    useEffect(() => {
        // Trigger centering when:
        // 1. Transition IN starts (New map generated in Showcase)
        // 2. Showcase Mode is entered toggled on
        // 3. Map dimensions change (manual settings)
        if (isShowcaseMode || transitionPhase === 'IN') {
            // Wait for CSS transition (300ms) to finish before centering
            const t = setTimeout(centerCamera, 350);
            return () => clearTimeout(t);
        } else if (!isShowcaseMode && transitionPhase === 'IDLE') {
             // Also recenter when exiting showcase mode
             const t = setTimeout(centerCamera, 350);
             return () => clearTimeout(t);
        }
    }, [isShowcaseMode, transitionPhase, engine.mapConfig.w, engine.mapConfig.h]);

    // Resize Observer for Fluid Layout
    useEffect(() => {
        if (!wrapperRef.current || !canvasRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (wrapperRef.current && canvasRef.current) {
                // Immediately update canvas resolution to match container
                canvasRef.current.width = wrapperRef.current.clientWidth;
                canvasRef.current.height = wrapperRef.current.clientHeight;
                
                // If map is empty (initial load), center it
                if (engine.agents.length === 0) {
                    centerCamera();
                }

                // CRITICAL FIX: Synchronous Redraw
                // Immediately draw the frame to prevent the canvas from appearing blank/black 
                // between the resize (clear) and the next animation frame.
                drawCurrentFrameRef.current();
            }
        });

        resizeObserver.observe(wrapperRef.current);

        // Force initial center
        centerCamera();

        return () => resizeObserver.disconnect();
    }, [engine]);

    // Render Loop
    useEffect(() => {
        let frameId: number;
        let lastTime = 0;
        let acc = 0;
        const targetFPS = 60;
        const step = 1000 / targetFPS;
        let frameCount = 0;
        let lastFpsTime = 0;

        // Define draw function that can be called externally via ref
        const drawFrame = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                const highlight = draggedAgentRef.current || selectedAgentRef.current || null;
                rendererRef.current.draw(ctx, engine, camera.current, highlight, fpsRef.current, hoveredHexRef.current, hoveredSkill); 
            }
        };

        // Assign to ref for ResizeObserver
        drawCurrentFrameRef.current = drawFrame;

        const loop = (t: number) => {
            if (!lastTime) lastTime = t;
            const dt = t - lastTime;
            lastTime = t;

            // Measure FPS
            frameCount++;
            if (t - lastFpsTime >= 1000) {
                fpsRef.current = frameCount;
                frameCount = 0;
                lastFpsTime = t;
            }

            // Logic Step
            if (engine.isRunning) {
                acc += dt;
                if (acc > 200) acc = 200;
                
                const frameEvents: GameEvent[] = [];

                while (acc >= step) {
                    const sdt = (step / 1000) * engine.timeScale;
                    engine.tick(sdt);
                    engine.battleTime += sdt;
                    acc -= step;
                    
                    // Collect events from this tick to avoid dropping them
                    // or processing them multiple times in the render loop
                    frameEvents.push(...engine.events);
                }
                
                // Only process events if we actually ticked logic this frame
                if (frameEvents.length > 0) {
                    rendererRef.current.processEventsWithEngine(frameEvents, engine);
                }
            }
            
            // Visual Update
            rendererRef.current.update(dt / 1000, engine);
            
            // Handle Transition Animation Progress
            if (transitionPhase !== 'IDLE') {
                const elapsed = (performance.now() - transitionStartTime.current) / 1000;
                // Transition usually lasts 1.5s total logic in App, let's map 0-1 over 1.2s for visual
                const progress = Math.min(1.0, elapsed / 1.2);
                rendererRef.current.setTransition(progress, transitionPhase);
            } else {
                rendererRef.current.setTransition(0, 'IDLE');
            }

            drawFrame();
            frameId = requestAnimationFrame(loop);
        };

        engine.onWin = (team) => {
            onWin(team);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [engine, onWin, hoveredSkill, transitionPhase]);

    // Input Handling
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const getHexFromEvent = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Use renderer's accurate 3D picking logic
            const hex = rendererRef.current.getHexAtScreenPoint(mouseX, mouseY, camera.current, engine);
            if (hex) return hex;

            // Picking fallback in 3D is tricky, we rely on the grid system's robustness
            return HexUtils.fromPx(
                mouseX / camera.current.zoom + camera.current.x,
                mouseY / camera.current.zoom + camera.current.y,
                engine.mapConfig
            );
        };

        const getWorldPosFromEvent = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const wx = mouseX / camera.current.zoom + camera.current.x;
            
            // Get height at this position (approximate)
            const hex = rendererRef.current.getHexAtScreenPoint(mouseX, mouseY, camera.current, engine);
            let h = BLOCK_HEIGHT + 6;
            if (hex) h = rendererRef.current.getTerrainHeight(hex.q, hex.r, engine);
            
            const wy = mouseY / camera.current.zoom + camera.current.y + h;
            return { x: wx, y: wy };
        };

        const handleActionAt = (h: Hex) => {
            if (engine.isRunning || winner !== null) return;
            const k = HexUtils.key(h);
            if (lastPaintHex.current === k) return; // Prevent spam on same tile
            
            lastPaintHex.current = k;

            if (tool === ToolType.ADD_BLUE) engine.addAgent(Team.BLUE, h.q, h.r, hpInput);
            else if (tool === ToolType.ADD_RED) engine.addAgent(Team.RED, h.q, h.r, hpInput);
            else if (tool === ToolType.OBSTACLE) {
                // Ensure we remove agent if painting over
                if (engine.getAgentAt(h.q, h.r)) engine.removeAgent(h.q, h.r);
                engine.setObstacle(h.q, h.r, selectedObstacle);
            }
            else if (tool === ToolType.DELETE) {
                if (engine.hasObstacle(h.q, h.r)) engine.removeObstacle(h.q, h.r);
                if (engine.getAgentAt(h.q, h.r)) {
                    engine.removeAgent(h.q, h.r);
                    onSelect(null);
                }
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            pointerDownStart.current = { x: e.clientX, y: e.clientY };

            if (e.button === 2) {
                isPanning.current = true;
                pendingAction.current = false;
                return;
            }

            const h = getHexFromEvent(e);
            const agent = engine.getAgentAt(h.q, h.r);
            
            if (agent && tool === ToolType.SELECT) {
                // Clicking a unit in Select Mode -> Select/Drag
                pendingAction.current = false;
                onSelect(agent);
                if (!engine.isRunning) {
                    draggedAgentRef.current = agent;
                    dragStartHex.current = { q: agent.q, r: agent.r };
                    isDraggingUnit.current = true;
                }
                return;
            }

            // Clicking empty space or Painting tools -> Start Painting/Action
            pendingAction.current = true;
            isPanning.current = false;
            
            // If tool is a "painting" tool, start immediate paint
            if (!engine.isRunning && tool !== ToolType.SELECT) {
                isPainting.current = true;
                lastPaintHex.current = ""; // Reset
                if (engine.isValid(h.q, h.r)) {
                    handleActionAt(h);
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const h = getHexFromEvent(e);
            if (engine.isValid(h.q, h.r)) {
                hoveredHexRef.current = h;
            } else {
                hoveredHexRef.current = null;
            }

            if (isPanning.current) {
                camera.current.x -= e.movementX / camera.current.zoom;
                camera.current.y -= e.movementY / camera.current.zoom;
                return;
            }

            if (isDraggingUnit.current && draggedAgentRef.current) {
                const wPos = getWorldPosFromEvent(e);
                draggedAgentRef.current.px = wPos.x;
                draggedAgentRef.current.py = wPos.y;
                return;
            }

            // Paint Mode Logic
            if (isPainting.current && !engine.isRunning) {
                if (engine.isValid(h.q, h.r)) {
                    handleActionAt(h);
                }
            }

            if (pendingAction.current && pointerDownStart.current && !isPainting.current) {
                const dx = e.clientX - pointerDownStart.current.x;
                const dy = e.clientY - pointerDownStart.current.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    pendingAction.current = false;
                    isPanning.current = true;
                    camera.current.x -= e.movementX / camera.current.zoom;
                    camera.current.y -= e.movementY / camera.current.zoom;
                }
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            isPainting.current = false;
            lastPaintHex.current = "";

            if (isPanning.current) {
                isPanning.current = false;
                pointerDownStart.current = null;
                return;
            }

            if (isDraggingUnit.current && draggedAgentRef.current) {
                const h = getHexFromEvent(e);
                const agent = draggedAgentRef.current;
                const isValidHex = engine.isValid(h.q, h.r);
                const isObstacle = engine.obstacles.has(HexUtils.key(h));
                const occupant = engine.getAgentAt(h.q, h.r);
                const isOccupiedByOther = occupant && occupant !== agent;

                if (isValidHex && !isObstacle && !isOccupiedByOther) {
                    agent.q = h.q;
                    agent.r = h.r;
                    const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                    agent.px = p.x;
                    agent.py = p.y;
                } else {
                    if (dragStartHex.current) {
                        agent.q = dragStartHex.current.q;
                        agent.r = dragStartHex.current.r;
                        const p = HexUtils.toPx(agent.q, agent.r, engine.mapConfig);
                        agent.px = p.x;
                        agent.py = p.y;
                    }
                }

                draggedAgentRef.current = null;
                dragStartHex.current = null;
                isDraggingUnit.current = false;
                onSelect(agent);
                return;
            }

            if (pendingAction.current) {
                pendingAction.current = false;
                const h = getHexFromEvent(e);
                
                if (tool === ToolType.SELECT) {
                    onSelect(null);
                } 
                // Note: Painting logic handles the click action in MouseDown usually, 
                // but if we just clicked without moving, MouseDown handled it.
            }
            
            pointerDownStart.current = null;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            camera.current.zoom = Math.max(0.5, Math.min(3.0, camera.current.zoom + delta));
        };
        
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        cvs.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        cvs.addEventListener('wheel', handleWheel, { passive: false });
        cvs.addEventListener('contextmenu', handleContextMenu);

        return () => {
            cvs.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            cvs.removeEventListener('wheel', handleWheel);
            cvs.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [engine, tool, selectedObstacle, hpInput, onSelect, winner]);

    return (
        <div ref={wrapperRef} className="flex-1 overflow-hidden relative bg-slate-950 border-r border-slate-700">
            <canvas 
                ref={canvasRef} 
                className={`block shadow-inner ${tool === ToolType.SELECT ? 'cursor-default' : 'cursor-crosshair'}`}
                style={{ backgroundColor: engine.currentScene.background }} 
            />
            
            {/* STANDARD MODE VICTORY SCREEN */}
            {winner !== null && !isShowcaseMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
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
