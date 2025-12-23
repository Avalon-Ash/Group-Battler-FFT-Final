
// Added missing React and hook imports
import React, { useRef, useEffect } from 'react';
import { Agent, GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { HexUtils } from '../engine/utils';
import { Team, ToolType, Hex, Skill, GameEvent } from '../types';
import { BLOCK_HEIGHT } from '../constants'; 

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
    
    // Touch specific state
    const lastPinchDist = useRef<number>(0);
    const lastTouchPos = useRef<{x: number, y: number} | null>(null);

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
        const centerHex = { q: Math.floor(cw / 2), r: Math.floor(ch / 2) };
        const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
        
        // Visual adjustments
        const verticalOffset = -BLOCK_HEIGHT * 2; 

        // Center Point Formula: WorldPos - (ScreenSize / Zoom) / 2
        camera.current.x = p.x - (canvasRef.current.width / camera.current.zoom) / 2;
        camera.current.y = p.y + verticalOffset - (canvasRef.current.height / camera.current.zoom) / 2;
    };

    // Auto-Center Triggers
    useEffect(() => {
        if (isShowcaseMode || transitionPhase === 'IN') {
            const t = setTimeout(centerCamera, 350);
            return () => clearTimeout(t);
        } else if (!isShowcaseMode && transitionPhase === 'IDLE') {
             const t = setTimeout(centerCamera, 350);
             return () => clearTimeout(t);
        }
    }, [isShowcaseMode, transitionPhase, engine.mapConfig.w, engine.mapConfig.h]);

    // Resize Observer for Fluid Layout
    useEffect(() => {
        if (!wrapperRef.current || !canvasRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (wrapperRef.current && canvasRef.current) {
                canvasRef.current.width = wrapperRef.current.clientWidth;
                canvasRef.current.height = wrapperRef.current.clientHeight;
                
                if (engine.agents.length === 0) {
                    centerCamera();
                }
                drawCurrentFrameRef.current();
            }
        });

        resizeObserver.observe(wrapperRef.current);
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

        const drawFrame = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                const highlight = draggedAgentRef.current || selectedAgentRef.current || null;
                rendererRef.current.draw(ctx, engine, camera.current, highlight, fpsRef.current, hoveredHexRef.current, hoveredSkill); 
            }
        };

        drawCurrentFrameRef.current = drawFrame;

        const loop = (t: number) => {
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
                if (acc > 200) acc = 200;
                
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
            
            rendererRef.current.update(dt / 1000, engine);
            
            if (transitionPhase !== 'IDLE') {
                const elapsed = (performance.now() - transitionStartTime.current) / 1000;
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

        const getScreenCoords = (x: number, y: number) => {
            const rect = cvs.getBoundingClientRect();
            return {
                x: x - rect.left,
                y: y - rect.top
            };
        };

        const getHexFromCoords = (sx: number, sy: number) => {
            const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, camera.current, engine);
            if (hex) return hex;

            return HexUtils.fromPx(
                sx / camera.current.zoom + camera.current.x,
                sy / camera.current.zoom + camera.current.y,
                engine.mapConfig
            );
        };

        const getHitAgentFromCoords = (sx: number, sy: number) => {
            const wx = sx / camera.current.zoom + camera.current.x;
            const wy = sy / camera.current.zoom + camera.current.y;
            const sorted = [...engine.agents].sort((a, b) => b.py - a.py);
            
            for (const agent of sorted) {
                if (agent.hp <= 0 && agent.fullyDead) continue;
                const h = rendererRef.current.getTerrainHeight(agent.q, agent.r, engine);
                const baseX = agent.px;
                const baseY = agent.py - h;
                const dx = Math.abs(wx - baseX);
                const dy = wy - (baseY - 40); 
                if (dx < 30 && Math.abs(dy) < 50) return agent;
            }
            return null;
        };

        const getWorldPosFromCoords = (sx: number, sy: number) => {
            const wx = sx / camera.current.zoom + camera.current.x;
            const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, camera.current, engine);
            let h = BLOCK_HEIGHT + 6;
            if (hex) h = rendererRef.current.getTerrainHeight(hex.q, hex.r, engine);
            const wy = sy / camera.current.zoom + camera.current.y + h;
            return { x: wx, y: wy };
        };

        const handleActionAt = (h: Hex) => {
            if (engine.isRunning || winner !== null) return;
            const k = HexUtils.key(h);
            if (lastPaintHex.current === k) return; 
            
            lastPaintHex.current = k;
            if (tool === ToolType.ADD_BLUE) engine.addAgent(Team.BLUE, h.q, h.r, hpInput);
            else if (tool === ToolType.ADD_RED) engine.addAgent(Team.RED, h.q, h.r, hpInput);
            else if (tool === ToolType.OBSTACLE) {
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

        // SHARED DOWN
        const handleDown = (sx: number, sy: number, button: number = 0) => {
            pointerDownStart.current = { x: sx, y: sy };

            if (button === 2) {
                isPanning.current = true;
                pendingAction.current = false;
                return;
            }

            const hitAgent = getHitAgentFromCoords(sx, sy);
            if (hitAgent && tool === ToolType.SELECT) {
                pendingAction.current = false;
                onSelect(hitAgent);
                if (!engine.isRunning) {
                    draggedAgentRef.current = hitAgent;
                    dragStartHex.current = { q: hitAgent.q, r: hitAgent.r };
                    isDraggingUnit.current = true;
                }
                return;
            }

            const h = getHexFromCoords(sx, sy);
            const gridAgent = engine.getAgentAt(h.q, h.r);
            if (gridAgent && tool === ToolType.SELECT && !hitAgent) {
                 pendingAction.current = false;
                 onSelect(gridAgent);
                 if (!engine.isRunning) {
                    draggedAgentRef.current = gridAgent;
                    dragStartHex.current = { q: gridAgent.q, r: gridAgent.r };
                    isDraggingUnit.current = true;
                 }
                 return;
            }

            pendingAction.current = true;
            isPanning.current = false;
            
            if (!engine.isRunning && tool !== ToolType.SELECT) {
                isPainting.current = true;
                lastPaintHex.current = ""; 
                if (engine.isValid(h.q, h.r)) {
                    handleActionAt(h);
                }
            }
        };

        // SHARED MOVE
        const handleMove = (sx: number, sy: number, dx: number, dy: number) => {
            const h = getHexFromCoords(sx, sy);
            hoveredHexRef.current = engine.isValid(h.q, h.r) ? h : null;

            if (tool === ToolType.SELECT && !isDraggingUnit.current && !isPanning.current) {
                const hit = getHitAgentFromCoords(sx, sy);
                if (cvs) cvs.style.cursor = hit ? 'pointer' : 'default';
            } else if (isDraggingUnit.current && cvs) {
                cvs.style.cursor = 'grabbing';
            }

            if (isPanning.current) {
                camera.current.x -= dx / camera.current.zoom;
                camera.current.y -= dy / camera.current.zoom;
                return;
            }

            if (isDraggingUnit.current && draggedAgentRef.current) {
                const wPos = getWorldPosFromCoords(sx, sy);
                draggedAgentRef.current.px = wPos.x;
                draggedAgentRef.current.py = wPos.y;
                return;
            }

            if (isPainting.current && !engine.isRunning) {
                if (engine.isValid(h.q, h.r)) {
                    handleActionAt(h);
                }
            }

            if (pendingAction.current && pointerDownStart.current && !isPainting.current) {
                const dist = Math.sqrt((sx - pointerDownStart.current.x)**2 + (sy - pointerDownStart.current.y)**2);
                if (dist > 5) {
                    pendingAction.current = false;
                    isPanning.current = true;
                    camera.current.x -= dx / camera.current.zoom;
                    camera.current.y -= dy / camera.current.zoom;
                }
            }
        };

        // SHARED UP
        const handleUp = (sx: number, sy: number) => {
            isPainting.current = false;
            lastPaintHex.current = "";

            if (isPanning.current) {
                isPanning.current = false;
                pointerDownStart.current = null;
                return;
            }

            if (isDraggingUnit.current && draggedAgentRef.current) {
                const h = getHexFromCoords(sx, sy);
                const agent = draggedAgentRef.current;
                const isValidHex = engine.isValid(h.q, h.r);
                const isObstacle = engine.obstacles.has(HexUtils.key(h));
                const occupant = engine.getAgentAt(h.q, h.r);
                const isOccupiedByOther = occupant && occupant !== agent;

                if (isValidHex && !isObstacle && !isOccupiedByOther) {
                    engine.updateAgentPosition(agent, h.q, h.r);
                    const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                    agent.px = p.x; agent.py = p.y;
                } else {
                    if (dragStartHex.current) {
                        agent.q = dragStartHex.current.q;
                        agent.r = dragStartHex.current.r;
                        const p = HexUtils.toPx(agent.q, agent.r, engine.mapConfig);
                        agent.px = p.x; agent.py = p.y;
                        engine.updateAgentPosition(agent, agent.q, agent.r);
                    }
                }

                draggedAgentRef.current = null;
                dragStartHex.current = null;
                isDraggingUnit.current = false;
                onSelect(agent);
                if (cvs) cvs.style.cursor = 'default';
                return;
            }

            if (pendingAction.current) {
                pendingAction.current = false;
                if (tool === ToolType.SELECT) {
                    const hitAgent = getHitAgentFromCoords(sx, sy);
                    if (hitAgent) onSelect(hitAgent);
                    else onSelect(null);
                } 
            }
            pointerDownStart.current = null;
        };

        // Mouse Listeners
        const handleMouseDown = (e: MouseEvent) => {
            const pos = getScreenCoords(e.clientX, e.clientY);
            handleDown(pos.x, pos.y, e.button);
        };
        const handleMouseMove = (e: MouseEvent) => {
            const pos = getScreenCoords(e.clientX, e.clientY);
            handleMove(pos.x, pos.y, e.movementX, e.movementY);
        };
        const handleMouseUp = (e: MouseEvent) => {
            const pos = getScreenCoords(e.clientX, e.clientY);
            handleUp(pos.x, pos.y);
        };

        // Touch Listeners
        const onTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const pos = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                lastTouchPos.current = pos;
                handleDown(pos.x, pos.y, 0);
            } else if (e.touches.length === 2) {
                const t1 = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                const t2 = getScreenCoords(e.touches[1].clientX, e.touches[1].clientY);
                lastPinchDist.current = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                // When 2 fingers down, cancel single finger drag/selection
                pendingAction.current = false;
                isDraggingUnit.current = false;
                draggedAgentRef.current = null;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 1 && lastTouchPos.current) {
                const pos = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                const dx = pos.x - lastTouchPos.current.x;
                const dy = pos.y - lastTouchPos.current.y;
                handleMove(pos.x, pos.y, dx, dy);
                lastTouchPos.current = pos;
            } else if (e.touches.length === 2) {
                const t1 = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                const t2 = getScreenCoords(e.touches[1].clientX, e.touches[1].clientY);
                const currentDist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                
                if (lastPinchDist.current > 0) {
                    const delta = currentDist - lastPinchDist.current;
                    const zoomSensitivity = 0.005;
                    camera.current.zoom = Math.max(0.5, Math.min(3.0, camera.current.zoom + delta * zoomSensitivity));
                }
                lastPinchDist.current = currentDist;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            if (e.changedTouches.length > 0 && lastTouchPos.current) {
                const pos = getScreenCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                handleUp(pos.x, pos.y);
            }
            lastTouchPos.current = null;
            lastPinchDist.current = 0;
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
        
        // Mobile touch events
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            cvs.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            cvs.removeEventListener('wheel', handleWheel);
            cvs.removeEventListener('contextmenu', handleContextMenu);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
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
