
import { ISO_SCALE_Y } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";

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
        const topOffset = -height; // Y axis goes down, so height moves Up (Negative Y)
        
        // Vertices relative to (0,0) center
        const vertices = HexGeometry.getVertices(size, true); 

        ctx.save();
        ctx.translate(x, y);

        // --- 1. DRAW SIDE WALLS (The Pedestal) ---
        // Only draw if there is height. 
        // We draw the "Front" faces (Indices 0, 1, 5 correspond to Bottom-Right, Bottom, Bottom-Left usually)
        // But HexGeometry starts at 30+45 deg? Let's assume standard indices for front-facing.
        // In standard flat-top/pointy-top conversion, visible faces are usually 0, 1, 2 or 5, 0, 1.
        
        if (height > 0) {
            // Draw a continuous strip for the visible sides
            // Vertices order: 0 (BR), 1 (B), 2 (BL), 3 (TL), 4 (T), 5 (TR)
            
            // Side Wall Gradient (Fake Lighting: Left is Lit, Right is Dark)
            
            // Left Face (Index 1-2)
            this.drawSideFace(ctx, vertices, 1, 2, topOffset, theme.sideLight);
            
            // Right Face (Index 0-1)
            this.drawSideFace(ctx, vertices, 0, 1, topOffset, theme.sideDark);
            
            // Far Right Face (Index 5-0) - Optional depending on angle, usually visible
            this.drawSideFace(ctx, vertices, 5, 0, topOffset, theme.sideDark);
        }

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
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- 4. SURFACE DETAILS ---
        // Special renderers for Liquid/Void
        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        } else if (type === 'VOID') {
            // Circuit pattern
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
            ctx.moveTo(0, -10); ctx.lineTo(0, 10);
            ctx.stroke();
        }

        ctx.restore();
    },

    drawSideFace(ctx: CanvasRenderingContext2D, verts: {x:number, y:number}[], i1: number, i2: number, topOffset: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        // Bottom Edge
        ctx.moveTo(verts[i1].x, verts[i1].y);
        ctx.lineTo(verts[i2].x, verts[i2].y);
        // Up to Top Edge
        ctx.lineTo(verts[i2].x, verts[i2].y + topOffset);
        ctx.lineTo(verts[i1].x, verts[i1].y + topOffset);
        ctx.closePath();
        ctx.fill();
        
        // Seam fix line
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
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
