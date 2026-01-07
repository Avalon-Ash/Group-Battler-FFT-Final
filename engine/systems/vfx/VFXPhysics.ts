
import { Particle } from "./state";
import { PHYSICS } from "../../../constants";

const DEFAULT_GRAVITY = 2500; 

export class VFXPhysics {
    public static update(p: Particle, dt: number, getTerrainHeight?: (x: number, y: number) => number) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;

        // FIX: Add GIANT_HEX to physical types so it collides with ground (Heaven Fall logic)
        const isPhysical = ['DEBRIS', 'SHARD', 'SPRITE', 'ROCK', 'CHIP', 'RUBBLE', 'GIANT_HEX'].includes(p.type);
        const currentGroundH = getTerrainHeight ? getTerrainHeight(p.x, p.y) : 0;

        if (isPhysical) {
            const g = p.gravity !== undefined ? p.gravity : DEFAULT_GRAVITY;
            p.vz -= g * dt;
            p.z += p.vz * dt;

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
            p.z += p.vz * dt;
            
            if (p.drag !== undefined) {
                const f = 1 - p.drag;
                p.vx *= f; p.vy *= f; p.vz *= f;
            } else {
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.vz *= 0.94;
            }

            if (p.z < currentGroundH) {
                p.z += (currentGroundH - p.z) * 0.1;
            }
        }

        p.lastGroundHeight = currentGroundH;
    }
}
