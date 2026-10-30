import { UI_ICON_BAKE } from "../../constants";

import { createCanvas } from "./CanvasUtils";

const ICON_SIZE = 32;

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
    }
};
