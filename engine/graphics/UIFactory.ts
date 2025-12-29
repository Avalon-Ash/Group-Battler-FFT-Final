
import { createCanvas } from "./CanvasUtils";
import { STATUS_VISUALS } from "../../data/vfx/status_visuals";
import { HexGeometry } from "./utils/HexGeometry";

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
                ctx.arc(0, 0, 8, -Math.PI/2, 0);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.stroke();
                break;
            case 'ARROW': 
                ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
                ctx.lineTo(2, -6); ctx.moveTo(6, -6); ctx.lineTo(6, -2);
                ctx.stroke();
                break;
            case 'FIREBALL': 
                ctx.arc(0, 2, 6, 0, Math.PI*2);
                ctx.moveTo(0, -8); ctx.lineTo(0, -4);
                ctx.stroke();
                break;
            case 'BOLT': 
                ctx.moveTo(2, -8); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(-2, 8);
                ctx.stroke();
                break;
            case 'BEAM': 
                ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
                ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
                break;
            case 'SMASH': 
                ctx.rect(-6, -8, 12, 8);
                ctx.moveTo(0, 0); ctx.lineTo(0, 10);
                ctx.stroke();
                break;
            case 'BOMB': 
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
        
        const def = STATUS_VISUALS[statusId] || STATUS_VISUALS['DEFAULT'];

        ctx.translate(cx, cy);
        ctx.shadowBlur = 5;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.strokeStyle = def.primaryColor;
        ctx.fillStyle = def.primaryColor;
        ctx.shadowColor = def.secondaryColor;

        // Unified Hex Shape Drawing
        const drawHex = (r: number, style: 'FILL' | 'STROKE') => {
            // UI Icons are flat (applyIso = false)
            HexGeometry.traceHex(ctx, 0, 0, r, false);
            if (style === 'FILL') ctx.fill(); else ctx.stroke();
        };

        switch (def.iconShape) {
            case 'HEX_HALO': // Stun
                // Outer Hex
                drawHex(16, 'STROKE');
                // Inner Stars
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
            case 'HEX_LOCK': // Silence
                ctx.strokeRect(-12, -10, 24, 16);
                ctx.beginPath();
                ctx.moveTo(-6, -2); ctx.lineTo(-6, -2);
                ctx.moveTo(0, -2); ctx.lineTo(0, -2);
                ctx.moveTo(6, -2); ctx.lineTo(6, -2);
                ctx.lineWidth = 4; 
                ctx.stroke();
                break;
            case 'HEX_PRISM': // Banish
                drawHex(14, 'FILL');
                break;
            case 'HEX_RUNE': // Poison/Regen
                if (statusId === 'POISON') {
                    drawHex(14, 'STROKE');
                    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.stroke();
                } else if (statusId === 'REGEN') {
                    ctx.beginPath();
                    ctx.moveTo(0, -10); ctx.lineTo(0, 10);
                    ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
                    ctx.stroke();
                } else {
                    drawHex(14, 'STROKE');
                }
                break;
            case 'HEX_SKULL': // Fear
                ctx.beginPath();
                ctx.arc(0, -4, 8, 0, Math.PI*2); 
                ctx.rect(-6, 2, 12, 8); 
                ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(-3, -4, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(3, -4, 2, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'HEX_ANGRY': // Taunt
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-10, -10); ctx.lineTo(-5, 0); ctx.lineTo(-10, 10);
                ctx.moveTo(0, -12); ctx.lineTo(0, 12);
                ctx.moveTo(10, -10); ctx.lineTo(5, 0); ctx.lineTo(10, 10);
                ctx.stroke();
                break;
            case 'HEX_EYE': // Blind
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ef4444';
                ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.stroke();
                break;
            case 'HEX_SHIELD': // Shield
                drawHex(16, 'STROKE');
                ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
                break;
            case 'NONE':
            default:
                if (statusId === 'POLYMORPH') {
                    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.stroke();
                }
                break;
        }

        return canvas;
    }
};
