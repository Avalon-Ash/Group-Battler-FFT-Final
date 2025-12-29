
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";

const STACKING_RESOLUTION_FORCE = 8;
const TRAIL_HISTORY_LENGTH = 15;

export class MotionEngine {

    public static updateMovement(a: Agent, dt: number, engine: GameEngine) {
        if (a.path.length === 0) {
            a.isMoving = false;
            a.moveProgress = 0;
            return;
        }

        // RTS 模式：恆定速率移動，無視緩動以保證操作響應
        const moveDelta = a.moveSpeed * a.moveSpeedMult * dt;
        a.moveProgress += moveDelta;

        const startH = { q: a.q, r: a.r };
        const nextHex = a.path[0];
        
        const c = HexUtils.toPx(startH.q, startH.r, engine.mapConfig);
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        // 轉向判定（增加閾值防止抖動）
        if (Math.abs(n.x - c.x) > 2) {
            a.facing = n.x > c.x ? 1 : -1;
        }
        
        // 線性插值提供穩定的 RTS 感
        const t = Math.min(1.0, a.moveProgress);
        a.px = c.x + (n.x - c.x) * t;
        a.py = c.y + (n.y - c.y) * t;
        
        // 飛行尾跡 (ECS 視覺組件更新)
        if (a.movementType === MovementType.FLYING && a.hp > 0) {
            a.trailHistory.push({ x: a.px, y: a.py, z: a.physics.z });
            if (a.trailHistory.length > TRAIL_HISTORY_LENGTH) a.trailHistory.shift();
        }

        // 到達網格節點判定
        if (a.moveProgress >= 1.0) {
            engine.updateAgentPosition(a, nextHex.q, nextHex.r);
            a.path.shift();
            
            if (a.path.length > 0) {
                a.moveProgress -= 1.0;
                // 遞迴調用處理高速幀補償
                if (a.moveProgress > 0) this.updateMovement(a, 0, engine);
            } else {
                this.finalizeMove(a);
            }
        }
    }

    private static finalizeMove(a: Agent) {
        a.isMoving = false;
        a.moveSpeedMult = 1.0; 
        a.moveProgress = 0;
        
        // 物理碰撞緩衝：解決多個單位到達同一點的微小重疊
        a.physics.vx *= 0.1;
        a.physics.vy *= 0.1;
        
        // 增加一個微小的排斥力防止重疊
        a.physics.vx += (Math.random() - 0.5) * STACKING_RESOLUTION_FORCE;
        a.physics.vy += (Math.random() - 0.5) * STACKING_RESOLUTION_FORCE;
    }
}
