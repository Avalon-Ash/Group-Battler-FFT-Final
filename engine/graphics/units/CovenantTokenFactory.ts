
import { Role, Team } from "../../../types";
import { ISO_SCALE_Y, PALETTE } from "../../../constants";
import { createCanvas } from "../CanvasUtils";
import { UnitAssetsFull } from "../UnitFactory";
import { UNIT_APPEARANCE } from "../../../data/units/appearance";

const BASE_SIZE = 128;
const ICON_SIZE = 64;

export const CovenantTokenFactory = {
    
    generateBase(role: Role = Role.WARRIOR): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BASE_SIZE, BASE_SIZE);
        const cx = BASE_SIZE / 2;
        const cy = BASE_SIZE / 2;
        const ap = UNIT_APPEARANCE[Team.RED].roles[role] ?? UNIT_APPEARANCE[Team.RED].roles[Role.WARRIOR];
        const radius = ap.tokenRadius;
        
        ctx.translate(cx, cy);
        ctx.scale(1, ISO_SCALE_Y); // Use Source of Truth
        
        // 1. Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.arc(0, 8, radius + 4, 0, Math.PI*2); ctx.fill();

        // 2. Blood-stained Brass & Iron
        const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        grad.addColorStop(0, ap.primaryColor); // Dried Blood
        grad.addColorStop(0.5, ap.deepColor); // Dark Clot
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
        ctx.strokeStyle = ap.rimShadowColor; // Dark Bronze
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = ap.rimColor; // Highlight Brass
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

    generateLayers(role: Role): UnitAssetsFull {
        const ap = UNIT_APPEARANCE[Team.RED].roles[role] ?? UNIT_APPEARANCE[Team.RED].roles[Role.WARRIOR];
        const R  = ap.tokenRadius;
        
        // 1. Base Layer (Jagged Body Only)
        const baseRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const bCtx = baseRes.ctx;
        bCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        bCtx.scale(1, ISO_SCALE_Y);
        const grad = bCtx.createLinearGradient(-R, -R, R, R);
        grad.addColorStop(0, ap.primaryColor);
        grad.addColorStop(1, '#000');
        bCtx.fillStyle = grad;
        bCtx.beginPath();
        const sides = 8;
        for(let i=0; i<=sides; i++) {
            const a = (i/sides) * Math.PI*2;
            const r = R * (i%2===0 ? 1.0 : 0.85); 
            const x = Math.cos(a)*r;
            const y = Math.sin(a)*r;
            if(i===0) bCtx.moveTo(x,y); else bCtx.lineTo(x,y);
        }
        bCtx.fill();

        // 2. Rim Layer (Brass Trim Only)
        const rimRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const rCtx = rimRes.ctx;
        rCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        rCtx.scale(1, ISO_SCALE_Y);
        rCtx.strokeStyle = ap.rimShadowColor;
        rCtx.lineWidth = 5;
        rCtx.beginPath();
        for(let i=0; i<=sides; i++) {
            const a = (i/sides) * Math.PI*2;
            const r = R * (i%2===0 ? 1.0 : 0.85); 
            const x = Math.cos(a)*r;
            const y = Math.sin(a)*r;
            if(i===0) rCtx.moveTo(x,y); else rCtx.lineTo(x,y);
        }
        rCtx.stroke();
        rCtx.strokeStyle = ap.rimColor;
        rCtx.lineWidth = 2;
        rCtx.stroke();

        // 3. Core Layer (Skull/Runes Hint)
        const coreRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const cCtx = coreRes.ctx;
        cCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        cCtx.scale(1, ISO_SCALE_Y);
        cCtx.fillStyle = '#000';
        cCtx.beginPath(); cCtx.arc(0, 0, 10, 0, Math.PI*2); cCtx.fill();
        cCtx.beginPath(); cCtx.arc(0, 0, R * 0.6, 0, Math.PI*2);
        cCtx.strokeStyle = '#ef4444';
        cCtx.lineWidth = 2;
        cCtx.stroke();

        return {
            base: baseRes.canvas,
            rim: rimRes.canvas,
            core: coreRes.canvas,
            icon: this.generateIcon(role),
            color: PALETTE.TEAMS[Team.RED].glow
        };
    },

    generateIcon(role: Role): HTMLCanvasElement {
        const ap = UNIT_APPEARANCE[Team.RED].roles[role] ?? UNIT_APPEARANCE[Team.RED].roles[Role.WARRIOR];
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        const cx = ICON_SIZE / 2;
        const cy = ICON_SIZE / 2;
        
        // Red: Burning Orange (Warp Energy)
        const color = ap.iconColor;
        const shadowColor = ap.iconGlow;

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
    },
};
