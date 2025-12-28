
import { GameEngine } from "../game";
import { Team } from "../../types";

export class DirectorSystem {
    public targetId: string | null = null;
    private timer: number = 0;

    public reset() {
        this.targetId = null;
        this.timer = 0;
    }

    public update(dt: number, engine: GameEngine) {
        this.timer -= dt;
        
        // 1. Validate current target
        if (this.targetId) {
            const current = engine.agents.find(a => a.id === this.targetId);
            if (!current || current.hp <= 0) {
                this.timer = -1; // Force retarget
            }
        }

        // 2. Select new target if timer expired
        if (this.timer <= 0) {
            let candidates = [];
            let ultCasters = [];
            
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    candidates.push(a);
                    if (a.castingSkillIdx !== -1 && a.skills[a.castingSkillIdx]?.tag === 'ULT') {
                        ultCasters.push(a);
                    }
                }
            }

            if (candidates.length > 0) {
                // Priority: Ult Casters > Random Unit
                if (ultCasters.length > 0) {
                     this.targetId = ultCasters[Math.floor(Math.random() * ultCasters.length)].id;
                     this.timer = 4.0; // Focus longer on Ults
                } else {
                     this.targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
                     this.timer = 3.0;
                }
            } else {
                this.targetId = null;
            }
        }
    }
}
