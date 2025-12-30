
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { PROCEDURAL_VISUALS, PillarVisualDef } from "../../../../../data/vfx/procedural_visuals";
import { VolumePainter } from "../../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../../types";

export const ProceduralPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout = 'FLAT') {
        ctx.save();
        
        // 1. 處理地面法陣類 (Locked to Ground)
        if (['HEX_BEAM', 'GIANT_HEX', 'MAGIC_CIRCLE', 'BLACK_HOLE'].includes(p.type)) {
            // 使用 now * vRotation 確保動畫平滑，不跳幀
            const animRot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            if (p.type === 'GIANT_HEX') {
                this.drawGiantHex(ctx, p, animRot, layout);
            } else if (p.type === 'MAGIC_CIRCLE') {
                this.drawMagicCircle(ctx, p, animRot, layout);
            } else if (p.type === 'BLACK_HOLE') {
                this.drawBlackHole(ctx, p, progress, now, layout);
            } else {
                this.drawStandardHexVfx(ctx, p, animRot, progress, layout);
            }
        }
        // 2. 處理體積投射類 (3D Entities)
        else if (p.type === 'PILLAR') {
            this.drawVolumetricPillar(ctx, p, progress, now);
        }
        else if (p.type === 'DOMAIN') {
            this.drawDomainField(ctx, p, progress, layout);
        }
        
        ctx.restore();
    },

    drawBlackHole(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout) {
        // Animation Curve: Explosive Expansion -> Hold -> Collapse
        let scale = 1.0;
        if (progress < 0.2) scale = progress / 0.2; // Fast Open
        else if (progress > 0.8) scale = (1 - progress) / 0.2; // Fast Close
        
        const size = p.size * scale;
        if (size < 1) return;

        // 1. Accretion Disk (The "Frisbee")
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y); // Flatten to ground
        
        const rot = now * 3.0; // High speed rotation
        ctx.rotate(rot);
        
        // Dynamic Spiral Gradient
        const grad = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size);
        grad.addColorStop(0, 'rgba(0,0,0,1)'); // Inner dark
        grad.addColorStop(0.2, p.color);       // Horizon light
        grad.addColorStop(0.5, 'rgba(0,0,0,0.8)'); // Accretion gap
        grad.addColorStop(0.8, p.color);       // Outer ring
        grad.addColorStop(1, 'transparent');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.fill();
        
        // Matter Streaks (Spiral Arms)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        const arms = 3;
        for(let i=0; i<arms; i++) {
            const offset = i * (Math.PI*2/arms);
            for(let r=size*0.3; r<size; r+=5) {
                const a = offset + (r/size) * 4; // Spiral factor
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if(r===size*0.3) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
        }
        ctx.stroke();
        ctx.restore();

        // 2. The Event Horizon (The Sphere)
        // Must appear perfectly round (Sphere), so we undo the ISO scale for the core
        const coreSize = size * 0.3;
        
        ctx.save();
        // Since we didn't scale Y in the main context yet (only in the save block above),
        // we are still in screen space here.
        
        // Black Core (Eats Light)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20 * scale;
        ctx.beginPath(); ctx.arc(0, 0, coreSize, 0, Math.PI*2); ctx.fill();
        
        // Photon Ring (White Rim)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.stroke();
        
        // Vertical Jets (Optional, adds 3D feel)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.3 * scale;
        const jetH = size * 1.5;
        const jetW = coreSize * 0.4;
        ctx.fillRect(-jetW/2, -jetH, jetW, jetH * 2);
        
        ctx.restore();
    },

    drawGiantHex(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        
        // A. 擴散光環
        ctx.save();
        ctx.globalAlpha = 0.4 * (1 - p.life/p.maxLife);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 40;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 1.2, rot * 0.5, true, layout);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        // B. 主幾何體 (高能核心)
        const grad = ctx.createRadialGradient(0,0,0, 0,0, p.size);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, p.color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();

        // C. 邊緣外框 (銳利化)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1.0;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.stroke();
    },

    drawMagicCircle(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        
        // 多層環繞幾何
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.stroke();
        
        ctx.save();
        ctx.setLineDash([10, 5]);
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.85, -rot * 1.2, true, layout);
        ctx.stroke();
        ctx.restore();

        // 中心符文脈衝
        const pulse = 0.5 + Math.sin(rot * 2) * 0.2;
        ctx.globalAlpha = pulse;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.4, rot * 3, true, layout);
        ctx.stroke();
    },

    drawStandardHexVfx(ctx: CanvasRenderingContext2D, p: Particle, rot: number, progress: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - progress) * 0.6;
        ctx.fillStyle = p.color;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();
    },

    drawVolumetricPillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number) {
        const h = p.height || 1000; 
        const w = p.size * (1 - progress * 0.5);
        const color = p.color;
        
        ctx.globalCompositeOperation = 'screen';
        
        // 核心漸變
        const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.5, '#ffffff'); 
        grad.addColorStop(1, color); 
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.fillRect(-w/2, -h, w, h);
        
        // 掃描線動畫 (TA 增加)
        const scanY = -( (now * 500) % h );
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3 * (1 - progress);
        ctx.fillRect(-w/2, scanY, w, 2);

        // 底部圓盤
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y);
        const glow = ctx.createRadialGradient(0,0,0, 0,0, w * 2);
        glow.addColorStop(0, '#fff');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.globalAlpha = (1 - progress) * 0.5;
        ctx.beginPath(); ctx.arc(0, 0, w * 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },

    drawDomainField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const r = p.size;
        const h = 80;
        const opacity = 0.4 * (1 - progress);
        // 使用 3D 棱鏡繪製區域感
        VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE', layout);
    }
};
