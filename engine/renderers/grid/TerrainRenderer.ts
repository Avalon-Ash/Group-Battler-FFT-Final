
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
            
            const grad = ctx.createLinearGradient(0, y - topY, 0, y + BASE_THICKNESS);
            const baseColor = (i === 0) ? theme.sideDark : theme.sideLight;
            grad.addColorStop(0, baseColor);
            grad.addColorStop(1, '#020617'); 

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
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    ctx.moveTo(x1, y + c1.y - hStep);
                    ctx.lineTo(x2, y + c2.y - hStep);
                }
                ctx.stroke();
            }

            // Outline Side
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // 2. Draw Top Face (Base)
        this.traceTopFace(ctx, x, y - topY);
        
        const topGrad = ctx.createRadialGradient(x, y - topY, 0, x, y - topY, size);
        topGrad.addColorStop(0, theme.top);
        topGrad.addColorStop(1, theme.detail); 
        ctx.fillStyle = topGrad;
        ctx.fill();
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
        ctx.globalAlpha = 0.3; 
        
        const n = noise(q, r);
        const n2 = noise(r, q);

        if (type === 'VOID') {
            if (n > 0.6) {
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy - 5);
                ctx.lineTo(cx, cy + 5);
                ctx.lineTo(cx + 10, cy - 2);
                ctx.stroke();
            } else if (n < 0.3) {
                ctx.beginPath();
                ctx.arc(cx + n2 * 10, cy + n * 10, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'FOREST') {
            const tufts = Math.floor(n * 3) + 1;
            for(let i=0; i<tufts; i++) {
                const ox = (noise(q+i, r) - 0.5) * 20;
                const oy = (noise(r, q+i) - 0.5) * 10;
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy);
                ctx.lineTo(cx + ox - 3, cy + oy - 5);
                ctx.moveTo(cx + ox, cy + oy);
                ctx.lineTo(cx + ox + 3, cy + oy - 5);
                ctx.stroke();
            }
        } else if (type === 'ICE') {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#fff';
            if (n > 0.5) {
                ctx.beginPath();
                ctx.moveTo(cx - 15, cy + 5);
                ctx.lineTo(cx + 15, cy - 5);
                ctx.lineTo(cx + 18, cy - 4);
                ctx.lineTo(cx - 12, cy + 6);
                ctx.fill();
            }
        } else if (type === 'MAGMA') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 5, cy + 5 * n);
            ctx.lineTo(cx + 5, cy - 5 * n2);
            ctx.lineTo(cx + 10, cy);
            ctx.stroke();
            if (n > 0.8) {
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = 0.6;
                ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
            }
        } else if (type === 'DESERT') {
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(cx - 10, cy - 10, 30, 0.5, 2.0);
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
