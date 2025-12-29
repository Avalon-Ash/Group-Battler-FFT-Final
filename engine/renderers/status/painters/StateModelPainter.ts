
import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { VisualMath } from "../../../math/VisualMath";

export const StateModelPainter = {
    drawBanishment(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        if (!agent.banished) return;

        const isStasis = agent.visualStatus === 'STASIS';
        const color = isStasis ? '#facc15' : '#c084fc'; 
        const secondaryColor = isStasis ? '#fef08a' : '#e9d5ff';
        
        // ALIGNMENT FIX (SSOT)
        const centerY = VisualMath.getVisualBodyCenterY(y, z);
        
        ctx.save();
        ctx.translate(x, centerY);
        
        const size = 55; // Slightly larger
        const height = 75;
        const rotation = t * 0.8;
        
        const points = [];
        for(let i=0; i<4; i++) {
            const angle = rotation + (i * Math.PI / 2);
            points.push({
                x: Math.cos(angle) * size,
                y: Math.sin(angle) * size * 0.35 
            });
        }

        const drawFace = (p1: {x:number, y:number}, p2: {x:number, y:number}, tipY: number, alpha: number) => {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(0, tipY);
            ctx.closePath();
            
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha; // Increased from 0.15 to 0.3 for more "mass"
            ctx.fill();
            
            ctx.strokeStyle = secondaryColor;
            ctx.globalAlpha = 0.9;
            ctx.stroke();
        };

        const bob = Math.sin(t * 2) * 5;
        ctx.translate(0, bob);

        for(let i=0; i<4; i++) {
            const p1 = points[i];
            const p2 = points[(i+1)%4];
            drawFace(p1, p2, -height, 0.3); // Upper
        }
        for(let i=0; i<4; i++) {
            const p1 = points[i];
            const p2 = points[(i+1)%4];
            drawFace(p1, p2, height, 0.2); // Lower
        }
        
        ctx.globalCompositeOperation = 'screen';
        const pulse = 1.0 + Math.sin(t * 5) * 0.2;
        
        const icon = AssetManager.getStatusIcon(isStasis ? 'STASIS' : 'BANISH');
        if (icon) {
            ctx.save();
            ctx.scale(pulse, pulse);
            ctx.globalAlpha = 1.0; // Solid icon
            ctx.drawImage(icon, -24, -24, 48, 48);
            ctx.restore();
        }

        ctx.restore();
    }
};
