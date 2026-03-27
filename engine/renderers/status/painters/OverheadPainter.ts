import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { STATUS_VISUALS } from "../../../../data/vfx/status_visuals";
import { VisualMath } from "../../../math/VisualMath";

export const OverheadPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, surfaceY: number, t: number) {
        let type = '';
        if (agent.stunTimer > 0) type = 'STUN';
        else if (agent.fearTimer > 0) type = 'FEAR';
        else if (agent.tauntTimer > 0) type = 'TAUNT';
        else if (agent.silenceTimer > 0) type = 'SILENCE';
        else if (agent.blindTimer > 0) type = 'BLIND';

        if (!type) return;

        const icon = AssetManager.getStatusIcon(type);
        if (!icon) return;

        const bob = Math.sin(t * 8) * 4;
        const drawY = VisualMath.getOverheadVisualY(surfaceY, agent.physics.z, bob);

        ctx.save();
        ctx.translate(x, drawY);
        
        const def = STATUS_VISUALS[type];
        const color = def?.primaryColor || '#fff';
        
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(icon, -20, -20, 40, 40);
        
        if (type === 'STUN') {
            ctx.rotate(t * 4);
            ctx.fillStyle = '#fff';
            for(let i=0; i<3; i++) {
                const a = i * (Math.PI*2/3);
                ctx.beginPath(); 
                ctx.arc(Math.cos(a)*22, Math.sin(a)*22, 2.5, 0, Math.PI*2); 
                ctx.fill();
            }
        }
        ctx.restore();
    }
};