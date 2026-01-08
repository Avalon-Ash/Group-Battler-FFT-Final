
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";

const STACKING_RESOLUTION_FORCE = 8;
const TRAIL_HISTORY_LENGTH = 15;
const FACING_THRESHOLD = 1.5; 

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, engine: GameEngine) {
        if (a.path.length === 0) {
            a.isMoving = false;
            a.moveProgress = 0;
            return;
        }

        const moveDelta = a.moveSpeed * a.moveSpeedMult * dt;
        a.moveProgress += moveDelta;

        const startH = { q: a.q, r: a.r };
        const nextHex = a.path[0];
        
        const c = HexUtils.toPx(startH.q, startH.r, engine.mapConfig);
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        if (Math.abs(n.x - a.px) > FACING_THRESHOLD) {
            a.facing = n.x > a.px ? 1 : -1;
        }
        
        const t = Math.min(1.0, a.moveProgress);
        a.px = c.x + (n.x - c.x) * t;
        a.py = c.y + (n.y - c.y) * t;
        
        if (a.movementType === MovementType.FLYING && a.hp > 0) {
            const h = engine.map.getTerrainHeight(a.q, a.r); // Approximation for current tile
            a.trailHistory.push({ x: a.px, y: a.py, z: a.physics.z, h });
            if (a.trailHistory.length > TRAIL_HISTORY_LENGTH) a.trailHistory.shift();
        }

        if (a.moveProgress >= 1.0) {
            engine.updateAgentPosition(a, nextHex.q, nextHex.r);
            a.path.shift();
            
            if (a.path.length > 0) {
                a.moveProgress -= 1.0;
                this.updateMovement(a, 0, engine);
            } else {
                this.finalizeMove(a);
            }
        }
    }

    private static finalizeMove(a: Agent) {
        a.isMoving = false;
        a.moveSpeedMult = 1.0; 
        a.moveProgress = 0;
        
        a.physics.vx *= 0.1;
        a.physics.vy *= 0.1;
        
        a.physics.vx += (Math.random() - 0.5) * STACKING_RESOLUTION_FORCE;
        a.physics.vy += (Math.random() - 0.5) * STACKING_RESOLUTION_FORCE;
    }
}
