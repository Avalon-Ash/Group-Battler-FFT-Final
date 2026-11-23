
import { useRef, useEffect, MutableRefObject, useState } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role, BodyTypeId } from '../types';
import { HexUtils, Vector } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';
import { GAME_INPUT_PARAM } from '../constants';
import {
    queryAgentAt,
    queryIsValidHex,
    queryHasObstacle,
    queryObstacleTypeAt,
    queryHexAtScreenPoint,
    queryHexToWorldSnap,
    queryWorldAtScreenPoint,
} from '../engine/systems/ui/editorQueries';
import { pickAgentAt } from './pickAgentAt';
import { resolveTap, hoverHexOf } from '../engine/systems/ui/tapIntent';

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
    draftBodyType?: BodyTypeId;
    winner: Team | null;
    /** 目前選取的單位：它是玩家控制的話，點擊會變成指令（契約 G3） */
    selectedAgent: Agent | null;
    onSelect: (a: Agent | null) => void;
}
type InteractionMode = 'IDLE' | 'DOWN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAINT' | 'PAN';
/** 指標事件裡取格子與單位要用的部分（PointerEvent 或最後一次記下的位置） */
type PointerSample = Pick<PointerEvent, 'clientX' | 'clientY' | 'pointerType'>;

export const useGameInput = (props: GameInputProps) => {
    const { canvasRef, engine, rendererRef, cameraRef, tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner, selectedAgent, onSelect } = props;
    const [pressedAgent, setPressedAgent] = useState<Agent | null>(null);
    const [draggedObstacle, setDraggedObstacle] = useState<DraggedObstacle | null>(null);
    const interactionMode = useRef<InteractionMode>('IDLE');
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPaintHex = useRef<string>("");
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<DraggedObstacle | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    /** 最後一個滑鼠指標位置（觸控沒有懸停：放開、離開畫布就清掉）；瞄準中每幀用它重算游標格（refreshHover） */
    const lastHoverPointerRef = useRef<PointerSample | null>(null);
    const activePointers = useRef<Set<number>>(new Set());
    const cachedRectRef = useRef<DOMRect | null>(null);
    const configRef = useRef({ tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner, selectedAgent });
    useEffect(() => { configRef.current = { tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner, selectedAgent }; }, [tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner, selectedAgent]);
    
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

    /** 指標下的單位：身體框命中優先、退回格子（規則只在 pickAgentAt；hex 是同一個指標位置的格子） */
    const getAgentFromEvent = (e: PointerSample, hex: Hex | null): Agent | undefined => {
        const renderer = rendererRef.current;
        const world = queryWorldAtScreenPoint(e.clientX, e.clientY, canvasRef.current, renderer?.camera, cachedRectRef.current ?? undefined);
        return pickAgentAt(engine, renderer?.unit, world, renderer?.camera.zoom ?? 1, e.pointerType, hex);
    };

    /** 游標格（hoveredHexRef）的唯一寫入處：規則在 tapIntent.hoverHexOf（瞄準中＝點下去會施放的位置） */
    const resolveHover = (p: PointerSample) => {
        const h = getHexFromEvent(p.clientX, p.clientY);
        hoveredHexRef.current = hoverHexOf(engine, configRef.current.selectedAgent, h, () => getAgentFromEvent(p, h) ?? null);
    };
    const trackHover = (e: PointerEvent) => {
        lastHoverPointerRef.current = e.pointerType === 'touch' ? null : { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType };
        resolveHover(e);
    };
    /** 每幀呼叫（GameCanvas 畫之前）：滑鼠不動時，按 1～4 開始瞄準、單位走開、鏡頭移動，游標格也跟著現在的局面 */
    const refreshHover = () => {
        if (lastHoverPointerRef.current) resolveHover(lastHoverPointerRef.current);
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
        const agent = getAgentFromEvent(e, h);

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
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (!lastPointerPos.current || activePointers.current.size > 1) {
            // 尚未按過指標時也要更新懸停格（放置預覽、格子高亮）
            if (activePointers.current.size === 0) {
                trackHover(e);
            }
            return;
        }
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const dx = sx - lastPointerPos.current.x, dy = sy - lastPointerPos.current.y;
        const h = getHexFromEvent(e.clientX, e.clientY);
        trackHover(e);
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            const dist = Vector.dist(pressStartPos.current, {x: sx, y: sy});
            const driftThreshold = e.pointerType === 'touch' ? GAME_INPUT_PARAM.DRAG_DRIFT_TOUCH_PX : GAME_INPUT_PARAM.DRAG_DRIFT_MOUSE_PX;
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
        // 觸控沒有懸停：手指離開就不留游標格（否則瞄準時會在上次點的地方畫範圍）
        if (e.pointerType === 'touch') { hoveredHexRef.current = null; lastHoverPointerRef.current = null; }
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (interactionMode.current === 'DOWN') {
            const currentTool = configRef.current.tool;
            if (currentTool !== ToolType.SELECT) {
                const h = getHexFromEvent(e.clientX, e.clientY);
                if (h) executePaintAction(h);
            } else {
                // 選取工具的點擊：選取、或對選取中的玩家單位下指令（規則在 resolveTap，這裡只負責送出）
                const intent = resolveTap(engine, configRef.current.selectedAgent, getHexFromEvent(e.clientX, e.clientY), pressedAgentRef.current);
                if (intent.kind === 'ORDER') engine.bus.emit('UI_COMMAND', intent.command);
                else if (intent.kind === 'SELECT') onSelect(intent.agent);
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
        const { tool, winner, selectedObstacle, spawnMode, draftRole, draftBodyType, hpInput } = configRef.current;
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
                    bodyType: draftBodyType,
                });
            }
        }
    };
    const handlePointerLeave = () => { hoveredHexRef.current = null; lastHoverPointerRef.current = null; };
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        cvs.addEventListener('pointerleave', handlePointerLeave);
        cvs.addEventListener('pointerdown', handlePointerDown);
        cvs.addEventListener('pointermove', handlePointerMove);
        cvs.addEventListener('pointerup', handlePointerUp);
        cvs.addEventListener('pointercancel', handlePointerUp);
        return () => {
            cvs.removeEventListener('pointerleave', handlePointerLeave);
            cvs.removeEventListener('pointerdown', handlePointerDown);
            cvs.removeEventListener('pointermove', handlePointerMove);
            cvs.removeEventListener('pointerup', handlePointerUp);
            cvs.removeEventListener('pointercancel', handlePointerUp);
        };
    }, []);
    return { hoveredHexRef, refreshHover, pressedAgent, draggedObstacle };
};
