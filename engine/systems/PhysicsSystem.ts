
import { Agent, GameEngine } from "../game";
import { PhysicsEngine } from "../physics/PhysicsEngine";

export class PhysicsSystem {
    private engine: PhysicsEngine;

    constructor() {
        this.engine = new PhysicsEngine();
    }

    public update(dt: number, engine: GameEngine) {
        for (const a of engine.agents) {
            this.engine.update(a, dt, engine);
        }
    }
}
