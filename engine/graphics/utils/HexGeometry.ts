
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

// 1. Static Geometry Cache (Flat Top Hexagon)
// Angles: 0, 60, 120, 180, 240, 300 degrees.
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
     * [CORE SLOT] Converts Hex(q, r) to Screen Pixel(x, y).
     * @returns The CENTER POINT of the hexagon's GROUND BASE (Z=0).
     * This is the ONLY place where q/r to x/y conversion logic should exist for rendering.
     */
    hexToPixel(q: number, r: number, offsetX: number, offsetY: number): {x: number, y: number} {
        // Flat Top Hex to Pixel formula
        // x = size * 3/2 * q
        // y = size * sqrt(3) * (r + q/2)
        const x = (1.5 * q) * HEX_SIZE;
        const y = (Math.sqrt(3) * (r + q / 2)) * HEX_SIZE;

        // Apply ISO Squash (2.5D Projection)
        return {
            x: x + offsetX,
            y: (y * ISO_SCALE_Y) + offsetY
        };
    },

    /**
     * Get exact vertices for a hex at (0,0) with specified radius.
     * Applies ISO scaling to Y axis.
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
     */
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, applyIso: boolean = true) {
        const isStandard = Math.abs(radius - HEX_SIZE) < 0.01 && applyIso;
        
        if (isStandard) {
            if (!CACHED_PATH_STD) this.rebuildCache();
            ctx.translate(x, y);
            // Caller must stroke/fill
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
