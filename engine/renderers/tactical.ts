
import { Agent, GameEngine } from "../game";
import { Camera } from "../renderer"; // Circular dependency? Camera interface should ideally be shared
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { Team } from "../../types";

// Re-define Camera interface locally or import if exported from types
// Assuming it was exported from renderer.ts, we should use that or move Camera to types.
// For now, let's redefine locally to match usage if not easily accessible
export interface RenderCamera {
    x: number;
    y: number;
    zoom: number;
}

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
        
        // B. Selected Agent Details (Path & Targets)
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

        // Position: Top Right, floating
        const hudX = w - 260; 
        const hudY = 60;
        const width = 240;
        const height = 160;

        ctx.save();
        
        // --- 1. Glitch Effect ---
        let gx = 0, gy = 0;
        let alphaMod = 1.0;
        if (this.holoGlitchTimer > 0) {
            gx = (Math.random() - 0.5) * 10;
            gy = (Math.random() - 0.5) * 5;
            alphaMod = 0.5 + Math.random() * 0.5;
            if (Math.random() > 0.8) alphaMod = 0.2; // Flicker out
        }
        
        // --- 2. Perspective Transform ---
        // matrix(1, 0, -0.15, 1, x, y)
        ctx.transform(1, 0, -0.15, 1, hudX + gx, hudY + gy);

        // --- 3. Glass Background ---
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        const baseColor = agent.team === Team.BLUE ? '#06b6d4' : '#f97316'; // Cyan vs Orange
        
        bgGrad.addColorStop(0, `${baseColor}40`); // 25% opacity
        bgGrad.addColorStop(1, `${baseColor}05`); // 2% opacity
        
        ctx.fillStyle = bgGrad;
        ctx.globalAlpha = alphaMod;
        ctx.fillRect(0, 0, width, height);
        
        // Grid Lines
        ctx.strokeStyle = `${baseColor}30`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=width; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
        for(let i=0; i<=height; i+=20) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
        ctx.stroke();

        // Border corners
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        const len = 15;
        ctx.beginPath();
        ctx.moveTo(0, len); ctx.lineTo(0, 0); ctx.lineTo(len, 0); // TL
        ctx.moveTo(width-len, 0); ctx.lineTo(width, 0); ctx.lineTo(width, len); // TR
        ctx.moveTo(width, height-len); ctx.lineTo(width, height); ctx.lineTo(width-len, height); // BR
        ctx.moveTo(len, height); ctx.lineTo(0, height); ctx.lineTo(0, height-len); // BL
        ctx.stroke();

        // --- 4. Content: Logic Visualization ---
        
        // Header
        ctx.fillStyle = baseColor;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`TARGET: ${agent.id}`, 10, 20);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`STATUS: ${agent.btStatus.toUpperCase()}`, 10, 35);

        // Logic Graph
        // [SCAN] -> [DECISION] -> [ACTION]
        const nodes = [
            { x: 30, y: 80, label: 'SCAN', active: true }, // Always active
            { x: 100, y: 80, label: 'THINK', active: agent.btStatus !== '待機' },
            { x: 170, y: 80, label: 'ACT', active: agent.castingSkillIdx !== -1 || agent.isMoving }
        ];

        // Draw Connections
        ctx.strokeStyle = `${baseColor}60`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.stroke();

        // Draw Active Flow (Pulse)
        const flowTime = (globalTime * 3) % 1; 
        const flowX = 30 + flowTime * 140;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flowX, 80);
        ctx.lineTo(flowX + 15, 80);
        ctx.stroke();

        // Draw Nodes
        nodes.forEach(n => {
            const isActive = n.active;
            
            // Outer Ring
            ctx.strokeStyle = isActive ? baseColor : `${baseColor}40`;
            ctx.fillStyle = `${baseColor}10`;
            ctx.beginPath(); ctx.arc(n.x, n.y, 10, 0, Math.PI*2); 
            ctx.fill(); ctx.stroke();
            
            // Inner Dot
            if (isActive) {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = baseColor; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Label
            ctx.fillStyle = isActive ? '#fff' : `${baseColor}60`;
            ctx.textAlign = 'center';
            ctx.fillText(n.label, n.x, n.y + 22);
        });

        // Special Alert: ULTIMATE
        if (agent.castingSkillIdx !== -1 && agent.skills[agent.castingSkillIdx]?.tag === 'ULT') {
            ctx.fillStyle = '#ef4444';
            ctx.globalAlpha = (0.5 + Math.sin(globalTime * 20) * 0.5) * alphaMod;
            ctx.fillRect(0, 130, width, 20);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1.0 * alphaMod;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WARNING: ULTIMATE DETECTED', width/2, 144);
        } else if (agent.hp < agent.maxHp * 0.3) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('CRITICAL CONDITION', width - 70, 20);
        }

        // --- 5. Tether Line to Unit ---
        ctx.beginPath();
        ctx.moveTo(10, height);
        ctx.lineTo(10, height + 20);
        ctx.strokeStyle = `${baseColor}40`;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    public drawDebug(ctx: CanvasRenderingContext2D, fps: number): void {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; 
        ctx.font = '10px monospace';
        ctx.fillText(`FPS: ${fps}`, 10, 20);
    }
}
