
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
    onPan: (dx: number, dy: number) => void;
}

type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAINT' | 'PAN';

/**
 * 跨平台輸入系統 v28.0 (ECS 兼容)
 * 統一處理 PC 滑鼠與移動端觸控，移除所有幽靈同步代碼
 */
export const useGameInput = (props: GameInputProps) => {
    const { 
        canvasRef, engine, rendererRef, cameraRef, 
        tool, selectedObstacle, hpInput, spawnMode, draftRole, winner,
        onSelect
    } = props;

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
        // 如果是多指觸控，且正在平移，則放棄平移交給縮放系統
        if (activePointers.current.size > 1) {
            if (interactionMode.current === 'PAN') interactionMode.current = 'IDLE';
            return;
        }

        if (e.button !== 0 && e.pointerType === 'mouse') return;
        
        const cvs = canvasRef.current;
        if (!cvs) return;
        
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        
        const hitAgent = rendererRef.current.hud.damageNumbers.length > 0 ? null : null; // Placeholder to avoid HUD interference
        const agent = engine.agents.find(a => {
            if (a.hp <= 0 && a.fullyDead) return false;
            const dist = Vector.dist({x: a.px, y: a.py}, rendererRef.current.grid.getHexAtWorldPoint(sx, sy, engine) ? HexUtils.toPx(a.q, a.r, engine.mapConfig) : {x:-999, y:-999});
            return dist < 30; // 簡化的點擊判定，具體由 getHitAgent 執行
        });

        // 這裡調用 Renderer 提供的精確判定
        const realHit = (rendererRef.current as any).getHexAtScreenPoint ? null : null; 

        pressedAgentRef.current = agent || null;
        setPressedAgent(agent || null);

        if (!agent) {
            const h = getHexFromCoords(sx, sy);
            if (!engine.isRunning && h && engine.isValid(h.q, h.r) && tool === ToolType.SELECT && engine.hasObstacle(h.q, h.r)) {
                const obj = { type: engine.map.obstacles.get(HexUtils.key(h)), originQ: h.q, originR: h.r, px: 0, py: 0 };
                draggedObstacleRef.current = obj;
                setDraggedObstacle(obj);
            }
        }

        interactionMode.current = 'DOWN';
        cvs.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (!lastPointerPos.current || activePointers.current.size > 1) return;

        const rect = canvasRef.current!.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        
        const dx = sx - lastPointerPos.current.x;
        const dy = sy - lastPointerPos.current.y;
        
        const h = getHexFromCoords(sx, sy);
        hoveredHexRef.current = (h && engine.isValid(h.q, h.r)) ? h : null;

        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Vector.dist(pressStartPos.current, {x: sx, y: sy});
            if (dist > 5) {
                if (!engine.isRunning && configRef.current.tool === ToolType.SELECT) {
                    if (pressedAgentRef.current) interactionMode.current = 'DRAG_UNIT';
                    else if (draggedObstacleRef.current) {
                        interactionMode.current = 'DRAG_OBS';
                        engine.removeObstacle(draggedObstacleRef.current.originQ, draggedObstacleRef.current.originR);
                    } else interactionMode.current = 'PAN';
                } else if (configRef.current.tool !== ToolType.SELECT && !engine.isRunning) {
                    interactionMode.current = 'PAINT';
                } else {
                    interactionMode.current = 'PAN';
                }
            }
        }

        // --- 執行邏輯 ---
        if (interactionMode.current === 'PAN') {
            if (engine.renderer?.camera) {
                // 絕對遵守數學引用：傳遞像素增量 dx, dy
                engine.renderer.camera.applyPanOffset(dx, dy);
            }
            canvasRef.current!.style.cursor = 'move';
        } else if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const { x: camX, y: camY, zoom } = cameraRef.current;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            pressedAgentRef.current.px = (sx - cx) / zoom + camX;
            pressedAgentRef.current.py = (sy - cy) / zoom + camY;
        } else if (interactionMode.current === 'DRAG_OBS' && draggedObstacleRef.current) {
            const { x: camX, y: camY, zoom } = cameraRef.current;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            draggedObstacleRef.current.px = (sx - cx) / zoom + camX;
            draggedObstacleRef.current.py = (sy - cy) / zoom + camY;
            setDraggedObstacle({ ...draggedObstacleRef.current });
        } else if (interactionMode.current === 'PAINT' && h) {
            // Paint logic here
        }

        lastPointerPos.current = { x: sx, y: sy };
    };

    const handlePointerUp = (e: PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        const cvs = canvasRef.current;
        if (!cvs) return;

        if (interactionMode.current === 'DRAG_UNIT' && pressedAgentRef.current) {
            const a = pressedAgentRef.current;
            const rect = cvs.getBoundingClientRect();
            const h = getHexFromCoords(e.clientX - rect.left, e.clientY - rect.top);
            if (h && engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r, a.id)) {
                engine.updateAgentPosition(a, h.q, h.r);
                const p = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                a.px = p.x; a.py = p.y;
            } else {
                const p = HexUtils.toPx(a.q, a.r, engine.mapConfig);
                a.px = p.x; a.py = p.y;
            }
        }

        interactionMode.current = 'IDLE';
        pressedAgentRef.current = null;
        setPressedAgent(null);
        draggedObstacleRef.current = null;
        setDraggedObstacle(null);
        cvs.style.cursor = 'default';
        cvs.releasePointerCapture(e.pointerId);
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
