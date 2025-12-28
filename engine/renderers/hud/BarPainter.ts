
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
        ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'; 
        ctx.fill();
        
        // Team-colored Border Highlight
        const teamBorder = agent.team === Team.BLUE ? '#3b82f6' : '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeStyle = isSelected ? teamBorder : 'rgba(255, 255, 255, 0.15)';
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

        // Draw Base HP
        this.drawFluidBar(ctx, barX, barY, contentW, hpHeight, hpPct, hpTop, hpBot, hpGlow);

        // Draw Shield Overlay
        if (shieldPct > 0) {
            // Shield starts where HP ends
            const shieldStartX = barX + (contentW * hpPct);
            // Cap visual shield width so it doesn't overflow container absurdly (max 100% of bar width total)
            const remainingSpace = 1.0 - hpPct;
            const visualShieldPct = Math.min(shieldPct, remainingSpace + 0.2); // Allow slight overflow visual
            const shieldW = contentW * visualShieldPct;
            
            // Shield Colors (White/Grey/Blue-ish)
            const shieldTop = '#e2e8f0';
            const shieldBot = '#94a3b8';
            
            ctx.save();
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(shieldStartX, barY, shieldW, hpHeight, 0);
            else ctx.rect(shieldStartX, barY, shieldW, hpHeight);
            
            const grad = ctx.createLinearGradient(shieldStartX, barY, shieldStartX, barY + hpHeight);
            grad.addColorStop(0, shieldTop);
            grad.addColorStop(1, shieldBot);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Shield Border to separate from HP
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Over-shield indicator (if shield exceeds max HP visual)
            if (hpPct + shieldPct > 1.0) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(barX, barY, contentW, hpHeight);
            }
            ctx.restore();
        }

        // MP Bar - Always Blue/Purple
        if (hasMp) {
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            const mpY = barY + hpHeight + gap;
            this.drawFluidBar(ctx, barX, mpY, contentW, mpHeight, mpPct, '#a78bfa', '#7c3aed', 'rgba(139, 92, 246, 0.4)');
        }
    },

    drawFluidBar(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, pct: number, colTop: string, colBot: string, glow: string) {
        if (pct <= 0.01) return;
        const fillW = Math.max(bh, bw * pct); 
        
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh, bh/2);
        else ctx.rect(bx, by, fillW, bh);
        
        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, colTop);
        grad.addColorStop(1, colBot);
        ctx.fillStyle = grad;
        
        ctx.shadowColor = glow;
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gloss
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh * 0.4, bh/2);
        else ctx.rect(bx, by, fillW, bh * 0.4);
        ctx.fill();
        
        ctx.restore();
    }
};
