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

type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAN' | 'PAINT';

export const useGameInput = (props: GameInputProps) => {
    const { 
        canvasRef, engine, rendererRef, cameraRef, 
        tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
        onSelect, onCameraPan, onCameraZoom 
    } = props;

    // --- State Refs (Mutable for Performance) ---
    const interactionMode = useRef<InteractionMode>('IDLE');
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const lastPinchDist = useRef<number>(0);
    
    // Action Context Refs
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<{ type: string; originQ: number; originR: number; px: number; py: number; } | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    const lastPaintHex = useRef<string>("");

    // Config Refs (Sync with props to avoid stale closures in event listeners)
    const configRef = useRef({ tool, selectedObstacle, hpInput, spawnMode, draftRole, winner });
    useEffect(() => { configRef.current = { tool, selectedObstacle, hpInput, spawnMode, draftRole, winner }; }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, winner]);

    // --- 1. HELPERS: Coordinate Mapping & Hit Testing ---

    const getHexFromCoords = (sx: number, sy: number) => {
        const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, cameraRef.current, engine);
        if (hex) return hex;
        return HexUtils.fromPx(
            sx / cameraRef.current.zoom + cameraRef.current.x,
            sy / cameraRef.current.zoom + cameraRef.current.y,
            engine.mapConfig
        );
    };

    const getWorldPos = (sx: number, sy: number) => {
        const wx = sx / cameraRef.current.zoom + cameraRef.current.x;
        const hex = rendererRef.current.getHexAtScreenPoint(sx, sy, cameraRef.current, engine);
        let h = BLOCK_HEIGHT + 6;
        if (hex) h = rendererRef.current.getTerrainHeight(hex.q, hex.r, engine);
        const wy = sy / cameraRef.current.zoom + cameraRef.current.y + h;
        return { x: wx, y: wy };
    };

    const getHitAgent = (sx: number, sy: number) => {
        const wx = sx / cameraRef.current.zoom + cameraRef.current.x;
        const wy = sy / cameraRef.current.zoom + cameraRef.current.y;
        
        // Painter's Algorithm Hit Test (Front units first)
        const candidates = engine.agents.map(a => {
            if (a.hp <= 0 && a.fullyDead) return null;
            const h = rendererRef.current.getTerrainHeight(a.q, a.r, engine);
            const visualY = a.py - h - 40; 
            return { agent: a, visualY, dist: Math.abs(wy - visualY) + Math.abs(wx - a.px) };
        }).filter(Boolean) as { agent: Agent, visualY: number }[];

        candidates.sort((a, b) => b.visualY - a.visualY);

        for (const item of candidates) {
            const dx = Math.abs(wx - item.agent.px);
            const dy = wy - item.visualY; 
            if (dx < 35 && dy > -35 && dy < 40) return item.agent;
        }
        return null;
    };

    // --- 2. LOGIC: Action Execution ---

    const executePaintAction = (h: Hex) => {
        const { tool, winner, selectedObstacle, spawnMode, draftRole, hpInput } = configRef.current;
        if (engine.isRunning || winner !== null) return;
        
        const k = HexUtils.key(h);
        if (lastPaintHex.current === k) return; 
        lastPaintHex.current = k;

        if (tool === ToolType.DELETE) {
            engine.removeObstacle(h.q, h.r);
            engine.removeAgent(h.q, h.r);
            return;
        }

        const existingAgent = engine.getAgentAt(h.q, h.r);
        if (tool === ToolType.OBSTACLE) {
            if (existingAgent) engine.removeAgent(h.q, h.r);
            engine.setObstacle(h.q, h.r, selectedObstacle);
            return;
        }

        if (!existingAgent && !engine.hasObstacle(h.q, h.r)) {
            let agent: Agent | null = null;
            if (tool === ToolType.ADD_BLUE) agent = engine.addAgent(Team.BLUE, h.q, h.r, hpInput);
            else if (tool === ToolType.ADD_RED) agent = engine.addAgent(Team.RED, h.q, h.r, hpInput);

            if (agent && spawnMode === 'DRAFT') {
                agent.role = draftRole;
                // Assign random skills for draft role
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
        }
    };

    // --- 3. EVENT HANDLERS (Unified Logic) ---

    const handleInputStart = (sx: number, sy: number, isRightClick: boolean) => {
        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        
        if (isRightClick) {
            interactionMode.current = 'PAN';
            return;
        }

        // 1. Hit Test Agent
        const hitAgent = getHitAgent(sx, sy);
        if (hitAgent) {
            pressedAgentRef.current = hitAgent;
            interactionMode.current = 'DOWN'; // Wait to see if drag or click
            return;
        }

        // 2. Editing Logic
        const { tool, winner } = configRef.current;
        const isEditing = !engine.isRunning && winner === null;
        const h = getHexFromCoords(sx, sy);

        if (isEditing) {
            // Hit Obstacle?
            if (tool === ToolType.SELECT && engine.hasObstacle(h.q, h.r)) {
                const obsType = engine.obstacles.get(HexUtils.key(h));
                if (obsType) {
                    draggedObstacleRef.current = { type: obsType, originQ: h.q, originR: h.r, px: 0, py: 0 };
                    interactionMode.current = 'DOWN';
                    return;
                }
            }
            // Paint Tool?
            if (tool !== ToolType.SELECT) {
                // Immediate paint on down for better feel
                if (engine.isValid(h.q, h.r)) {
                    executePaintAction(h);
                    interactionMode.current = 'PAINT';
                }
                return;
            }
        }

        interactionMode.current = 'DOWN'; // Default to potential pan
    };

    const handleInputMove = (sx: number, sy: number) => {
        const cvs = canvasRef.current;
        const h = getHexFromCoords(sx, sy);
        hoveredHexRef.current = engine.isValid(h.q, h.r) ? h : null;

        // Cursor & Hover Logic
        if (cvs) {
            const { tool, winner } = configRef.current;
            const isEditing = !engine.isRunning && winner === null;
            const hitAgent = getHitAgent(sx, sy);
            
            if (interactionMode.current === 'DRAG_UNIT' || interactionMode.current === 'DRAG_OBS') cvs.style.cursor = 'grabbing';
            else if (interactionMode.current === 'PAN') cvs.style.cursor = 'move';
            else if (isEditing && tool !== ToolType.SELECT) cvs.style.cursor = 'crosshair';
            else if (hitAgent) cvs.style.cursor = 'pointer';
            else cvs.style.cursor = 'default';
        }

        if (interactionMode.current === 'IDLE') return;

        const prev = lastPointerPos.current || { x: sx, y: sy };
        const dx = sx - prev.x;
        const dy = sy - prev.y;
        lastPointerPos.current = { x: sx, y: sy };

        // --- Active State Handling ---
        if (interactionMode.current === 'PAN') {
            onCameraPan(dx, dy);
            return;
        }
        if (interactionMode.current === 'PAINT') {
            if (engine.isValid(h.q, h.r)) executePaintAction(h);
            return;
        }
        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const wPos = getWorldPos(sx, sy);
            pressedAgentRef.current.px = wPos.x;
            pressedAgentRef.current.py = wPos.y;
            return;
        }
        if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const wPos = getWorldPos(sx, sy);
            draggedObstacleRef.current.px = wPos.x;
            draggedObstacleRef.current.py = wPos.y;
            return;
        }

        // --- State Transition (Threshold Check) ---
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Math.hypot(sx - pressStartPos.current.x, sy - pressStartPos.current.y);
            if (dist > 8) {
                const { tool, winner } = configRef.current;
                const isEditing = !engine.isRunning && winner === null;

                if (isEditing && pressedAgentRef.current && tool === ToolType.SELECT) {
                    interactionMode.current = 'DRAG_UNIT';
                    pressedAgentRef.current.physics.z = 20; // Lift
                    onSelect(pressedAgentRef.current);
                } else if (isEditing && draggedObstacleRef.current && tool === ToolType.SELECT) {
                    interactionMode.current = 'DRAG_OBS';
                    // Remove from grid temporarily
                    const { originQ, originR } = draggedObstacleRef.current;
                    engine.removeObstacle(originQ, originR);
                    const wPos = getWorldPos(sx, sy);
                    draggedObstacleRef.current.px = wPos.x;
                    draggedObstacleRef.current.py = wPos.y;
                } else {
                    interactionMode.current = 'PAN';
                    onCameraPan(dx, dy);
                }
            }
        }
    };

    const handleInputEnd = (sx: number, sy: number) => {
        const { tool, winner } = configRef.current;
        const isEditing = !engine.isRunning && winner === null;
        const h = getHexFromCoords(sx, sy);

        // Click Logic (Released without dragging)
        if (interactionMode.current === 'DOWN') {
            if (pressedAgentRef.current) {
                if (isEditing && tool === ToolType.DELETE) {
                    engine.removeAgent(pressedAgentRef.current.q, pressedAgentRef.current.r);
                    onSelect(null);
                } else {
                    onSelect(pressedAgentRef.current);
                }
            } else if (isEditing && engine.hasObstacle(h.q, h.r) && tool === ToolType.DELETE) {
                engine.removeObstacle(h.q, h.r);
            } else if (!pressedAgentRef.current) {
                onSelect(null);
            }
        }

        // Drop Logic
        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const agent = pressedAgentRef.current;
            agent.physics.z = 0;
            const valid = engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r, agent.id, agent.movementType);
            
            if (valid) {
                engine.updateAgentPosition(agent, h.q, h.r);
                const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                agent.px = p.x; agent.py = p.y;
            } else {
                // Revert
                const p = HexUtils.toPx(agent.q, agent.r, engine.mapConfig);
                agent.px = p.x; agent.py = p.y;
            }
            onSelect(agent);
        }

        if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const { type, originQ, originR } = draggedObstacleRef.current;
            const valid = engine.isValid(h.q, h.r) && !engine.getAgentAt(h.q, h.r) && !engine.hasObstacle(h.q, h.r);
            if (valid) engine.setObstacle(h.q, h.r, type);
            else engine.setObstacle(originQ, originR, type); // Revert
        }

        // Reset
        interactionMode.current = 'IDLE';
        pressedAgentRef.current = null;
        draggedObstacleRef.current = null;
        pressStartPos.current = null;
    };

    // --- 4. BINDINGS ---

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        // --- Mouse ---
        const onMouseDown = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            handleInputStart(e.clientX - rect.left, e.clientY - rect.top, e.button === 2);
        };
        const onMouseMove = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            handleInputMove(e.clientX - rect.left, e.clientY - rect.top);
        };
        const onMouseUp = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            handleInputEnd(e.clientX - rect.left, e.clientY - rect.top);
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            onCameraZoom(delta);
        };
        const onCtx = (e: MouseEvent) => e.preventDefault();

        // --- Touch ---
        const getTouchPos = (t: Touch) => {
            const rect = cvs.getBoundingClientRect();
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        };
        const onTouchStart = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            if (e.touches.length === 1) {
                const { x, y } = getTouchPos(e.touches[0]);
                handleInputStart(x, y, false);
            } else if (e.touches.length === 2) {
                const t1 = getTouchPos(e.touches[0]);
                const t2 = getTouchPos(e.touches[1]);
                lastPinchDist.current = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                interactionMode.current = 'IDLE'; 
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            if (e.touches.length === 1) {
                const { x, y } = getTouchPos(e.touches[0]);
                handleInputMove(x, y);
            } else if (e.touches.length === 2) {
                const t1 = getTouchPos(e.touches[0]);
                const t2 = getTouchPos(e.touches[1]);
                const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                if (lastPinchDist.current > 0) {
                    onCameraZoom((dist - lastPinchDist.current) * 0.005);
                }
                lastPinchDist.current = dist;
            }
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            if (e.changedTouches.length > 0 && e.touches.length === 0) {
                const { x, y } = getTouchPos(e.changedTouches[0]);
                handleInputEnd(x, y);
            }
            if (e.touches.length < 2) lastPinchDist.current = 0;
        };

        cvs.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        cvs.addEventListener('wheel', onWheel, { passive: false });
        cvs.addEventListener('contextmenu', onCtx);
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd, { passive: false });
        cvs.addEventListener('touchcancel', onTouchEnd, { passive: false });

        return () => {
            cvs.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            cvs.removeEventListener('wheel', onWheel);
            cvs.removeEventListener('contextmenu', onCtx);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
            cvs.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []);

    return {
        pressedAgent: pressedAgentRef.current,
        draggedObstacle: draggedObstacleRef.current,
        hoveredHexRef: hoveredHexRef
    };
};