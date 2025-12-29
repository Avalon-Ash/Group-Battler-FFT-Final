
import { Point } from "../../types";
import { Vector } from "../utils";

export interface Point3D { x: number; y: number; z: number; }

/**
 * Pure Math functions for calculating projectile positions in 3D/2.5D space.
 * Inputs are normalized progress (t: 0->1) and geometric parameters.
 */
export const TrajectoryMath = {
    
    /**
     * Standard Linear Interpolation in 3D
     */
    linear: (start: Point3D, end: Point3D, t: number): Point3D => {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t
        };
    },

    /**
     * 3D Parabolic Arc
     * Moves linearly between start/end, but adds vertical height following a parabola.
     */
    parabolic: (start: Point3D, end: Point3D, t: number, arcHeight: number): Point3D => {
        const linearPos = TrajectoryMath.linear(start, end, t);
        // 4 * h * t * (1-t) creates a parabola: 0 at t=0, h at t=0.5, 0 at t=1
        const heightOffset = 4 * arcHeight * t * (1 - t);
        return {
            x: linearPos.x,
            y: linearPos.y,
            z: linearPos.z + heightOffset
        };
    },

    /**
     * Corkscrew / Spiral Trajectory
     * Spirals around the linear path between start and end.
     */
    corkscrew: (start: Point3D, end: Point3D, t: number, radius: number, revs: number): Point3D => {
        const linearPos = TrajectoryMath.linear(start, end, t);
        
        // Calculate basis vectors for the plane perpendicular to the direction
        const dir = Vector.sub(end, start);
        const len = Vector.mag(dir);
        
        if (len < 0.001) return linearPos;

        // Normalized direction
        const forward = { x: dir.x / len, y: dir.y / len };
        
        // Simple perpendicular vector on the XY plane (assuming Z is up)
        const right = { x: -forward.y, y: forward.x };
        
        // Angle for this step
        const angle = t * Math.PI * 2 * revs;
        
        // Calculate spiral offsets
        // We use sine/cosine to oscillate in the perpendicular plane
        // Visual Y is squashed by perspective, but here we calculate logical 3D offsets
        const offsetX = right.x * Math.cos(angle) * radius;
        const offsetY = right.y * Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;

        return {
            x: linearPos.x + offsetX,
            y: linearPos.y + offsetY,
            z: linearPos.z + offsetZ
        };
    },

    /**
     * Sine Wave Wobble
     * Adds lateral noise to the path
     */
    wobble: (start: Point3D, end: Point3D, t: number, amp: number, freq: number): Point3D => {
        const linearPos = TrajectoryMath.linear(start, end, t);
        const dir = Vector.sub(end, start);
        const len = Vector.mag(dir);
        if (len < 0.001) return linearPos;

        const forward = { x: dir.x / len, y: dir.y / len };
        const right = { x: -forward.y, y: forward.x };

        const offset = Math.sin(t * Math.PI * 2 * freq) * amp;

        return {
            x: linearPos.x + right.x * offset,
            y: linearPos.y + right.y * offset,
            z: linearPos.z
        };
    }
};
