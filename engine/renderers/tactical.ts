import { TACTICAL_DRAW } from "../../constants";
// ╔══════════════════════════════════════════════════════════╗
// ║  TacticalRenderer — 選取單位的路徑／目標連線、導播框、除錯  ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §3、§4。   ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, GameEngine } from "../game";
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { TACTICAL_COLORS } from "../../constants";
import { RenderStats } from "./RenderStats";
import { getQualityTier } from "./RenderQuality";
import { UnitFrameStore } from "./frame/UnitFrame";
import { Hex, Skill, Projectile } from "../../types";
import { RenderList } from "./RenderList";
import { GridRenderStrategy } from "./grid/GridRenderStrategy";
import { GridCache } from "./grid/GridCache";

export interface RenderCamera {
    x: number;
    y: number;
    zoom: number;
}

export class TacticalRenderer {
    public gridStrategy = new GridRenderStrategy();
    public gridCache = new GridCache();

    public reset() {
        this.gridCache.reset();
    }

    public submitRenderables(
        renderList: RenderList,
        engine: GameEngine,
        hoveredHex: Hex | null,
        hoveredSkill: Skill | null,
        highlightAgent: Agent | null,
        projectiles: Projectile[],
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        globalTime: number
    ) {
        this.gridStrategy.submit(
            this.gridCache,
            renderList,
            engine,
            hoveredHex,
            hoveredSkill,
            highlightAgent,
            projectiles,
            transitionT,
            transitionPhase,
            globalTime
        );
    }

    public update(dt: number, engine: GameEngine) {
    }

