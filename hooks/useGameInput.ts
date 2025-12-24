
import { useRef, useEffect, MutableRefObject } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role, Skill } from '../types';
import { HexUtils } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';
import { BLOCK_HEIGHT } from '../constants';

interface GameInputProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    engine: GameEngine;
    rendererRef: MutableRefObject<GameRenderer>;
    cameraRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
    
    // Tool State
    tool: ToolType;
    selectedObstacle: string;
    hpInput: number;
    spawnMode: 'RANDOM' | 'DRAFT';
    draftRole: Role;
    winner: Team | null;
    
    // Callbacks
    onSelect: (a: Agent | null) => void;
    onCameraPan: (dx: number, dy: number) => void;
    onCameraZoom: (delta: number) => void;
}

export const useGameInput = ({
    canvasRef, engine, rendererRef, cameraRef,
    tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
    onSelect, onCameraPan, onCameraZoom
}: GameInputProps) => {
    
    // --- 1. STATE REFS (Shared between Mouse & Touch) ---
    type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAN' | 'PAINT';
    const interactionMode = useRef<InteractionMode>('IDLE');

    // Tooling State Refs (Keep fresh without re-binding listeners)
    const toolRef = useRef(tool);
    const obsRef = useRef(selectedObstacle);
    const hpRef = useRef(hpInput);
    const spawnRef = useRef(spawnMode);
    const roleRef = useRef(draftRole);
    const winnerRef = useRef(winner);

    // Sync Props to Refs
    useEffect(() => {
        toolRef.current = tool;
        obsRef.current = selectedObstacle;
        hpRef.current = hpInput;
        spawnRef.current = spawnMode;
        roleRef.current = draftRole;
        winnerRef.current = winner;
    }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, winner]);

    // Operational Refs
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<{ type: string; originQ: number; originR: number; px: number; py: number; } | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    
    // Tracking Refs
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const dragStartHex = useRef<{q: number, r: number} | null>(null);
    const lastPaintHex = useRef<string>(""); 
    
    // Touch Specific Refs
    const lastPinchDist = useRef<number>(0);

    // --- 2. CORE UTILITIES (Shared Logic) ---

    const getHexFromCoords = (sx: number, sy: number) => {
        const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, cameraRef.current, engine);
        if (hex) return hex;
        // Fallback to ground plane raycast
        return HexUtils.fromPx(
            sx / cameraRef.current.zoom + cameraRef.current.x,
            sy / cameraRef.current.zoom + cameraRef.current.y,
            engine.mapConfig
        );
    };

    const getWorldPosFromCoords = (sx: number, sy: number) => {
        const wx = sx / cameraRef.current.zoom + cameraRef.current.x;
        const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, cameraRef.current, engine);
        let h = BLOCK_HEIGHT + 6;
        if (hex) h = rendererRef.current.getTerrainHeight(hex.q, hex.r, engine);
        const wy = sy / cameraRef.current.zoom + cameraRef.current.y + h;
        return { x: wx, y: wy };
    };

    const getHitAgentFromCoords = (sx: number, sy: number) => {
        const wx = sx / cameraRef.current.zoom + cameraRef.current.x;
        const wy = sy / cameraRef.current.zoom + cameraRef.current.y;
        // Search front-to-back
        const sorted = [...engine.agents].sort((a, b) => b.py - a.py);
        
        for (const agent of sorted) {
            if (agent.hp <= 0 && agent.fullyDead) continue;
            const h = rendererRef.current.getTerrainHeight(agent.q, agent.r, engine);
            const baseX = agent.px;
            const baseY = agent.py - h;
            // Hitbox approx (Waist area)
            const dx = Math.abs(wx - baseX);
            const dy = wy - (baseY - 40); 
            if (dx < 35 && Math.abs(dy) < 60) return agent;
        }
        return null;
    };

    const executeToolAction = (h: Hex) => {
        const _tool = toolRef.current;
        const _winner = winnerRef.current;
        const _obs = obsRef.current;
        const _spawn = spawnRef.current;
        const _role = roleRef.current;
        const _hp = hpRef.current;

        if (engine.isRunning || _winner !== null) return;
        const k = HexUtils.key(h);
        if (lastPaintHex.current === k) return; 
        
        lastPaintHex.current = k;
        const existingAgent = engine.getAgentAt(h.q, h.r);
        let agent: Agent | null = null;

        if (_tool === ToolType.DELETE) {
            if (engine.hasObstacle(h.q, h.r)) engine.removeObstacle(h.q, h.r);
            if (existingAgent) {
                engine.removeAgent(h.q, h.r);
                onSelect(null);
            }
            return;
        }

        if (_tool === ToolType.OBSTACLE) {
            if (existingAgent) engine.removeAgent(h.q, h.r);
            engine.setObstacle(h.q, h.r, _obs);
            return;
        }

        if (!existingAgent && !engine.hasObstacle(h.q, h.r)) {
            if (_tool === ToolType.ADD_BLUE) agent = engine.addAgent(Team.BLUE, h.q, h.r, _hp);
            else if (_tool === ToolType.ADD_RED) agent = engine.addAgent(Team.RED, h.q, h.r, _hp);
        }

        if (agent && _spawn === 'DRAFT') {
            agent.role = _role;
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

    // --- 3. COMMON INTERACTION LOGIC (Used by both handlers) ---

    const startInteraction = (sx: number, sy: number, isRightClick: boolean) => {
        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        interactionMode.current = 'DOWN';

        if (isRightClick || engine.isRunning) {
            interactionMode.current = 'PAN';
            return;
        }

        // 1. Check Unit Hit
        const hitAgent = getHitAgentFromCoords(sx, sy);
        if (hitAgent) {
            pressedAgentRef.current = hitAgent;
            if (toolRef.current !== ToolType.DELETE) {
                dragStartHex.current = { q: hitAgent.q, r: hitAgent.r };
            }
            return;
        }

        // 2. Check Obstacle Hit
        const h = getHexFromCoords(sx, sy);
        if (engine.isValid(h.q, h.r) && engine.hasObstacle(h.q, h.r) && toolRef.current !== ToolType.DELETE) {
            const obsType = engine.obstacles.get(HexUtils.key(h));
            if (obsType) {
                draggedObstacleRef.current = { type: obsType, originQ: h.q, originR: h.r, px: 0, py: 0 };
            }
        }
    };

    const updateInteraction = (sx: number, sy: number) => {
        const cvs = canvasRef.current;
        const h = getHexFromCoords(sx, sy);
        
        // ** FIX 1: Update Hover Ref Every Frame **
        hoveredHexRef.current = engine.isValid(h.q, h.r) ? h : null;

        // Cursor Logic
        if (cvs) {
            const hitAgent = getHitAgentFromCoords(sx, sy);
            if (interactionMode.current === 'DRAG_UNIT' || interactionMode.current === 'DRAG_OBS') cvs.style.cursor = 'grabbing';
            else if (interactionMode.current === 'PAN') cvs.style.cursor = 'move';
            else if (hitAgent) cvs.style.cursor = 'pointer'; 
            else if (engine.hasObstacle(h.q, h.r)) cvs.style.cursor = 'grab';
            else if (toolRef.current === ToolType.SELECT) cvs.style.cursor = 'default';
            else cvs.style.cursor = 'crosshair'; 
        }

        // Delta for Panning
        const prev = lastPointerPos.current || { x: sx, y: sy };
        const dx = sx - prev.x;
        const dy = sy - prev.y;
        lastPointerPos.current = { x: sx, y: sy };

        if (interactionMode.current === 'IDLE') return;

        if (interactionMode.current === 'PAN') {
            onCameraPan(dx, dy); 
            return;
        }

        if (interactionMode.current === 'PAINT') {
            if (engine.isValid(h.q, h.r)) executeToolAction(h);
            return;
        }

        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const wPos = getWorldPosFromCoords(sx, sy);
            pressedAgentRef.current.px = wPos.x;
            pressedAgentRef.current.py = wPos.y;
            return;
        }

        if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const wPos = getWorldPosFromCoords(sx, sy);
            draggedObstacleRef.current.px = wPos.x;
            draggedObstacleRef.current.py = wPos.y;
            return;
        }

        // Threshold Check: Convert DOWN to DRAG or PAN
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Math.sqrt((sx - pressStartPos.current.x)**2 + (sy - pressStartPos.current.y)**2);
            if (dist > 10) {
                const _tool = toolRef.current;
                
                if (pressedAgentRef.current && _tool !== ToolType.DELETE) {
                    interactionMode.current = 'DRAG_UNIT';
                    pressedAgentRef.current.physics.z = 20; 
                    onSelect(pressedAgentRef.current);
                    return;
                }
                if (draggedObstacleRef.current && _tool !== ToolType.DELETE) {
                    interactionMode.current = 'DRAG_OBS';
                    const { originQ, originR } = draggedObstacleRef.current;
                    engine.removeObstacle(originQ, originR);
                    onSelect(null);
                    const wPos = getWorldPosFromCoords(sx, sy);
                    draggedObstacleRef.current.px = wPos.x;
                    draggedObstacleRef.current.py = wPos.y;
                    return;
                }
                if (engine.isValid(h.q, h.r) && (_tool === ToolType.OBSTACLE || _tool === ToolType.DELETE)) {
                    interactionMode.current = 'PAINT';
                    executeToolAction(h);
                } else {
                    interactionMode.current = 'PAN';
                    onCameraPan(dx, dy);
                }
            }
        }
    };

    const endInteraction = (sx: number, sy: number) => {
        const h = getHexFromCoords(sx, sy);
        const _tool = toolRef.current;

        if (interactionMode.current === 'DOWN') {
            // Click Logic
            if (pressedAgentRef.current) {
                if (_tool === ToolType.DELETE) {
                    engine.removeAgent(pressedAgentRef.current.q, pressedAgentRef.current.r);
                    onSelect(null);
                } else {
                    onSelect(pressedAgentRef.current);
                }
            } else if (engine.hasObstacle(h.q, h.r)) {
                if (_tool === ToolType.DELETE) engine.removeObstacle(h.q, h.r);
            } else if (_tool !== ToolType.SELECT && _tool !== ToolType.DELETE) {
                if (engine.isValid(h.q, h.r)) executeToolAction(h);
            } else {
                onSelect(null);
            }
        }

        // Drag Drop Logic
        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const agent = pressedAgentRef.current;
            agent.physics.z = 0;
            const valid = engine.isValid(h.q, h.r) && !engine.hasObstacle(h.q, h.r) && (!engine.getAgentAt(h.q, h.r) || engine.getAgentAt(h.q, h.r) === agent);
            
            if (valid) {
                engine.updateAgentPosition(agent, h.q, h.r);
                const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                agent.px = p.x; agent.py = p.y;
            } else if (dragStartHex.current) {
                // Revert
                agent.q = dragStartHex.current.q;
                agent.r = dragStartHex.current.r;
                const p = HexUtils.toPx(agent.q, agent.r, engine.mapConfig);
                agent.px = p.x; agent.py = p.y;
                engine.updateAgentPosition(agent, agent.q, agent.r);
            }
            onSelect(agent);
        }

        if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const { type, originQ, originR } = draggedObstacleRef.current;
            const valid = engine.isValid(h.q, h.r) && !engine.getAgentAt(h.q, h.r) && !engine.hasObstacle(h.q, h.r);
            
            if (valid) engine.setObstacle(h.q, h.r, type);
            else engine.setObstacle(originQ, originR, type); // Revert
        }

        interactionMode.current = 'IDLE';
        pressedAgentRef.current = null;
        draggedObstacleRef.current = null;
        pressStartPos.current = null;
        lastPointerPos.current = null;
        lastPaintHex.current = "";
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    };

    // --- 4. PLATFORM SPECIFIC HANDLERS ---

    // === MOUSE HANDLERS ===
    const setupMouseListeners = (cvs: HTMLCanvasElement) => {
        const getCoords = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const onMouseDown = (e: MouseEvent) => {
            const { x, y } = getCoords(e);
            startInteraction(x, y, e.button === 2);
        };

        const onMouseMove = (e: MouseEvent) => {
            const { x, y } = getCoords(e);
            updateInteraction(x, y);
        };

        const onMouseUp = (e: MouseEvent) => {
            const { x, y } = getCoords(e);
            endInteraction(x, y);
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            onCameraZoom(delta);
        };

        const onCtx = (e: MouseEvent) => e.preventDefault();

        cvs.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('contextmenu', onCtx);

        return () => {
            cvs.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('contextmenu', onCtx);
        };
    };

    // === TOUCH HANDLERS ===
    const setupTouchListeners = (cvs: HTMLCanvasElement) => {
        const getCoords = (t: Touch) => {
            const rect = cvs.getBoundingClientRect();
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            
            if (e.touches.length === 1) {
                const { x, y } = getCoords(e.touches[0]);
                startInteraction(x, y, false);
            } else if (e.touches.length === 2) {
                const t1 = getCoords(e.touches[0]);
                const t2 = getCoords(e.touches[1]);
                lastPinchDist.current = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                interactionMode.current = 'IDLE'; // Reset interaction if pinching
                pressedAgentRef.current = null;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            
            if (e.touches.length === 1) {
                const { x, y } = getCoords(e.touches[0]);
                updateInteraction(x, y);
            } else if (e.touches.length === 2) {
                const t1 = getCoords(e.touches[0]);
                const t2 = getCoords(e.touches[1]);
                const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                if (lastPinchDist.current > 0) {
                    const delta = dist - lastPinchDist.current;
                    onCameraZoom(delta * 0.005);
                }
                lastPinchDist.current = dist;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            
            if (e.changedTouches.length > 0 && e.touches.length === 0) {
                // Last finger lifted
                const { x, y } = getCoords(e.changedTouches[0]);
                endInteraction(x, y);
            }
            if (e.touches.length < 2) lastPinchDist.current = 0;
        };

        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd, { passive: false });
        cvs.addEventListener('touchcancel', onTouchEnd, { passive: false });

        return () => {
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
            cvs.removeEventListener('touchcancel', onTouchEnd);
        };
    };

    // --- 5. INITIALIZATION ---
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const cleanupMouse = setupMouseListeners(cvs);
        const cleanupTouch = setupTouchListeners(cvs);

        return () => {
            cleanupMouse();
            cleanupTouch();
        };
    }, []); 

    return {
        pressedAgent: pressedAgentRef.current,
        draggedObstacle: draggedObstacleRef.current,
        // ** FIX 2: Return Ref Object directly so Render Loop can read fresh value **
        hoveredHexRef: hoveredHexRef
    };
};
