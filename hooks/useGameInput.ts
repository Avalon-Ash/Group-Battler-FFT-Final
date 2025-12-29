
import { useRef, useEffect, MutableRefObject } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role, Skill } from '../types';
import { HexUtils } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';

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
    onPan: (dx: number, dy: number) => void;
}

type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAINT' | 'PAN';

export const useGameInput = (props: GameInputProps) => {
    const { 
        canvasRef, engine, rendererRef, cameraRef, 
        tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
        onSelect, onPan
    } = props;

    // --- State Refs ---
    const interactionMode = useRef<InteractionMode>('IDLE');
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPanPos = useRef<{x: number, y: number} | null>(null);
    const inputSourceRef = useRef<'MOUSE' | 'TOUCH'>('MOUSE'); // Track source for Pan logic
    const lastPaintHex = useRef<string>("");
    
    // Action Context Refs
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<{ type: string; originQ: number; originR: number; px: number; py: number; } | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);

    // Config Refs
    const configRef = useRef({ tool, selectedObstacle, hpInput, spawnMode, draftRole, winner });
    useEffect(() => { configRef.current = { tool, selectedObstacle, hpInput, spawnMode, draftRole, winner }; }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, winner]);

    // --- Helpers ---

    const getHexFromCoords = (sx: number, sy: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return rendererRef.current.getHexAtScreenPoint(sx, sy, rect.width, rect.height, cameraRef.current, engine);
    };

    const getWorldPos = (sx: number, sy: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const { x: camX, y: camY, zoom } = cameraRef.current;
        
        const wx = (sx - cx) / zoom + camX;
        
        // Best guess height for drag projection
        const hex = getHexFromCoords(sx, sy);
        let h = 0;
        if (hex) h = rendererRef.current.getTerrainHeight(hex.q, hex.r, engine);
        
        const visualWy = (sy - cy) / zoom + camY;
        return { x: wx, y: visualWy + h };
    };

    const getHitAgent = (sx: number, sy: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const { x: camX, y: camY, zoom } = cameraRef.current;

        const wx = (sx - cx) / zoom + camX;
        const wy = (sy - cy) / zoom + camY;
        
        const candidates = engine.agents.map(a => {
            if (a.hp <= 0 && a.fullyDead) return null;
            const h = rendererRef.current.getTerrainHeight(a.q, a.r, engine);
            const visualY = a.py - h - 40; // Approx Visual Center
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

    // --- Handlers ---

    const handleInputStart = (sx: number, sy: number) => {
        pressStartPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        
        // 1. Hit Test Agent
        const hitAgent = getHitAgent(sx, sy);
        if (hitAgent) {
            pressedAgentRef.current = hitAgent;
            interactionMode.current = 'DOWN';
            return;
        }

        // 2. Editing Logic
        const { tool, winner } = configRef.current;
        const isEditing = !engine.isRunning && winner === null;
        const h = getHexFromCoords(sx, sy);
        const hasHex = h && engine.isValid(h.q, h.r);

        if (isEditing && hasHex) {
            if (tool === ToolType.SELECT && engine.hasObstacle(h!.q, h!.r)) {
                // Drag Obstacle Start
                const obsType = engine.map.obstacles.get(HexUtils.key(h!));
                if (obsType) {
                    draggedObstacleRef.current = { type: obsType, originQ: h!.q, originR: h!.r, px: 0, py: 0 };
                    interactionMode.current = 'DOWN';
                    return;
                }
            }
            if (tool !== ToolType.SELECT) {
                // Paint Start
                executePaintAction(h!);
                interactionMode.current = 'PAINT';
                return;
            }
        }

        // Even if we hit nothing, we enter DOWN state.
        // This allows 'Click to Deselect' (on End) or 'Drag to Pan' (on Move).
        interactionMode.current = 'DOWN';
    };

    const handleInputMove = (sx: number, sy: number) => {
        const cvs = canvasRef.current;
        const h = getHexFromCoords(sx, sy);
        hoveredHexRef.current = (h && engine.isValid(h.q, h.r)) ? h : null;

        // Cursor Logic
        if (cvs) {
            const { tool, winner } = configRef.current;
            const isEditing = !engine.isRunning && winner === null;
            const hitAgent = getHitAgent(sx, sy);
            
            if (interactionMode.current === 'DRAG_UNIT' || interactionMode.current === 'DRAG_OBS') cvs.style.cursor = 'grabbing';
            else if (isEditing && tool !== ToolType.SELECT) cvs.style.cursor = 'crosshair';
            else if (hitAgent) cvs.style.cursor = 'pointer';
            else cvs.style.cursor = 'default';
        }

        if (interactionMode.current === 'IDLE') return;

        // Active States
        if (interactionMode.current === 'PAINT') {
            if (h && engine.isValid(h.q, h.r)) executePaintAction(h);
            return;
        }
        if (interactionMode.current === 'PAN') {
            if (lastPanPos.current) {
                const dx = sx - lastPanPos.current.x;
                const dy = sy - lastPanPos.current.y;
                onPan(dx, dy);
            }
            lastPanPos.current = { x: sx, y: sy };
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

        // Transition Check (Drag Threshold)
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Math.hypot(sx - pressStartPos.current.x, sy - pressStartPos.current.y);
            if (dist > 8) {
                const { tool, winner } = configRef.current;
                const isEditing = !engine.isRunning && winner === null;

                if (isEditing && pressedAgentRef.current && tool === ToolType.SELECT) {
                    interactionMode.current = 'DRAG_UNIT';
                    pressedAgentRef.current.physics.z = 20; // Lift visual
                    onSelect(pressedAgentRef.current);
                } else if (isEditing && draggedObstacleRef.current && tool === ToolType.SELECT) {
                    interactionMode.current = 'DRAG_OBS';
                    const { originQ, originR } = draggedObstacleRef.current;
                    engine.removeObstacle(originQ, originR); // Pick up
                    const wPos = getWorldPos(sx, sy);
                    draggedObstacleRef.current.px = wPos.x;
                    draggedObstacleRef.current.py = wPos.y;
                } else {
                    // Mobile Pan Logic:
                    // If we didn't hit anything to drag, and we are using Touch, treat as Pan.
                    if (inputSourceRef.current === 'TOUCH') {
                        interactionMode.current = 'PAN';
                        lastPanPos.current = { x: sx, y: sy };
                        // Don't deselect yet, wait for user intent
                    } else {
                        // Mouse Left Drag on empty space? Currently ignore. 
                        // Right Drag is handled by CameraControl.
                        interactionMode.current = 'IDLE'; 
                    }
                }
            }
        }
    };

    const handleInputEnd = (sx: number, sy: number) => {
        const { tool, winner } = configRef.current;
        const isEditing = !engine.isRunning && winner === null;
        const h = getHexFromCoords(sx, sy);

        if (interactionMode.current === 'DOWN') {
            // Click (No Drag)
            if (pressedAgentRef.current) {
                if (isEditing && tool === ToolType.DELETE) {
                    engine.removeAgent(pressedAgentRef.current.q, pressedAgentRef.current.r);
                    onSelect(null);
                } else {
                    onSelect(pressedAgentRef.current);
                }
            } else if (isEditing && h && engine.hasObstacle(h.q, h.r) && tool === ToolType.DELETE) {
                engine.removeObstacle(h.q, h.r);
            } else if (!pressedAgentRef.current) {
                // Click on empty space -> Deselect
                onSelect(null);
            }
        }

        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const agent = pressedAgentRef.current;
            agent.physics.z = 0;
            const valid = h && engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r, agent.id, agent.movementType);
            
            if (valid && h) {
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
            const valid = h && engine.isValid(h.q, h.r) && !engine.getAgentAt(h.q, h.r) && !engine.hasObstacle(h.q, h.r);
            if (valid && h) engine.setObstacle(h.q, h.r, type);
            else engine.setObstacle(originQ, originR, type);
        }

        interactionMode.current = 'IDLE';
        pressedAgentRef.current = null;
        draggedObstacleRef.current = null;
        pressStartPos.current = null;
        lastPanPos.current = null;
    };

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const onMouseDown = (e: MouseEvent) => {
            // Only Left Click
            if (e.button !== 0) return;
            inputSourceRef.current = 'MOUSE';
            const rect = cvs.getBoundingClientRect();
            handleInputStart(e.clientX - rect.left, e.clientY - rect.top);
        };
        const onMouseMove = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            handleInputMove(e.clientX - rect.left, e.clientY - rect.top);
        };
        const onMouseUp = (e: MouseEvent) => {
            const rect = cvs.getBoundingClientRect();
            handleInputEnd(e.clientX - rect.left, e.clientY - rect.top);
        };
        const onCtx = (e: MouseEvent) => e.preventDefault();

        // Touch - Single finger is treated as potential selection/paint OR Pan if missed
        const getTouchPos = (t: Touch) => {
            const rect = cvs.getBoundingClientRect();
            return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        };
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                inputSourceRef.current = 'TOUCH';
                const { x, y } = getTouchPos(e.touches[0]);
                handleInputStart(x, y);
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const { x, y } = getTouchPos(e.touches[0]);
                handleInputMove(x, y);
            }
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (e.changedTouches.length > 0 && e.touches.length === 0) {
                const { x, y } = getTouchPos(e.changedTouches[0]);
                handleInputEnd(x, y);
            }
        };

        cvs.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        cvs.addEventListener('contextmenu', onCtx);
        cvs.addEventListener('touchstart', onTouchStart, { passive: false });
        cvs.addEventListener('touchmove', onTouchMove, { passive: false });
        cvs.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            cvs.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            cvs.removeEventListener('contextmenu', onCtx);
            cvs.removeEventListener('touchstart', onTouchStart);
            cvs.removeEventListener('touchmove', onTouchMove);
            cvs.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    return {
        pressedAgent: pressedAgentRef.current,
        draggedObstacle: draggedObstacleRef.current,
        hoveredHexRef: hoveredHexRef
    };
};
