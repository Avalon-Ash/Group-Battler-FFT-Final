
import { Agent } from "../../game";

// Helper to calculate animation progress (0.0 to 1.0)
// 0.0 = Start of cast
// 1.0 = End of cast (Impact)
export function getCastProgress(agent: Agent): number {
    if (agent.castingSkillIdx === -1) return 0;
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return 0;
    const raw = agent.castTimer / skill.cast;
    return Math.max(0, Math.min(1, 1 - raw)); 
}
