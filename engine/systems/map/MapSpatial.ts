
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";
import { OBSTACLE_DB } from "../../../data/obstacles";
import { MapSystem } from "../map";

export class MapSpatial {

    public static isBlocked(
        system: MapSystem,
        q: number, 
        r: number, 
        engine: GameEngine, 
        ignoreId: string | null = null, 
        movementType: MovementType = MovementType.GROUND
    ): boolean {
        const h = HexUtils.hash(q, r);
        
        // 1. Static Obstacles
        if (system.obstaclesHash.has(h)) {
            const obsId = system.obstacles.get(HexUtils.key({q, r}));
            const def = obsId ? OBSTACLE_DB[obsId] : null;
            if (movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) return true;
        }

        // 2. 單位動態阻擋 (地面單位會被擋住，飛行單位可以穿過但不能停在同一格)
        const occupant = engine.agentMap.get(h);
        if (occupant && occupant.id !== ignoreId && occupant.hp > 0 && !occupant.banished) {
            // [FIX] 飛行單位允許穿過其他單位空間，只有地面單位會被實體阻擋路徑
            if (movementType !== MovementType.FLYING) return true;
        }

        // 3. 移動意圖阻擋 (Strict Reservation)
        // [FIX] 飛行單位同樣忽略移動意圖造成的阻擋，除非目的地也是同一格 (這由 StackingResolver 處理)
        if (movementType !== MovementType.FLYING) {
            for (const a of engine.agents) {
                if (a.id === ignoreId || a.hp <= 0 || !a.isMoving || a.path.length === 0) continue;
                const dest = a.path[0];
                if (dest.q === q && dest.r === r) return true;
            }
        }

        return false;
    }

    public static hasObstacle(system: MapSystem, q: number, r: number): boolean {
        return system.obstaclesHash.has(HexUtils.hash(q, r));
    }
}
