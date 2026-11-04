
import React, { useRef, useEffect, useCallback } from 'react';
import { Agent, GameEngine } from '../engine/game';
import { GameRenderer } from '../engine/renderer';
import { SpriteManager } from '../engine/sprites';
import { VisualMath } from '../engine/math/VisualMath';
import { Team, ToolType, Skill, Role, BodyTypeId, BattleSetup } from '../types';
import { VictoryOverlay } from './ui/VictoryOverlay';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameCamera } from '../hooks/useGameCamera';
import { useGameInput } from '../hooks/useGameInput';
import { useCameraControl } from '../hooks/useCameraControl';
import { useCompactViewport } from '../hooks/useCompactViewport';
import { GAME_CANVAS_PARAM } from '../constants';
import { getRenderDpr } from '../engine/renderers/RenderQuality';
import { PedestalGhostPainter } from '../engine/renderers/units/painters/PedestalGhostPainter';
import { HexUtils } from '../engine/utils';
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
    draftBodyType?: BodyTypeId;
    onSelect: (a: Agent | null) => void;
    winner: Team | null;
    winnerId?: string | null;
    /** 勝方單位的陣營（Allegiance side） */
    winnerSide?: number | null;
    /** 這一局的陣營設定：決定結算顯示陣營名、第幾陣營或最後倖存者 */
    battleSetup?: BattleSetup;
    rematch: () => void;
    nextLevel: () => void;
    transitionPhase: 'IDLE' | 'IN' | 'OUT';
    onOpenLogs: () => void;
}
const GameCanvas: React.FC<GameCanvasProps> = (props) => {
    const { 
        engine, tool, selectedObstacle, hpInput, selectedAgent, hoveredSkill, 
        isShowcaseMode, spawnMode, draftRole, draftBodyType, onSelect, winner, winnerId, winnerSide, battleSetup, rematch, nextLevel, transitionPhase, onOpenLogs 
    } = props;
    const isCompact = useCompactViewport();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<GameRenderer | null>(null);
    
    // Lazy init renderer
    if (rendererRef.current === null) {
        rendererRef.current = new GameRenderer();
        rendererRef.current.bind(engine);
        engine.renderer = rendererRef.current;
    }

    const { camera, centerCamera, zoom } = useGameCamera(engine);
    useCameraControl({
        canvasRef, 
        onZoom: zoom,
        engine 
    });
    
    const { pressedAgent, draggedObstacle, hoveredHexRef } = useGameInput({
        canvasRef, engine, rendererRef: rendererRef as React.MutableRefObject<GameRenderer>, cameraRef: camera,
        tool, selectedObstacle, hpInput, spawnMode, draftRole, draftBodyType, winner,
        onSelect
    });

    // Update transition state in renderer (Logic moved out of View)
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setTransitionPhase(transitionPhase);
        }
    }, [transitionPhase]);

    const handleDraw = useCallback((ctx: CanvasRenderingContext2D, fps: number) => {
        if (!rendererRef.current) return;
        
        const highlight = pressedAgent || selectedAgent || null;
        const currentHoverHex = hoveredHexRef.current;
        
        const realTime = performance.now() / 1000;
        
        rendererRef.current.draw(
            ctx, 
            engine, 
            camera.current, 
            highlight, 
            fps, 
            currentHoverHex, 
            hoveredSkill,
            engine.battleTime,
            realTime
        );

        // 放置預覽：放置工具啟用時，游標所在的空格顯示「實體」（棋座＋核心），角色投影放下後才出現
        const isPlaceTool = tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED;
        if (isPlaceTool && !engine.isRunning && winner === null && currentHoverHex && canvasRef.current
            && !engine.getAgentAt(currentHoverHex.q, currentHoverHex.r)
            && !engine.hasObstacle(currentHoverHex.q, currentHoverHex.r)) {
            const { x, y, zoom: camZoom } = camera.current;
            const dpr = getRenderDpr();
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.translate(canvasRef.current.width / dpr / 2, canvasRef.current.height / dpr / 2);
            ctx.scale(camZoom, camZoom);
            ctx.translate(-x, -y);
            const p = HexUtils.toPx(currentHoverHex.q, currentHoverHex.r, engine.mapConfig);
            const visualY = VisualMath.getIsoVisualY(p.y, engine.getTerrainHeight(currentHoverHex.q, currentHoverHex.r));
            PedestalGhostPainter.draw(
                ctx,
                tool === ToolType.ADD_BLUE ? Team.BLUE : Team.RED,
                spawnMode === 'DRAFT' ? draftRole : Role.WARRIOR,
                draftBodyType ?? 'MALE',
                engine.mapConfig.layout, p.x, visualY, realTime
            );
            ctx.restore();
        }

        // Editor Drag Overlay
        if (draggedObstacle && canvasRef.current) {
            const { type, px, py } = draggedObstacle;
            const { x, y, zoom: camZoom } = camera.current;
            const dpr = getRenderDpr();
            ctx.save();
            ctx.scale(dpr, dpr);
            const logicalW = canvasRef.current.width / dpr;
            const logicalH = canvasRef.current.height / dpr;
            ctx.translate(logicalW / 2, logicalH / 2);
            ctx.scale(camZoom, camZoom);
            ctx.translate(-x, -y); 
            const sprite = SpriteManager.getObstacleSprite(type ?? "WALL", engine.mapConfig.layout, draggedObstacle.originQ, draggedObstacle.originR);
            const liftOffset = GAME_CANVAS_PARAM.DRAG_LIFT_PX; 
            ctx.shadowColor = 'var(--token-literal-black-tint50)';
            ctx.shadowBlur = GAME_CANVAS_PARAM.DRAG_SHADOW_BLUR;
            ctx.shadowOffsetY = GAME_CANVAS_PARAM.DRAG_SHADOW_OFFSET_Y;
            ctx.globalAlpha = GAME_CANVAS_PARAM.DRAG_ALPHA;
            const visualY = VisualMath.getIsoVisualY(py, draggedObstacle.terrainHeight);
            if (sprite.sw !== undefined) ctx.drawImage(sprite.image, sprite.sx ?? 0, sprite.sy ?? 0, sprite.sw, sprite.sh ?? 0, px - sprite.anchorX, visualY - sprite.anchorY - liftOffset, sprite.width, sprite.height);
            else ctx.drawImage(sprite.image, px - sprite.anchorX, visualY - sprite.anchorY - liftOffset, sprite.width, sprite.height);
            ctx.restore();
        }
    }, [engine, pressedAgent, selectedAgent, hoveredHexRef, hoveredSkill, draggedObstacle, camera, tool, spawnMode, draftRole, draftBodyType, winner]);

    const handleResize = useCallback((w: number, h: number) => {
        // 戰鬥中尺寸變了（手機工具列收合、旋轉）交給導播重新取景，不瞬間跳回全圖
        if (w > 0 && h > 0 && !engine.isRunning) {
            centerCamera(w, h);
        }
    }, [centerCamera, engine]);

    useGameLoop(
        engine, 
        canvasRef, 
        wrapperRef, 
        rendererRef, 
        handleDraw, 
        handleResize,
        camera
    );

    const lastPhaseRef = useRef(transitionPhase);
    useEffect(() => {
        // 轉場只在全黑（IN 開始）時重新置中；OUT、IDLE 那時畫面看得到，跳了就穿幫
        const phaseChanged = lastPhaseRef.current !== transitionPhase;
        lastPhaseRef.current = transitionPhase;
        if (phaseChanged && transitionPhase !== 'IN') return;
        if (wrapperRef.current) {
            const t = setTimeout(() => {
                if (wrapperRef.current) {
                    centerCamera(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight);
                }
            }, 100);
            return () => clearTimeout(t);
        }
    }, [engine.mapConfig.w, engine.mapConfig.h, isShowcaseMode, transitionPhase, centerCamera]);

    return (
        <div ref={wrapperRef} className="w-full h-full overflow-hidden relative bg-slate-950">
            <canvas 
                ref={canvasRef} 
                className="block w-full h-full"
                style={{ 
                    backgroundColor: engine.currentScene.background,
                    touchAction: 'none' 
                }} 
                onContextMenu={(e) => e.preventDefault()}
            />
            {winner !== null && !isShowcaseMode && (
                <VictoryOverlay
                    winner={winner}
                    winnerId={winnerId}
                    winnerSide={winnerSide}
                    battleSetup={battleSetup}
                    isCompact={isCompact}
                    nextLevel={nextLevel}
                    onOpenLogs={onOpenLogs}
                    rematch={rematch}
                />
            )}
        </div>
    );
};
export default GameCanvas;
