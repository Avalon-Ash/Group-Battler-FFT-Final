
import { Agent } from "../../game";

export class CooldownSystem {
    public update(agent: Agent, dt: number) {
        // Skill Cooldowns
        for (let i = 0; i < agent.curCDs.length; i++) {
            if (agent.curCDs[i] > 0) {
                agent.curCDs[i] = Math.max(0, agent.curCDs[i] - dt);
            }
        }

        // Spawn Animation Timer
        if (agent.spawnTimer > 0) {
            agent.spawnTimer -= dt;
        }
    }
}
