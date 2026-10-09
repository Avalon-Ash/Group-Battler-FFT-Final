
import { Agent } from "../../game";
import { Team } from "../../../types";
import { HUD_COLORS } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

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
        ctx.fillStyle = HUD_COLORS.CONTAINER_BG; 
        ctx.fill();
        
        // Team-colored Border Highlight
        const teamBorder = HUD_COLORS.HP[agent.team].border;
        ctx.lineWidth = 1;
        ctx.strokeStyle = isSelected ? teamBorder : HUD_COLORS.CONTAINER_BORDER;
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

        const teamHp = HUD_COLORS.HP[agent.team];
        hpTop = teamHp.top;
        hpBot = teamHp.bottom;
        hpGlow = teamHp.glow;

        // 1. Draw Empty Slot Background (Dark Grey)
        ctx.fillStyle = HUD_COLORS.SLOT_BG;
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
                const shieldTop = HUD_COLORS.SHIELD.top;
                const shieldBot = HUD_COLORS.SHIELD.bottom;
                
                ctx.save();
                ctx.beginPath();
                // No rounding on left side to connect with HP
                ctx.rect(shieldStartX, barY, shieldW, hpHeight);
                
                if (Number.isFinite(shieldStartX) && Number.isFinite(barY) && Number.isFinite(hpHeight)) {
                    const grad = ctx.createLinearGradient(shieldStartX, barY, shieldStartX, barY + hpHeight);
                    grad.addColorStop(0, shieldTop);
                    grad.addColorStop(1, shieldBot);
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = shieldTop;
                }
                
                ctx.shadowColor = HUD_COLORS.SHIELD.glow;
                ctx.shadowBlur = 5;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Shield Seam
                ctx.beginPath();
                ctx.moveTo(shieldStartX, barY);
                ctx.lineTo(shieldStartX, barY + hpHeight);
                ctx.strokeStyle = HUD_COLORS.SHIELD.seam;
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Over-shield indicator (White outline if shield is huge)
                if (agent.shield > agent.maxHp * 0.5) {
                    ctx.strokeStyle = HUD_COLORS.SHIELD.outline;
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
            ctx.fillStyle = HUD_COLORS.SLOT_BG;
            ctx.fillRect(barX, mpY, contentW, mpHeight);
            
            this.drawFluidBar(ctx, barX, mpY, contentW, mpHeight, mpPct, HUD_COLORS.MP.top, HUD_COLORS.MP.bottom, HUD_COLORS.MP.glow);
        }

        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill && skill.cast > 0 && skill.tag !== 'BASIC') {
                const pct = Math.max(0, agent.castTimer / skill.cast);
                const castBarY = startY + totalH + 2;
                const castColor = skill.color || HUD_COLORS.CAST.defaultColor;
                
                // 背景
                ctx.fillStyle = HUD_COLORS.CAST.bg;
                ctx.fillRect(startX, castBarY, totalW, 4);
                // 進度
                ctx.fillStyle = castColor;
                ctx.fillRect(startX, castBarY, totalW * pct, 4);
                // 外框
                ctx.strokeStyle = HUD_COLORS.CAST.border;
                ctx.lineWidth = 1;
                ctx.strokeRect(startX, castBarY, totalW, 4);
            }
        }

        // --- CC ProgressBar with Priority ---
        const cc = this.getHighestPriorityCC(agent);
        if (cc) {
            const ccY = startY - 12;
            const pct = Math.max(0, cc.time / cc.maxTime);
            
            // Container
            ctx.fillStyle = HUD_COLORS.CC_BAR.bg;
            ctx.fillRect(startX, ccY, totalW, 6);
            
            // Bar
            ctx.fillStyle = cc.color;
            ctx.fillRect(startX, ccY, totalW * pct, 6);
            
            // Text Label
            ctx.fillStyle = HUD_COLORS.CC_BAR.text;
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(cc.name, startX + totalW / 2, ccY - 2);
            
            // Border
            ctx.strokeStyle = HUD_COLORS.CC_BAR.border;
            ctx.strokeRect(startX, ccY, totalW, 6);
        }
    },

    getHighestPriorityCC(agent: Agent) {
        type CCTimerKey = 'banishTimer' | 'stunTimer' | 'fearTimer' | 'tauntTimer' | 'silenceTimer' | 'rootTimer' | 'blindTimer';
        type CCMaxKey = 'banishMax' | 'stunMax' | 'silenceMax';
        interface CCPriorityItem {
            key: CCTimerKey;
            name: string;
            priority: number;
            color: string;
            max: CCMaxKey | number;
        }

        const CC_PRIORITY: CCPriorityItem[] = [
            { key: 'banishTimer', name: STATUS_VISUALS.BANISH.label, priority: 99, color: STATUS_VISUALS.BANISH.primaryColor, max: 'banishMax' },
            { key: 'stunTimer', name: STATUS_VISUALS.STUN.label, priority: 80, color: STATUS_VISUALS.STUN.primaryColor, max: 'stunMax' },
            { key: 'fearTimer', name: STATUS_VISUALS.FEAR.label, priority: 70, color: STATUS_VISUALS.FEAR.primaryColor, max: 5 }, // Fear doesn't have a max recorded, assume 5s or just full bar
            { key: 'tauntTimer', name: STATUS_VISUALS.TAUNT.label, priority: 65, color: STATUS_VISUALS.TAUNT.primaryColor, max: 5 },
            { key: 'silenceTimer', name: STATUS_VISUALS.SILENCE.label, priority: 60, color: STATUS_VISUALS.SILENCE.primaryColor, max: 'silenceMax' },
            { key: 'rootTimer', name: STATUS_VISUALS.ROOT.label, priority: 50, color: STATUS_VISUALS.ROOT.primaryColor, max: 5 },
            { key: 'blindTimer', name: STATUS_VISUALS.BLIND.label, priority: 40, color: STATUS_VISUALS.BLIND.primaryColor, max: 5 },
        ];

        let best: (CCPriorityItem & { time: number; maxTime: number }) | null = null;
        let maxP = -1;

        for (const cc of CC_PRIORITY) {
            const time = agent[cc.key] || 0;
            if (time > 0 && cc.priority > maxP) {
                maxP = cc.priority;
                const mKey = cc.max;
                const maxTime = typeof mKey === 'string' ? (agent[mKey] || time) : mKey;
                best = { ...cc, time, maxTime };
            }
        }
        return best;
    },

    drawFluidBar(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, pct: number, colTop: string, colBot: string, glow: string) {
        if (pct <= 0.01) return;
        const fillW = Math.max(1, bw * pct); 
        
        ctx.save();
        ctx.beginPath();
        // Slightly rounded corners
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh, 1);
        else ctx.rect(bx, by, fillW, bh);
        
        if (Number.isFinite(bx) && Number.isFinite(by) && Number.isFinite(bh)) {
            const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
            grad.addColorStop(0, colTop);
            grad.addColorStop(1, colBot);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = colTop;
        }
        
        ctx.shadowColor = glow;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gloss highlight
        ctx.fillStyle = HUD_COLORS.GLOSS_HIGHLIGHT;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, fillW, bh * 0.4, 1);
        else ctx.rect(bx, by, fillW, bh * 0.4);
        ctx.fill();
        
        ctx.restore();
    }
};
