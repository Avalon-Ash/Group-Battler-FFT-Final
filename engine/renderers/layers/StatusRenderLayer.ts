
import { Agent } from "../../game";
import { StatusOrchestrator } from "../status/StatusOrchestrator";

// DEPRECATED: Use StatusOrchestrator directly in GameRenderer
// This file effectively acts as a redirect to the new system.
export class StatusRenderLayer {
    private orchestrator: StatusOrchestrator;

    constructor() {
        this.orchestrator = new StatusOrchestrator();
    }

    public draw(ctx: CanvasRenderingContext2D, agents: Agent[], globalTime: number) {
        this.orchestrator.draw(ctx, agents, globalTime);
    }
}
