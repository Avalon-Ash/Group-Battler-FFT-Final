
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { MovementType } from "../../../types";
import { BLOCK_HEIGHT } from "../../../constants";

export class StackingResolver {
    // Optimization: Reuse Stacking Map to reduce GC
    private _stackingMap = new Map<number, Agent[]>();

    public resolve(engine: GameEngine) {
        this._stackingMap.clear();
        const map = this._stackingMap;
        
        // 1. Group agents by Hex Hash
        engine.agents.forEach(a => {
            if (a.hp <= 0 || a.banished) return;
            const h = HexUtils.hash(a.q, a.r);
            if (!map.has(h)) map.set(h, []);
            map.get(h)!.push(a);
        });

        // 2. Resolve Overlaps
        map.forEach((list, hash) => {
            if (list.length > 1) {
                this.displaceUnits(list, hash, engine);
            }
        });
    }

    private displaceUnits(list: Agent[], hash: number, engine: GameEngine) {
        const coords = HexUtils.unhash(hash);
        const currentHeight = engine.map.getTerrainHeight(coords.q, coords.r);
        
        // Prioritize keeping the stationary unit, or the first one found
        const stationary = list.filter(a => !a.isMoving);
        const keep = stationary.length > 0 ? stationary[0] : list[0];
        const toDisplace = list.filter(a => a !== keep);
        
        toDisplace.forEach(agent => {
            const neighbors = HexUtils.neighbors(coords);
            // Shuffle neighbors to avoid directional bias (everyone pushed East)
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }
            
            // Find valid push target
            let target = neighbors.find(n => {
                // A. Basic Validity
                if (!engine.map.isValid(n.q, n.r)) return false;
                
                // B. Obstacle Check
                if (engine.isBlocked(n.q, n.r, agent.id, agent.movementType)) return false;
                
                // C. Height Check (Safety)
                // Don't push ground units off cliffs or into walls unintentionally
                if (agent.movementType === MovementType.GROUND) {
                    const nHeight = engine.map.getTerrainHeight(n.q, n.r);
                    const deltaH = Math.abs(nHeight - currentHeight);
                    const maxSafeStep = Math.max(1, agent.jump) * BLOCK_HEIGHT;
                    if (deltaH > maxSafeStep) return false;
                }
                
                // D. Occupancy Check (Don't push into another stack)
                // Allow pushing into empty tile only
                if (engine.getAgentAt(n.q, n.r)) return false;
                
                return true;
            });
            
            if (target) {
                engine.updateAgentPosition(agent, target.q, target.r);
                // Cancel current move to allow physics drift to slide unit visually
                if (agent.isMoving) {
                    agent.isMoving = false;
                    agent.path = [];
                }
            }
        });
    }
}
