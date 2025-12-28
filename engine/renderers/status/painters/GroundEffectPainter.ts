
import { Agent } from "../../../../game";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const GroundEffectPainter = {
    // x, y = Visual Surface Coordinates (Top of Block)
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        // ROOT (Chain/Vines)
        if (agent.rootTimer > 0) {
            const color = '#fbbf24'; // Amber
            ctx.save();
            // Draw AT surface. 'y' is already the top of the block.
            // z is jump height. If rooted, we assume they are grounded or effect stretches.
            // We draw at feet: y - z.
            ctx.translate(x, y - z); 
            
            // Dynamic pulsing ring
            const pulse = 0.8 + Math.sin(t * 10) * 0.2;
            VolumePainter.drawHexRipple(ctx, 0, 0, 20, color, pulse, 2);

            // 3D Spikes (Simulated)
            ctx.fillStyle = color;
            ctx.globalCompositeOperation = 'source-over'; // Solid
            
            for(let i=0; i<3; i++) {
                const angle = i * (Math.PI*2/3) + t;
                const r = 18;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r * ISO_SCALE_Y;
                
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy - 25); // Spike tip up
                ctx.lineTo(sx + 6, sy + 3);
                ctx.fill();
            }
            ctx.restore();
        }
    }
};
