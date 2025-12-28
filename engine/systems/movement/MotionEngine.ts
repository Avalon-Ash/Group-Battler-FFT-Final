
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";

const STACKING_RESOLUTION_FORCE = 5;

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // 1. Progress Calculation
        // Use per-agent move speed WITH dynamic multiplier (Charge effect)
        a.moveProgress += a.moveSpeed * a.moveSpeedMult * dt;
        
        // 2. Coordinate Interpolation
        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        // 3. Facing Logic (Simple screen-space check)
        if (n.x > c.x) a.facing = 1;
        else if (n.x < c.x) a.facing = -1;
        
        // 4. Apply Position
        a.px = HexUtils.lerp(c.x, n.x, a.moveProgress);
        a.py = HexUtils.lerp(c.y, n.y, a.moveProgress);
        
        // 5. Completion Check
        if (a.moveProgress >= 1) {
            this.commitMove(a, nextHex.q, nextHex.r, engine);
        }
    }

    private static commitMove(a: Agent, q: number, r: number, engine: GameEngine) {
        // Update Grid Registration
        engine.updateAgentPosition(a, q, r);
        engine.log(a, 'MOVE', '移動', `(${q},${r})`, '抵達目的地');
        
        a.isMoving = false;
        a.moveSpeedMult = 1.0; // Reset speed after step completes
        
        // Physics Stabilization: 
        // When arriving, ensure physics state (z) aligns with new terrain if grounded.
        if (a.movementType === MovementType.GROUND) {
            // updateAgentPosition already handles the Z-shift logic to maintain continuity.
            // We just need to dampen residual horizontal velocity to prevent drifting off the new tile.
            a.physics.vx *= 0.1;
            a.physics.vy *= 0.1;
        }
        
        // Visual Nudge: Small impulse to separate stacked units visually if they glitch/overlap perfectly
        a.physics.vx -= a.facing * STACKING_RESOLUTION_FORCE; 
    }
}
