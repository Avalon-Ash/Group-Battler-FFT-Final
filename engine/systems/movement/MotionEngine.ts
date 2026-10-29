
import { Agent } from "../../core/Agent";
import { HexUtils } from "../../utils";
import { SpatialProvider } from "../../../types";
import { random } from "../../math/rng";
import { stopMovement } from "./MotionCommands";
import { EFFECT_LIMITS, PHYSICS } from "../../../constants";

const STACKING_RESOLUTION_FORCE = 8;

export class MotionEngine {

    /**
     * @param hazardSpeedMult 外部減速倍率（敵方危害 HazardSystem.getHazardSpeedMult 與 SLOW 狀態取較慢者，由 MovementSystem 每 tick 算出）；
     *        有效速度 = min(AI 要求的倍率, 外部減速倍率)。
     */
    public static updateMovement(a: Agent, dt: number, spatial: SpatialProvider, hazardSpeedMult: number = 1) {
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

        const hasteMult = (a.effects?.HASTE?.remaining ?? 0) > 0
            ? 1 + Math.min(a.effects.HASTE.value, EFFECT_LIMITS.HASTE_MAX_PCT) / 100
            : 1;
        const moveDelta = a.moveSpeed * Math.min(a.moveSpeedMult, hazardSpeedMult) * hasteMult * dt;
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
        
        if (Math.abs(n.x - a.px) > PHYSICS.FACING_THRESHOLD) {
            a.facing = n.x > a.px ? 1 : -1;
        }
        
        const t = Math.max(0, Math.min(1.0, a.moveProgress));
        a.px = c.x + (n.x - c.x) * t;
        a.py = c.y + (n.y - c.y) * t;
    }

    private static cancelMove(a: Agent) {
        stopMovement(a);
        a.trajectory = [];
        a.moveProgress = 0;
    }

    private static finalizeMove(a: Agent) {
        a.isMoving = false;
        a.moveProgress = 0;
        
        a.physics.vx *= PHYSICS.MOVE_FINISH_VELOCITY_FACTOR;
        a.physics.vy *= PHYSICS.MOVE_FINISH_VELOCITY_FACTOR;
        
        a.physics.vx += (random() - 0.5) * STACKING_RESOLUTION_FORCE;
        a.physics.vy += (random() - 0.5) * STACKING_RESOLUTION_FORCE;
    }
}
