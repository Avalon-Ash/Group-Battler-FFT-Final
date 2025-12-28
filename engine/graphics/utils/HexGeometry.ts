
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

// 1. Static Geometry Cache (Unit Scale)
// Vertices for a "Pointy Top" Hexagon.
// Angle 0 is at 30 degrees (PI/6) to align flat top with screen Y in ISO
const START_ANGLE = Math.PI / 6 + Math.PI / 4; // 75 degrees base rotation to align with game iso

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
let CACHED_PATH_STD: Path2D | null = null; // Standard ISO Hex Path

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
     * This ensures ALL hexes in the game share the exact same shape.
     */
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, applyIso: boolean = true) {
        // Optimization: Use Path2D for standard grid size
        const isStandard = Math.abs(radius - HEX_SIZE) < 0.01 && applyIso;
        
        if (isStandard) {
            if (!CACHED_PATH_STD) this.rebuildCache();
            ctx.translate(x, y);
            // Note: We perform the fill/stroke outside, this just sets the path
            // But Path2D objects need to be filled/stroked directly. 
            // For compatibility with 'beginPath' workflows, we fallback to manual trace if not using Path2D API directly.
            // To keep "Painter" logic simple (which expects to call stroke()/fill()), we manually trace points.
            // Using a pre-calculated array is faster than Math.cos/sin every frame.
        }

        const verts = this.getVertices(radius, applyIso);
        ctx.beginPath();
        ctx.moveTo(x + verts[0].x, y + verts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(x + verts[i].x, y + verts[i].y);
        }
        ctx.closePath();
    },

    /**
     * Returns a Path2D object for the standard ISO hex.
     * Useful for hit testing or clipping.
     */
    getStandardPath(): Path2D {
        if (!CACHED_PATH_STD) this.rebuildCache();
        return CACHED_PATH_STD!;
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
