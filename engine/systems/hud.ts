
import { Agent } from "../game";
import { COLORS, UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../../constants";
import { HexUtils, MapConfig } from "../utils";
import { AssetManager } from "../assets";
import { Team } from "../../types";

// --- Constants ---
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;
const BAR_WIDTH = 44;
const BAR_HEIGHT = 6;
const BAR_PADDING = 3;

interface FloatingText {
    active: boolean;
    x: number; 
    y: number;
    vx: number; 
    vy: number;
    text: string; 
    color: string;
    life: number; 
    maxLife: number;
    size: number;
    type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK';
    isUlt: boolean; 
}

export class HUDSystem {
    // Active Texts
    damageNumbers: FloatingText[] = [];
    
    // Memory Pool
    private pool: FloatingText[] = [];

    constructor() {
        for(let i=0; i<50; i++) this.pool.push(this.createEmpty());
    }

    public reset() {
        for (const d of this.damageNumbers) {
            this.release(d);
        }
        this.damageNumbers.length = 0;
    }

    private createEmpty(): FloatingText {
        return {
            active: false,
            x: 0, y: 0, vx: 0, vy: 0,
            text: '', color: '#fff', life: 0, maxLife: 0, size: 0,
            type: 'DAMAGE', isUlt: false
        };
    }

    public addFloatingText(x: number, y: number, text: string, color: string, size: number, type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK' = 'DAMAGE', isUlt: boolean = false) {
        if (type === 'KILL_STREAK') {
            for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
                if (this.damageNumbers[i].type === 'KILL_STREAK') {
                    this.release(this.damageNumbers[i]);
                    this.damageNumbers.splice(i, 1);
                }
            }
        }

        let vx = 0;
        let vy = 0;
        let life = TEXT_LIFESPAN;

        if (type === 'SHOUT') {
            if (isUlt) {
                vy = -5; 
                life = 2.5; 
                size = 24; 
            } else {
                vy = -20; 
                life = 1.2;
                size = 14; 
            }
        } else if (type === 'CC') {
            vy = -20; 
            life = 1.5;
        } else if (type === 'KILL_STREAK') {
            vx = 0;
            vy = -30;
            life = 3.5; 
            size = 32; 
        } else {
            vx = (Math.random() - 0.5) * 60; 
            vy = -100; 
        }

        let ft: FloatingText;
        if (this.pool.length > 0) {
            ft = this.pool.pop()!;
        } else {
            ft = this.createEmpty();
        }

        ft.active = true;
        ft.x = x; ft.y = y;
        ft.vx = vx; ft.vy = vy;
        ft.text = text; ft.color = color;
        ft.life = life; ft.maxLife = life;
        ft.size = size; ft.type = type;
        ft.isUlt = isUlt;

        this.damageNumbers.push(ft);
    }

    private release(ft: FloatingText) {
        ft.active = false;
        this.pool.push(ft);
    }

    update(dt: number) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) { 
            const d = this.damageNumbers[i]; 
            d.life -= dt; 
            
            d.x += d.vx * dt;
            d.y += d.vy * dt; 
            
            if (d.type === 'DAMAGE' || d.type === 'HEAL') {
                d.vy += GRAVITY * dt;
            } else if (d.type === 'SHOUT' || d.type === 'CC') {
                d.vy *= 0.95; 
            } else if (d.type === 'KILL_STREAK') {
                d.vy *= 0.92; 
            }

            if (d.life <= 0) {
                this.release(d);
                this.damageNumbers.splice(i, 1); 
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig, highlight: Agent | null, time: number) {
        agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.spawnTimer > 0) return; 
            
            let h = 0;
            if (a.isMoving && a.path.length > 0) {
                const startH = getTerrainHeight(a.q, a.r);
                const endHex = a.path[0];
                const endH = getTerrainHeight(endHex.q, endHex.r);
                h = HexUtils.lerp(startH, endH, a.moveProgress);
            } else {
                const visualHex = HexUtils.fromPx(a.px, a.py, mapConfig);
                h = getTerrainHeight(visualHex.q, visualHex.r);
            }

            const groundY = a.py - h;
            const physicsOffsetY = a.physics.y - a.physics.z; 
            const anchorY = groundY - UNIT_VISUAL_HEIGHT + physicsOffsetY - HUD_PADDING;
            const headX = a.px + a.physics.x;

            const isSelected = (a === highlight);
            this.drawUnitBars(ctx, a, headX, anchorY, isSelected, time);
            this.drawUnitStatusGauges(ctx, a, headX, anchorY);
        });

        this.drawFloatingText(ctx);
    }

    private drawUnitStatusGauges(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number) {
        let activeTimer = 0;
        let maxTimer = 0;
        let iconType = '';
        let gaugeColor = '';

        if (agent.banished) {
            activeTimer = agent.banishTimer;
            maxTimer = agent.banishMax || activeTimer;
            
            if (agent.visualStatus === 'POLYMORPH') {
                iconType = 'POLYMORPH'; gaugeColor = '#d8b4fe';
            } else if (agent.visualStatus === 'STASIS') {
                iconType = 'STASIS'; gaugeColor = '#facc15';
            } else {
                iconType = 'BANISH'; gaugeColor = '#7e22ce';
            }
        } else if (agent.stunTimer > 0) {
            activeTimer = agent.stunTimer;
            maxTimer = agent.stunMax || activeTimer;
            iconType = 'STUN'; gaugeColor = '#fbbf24';
        } else if (agent.silenceTimer > 0) {
            activeTimer = agent.silenceTimer;
            maxTimer = agent.silenceMax || activeTimer;
            iconType = 'SILENCE'; gaugeColor = '#94a3b8';
        } else if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                this.drawCircularGauge(ctx, x, y, progress, skill.visual || 'BOLT', skill.color, true);
                return;
            }
        }

        if (iconType && maxTimer > 0) {
            const progress = activeTimer / maxTimer;
            this.drawCircularGauge(ctx, x, y, progress, iconType, gaugeColor, false);
        }
    }

    // 1. FACTION-BASED HP BARS REFACTOR
    private drawUnitBars(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, isSelected: boolean, time: number) {
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

        this.drawFluidBar(ctx, barX, barY, contentW, hpHeight, hpPct, hpTop, hpBot, hpGlow);

        // MP Bar - Always Blue/Purple
        if (hasMp) {
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            const mpY = barY + hpHeight + gap;
            this.drawFluidBar(ctx, barX, mpY, contentW, mpHeight, mpPct, '#a78bfa', '#7c3aed', 'rgba(139, 92, 246, 0.4)');
        }
    }

    private drawFluidBar(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, pct: number, colTop: string, colBot: string, glow: string) {
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

    private drawCircularGauge(ctx: CanvasRenderingContext2D, x: number, y: number, pct: number, visualKey: string, color: string, isSkill: boolean) {
        const radius = 14;
        const iconY = y - 24; 
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
        ctx.fill();
        ctx.save();
        ctx.clip();
        
        let icon;
        if (isSkill) {
            icon = AssetManager.getSkillIcon(visualKey, color);
        } else {
            icon = AssetManager.getStatusIcon(visualKey);
        }
        
        ctx.globalAlpha = 0.8;
        if (icon) ctx.drawImage(icon, x - radius, iconY - radius, radius * 2, radius * 2);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const safePct = Math.max(0, Math.min(1, pct));
        if (safePct > 0) {
            ctx.beginPath();
            ctx.arc(x, iconY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * safePct));
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    private drawFloatingText(ctx: CanvasRenderingContext2D) {
        this.damageNumbers.forEach(d => {
            if (!d.active) return;

            const lifePct = d.life / d.maxLife;
            const alpha = lifePct < 0.3 ? lifePct / 0.3 : 1.0;
            
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0; 
            
            if (d.type === 'KILL_STREAK') {
                ctx.save();
                ctx.translate(d.x, d.y);
                const pop = Math.min(1, (1 - lifePct) * 5); 
                const pulse = 1 + Math.sin(lifePct * 10) * 0.1;
                const scale = pop * pulse * 1.5; 
                ctx.scale(scale, scale);
                ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                
                const grad = ctx.createLinearGradient(0, -d.size/2, 0, d.size/2);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.5, d.color);
                grad.addColorStop(1, '#000000');
                
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000';
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = grad;
                ctx.fillText(d.text, 0, 0);
                ctx.restore();

            } else if (d.type === 'SHOUT') {
                // ... (Existing Shout Logic kept for brevity, it works fine) ...
                if (d.isUlt) {
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.scale(scale, scale);
                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 25;
                    const h = d.size + 12;

                    const bgGrad = ctx.createLinearGradient(-w - 20, 0, w + 20, 0);
                    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    bgGrad.addColorStop(0.3, 'rgba(2, 6, 23, 0.85)'); 
                    bgGrad.addColorStop(0.7, 'rgba(2, 6, 23, 0.85)');
                    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(-w - 20, -h/2, w*2 + 40, h);
                    
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = alpha * 0.8;
                    
                    ctx.beginPath(); ctx.moveTo(-w, -h/2); ctx.lineTo(w, -h/2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-w * 0.8, h/2); ctx.lineTo(w * 0.8, h/2); ctx.stroke();
                    
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = d.color; ctx.shadowBlur = 15;
                    ctx.fillStyle = '#fff';
                    ctx.fillText(d.text, 0, 0);
                    ctx.restore();
                } else {
                    ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const padX = 12;
                    const padY = 6;
                    const w = textMetrics.width;
                    const h = d.size;
                    
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; 
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(d.x - w/2 - padX, d.y - h/2 - padY, w + padX*2, h + padY*2, 8);
                    else ctx.rect(d.x - w/2 - padX, d.y - h/2 - padY, w + padX*2, h + padY*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.shadowColor = d.color; ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fff'; 
                    ctx.fillText(d.text, d.x, d.y);
                    ctx.shadowBlur = 0;
                }

            } else {
                // DAMAGE / HEAL / CC
                ctx.font = `900 ${d.size}px "Segoe UI", sans-serif`;
                
                // Outline to make it readable on any background
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                ctx.strokeText(d.text, d.x, d.y);
                
                ctx.fillStyle = d.color; 
                ctx.fillText(d.text, d.x, d.y);
            }
            
            ctx.globalAlpha = 1.0;
        });
    }
}
