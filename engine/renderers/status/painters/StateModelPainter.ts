
import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const StateModelPainter = {
    drawBanishment(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        if (!agent.banished) return;

        const isStasis = agent.visualStatus === 'STASIS';
        const color = isStasis ? '#facc15' : '#c084fc'; // Gold or Purple
        const height = 110; 
        
        ctx.save();
        ctx.translate(x, y - z);
        
        // Use VolumePainter for high-quality Prism
        // Opacity oscillation
        const opacity = 0.4 + Math.sin(t * 2) * 0.1;
        VolumePainter.draw3DPrism(ctx, 0, 0, 40, height, color, opacity, 'SOLID');
        
        // Lock Icon Floating inside
        const icon = AssetManager.getStatusIcon(isStasis ? 'STASIS' : 'BANISH');
        if (icon) {
            ctx.translate(0, -height/2);
            const floatY = Math.sin(t * 3) * 5;
            ctx.translate(0, floatY);
            ctx.scale(0.8, 0.8);
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(icon, -24, -24);
        }

        ctx.restore();
    }
};
