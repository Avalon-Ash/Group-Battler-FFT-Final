
import { Particle } from "./state";
import { PHYSICS, VFX_RENDER, ISO_SCALE_Y, VFX_GROUND_TYPES, PHYSICAL_PARTICLE_TYPES } from "../../../constants";
import { riseOffsetAt } from "./partAnimEase";

export interface SpatialInfo {
    height: number;
    isValid: boolean;
}

export class VFXPhysics {
    public static update(p: Particle, dt: number, getSpatialInfo?: (x: number, y: number) => SpatialInfo) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;

        const isPhysical = PHYSICAL_PARTICLE_TYPES.has(p.type);
        const spatial = getSpatialInfo ? getSpatialInfo(p.x, p.y * ISO_SCALE_Y) : { height: 0, isValid: true };
        const currentGroundH = spatial.height;
        const isValid = spatial.isValid;

        if (isPhysical) {
            // SSOT: Use defined game gravity if particle doesn't override
            const g = p.gravity !== undefined ? p.gravity : PHYSICS.GRAVITY;
            p.vz -= g * dt;
            p.z += p.vz * dt;

            if (isValid) {
                // [FIX] Account for particle size to prevent sinking. 
                // Most physical particles are centered, so we need a bias of half size.
                const sizeBias = (p.size || 10) * VFX_RENDER.PARTICLE_SIZE_BIAS; 
                const floorLevel = currentGroundH + sizeBias;

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
            // 高度路徑：z 由生命進度決定（不積分 vz），足跡 x/y 照常移動；貼地零件以當前地面為基準
            const rise = p.partAnim?.rise;
            let riseOffset = 0;
            if (rise) {
                const t = p.maxLife > 0 ? Math.max(0, Math.min(1, 1 - p.life / p.maxLife)) : 1;
                riseOffset = riseOffsetAt(rise, t);
            }
            if (rise && p.spawnZ !== undefined) p.z = p.spawnZ + riseOffset;
            else p.z += p.vz * dt;

            if (p.drag !== undefined) {
                const f = Math.pow(1 - p.drag, dt * 60);
                p.vx *= f; p.vy *= f; p.vz *= f;
            } else {
                const f = Math.pow(PHYSICS.DEFAULT_DRAG, dt * 60);
                p.vx *= f;
                p.vy *= f;
                p.vz *= f;
            }

            if (isValid && p.z < currentGroundH) {
                // [FIX] Prevent falling VFX (like negative vz SPARKS) from penetrating the grid
                // For non-physical particles, we use a stricter clamp if they are below ground
                p.z = currentGroundH;
                if (p.vz < 0) p.vz = 0;
            } else if (!isValid && p.z < -2000) {
                p.life = 0;
            }

            // [FIX] For ground particles, they MUST stick to the ground height exactly.
            // SSOT: Use centralized VFX_GROUND_TYPES
            if (VFX_GROUND_TYPES.has(p.type) || p.groundAnchored) {
                p.z = currentGroundH + riseOffset;
                p.vz = 0;
            }
        }

        p.lastGroundHeight = currentGroundH;
    }
}
