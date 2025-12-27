
import { Role, Team } from "../../../types";
import { THEME_IMPERIAL } from "../../../constants";
import { createCanvas } from "../CanvasUtils";

const BASE_SIZE = 128;
const ICON_SIZE = 64;

export const ImperialTokenFactory = {
    
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

        // 2. Ceramite Blue Body
        const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        grad.addColorStop(0, '#2563eb'); // Bright Cobalt
        grad.addColorStop(1, '#172554'); // Deep Navy
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
        
        // 3. Gold Trim (Aquila Style)
        ctx.strokeStyle = '#b45309'; // Dark Gold shadow
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = '#fcd34d'; // Bright Gold highlight
        ctx.lineWidth = 3;
        ctx.stroke();

        // 4. Inner Tech/Auspex Ring
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.7, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; 
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 5. Omega / Tactical Symbol Hint
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.2;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ω', 0, 2);

        return canvas;
    },

    generateIcon(role: Role): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        const cx = ICON_SIZE / 2;
        const cy = ICON_SIZE / 2;
        
        // Blue: Pale Cyan (Tactical Display)
        const color = '#cffafe';
        const shadowColor = '#0ea5e9';

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
            // Shield -> Bulwark Icon
            ctx.rect(-10, -12, 20, 24);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
        } else if (role === Role.WARRIOR) {
            // Sword -> Chainsword
            ctx.moveTo(-10, -10); ctx.lineTo(10, 10); 
            ctx.moveTo(-6, -10); ctx.lineTo(-10, -6);
            ctx.moveTo(6, 10); ctx.lineTo(10, 6);
            ctx.stroke();
            // Teeth
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(0, -8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -4); ctx.stroke();
        } else if (role === Role.RANGER) {
            // Bow -> Crosshair / Bolter Round
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
            // Staff -> Psychic Hood
            ctx.beginPath();
            ctx.moveTo(0, 10); ctx.lineTo(0, -6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -10, 5, 0, Math.PI*2);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(10, -18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-10, -18); ctx.stroke();
        } else if (role === Role.SUPPORT) {
            // Cross -> Apothecary Helix
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
