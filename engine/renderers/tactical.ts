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
import { sameSide } from '../core/Allegiance';
import { aimedCast } from '../systems/ui/castTargeting';

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

    public drawOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine, highlight: Agent | null, grid: GridSystem, globalTime: number, frames: UnitFrameStore, hoveredHex: Hex | null = null) {
        ctx.save();
        this.drawAimTargets(ctx, engine, globalTime, frames, hoveredHex);
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
                this.drawDestination(ctx, highlight.trajectory[highlight.trajectory.length - 1], engine, grid);
            } else if (highlight.order?.type === 'MOVE') {
                // 玩家下了移動指令但還沒起步（開戰前、被定身、走不到）：先畫出目的地（契約 G3）
                this.drawDestination(ctx, highlight.order, engine, grid);
            }
            if (highlight.target && highlight.target.hp > 0) {
                const t = highlight.target;
                const tH = frames.get(t)?.groundH ?? 0;
                const endPx = t.px;
                const endPy = t.py - tH - TACTICAL_DRAW.TARGET_LIFT;
                
                if (Number.isFinite(startPx) && Number.isFinite(startPy) && Number.isFinite(endPx) && Number.isFinite(endPy)) {
                    const grad = ctx.createLinearGradient(startPx, startPy, endPx, endPy);
                    const isEnemy = !sameSide(highlight, t);
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
     * PLAY 瞄準中（engine.state.aim）：這一招點得下去的單位腳下畫一圈（敵方紅、友方綠）；
     * 游標格（tapIntent.hoverHexOf：點下去會施放的位置）上的那一個畫粗、不脈動，表示點下去打它。
     * 「能點誰」讀 aimedCast／queryCastTargeting（和 HUD、點擊同一個判斷）；位置讀 UnitFrame。沒有瞄準時什麼都不畫。
     */
    private drawAimTargets(ctx: CanvasRenderingContext2D, engine: GameEngine, globalTime: number, frames: UnitFrameStore, hoveredHex: Hex | null): void {
        const aimed = aimedCast(engine);
        if (!aimed) return;
        const { hero, targeting } = aimed;
        const focus = hoveredHex ? engine.getAgentAt(hoveredHex.q, hoveredHex.r) : undefined;
        const alpha = TACTICAL_DRAW.AIM_RING_ALPHA_BASE + Math.sin(globalTime * TACTICAL_DRAW.AIM_RING_PULSE_SPEED) * TACTICAL_DRAW.AIM_RING_ALPHA_PULSE;
        for (const id of targeting.unitIds) {
            const unit = engine.agents.find((a) => a.id === id);
            const f = unit ? frames.get(unit) : undefined;
            if (!unit || !f || !f.visible) continue;
            ctx.save();
            ctx.translate(f.footX, f.floorY);
            ctx.scale(1, TACTICAL_DRAW.DESTINATION_SQUASH);
            ctx.beginPath();
            ctx.arc(0, 0, TACTICAL_DRAW.AIM_RING_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = sameSide(unit, hero) ? TACTICAL_COLORS.TARGET_ALLY : TACTICAL_COLORS.TARGET_ENEMY;
            const focused = unit === focus;
            ctx.lineWidth = focused ? TACTICAL_DRAW.AIM_RING_FOCUS_WIDTH : TACTICAL_DRAW.AIM_RING_WIDTH;
            ctx.globalAlpha = focused ? 1 : alpha;
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * 玩家操控的單位頭上的箭頭（朝下的金色三角形，深色描邊，上下浮動）。畫在血條之上（RenderPipeline 在 HUD 之後呼叫），
     * 人擠在一起時才不會被別人的血條蓋住。開戰前場上只有核心、還沒有身體，箭頭改貼著核心上方。
     */
    public drawPlayerArrows(ctx: CanvasRenderingContext2D, engine: GameEngine, globalTime: number, frames: UnitFrameStore): void {
        for (const a of engine.agents) {
            if (a.controller !== 'PLAYER' || a.hp <= 0) continue;
            const f = frames.get(a);
            if (!f || !f.visible) continue;
            const restY = engine.battleStarted ? f.hudAnchorY - TACTICAL_DRAW.PLAYER_ARROW_LIFT : f.floorY - TACTICAL_DRAW.PLAYER_ARROW_CORE_LIFT;
            const tipY = restY + Math.sin(globalTime * TACTICAL_DRAW.PLAYER_ARROW_BOB_SPEED) * TACTICAL_DRAW.PLAYER_ARROW_BOB_PX;
            ctx.beginPath();
            ctx.moveTo(f.footX, tipY);
            ctx.lineTo(f.footX - TACTICAL_DRAW.PLAYER_ARROW_HALF_WIDTH, tipY - TACTICAL_DRAW.PLAYER_ARROW_HEIGHT);
            ctx.lineTo(f.footX + TACTICAL_DRAW.PLAYER_ARROW_HALF_WIDTH, tipY - TACTICAL_DRAW.PLAYER_ARROW_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = TACTICAL_COLORS.PLAYER_MARK;
            ctx.fill();
            ctx.strokeStyle = TACTICAL_COLORS.PLAYER_MARK_OUTLINE;
            ctx.lineWidth = TACTICAL_DRAW.PLAYER_ARROW_OUTLINE_WIDTH;
            ctx.stroke();
        }
    }
    /** 目的地標記：壓扁的圓，貼在那一格的地面上（路徑終點、待執行的移動指令共用） */
    private drawDestination(ctx: CanvasRenderingContext2D, dest: Hex, engine: GameEngine, grid: GridSystem): void {
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