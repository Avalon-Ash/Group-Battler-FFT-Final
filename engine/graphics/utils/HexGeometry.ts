
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

// 1. Static Geometry Cache (Flat Top Hexagon)
// Angles: 0, 60, 120, 180, 240, 300 degrees.
// Vertex 0: Right
// Vertex 1: Bottom-Right
// Vertex 2: Bottom-Left
// Vertex 3: Left
// Vertex 4: Top-Left
// Vertex 5: Top-Right
const START_ANGLE = 0; 

// Pre-calculate base vertices (Flat 2D, Radius 1.0)
const BASE_VERTICES: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    BASE_VERTICES.push({
        x: Math.cos(angle),
        y: Math.sin(angle)
    });
}

// 2. Performance Cache
let CACHED_PATH_STD: Path2D | null = null;

export const HexGeometry = {
    
    /**
     * Get exact vertices for a hex at (0,0) with specified radius.
     * Applies ISO scaling to Y axis.
     * @param radius - The outer radius of the hex (usually HEX_SIZE)
     * @param applyIso - Whether to squash Y for 2.5D view (default true)
     */
    getVertices(radius: number, applyIso: boolean = true): {x: number, y: number}[] {
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;
        return BASE_VERTICES.map(v => ({
            x: v.x * radius,
            y: v.y * radius * scaleY
        }));
    },

    /**
     * Draw a hex path on the context at (x,y).
     * @param x - Center Screen X
     * @param y - Center Screen Y
     * @param radius - Size
     * @param applyIso - Use ISO projection
     */
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, applyIso: boolean = true) {
        // Optimization: Use Path2D for standard grid size
        const isStandard = Math.abs(radius - HEX_SIZE) < 0.01 && applyIso;
        
        if (isStandard) {
            if (!CACHED_PATH_STD) this.rebuildCache();
            ctx.translate(x, y);
            // Path2D must be filled/stroked by caller using the path object, 
            // but to support generic context drawing we manually trace here if not using explicit path API.
            // Using the pre-calc cache is still faster.
        }

        const verts = this.getVertices(radius, applyIso);
        ctx.beginPath();
        ctx.moveTo(x + verts[0].x, y + verts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(x + verts[i].x, y + verts[i].y);
        }
        ctx.closePath();
    },

    rebuildCache() {
        const path = new Path2D();
        const verts = this.getVertices(HEX_SIZE, true);
        path.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < 6; i++) {
            path.lineTo(verts[i].x, verts[i].y);
        }
        path.closePath();
        CACHED_PATH_STD = path;
    },

    /**
     * Get vertices for a rotated hexagon (used by VFX).
     */
    traceRotatedHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number, applyIso: boolean = true) {
        ctx.beginPath();
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;

        for (let i = 0; i < 6; i++) {
            const angle = START_ANGLE + i * Math.PI / 3 + rotation;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius * scaleY;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }
};
