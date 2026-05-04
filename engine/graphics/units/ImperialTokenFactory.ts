
import { Role, Team } from "../../../types";
import { ISO_SCALE_Y, PALETTE } from "../../../constants";
import { createCanvas } from "../CanvasUtils";
import { UnitAssetsFull } from "../UnitFactory";
import { UNIT_APPEARANCE } from "../../../data/units/appearance";

const BASE_SIZE = 128;
const ICON_SIZE = 64;

export const ImperialTokenFactory = {
    
    generateBase(role: Role = Role.WARRIOR): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BASE_SIZE, BASE_SIZE);
        const cx = BASE_SIZE / 2;
        const cy = BASE_SIZE / 2;
        const ap = UNIT_APPEARANCE[Team.BLUE].roles[role] ?? UNIT_APPEARANCE[Team.BLUE].roles[Role.WARRIOR];
        const radius = ap.tokenRadius;
        
        ctx.translate(cx, cy);
        ctx.scale(1, ISO_SCALE_Y); // Use Source of Truth for perspective
        
        // 1. Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.arc(0, 8, radius + 4, 0, Math.PI*2); ctx.fill();

        // 2. Ceramite Blue Body (Radial Gradient for Sphere effect)
        const grad = ctx.createRadialGradient(
            -radius * 0.28, -radius * 0.35, radius * 0.05,
             0,              0,              radius
        );
        grad.addColorStop(0,    '#6b9fff');   // ← 高光頂點（待納入 SSOT: highlightColor）
        grad.addColorStop(0.45, ap.primaryColor); // Bright Cobalt
        grad.addColorStop(1,    ap.deepColor); // Deep Navy
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI*2); ctx.fill();
        
        // 3. Gold Trim (Aquila Style)
        ctx.strokeStyle = ap.rimShadowColor; // Dark Gold shadow
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = ap.rimColor; // Bright Gold highlight
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3.1 Inner Light Rim (New)
        ctx.beginPath(); ctx.arc(0, 0, radius - 5, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
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

    generateLayers(role: Role): UnitAssetsFull {
        const ap = UNIT_APPEARANCE[Team.BLUE].roles[role] ?? UNIT_APPEARANCE[Team.BLUE].roles[Role.WARRIOR];
        const R  = ap.tokenRadius;
        
        // 1. Base Layer (Body Only)
        const baseRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const bCtx = baseRes.ctx;
        bCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        bCtx.scale(1, ISO_SCALE_Y);
        const grad = bCtx.createRadialGradient(
            -R * 0.28, -R * 0.35, R * 0.05,
             0,         0,         R
        );
        grad.addColorStop(0,    '#6b9fff');
        grad.addColorStop(0.45, ap.primaryColor);
        grad.addColorStop(1,    ap.deepColor);
        bCtx.fillStyle = grad;
        bCtx.beginPath(); bCtx.arc(0, 0, R, 0, Math.PI*2); bCtx.fill();

        // 2. Rim Layer (Gold Trim Only)
        const rimRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const rCtx = rimRes.ctx;
        rCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        rCtx.scale(1, ISO_SCALE_Y);
        rCtx.strokeStyle = ap.rimShadowColor;
        rCtx.lineWidth = 6;
        rCtx.beginPath(); rCtx.arc(0, 0, R, 0, Math.PI*2); rCtx.stroke();
        rCtx.strokeStyle = ap.rimColor;
        rCtx.lineWidth = 3;
        rCtx.stroke();

        // New: Inner rim highlight
        rCtx.beginPath(); rCtx.arc(0, 0, R - 5, 0, Math.PI*2);
        rCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        rCtx.lineWidth = 1.5;
        rCtx.stroke();

        // 3. Core Layer (Omega Only)
        const coreRes = createCanvas(BASE_SIZE, BASE_SIZE);
        const cCtx = coreRes.ctx;
        cCtx.translate(BASE_SIZE/2, BASE_SIZE/2);
        cCtx.scale(1, ISO_SCALE_Y);

        // 1. 底光暈（圖示投射在棋座上的光圈）
        const glowGrad = cCtx.createRadialGradient(0, 2, 0, 0, 2, R * 0.52);
        glowGrad.addColorStop(0,   'rgba(147, 210, 255, 0.40)');
        glowGrad.addColorStop(0.6, 'rgba(147, 210, 255, 0.12)');
        glowGrad.addColorStop(1,   'rgba(147, 210, 255, 0)');
        cCtx.fillStyle = glowGrad;
        cCtx.beginPath(); cCtx.arc(0, 2, R * 0.52, 0, Math.PI*2); cCtx.fill();

        // 2. 圖示投影陰影（懸浮高度感）
        cCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        cCtx.beginPath(); cCtx.ellipse(0, 6, R * 0.28, R * 0.10, 0, 0, Math.PI*2); cCtx.fill();

        // 3. Ω 本體（上移 4px）
        cCtx.shadowColor = '#93c5fd';
        cCtx.shadowBlur  = 10;
        cCtx.fillStyle   = 'rgba(255, 255, 255, 0.85)';
        cCtx.globalAlpha = 1;
        cCtx.font        = 'bold 22px sans-serif';
        cCtx.textAlign   = 'center';
        cCtx.textBaseline = 'middle';
        cCtx.fillText('Ω', 0, -4);   // ← 上移 4px
        cCtx.shadowBlur  = 0;
        cCtx.globalAlpha = 1; // Explicit reset as per protocol

        return {
            base: baseRes.canvas,
            rim: rimRes.canvas,
            core: coreRes.canvas,
            icon: this.generateIcon(role),
            color: PALETTE.TEAMS[Team.BLUE].glow
        };
    },

    generateIcon(role: Role): HTMLCanvasElement {
        const ap = UNIT_APPEARANCE[Team.BLUE].roles[role] ?? UNIT_APPEARANCE[Team.BLUE].roles[Role.WARRIOR];
        const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
        const cx = ICON_SIZE / 2;
        const cy = ICON_SIZE / 2;
        
        // Blue: Pale Cyan (Tactical Display)
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
        ctx.translate(0, -4);   // ← 上移 4px，製造懸浮高度
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
    },
};
