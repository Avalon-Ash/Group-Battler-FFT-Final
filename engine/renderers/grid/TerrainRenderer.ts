
import { ISO_SCALE_Y } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";

const SLAB_THICKNESS = 12; // Visual thickness of the base floor plate

export const TerrainRenderer = {
    
    /**
     * Renders a solid 2.5D hexagonal prism (The Block).
     * @param x Screen X of the base center
     * @param y Screen Y of the base center (Ground Level)
     * @param size Hex radius
     * @param height Vertical extrusion amount (Positive value)
     */
    drawBlock(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number
    ) {
        // Pre-calc visual coordinates
        // Top Surface is at y - height
        // Bottom Surface is at y + SLAB_THICKNESS
        const topOffset = -height;
        const bottomOffset = SLAB_THICKNESS;
        
        // Vertices relative to (0,0) center.
        // Indices for Flat Top (0 deg start):
        // 0: Right (0)
        // 1: Bottom-Right (60)
        // 2: Bottom-Left (120)
        // 3: Left (180)
        // 4: Top-Left (240)
        // 5: Top-Right (300)
        const vertices = HexGeometry.getVertices(size, true); 

        ctx.save();
        ctx.translate(x, y);

        // --- 1. DRAW SIDE WALLS (The Pedestal) ---
        // For Flat Top Hex viewed from South, we see 3 Faces:
        // Face A: Vertex 3 -> Vertex 2 (Front-Left) - Lit
        // Face B: Vertex 2 -> Vertex 1 (Front-Center) - Medium
        // Face C: Vertex 1 -> Vertex 0 (Front-Right) - Dark
        
        // Always draw walls if there is height OR slab thickness (which is always true now)
        // Left-Front (Lit)
        this.drawSideFace(ctx, vertices, 3, 2, topOffset, bottomOffset, theme.sideLight);
        
        // Front-Center (Medium/Dark)
        this.drawSideFace(ctx, vertices, 2, 1, topOffset, bottomOffset, theme.sideDark);
        
        // Right-Front (Shadow)
        this.drawSideFace(ctx, vertices, 1, 0, topOffset, bottomOffset, theme.sideDark);

        // --- 2. DRAW TOP FACE (The Platform) ---
        ctx.translate(0, topOffset);
        
        // Gradient Top
        const topGrad = ctx.createLinearGradient(-size, -size, size, size);
        topGrad.addColorStop(0, theme.rim); // Light source top-left
        topGrad.addColorStop(0.5, theme.top);
        topGrad.addColorStop(1, theme.sideDark); // Shadow bottom-right

        ctx.fillStyle = topGrad;
        
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // --- 3. EDGE HIGHLIGHT (The Bevel) ---
        // Highlight the top-front edges for distinctness
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.5;
        
        // Draw just the front rim: 3 -> 2 -> 1 -> 0
        ctx.beginPath();
        ctx.moveTo(vertices[3].x, vertices[3].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[0].x, vertices[0].y);
        ctx.stroke();

        // --- 4. SURFACE DETAILS ---
        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        } else if (type === 'VOID') {
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
            ctx.moveTo(0, -10); ctx.lineTo(0, 10);
            ctx.stroke();
        }

        ctx.restore();
    },

    drawSideFace(ctx: CanvasRenderingContext2D, verts: {x:number, y:number}[], i1: number, i2: number, topOffset: number, bottomOffset: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        // Start at Bottom-Left of the face (at Slab Base)
        ctx.moveTo(verts[i1].x, verts[i1].y + bottomOffset);
        // Draw to Bottom-Right of the face (at Slab Base)
        ctx.lineTo(verts[i2].x, verts[i2].y + bottomOffset);
        // Draw Up to Top-Right (at Platform Top)
        ctx.lineTo(verts[i2].x, verts[i2].y + topOffset);
        // Draw to Top-Left (at Platform Top)
        ctx.lineTo(verts[i1].x, verts[i1].y + topOffset);
        ctx.closePath();
        ctx.fill();
        
        // Vertical Seam line
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(verts[i1].x, verts[i1].y + bottomOffset);
        ctx.lineTo(verts[i1].x, verts[i1].y + topOffset);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        baseX: number, baseY: number, // Base coords
        height: number,
        type: string, 
        detailColor: string,
        q: number, r: number
    ) {
        // Details sit on top face
        const visualY = baseY - height;
        
        if (type === 'FOREST') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};
