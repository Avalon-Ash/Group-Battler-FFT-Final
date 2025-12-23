
import { Agent } from "../game";
import { COLORS, UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../../constants";
import { Role } from "../../types";
import { HexUtils, MapConfig } from "../utils";
import { AssetManager } from "../assets";

// --- Constants ---
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;
const BAR_WIDTH = 40;
const BAR_HEIGHT = 5;
const BAR_BORDER = 1;

interface FloatingText {
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
    isUlt?: boolean; // New flag for Ultimate visuals
}

export class HUDSystem {
    damageNumbers: FloatingText[] = [];

    addFloatingText(x: number, y: number, text: string, color: string, size: number, type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK' = 'DAMAGE', isUlt: boolean = false) {
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
            // Static float for CC text
            vy = -20; 
            life = 1.5;
        } else if (type === 'KILL_STREAK') {
            // KILL STREAK: Epic float
            vx = 0;
            vy = -30;
            life = 3.5; // Stay very long
            size = 32; // HUGE
        } else {
            // DAMAGE / HEAL
            vx = (Math.random() - 0.5) * 60; 
            vy = -100; // Initial jump
        }

        this.damageNumbers.push({
            x, y,
            vx, vy, 
            text, 
            color, 
            life, 
            maxLife: life, 
            size,
            type,
            isUlt
        });
    }

    update(dt: number) {
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
                // Anti-gravity float for Kill Streaks
                d.vy *= 0.92; // Slow down to a halt
            }

            if (d.life <= 0) {
                this.damageNumbers.splice(i, 1); 
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig) {
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

            this.drawUnitBars(ctx, a, headX, anchorY);
            this.drawStatusLabel(ctx, a, headX, anchorY);
        });

        // 2. Draw Floating Text
        this.drawFloatingText(ctx);
    }

    private drawStatusLabel(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number) {
        // PRIORITY STATUS DISPLAY
        // Show status directly above HP bar for maximum readability
        let statusText = "";
        let statusColor = "";
        
        if (agent.stunTimer > 0) {
            statusText = "暈眩";
            statusColor = "#facc15"; // Yellow
        } else if (agent.banished) {
            statusText = "放逐";
            statusColor = "#c084fc"; // Purple
        } else if (agent.silenceTimer > 0) {
            statusText = "沉默";
            statusColor = "#94a3b8"; // Grey
        }

        if (statusText) {
            ctx.save();
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            
            // Text Stroke
            ctx.strokeStyle = "rgba(0,0,0,0.8)";
            ctx.lineWidth = 3;
            ctx.strokeText(statusText, x, y - 8);
            
            // Text Fill
            ctx.fillStyle = statusColor;
            ctx.fillText(statusText, x, y - 8);
            ctx.restore();
        }
    }

    private drawUnitBars(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number) {
        const w = BAR_WIDTH;
        const h = BAR_HEIGHT;
        const b = BAR_BORDER;

        // Background (Black Border)
        ctx.fillStyle = '#000'; 
        ctx.fillRect(x - w/2 - b, y - b, w + b*2, h + b*2);
        
        // HP Fill
        const hpPct = Math.max(0, agent.hp / agent.maxHp);
        ctx.fillStyle = COLORS.HP; 
        ctx.fillRect(x - w/2, y, w * hpPct, h);

        // MP Bar (Only if unit uses MP)
        if (agent.maxMp > 0) {
            const mpH = h / 2 + 1;
            const mpY = y + h + b;
            
            ctx.fillStyle = '#000'; 
            ctx.fillRect(x - w/2 - b, mpY, w + b*2, mpH + b*2);
            
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            ctx.fillStyle = COLORS.MP; 
            ctx.fillRect(x - w/2, mpY + b, w * mpPct, mpH);
        }

        // --- CIRCULAR CAST GAUGE (Integrated) ---
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                this.drawCircularCast(ctx, x, y, agent.castTimer, skill.cast, skill.visual, skill.color);
            }
        }
    }

    private drawCircularCast(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, total: number, visual: string | undefined, color: string) {
        const radius = 14;
        const iconY = y - 18; 
        
        // 1. Icon Background (Clip)
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.clip();
        
        // 2. Icon Sprite
        const icon = AssetManager.getSkillIcon(visual || 'BOLT', color);
        ctx.drawImage(icon, x - radius, iconY - radius, radius * 2, radius * 2);
        ctx.restore();

        // 3. Dark Track
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 4. Progress Ring
        const pct = Math.max(0, Math.min(1, 1 - (current / total)));
        if (pct > 0) {
            ctx.beginPath();
            ctx.arc(x, iconY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // 5. Shine
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    private drawFloatingText(ctx: CanvasRenderingContext2D) {
        this.damageNumbers.forEach(d => {
            const lifePct = d.life / d.maxLife;
            // Fade logic
            const alpha = lifePct < 0.3 ? lifePct / 0.3 : 1.0;
            
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (d.type === 'KILL_STREAK') {
                // --- EPIC KILL STREAK ---
                ctx.save();
                ctx.translate(d.x, d.y);
                
                // Pop-in Scale Effect
                const pop = Math.min(1, (1 - lifePct) * 5); // Rapid entry
                // Pulse logic
                const pulse = 1 + Math.sin(lifePct * 10) * 0.1;
                const scale = pop * pulse * 1.5; 
                ctx.scale(scale, scale);

                // Text Style
                ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                
                // Fancy Gradient
                const grad = ctx.createLinearGradient(0, -d.size/2, 0, d.size/2);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.5, d.color);
                grad.addColorStop(1, '#000000');
                
                // Stroke
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000';
                ctx.strokeText(d.text, 0, 0);
                
                // Fill
                ctx.fillStyle = grad;
                ctx.fillText(d.text, 0, 0);
                
                // Shine
                ctx.fillStyle = '#fff';
                ctx.shadowColor = d.color;
                ctx.shadowBlur = 10 * pulse;
                ctx.fillText(d.text, 0, 0);

                ctx.restore();

            } else if (d.type === 'SHOUT') {
                if (d.isUlt) {
                    // --- ULTIMATE STYLE ---
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.scale(scale, scale);

                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 30;
                    const h = d.size + 16;

                    // Gradient Bar
                    const bgGrad = ctx.createLinearGradient(-w, 0, w, 0);
                    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    bgGrad.addColorStop(0.2, 'rgba(0,0,0,0.6)'); 
                    bgGrad.addColorStop(0.8, 'rgba(0,0,0,0.6)');
                    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(-w, -h/2, w*2, h);

                    // Text Glow
                    ctx.shadowColor = d.color;
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#fff';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 3;
                    
                    ctx.strokeText(d.text, 0, 0);
                    ctx.fillText(d.text, 0, 0);

                    ctx.restore();

                } else {
                    // --- NORMAL SKILL ---
                    ctx.font = `bold italic ${d.size}px "Segoe UI", sans-serif`;
                    ctx.lineWidth = 3;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
                    ctx.strokeText(d.text, d.x, d.y);
                    ctx.fillStyle = d.color;
                    ctx.fillText(d.text, d.x, d.y);
                }

            } else if (d.type === 'CC') {
                // CC is handled by status label mostly, but this is for immediate feedback
                // Make it smaller or different to avoid conflict
                ctx.font = `900 ${d.size}px "Arial Black", sans-serif`; 
                ctx.strokeStyle = 'rgba(0,0,0,1.0)';
                ctx.lineWidth = 3;
                ctx.strokeText(d.text, d.x, d.y);
                ctx.fillStyle = d.color;
                ctx.fillText(d.text, d.x, d.y);

            } else {
                // DAMAGE / HEAL
                ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                ctx.fillStyle = d.color; 
                ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 
                ctx.lineWidth = 3; 
                ctx.strokeText(d.text, d.x, d.y); 
                ctx.fillText(d.text, d.x, d.y);
            }
            
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        });
    }
}
