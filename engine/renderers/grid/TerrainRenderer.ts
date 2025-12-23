
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
        theme: any
    ) {
        const BASE_THICKNESS = 12; // Visual foundation thickness
        const topY = height; 

        // 1. Draw Side Faces (The Stack)
        // Rotated 45deg: Front faces are 5, 0, 1 (Right-Down, Down, Left-Down)
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
            
            // Rich Gradient for Sides
            const grad = ctx.createLinearGradient(0, y - topY, 0, y + BASE_THICKNESS);
            const baseColor = (i === 0) ? theme.sideDark : theme.sideLight; // Front face darker
            
            // Add Ambient Occlusion to bottom of gradient
            grad.addColorStop(0, baseColor);
            grad.addColorStop(0.7, baseColor);
            grad.addColorStop(1, '#020617'); // Fade to black at bottom

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x1, y1_bottom);
            ctx.lineTo(x2, y2_bottom); 
            ctx.lineTo(x2, y2_top);    
            ctx.lineTo(x1, y1_top);    
            ctx.closePath();
            ctx.fill();
            
            // "Layer Lines" for Block Stack Effect
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

            // Outline Side
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // 2. Draw Top Face (Base)
        this.traceTopFace(ctx, x, y - topY);
        
        // Use a slight gradient for the top to simulate light falloff
        const topGrad = ctx.createLinearGradient(x - size, y - topY - size, x + size, y - topY + size);
        topGrad.addColorStop(0, theme.rim); // Highlight corner
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); // Shadow corner
        
        ctx.fillStyle = topGrad;
        ctx.fill();

        // 3. Rim Light (Edge Highlighting)
        // This makes the terrain pop by highlighting the edges facing the "light source" (Top-Left)
        ctx.lineCap = 'round';
        ctx.lineWidth = 2; // Thicker rim for style
        ctx.strokeStyle = theme.rim || 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = 0.6; // Blend it
        
        ctx.beginPath();
        // Highlight top-left and top-right edges (Indices 2, 3, 4)
        // 4 is Left-Up, 3 is Up, 2 is Right-Up
        const c4 = HEX_CORNERS[4];
        const c3 = HEX_CORNERS[3];
        const c2 = HEX_CORNERS[2];
        
        ctx.moveTo(x + c4.x, y - topY + c4.y);
        ctx.lineTo(x + c3.x, y - topY + c3.y); // Topmost point
        ctx.lineTo(x + c2.x, y - topY + c2.y); 
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        
        // 4. Subtle Top Outline (Rest of the hex)
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
        const n2 = noise(r, q);
        const time = performance.now() / 1000;

        if (type === 'VOID') {
            ctx.globalAlpha = 0.2;
            // Digital circuit lines
            if (n > 0.5) {
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy - 5);
                ctx.lineTo(cx, cy + 5);
                ctx.lineTo(cx + 10, cy - 2);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(cx + 10, cy - 2, 1.5, 0, Math.PI*2); ctx.fill();
            } else if (n < 0.2) {
                ctx.beginPath();
                ctx.rect(cx - 5, cy - 5, 4, 4);
                ctx.fill();
            }
        } else if (type === 'FOREST') {
            ctx.globalAlpha = 0.6;
            // Grass Tufts
            const tufts = Math.floor(n * 4) + 2;
            for(let i=0; i<tufts; i++) {
                const ox = (noise(q+i, r) - 0.5) * 20;
                const oy = (noise(r, q+i) - 0.5) * 12;
                
                // Wind effect
                const wind = Math.sin(time + cx * 0.01) * 2;
                
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy);
                ctx.quadraticCurveTo(cx + ox - 2 + wind, cy + oy - 6, cx + ox - 4 + wind*2, cy + oy - 8);
                ctx.moveTo(cx + ox, cy + oy);
                ctx.quadraticCurveTo(cx + ox + 2 + wind, cy + oy - 5, cx + ox + 4 + wind*2, cy + oy - 7);
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        } else if (type === 'ICE') {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#fff';
            // Ice sheets / Reflections
            if (n > 0.4) {
                ctx.beginPath();
                ctx.moveTo(cx - 15, cy + 2);
                ctx.lineTo(cx + 5, cy - 8);
                ctx.lineTo(cx + 15, cy - 4);
                ctx.lineTo(cx - 5, cy + 8);
                ctx.fill();
                
                // Glint
                const glint = Math.sin(time * 2 + n * 10);
                if (glint > 0.8) {
                    ctx.globalAlpha = (glint - 0.8) * 2;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
                }
            }
        } else if (type === 'MAGMA') {
            // Pulsing Magma Cracks
            const pulse = 0.5 + Math.sin(time * 2 + n * 10) * 0.5;
            ctx.globalAlpha = 0.6 + pulse * 0.4;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5 + pulse;
            ctx.shadowColor = '#f87171';
            ctx.shadowBlur = 5 * pulse;
            
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy + 5);
            ctx.lineTo(cx - 5, cy - 2);
            ctx.lineTo(cx + 8, cy + 3);
            ctx.lineTo(cx + 15, cy - 5);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        } else if (type === 'DESERT') {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 2;
            // Dunes / Ripples
            ctx.beginPath();
            ctx.arc(cx - 10, cy - 5, 20, 0.5, 1.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + 5, cy + 5, 20, 0.5, 1.5);
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
