
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";

// Optimization: Precompute Hex Polygon Offsets
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_CORNERS: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_CORNERS.push({ 
        x: HEX_SIZE * Math.cos(angle), 
        y: HEX_SIZE * Math.sin(angle) * ISO_SCALE_Y 
    });
}

// Procedural Noise function
function noise(q: number, r: number) {
    return Math.sin(q * 12.9898 + r * 78.233) * 43758.5453 - Math.floor(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453);
}

export const TerrainRenderer = {
    
    drawBlockGeometry(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number // NEW: Time injection for animation
    ) {
        const BASE_THICKNESS = 12; 
        const topY = height; 

        // 1. Draw Side Faces (The Stack)
        const visibleIndices = [5, 0, 1];

        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const c1 = HEX_CORNERS[i];
            const c2 = HEX_CORNERS[j];
            
            const x1 = x + c1.x;
            const y1_top = y + c1.y - topY;
            const x2 = x + c2.x;
            const y2_top = y + c2.y - topY;

            const y1_bottom = y + c1.y + BASE_THICKNESS;
            const y2_bottom = y + c2.y + BASE_THICKNESS;
            
            const grad = ctx.createLinearGradient(0, y - topY, 0, y + BASE_THICKNESS);
            const baseColor = (i === 0) ? theme.sideDark : theme.sideLight; 
            
            grad.addColorStop(0, baseColor);
            grad.addColorStop(0.7, baseColor);
            grad.addColorStop(1, '#020617');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x1, y1_bottom);
            ctx.lineTo(x2, y2_bottom); 
            ctx.lineTo(x2, y2_top);    
            ctx.lineTo(x1, y1_top);    
            ctx.closePath();
            ctx.fill();
            
            // Layer Lines
            if (height > BLOCK_HEIGHT) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    ctx.moveTo(x1, y + c1.y - hStep);
                    ctx.lineTo(x2, y + c2.y - hStep);
                }
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // 2. Draw Top Face (Base)
        this.traceTopFace(ctx, x, y - topY);
        
        // --- BASE MATERIAL ---
        // Static Gradient for base material to ensure solid look
        const topGrad = ctx.createLinearGradient(x - size, y - topY - size, x + size, y - topY + size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        ctx.fillStyle = topGrad;
        ctx.fill();

        // --- DYNAMIC OVERLAYS (Texture 2.0) ---
        if (type === 'MAGMA') {
            // OPTIMIZATION: Replaced per-tile Gradient with flat fill.
            // Creating RadialGradient 100+ times per frame kills FPS.
            const pulse = Math.sin(globalTime * 1.5 + x * 0.1 + y * 0.1); 
            
            // Only draw heat if pulse is high
            if (pulse > 0.2) {
                // Map pulse (-1 to 1) to alpha (0 to 0.25)
                const heatAlpha = (pulse - 0.2) * 0.3; 
                ctx.fillStyle = `rgba(239, 68, 68, ${heatAlpha})`; // Flat Red Overlay
                ctx.fill();
            }
            
        } else if (type === 'ICE') {
            // FIX: Ice is now a glossy surface with a moving specular reflection, not a flashing strobe
            // Specular band moving across the tile
            const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
            
            ctx.save();
            ctx.clip(); // Clip to hex
            
            const specGrad = ctx.createLinearGradient(x - size, y - topY - size, x + size, y - topY + size);
            // Gentle white/cyan reflection
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            specGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
            specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); // Subtle highlight
            specGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.translate(bandPos * 0.5, 0); // Move reflection
            ctx.fillStyle = specGrad;
            ctx.fill();
            ctx.restore();
        } 

        // 3. Rim Light
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.rim || 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = 0.6;
        
        ctx.beginPath();
        const c4 = HEX_CORNERS[4];
        const c3 = HEX_CORNERS[3];
        const c2 = HEX_CORNERS[2];
        
        ctx.moveTo(x + c4.x, y - topY + c4.y);
        ctx.lineTo(x + c3.x, y - topY + c3.y);
        ctx.lineTo(x + c2.x, y - topY + c2.y); 
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        
        // 4. Subtle Outline
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + HEX_CORNERS[2].x, y - topY + HEX_CORNERS[2].y);
        ctx.lineTo(x + HEX_CORNERS[1].x, y - topY + HEX_CORNERS[1].y);
        ctx.lineTo(x + HEX_CORNERS[0].x, y - topY + HEX_CORNERS[0].y);
        ctx.lineTo(x + HEX_CORNERS[5].x, y - topY + HEX_CORNERS[5].y);
        ctx.lineTo(x + HEX_CORNERS[4].x, y - topY + HEX_CORNERS[4].y);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        ctx.save();
        ctx.fillStyle = detailColor;
        ctx.strokeStyle = detailColor;
        
        const n = noise(q, r);
        const time = performance.now() / 1000;

        if (type === 'MAGMA') {
            // Charred Cracks (Darker, less glowing)
            const pulse = 0.5 + Math.sin(time + n * 10) * 0.5;
            
            // OPTIMIZATION: Removed globalCompositeOperation 'multiply'.
            // Switching blend modes per-tile is expensive. Use alpha-blended dark line instead.
            ctx.strokeStyle = 'rgba(40, 5, 5, 0.7)'; // Dark crack
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy + 5);
            ctx.lineTo(cx - 5, cy - 2);
            ctx.lineTo(cx + 8, cy + 3);
            ctx.lineTo(cx + 15, cy - 5);
            ctx.stroke();
            
            // Only occasional glowing ember spots
            if (pulse > 0.8) {
                // OPTIMIZATION: Removed globalCompositeOperation 'lighter'.
                // Just draw bright red on top.
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = (pulse - 0.8) * 3; 
                ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 2, 0, Math.PI*2); ctx.fill();
            }

        } else if (type === 'VOID') {
            // ENHANCED: Digital Circuitry
            ctx.globalAlpha = 0.3;
            
            // Static Grid Node
            if (n > 0.3) {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
                
                // Connecting lines
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (n > 0.6) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 15, cy - 8); }
                if (n < 0.4) { ctx.moveTo(cx, cy); ctx.lineTo(cx - 15, cy + 8); }
                ctx.stroke();
            }

            // Moving Data Packet
            const packetTime = (time * 0.5 + n) % 2; // 2 second loop
            if (packetTime < 1.0) {
                ctx.globalAlpha = 1.0 - packetTime; // Fade out
                ctx.fillStyle = '#bae6fd';
                const px = cx + (Math.cos(n * 10) * 20 * packetTime);
                const py = cy + (Math.sin(n * 10) * 10 * packetTime); // Squashed Y
                ctx.fillRect(px, py, 2, 2);
            }

        } else if (type === 'FOREST') {
            // ENHANCED: Moving Grass
            ctx.globalAlpha = 0.6;
            const tufts = Math.floor(n * 3) + 2;
            
            for(let i=0; i<tufts; i++) {
                const ox = (noise(q+i, r) - 0.5) * 20;
                const oy = (noise(r, q+i) - 0.5) * 12;
                
                // Wind Sway Logic
                const wind = Math.sin(time * 2 + cx * 0.05 + i) * 3;
                
                ctx.beginPath();
                // Blade 1
                ctx.moveTo(cx + ox, cy + oy);
                ctx.quadraticCurveTo(cx + ox - 2 + wind, cy + oy - 6, cx + ox - 4 + wind * 1.5, cy + oy - 8);
                // Blade 2
                ctx.moveTo(cx + ox, cy + oy);
                ctx.quadraticCurveTo(cx + ox + 2 + wind, cy + oy - 5, cx + ox + 4 + wind * 1.5, cy + oy - 7);
                
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = i % 2 === 0 ? '#4ade80' : '#22c55e'; // Varied greens
                ctx.stroke();
            }

        } else if (type === 'ICE') {
            // Subtler scratches
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#fff';
            if (n > 0.4) {
                ctx.beginPath();
                ctx.moveTo(cx - 15, cy + 2);
                ctx.lineTo(cx + 5, cy - 8);
                ctx.lineTo(cx + 15, cy - 4);
                ctx.lineTo(cx - 5, cy + 8);
                ctx.fill();
            }

        } else if (type === 'DESERT') {
            // ENHANCED: Moving Sand Ripples
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 2;
            
            // Scroll ripples
            const offset = (time * 5) % 20; 
            
            ctx.beginPath();
            // Draw 2 ripples
            for(let i=0; i<2; i++) {
                const yBase = cy - 10 + i * 15;
                const shift = offset + (n * 20); // Random offset per tile
                const xStart = cx - 15 + (shift % 10);
                
                ctx.moveTo(xStart, yBase);
                ctx.quadraticCurveTo(xStart + 10, yBase - 3, xStart + 20, yBase);
            }
            ctx.stroke();
        }

        ctx.restore();
    },

    traceTopFace(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.beginPath();
        const c0 = HEX_CORNERS[0];
        ctx.moveTo(x + c0.x, y + c0.y);
        for (let i = 1; i < 6; i++) {
            const c = HEX_CORNERS[i];
            ctx.lineTo(x + c.x, y + c.y);
        }
        ctx.closePath();
    }
};
