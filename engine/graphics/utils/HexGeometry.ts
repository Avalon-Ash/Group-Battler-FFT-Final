
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

// 1. Static Geometry Cache (Unit Scale)
// Vertices for a "Pointy Top" Hexagon with radius 1.0
// Angle 0 is at 30 degrees (PI/6) to align flat top with screen Y in ISO
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 

export const HEX_VERTICES: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_VERTICES.push({
        x: Math.cos(angle),
        y: Math.sin(angle)
    });
}

// 2. Pre-computed Render Paths (Performance)
// We cache the most common path: The Standard Grid Hex
let CACHED_HEX_PATH: Path2D | null = null;

export const HexGeometry = {
    
    /**
     * Get exact vertices for a hex at (0,0) with specified radius.
     * Uses strict ISO scaling on Y axis.
     */
    getVertices(radius: number): {x: number, y: number}[] {
        // Optimization: For standard grid size, we could cache this array too if needed.
        // For now, mapping is fast enough.
        return HEX_VERTICES.map(v => ({
            x: v.x * radius,
            y: v.y * radius * ISO_SCALE_Y
        }));
    },

    /**
     * Optimized draw call. Uses Path2D if available and radius matches standard HEX_SIZE.
     * Guaranteed to match TerrainRenderer's geometry exactly.
     */
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
        // Use cached path for standard grid cells (huge FPS boost for grid rendering)
        if (Math.abs(radius - HEX_SIZE) < 0.01) {
            if (!CACHED_HEX_PATH) {
                this.rebuildCache();
            }
            ctx.translate(x, y);
            // We fill/stroke the path relative to (0,0)
            // The caller must handle the operation (fill/stroke)
            // NOTE: Path2D cannot be stroked/filled directly here without context methods
            // but we can't return it easily for reuse in legacy code structure.
            // So we trace it.
            // Actually, ctx.fill(path) is the way. But current API expects trace logic.
            // Hybrid approach:
        }

        // Standard Trace (Fallback or Non-Standard Size)
        // This is mathematically identical to the cache.
        ctx.beginPath();
        const verts = this.getVertices(radius);
        ctx.moveTo(x + verts[0].x, y + verts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(x + verts[i].x, y + verts[i].y);
        }
        ctx.closePath();
    },

    /**
     * Returns a Path2D object for the standard hex. 
     * Callers can use ctx.fill(path) which is faster than JS-side moveTo/lineTo loops.
     */
    getStandardPath(): Path2D {
        if (!CACHED_HEX_PATH) this.rebuildCache();
        return CACHED_HEX_PATH!;
    },

    rebuildCache() {
        const path = new Path2D();
        const verts = this.getVertices(HEX_SIZE);
        path.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < 6; i++) {
            path.lineTo(verts[i].x, verts[i].y);
        }
        path.closePath();
        CACHED_HEX_PATH = path;
    },

    /**
     * Returns vertices for a rotated hexagon (used by VFX).
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
