
import { TerrainRenderer } from "./TerrainRenderer";

export const AOERenderer = {
    draw(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string,
        visual: string,
        progress: number,
        globalTime: number,
        q: number, r: number,
        state: 'ACTIVE' | 'BROKEN' = 'ACTIVE',
        fadeRatio: number = 1.0
    ) {
        // If state is BROKEN, we do NOT draw here anymore. 
        // Broken state is handled entirely by the Physics Particle System (VFXSystem) for immediate feedback.
        if (state === 'BROKEN') return;

        // Helper trace function
        const trace = () => TerrainRenderer.traceTopFace(ctx, x, y);

        ctx.save();
        
        // Base Opacity based on cast progress (Charges up)
        // 0% -> 20% opacity ... 100% -> 60% opacity
        const opacity = 0.2 + progress * 0.4;
        ctx.globalAlpha = opacity;

        // --- A. SMASH / EARTH (Fissures/Cracks) ---
        if (visual === 'SMASH') {
            // 1. Border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]); // Heavy industrial look
            trace();
            ctx.stroke();
            
            // 2. Fissures growing from center
            // Deterministic random based on tile coordinate
            const seed = Math.abs(q * 73 + r * 19); 
            const crackCount = 3 + Math.floor(seed % 3);
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1 + progress * 2; // Cracks widen
            ctx.setLineDash([]);
            
            ctx.beginPath();
            for(let i=0; i<crackCount; i++) {
                const angle = (seed + i * (Math.PI * 2 / crackCount)) % (Math.PI * 2);
                // Length grows with progress
                const len = size * 0.8 * progress; 
                
                let cx = x; 
                let cy = y;
                ctx.moveTo(cx, cy);
                
                // Jagged line
                const segments = 3;
                for(let s=1; s<=segments; s++) {
                    const step = len / segments;
                    const zig = (s % 2 === 0 ? 1 : -1) * 5;
                    cx += Math.cos(angle) * step + Math.sin(angle) * zig;
                    cy += Math.sin(angle) * step * 0.55 + Math.cos(angle) * zig * 0.55; // Isometric squash
                    ctx.lineTo(cx, cy);
                }
            }
            ctx.stroke();

        // --- B. FIREBALL / BOMB (Heat Haze) ---
        } else if (visual === 'FIREBALL' || visual === 'BOMB') {
            const pulse = 1 + Math.sin(globalTime * 15) * 0.05;
            
            // 1. Fill expanding from center (Lava filling up)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(x, y, size * progress * pulse, size * 0.55 * progress * pulse, 0, 0, Math.PI*2);
            ctx.fill();
            
            // 2. Outer Warning Ring (Static)
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            trace();
            ctx.stroke();
            
            // 3. Core Heat
            if (progress > 0.5) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = (progress - 0.5) * 0.5;
                ctx.beginPath();
                ctx.ellipse(x, y, size * 0.3, size * 0.3 * 0.55, 0, 0, Math.PI*2);
                ctx.fill();
            }

        // --- C. ARROW / RANGER (Target Lock Reticle) ---
        } else if (visual === 'ARROW') {
            // "Locking On" animation: Brackets start wide and close in
            // Progress 0.0 -> Scale 1.5
            // Progress 1.0 -> Scale 0.8 (Locked)
            const currentScale = 1.5 - (progress * 0.7);
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            
            const s = size * currentScale;
            const w = s * 0.3; // Corner length
            
            ctx.beginPath();
            // Top Left Corner
            ctx.moveTo(x - s, y - s * 0.55 + w * 0.55); ctx.lineTo(x - s, y - s * 0.55); ctx.lineTo(x - s + w, y - s * 0.55);
            // Top Right Corner
            ctx.moveTo(x + s - w, y - s * 0.55); ctx.lineTo(x + s, y - s * 0.55); ctx.lineTo(x + s, y - s * 0.55 + w * 0.55);
            // Bottom Right Corner
            ctx.moveTo(x + s, y + s * 0.55 - w * 0.55); ctx.lineTo(x + s, y + s * 0.55); ctx.lineTo(x + s - w, y + s * 0.55);
            // Bottom Left Corner
            ctx.moveTo(x - s + w, y + s * 0.55); ctx.lineTo(x - s, y + s * 0.55); ctx.lineTo(x - s, y + s * 0.55 - w * 0.55);
            
            ctx.stroke();

            // Center Dot (Only appears near completion)
            if (progress > 0.8) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
            }
            
            // Faint Range Ring
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 8]);
            ctx.globalAlpha = 0.3;
            trace();
            ctx.stroke();

        // --- D. DEFAULT / MAGIC (Runes) ---
        } else {
            // Magic Circle
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 5 * progress;
            
            // Rotating Outer Ring
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, 0.55);
            ctx.rotate(globalTime * 2);
            ctx.setLineDash([15, 10]); // Runes
            ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
            
            // Inner Star/Shape growing
            if (progress > 0.2) {
                ctx.globalAlpha = progress * 0.5;
                ctx.fillStyle = color;
                ctx.beginPath();
                const pts = 3;
                const r = size * progress * 0.8;
                for(let i=0; i<pts; i++) {
                    const ang = globalTime + i * (Math.PI*2/pts);
                    const px = x + Math.cos(ang) * r;
                    const py = y + Math.sin(ang) * r * 0.55;
                    if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
};
