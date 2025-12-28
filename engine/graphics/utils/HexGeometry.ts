
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";

// The Magic Angle: Aligning pointy-top hexes with isometric projection
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 

// Pre-calculate Unit Circle Vertices (Radius = 1)
// Other systems should scale this, not recalculate sin/cos
export const HEX_VERTICES: {x: number, y: number}[] = [];

for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_VERTICES.push({
        x: Math.cos(angle),
        y: Math.sin(angle)
    });
}

export const HexGeometry = {
    /**
     * Traces a hexagon path on the canvas.
     * Guaranteed to match the grid orientation perfectly.
     * @param ctx Canvas Context
     * @param x Center X
     * @param y Center Y
     * @param radius Radius in pixels
     * @param applyIso If true, multiplies Y by ISO_SCALE_Y (for flat ground shapes)
     */
    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, applyIso: boolean = true) {
        ctx.beginPath();
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;
        
        const v0 = HEX_VERTICES[0];
        ctx.moveTo(x + v0.x * radius, y + v0.y * radius * scaleY);
        
        for (let i = 1; i < 6; i++) {
            const v = HEX_VERTICES[i];
            ctx.lineTo(x + v.x * radius, y + v.y * radius * scaleY);
        }
        ctx.closePath();
    },

    /**
     * Returns vertices for a rotated hexagon (used by VFX spinning effects).
     * Maintains the same aspect ratio logic as the grid.
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
