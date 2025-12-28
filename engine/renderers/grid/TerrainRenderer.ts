
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";

// --- MATERIAL CACHE ---
const MATERIAL_CACHE: Map<string, { side: CanvasGradient, top: CanvasPattern | CanvasGradient }> = new Map();

function createNoisePattern(color: string, opacity: number): CanvasPattern | null {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = color;
    ctx.fillRect(0,0,size,size);
    
    // Add noise
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1 * opacity})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1 * opacity})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
    
    return ctx.createPattern(canvas, 'repeat');
}

// Helper to get or create cached gradient
function getMaterials(ctx: CanvasRenderingContext2D, theme: any, height: number, themeId: string) {
    const hKey = Math.round(height);
    const key = `${themeId}_${hKey}`;
    
    if (MATERIAL_CACHE.has(key)) return MATERIAL_CACHE.get(key)!;

    // 1. Side Gradient (Vertical)
    const topY = -height;
    const bottomY = 12; 
    
    const sideGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    sideGrad.addColorStop(0, theme.sideDark);
    sideGrad.addColorStop(0.5, theme.sideLight);
    sideGrad.addColorStop(1, '#020617'); 

    // 2. Top Material
    const r = HEX_SIZE;
    const topCanvas = document.createElement('canvas');
    topCanvas.width = r * 2;
    topCanvas.height = r * 2 * ISO_SCALE_Y;
    const tCtx = topCanvas.getContext('2d')!;
    
    // Base Gradient
    const topGrad = tCtx.createLinearGradient(0, 0, r*2, r*2*ISO_SCALE_Y);
    topGrad.addColorStop(0, theme.rim); 
    topGrad.addColorStop(0.3, theme.top);
    topGrad.addColorStop(1, theme.sideDark);
    
    tCtx.fillStyle = topGrad;
    tCtx.fillRect(0, 0, topCanvas.width, topCanvas.height);
    
    // Noise Overlay
    tCtx.globalCompositeOperation = 'overlay';
    const noise = createNoisePattern('#808080', 0.5);
    if (noise) {
        tCtx.fillStyle = noise;
        tCtx.fillRect(0,0, topCanvas.width, topCanvas.height);
    }

    const topPattern = ctx.createPattern(topCanvas, 'no-repeat');

    const mats = { side: sideGrad, top: topPattern || topGrad };
    MATERIAL_CACHE.set(key, mats);
    return mats;
}

export const TerrainRenderer = {
    
    drawBlockGeometry(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number
    ) {
        const BASE_THICKNESS = 12; 
        const faceY = -height; // Local Top Face Y

        ctx.save();
        ctx.translate(x, y); // Move to Base Center

        const mats = getMaterials(ctx, theme, height, type);
        
        // --- 1. GEOMETRY SOURCE OF TRUTH ---
        // Get strict vertices from HexGeometry (No custom math here)
        const verts = HexGeometry.getVertices(size);

        // --- 2. DRAW SIDE FACES (With Overlap) ---
        const visibleIndices = [5, 0, 1]; // Front faces
        const overlap = 0.6; // Pixel overlap to hide seams between tiles

        ctx.fillStyle = mats.side;
        ctx.strokeStyle = theme.sideDark; 
        ctx.lineWidth = 0.5; 

        ctx.beginPath();
        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const v1 = verts[i];
            const v2 = verts[j];
            
            // Side Geometry
            // Top edge matches top face exactly (y + faceY)
            // Bottom edge extends down + overlap
            // Sides extend out slightly if needed, but overlap Y is usually enough
            
            ctx.moveTo(v1.x, faceY + v1.y);           // Top Left
            ctx.lineTo(v2.x, faceY + v2.y);           // Top Right
            ctx.lineTo(v2.x, v2.y + BASE_THICKNESS + overlap); // Bottom Right (Extended)
            ctx.lineTo(v1.x, v1.y + BASE_THICKNESS + overlap); // Bottom Left (Extended)
            ctx.lineTo(v1.x, faceY + v1.y);           // Close
        }
        ctx.fill();
        ctx.stroke();

        // --- 3. DRAW TOP FACE (Strict Alignment) ---
        // Use the Pattern, but we must translate the pattern to match the face
        ctx.save();
        
        // Pattern logic: Align pattern to top-left of the bounding box of the top face
        // Hex bounding box is approx (-size, -size*iso) to (size, size*iso)
        // Pattern size is 2*size wide.
        ctx.translate(-size, faceY - size * ISO_SCALE_Y); 
        ctx.fillStyle = mats.top;
        
        // Path relative to pattern origin
        // Vertex 0 in pattern space: (size + v.x, size*iso + v.y)
        ctx.beginPath();
        const startX = size;
        const startY = size * ISO_SCALE_Y;
        
        ctx.moveTo(startX + verts[0].x, startY + verts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(startX + verts[i].x, startY + verts[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // --- 4. BEVEL HIGHLIGHT (Visual Pop) ---
        // Draws *inside* the strict geometry
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        const hlIndices = [2, 3, 4]; // Top-Left edges
        for (const i of hlIndices) {
            const j = (i + 1) % 6;
            const v1 = verts[i];
            const v2 = verts[j];
            ctx.moveTo(v1.x, faceY + v1.y);
            ctx.lineTo(v2.x, faceY + v2.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // --- 5. TIER LINES ---
        if (height > BLOCK_HEIGHT) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const i of visibleIndices) {
                const j = (i + 1) % 6;
                const v1 = verts[i];
                const v2 = verts[j];
                
                // Draw lines at step intervals
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    const localY = -hStep;
                    // Note: Base vertices Y includes ISO scale already
                    ctx.moveTo(v1.x, localY + v1.y);
                    ctx.lineTo(v2.x, localY + v2.y);
                }
            }
            ctx.stroke();
        }

        // --- 6. SURFACE ASSETS ---
        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, faceY, '#ef4444', globalTime, 1.0);
            const crackInt = 0.5 + Math.sin(globalTime) * 0.2;
            SurfacePainter.drawCracks(ctx, 0, faceY, '#fca5a5', crackInt);
        } else if (type === 'VOID') {
            SurfacePainter.drawFog(ctx, 0, faceY, theme.fogColor || '#6366f1', globalTime);
        } else if (type === 'ICE') {
            const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
            ctx.save(); 
            // Clip to top face
            ctx.beginPath();
            ctx.moveTo(verts[0].x, faceY + verts[0].y);
            for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, faceY + verts[i].y);
            ctx.closePath();
            ctx.clip(); 
            
            const specGrad = ctx.createLinearGradient(-size, faceY - size, size, faceY + size);
            specGrad.addColorStop(0, 'transparent');
            specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)'); 
            specGrad.addColorStop(1, 'transparent');
            ctx.translate(bandPos * 0.5, 0); 
            ctx.fillStyle = specGrad;
            ctx.fill();
            ctx.restore();
        } 

        ctx.restore();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
        SurfacePainter.drawDetailTexture(ctx, cx, cy, type, detailColor, seed);
    }
};
