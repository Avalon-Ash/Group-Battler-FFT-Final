
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
        // Helper trace function
        const trace = () => TerrainRenderer.traceTopFace(ctx, x, y);

        ctx.save();
        
        // COMMON: No heavy fill, just light tint and strong borders
        const baseOpacity = 0.5 + progress * 0.5;
        // If broken, fade out based on timer
        const opacity = state === 'BROKEN' ? baseOpacity * fadeRatio : baseOpacity;
        
        // --- BROKEN STATE MODIFIERS ---
        if (state === 'BROKEN') {
            ctx.globalAlpha = opacity;
            ctx.setLineDash([5, 5]); // Dashed line implies "broken"
            
            // Jitter for instability
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            
            // Expand slightly as it dissipates
            const expand = 1.0 + (1 - fadeRatio) * 0.3;
            
            // CRITICAL FIX: Scale around the center of the tile (x, y)
            // Otherwise it scales from canvas (0,0) and flies off screen
            ctx.translate(x + jitterX, y + jitterY);
            ctx.scale(expand, expand);
            ctx.translate(-x, -y);
            
            // Optional: Shift color towards grey/white to indicate loss of magic
            ctx.shadowColor = 'transparent';
        } else {
            ctx.globalAlpha = 1.0;
        }

        // --- A. SMASH / EARTH (Cracks) ---
        if (visual === 'SMASH') {
            // Only draw borders and cracks, no background tint
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = opacity;
            trace();
            ctx.stroke();

            // Cracks
            const seed = Math.abs(q * 123 + r * 456);
            if (progress > 0.1) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.beginPath();
                for(let i=0; i<3; i++) {
                    const angle = (seed + i * 2) % (Math.PI * 2);
                    const len = size * 0.8;
                    let cx = x; let cy = y;
                    ctx.moveTo(cx, cy);
                    // Jagged line
                    for(let s=0; s<3; s++) {
                        cx += Math.cos(angle + (s%2==0?0.5:-0.5)) * (len/3);
                        cy += Math.sin(angle + (s%2==0?0.5:-0.5)) * (len/3);
                        ctx.lineTo(cx, cy);
                    }
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = 1 + progress;
                ctx.stroke();
            }

        // --- B. FIREBALL / BOMB (Pulse Ring) ---
        } else if (visual === 'FIREBALL' || visual === 'BOMB') {
            const pulse = 1 + Math.sin(globalTime * 20) * 0.1;
            
            // Outer Ring Glow (Halo) instead of tile fill
            ctx.shadowColor = color;
            ctx.shadowBlur = state === 'BROKEN' ? 0 : 10;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3 * pulse;
            ctx.globalAlpha = opacity; // Use computed opacity
            
            trace();
            ctx.stroke();
            
            // Inner heat core (Small dot) - Only if active
            if (state === 'ACTIVE') {
                ctx.fillStyle = color;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath(); 
                ctx.arc(x, y, size * 0.2 * pulse, 0, Math.PI*2); 
                ctx.fill();
            }

        // --- C. ARROW / RANGER (Target Lock) ---
        } else if (visual === 'ARROW') {
            // Reticle corners only
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = opacity * 0.8;
            
            const s = size * 0.6;
            ctx.beginPath();
            // Top Left
            ctx.moveTo(x - s, y - s/2); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s/2, y - s);
            // Top Right
            ctx.moveTo(x + s/2, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y - s/2);
            // Bottom Right
            ctx.moveTo(x + s, y + s/2); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s/2, y + s);
            // Bottom Left
            ctx.moveTo(x - s/2, y + s); ctx.lineTo(x - s, y + s); ctx.lineTo(x - s, y + s/2);
            ctx.stroke();

            // Center Dot
            if (state === 'ACTIVE') {
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
            }

        // --- D. DEFAULT / MAGIC (Runes) ---
        } else {
            // Magic Border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = opacity * 0.8;
            ctx.shadowColor = state === 'BROKEN' ? 'transparent' : color;
            ctx.shadowBlur = 5;
            trace();
            ctx.stroke();

            // Floating Particles
            if (progress > 0.2 && state === 'ACTIVE') {
                const particleCount = 1 + Math.floor(Math.random() * 2);
                for(let i=0; i<particleCount; i++) {
                    const pSeed = (Math.abs(q * 100 + r * 10) + i * 123.45 + globalTime);
                    const pX = x + Math.sin(pSeed) * (size * 0.4);
                    const pY = y + Math.cos(pSeed) * (size * 0.4);
                    
                    ctx.globalAlpha = 0.6 + Math.sin(globalTime * 10 + i) * 0.4;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(pX, pY, 1.5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        
        ctx.restore();
    }
};
