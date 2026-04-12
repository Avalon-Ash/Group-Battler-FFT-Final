
import { Particle } from "./state";
import { PHYSICS } from "../../../constants";

export interface SpatialInfo {
    height: number;
    isValid: boolean;
}

export class VFXPhysics {
    public static update(p: Particle, dt: number, getSpatialInfo?: (x: number, y: number) => SpatialInfo) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;

        const isPhysical = ['DEBRIS', 'SHARD', 'SPRITE', 'ROCK', 'CHIP', 'RUBBLE', 'GIANT_HEX'].includes(p.type);
        const spatial = getSpatialInfo ? getSpatialInfo(p.x, p.y) : { height: 0, isValid: true };
        const currentGroundH = spatial.height;
        const isValid = spatial.isValid;

        if (isPhysical) {
            // SSOT: Use defined game gravity if particle doesn't override
            const g = p.gravity !== undefined ? p.gravity : PHYSICS.GRAVITY;
            p.vz -= g * dt;
            p.z += p.vz * dt;

            if (isValid) {
                const floorLevel = currentGroundH + 2;

                if (p.z < floorLevel) {
                    p.z = floorLevel;

                    if (Math.abs(p.vz) > 120) {
                        p.vz = -p.vz * 0.45;
                        p.vx *= 0.7;
                        p.vy *= 0.7;
                        p.vRotation *= 0.6;
                    } else {
                        p.vz = 0;
                        p.vx *= 0.2;
                        p.vy *= 0.2;
                        p.vRotation = 0;
                    }
                }
            } else {
                // Void Penetration: No collision, fall until out of bounds
                if (p.z < -2000) {
                    p.life = 0;
                }
            }
        } else {
            p.z += p.vz * dt;
            
            if (p.drag !== undefined) {
                const f = 1 - p.drag;
                p.vx *= f; p.vy *= f; p.vz *= f;
            } else {
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.vz *= 0.94;
            }

            if (isValid && p.z < currentGroundH) {
                // [FIX] Prevent falling VFX (like negative vz SPARKS) from penetrating the grid
                if (p.vz < 0) {
                    p.z = currentGroundH;
                    p.vz = 0;
                } else {
                    p.z += (currentGroundH - p.z) * 0.1;
                }
            } else if (!isValid && p.z < -2000) {
                p.life = 0;
            }

            // [FIX] For ground particles (like SHOCKWAVE, MAGIC_CIRCLE), they should stick to the ground
            // even if the ground is collapsing.
            if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'MAGIC_CIRCLE' || p.type === 'CRACKS' || p.type === 'GRID_FIELD' || p.type === 'HEX_GLOW') {
                p.z = currentGroundH;
            }
        }

        p.lastGroundHeight = currentGroundH;
    }
}
