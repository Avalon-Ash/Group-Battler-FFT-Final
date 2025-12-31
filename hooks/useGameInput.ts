
import { useRef, useEffect, MutableRefObject, useState } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role } from '../types';
import { HexUtils, Vector } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';
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
    const [draggedObstacle, setDraggedObstacle] = useState<any>(null);
    const interactionMode = useRef<InteractionMode>('IDLE');
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPaintHex = useRef<string>("");
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<any>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    const activePointers = useRef<Set<number>>(new Set());
    const configRef = useRef({ tool, selectedObstacle, hpInput, spawnMode, draftRole, winner });
    useEffect(() => { configRef.current = { tool, selectedObstacle, hpInput, spawnMode, draftRole, winner }; }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, winner]);
    const getHexFromCoords = (sx: number, sy: number) => {
        if (!canvasRef.current || !rendererRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        return rendererRef.current.getHexAtScreenPoint(sx, sy, rect.width, rect.height, cameraRef.current, engine);
    };
    const handlePointerDown = (e: PointerEvent) => {
        activePointers.current.add(e.pointerId);
        if (activePointers.current.size > 1) { interactionMode.current = 'IDLE'; return; }
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const cvs = canvasRef.current;
        if (!cvs) return;
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        const h = getHexFromCoords(sx, sy);
        const agent = h ? engine.getAgentAt(h.q, h.r) : undefined;
        
        if (agent) { 
            pressedAgentRef.current = agent; 
            setPressedAgent(agent); 
        }
        else if (h && !engine.isRunning && configRef.current.tool === ToolType.SELECT && engine.hasObstacle(h.q, h.r)) {
            const obsType = engine.map.obstacles.get(HexUtils.key(h));
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
        const h = getHexFromCoords(sx, sy);
        hoveredHexRef.current = (h && engine.isValid(h.q, h.r)) ? h : null;
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Vector.dist(pressStartPos.current, {x: sx, y: sy});
            if (dist > 8) {
                if (!engine.isRunning && configRef.current.tool === ToolType.SELECT) {
                    if (pressedAgentRef.current) interactionMode.current = 'DRAG_UNIT';
                    else if (draggedObstacleRef.current) { 
                        interactionMode.current = 'DRAG_OBS'; 
                        engine.map.removeObstacle(draggedObstacleRef.current.originQ, draggedObstacleRef.current.originR); 
                    }
                    else interactionMode.current = 'PAN';
                } else if (!engine.isRunning && configRef.current.tool !== ToolType.SELECT) interactionMode.current = 'PAINT';
                else interactionMode.current = 'PAN';
            }
        }
        if (interactionMode.current === 'PAN') { 
            // 如果玩家手動拖曳，通知 CameraSystem 暫停自動導播
            if (rendererRef.current?.camera) {
                rendererRef.current.camera.applyPanOffset(dx, dy);
            }
            // 同時更新 React 的 ref 狀態供其他組件讀取 (HUD等)
            if (cameraRef.current) {
                // 注意：這裡其實是把「期望位置」反饋給 React 狀態
                // 但真正的渲染位置由 CameraSystem 物理計算決定
            }
            cvs.style.cursor = 'move'; 
        }
        else if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const { x: camX, y: camY, zoom } = cameraRef.current;
            const cx = rect.width / 2, cy = rect.height / 2;
            const terrainH = h ? rendererRef.current.getTerrainHeight(h.q, h.r, engine) : 0;
            pressedAgentRef.current.px = (sx - cx) / zoom + camX;
            pressedAgentRef.current.py = (sy - cy) / zoom + camY + terrainH;
            cvs.style.cursor = 'grabbing';
        }
        else if (interactionMode.current === 'PAINT' && h) executePaintAction(h);
        lastPointerPos.current = { x: sx, y: sy };
    };
    const handlePointerUp = (e: PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (interactionMode.current === 'DOWN') onSelect(pressedAgentRef.current);
        else if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const a = pressedAgentRef.current;
            const h = getHexFromCoords(e.clientX - cvs.getBoundingClientRect().left, e.clientY - cvs.getBoundingClientRect().top);
            if (h && engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r, a.id)) { engine.updateAgentPosition(a, h.q, h.r); const p = HexUtils.toPx(h.q, h.r, engine.mapConfig); a.px = p.x; a.py = p.y; }
            else { const p = HexUtils.toPx(a.q, a.r, engine.mapConfig); a.px = p.x; a.py = p.y; }
        } else if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const h = getHexFromCoords(e.clientX - cvs.getBoundingClientRect().left, e.clientY - cvs.getBoundingClientRect().top);
            if (h && engine.isValid(h.q, h.r) && !engine.getAgentAt(h.q, h.r) && !engine.hasObstacle(h.q, h.r)) engine.map.setObstacle(h.q, h.r, draggedObstacleRef.current.type);
            else engine.map.setObstacle(draggedObstacleRef.current.originQ, draggedObstacleRef.current.originR, draggedObstacleRef.current.type);
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
        if (tool === ToolType.DELETE) { engine.map.removeObstacle(h.q, h.r); engine.removeAgent(h.q, h.r); }
        else if (tool === ToolType.OBSTACLE) { engine.removeAgent(h.q, h.r); engine.map.setObstacle(h.q, h.r, selectedObstacle); }
        else if (tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED) {
            const existing = engine.getAgentAt(h.q, h.r);
            if (!existing && !engine.hasObstacle(h.q, h.r)) {
                let agent = engine.addAgent(tool === ToolType.ADD_BLUE ? Team.BLUE : Team.RED, h.q, h.r, hpInput);
                if (agent && spawnMode === 'DRAFT') { agent.role = draftRole; agent.saveState(); agent.reset(engine.mapConfig); }
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