    public drawOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine, highlight: Agent | null, grid: GridSystem, globalTime: number, frames: UnitFrameStore) {
        ctx.save();
        const hFrame = highlight && highlight.hp > 0 ? frames.get(highlight) : undefined;
        if (highlight && hFrame) {
            // 單位的腳下高度一律來自 UnitFrame（含漂浮位移與移動過渡）；路徑格的高度維持以格為單位
            const hH = hFrame.groundH;
            const startPx = highlight.px;
            const startPy = highlight.py - hH - TACTICAL_DRAW.PATH_LIFT;
            if (highlight.trajectory.length > 0) {
                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                highlight.trajectory.forEach(hex => {
                    const p = HexUtils.toPx(hex.q, hex.r, engine.mapConfig);
                    const h = grid.getTerrainHeight(hex.q, hex.r, engine);
                    ctx.lineTo(p.x, p.y - h - TACTICAL_DRAW.PATH_LIFT);
                });
                ctx.strokeStyle = TACTICAL_COLORS.TRAJECTORY;
                ctx.lineWidth = 2;
                ctx.setLineDash([TACTICAL_DRAW.PATH_DASH_LENGTH, TACTICAL_DRAW.PATH_DASH_GAP]); 
                ctx.globalAlpha = TACTICAL_DRAW.PATH_ALPHA;
                ctx.stroke();
                ctx.setLineDash([]); 
                ctx.globalAlpha = 1.0;
                const dest = highlight.trajectory[highlight.trajectory.length - 1];
                const dP = HexUtils.toPx(dest.q, dest.r, engine.mapConfig);
                const dH = grid.getTerrainHeight(dest.q, dest.r, engine);
                ctx.save();
                ctx.translate(dP.x, dP.y - dH);
                ctx.scale(1, TACTICAL_DRAW.DESTINATION_SQUASH);
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); 
                ctx.fillStyle = TACTICAL_COLORS.TRAJECTORY; ctx.globalAlpha = TACTICAL_DRAW.DESTINATION_FILL_ALPHA; ctx.fill();
                ctx.strokeStyle = TACTICAL_COLORS.TRAJECTORY; ctx.globalAlpha = TACTICAL_DRAW.DESTINATION_LINE_ALPHA; ctx.lineWidth=2; ctx.stroke();
                ctx.restore();
            }
            if (highlight.target && highlight.target.hp > 0) {
                const t = highlight.target;
                const tH = frames.get(t)?.groundH ?? 0;
                const endPx = t.px;
                const endPy = t.py - tH - TACTICAL_DRAW.TARGET_LIFT;
                
                if (Number.isFinite(startPx) && Number.isFinite(startPy) && Number.isFinite(endPx) && Number.isFinite(endPy)) {
                    const grad = ctx.createLinearGradient(startPx, startPy, endPx, endPy);
                    const isEnemy = highlight.team !== t.team;
                    const color = isEnemy ? TACTICAL_COLORS.TARGET_ENEMY : TACTICAL_COLORS.TARGET_ALLY;
                    grad.addColorStop(0, TACTICAL_COLORS.TARGET_FADE); 
                    grad.addColorStop(TACTICAL_DRAW.TARGET_COLOR_STOP, color);
                    grad.addColorStop(1, color);
                    ctx.beginPath();
                    ctx.moveTo(startPx, startPy);
                    ctx.lineTo(endPx, endPy);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = TACTICAL_DRAW.TARGET_ALPHA_BASE + Math.sin(globalTime * 10) * TACTICAL_DRAW.TARGET_ALPHA_PULSE; 
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }
        }
        ctx.restore();
    }

    /**
     * Draws cinematic HUD elements when director target is active
     */
    public drawHUD(ctx: CanvasRenderingContext2D, engine: GameEngine, width: number, height: number, camera: RenderCamera, globalTime: number): void {
        if (!engine.directorTargetId) return;

        ctx.save();
        // Removed ctx.resetTransform() to respect the DPR scaling from RenderPipeline

        const pad = TACTICAL_DRAW.DIRECTOR_PADDING;
        const cornerSize = TACTICAL_DRAW.DIRECTOR_CORNER;
        
        ctx.strokeStyle = TACTICAL_COLORS.DIRECTOR_FRAME;
        ctx.lineWidth = TACTICAL_DRAW.DIRECTOR_LINE_WIDTH;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(pad + cornerSize, pad);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad, pad + cornerSize);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(width - pad - cornerSize, pad);
        ctx.lineTo(width - pad, pad);
        ctx.lineTo(width - pad, pad + cornerSize);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(pad + cornerSize, height - pad);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(pad, height - pad - cornerSize);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(width - pad - cornerSize, height - pad);
        ctx.lineTo(width - pad, height - pad);
        ctx.lineTo(width - pad, height - pad - cornerSize);
        ctx.stroke();

        const blink = Math.floor(globalTime * 2) % 2 === 0;
        if (blink) {
            ctx.fillStyle = TACTICAL_COLORS.DIRECTOR_REC;
            ctx.beginPath();
            ctx.arc(pad + TACTICAL_DRAW.REC_OFFSET_X, pad + TACTICAL_DRAW.REC_OFFSET_Y, TACTICAL_DRAW.REC_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = TACTICAL_COLORS.DIRECTOR_TEXT;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DIRECTOR_CAM_FEED', pad + TACTICAL_DRAW.DIRECTOR_LABEL_X, pad + TACTICAL_DRAW.DIRECTOR_LABEL_Y);
        
        ctx.textAlign = 'right';
        ctx.fillText(`TRK_ID: ${engine.directorTargetId}`, width - pad - TACTICAL_DRAW.TRACK_LABEL_INSET, height - pad - 10);

        ctx.restore();
    }

    public drawDebug(ctx: CanvasRenderingContext2D, fps: number, engine: GameEngine): void {
        ctx.fillStyle = TACTICAL_COLORS.DEBUG_FPS; 
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';

        if (!RenderStats.enabled) {
            ctx.fillText(`FPS: ${fps}`, 10, TACTICAL_DRAW.DEBUG_FPS_Y);
        } else {
            const hud = RenderStats.getHudStats();
            ctx.fillText(`FPS: ${hud.fps} (1% low: ${hud.onePercentLow} | max1s: ${hud.max1sMs.toFixed(1)}ms | frame total: ${hud.frameTotalMs.toFixed(1)}ms | JS合計: ${hud.jsTotalMs.toFixed(1)}ms)`, 10, TACTICAL_DRAW.DEBUG_FPS_Y);
            const summary = RenderStats.formatSummary();
            const text = summary ? `${summary} | tier:${getQualityTier()}` : `tier:${getQualityTier()}`;
            ctx.fillText(text, 10, TACTICAL_DRAW.DEBUG_SUMMARY_Y);
            ctx.fillText(RenderStats.formatSpikeSummary(), 10, TACTICAL_DRAW.DEBUG_SPIKE_Y);
        }

        // SUDDEN DEATH WARNING
        if (engine.battleTime > 60) {
            const blink = Math.floor(performance.now() / TACTICAL_DRAW.SUDDEN_DEATH_BLINK_MS) % 2 === 0;
            if (blink) {
                ctx.fillStyle = TACTICAL_COLORS.SUDDEN_DEATH_ALERT; // red-500
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ SUDDEN DEATH ⚠️', ctx.canvas.width / 2, TACTICAL_DRAW.SUDDEN_DEATH_TITLE_Y);
                ctx.font = '10px monospace';
                ctx.fillStyle = TACTICAL_COLORS.SUDDEN_DEATH_SUB;
                ctx.fillText('DAMAGE UP / HEALING DOWN', ctx.canvas.width / 2, TACTICAL_DRAW.SUDDEN_DEATH_SUBTITLE_Y);
            }
        }
    }
}