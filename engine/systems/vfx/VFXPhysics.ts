
import { Particle } from "./state";

const GRAVITY = 1800; 

export class VFXPhysics {

    public static update(p: Particle, dt: number, getTerrainHeight?: (x: number, y: number) => number) {
        // --- PHYSICS UPDATE ---
        const isPhysical = p.type === 'DEBRIS' || p.type === 'SHARD' || p.type === 'SPRITE' || p.type === 'ROCK' || p.type === 'CHIP' || p.type === 'RUBBLE';

        if (isPhysical) {
            // IMPORTANT: Fetch dynamic terrain height for this particle's location
            let groundH = getTerrainHeight ? getTerrainHeight(p.x, p.y) : 0;

            // Gap Protection: If we suddenly get 0 (void) but we were high up, keep the memory
            // This prevents falling through small cracks between hexes or edges
            if (p.lastGroundHeight !== undefined) {
                // If groundH drops to 0 instantly from a high value, assume gap glitch and use last known
                // But allow falling off actual cliffs (heuristic: if distance traveled is large? difficult)
                // Simple fix: If groundH is 0, prefer lastGroundH if we are roughly at that height
                if (groundH === 0 && p.z > 10) {
                    groundH = p.lastGroundHeight;
                }
            }
            p.lastGroundHeight = groundH;

            // Apply Gravity to Z (Height)
            const g = p.gravity !== undefined ? p.gravity : GRAVITY;
            p.vz -= g * dt;
            
            // Integrate
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rotation += p.vRotation * dt;

            // Floor Collision
            // We use a small epsilon (2px) to prevent z-fighting flicker
            if (p.z < groundH + 2) {
                p.z = groundH + 2;
                
                // BOUNCE LOGIC
                if (Math.abs(p.vz) > 100) {
                    p.vz = -p.vz * 0.4; // Dampened Bounce
                    p.vx *= 0.6;        // Ground Friction
                    p.vy *= 0.6;
                    p.vRotation *= 0.5;
                } else {
                    // RESTING STATE
                    p.vz = 0;
                    p.vx *= 0.1; // Rapid stop
                    p.vy *= 0.1;
                    p.vRotation = 0;
                    // Force snap to avoid micro-bouncing
                    p.z = groundH + 2; 
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
                p.vx += (Math.random() - 0.5) * 50 * dt;
                p.vy += (Math.random() - 0.5) * 50 * dt;
            }
        }
    }
}
