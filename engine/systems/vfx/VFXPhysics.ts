
import { Particle } from "./state";

const GRAVITY = 1800; 

export class VFXPhysics {

    public static update(p: Particle, dt: number, getTerrainHeight?: (x: number, y: number) => number) {
        // --- PHYSICS UPDATE ---
        const isPhysical = p.type === 'DEBRIS' || p.type === 'SHARD' || p.type === 'SPRITE' || p.type === 'ROCK' || p.type === 'CHIP';

        if (isPhysical) {
            // IMPORTANT: Fetch dynamic terrain height for this particle's location
            let groundH = getTerrainHeight ? getTerrainHeight(p.x, p.y) : 0;

            // Apply Gravity to Z (Height)
            const g = p.gravity !== undefined ? p.gravity : GRAVITY;
            p.vz -= g * dt;
            
            // Integrate
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rotation += p.vRotation * dt;

            // Floor Collision
            if (p.z < groundH) {
                p.z = groundH;
                if (Math.abs(p.vz) > 100) {
                    p.vz = -p.vz * 0.5; // Bounce
                    p.vx *= 0.6; 
                    p.vy *= 0.6;
                    p.vRotation *= 0.5;
                } else {
                    // Resting
                    p.vz = 0;
                    p.vx *= 0.1; 
                    p.vy *= 0.1;
                    p.vRotation = 0;
                    p.z = groundH; // Snap
                }
            }
        } else {
            // Weightless / Atmospheric
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rotation += p.vRotation * dt;

            if (p.drag !== undefined) {
                const dragFactor = 1 - p.drag; 
                p.vx *= dragFactor;
                p.vy *= dragFactor;
                p.vz *= dragFactor;
            } else if (p.type === 'SPARK' || p.type === 'SMOKE') {
                p.vx *= 0.90; 
                p.vy *= 0.90;
                p.vz *= 0.90; 
            } else if (p.type === 'ATMOSPHERE' || p.type === 'GLOW') {
                // Float (Global Time passed from system if needed, but simple drift works)
                // Using internal phase hack if global time missing, or assume 0
                p.vx += (Math.random() - 0.5) * 50 * dt;
                p.vy += (Math.random() - 0.5) * 50 * dt;
            }
        }
    }
}
