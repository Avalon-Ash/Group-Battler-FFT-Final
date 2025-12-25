
import { Agent } from "../game";
import { COLORS, UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../../constants";
import { HexUtils, MapConfig } from "../utils";
import { AssetManager } from "../assets";

// --- Constants ---
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;
const BAR_WIDTH = 40;
const BAR_HEIGHT = 5;
const BAR_BORDER = 1;

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
        // Pre-allocate pool
        for(let i=0; i<50; i++) this.pool.push(this.createEmpty());
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
        // UX FIX: Prevent Kill Streak Overlap
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
                vy = -5; // Ults float very slowly
                life = 2.5; // Stay longer
                size = 24; // Bigger font
            } else {
                vy = -20; // Normal skills float gently
                life = 1.2;
                size = 14; // Smaller to be less intrusive
            }
        } else if (type === 'CC') {
            vy = -20; 
            life = 1.5;
        } else if (type === 'KILL_STREAK') {
            vx = 0;
            vy = -30;
            life = 3.5; // Stay very long
            size = 32; // HUGE
        } else {
            // DAMAGE / HEAL
            vx = (Math.random() - 0.5) * 60; 
            vy = -100; // Initial jump
        }

        // Get from pool
        let ft: FloatingText;
        if (this.pool.length > 0) {
            ft = this.pool.pop()!;
        } else {
            ft = this.createEmpty();
        }

        // Init
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
        // Reverse iterate to allow removal
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) { 
            const d = this.damageNumbers[i]; 
            d.life -= dt; 
            
            // Physics integration
            d.x += d.vx * dt;
            d.y += d.vy * dt; 
            
            // Gravity logic
            if (d.type === 'DAMAGE' || d.type === 'HEAL') {
                d.vy += GRAVITY * dt;
            } else if (d.type === 'SHOUT' || d.type === 'CC') {
                d.vy *= 0.95; // Friction
            } else if (d.type === 'KILL_STREAK') {
                d.vy *= 0.92; // Anti-gravity float
            }

            if (d.life <= 0) {
                this.release(d);
                this.damageNumbers.splice(i, 1); // Fast remove from active list
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig, highlight: Agent | null, time: number) {
        // 1. Draw HP/MP Bars & Status Labels
        agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.spawnTimer > 0) return; 
            
            // Determine Ground Level Logic
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

        // 2. Draw Floating Text
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

    private drawUnitBars(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, isSelected: boolean, time: number) {
        const w = BAR_WIDTH;
        const h = BAR_HEIGHT;
        const b = BAR_BORDER;

        ctx.fillStyle = '#000'; 
        const totalHeight = (agent.maxMp > 0) ? (h*1.5 + b*3) : (h + b*2);
        
        ctx.fillRect(x - w/2 - b, y - b, w + b*2, totalHeight);
        
        if (isSelected) {
            ctx.save();
            const pulse = 0.6 + Math.sin(time * 8) * 0.4;
            
            // OPTIMIZATION: Replaced shadowBlur with lighter multi-pass
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
            
            // Glow pass
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(x - w/2 - b - 2, y - b - 2, w + b*2 + 4, totalHeight + 4);
            
            // Core pass
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1.0;
            ctx.strokeRect(x - w/2 - b - 1, y - b - 1, w + b*2 + 2, totalHeight + 2);
            
            ctx.restore();
        }
        
        const hpPct = Math.max(0, agent.hp / agent.maxHp);
        ctx.fillStyle = COLORS.HP; 
        ctx.fillRect(x - w/2, y, w * hpPct, h);

        if (agent.maxMp > 0) {
            const mpH = h / 2 + 1;
            const mpY = y + h + b;
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            ctx.fillStyle = COLORS.MP; 
            ctx.fillRect(x - w/2, mpY, w * mpPct, mpH);
        }
    }

    private drawCircularGauge(ctx: CanvasRenderingContext2D, x: number, y: number, pct: number, visualKey: string, color: string, isSkill: boolean) {
        const radius = 14;
        const iconY = y - 18; 
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.clip();
        
        let icon;
        if (isSkill) {
            icon = AssetManager.getSkillIcon(visualKey, color);
        } else {
            icon = AssetManager.getStatusIcon(visualKey);
        }
        
        if (icon) ctx.drawImage(icon, x - radius, iconY - radius, radius * 2, radius * 2);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();

        const safePct = Math.max(0, Math.min(1, pct));
        
        if (safePct > 0) {
            ctx.beginPath();
            ctx.arc(x, iconY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * safePct));
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
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
                if (d.isUlt) {
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.scale(scale, scale);
                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 30;
                    const h = d.size + 16;

                    const bgGrad = ctx.createLinearGradient(-w, 0, w, 0);
                    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    bgGrad.addColorStop(0.2, 'rgba(0,0,0,0.6)'); 
                    bgGrad.addColorStop(0.8, 'rgba(0,0,0,0.6)');
                    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(-w, -h/2, w*2, h);
                    ctx.fillStyle = '#fff';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    ctx.strokeText(d.text, 0, 0);
                    ctx.fillText(d.text, 0, 0);
                    ctx.restore();
                } else {
                    ctx.font = `bold italic ${d.size}px "Segoe UI", sans-serif`;
                    ctx.lineWidth = 3;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
                    ctx.strokeText(d.text, d.x, d.y);
                    ctx.fillStyle = d.color;
                    ctx.fillText(d.text, d.x, d.y);
                }

            } else if (d.type === 'CC') {
                ctx.font = `900 ${d.size}px "Arial Black", sans-serif`; 
                ctx.strokeStyle = 'rgba(0,0,0,1.0)';
                ctx.lineWidth = 3;
                ctx.strokeText(d.text, d.x, d.y);
                ctx.fillStyle = d.color;
                ctx.fillText(d.text, d.x, d.y);

            } else {
                ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                ctx.fillStyle = d.color; 
                ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 
                ctx.lineWidth = 3; 
                ctx.strokeText(d.text, d.x, d.y); 
                ctx.fillText(d.text, d.x, d.y);
            }
            
            ctx.globalAlpha = 1.0;
        });
    }
}
