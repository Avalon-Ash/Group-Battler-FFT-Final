
import { GameEngine } from "../game";
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { AFTERIMAGE } from "../../constants";
import { MovementType } from "../../types";

export class PhysicsSystem {
    private engine: PhysicsEngine;

    constructor() {
        this.engine = new PhysicsEngine();
    }

    public update(dt: number, engine: GameEngine) {
        // Physics integration only. 
        // Visual side-effects (dust, sparks) are now handled by AgentVFXSystem.
        for (const a of engine.agents) {
            const isGroundValid = engine.isValid(a.q, a.r);
            if (a.hp <= 0 && isGroundValid) continue; // [SSOT] Skip physical updates for dead agents on valid ground
            this.engine.update(a, dt, engine);
            
            // [ARCH] Agent.trailHistory 的唯一寫入者（殘影與飛行緞帶的軌跡來源，AgentOwnership）。
            // 記錄「繪製位置」px + physics，所以衝刺（physics 彈簧）與擊退滑行都會留下軌跡；
            // MotionEngine 不再寫（它對飛行單位用的是不含 physics 的 px，且同一 tick 會重複推入）。
            const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
            if (speedSq > AFTERIMAGE.RECORD_SPEED_SQ || (a.movementType === MovementType.FLYING && a.hp > 0)) {
                const terrainH = engine.map.getTerrainHeight(a.q, a.r);
                a.trailHistory.push({ 
                    x: a.px + a.physics.x, 
                    y: a.py + a.physics.y, 
                    z: a.physics.z,
                    h: terrainH
                });
                if (a.trailHistory.length > AFTERIMAGE.HISTORY_LENGTH) a.trailHistory.shift();
            } else if (a.trailHistory.length > 0) {
                a.trailHistory.shift();
            }
        }
    }
}
