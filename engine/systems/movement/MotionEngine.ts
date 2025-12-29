
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";

const STACKING_RESOLUTION_FORCE = 5;
const TRAIL_HISTORY_LENGTH = 15;

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // 1. Progress Calculation
        // Use per-agent move speed WITH dynamic multiplier (Charge effect)
        a.moveProgress += a.moveSpeed * a.moveSpeedMult * dt;
        
        // Clamp
        if (a.moveProgress > 1) a.moveProgress = 1;

        // 2. Coordinate Interpolation
        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        // 3. Facing Logic
        if (n.x > c.x) a.facing = 1;
        else if (n.x < c.x) a.facing = -1;
        
        // 4. Easing Function (Sine In-Out for smooth motion)
        // t goes from 0 to 1.
        // -0.5 * (Math.cos(Math.PI * t) - 1)
        const t = a.moveProgress;
        const easedT = -0.5 * (Math.cos(Math.PI * t) - 1);

        // 5. Apply Position
        a.px = HexUtils.lerp(c.x, n.x, easedT);
        a.py = HexUtils.lerp(c.y, n.y, easedT);
        
        // 6. Record Trail History (For VFX)
        // We record PHYSICAL WORLD POSITION (including Z)
        // Only if flying or explicitly requested
        if (a.movementType === MovementType.FLYING && a.hp > 0) {
            // Push current state
            a.trailHistory.push({
                x: a.px,
                y: a.py,
                z: a.physics.z
            });
            // Trim
            if (a.trailHistory.length > TRAIL_HISTORY_LENGTH) {
                a.trailHistory.shift();
            }
        } else {
            // Clear history if not flying to save memory/prevent glitches
            if (a.trailHistory.length > 0) a.trailHistory = [];
        }

        // 7. Completion Check
        if (a.moveProgress >= 1) {
            this.commitMove(a, nextHex.q, nextHex.r, engine);
        }
    }

    private static commitMove(a: Agent, q: number, r: number, engine: GameEngine) {
        // Update Grid Registration
        engine.updateAgentPosition(a, q, r);
        
        // If it's a long distance move, log it, otherwise it's just spam
        // engine.log(a, 'MOVE', '移動', `(${q},${r})`, '抵達目的地');
        
        a.isMoving = false;
        a.moveSpeedMult = 1.0; // Reset speed after step completes
        a.moveProgress = 0;
        
        // Physics Stabilization: 
        if (a.movementType === MovementType.GROUND) {
            a.physics.vx *= 0.1;
            a.physics.vy *= 0.1;
        }
        
        // Visual Nudge
        a.physics.vx -= a.facing * STACKING_RESOLUTION_FORCE; 
    }
}
