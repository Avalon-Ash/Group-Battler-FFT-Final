
import { Agent } from "../../core/Agent";
import { HexUtils } from "../../utils";
import { SpatialProvider } from "../../../types";
import { random } from "../../math/rng";

const STACKING_RESOLUTION_FORCE = 8;
const FACING_THRESHOLD = 1.5; 

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, spatial: SpatialProvider) {
        if (a.path.length === 0) {
            a.isMoving = false;
            a.moveProgress = 0;
            return;
        }

        // 路徑上的下一格已消失（縮圈塌陷）：本系統是 path／isMoving 的推進者，就在這裡停下，
        // 不能等 AI 下一次重新尋路（施法等狀態下 AI 不會重算，單位會一直朝已不存在的格子走，
        // 腳下高度也會被拉向正在墜落的地塊）。
        if (!spatial.isValid(a.path[0].q, a.path[0].r)) {
            this.cancelMove(a);
            return;
        }

        const moveDelta = a.moveSpeed * a.moveSpeedMult * dt;
        a.moveProgress += moveDelta;

        while (a.moveProgress >= 1.0 && a.path.length > 0) {
            const nextHex = a.path[0];
            spatial.updateAgentPosition(a, nextHex.q, nextHex.r);
            a.path.shift();
            a.moveProgress -= 1.0;
            if (a.path.length > 0 && !spatial.isValid(a.path[0].q, a.path[0].r)) {
                this.cancelMove(a);
                return;
            }
        }

        if (a.path.length === 0) {
            const c = HexUtils.toPx(a.q, a.r, spatial.getMapConfig());
            a.px = c.x;
            a.py = c.y;
            this.finalizeMove(a);
            return;
        }

        const startH = { q: a.q, r: a.r };
        const nextHex = a.path[0];
        
        const c = HexUtils.toPx(startH.q, startH.r, spatial.getMapConfig());
        const n = HexUtils.toPx(nextHex.q, nextHex.r, spatial.getMapConfig());
        
        if (Math.abs(n.x - a.px) > FACING_THRESHOLD) {
            a.facing = n.x > a.px ? 1 : -1;
        }
        
        const t = Math.max(0, Math.min(1.0, a.moveProgress));
        a.px = c.x + (n.x - c.x) * t;
        a.py = c.y + (n.y - c.y) * t;
    }

    private static cancelMove(a: Agent) {
        a.isMoving = false;
        a.path = [];
        a.trajectory = [];
        a.moveProgress = 0;
    }

    private static finalizeMove(a: Agent) {
        a.isMoving = false;
        a.moveSpeedMult = 1.0; 
        a.moveProgress = 0;
        
        a.physics.vx *= 0.1;
        a.physics.vy *= 0.1;
        
        a.physics.vx += (random() - 0.5) * STACKING_RESOLUTION_FORCE;
        a.physics.vy += (random() - 0.5) * STACKING_RESOLUTION_FORCE;
    }
}
