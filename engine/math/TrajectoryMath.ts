
import { Point } from "../../types";

/**
 * Pure Math functions for calculating projectile positions in 3D/2.5D space.
 * Inputs are normalized progress (t: 0->1) and geometric parameters.
 */
export const TrajectoryMath = {
    
    /**
     * Standard Linear Interpolation
     */
    linear: (start: Point, end: Point, t: number): Point => {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t
        };
    },

    /**
     * Parabolic Arc
     * @param basePos Linear position at time t
     * @param arcHeightMax Height in pixels at apex (t=0.5)
     * @returns Vertical offset (y-axis) to be subtracted from visual y
     */
    arcOffset: (t: number, arcHeightMax: number): number => {
        // 4 * h * t * (1-t) creates a parabola starting at 0, peaking at h, ending at 0
        return 4 * arcHeightMax * t * (1 - t);
    },

    /**
     * Sine Wave Wobble (Lateral)
     * @param x Current x position (for spatial frequency)
     * @param y Current y position (for spatial frequency)
     * @param freq Frequency of the wave
     * @param amp Amplitude of the wave
     * @returns Lateral offset value
     */
    wobbleOffset: (x: number, y: number, freq: number, amp: number): number => {
        return Math.sin(x * freq + y * freq) * amp;
    },

    /**
     * Spiral / Corkscrew Offset
     * @param t Progress 0->1
     * @param radius Radius of the spiral
     * @param revs Number of revolutions
     * @returns Object containing x and y offsets
     */
    spiralOffset: (t: number, radius: number, revs: number): Point => {
        const angle = t * Math.PI * 2 * revs;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius // Note: In iso view, y usually needs scaling, handled by renderer
        };
    }
};
