import { GameEngine } from "../game";

export class DirectorSystem {
    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        ds.priorityTimer = 0;
    }

    public forceFocus(engine: GameEngine, id: string, duration: number = 2.0) {
        const ds = engine.state.director;
        ds.targetId = id;
        ds.priorityTimer = duration;
        ds.focusTimer = duration;
    }

    public update(engine: GameEngine, dt: number) {
        const ds = engine.state.director;
        
        if (ds.priorityTimer > 0) ds.priorityTimer -= dt;
        ds.focusTimer -= dt;
        
        if (ds.targetId) {
            const current = engine.agents.find(a => a.id === ds.targetId);
            if (!current || current.hp <= 0) {
                ds.focusTimer = -1; 
                ds.priorityTimer = 0;
            }
        }

        if (ds.focusTimer <= 0) {
            let candidates = [];
            let activeCasters = [];
            
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    candidates.push(a);
                    if (a.castingSkillIdx !== -1 || a.isMoving) activeCasters.push(a);
                }
            }

            if (candidates.length > 0) {
                if (activeCasters.length > 0) {
                     ds.targetId = activeCasters[Math.floor(Math.random() * activeCasters.length)].id;
                     ds.focusTimer = 4.0;
                } else {
                     ds.targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
                     ds.focusTimer = 3.0;
                }
            } else {
                ds.targetId = null;
            }
        }
    }
}