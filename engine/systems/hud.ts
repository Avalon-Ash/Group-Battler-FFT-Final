
import { Agent } from "../game";
import { COLORS } from "../../constants";
import { Role } from "../../types";
import { HexUtils, MapConfig } from "../utils";

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
    type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC';
    isUlt?: boolean; // New flag for Ultimate visuals
}

export class HUDSystem {
    damageNumbers: FloatingText[] = [];

    addFloatingText(x: number, y: number, text: string, color: string, size: number, type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' = 'DAMAGE', isUlt: boolean = false) {
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
            vy = -40; 
            life = 1.2;
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
                d.vy *= 0.98; // Friction
            }

            if (d.life <= 0) {
                this.damageNumbers.splice(i, 1); 
            }
        }
    }

    private getUnitScale(role: Role): number {
        switch (role) {
            case Role.TANK: return 1.8;
            case Role.WARRIOR: return 1.6;
            default: return 1.4;
        }
    }

    draw(ctx: CanvasRenderingContext2D, agents: Agent[], getTerrainHeight: (q: number, r: number) => number, mapConfig: MapConfig) {
        // 1. Draw HP/MP Bars
        agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.spawnTimer > 0) return; 
            
            // Fix: Use visual position (px, py) to determine height to avoid bars detaching during knockback
            // Or interpolate if moving to keep bar attached to unit head
            let h = 0;
            
            if (a.isMoving && a.path.length > 0) {
                // Interpolate height for smoother visual
                // Note: a.q, a.r is the START of movement logic in this codebase structure (updated at end)
                const startH = getTerrainHeight(a.q, a.r);
                const endHex = a.path[0];
                const endH = getTerrainHeight(endHex.q, endHex.r);
                h = HexUtils.lerp(startH, endH, a.moveProgress);
            } else {
                // Static or knocked back (physics drift)
                const visualHex = HexUtils.fromPx(a.px, a.py, mapConfig);
                h = getTerrainHeight(visualHex.q, visualHex.r);
            }

            const scale = this.getUnitScale(a.role);
            
            const groundY = a.py - h;
            const baseOffset = 5; 
            const bodyHeightApprox = 35 * scale; 
            const floatOffset = a.physics.y; 
            
            const headX = a.px + a.physics.x;
            const headY = groundY - baseOffset - bodyHeightApprox + floatOffset;

            this.drawUnitBars(ctx, a, headX, headY);
        });

        // 2. Draw Floating Text
        this.drawFloatingText(ctx);
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
    }

    private drawFloatingText(ctx: CanvasRenderingContext2D) {
        this.damageNumbers.forEach(d => {
            const lifePct = d.life / d.maxLife;
            // Fade logic
            const alpha = lifePct < 0.3 ? lifePct / 0.3 : 1.0;
            
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (d.type === 'SHOUT') {
                if (d.isUlt) {
                    // --- ULTIMATE STYLE: Cinematic Strip ---
                    // Scale: Pop in slightly, then slow constant grow
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.scale(scale, scale);

                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 40;
                    const h = d.size + 20;

                    // 1. Transparent Cinematic Bar (Gradient)
                    // Fades to transparent at left/right edges
                    const bgGrad = ctx.createLinearGradient(-w, 0, w, 0);
                    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    bgGrad.addColorStop(0.2, 'rgba(0,0,0,0.5)'); // Semi-transparent black center
                    bgGrad.addColorStop(0.8, 'rgba(0,0,0,0.5)');
                    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(-w, -h/2, w*2, h);

                    // 2. Text Glow (Outer Glow matching skill color)
                    ctx.shadowColor = d.color;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#fff';
                    ctx.strokeStyle = '#000'; // Black outline for contrast
                    ctx.lineWidth = 3;
                    
                    ctx.strokeText(d.text, 0, 0);
                    ctx.fillText(d.text, 0, 0);

                    // 3. Additive Shine (Brighten text center)
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.shadowBlur = 5;
                    ctx.fillStyle = d.color; 
                    ctx.globalAlpha = alpha * 0.5; // Subtle color overlay
                    ctx.fillText(d.text, 0, 0);

                    ctx.restore();

                } else {
                    // --- NORMAL SKILL: Minimalist Text ---
                    // No Background Box -> Reduces clutter significantly
                    
                    ctx.font = `bold italic ${d.size}px "Segoe UI", sans-serif`;
                    
                    // Heavy Stroke for readability against any background
                    ctx.lineWidth = 3;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
                    ctx.strokeText(d.text, d.x, d.y);

                    // Colored Text
                    ctx.fillStyle = d.color;
                    ctx.fillText(d.text, d.x, d.y);
                }

            } else if (d.type === 'CC') {
                // LEFT SIDE STATUS TEXT
                ctx.font = `900 ${d.size}px "Arial Black", sans-serif`; 
                ctx.strokeStyle = 'rgba(0,0,0,1.0)';
                ctx.lineWidth = 4;
                ctx.strokeText(d.text, d.x, d.y);
                
                ctx.fillStyle = d.color;
                ctx.fillText(d.text, d.x, d.y);

            } else {
                // DAMAGE / HEAL (CENTER)
                ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                ctx.fillStyle = d.color; 
                ctx.strokeStyle = 'rgba(0,0,0,0.8)'; 
                ctx.lineWidth = 3; 
                
                ctx.strokeText(d.text, d.x, d.y); 
                ctx.fillText(d.text, d.x, d.y);
            }
            
            // Reset context
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        });
    }
}
