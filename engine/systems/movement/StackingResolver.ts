
import { Agent, GameEngine } from "../../game";
import { HexUtils, Vector } from "../../utils";
import { MovementType } from "../../../types";
import { BLOCK_HEIGHT } from "../../../constants";

/**
 * Robust Anti-Stacking System
 * Resolves accidental overlaps (from skills/physics) by expelling units to valid neighbors.
 */
export class StackingResolver {

    public resolve(engine: GameEngine) {
        const cellMap = new Map<number, Agent[]>();
        
        // 1. Group by logical coordinates
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;
            const h = HexUtils.hash(a.q, a.r);
            if (!cellMap.has(h)) cellMap.set(h, []);
            cellMap.get(h)!.push(a);
        }

        // 2. Resolve multi-unit cells
        cellMap.forEach((occupants, hash) => {
            if (occupants.length > 1) {
                this.expelExcess(occupants, hash, engine);
            }
        });
    }

    private expelExcess(list: Agent[], hash: number, engine: GameEngine) {
        // Sort: Stationary units are "owners", moving units are "guests"
        list.sort((a, b) => (a.isMoving ? 1 : 0) - (b.isMoving ? 0 : 1));
        
        const owner = list[0];
        const currentH = engine.map.getTerrainHeight(owner.q, owner.r);

        for (let i = 1; i < list.length; i++) {
            const guest = list[i];
            const found = this.findExpulsionSpot(guest, currentH, engine);
            
            if (found) {
                // Perform Logical Displacement
                engine.updateAgentPosition(guest, found.q, found.r);
                
                // Clear active move to prevent pathing glitches
                if (guest.isMoving) {
                    guest.isMoving = false;
                    guest.path = [];
                }

                // Add small physical impulse to separate visually
                const dir = Vector.normalize(Vector.sub(
                    HexUtils.toPx(found.q, found.r, engine.mapConfig), 
                    HexUtils.toPx(owner.q, owner.r, engine.mapConfig)
                ));
                guest.physics.vx += dir.x * 200;
                guest.physics.vy += dir.y * 200;
                
                engine.log(guest, 'SYSTEM', '擠出', `從 (${owner.q},${owner.r})`, '解決重疊狀態');
            }
        }
    }

    private findExpulsionSpot(agent: Agent, sourceH: number, engine: GameEngine) {
        // Spiral-like search: Check nearest neighbors first
        const neighbors = HexUtils.neighbors(agent);
        
        // Shuffle to avoid directional bias
        for (let i = neighbors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }

        for (const n of neighbors) {
            // Check basic validity
            if (!engine.map.isValid(n.q, n.r)) continue;
            
            // Check if already blocked by static or dynamic
            if (engine.map.isBlocked(n.q, n.r, engine, agent.id)) continue;

            // Height Safety Check - Modified for "Jump Down"
            if (agent.movementType === MovementType.GROUND) {
                const nH = engine.map.getTerrainHeight(n.q, n.r);
                const deltaH = nH - sourceH;
                const jumpLimit = Math.max(1, agent.jump) * BLOCK_HEIGHT;
                
                // Block if trying to climb UP too high
                if (deltaH > jumpLimit) continue;
                
                // Allow falling down regardless of height (pushed off cliff)
            }

            return n;
        }
        return null;
    }
}
