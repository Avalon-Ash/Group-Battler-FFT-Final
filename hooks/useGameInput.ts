
import { useRef, useEffect, MutableRefObject, useState } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role } from '../types';
import { HexUtils, Vector } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';
import {
    queryAgentAt,
    queryIsValidHex,
    queryHasObstacle,
    queryObstacleTypeAt,
    queryHexAtScreenPoint,
    queryHexToWorldSnap,
} from '../engine/systems/ui/editorQueries';

/** 編輯模式拖曳中的障礙物（pointerdown 建立，pointermove 補齊投影欄位）。 */
export interface DraggedObstacle {
    type: string | undefined;
    originQ: number;
    originR: number;
    px: number;
    py: number;
    terrainHeight?: number;
    hoverQ?: number;
    hoverR?: number;
}

interface GameInputProps {
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    engine: GameEngine;
    rendererRef: MutableRefObject<GameRenderer>;
    cameraRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
    tool: ToolType;
    selectedObstacle: string;
    hpInput: number;
    spawnMode: 'RANDOM' | 'DRAFT';
    draftRole: Role;
    winner: Team | null;
    onSelect: (a: Agent | null) => void;
}
type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAINT' | 'PAN';
export const useGameInput = (props: GameInputProps) => {
    const { canvasRef, engine, rendererRef, cameraRef, tool, selectedObstacle, hpInput, spawnMode, draftRole, winner, onSelect } = props;
    const [pressedAgent, setPressedAgent] = useState<Agent | null>(null);
    const [draggedObstacle, setDraggedObstacle] = useState<DraggedObstacle | null>(null);
    const interactionMode = useRef<InteractionMode>('IDLE');
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPaintHex = useRef<string>("");
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<DraggedObstacle | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    const activePointers = useRef<Set<number>>(new Set());
    const cachedRectRef = useRef<DOMRect | null>(null);
    const configRef = useRef({ tool, selectedObstacle, hpInput, spawnMode, draftRole, winner });
    useEffect(() => { configRef.current = { tool, selectedObstacle, hpInput, spawnMode, draftRole, winner }; }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, winner]);
    
    const getHexFromEvent = (clientX: number, clientY: number) => {
        const cvs = canvasRef.current;
        const renderer = rendererRef.current;
        if (!cvs || !renderer) return null;
        
        return queryHexAtScreenPoint(
            clientX,
            clientY,
            cvs,
            renderer.camera,
            engine,
            renderer.grid.spatialCache,
            cachedRectRef.current ?? undefined
        );
    };

    const handlePointerDown = (e: PointerEvent) => {
        activePointers.current.add(e.pointerId);
        if (activePointers.current.size > 1) { interactionMode.current = 'IDLE'; return; }
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const cvs = canvasRef.current;
        if (!cvs) return;
        cachedRectRef.current = cvs.getBoundingClientRect();
        const rect = cachedRectRef.current;
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        const h = getHexFromEvent(e.clientX, e.clientY);
        const agent = h ? queryAgentAt(engine, h.q, h.r) : undefined;
        
        if (agent) { 
            pressedAgentRef.current = agent; 
            setPressedAgent(agent); 
        }
        else if (h && !engine.isRunning && configRef.current.tool === ToolType.SELECT && queryHasObstacle(engine, h.q, h.r)) {
            const obsType = queryObstacleTypeAt(engine, h.q, h.r);
            const obj = { type: obsType, originQ: h.q, originR: h.r, px: 0, py: 0 };
            draggedObstacleRef.current = obj;
            setDraggedObstacle(obj);
        }
        interactionMode.current = 'DOWN';
        cvs.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e: PointerEvent) => {
        if (!lastPointerPos.current || activePointers.current.size > 1) return;
        const cvs = canvasRef.current;
        if (!cvs) return;
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const dx = sx - lastPointerPos.current.x, dy = sy - lastPointerPos.current.y;
        const h = getHexFromEvent(e.clientX, e.clientY);
        hoveredHexRef.current = (h && queryIsValidHex(engine, h.q, h.r)) ? h : null;
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Vector.dist(pressStartPos.current, {x: sx, y: sy});
            const driftThreshold = e.pointerType === 'touch' ? 18 : 8;
            if (dist > driftThreshold) {
                if (!engine.isRunning && configRef.current.tool === ToolType.SELECT) {
                    if (pressedAgentRef.current) interactionMode.current = 'DRAG_UNIT';
                    else if (draggedObstacleRef.current) { 
                        interactionMode.current = 'DRAG_OBS'; 
                        engine.bus.emit('UI_COMMAND', {
                            type: 'REMOVE_OBSTACLE',
                            q: draggedObstacleRef.current.originQ,
                            r: draggedObstacleRef.current.originR,
                        });
                    }
                    else interactionMode.current = 'PAN';
                } else if (!engine.isRunning && configRef.current.tool !== ToolType.SELECT) interactionMode.current = 'PAINT';
                else interactionMode.current = 'PAN';
            }
        }
        if (interactionMode.current === 'PAN') { 
            // 如果玩家手動拖曳，通知 CameraSystem 暫停自動導播 (D12: 透過 UICommand 派發)
            engine.bus.emit('UI_COMMAND', { type: 'CAMERA_PAN', dx, dy });
            // 同時更新 React 的 ref 狀態供其他組件讀取 (HUD等)
            if (cameraRef.current) {
                // 注意：這裡其實是把「期望位置」反饋給 React 狀態
                // 但真正的渲染位置由 CameraSystem 物理計算決定
            }
            cvs.style.cursor = 'move'; 
        }
        else if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            if (h && queryIsValidHex(engine, h.q, h.r)) {
                const snap = queryHexToWorldSnap(engine, h.q, h.r);
                // D11: Transient drag preview pose write (Documented exception, committed on pointerup)
                const a = pressedAgentRef.current;
                a.px = snap.worldX;
                a.py = snap.worldY;
                a.dragOverQ = h.q;   
                a.dragOverR = h.r;
            }
            cvs.style.cursor = 'grabbing';
        }
        else if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            if (h && queryIsValidHex(engine, h.q, h.r)) {
                const snap = queryHexToWorldSnap(engine, h.q, h.r);
                // D11: Transient drag obstacle preview pose write (Documented exception, committed on pointerup)
                draggedObstacleRef.current.px = snap.worldX;
                draggedObstacleRef.current.py = snap.worldY;
                draggedObstacleRef.current.terrainHeight = snap.terrainHeight;
                draggedObstacleRef.current.hoverQ = h.q;
                draggedObstacleRef.current.hoverR = h.r;
            }
            setDraggedObstacle({ ...draggedObstacleRef.current });
            cvs.style.cursor = 'grabbing';
        }
        else if (interactionMode.current === 'PAINT' && h) executePaintAction(h);
        lastPointerPos.current = { x: sx, y: sy };
    };
    const handlePointerUp = (e: PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (interactionMode.current === 'DOWN') {
            const currentTool = configRef.current.tool;
            if (currentTool !== ToolType.SELECT) {
                const h = getHexFromEvent(e.clientX, e.clientY);
                if (h) executePaintAction(h);
            } else {
                onSelect(pressedAgentRef.current);
            }
        }
        else if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const a = pressedAgentRef.current;
            const h = getHexFromEvent(e.clientX, e.clientY);
            const targetQ = h ? h.q : a.q;
            const targetR = h ? h.r : a.r;
            engine.bus.emit('UI_COMMAND', {
                type: 'MOVE_AGENT',
                agentId: a.id,
                q: targetQ,
                r: targetR,
            });
        } else if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const h = getHexFromEvent(e.clientX, e.clientY);
            if (
                h &&
                queryIsValidHex(engine, h.q, h.r) &&
                !queryAgentAt(engine, h.q, h.r) &&
                !queryHasObstacle(engine, h.q, h.r)
            ) {
                engine.bus.emit('UI_COMMAND', {
                    type: 'SET_OBSTACLE',
                    q: h.q,
                    r: h.r,
                    obstacleType: draggedObstacleRef.current.type,
                });
            } else {
                engine.bus.emit('UI_COMMAND', {
                    type: 'SET_OBSTACLE',
                    q: draggedObstacleRef.current.originQ,
                    r: draggedObstacleRef.current.originR,
                    obstacleType: draggedObstacleRef.current.type,
                });
            }
        }
        interactionMode.current = 'IDLE';
        pressedAgentRef.current = null; setPressedAgent(null);
        draggedObstacleRef.current = null; setDraggedObstacle(null);
        cvs.style.cursor = 'default';
        cvs.releasePointerCapture(e.pointerId);
    };
    const executePaintAction = (h: Hex) => {
        const { tool, winner, selectedObstacle, spawnMode, draftRole, hpInput } = configRef.current;
        if (engine.isRunning || winner !== null) return;
        const k = HexUtils.key(h);
        if (lastPaintHex.current === k) return; 
        lastPaintHex.current = k;
        if (tool === ToolType.DELETE) {
            engine.bus.emit('UI_COMMAND', { type: 'REMOVE_OBSTACLE', q: h.q, r: h.r });
            engine.bus.emit('UI_COMMAND', { type: 'REMOVE_AGENT_AT', q: h.q, r: h.r });
        } else if (tool === ToolType.OBSTACLE) {
            engine.bus.emit('UI_COMMAND', { type: 'REMOVE_AGENT_AT', q: h.q, r: h.r });
            engine.bus.emit('UI_COMMAND', {
                type: 'SET_OBSTACLE',
                q: h.q,
                r: h.r,
                obstacleType: selectedObstacle,
            });
        } else if (tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED) {
            const existing = queryAgentAt(engine, h.q, h.r);
            if (!existing && !queryHasObstacle(engine, h.q, h.r)) {
                engine.bus.emit('UI_COMMAND', {
                    type: 'PLACE_AGENT',
                    team: tool === ToolType.ADD_BLUE ? Team.BLUE : Team.RED,
                    q: h.q,
                    r: h.r,
                    hp: hpInput,
                    role: spawnMode === 'DRAFT' ? draftRole : undefined,
                });
            }
        }
    };
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        cvs.addEventListener('pointerdown', handlePointerDown);
        cvs.addEventListener('pointermove', handlePointerMove);
        cvs.addEventListener('pointerup', handlePointerUp);
        cvs.addEventListener('pointercancel', handlePointerUp);
        return () => {
            cvs.removeEventListener('pointerdown', handlePointerDown);
            cvs.removeEventListener('pointermove', handlePointerMove);
            cvs.removeEventListener('pointerup', handlePointerUp);
            cvs.removeEventListener('pointercancel', handlePointerUp);
        };
    }, []);
    return { hoveredHexRef, pressedAgent, draggedObstacle };
};
