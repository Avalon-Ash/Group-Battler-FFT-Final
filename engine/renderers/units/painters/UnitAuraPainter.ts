
import { Agent } from "../../../game";
import { HEX_SIZE } from "../../../../constants";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

// Ground overlay lift to avoid Z-fighting with terrain texture
const AURA_FLOOR_LIFT = -2; 

export const UnitAuraPainter = {
    
    /**
     * Draws the casting channel animation (Standard Skills).
     * Uses pure geometry for crisp lines at any zoom level.
     */
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT); 

        // Dynamic Pulse Size (Standard cast is approx 1 tile wide max)
        const baseSize = HEX_SIZE * 0.9;
        const currentSize = baseSize * (0.8 + Math.sin(t * 10) * 0.05);
        
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // A. Rotating Inner Hex (The Channel)
        const rot = t * 4;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        
        // TRUTH: traceRotatedHex with applyIso=true guarantees perspective correctness
        HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize * 0.7, rot, true);
        ctx.stroke();
        
        // B. Counter-Rotating Outer Ring
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize, -rot * 0.5, true);
        ctx.stroke();

        // C. Rising Particles (Procedural Dots)
        this.drawRisingParticles(ctx, color, progress, t);

        ctx.restore();

        // 3. AOE Ripple (If applicable)
        if (skill.type === 'AOE') {
            this.drawAoeExpansion(ctx, x, y, color, progress, skill.aoeRadius || 1);
        }
    },

    /**
     * Draws the Ultimate Chanting Circle.
     * More complex geometry, larger scale, strict alignment.
     */
    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT);

        // Ult Radius is visual only, slightly larger than tile to look epic
        const ultSize = HEX_SIZE * 2.2; 
        const rot = t * 2;

        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;

        // Layer 1: Main Magic Circle (Rotating)
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1.0;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize, rot, true);
        ctx.stroke();

        // Layer 2: Inner Geometry (Counter-Rotating)
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize * 0.6, -rot * 2, true);
        ctx.stroke();

        // Layer 3: Static Ground Seal (Fixed orientation)
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        HexGeometry.traceHex(ctx, 0, 0, ultSize * 1.2, true);
        ctx.stroke();

        // Layer 4: Vertical Light Pillars (Energy gathering)
        const pillarH = 100 * progress;
        if (pillarH > 1) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            const points = HexGeometry.getVertices(ultSize * 0.8, true);
            points.forEach((p, i) => {
                if (i % 2 === 0) { 
                    ctx.fillRect(p.x - 2, p.y - pillarH, 4, pillarH);
                }
            });
        }

        ctx.restore();
    },

    /**
     * Replaces the old texture-based expansion with a precise vector ripple.
     * The ripple expands exactly to the skill's radius.
     */
    drawAoeExpansion(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, progress: number, rangeInTiles: number) {
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT);
        
        // Calculate EXACT pixel radius based on map grid size
        const maxPixelRadius = rangeInTiles * HEX_SIZE;
        // Use exponential ease-out for visual impact
        const easedRadius = maxPixelRadius * (1 - Math.pow(1 - progress, 3));

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        
        // 1. The Wave Front
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.globalAlpha = (1 - progress) * 0.8;
        HexGeometry.traceHex(ctx, 0, 0, easedRadius, true);
        ctx.stroke();
        
        // 2. Inner Fill (Faint)
        ctx.globalAlpha = (1 - progress) * 0.1;
        ctx.fill();

        ctx.restore();
    },

    // Helper for particles
    drawRisingParticles(ctx: CanvasRenderingContext2D, color: string, progress: number, t: number) {
        ctx.fillStyle = color;
        const count = 3;
        for(let i=0; i<count; i++) {
            const offset = i * (Math.PI * 2 / count);
            const cycle = (t * 2 + offset) % 1; // 0 to 1
            
            // Spiral up
            const h = cycle * 60;
            const r = (1 - cycle) * 30;
            const angle = t * 3 + offset;
            
            const px = Math.cos(angle) * r;
            const py = (Math.sin(angle) * r * 0.58) - h; // ISO Y + Vertical Rise
            
            const alpha = Math.sin(cycle * Math.PI); // Fade in/out
            ctx.globalAlpha = alpha * 0.8;
            
            ctx.beginPath(); 
            ctx.arc(px, py, 2, 0, Math.PI*2); 
            ctx.fill();
        }
    }
};
