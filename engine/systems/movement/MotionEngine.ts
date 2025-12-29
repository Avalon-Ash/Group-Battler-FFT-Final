import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";

const STACKING_RESOLUTION_FORCE = 5;
const TRAIL_HISTORY_LENGTH = 15;

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, engine: GameEngine) {
        a.moveProgress += a.moveSpeed * a.moveSpeedMult * dt;
        
        if (a.moveProgress > 1) a.moveProgress = 1;

        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        if (n.x > c.x) a.facing = 1;
        else if (n.x < c.x) a.facing = -1;
        
        const t = a.moveProgress;
        const easedT = -0.5 * (Math.cos(Math.PI * t) - 1);

        a.px = HexUtils.lerp(c.x, n.x, easedT);
        a.py = HexUtils.lerp(c.y, n.y, easedT);
        
        if (a.movementType === MovementType.FLYING && a.hp > 0) {
            a.trailHistory.push({
                x: a.px,
                y: a.py,
                z: a.physics.z
            });
            if (a.trailHistory.length > TRAIL_HISTORY_LENGTH) {
                a.trailHistory.shift();
            }
        } else {
            if (a.trailHistory.length > 0) a.trailHistory = [];
        }

        if (a.moveProgress >= 1) {
            this.commitMove(a, nextHex.q, nextHex.r, engine);
        }
    }

    private static commitMove(a: Agent, q: number, r: number, engine: GameEngine) {
        engine.updateAgentPosition(a, q, r);
        
        a.isMoving = false;
        a.moveSpeedMult = 1.0; 
        a.moveProgress = 0;
        
        if (a.movementType === MovementType.GROUND) {
            a.physics.vx *= 0.1;
            a.physics.vy *= 0.1;
        }
        
        a.physics.vx -= a.facing * STACKING_RESOLUTION_FORCE; 
    }
}