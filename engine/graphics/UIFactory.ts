
import { createCanvas } from "./CanvasUtils";

const ICON_SIZE = 32;
const STATUS_SIZE = 48;

export const UIFactory = {
    
    generateSkillIcon(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        
        // Background Frame
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
        
        ctx.strokeStyle = '#334155'; 
        ctx.strokeRect(0, 0, ICON_SIZE, ICON_SIZE);
        
        // Symbol
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial';
        ctx.fillStyle = color;
        ctx.shadowColor = color; 
        ctx.shadowBlur = 5;
        
        let symbol = '●';
        switch (visual) {
            case 'SLASH': symbol = '⚔️'; break;
            case 'ARROW': symbol = '🏹'; break;
            case 'FIREBALL': symbol = '🔥'; break;
            case 'BOLT': symbol = '⚡'; break;
            case 'BEAM': symbol = '✨'; break;
            case 'SMASH': symbol = '🔨'; break;
            case 'BOMB': symbol = '💣'; break;
        }

        ctx.fillText(symbol, ICON_SIZE / 2, ICON_SIZE / 2 + 2); // +2 for visual centering
        return canvas;
    },

    generateStatusIcon(type: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(STATUS_SIZE, STATUS_SIZE);
        const cx = STATUS_SIZE / 2;
        const cy = STATUS_SIZE / 2;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 28px sans-serif';
        ctx.shadowBlur = 5;

        switch (type) {
            case 'STUN':
                ctx.shadowColor = '#facc15';
                ctx.fillStyle = '#facc15';
                ctx.fillText('💫', cx, cy);
                break;
            case 'SILENCE':
                ctx.shadowColor = '#94a3b8';
                ctx.fillStyle = '#e2e8f0';
                // Speech bubble
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText('💬', cx, cy);
                ctx.font = 'bold 12px sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.fillText('...', cx, cy - 2);
                break;
            case 'POISON': // DoT
                ctx.shadowColor = '#22c55e';
                ctx.fillStyle = '#4ade80';
                ctx.fillText('☠️', cx, cy);
                break;
            case 'BURN': // DoT
                ctx.shadowColor = '#ef4444';
                ctx.fillStyle = '#f87171';
                ctx.fillText('🔥', cx, cy);
                break;
            case 'REGEN': // HoT
                ctx.shadowColor = '#4ade80';
                ctx.fillStyle = '#86efac';
                ctx.fillText('➕', cx, cy);
                break;
            case 'BANISH':
                ctx.shadowColor = '#c084fc';
                ctx.fillStyle = '#d8b4fe';
                ctx.fillText('👻', cx, cy);
                break;
            case 'POLYMORPH':
                ctx.shadowColor = '#f472b6';
                ctx.fillStyle = '#fbcfe8';
                ctx.fillText('🐑', cx, cy);
                break;
            case 'STASIS':
                ctx.shadowColor = '#facc15';
                ctx.fillStyle = '#fef08a';
                ctx.fillText('🛡️', cx, cy);
                break;
        }

        return canvas;
    }
};
