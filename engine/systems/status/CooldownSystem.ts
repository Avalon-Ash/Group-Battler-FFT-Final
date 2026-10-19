
import { Agent } from "../../game";

export class CooldownSystem {
    public update(agent: Agent, dt: number) {
        // Skill Cooldowns
        for (let i = 0; i < agent.curCDs.length; i++) {
            if (agent.curCDs[i] > 0) {
                agent.curCDs[i] -= dt;
                // Safety Clamp: Prevent negative small floats or NaN
                if (agent.curCDs[i] < 0 || isNaN(agent.curCDs[i])) {
                    agent.curCDs[i] = 0;
                }
            }
        }

        // Spawn Animation Timer
        if (agent.spawnTimer > 0) {
            agent.spawnTimer -= dt;
            if (agent.spawnTimer < 0) agent.spawnTimer = 0;
        }

        // 逃生冷卻（BT EscapeWarning 設定，TargetingSystem 讀 <= 0）；P10 自 game.ts 移入，語意不變（不夾 0）
        if (agent.escapeCooldown > 0) agent.escapeCooldown -= dt;

        // Interrupt Cooldown
        if (agent._interruptCooldown > 0) {
            agent._interruptCooldown -= dt;
            if (agent._interruptCooldown < 0) agent._interruptCooldown = 0;
        }

        // [FIX] Cast Completion Cooldown
        if (agent._castCompleteCooldown > 0) {
            agent._castCompleteCooldown -= dt;
            if (agent._castCompleteCooldown < 0) agent._castCompleteCooldown = 0;
        }
    }
}
