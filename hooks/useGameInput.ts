
// ╔══════════════════════════════════════════════════════════╗
// ║  useGameInput — 畫布指標輸入分派（契約 G3、ADR 0026 K3/K4）║
// ║  職責：收畫布 pointer 事件，照 tapIntent.pointerGesture／   ║
// ║        multiPointerGesture 分派手勢（PLAY 滑鼠左鍵按下下令、║
// ║        中／右鍵拖鏡頭、右鍵點一下取消瞄準；PLAY 觸控單指放  ║
// ║        開下令、兩指中點平移鏡頭、第二指取消單指指令；其餘   ║
// ║        照舊放開才判斷），只轉送 UI_COMMAND，並透過         ║
// ║        playPointerRef 提供 Quick Cast 與技能鈕拖曳查詢。    ║
// ║  上游：components/GameCanvas.tsx                          ║
// ╚══════════════════════════════════════════════════════════╝

import { useRef, useEffect, MutableRefObject, useState, useCallback } from 'react';
import { GameEngine, Agent } from '../engine/game';
import { ToolType, Hex, Team, Role, BodyTypeId, type UICommand } from '../types';
import { HexUtils } from '../engine/utils';
import { GameRenderer } from '../engine/renderer';
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
import { pointerGesture, multiPointerGesture, resolveTap, resolveQuickCast, resolveSkillDrop, hoverHexOf, isPastDragSlop, type PointerGesture, type SkillDropIntent, type TapIntent, mouseChordChange, heldMouseButtons } from '../engine/systems/ui/tapIntent';

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
    /** PLAY 輸入埠（ADR 0026 K3、K4）：填入 Quick Cast、技能鈕拖曳預覽與放開結算 */
    playPointerRef?: MutableRefObject<PlayPointerPort | null>;
}
type InteractionMode = 'IDLE' | 'DOWN' | 'ORDER_UP' | 'ORDERED' | 'CAMERA_DOWN' | 'TWO_FINGER_PAN' | 'DRAG_UNIT' | 'DRAG_OBS' | 'PAINT' | 'PAN';
/** 指標事件裡取格子與單位要用的部分（PointerEvent 或最後一次記下的位置） */
type PointerSample = Pick<PointerEvent, 'clientX' | 'clientY' | 'pointerType'>;
/** PLAY 輸入埠（ADR 0026 K3、K4）：由 useGameInput 填入、App 持有、PlayHUD 讀取 */
export interface PlayPointerPort {
    quickCast(slot: number): UICommand | null;
    hoverAt(p: PointerSample | null): void;
    dropSkill(slot: number, p: PointerSample): SkillDropIntent;
    /** 技能鈕按下後的位移算不算開始拖（規則在 tapIntent.isPastDragSlop，這裡只轉手） */
    isPastDragSlop(dxPx: number, dyPx: number, pointerType: string): boolean;
}

/** activeButtonRef 的「沒有手勢」（PointerEvent.button 不會是負數） */
const NO_ACTIVE_BUTTON = -1;

