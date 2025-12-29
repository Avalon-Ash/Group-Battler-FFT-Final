
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

        // 2. Dynamic Units (Already Standing There)
        const occupant = engine.agentMap.get(h);
        if (occupant && occupant.id !== ignoreId && occupant.hp > 0 && !occupant.banished) return true;

        // 3. Movement Intent (Strict Reservation)
        // Check if any other agent is moving TO this cell
        for (const a of engine.agents) {
            if (a.id === ignoreId || a.hp <= 0 || !a.isMoving || a.path.length === 0) continue;
            const dest = a.path[0];
            if (dest.q === q && dest.r === r) return true;
        }

        return false;
    }

    public static hasObstacle(system: MapSystem, q: number, r: number): boolean {
        return system.obstaclesHash.has(HexUtils.hash(q, r));
    }
}
