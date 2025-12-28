
import { createCanvas } from "./CanvasUtils";
import { STATUS_VISUALS } from "../../data/vfx/status_visuals";

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

    generateStatusIcon(statusId: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(STATUS_SIZE, STATUS_SIZE);
        const cx = STATUS_SIZE / 2;
        const cy = STATUS_SIZE / 2;
        
        // Load Definition
        const def = STATUS_VISUALS[statusId] || STATUS_VISUALS['DEFAULT'];

        ctx.translate(cx, cy);
        ctx.shadowBlur = 5;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Apply Definition Colors
        ctx.strokeStyle = def.primaryColor;
        ctx.fillStyle = def.primaryColor;
        ctx.shadowColor = def.secondaryColor;

        // Render Shape
        switch (def.iconShape) {
            case 'HEX_HALO': // Stun
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
            case 'HEX_LOCK': // Silence / Root
                ctx.strokeRect(-12, -10, 24, 16);
                ctx.beginPath();
                ctx.moveTo(-6, -2); ctx.lineTo(-6, -2);
                ctx.moveTo(0, -2); ctx.lineTo(0, -2);
                ctx.moveTo(6, -2); ctx.lineTo(6, -2);
                ctx.lineWidth = 4; // dots
                ctx.stroke();
                break;
            case 'HEX_PRISM': // Banish / Stasis (Shield shape)
                ctx.beginPath();
                ctx.moveTo(-10, -10); ctx.lineTo(10, -10);
                ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                break;
            case 'HEX_RUNE': // Poison, Burn, Regen
                if (statusId === 'POISON') {
                    // Skull
                    ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI*2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.stroke();
                } else if (statusId === 'BURN') {
                    // Flame
                    ctx.beginPath();
                    ctx.arc(0, 5, 8, 0, Math.PI*2);
                    ctx.moveTo(0, -10); ctx.lineTo(-5, 0); ctx.lineTo(5, 0);
                    ctx.fill();
                } else if (statusId === 'REGEN') {
                    // Cross
                    ctx.beginPath();
                    ctx.moveTo(0, -10); ctx.lineTo(0, 10);
                    ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
                    ctx.stroke();
                } else {
                    // Generic Rune
                    ctx.beginPath();
                    ctx.arc(0, -5, 10, Math.PI, 0);
                    ctx.lineTo(10, 10);
                    ctx.lineTo(5, 5); ctx.lineTo(0, 10);
                    ctx.lineTo(-5, 5); ctx.lineTo(-10, 10);
                    ctx.closePath();
                    ctx.stroke();
                }
                break;
            case 'HEX_SKULL': // Fear
                ctx.beginPath();
                ctx.arc(0, -4, 8, 0, Math.PI*2); // Head
                ctx.rect(-6, 2, 12, 8); // Jaw
                ctx.fill();
                // Eyes (Clear rect)
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(-3, -4, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(3, -4, 2, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'HEX_ANGRY': // Taunt
                ctx.lineWidth = 4;
                ctx.beginPath();
                // Jagged lines
                ctx.moveTo(-10, -10); ctx.lineTo(-5, 0); ctx.lineTo(-10, 10);
                ctx.moveTo(0, -12); ctx.lineTo(0, 12);
                ctx.moveTo(10, -10); ctx.lineTo(5, 0); ctx.lineTo(10, 10);
                ctx.stroke();
                break;
            case 'HEX_EYE': // Blind
                ctx.lineWidth = 2;
                // Eye
                ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
                // Slash
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ef4444';
                ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.stroke();
                break;
            case 'HEX_SHIELD': // Shield
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -12); 
                ctx.quadraticCurveTo(12, -12, 12, 0);
                ctx.quadraticCurveTo(12, 12, 0, 16);
                ctx.quadraticCurveTo(-12, 12, -12, 0);
                ctx.quadraticCurveTo(-12, -12, 0, -12);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 10); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
                break;
            case 'NONE':
            default:
                if (statusId === 'POLYMORPH') {
                    // Sheep
                    ctx.beginPath();
                    ctx.arc(0, 0, 10, 0, Math.PI*2);
                    ctx.moveTo(-12, -5); ctx.arc(-8, -5, 4, 0, Math.PI*2);
                    ctx.stroke();
                } else {
                    // Circle fallback
                    ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.stroke();
                }
                break;
        }

        return canvas;
    }
};
