
import { Role, Team } from "../../types";
import { PALETTE } from "../../constants";
import { createCanvas } from "./CanvasUtils";

// Dimensions
const BASE_SIZE = 128;
const ICON_SIZE = 64;

export const UnitFactory = {
    
    generateTokenBase(team: Team): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BASE_SIZE, BASE_SIZE);
        const cx = BASE_SIZE / 2;
        const cy = BASE_SIZE / 2;
        const radius = 36; 
        const isBlue = team === Team.BLUE;
        
        ctx.translate(cx, cy);
        ctx.scale(1, 0.58); // Isometric projection
        
        // 1. Drop Shadow (Heavy grounding)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); 
        ctx.arc(0, 8, radius + 2, 0, Math.PI*2); 
        ctx.fill();

        // 2. Physical Material Body
        if (isBlue) {
            // IMPERIAL: White Marble & Gold
            const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
            grad.addColorStop(0, '#f8fafc'); // White marble
            grad.addColorStop(1, '#94a3b8'); // Grey shading
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
            
            // Gold Rim (Solid metal)
            ctx.strokeStyle = '#d97706'; // Dark Gold border
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.strokeStyle = '#fbbf24'; // Bright Gold highlight
            ctx.lineWidth = 3;
            ctx.stroke();

            // Inner Tech Circuit (The Projector)
            ctx.beginPath(); ctx.arc(0, 0, radius * 0.6, 0, Math.PI*2);
            ctx.fillStyle = '#1e3a8a'; // Dark Blue recessed area
            ctx.fill();
            ctx.strokeStyle = '#60a5fa'; // Glowing blue line
            ctx.lineWidth = 2;
            ctx.stroke();

        } else {
            // COVENANT: Dark Iron & Magma
            const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
            grad.addColorStop(0, '#27272a'); // Iron
            grad.addColorStop(1, '#000000'); 
            ctx.fillStyle = grad;
            
            // Jagged Shape base
            ctx.beginPath();
            const sides = 8;
            for(let i=0; i<=sides; i++) {
                const a = (i/sides) * Math.PI*2;
                const r = radius * (i%2===0 ? 1.0 : 0.9); // Gear/Spike shape
                const x = Math.cos(a)*r;
                const y = Math.sin(a)*r;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
            ctx.fill();
            
            // Iron Rim
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Inner Magma Core (The Projector)
            ctx.beginPath(); ctx.arc(0, 0, radius * 0.5, 0, Math.PI*2);
            ctx.fillStyle = '#450a0a'; // Dark Red
            ctx.fill();
            ctx.strokeStyle = '#ef4444'; // Glowing Red
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 3. Projector Lens Flare (Center)
        // This suggests the unit is being projected FROM here
        ctx.fillStyle = isBlue ? '#fff' : '#fecaca';
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();

        return canvas;
    },

    generateRoleIcon(role: Role, team: Team): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        const cx = ICON_SIZE / 2;
        const cy = ICON_SIZE / 2;
        
        // Emissive holographic text color
        const color = team === Team.BLUE ? '#e0f2fe' : '#fecaca';
        const shadowColor = team === Team.BLUE ? '#3b82f6' : '#ef4444';

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.translate(cx, cy);
        
        // Scale down to fit nicely in 64x64
        const scale = 1.2;
        ctx.scale(scale, scale);

        // Vector Drawings instead of Emojis
        ctx.beginPath();
        if (role === Role.TANK) {
            // Shield Icon
            ctx.moveTo(0, 12);
            ctx.lineTo(9, 12);
            ctx.lineTo(12, -6);
            ctx.lineTo(0, -12);
            ctx.lineTo(-12, -6);
            ctx.lineTo(-9, 12);
            ctx.closePath();
            ctx.stroke();
            // Inner cross
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();

        } else if (role === Role.WARRIOR) {
            // Crossed Swords
            const drawSword = () => {
                ctx.moveTo(-8, -8); ctx.lineTo(8, 8); // Blade
                ctx.moveTo(-5, -8); ctx.lineTo(-8, -5); // Hilt Guard
                ctx.moveTo(5, 8); ctx.lineTo(8, 5); // Tip detail
            };
            ctx.save();
            ctx.beginPath();
            drawSword();
            ctx.stroke();
            ctx.scale(-1, 1); // Flip for X
            ctx.beginPath();
            drawSword();
            ctx.stroke();
            ctx.restore();

        } else if (role === Role.RANGER) {
            // Bow & Arrow
            ctx.beginPath();
            ctx.arc(0, 0, 12, -Math.PI/2, Math.PI/2); // Bow string
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -14); ctx.lineTo(0, 14); // Bow Riser
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-10, 0); ctx.lineTo(14, 0); // Arrow
            ctx.lineTo(10, -4); ctx.moveTo(14, 0); ctx.lineTo(10, 4); // Arrow head
            ctx.stroke();

        } else if (role === Role.MAGE) {
            // Staff / Spark
            ctx.beginPath();
            ctx.moveTo(-10, 10); ctx.lineTo(10, -10); // Staff
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(10, -10, 5, 0, Math.PI*2); // Orb
            ctx.stroke();
            // Sparkles
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(14, -14, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -6, 1.5, 0, Math.PI*2); ctx.fill();

        } else if (role === Role.SUPPORT) {
            // Cross / Ankh
            ctx.beginPath();
            ctx.moveTo(0, -12); ctx.lineTo(0, 12);
            ctx.moveTo(-8, -4); ctx.lineTo(8, -4);
            ctx.stroke();
            // Circle top
            ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI*2); ctx.stroke();
        }
        
        return canvas;
    },

    generateSheep(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(64, 64);
        const cx = 32, cy = 45;
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI*2);
        ctx.arc(cx-10, cy-5, 10, 0, Math.PI*2);
        ctx.arc(cx+10, cy-5, 10, 0, Math.PI*2);
        ctx.fill();

        return canvas;
    }
};
