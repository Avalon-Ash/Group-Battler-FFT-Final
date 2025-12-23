
import React, { useRef, useEffect } from 'react';
import { Agent, GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { HexUtils } from '../engine/utils';
import { SpriteManager } from '../engine/sprites';
import { Team, ToolType, Hex, Skill, GameEvent, Role } from '../types';
import { BLOCK_HEIGHT } from '../constants'; 

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

const GameCanvas: React.FC<GameCanvasProps> = ({ engine, tool, selectedObstacle, hpInput, selectedAgent, hoveredSkill, isShowcaseMode, spawnMode, draftRole, onSelect, onWin, winner, rematch, transitionPhase }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 }); 
    const fpsRef = useRef(60);
    
    // Instantiate Renderer
    const rendererRef = useRef(new GameRenderer());
    const transitionStartTime = useRef(0);
    
    // Bridge for Synchronous Redraw
    const drawCurrentFrameRef = useRef<() => void>(() => {});

    // Handle Transition Phase Timing
    useEffect(() => {
        transitionStartTime.current = performance.now();
    }, [transitionPhase]);

    // --- INTERACTION STATE ---
    // Interaction Mode State Machine
    type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAN' | 'PAINT';
    const interactionMode = useRef<InteractionMode>('IDLE');

    // Unit Dragging
    const pressedAgentRef = useRef<Agent | null>(null);
    
    // Obstacle Dragging
    const draggedObstacleRef = useRef<{ 
        type: string; 
        originQ: number; 
        originR: number; 
        px: number; 
        py: number; 
    } | null>(null);

    // General Input State
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const dragStartHex = useRef<{q: number, r: number} | null>(null);
    const lastPaintHex = useRef<string>(""); 

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
        
        canvasRef.current.width = wrapperRef.current.clientWidth;
        canvasRef.current.height = wrapperRef.current.clientHeight;

        const cw = engine.mapConfig.w;
        const ch = engine.mapConfig.h;
        
        const centerHex = { q: Math.floor(cw / 2), r: Math.floor(ch / 2) };
        const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
        const verticalOffset = -BLOCK_HEIGHT * 2; 

        camera.current.x = p.x - (canvasRef.current.width / camera.current.zoom) / 2;
        camera.current.y = p.y + verticalOffset - (canvasRef.current.height / camera.current.zoom) / 2;
    };

    useEffect(() => {
        if (isShowcaseMode || transitionPhase === 'IN') {
            const t = setTimeout(centerCamera, 350);
            return () => clearTimeout(t);
        } else if (!isShowcaseMode && transitionPhase === 'IDLE') {
             const t = setTimeout(centerCamera, 350);
             return () => clearTimeout(t);
        }
    }, [isShowcaseMode, transitionPhase, engine.mapConfig.w, engine.mapConfig.h]);

    useEffect(() => {
        if (!wrapperRef.current || !canvasRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (wrapperRef.current && canvasRef.current) {
                canvasRef.current.width = wrapperRef.current.clientWidth;
                canvasRef.current.height = wrapperRef.current.clientHeight;
                if (engine.agents.length === 0) centerCamera();
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
            if (ctx && canvasRef.current) {
                const highlight = pressedAgentRef.current || selectedAgentRef.current || null;
                rendererRef.current.draw(ctx, engine, camera.current, highlight, fpsRef.current, hoveredHexRef.current, hoveredSkill); 
                
                // Draw Dragged Obstacle Ghost
                if (draggedObstacleRef.current) {
                    const { type, px, py } = draggedObstacleRef.current;
                    const { x, y, zoom } = camera.current;
                    const { width, height } = canvasRef.current;
                    
                    ctx.save();
                    ctx.translate(width / 2, height / 2);
                    ctx.scale(zoom, zoom);
                    ctx.translate(-x - width / 2 / zoom, -y - height / 2 / zoom);
                    
                    const sprite = SpriteManager.getObstacleSprite(type);
                    const liftOffset = 40; // Higher lift for visibility
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 30;
                    ctx.shadowOffsetY = 30;
                    ctx.globalAlpha = 0.9;
                    // Adjusted offset from 86 to 80 to match engine renderer
                    ctx.drawImage(sprite, px - 32, py - 80 - liftOffset);
                    ctx.restore();
                }
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

        engine.onWin = (team) => { onWin(team); };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [engine, onWin, hoveredSkill, transitionPhase]);

    // Input Handling
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const getScreenCoords = (x: number, y: number) => {
            const rect = cvs.getBoundingClientRect();
            return { x: x - rect.left, y: y - rect.top };
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
                if (dx < 35 && Math.abs(dy) < 60) return agent;
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

        const executeToolAction = (h: Hex) => {
            if (engine.isRunning || winner !== null) return;
            const k = HexUtils.key(h);
            if (lastPaintHex.current === k) return; 
            
            lastPaintHex.current = k;
            const existingAgent = engine.getAgentAt(h.q, h.r);
            let agent: Agent | null = null;

            if (tool === ToolType.DELETE) {
                if (engine.hasObstacle(h.q, h.r)) engine.removeObstacle(h.q, h.r);
                if (existingAgent) {
                    engine.removeAgent(h.q, h.r);
                    onSelect(null);
                }
                return;
            }

            if (tool === ToolType.OBSTACLE) {
                if (existingAgent) engine.removeAgent(h.q, h.r);
                engine.setObstacle(h.q, h.r, selectedObstacle);
                return;
            }

            if (!existingAgent && !engine.hasObstacle(h.q, h.r)) {
                if (tool === ToolType.ADD_BLUE) agent = engine.addAgent(Team.BLUE, h.q, h.r, hpInput);
                else if (tool === ToolType.ADD_RED) agent = engine.addAgent(Team.RED, h.q, h.r, hpInput);
            }

            if (agent && spawnMode === 'DRAFT') {
                agent.role = draftRole;
                const validSkills = engine.skillDB.filter(s => s.role === agent!.role && (s.team === undefined || s.team === agent!.team));
                const rnd = (ar: Skill[]) => ar.length > 0 ? ar[Math.floor(Math.random() * ar.length)].id : null;
                agent.skillIds = [
                    rnd(validSkills.filter(s => s.tag === 'ULT')),
                    rnd(validSkills.filter(s => s.tag === 'ACTIVE')),
                    rnd(validSkills.filter(s => s.tag === 'BASIC'))
                ];
                agent.saveState();
                agent.reset(engine.mapConfig);
            }
        };

        // --- UNIFIED INPUT HANDLER ---

        const handleDown = (sx: number, sy: number, button: number = 0) => {
            pressStartPos.current = { x: sx, y: sy };
            lastPaintHex.current = "";
            interactionMode.current = 'DOWN';

            // Right Click always Pans
            if (button === 2) {
                interactionMode.current = 'PAN';
                return;
            }

            if (engine.isRunning) {
                interactionMode.current = 'PAN';
                return;
            }

            // Identify potential targets for drag start
            const hitAgent = getHitAgentFromCoords(sx, sy);
            if (hitAgent) {
                pressedAgentRef.current = hitAgent;
                if (tool !== ToolType.DELETE) {
                    dragStartHex.current = { q: hitAgent.q, r: hitAgent.r };
                }
                // Don't set mode to DRAG_UNIT yet, wait for move threshold
                return;
            }

            // Check Obstacle
            const h = getHexFromCoords(sx, sy);
            const validGrid = engine.isValid(h.q, h.r);
            
            if (validGrid && engine.hasObstacle(h.q, h.r)) {
                if (tool !== ToolType.DELETE) {
                    // Pre-load obstacle drag data but don't activate
                    const obsType = engine.obstacles.get(HexUtils.key(h));
                    if (obsType) {
                        draggedObstacleRef.current = {
                            type: obsType,
                            originQ: h.q, originR: h.r,
                            px: 0, py: 0
                        };
                    }
                }
            }
        };

        const handleMove = (sx: number, sy: number, dx: number, dy: number) => {
            const h = getHexFromCoords(sx, sy);
            hoveredHexRef.current = engine.isValid(h.q, h.r) ? h : null;

            // Cursor Logic
            const hitAgent = getHitAgentFromCoords(sx, sy);
            if (cvs) {
                if (interactionMode.current === 'DRAG_UNIT' || interactionMode.current === 'DRAG_OBS') cvs.style.cursor = 'grabbing';
                else if (interactionMode.current === 'PAN') cvs.style.cursor = 'move';
                else if (hitAgent) cvs.style.cursor = 'pointer'; 
                else if (engine.hasObstacle(h.q, h.r)) cvs.style.cursor = 'grab';
                else if (tool === ToolType.SELECT) cvs.style.cursor = 'default';
                else cvs.style.cursor = 'crosshair'; 
            }

            // 1. If IDLE, just update cursor (already done above)
            if (interactionMode.current === 'IDLE') return;

            // 2. If PANNING, apply movement
            if (interactionMode.current === 'PAN') {
                camera.current.x -= dx / camera.current.zoom;
                camera.current.y -= dy / camera.current.zoom;
                return;
            }

            // 3. If PAINTING, execute paint
            if (interactionMode.current === 'PAINT') {
                if (engine.isValid(h.q, h.r)) {
                    executeToolAction(h);
                }
                return;
            }

            // 4. If DRAGGING UNIT
            if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
                const wPos = getWorldPosFromCoords(sx, sy);
                pressedAgentRef.current.px = wPos.x;
                pressedAgentRef.current.py = wPos.y;
                return;
            }

            // 5. If DRAGGING OBS
            if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
                const wPos = getWorldPosFromCoords(sx, sy);
                draggedObstacleRef.current.px = wPos.x;
                draggedObstacleRef.current.py = wPos.y;
                return;
            }

            // 6. ARBITRATION (Transition from DOWN to specific mode)
            if (interactionMode.current === 'DOWN' && pressStartPos.current) {
                const dist = Math.sqrt((sx - pressStartPos.current.x)**2 + (sy - pressStartPos.current.y)**2);
                
                // Threshold exceeded: Decide intent
                if (dist > 10) {
                    // A. Prioritize Unit Drag
                    if (pressedAgentRef.current && tool !== ToolType.DELETE) {
                        interactionMode.current = 'DRAG_UNIT';
                        pressedAgentRef.current.physics.z = 20; // Lift visual
                        onSelect(pressedAgentRef.current);
                        return;
                    }

                    // B. Secondary Obstacle Drag
                    if (draggedObstacleRef.current && tool !== ToolType.DELETE) {
                        interactionMode.current = 'DRAG_OBS';
                        // Lift logical obstacle from map
                        const { originQ, originR } = draggedObstacleRef.current;
                        engine.removeObstacle(originQ, originR);
                        onSelect(null);
                        
                        // Set initial visual pos
                        const wPos = getWorldPosFromCoords(sx, sy);
                        draggedObstacleRef.current.px = wPos.x;
                        draggedObstacleRef.current.py = wPos.y;
                        return;
                    }

                    // C. Paint vs Pan
                    // If hitting a valid tile AND using a paint-friendly tool (Obstacle/Delete)
                    if (engine.isValid(h.q, h.r) && (tool === ToolType.OBSTACLE || tool === ToolType.DELETE)) {
                        interactionMode.current = 'PAINT';
                        executeToolAction(h);
                    } else {
                        // Default to Pan for Unit Spawning tools or Select tool on empty space
                        interactionMode.current = 'PAN';
                        // Catch up camera movement for the initial drag distance
                        camera.current.x -= dx / camera.current.zoom;
                        camera.current.y -= dy / camera.current.zoom;
                    }
                }
            }
        };

        const handleUp = (sx: number, sy: number) => {
            const h = getHexFromCoords(sx, sy);

            // 1. CLICK Logic (If we never left DOWN state)
            if (interactionMode.current === 'DOWN') {
                if (pressedAgentRef.current) {
                    if (tool === ToolType.DELETE) {
                        const a = pressedAgentRef.current;
                        engine.removeAgent(a.q, a.r);
                        onSelect(null);
                    } else {
                        onSelect(pressedAgentRef.current);
                    }
                } else if (engine.hasObstacle(h.q, h.r)) {
                    if (tool === ToolType.DELETE) {
                        engine.removeObstacle(h.q, h.r);
                    }
                    // Else: Select obstacle? Not implemented, maybe highlight.
                } else if (tool !== ToolType.SELECT && tool !== ToolType.DELETE) {
                    // Place Unit logic
                    if (engine.isValid(h.q, h.r)) executeToolAction(h);
                } else {
                    // Click on empty/void with Select tool
                    onSelect(null);
                }
            }

            // 2. Drop Unit
            if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
                const agent = pressedAgentRef.current;
                const isValidHex = engine.isValid(h.q, h.r);
                const isObstacle = engine.obstacles.has(HexUtils.key(h));
                const occupant = engine.getAgentAt(h.q, h.r);
                const isOccupiedByOther = occupant && occupant !== agent;

                agent.physics.z = 0; // Drop visual

                if (isValidHex && !isObstacle && !isOccupiedByOther) {
                    engine.updateAgentPosition(agent, h.q, h.r);
                    const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                    agent.px = p.x; agent.py = p.y;
                } else {
                    // Revert
                    if (dragStartHex.current) {
                        agent.q = dragStartHex.current.q;
                        agent.r = dragStartHex.current.r;
                        const p = HexUtils.toPx(agent.q, agent.r, engine.mapConfig);
                        agent.px = p.x; agent.py = p.y;
                        engine.updateAgentPosition(agent, agent.q, agent.r);
                    }
                }
                onSelect(agent);
            }

            // 3. Drop Obstacle
            if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
                const { type, originQ, originR } = draggedObstacleRef.current;
                const isValidHex = engine.isValid(h.q, h.r);
                const occupant = engine.getAgentAt(h.q, h.r);
                const hasExistingObstacle = engine.hasObstacle(h.q, h.r);

                if (isValidHex && !occupant && !hasExistingObstacle) {
                    engine.setObstacle(h.q, h.r, type);
                } else {
                    engine.setObstacle(originQ, originR, type); // Revert
                }
            }

            // Reset
            interactionMode.current = 'IDLE';
            pressedAgentRef.current = null;
            draggedObstacleRef.current = null;
            pressStartPos.current = null;
            lastPaintHex.current = "";
            if (cvs) cvs.style.cursor = 'default';
        };

        // Event Listeners
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

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const pos = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                lastTouchPos.current = pos;
                handleDown(pos.x, pos.y, 0);
            } else if (e.touches.length === 2) {
                const t1 = getScreenCoords(e.touches[0].clientX, e.touches[0].clientY);
                const t2 = getScreenCoords(e.touches[1].clientX, e.touches[1].clientY);
                lastPinchDist.current = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                // Reset interaction if pinch starts
                interactionMode.current = 'IDLE';
                pressedAgentRef.current = null;
                draggedObstacleRef.current = null;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault(); 
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
            if (e.cancelable) e.preventDefault();
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
    }, [engine, tool, selectedObstacle, hpInput, onSelect, winner, spawnMode, draftRole]);

    return (
        <div ref={wrapperRef} className="flex-1 overflow-hidden relative bg-slate-950 border-r border-slate-700">
            <canvas 
                ref={canvasRef} 
                className={`block shadow-inner`}
                style={{ backgroundColor: engine.currentScene.background }} 
            />
            
            {/* STANDARD MODE VICTORY SCREEN */}
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
