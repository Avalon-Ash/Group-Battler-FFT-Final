
import { Agent } from "../../../../game";
import { Team } from "../../../../../types";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const ShieldPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        if (agent.shield <= 0) return;

        const isBlue = agent.team === Team.BLUE;
        const color = isBlue ? '#bae6fd' : '#f87171'; // Cyan vs Red tint
        
        // Shield Pulse based on % remaining
        const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
        const pulse = 0.2 + (pct * 0.3) + Math.sin(t * 3) * 0.1;
        
        ctx.save();
        ctx.translate(x, y - z); // Ground level anchor
        
        // Volumetric Prism Shell
        // Height 90 covers most standard units
        VolumePainter.draw3DPrism(ctx, 0, 0, 35, 90, color, pulse, 'SOLID');
        
        // Inner Core Ripple (Tech Ring)
        ctx.translate(0, -45); // Center mass
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
