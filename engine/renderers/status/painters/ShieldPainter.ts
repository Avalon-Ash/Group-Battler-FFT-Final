
import { Agent } from "../../../../game";
import { Team } from "../../../../../types";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { UNIT_BODY_OFFSET } from "../../../../../constants";

const HOVER_LIFT = 6; 

export const ShieldPainter = {
    // x, y = Visual Surface Coordinates (Top of Block)
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        if (agent.shield <= 0) return;

        const isBlue = agent.team === Team.BLUE;
        const color = isBlue ? '#bae6fd' : '#f87171'; // Cyan vs Red tint
        
        // Shield Pulse based on % remaining
        const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
        const pulse = 0.2 + (pct * 0.3) + Math.sin(t * 3) * 0.1;
        
        ctx.save();
        
        // ALIGNMENT FIX:
        // Center shield on Body Center
        const bodyCenterY = y - z - UNIT_BODY_OFFSET - HOVER_LIFT;
        
        ctx.translate(x, bodyCenterY); 
        
        // Volumetric Prism Shell around body
        // Height 90 covers most standard units. Prism draws downwards from current Y.
        // To center it, we draw from (y - half_height) = (0 + 45) -> Top (-45)
        VolumePainter.draw3DPrism(ctx, 0, 45, 35, 90, color, pulse, 'SOLID'); 
        
        // Inner Core Ripple (Tech Ring)
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.4;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI*2);
        ctx.stroke();
        
        // Vertical Energy Line
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(0, 40);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
};
