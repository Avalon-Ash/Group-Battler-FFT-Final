
import { Agent, GameEngine } from "../game";
import { PhysicsEngine } from "../physics/PhysicsEngine";

export class PhysicsSystem {
    private engine: PhysicsEngine;

    constructor() {
        this.engine = new PhysicsEngine();
    }

    public update(dt: number, engine: GameEngine) {
        // Physics integration only. 
        // Visual side-effects (dust, sparks) are now handled by AgentVFXSystem.
        for (const a of engine.agents) {
            this.engine.update(a, dt, engine);
            
            // Handle Trail History Recording (here or in PhysicsEngine, but logic context is better)
            // Determine if trail should be recorded
            const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
            if (speedSq > 10000 || (a.movementType === 1 && a.hp > 0)) { // 1 = FLYING
                const terrainH = engine.map.getTerrainHeight(a.q, a.r);
                a.trailHistory.push({ 
                    x: a.px + a.physics.x, 
                    y: a.py + a.physics.y, 
                    z: a.physics.z,
                    h: terrainH
                });
                if (a.trailHistory.length > 15) a.trailHistory.shift(); // Keep consistent with MotionEngine constant
            } else if (a.trailHistory.length > 0) {
                a.trailHistory.shift();
            }
        }
    }
}
