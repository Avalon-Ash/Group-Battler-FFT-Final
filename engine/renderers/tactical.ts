
import { Agent, GameEngine } from "../game";
import { Camera } from "../renderer"; 
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { Team, Role } from "../../types";
import { HEX_SIZE, UNIT_BODY_OFFSET } from "../../constants";

export interface RenderCamera {
    x: number;
    y: number;
    zoom: number;
}

const MAX_UNIT_SIZE_RATIO = 0.85; 
const UNIT_REFERENCE_HEIGHT = 100; 

export class TacticalRenderer {
    // Hologram Glitch State
    private holoGlitchTimer = 0;
    private lastDirectorTarget = "";

    public update(dt: number, engine: GameEngine) {
        // Hologram Glitch Logic
        if (engine.directorTargetId !== this.lastDirectorTarget) {
            this.lastDirectorTarget = engine.directorTargetId || "";
            this.holoGlitchTimer = 0.3; // Trigger glitch for 0.3s
        }
        if (this.holoGlitchTimer > 0) this.holoGlitchTimer -= dt;
    }

    public drawOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine, highlight: Agent | null, grid: GridSystem, globalTime: number) {
        ctx.save();
        
        // Selected Agent Details (Path & Targets)
        if (highlight && highlight.hp > 0) {
            const hH = grid.getTerrainHeight(highlight.q, highlight.r, engine);
            const startPx = highlight.px;
            const startPy = highlight.py - hH - 30; // Waist height

            // 1. Movement Trajectory
            if (highlight.trajectory.length > 0) {
                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                
                highlight.trajectory.forEach(hex => {
                    const p = HexUtils.toPx(hex.q, hex.r, engine.mapConfig);
                    const h = grid.getTerrainHeight(hex.q, hex.r, engine);
                    ctx.lineTo(p.x, p.y - h - 30);
                });
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]); // Dashed Line
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                ctx.setLineDash([]); // Reset
                ctx.globalAlpha = 1.0;
                
                // Destination Marker
                const dest = highlight.trajectory[highlight.trajectory.length - 1];
                const dP = HexUtils.toPx(dest.q, dest.r, engine.mapConfig);
                const dH = grid.getTerrainHeight(dest.q, dest.r, engine);
                
                ctx.save();
                ctx.translate(dP.x, dP.y - dH);
                ctx.scale(1, 0.6);
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); 
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3; ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.lineWidth=2; ctx.stroke();
                ctx.restore();
            }

            // 2. Target Line
            if (highlight.target && highlight.target.hp > 0) {
                const t = highlight.target;
                const tH = grid.getTerrainHeight(t.q, t.r, engine);
                const endPx = t.px;
                const endPy = t.py - tH - 30;

                const grad = ctx.createLinearGradient(startPx, startPy, endPx, endPy);
                const isEnemy = highlight.team !== t.team;
                const color = isEnemy ? '#ef4444' : '#4ade80';
                
                grad.addColorStop(0, 'rgba(0,0,0,0)'); // Fade out near source
                grad.addColorStop(0.2, color);
                grad.addColorStop(1, color);

                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                ctx.lineTo(endPx, endPy);
                
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8 + Math.sin(globalTime * 10) * 0.2; // Pulse
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.restore();
    }

    public drawHUD(ctx: CanvasRenderingContext2D, engine: GameEngine, w: number, h: number, cam: RenderCamera, globalTime: number) {
        if (!engine.directorTargetId) return;
        const agent = engine.agents.find(a => a.id === engine.directorTargetId);
        if (!agent) return;

        // Position: Top Right
        const width = 260;
        const height = 140;
        const hudX = w - width - 20;
        const hudY = 20;

        ctx.save();
        
        // Glitch logic
        let gx = 0, gy = 0;
        if (this.holoGlitchTimer > 0) {
             gx = (Math.random() - 0.5) * 5;
             gy = (Math.random() - 0.5) * 5;
        }
        ctx.translate(hudX + gx, hudY + gy);

        const teamColor = agent.team === Team.BLUE ? '#06b6d4' : '#ef4444'; // Cyan / Red

        // --- BACKGROUND (Liquid Glass) ---
        // Rounded Rect
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 0, width, height, 16);
        else ctx.rect(0, 0, width, height);
        
        // Fill
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.8)'); // Slate-900
        bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.5)');
        ctx.fillStyle = bgGrad;
        ctx.fill();

        // Border & Glow
        ctx.shadowColor = teamColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner Highlight
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(1, 1, width-2, height-2, 16);
        else ctx.rect(1, 1, width-2, height-2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- CONTENT ---
        ctx.fillStyle = teamColor;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TARGET: ${agent.id}`, 20, 30);
        
        ctx.fillStyle = '#94a3b8'; // Slate-400
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(`STATUS:`, 20, 50);
        
        ctx.fillStyle = '#f8fafc'; // Slate-50
        ctx.fillText(agent.btStatus || 'IDLE', 70, 50);

        // --- PIPELINE GRAPH ---
        const startX = 50;
        const startY = 90;
        const gap = 80;
        const nodes = [
            { label: 'SCAN', active: true },
            { label: 'THINK', active: agent.btStatus !== '待機' && agent.btStatus !== 'IDLE' },
            { label: 'ACT', active: agent.isMoving || agent.castingSkillIdx !== -1 }
        ];

        // Connecting Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + gap * 2, startY);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Active Line Progress
        if (nodes[1].active) {
            const t = (globalTime * 2) % 1;
            const flowX = startX + t * (gap * 2);
            ctx.beginPath();
            ctx.arc(flowX, startY, 2, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }

        nodes.forEach((n, i) => {
            const x = startX + i * gap;
            
            // Node Circle
            ctx.beginPath();
            ctx.arc(x, startY, 8, 0, Math.PI*2);
            
            if (n.active) {
                ctx.fillStyle = teamColor;
                ctx.shadowColor = teamColor;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // White Core
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(x, startY, 3, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = '#1e293b'; // Slate-800
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            }

            // Label
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = n.active ? '#fff' : '#64748b';
            ctx.fillText(n.label, x, startY + 20);
        });

        ctx.restore();
    }

    public drawDebug(ctx: CanvasRenderingContext2D, fps: number): void {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; 
        ctx.font = '10px monospace';
        ctx.fillText(`FPS: ${fps}`, 10, 20);
    }
}
