import { Agent, GameEngine } from "../game";
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { TACTICAL_COLORS } from "../../constants";

export interface RenderCamera {
    x: number;
    y: number;
    zoom: number;
}

export class TacticalRenderer {
    private holoGlitchTimer = 0;
    private lastDirectorTarget = "";

    public update(dt: number, engine: GameEngine) {
        if (engine.directorTargetId !== this.lastDirectorTarget) {
            this.lastDirectorTarget = engine.directorTargetId || "";
            this.holoGlitchTimer = 0.3; 
        }
        if (this.holoGlitchTimer > 0) this.holoGlitchTimer -= dt;
    }

    public drawOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine, highlight: Agent | null, grid: GridSystem, globalTime: number) {
        ctx.save();
        if (highlight && highlight.hp > 0) {
            const hH = grid.getTerrainHeight(highlight.q, highlight.r, engine);
            const startPx = highlight.px;
            const startPy = highlight.py - hH - 30; 
            if (highlight.trajectory.length > 0) {
                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                highlight.trajectory.forEach(hex => {
                    const p = HexUtils.toPx(hex.q, hex.r, engine.mapConfig);
                    const h = grid.getTerrainHeight(hex.q, hex.r, engine);
                    ctx.lineTo(p.x, p.y - h - 30);
                });
                ctx.strokeStyle = TACTICAL_COLORS.TRAJECTORY;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]); 
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                ctx.setLineDash([]); 
                ctx.globalAlpha = 1.0;
                const dest = highlight.trajectory[highlight.trajectory.length - 1];
                const dP = HexUtils.toPx(dest.q, dest.r, engine.mapConfig);
                const dH = grid.getTerrainHeight(dest.q, dest.r, engine);
                ctx.save();
                ctx.translate(dP.x, dP.y - dH);
                ctx.scale(1, 0.6);
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); 
                ctx.fillStyle = TACTICAL_COLORS.TRAJECTORY; ctx.globalAlpha = 0.3; ctx.fill();
                ctx.strokeStyle = TACTICAL_COLORS.TRAJECTORY; ctx.globalAlpha = 0.8; ctx.lineWidth=2; ctx.stroke();
                ctx.restore();
            }
            if (highlight.target && highlight.target.hp > 0) {
                const t = highlight.target;
                const tH = grid.getTerrainHeight(t.q, t.r, engine);
                const endPx = t.px;
                const endPy = t.py - tH - 30;
                
                if (Number.isFinite(startPx) && Number.isFinite(startPy) && Number.isFinite(endPx) && Number.isFinite(endPy)) {
                    const grad = ctx.createLinearGradient(startPx, startPy, endPx, endPy);
                    const isEnemy = highlight.team !== t.team;
                    const color = isEnemy ? TACTICAL_COLORS.TARGET_ENEMY : TACTICAL_COLORS.TARGET_ALLY;
                    grad.addColorStop(0, TACTICAL_COLORS.TARGET_FADE); 
                    grad.addColorStop(0.2, color);
                    grad.addColorStop(1, color);
                    ctx.beginPath();
                    ctx.moveTo(startPx, startPy);
                    ctx.lineTo(endPx, endPy);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.8 + Math.sin(globalTime * 10) * 0.2; 
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

        const pad = 40;
        const cornerSize = 25;
        
        ctx.strokeStyle = TACTICAL_COLORS.DIRECTOR_FRAME;
        ctx.lineWidth = 1.5;

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
            ctx.arc(pad + 15, pad + 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = TACTICAL_COLORS.DIRECTOR_TEXT;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('DIRECTOR_CAM_FEED', pad + 25, pad + 18);
        
        ctx.textAlign = 'right';
        ctx.fillText(`TRK_ID: ${engine.directorTargetId}`, width - pad - 5, height - pad - 10);

        ctx.restore();
    }

    public drawDebug(ctx: CanvasRenderingContext2D, fps: number, engine: GameEngine): void {
        ctx.fillStyle = TACTICAL_COLORS.DEBUG_FPS; 
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${fps}`, 10, 20);

        // SUDDEN DEATH WARNING
        if (engine.battleTime > 60) {
            const blink = Math.floor(performance.now() / 500) % 2 === 0;
            if (blink) {
                ctx.fillStyle = TACTICAL_COLORS.SUDDEN_DEATH_ALERT; // red-500
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ SUDDEN DEATH ⚠️', ctx.canvas.width / 2, 30);
                ctx.font = '10px monospace';
                ctx.fillStyle = TACTICAL_COLORS.SUDDEN_DEATH_SUB;
                ctx.fillText('DAMAGE UP / HEALING DOWN', ctx.canvas.width / 2, 45);
            }
        }
    }
}