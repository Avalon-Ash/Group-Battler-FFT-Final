
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";
import { OBSTACLE_DB } from "../../../data/obstacles";
import { MapSystem } from "../map";

export class MapSpatial {

    /**
     * Checks if a tile acts as a blocker for a specific movement type.
     */
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
            if (obsId) {
                const def = OBSTACLE_DB[obsId];
                if (def) {
                    if (movementType === MovementType.FLYING) {
                        if (def.blocksFlying) return true;
                    } else {
                        if (def.blocksMovement) return true;
                    }
                } else return true; // Unknown obstacle blocks all
            } else return true;
        }

        // 2. Dynamic Units (Agents)
        const occupant = engine.agentMap.get(h);
        if (occupant) {
            if (occupant.id === ignoreId) return false; // Can't block self
            if (occupant.hp <= 0 || occupant.banished) return false; // Dead/Banished don't block
            return true;
        }

        // 3. Reserved Tiles (Units currently moving TO this tile)
        // This prevents two units from walking into the same square simultaneously
        return engine.agents.some(a => {
            if (a.id === ignoreId) return false;
            if (!a.isMoving || a.path.length === 0) return false;
            const dest = a.path[0];
            return dest.q === q && dest.r === r;
        });
    }

    public static hasObstacle(system: MapSystem, q: number, r: number): boolean {
        return system.obstaclesHash.has(HexUtils.hash(q, r));
    }
}
