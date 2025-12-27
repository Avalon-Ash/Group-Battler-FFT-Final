
import { Role, Team } from "../../../types";
import { THEME_COVENANT } from "../../../constants";
import { createCanvas } from "../CanvasUtils";

const BASE_SIZE = 128;
const ICON_SIZE = 64;

export const CovenantTokenFactory = {
    
    generateBase(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BASE_SIZE, BASE_SIZE);
        const cx = BASE_SIZE / 2;
        const cy = BASE_SIZE / 2;
        const radius = 36;
        
        ctx.translate(cx, cy);
        ctx.scale(1, 0.58); // Isometric projection
        
        // 1. Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.arc(0, 8, radius + 4, 0, Math.PI*2); ctx.fill();

        // 2. Blood-stained Brass & Iron
        const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        grad.addColorStop(0, '#991b1b'); // Dried Blood
        grad.addColorStop(0.5, '#450a0a'); // Dark Clot
        grad.addColorStop(1, '#000'); 
        ctx.fillStyle = grad;
        
        // 3. Jagged Gear Shape (Chaos Star hint)
        ctx.beginPath();
        const sides = 8;
        for(let i=0; i<=sides; i++) {
            const a = (i/sides) * Math.PI*2;
            const r = radius * (i%2===0 ? 1.0 : 0.85); 
            const x = Math.cos(a)*r;
            const y = Math.sin(a)*r;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.fill();
        
        // 4. Brass Trim (Tarnished)
        ctx.strokeStyle = '#78350f'; // Dark Bronze
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#d97706'; // Highlight Brass
        ctx.lineWidth = 2;
        ctx.stroke();

        // 5. Inner Runes (Burning)
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.6, 0, Math.PI*2);
        ctx.strokeStyle = '#ef4444'; // Glowing Red
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        
        // 6. Skull/Khorne Mark Hint
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();

        return canvas;
    },

    generateIcon(role: Role): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        const cx = ICON_SIZE / 2;
        const cy = ICON_SIZE / 2;
        
        // Red: Burning Orange (Warp Energy)
        const color = '#fdba74';
        const shadowColor = '#ea580c';

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.translate(cx, cy);
        const scale = 1.1;
        ctx.scale(scale, scale);

        ctx.beginPath();
        if (role === Role.TANK) {
            // Shield -> Terminator Honors
            ctx.rect(-10, -12, 20, 24);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
        } else if (role === Role.WARRIOR) {
            // Sword -> Chainaxe
            ctx.moveTo(-10, -10); ctx.lineTo(10, 10); 
            ctx.moveTo(-6, -10); ctx.lineTo(-10, -6); 
            ctx.moveTo(6, 10); ctx.lineTo(10, 6); 
            ctx.stroke();
            // Teeth
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(0, -8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -4); ctx.stroke();
        } else if (role === Role.RANGER) {
            // Bow -> Bolter Round
            ctx.arc(0, 0, 10, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -14); ctx.lineTo(0, -6);
            ctx.moveTo(0, 6); ctx.lineTo(0, 14);
            ctx.moveTo(-14, 0); ctx.lineTo(-6, 0);
            ctx.moveTo(6, 0); ctx.lineTo(14, 0);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
        } else if (role === Role.MAGE) {
            // Staff -> Warp Bolt
            ctx.beginPath();
            ctx.moveTo(0, 10); ctx.lineTo(0, -6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -10, 5, 0, Math.PI*2);
            ctx.stroke();
            // Lightning bolts
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(10, -18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-10, -18); ctx.stroke();
        } else if (role === Role.SUPPORT) {
            // Cross -> Chaos Icon
            ctx.beginPath();
            ctx.moveTo(0, -12); ctx.lineTo(0, 12);
            ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.stroke();
        }
        
        return canvas;
    }
};
