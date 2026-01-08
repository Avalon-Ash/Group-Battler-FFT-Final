
import { Agent, GameEngine } from "../game";
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { MovementType } from "../../types";

export class PhysicsSystem {
    private engine: PhysicsEngine;

    constructor() {
        this.engine = new PhysicsEngine();
    }

    public update(dt: number, engine: GameEngine) {
        // Physics integration only. Visual side-effects (dust, sparks) 
        // are now handled by the AgentVFXSystem in the render loop.
        for (const a of engine.agents) {
            this.engine.update(a, dt, engine);
        }
    }
}
