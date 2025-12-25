
import { Agent, GameEngine } from "../game";
import { MovementType } from "../../types";
import { HexUtils } from "../utils";

// Physics Constants
const PHYSICS_STIFFNESS_ALIVE = 150;
const PHYSICS_DAMPING_ALIVE = 25; 
const GRAVITY = 2000; 

export class PhysicsEngine {

    public update(a: Agent, dt: number, engine: GameEngine) {
        // PERF: Skip physics for units that are fully removed from visual play
        if (a.fullyDead) return;

        const isDead = a.hp <= 0;
        
        // If dead but not fully processed, we still apply basic gravity but skip spring forces to let them drop?
        // Actually, if they are dead, we just want them to fall if airborne, otherwise stay put.
        
        // 1. Spring Forces (Return to 0,0 relative local space)
        // Only apply stiffness if alive. Dead units go limp (no spring back).
        const stiffness = isDead ? 0 : PHYSICS_STIFFNESS_ALIVE;
        const damping = PHYSICS_DAMPING_ALIVE; // Keep damping to prevent oscillation

        const fx = -stiffness * a.physics.x;
        const fy = -stiffness * a.physics.y;
        const fRot = -stiffness * a.physics.angle * 0.1; 
        
        // 2. Acceleration (Force - Damping)
        const ax = fx - damping * a.physics.vx;
        const ay = fy - damping * a.physics.vy;
        const aRot = fRot - damping * a.physics.vAngle;
        
        // 3. Integrate Velocity
        a.physics.vx += ax * dt;
        a.physics.vy += ay * dt;
        a.physics.vAngle += aRot * dt;
        
        // 4. Vertical Dynamics (Gravity vs Flight)
        const isAirborne = a.physics.z > 0;

        if (a.movementType === MovementType.FLYING && !isDead) {
            // Flying Unit Logic
            if (a.stunTimer > 0 || a.visualStatus === 'FROZEN' || a.visualStatus === 'POLYMORPH') {
                // CRASH STATE: Apply Gravity immediately
                a.physics.vz -= GRAVITY * dt;
            } else {
                // HOVER STATE: Bob around a target altitude
                // Adjusted: Lowered from 90 to 55 to be closer to action but still visually flying
                const hoverHeight = 55; 
                const hoverFreq = 2.5; // Slightly slower bob
                // Reduced amplitude from 10 to 5 for stability
                const targetZ = hoverHeight + Math.sin(engine.battleTime * hoverFreq) * 5;
                
                // Soft spring to maintain height
                const dz = targetZ - a.physics.z;
                a.physics.vz += dz * 5 * dt;
                a.physics.vz *= 0.92; // Increased drag to stop oscillation
            }
        } else {
            // Ground Unit Logic
            if (isAirborne) {
                a.physics.vz -= GRAVITY * dt;
            }
        }

        // 5. Integrate Position
        a.physics.x += a.physics.vx * dt;
        a.physics.y += a.physics.vy * dt;
        a.physics.z += a.physics.vz * dt;
        a.physics.angle += a.physics.vAngle * dt;
        
        // 6. Ground Collision (Bounce)
        if (a.physics.z < 0) {
            a.physics.z = 0;
            // Elastic collision with ground loss
            if (Math.abs(a.physics.vz) > 100) {
                a.physics.vz = -a.physics.vz * 0.5; // Bounce back
                a.physics.vx *= 0.6; // Ground friction
                a.physics.vy *= 0.6;
                a.physics.vAngle *= 0.5;
            } else {
                a.physics.vz = 0;
            }
        }

        // 7. World Position Drift (Slide effect for knockback correction)
        if (!isDead && !a.isMoving) {
            const targetPos = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const dx = targetPos.x - a.px;
            const dy = targetPos.y - a.py;
            const distSq = dx*dx + dy*dy;
            
            // Increased snap threshold to stop jitter
            if (distSq > 0.5) {
                const driftSpeed = 12.0 * dt; // Exp decay
                a.px += dx * driftSpeed;
                a.py += dy * driftSpeed;
                if (distSq < 2) {
                    a.px = targetPos.x;
                    a.py = targetPos.y;
                }
            } else {
                a.px = targetPos.x;
                a.py = targetPos.y;
            }
        }
    }
}
