
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
        
        // Symbol drawing
        ctx.translate(ICON_SIZE / 2, ICON_SIZE / 2);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.shadowColor = color; 
        ctx.shadowBlur = 5;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        switch (visual) {
            case 'SLASH': 
                // Slash Arc
                ctx.arc(0, 0, 8, -Math.PI/2, 0);
                ctx.stroke();
                // Blade
                ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.stroke();
                break;
            case 'ARROW': 
                // Arrow
                ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
                ctx.lineTo(2, -6); ctx.moveTo(6, -6); ctx.lineTo(6, -2);
                ctx.stroke();
                break;
            case 'FIREBALL': 
                // Flame
                ctx.arc(0, 2, 6, 0, Math.PI*2);
                ctx.moveTo(0, -8); ctx.lineTo(0, -4);
                ctx.stroke();
                break;
            case 'BOLT': 
                // Lightning
                ctx.moveTo(2, -8); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(-2, 8);
                ctx.stroke();
                break;
            case 'BEAM': 
                // Laser
                ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
                ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
                break;
            case 'SMASH': 
                // Hammer
                ctx.rect(-6, -8, 12, 8);
                ctx.moveTo(0, 0); ctx.lineTo(0, 10);
                ctx.stroke();
                break;
            case 'BOMB': 
                // Bomb
                ctx.arc(0, 2, 6, 0, Math.PI*2);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(8, -8); ctx.stroke();
                break;
            default:
                ctx.arc(0, 0, 6, 0, Math.PI*2);
                ctx.fill();
        }

        return canvas;
    },

    generateStatusIcon(type: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(STATUS_SIZE, STATUS_SIZE);
        const cx = STATUS_SIZE / 2;
        const cy = STATUS_SIZE / 2;
        
        ctx.translate(cx, cy);
        ctx.shadowBlur = 5;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (type) {
            case 'STUN':
                ctx.strokeStyle = '#facc15';
                ctx.shadowColor = '#facc15';
                // Spiral
                ctx.beginPath();
                for(let i=0; i<10; i++) {
                    const angle = i * 0.5;
                    const r = 2 + i * 1.5;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                }
                ctx.stroke();
                break;
            case 'SILENCE':
                ctx.strokeStyle = '#e2e8f0';
                ctx.shadowColor = '#94a3b8';
                // Chat bubble with dots
                ctx.strokeRect(-12, -10, 24, 16);
                ctx.beginPath();
                ctx.moveTo(-6, -2); ctx.lineTo(-6, -2);
                ctx.moveTo(0, -2); ctx.lineTo(0, -2);
                ctx.moveTo(6, -2); ctx.lineTo(6, -2);
                ctx.lineWidth = 4; // dots
                ctx.stroke();
                break;
            case 'POISON': // DoT
                ctx.strokeStyle = '#4ade80';
                ctx.shadowColor = '#22c55e';
                // Skull simple
                ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.stroke();
                break;
            case 'BURN': // DoT
                ctx.fillStyle = '#f87171';
                ctx.shadowColor = '#ef4444';
                // Flame
                ctx.beginPath();
                ctx.arc(0, 5, 8, 0, Math.PI*2);
                ctx.moveTo(0, -10); ctx.lineTo(-5, 0); ctx.lineTo(5, 0);
                ctx.fill();
                break;
            case 'REGEN': // HoT
                ctx.strokeStyle = '#86efac';
                ctx.shadowColor = '#4ade80';
                // Cross
                ctx.beginPath();
                ctx.moveTo(0, -10); ctx.lineTo(0, 10);
                ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
                ctx.stroke();
                break;
            case 'BANISH':
                ctx.strokeStyle = '#d8b4fe';
                ctx.shadowColor = '#c084fc';
                // Ghost shape
                ctx.beginPath();
                ctx.arc(0, -5, 10, Math.PI, 0);
                ctx.lineTo(10, 10);
                ctx.lineTo(5, 5); ctx.lineTo(0, 10);
                ctx.lineTo(-5, 5); ctx.lineTo(-10, 10);
                ctx.closePath();
                ctx.stroke();
                break;
            case 'POLYMORPH':
                ctx.strokeStyle = '#fbcfe8';
                ctx.shadowColor = '#f472b6';
                // Sheep curly
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI*2);
                ctx.moveTo(-12, -5); ctx.arc(-8, -5, 4, 0, Math.PI*2);
                ctx.stroke();
                break;
            case 'STASIS':
                ctx.fillStyle = '#fef08a';
                ctx.shadowColor = '#facc15';
                // Shield solid
                ctx.beginPath();
                ctx.moveTo(-10, -10); ctx.lineTo(10, -10);
                ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                break;
        }

        return canvas;
    }
};
