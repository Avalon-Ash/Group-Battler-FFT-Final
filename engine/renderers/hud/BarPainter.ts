
import { Agent } from "../../game";
import { Team } from "../../../types";

const BAR_WIDTH = 44;
const BAR_HEIGHT = 6;
const BAR_PADDING = 3;

export const BarPainter = {
    
    drawUnitBars(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, isSelected: boolean) {
        const hasMp = agent.maxMp > 0;
        
        const contentW = BAR_WIDTH;
        const hpHeight = BAR_HEIGHT;
        const mpHeight = hasMp ? 3 : 0;
        const gap = hasMp ? 2 : 0;
        
        const contentH = hpHeight + gap + mpHeight;
        const totalW = contentW + BAR_PADDING * 2;
        const totalH = contentH + BAR_PADDING * 2;
        
        const startX = x - totalW / 2;
        const startY = y - 5; 

        // Container
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(startX, startY, totalW, totalH, 6);
        else ctx.rect(startX, startY, totalW, totalH);
        
        // Dark Glass BG
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)'; 
        ctx.fill();
        
        // Team-colored Border Highlight
        const teamBorder = agent.team === Team.BLUE ? '#3b82f6' : '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeStyle = isSelected ? teamBorder : 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        if (isSelected) {
            ctx.shadowColor = teamBorder;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.restore();

        const barX = startX + BAR_PADDING;
        const barY = startY + BAR_PADDING;

        // HP Bar - Faction Colored
        const hpPct = Math.max(0, agent.hp / agent.maxHp);
        
        // Calculate Shield Pct (Relative to Max HP)
        const shieldPct = Math.max(0, agent.shield / agent.maxHp);
        
        let hpTop, hpBot, hpGlow;

        if (agent.team === Team.BLUE) {
            // IMPERIAL CYAN/BLUE
            hpTop = '#22d3ee';
            hpBot = '#0284c7';
            hpGlow = 'rgba(6, 182, 212, 0.5)';
        } else {
            // COVENANT RED/ORANGE
            hpTop = '#f87171';
            hpBot = '#dc2626';
            hpGlow = 'rgba(220, 38, 38, 0.5)';
        }

        // 1. Draw Empty Slot Background (Dark Grey)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, contentW, hpHeight);

        // 2. Draw Base HP
        this.drawFluidBar(ctx, barX, barY, contentW, hpHeight, hpPct, hpTop, hpBot, hpGlow);

        // 3. Draw Shield Overlay (Fix: Ensure visibility)
        if (shieldPct > 0) {
            // Shield starts where HP ends
            const shieldStartX = barX + (contentW * hpPct);
            
            // Allow shield to visually overlay the empty part of HP bar, and even extend slightly
            // Max visual width is limited to remaining bar space + 20% overflow
            const remainingPct = 1.0 - hpPct;
            const drawShieldPct = Math.min(shieldPct, remainingPct + 0.3); 
            const shieldW = contentW * drawShieldPct;
            
            if (shieldW > 0.5) {
                // Shield Colors (White/Silver/Energy) - High Contrast
                const shieldTop = '#ffffff';
                const shieldBot = '#cbd5e1';
                
                ctx.save();
                ctx.beginPath();
                // No rounding on left side to connect with HP
                ctx.rect(shieldStartX, barY, shieldW, hpHeight);
                
                const grad = ctx.createLinearGradient(shieldStartX, barY, shieldStartX, barY + hpHeight);
                grad.addColorStop(0, shieldTop);
                grad.addColorStop(1, shieldBot);
                ctx.fillStyle = grad;
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 5;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Shield Seam
                ctx.beginPath();
                ctx.moveTo(shieldStartX, barY);
                ctx.lineTo(shieldStartX, barY + hpHeight);
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Over-shield indicator (White outline if shield is huge)
                if (agent.shield > agent.maxHp * 0.5) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX - 1, barY - 1, contentW + 2, hpHeight + 2);
                }
                ctx.restore();
            }
        }

        // MP Bar - Always Blue/Purple
        if (hasMp) {
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            const mpY = barY + hpHeight + gap;
            // Draw empty MP background
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(barX, mpY, contentW, mpHeight);
            
            this.drawFluidBar(ctx, barX, mpY, contentW, mpHeight, mpPct, '#a78bfa', '#7c3aed', 'rgba(139, 92, 246, 0.4)');
        }
    },

    drawFluidBar(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, pct: number, colTop: string, colBot: string, glow: string) {
        if (pct <= 0.01) return;
        const fillW = Math.max(1, bw * pct); 
        
        ctx.save();
        ctx.beginPath();
        // Slightly rounded corners
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh, 1);
        else ctx.rect(bx, by, fillW, bh);
        
        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, colTop);
        grad.addColorStop(1, colBot);
        ctx.fillStyle = grad;
        
        ctx.shadowColor = glow;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gloss highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh * 0.4, 1);
        else ctx.rect(bx, by, fillW, bh * 0.4);
        ctx.fill();
        
        ctx.restore();
    }
};
