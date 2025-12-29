
import { GameEngine } from "../game";
import { Team } from "../../types";

export class DirectorSystem {
    public targetId: string | null = null;
    private timer: number = 0;
    private priorityTimer: number = 0; 

    public reset() {
        this.targetId = null;
        this.timer = 0;
        this.priorityTimer = 0;
    }

    public forceFocus(id: string, duration: number = 2.0) {
        this.targetId = id;
        this.priorityTimer = duration;
        this.timer = duration;
    }

    public update(dt: number, engine: GameEngine) {
        if (this.priorityTimer > 0) {
            this.priorityTimer -= dt;
        }
        
        this.timer -= dt;
        
        if (this.targetId) {
            const current = engine.agents.find(a => a.id === this.targetId);
            if (!current || current.hp <= 0) {
                this.timer = -1; 
                this.priorityTimer = 0;
            }
        }

        if (this.timer <= 0) {
            let candidates = [];
            let activeCasters = [];
            
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    candidates.push(a);
                    // Bias towards units that are actually doing something
                    if (a.castingSkillIdx !== -1 || a.isMoving) {
                        activeCasters.push(a);
                    }
                }
            }

            if (candidates.length > 0) {
                if (activeCasters.length > 0) {
                     this.targetId = activeCasters[Math.floor(Math.random() * activeCasters.length)].id;
                     this.timer = 4.0;
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