export const useGameInput = (props: GameInputProps) => {
    const { canvasRef, engine, rendererRef, cameraRef, tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner, selectedAgent, onSelect, playPointerRef } = props;
    const [pressedAgent, setPressedAgent] = useState<Agent | null>(null);
    const [draggedObstacle, setDraggedObstacle] = useState<DraggedObstacle | null>(null);
    const interactionMode = useRef<InteractionMode>('IDLE');
    const activeGestureRef = useRef<PointerGesture>('IGNORE');
    /** 目前手勢是哪一顆滑鼠鍵開始的（chord 放開時判斷是不是它，終審 #3）；NO_ACTIVE_BUTTON＝沒有手勢 */
    const activeButtonRef = useRef<number>(NO_ACTIVE_BUTTON);
    const lastPointerPos = useRef<{x: number, y: number} | null>(null);
    const pressStartPos = useRef<{x: number, y: number} | null>(null);
    const lastPaintHex = useRef<string>("");
    const pressedAgentRef = useRef<Agent | null>(null);
    const draggedObstacleRef = useRef<DraggedObstacle | null>(null);
    const hoveredHexRef = useRef<Hex | null>(null);
    /** 最後一個滑鼠指標位置（觸控沒有懸停：放開、離開畫布就清掉）；瞄準中每幀用它重算游標格（refreshHover） */
    const lastHoverPointerRef = useRef<PointerSample | null>(null);
    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
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
    const trackHover = (e: PointerSample) => {
        lastHoverPointerRef.current = e.pointerType === 'touch' ? null : { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType };
        resolveHover(e);
    };
    /**
     * 每幀呼叫（GameCanvas 畫之前）：瞄準中滑鼠不動時（按 1～4 開始瞄準、單位走開、鏡頭移動），游標格也跟著現在的局面；
     * 瞄準結束那一幀再算一次，換回一般的游標格。不在瞄準時不重算（游標格照舊只隨 pointermove 更新）。
     * 穩定的函式（和事件處理一樣只讀 ref），交給每幀迴圈不會換手。
     */
    const wasAimingRef = useRef(false);
    const refreshHover = useCallback(() => {
        const aiming = engine.state.aim !== null;
        if ((aiming || wasAimingRef.current) && lastHoverPointerRef.current) resolveHover(lastHoverPointerRef.current);
        wasAimingRef.current = aiming;
    }, []);

    const dispatchTapIntent = (intent: TapIntent) => {
        if (intent.kind === 'ORDER') engine.bus.emit('UI_COMMAND', intent.command);
        else if (intent.kind === 'SELECT') onSelect(intent.agent);
    };

    const handlePointerDown = (e: PointerEvent) => {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.current.size > 1) {
            const cvs = canvasRef.current;
            const multi = multiPointerGesture(Boolean(engine.matchFlow?.isPlay), e.pointerType, activePointers.current.size);
            if (multi === 'CAMERA_TWO_FINGER') {
                cvs?.setPointerCapture(e.pointerId);
                interactionMode.current = 'TWO_FINGER_PAN';
            } else {
                interactionMode.current = 'IDLE';
            }
            activeGestureRef.current = 'IGNORE';
            hoveredHexRef.current = null;
            lastHoverPointerRef.current = null;
            return;
        }
        const gesture = pointerGesture(Boolean(engine.matchFlow?.isPlay), e.pointerType, e.button);
        // 不處理的鍵不 capture，在畫布外放開時收不到 pointerup：不記進 activePointers，否則懸停格會停更新
        if (gesture === 'IGNORE') { activePointers.current.delete(e.pointerId); return; }
        beginGesture(e, gesture, e.button, true);
    };
    /**
     * 一顆鍵（或一根指標）開始一個手勢。allowOrder＝false：只接手按著的狀態、不下令
     * （滑鼠 chord 放開另一顆鍵後，還按著的那一顆，終審 #3）。
     */
    const beginGesture = (e: PointerEvent, gesture: PointerGesture, button: number, allowOrder: boolean) => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        if (gesture === 'CAMERA') e.preventDefault();
        cachedRectRef.current = cvs.getBoundingClientRect();
        const rect = cachedRectRef.current;
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        pressStartPos.current = { x: sx, y: sy };
        lastPointerPos.current = { x: sx, y: sy };
        lastPaintHex.current = "";
        activeGestureRef.current = gesture;
        activeButtonRef.current = button;
        cvs.setPointerCapture(e.pointerId);

        if (gesture === 'CAMERA' || gesture === 'CAMERA_OR_CANCEL') {
            interactionMode.current = 'CAMERA_DOWN';
            return;
        }

        if (gesture === 'ORDER_ON_UP') {
            trackHover(e);
            interactionMode.current = 'ORDER_UP';
            return;
        }

        const h = getHexFromEvent(e.clientX, e.clientY);
        const agent = getAgentFromEvent(e, h);

        if (gesture === 'ORDER_ON_DOWN') {
            trackHover(e);
            if (allowOrder) dispatchTapIntent(resolveTap(engine, configRef.current.selectedAgent, h, agent ?? null));
            interactionMode.current = 'ORDERED';
            return;
        }

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
    };
    const handlePointerMove = (e: PointerEvent) => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const prev = activePointers.current.get(e.pointerId);
        if (prev) activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const chord = mouseChordChange(e.pointerType, e.button, e.buttons);
        if (chord !== null) { handleMouseChord(e, chord); return; }
        if (interactionMode.current === 'TWO_FINGER_PAN') {
            if (activePointers.current.size === 2 && prev) {
                const dx = (e.clientX - prev.x) / 2;
                const dy = (e.clientY - prev.y) / 2;
                if (dx !== 0 || dy !== 0) engine.bus.emit('UI_COMMAND', { type: 'CAMERA_PAN', dx, dy });
            }
            return;
        }
        if (!lastPointerPos.current || activePointers.current.size > 1 || (interactionMode.current === 'IDLE' && activePointers.current.size > 0)) {
            // 尚未按過指標時也要更新懸停格（放置預覽、格子高亮）
            if (activePointers.current.size === 0) {
                trackHover(e);
            }
            return;
        }
        if (interactionMode.current === 'ORDER_UP') {
            trackHover(e);
            return;
        }
        const rect = cvs.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const dx = sx - lastPointerPos.current.x, dy = sy - lastPointerPos.current.y;
        const h = getHexFromEvent(e.clientX, e.clientY);
        trackHover(e);
        if (interactionMode.current === 'DOWN' && pressStartPos.current) {
            if (isPastDragSlop(sx - pressStartPos.current.x, sy - pressStartPos.current.y, e.pointerType)) {
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
        } else if (interactionMode.current === 'CAMERA_DOWN' && pressStartPos.current) {
            // 鏡頭鍵只有滑鼠會進來（tapIntent.pointerGesture），所以這裡照滑鼠門檻
            if (isPastDragSlop(sx - pressStartPos.current.x, sy - pressStartPos.current.y, e.pointerType)) {
                interactionMode.current = 'PAN';
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
        endGesture(e, e.type === 'pointerup');
        if (cvs.hasPointerCapture?.(e.pointerId)) cvs.releasePointerCapture(e.pointerId);
    };
    /** 結束目前的手勢（released＝真的放開，pointercancel 傳 false：不下令、不取消瞄準），回到 IDLE */
    const endGesture = (e: PointerEvent, released: boolean) => {
        if (interactionMode.current === 'ORDER_UP') {
            if (released) {
                const h = getHexFromEvent(e.clientX, e.clientY);
                const agent = getAgentFromEvent(e, h) ?? null;
                dispatchTapIntent(resolveTap(engine, configRef.current.selectedAgent, h, agent));
            }
        }
        else if (interactionMode.current === 'DOWN') {
            const currentTool = configRef.current.tool;
            if (currentTool !== ToolType.SELECT) {
                const h = getHexFromEvent(e.clientX, e.clientY);
                if (h) executePaintAction(h);
            } else {
                // 選取工具的點擊：選取、或對選取中的玩家單位下指令（規則在 resolveTap，這裡只負責送出）
                dispatchTapIntent(resolveTap(engine, configRef.current.selectedAgent, getHexFromEvent(e.clientX, e.clientY), pressedAgentRef.current));
            }
        }
        else if (interactionMode.current === 'CAMERA_DOWN') {
            if (released && activeGestureRef.current === 'CAMERA_OR_CANCEL' && engine.state.aim !== null) {
                engine.bus.emit('UI_COMMAND', { type: 'SET_AIM', aim: null });
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
        resetGesture();
    };
    const resetGesture = () => {
        interactionMode.current = 'IDLE';
        activeGestureRef.current = 'IGNORE';
        activeButtonRef.current = NO_ACTIVE_BUTTON;
        pressedAgentRef.current = null; setPressedAgent(null);
        draggedObstacleRef.current = null; setDraggedObstacle(null);
        const cvs = canvasRef.current;
        if (cvs) cvs.style.cursor = 'default';
    };
    /**
     * 同一個滑鼠再按或放另一顆鍵（chord，只有 pointermove，終審 #3）：
     * 按下＝放棄目前的手勢、照那顆鍵開始新的（左鍵照樣下令）；
     * 放開的是目前手勢的那顆＝照放開結束它（右鍵點一下照樣取消瞄準），再由還按著的鍵接手（不下令）。
     */
    const handleMouseChord = (e: PointerEvent, chord: 'PRESS' | 'RELEASE') => {
        const isPlay = Boolean(engine.matchFlow?.isPlay);
        if (chord === 'PRESS') {
            const gesture = pointerGesture(isPlay, e.pointerType, e.button);
            if (gesture === 'IGNORE') return;
            resetGesture();
            activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            beginGesture(e, gesture, e.button, true);
            return;
        }
        if (e.button !== activeButtonRef.current) return;
        endGesture(e, true);
        const next = heldMouseButtons(e.buttons)
            .map((button) => ({ button, gesture: pointerGesture(isPlay, e.pointerType, button) }))
            .find((g) => g.gesture !== 'IGNORE');
        if (next) beginGesture(e, next.gesture, next.button, false);
        else activePointers.current.delete(e.pointerId);
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
        if (!playPointerRef) return;
        playPointerRef.current = {
            quickCast(slot) {
                const p = lastHoverPointerRef.current;
                if (!p) return null;
                const cvs = canvasRef.current;
                if (cvs) cachedRectRef.current = cvs.getBoundingClientRect();
                const h = getHexFromEvent(p.clientX, p.clientY);
                const agent = getAgentFromEvent(p, h) ?? null;
                const intent = resolveQuickCast(engine, configRef.current.selectedAgent, slot, h, agent);
                return intent.kind === 'ORDER' ? intent.command : null;
            },
            hoverAt(p) {
                if (!p) {
                    hoveredHexRef.current = null;
                    lastHoverPointerRef.current = null;
                    return;
                }
                const cvs = canvasRef.current;
                if (cvs) cachedRectRef.current = cvs.getBoundingClientRect();
                trackHover(p);
            },
            dropSkill(slot, p) {
                const cvs = canvasRef.current;
                const onBoard = cvs !== null && document.elementFromPoint(p.clientX, p.clientY) === cvs;
                if (!onBoard) return resolveSkillDrop(engine, configRef.current.selectedAgent, slot, null, null, false);
                cachedRectRef.current = cvs.getBoundingClientRect();
                const h = getHexFromEvent(p.clientX, p.clientY);
                const agent = getAgentFromEvent(p, h) ?? null;
                return resolveSkillDrop(engine, configRef.current.selectedAgent, slot, h, agent, true);
            },
            isPastDragSlop,
        };
        return () => {
            playPointerRef.current = null;
        };
    }, [engine, playPointerRef]);

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
