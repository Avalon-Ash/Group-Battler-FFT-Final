import { UI_ICON_BAKE } from "../../constants";

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
        ctx.shadowBlur = UI_ICON_BAKE.SKILL_GLOW_BLUR;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        switch (visual) {
            case 'SLASH': 
                ctx.arc(0, 0, UI_ICON_BAKE.SLASH_RADIUS, -Math.PI/2, 0);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-UI_ICON_BAKE.SLASH_EXTENT, UI_ICON_BAKE.SLASH_EXTENT); ctx.lineTo(UI_ICON_BAKE.SLASH_EXTENT, -UI_ICON_BAKE.SLASH_EXTENT); ctx.stroke();
                break;
            case 'ARROW': 
                ctx.moveTo(-UI_ICON_BAKE.ARROW_EXTENT, UI_ICON_BAKE.ARROW_EXTENT); ctx.lineTo(UI_ICON_BAKE.ARROW_EXTENT, -UI_ICON_BAKE.ARROW_EXTENT);
                ctx.lineTo(2, -UI_ICON_BAKE.ARROW_EXTENT); ctx.moveTo(UI_ICON_BAKE.ARROW_EXTENT, -UI_ICON_BAKE.ARROW_EXTENT); ctx.lineTo(UI_ICON_BAKE.ARROW_EXTENT, -UI_ICON_BAKE.ARROW_HEAD_END_UP);
                ctx.stroke();
                break;
            case 'FIREBALL': 
                ctx.arc(0, 2, UI_ICON_BAKE.FIREBALL_RADIUS, 0, Math.PI*2);
                ctx.moveTo(0, -UI_ICON_BAKE.FIREBALL_TAIL_TOP); ctx.lineTo(0, -UI_ICON_BAKE.FIREBALL_TAIL_BOTTOM);
                ctx.stroke();
                break;
            case 'BOLT': 
                ctx.moveTo(2, -UI_ICON_BAKE.BOLT_HALF_HEIGHT); ctx.lineTo(-UI_ICON_BAKE.BOLT_KINK_LEFT, 0); ctx.lineTo(4, 0); ctx.lineTo(-UI_ICON_BAKE.BOLT_BOTTOM_LEFT, UI_ICON_BAKE.BOLT_HALF_HEIGHT);
                ctx.stroke();
                break;
            case 'BEAM': 
                ctx.moveTo(-UI_ICON_BAKE.BEAM_EXTENT, -UI_ICON_BAKE.BEAM_EXTENT); ctx.lineTo(UI_ICON_BAKE.BEAM_EXTENT, UI_ICON_BAKE.BEAM_EXTENT);
                ctx.moveTo(UI_ICON_BAKE.BEAM_EXTENT, -UI_ICON_BAKE.BEAM_EXTENT); ctx.lineTo(-UI_ICON_BAKE.BEAM_EXTENT, UI_ICON_BAKE.BEAM_EXTENT);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
                break;
            case 'SMASH': 
                ctx.rect(-UI_ICON_BAKE.SMASH_LEFT, -UI_ICON_BAKE.SMASH_TOP, UI_ICON_BAKE.SMASH_WIDTH, UI_ICON_BAKE.SMASH_HEIGHT);
                ctx.moveTo(0, 0); ctx.lineTo(0, 10);
                ctx.stroke();
                break;
            case 'BOMB': 
                ctx.arc(0, 2, UI_ICON_BAKE.BOMB_RADIUS, 0, Math.PI*2);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(4, -UI_ICON_BAKE.BOMB_FUSE_START_UP); ctx.lineTo(UI_ICON_BAKE.BOMB_FUSE_END_X, -UI_ICON_BAKE.BOMB_FUSE_END_UP); ctx.stroke();
                break;
            default:
                ctx.arc(0, 0, UI_ICON_BAKE.DEFAULT_SKILL_RADIUS, 0, Math.PI*2);
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
        ctx.shadowBlur = UI_ICON_BAKE.STATUS_GLOW_BLUR;
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
                    const r = 2 + i * UI_ICON_BAKE.HALO_SPIRAL_STEP;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                }
                ctx.stroke();
                break;
            case 'HEX_LOCK': // Silence
                ctx.strokeRect(-UI_ICON_BAKE.LOCK_HALF_WIDTH, -UI_ICON_BAKE.LOCK_TOP, UI_ICON_BAKE.LOCK_WIDTH, 16);
                ctx.beginPath();
                ctx.moveTo(-UI_ICON_BAKE.LOCK_DOT_SPACING, -UI_ICON_BAKE.LOCK_DOT_UP); ctx.lineTo(-UI_ICON_BAKE.LOCK_DOT_SPACING, -UI_ICON_BAKE.LOCK_DOT_UP);
                ctx.moveTo(0, -UI_ICON_BAKE.LOCK_DOT_UP); ctx.lineTo(0, -UI_ICON_BAKE.LOCK_DOT_UP);
                ctx.moveTo(UI_ICON_BAKE.LOCK_DOT_SPACING, -UI_ICON_BAKE.LOCK_DOT_UP); ctx.lineTo(UI_ICON_BAKE.LOCK_DOT_SPACING, -UI_ICON_BAKE.LOCK_DOT_UP);
                ctx.lineWidth = 4; 
                ctx.stroke();
                break;
            case 'HEX_PRISM': // Banish
                drawHex(UI_ICON_BAKE.PRISM_RADIUS, 'FILL');
                break;
            case 'HEX_RUNE': // Poison/Regen
                if (statusId === 'POISON') {
                    drawHex(UI_ICON_BAKE.POISON_RUNE_RADIUS, 'STROKE');
                    ctx.beginPath(); ctx.moveTo(-UI_ICON_BAKE.POISON_CROSS_LEFT, -UI_ICON_BAKE.POISON_CROSS_UP); ctx.lineTo(4, 4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(4, -UI_ICON_BAKE.POISON_CROSS_UP); ctx.lineTo(-UI_ICON_BAKE.POISON_CROSS_LEFT, 4); ctx.stroke();
                } else if (statusId === 'REGEN') {
                    ctx.beginPath();
                    ctx.moveTo(0, -UI_ICON_BAKE.REGEN_HALF_HEIGHT); ctx.lineTo(0, 10);
                    ctx.moveTo(-UI_ICON_BAKE.REGEN_HALF_WIDTH, 0); ctx.lineTo(10, 0);
                    ctx.stroke();
                } else {
                    drawHex(UI_ICON_BAKE.DEFAULT_RUNE_RADIUS, 'STROKE');
                }
                break;
            case 'HEX_SKULL': // Fear
                ctx.beginPath();
                ctx.arc(0, -UI_ICON_BAKE.SKULL_HEAD_UP, UI_ICON_BAKE.SKULL_HEAD_RADIUS, 0, Math.PI*2); 
                ctx.rect(-UI_ICON_BAKE.SKULL_JAW_LEFT, 2, UI_ICON_BAKE.SKULL_JAW_WIDTH, UI_ICON_BAKE.SKULL_JAW_HEIGHT); 
                ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(-UI_ICON_BAKE.SKULL_EYE_LEFT, -UI_ICON_BAKE.SKULL_EYE_UP, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(3, -UI_ICON_BAKE.SKULL_EYE_UP, 2, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'HEX_ANGRY': // Taunt
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-UI_ICON_BAKE.ANGRY_LEFT, -UI_ICON_BAKE.ANGRY_HALF_HEIGHT); ctx.lineTo(-UI_ICON_BAKE.ANGRY_LEFT_KINK, 0); ctx.lineTo(-UI_ICON_BAKE.ANGRY_HALF_HEIGHT, 10);
                ctx.moveTo(0, -UI_ICON_BAKE.ANGRY_CENTER_HALF_HEIGHT); ctx.lineTo(0, UI_ICON_BAKE.ANGRY_CENTER_HALF_HEIGHT);
                ctx.moveTo(10, -UI_ICON_BAKE.ANGRY_HALF_HEIGHT); ctx.lineTo(UI_ICON_BAKE.ANGRY_RIGHT_KINK, 0); ctx.lineTo(10, 10);
                ctx.stroke();
                break;
            case 'HEX_EYE': // Blind
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, 0, UI_ICON_BAKE.EYE_RADIUS_X, UI_ICON_BAKE.EYE_RADIUS_Y, 0, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ef4444';
                ctx.beginPath(); ctx.moveTo(-UI_ICON_BAKE.EYE_SLASH_EXTENT, -UI_ICON_BAKE.EYE_SLASH_EXTENT); ctx.lineTo(UI_ICON_BAKE.EYE_SLASH_EXTENT, UI_ICON_BAKE.EYE_SLASH_EXTENT); ctx.stroke();
                break;
            case 'HEX_SHIELD': // Shield
                drawHex(16, 'STROKE');
                ctx.beginPath(); ctx.moveTo(0, -UI_ICON_BAKE.SHIELD_CROSS_HALF_HEIGHT); ctx.lineTo(0, UI_ICON_BAKE.SHIELD_CROSS_HALF_HEIGHT); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-UI_ICON_BAKE.SHIELD_CROSS_HALF_WIDTH, 0); ctx.lineTo(UI_ICON_BAKE.SHIELD_CROSS_HALF_WIDTH, 0); ctx.stroke();
                break;
            case 'NONE':
            default:
                if (statusId === 'POLYMORPH') {
                    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(0,0,UI_ICON_BAKE.DEFAULT_STATUS_RADIUS,0,Math.PI*2); ctx.stroke();
                }
                break;
        }

        return canvas;
    }
};
