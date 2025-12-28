
import { Agent } from "../../../game";
import { ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../../../constants";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

// Lift the aura slightly above the floor slab to avoid Z-fighting with terrain details
const AURA_FLOOR_LIFT = -4; 
const HOVER_LIFT = 6; // Must match BodyPainter for reverse calc

export const UnitAuraPainter = {
    
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        
        // --- 1. COORDINATE RESET ---
        // Context is currently at Body Center (Chest).
        // We need to move DOWN to the feet/floor level.
        // BodyY = FloorY - Z - BodyOffset - HoverLift
        // Therefore: FloorY = CurrentY + Z + BodyOffset + HoverLift
        // Note: Casting usually grounds the unit logic-wise, but visuals might bob.
        // We anchor to the UNIT'S FEET (phys.z), not the absolute terrain floor, 
        // so if they are flying, the aura floats with them.
        
        const footOffset = UNIT_BODY_OFFSET + HOVER_LIFT;
        ctx.translate(0, footOffset); 
        
        // Move slightly up (visually) to sit ON TOP of the floor block
        ctx.translate(0, AURA_FLOOR_LIFT);

        // --- 2. RUNE RING (Geometrically Correct) ---
        ctx.globalCompositeOperation = 'screen';
        const ringSize = 50 * (0.8 + progress * 0.2);
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // Inner Spinning Ring
        const rot = t * 3;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ringSize * 0.6, rot, true);
        ctx.stroke();
        
        // Outer Static Pulse
        ctx.globalAlpha = 0.4 + (Math.sin(t * 10) * 0.2);
        ctx.lineWidth = 1;
        HexGeometry.traceHex(ctx, 0, 0, ringSize, true);
        ctx.stroke();

        // --- 3. RISING ENERGY (Billboard) ---
        // Draw this slightly above the ring
        ctx.translate(0, -10);
        const glow = VFXFactory.getTexture('GLOW', color);
        const coreSize = 64 * progress;
        
        // Reset scale for billboard effect (Circle look)
        ctx.scale(1, 1); 
        ctx.globalAlpha = 0.6 * progress;
        ctx.drawImage(glow, -coreSize/2, -coreSize/2, coreSize, coreSize);

        ctx.restore();

        // --- 4. AOE WARNING (Ground Projector) ---
        if (skill.type === 'AOE') {
            this.drawDomainExpansion(ctx, agent, t, color, progress);
        }
    },

    drawDomainExpansion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, color: string, progress: number) {
        // This is drawn relative to the Body Painter context, so we need to reset to floor again
        const footOffset = UNIT_BODY_OFFSET + HOVER_LIFT;
        
        ctx.save();
        // Go to absolute ground level (ignoring jump height for AOE indicator)
        // Physics Z puts us at feet. 
        ctx.translate(0, footOffset + agent.physics.z); 
        
        // Scale logic
        const scale = (0.5 + progress * 2.5) * 4.0; 
        const size = 64 * scale;
        
        // Use standard texture but apply ISO scale manually since we are in a reset context
        ctx.scale(1, ISO_SCALE_Y);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - progress) * 0.2; 
        
        const texture = VFXFactory.getTexture('SHOCKWAVE', color); 
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        
        ctx.restore();
    },

    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        // Reset to Floor
        const footOffset = UNIT_BODY_OFFSET + HOVER_LIFT;
        
        ctx.save();
        ctx.translate(0, footOffset);
        ctx.translate(0, AURA_FLOOR_LIFT);

        // 1. Complex Magic Circle (Using Texture)
        const texture = VFXFactory.getTexture('MAGIC_CIRCLE', color);
        const rot = t * (2 + progress * 5);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6 + progress * 0.4;
        
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y); // Correct Perspective
        ctx.rotate(rot);
        const size = 140; // Larger for Ult
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
        
        // 2. Vertical Light Pillars (Procedural)
        const pillarH = 120 * progress;
        const pillarW = 10;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        
        for(let i=0; i<3; i++) {
            const angle = (t * 2) + (i * Math.PI * 2 / 3);
            const r = 40;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r * ISO_SCALE_Y;
            
            ctx.fillRect(px - pillarW/2, py - pillarH, pillarW, pillarH);
        }

        ctx.restore();
    }
};
