
import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { STATUS_VISUALS } from "../../../../../data/vfx/status_visuals";
import { VisualMath } from "../../../math/VisualMath";
import { VISUAL_ANCHORS } from "../../../../../constants";

export const OverheadPainter = {
    // x, y = Visual Surface Coordinates (Top of Block)
    // z = Jump Height
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        // Priority System: Only show most severe CC
        let type = '';
        if (agent.stunTimer > 0) type = 'STUN';
        else if (agent.fearTimer > 0) type = 'FEAR';
        else if (agent.tauntTimer > 0) type = 'TAUNT';
        else if (agent.silenceTimer > 0) type = 'SILENCE';
        else if (agent.blindTimer > 0) type = 'BLIND';

        if (!type) return;

        const icon = AssetManager.getStatusIcon(type);
        if (!icon) return;

        // Bobbing Animation
        const bob = Math.sin(t * 6) * 5;
        
        // --- ANCHOR LOGIC FIX (SSOT) ---
        const unitHeadY = VisualMath.getVisualBodyCenterY(y, z);
        const anchorY = unitHeadY - VISUAL_ANCHORS.HEAD_OFFSET_Y + bob; 

        ctx.save();
        ctx.translate(x, anchorY);
        
        // Glow Backing
        const def = STATUS_VISUALS[type];
        const color = def?.primaryColor || '#fff';
        
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        // Draw Icon
        ctx.drawImage(icon, -24, -24, 48, 48);
        
        // Extra "Dizzy" stars for Stun
        if (type === 'STUN') {
            ctx.rotate(t * 2);
            ctx.fillStyle = '#fff';
            for(let i=0; i<3; i++) {
                const a = i * (Math.PI*2/3);
                const sx = Math.cos(a) * 20;
                const sy = Math.sin(a) * 20;
                ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.restore();
    }
};
