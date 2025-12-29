import { GameEngine } from "../game";

export class DirectorSystem {
    public reset(engine: GameEngine) {
        engine.sessionState.directorTargetId = null;
        engine.sessionState.directorTimer = 0;
        engine.sessionState.directorPriorityTimer = 0;
    }

    public forceFocus(engine: GameEngine, id: string, duration: number = 2.0) {
        engine.sessionState.directorTargetId = id;
        engine.sessionState.directorPriorityTimer = duration;
        engine.sessionState.directorTimer = duration;
    }

    public update(engine: GameEngine, dt: number) {
        const state = engine.sessionState;
        
        if (state.directorPriorityTimer > 0) {
            state.directorPriorityTimer -= dt;
        }
        
        state.directorTimer -= dt;
        
        if (state.directorTargetId) {
            const current = engine.agents.find(a => a.id === state.directorTargetId);
            if (!current || current.hp <= 0) {
                state.directorTimer = -1; 
                state.directorPriorityTimer = 0;
            }
        }

        if (state.directorTimer <= 0) {
            let candidates = [];
            let activeCasters = [];
            
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    candidates.push(a);
                    if (a.castingSkillIdx !== -1 || a.isMoving) {
                        activeCasters.push(a);
                    }
                }
            }

            if (candidates.length > 0) {
                if (activeCasters.length > 0) {
                     state.directorTargetId = activeCasters[Math.floor(Math.random() * activeCasters.length)].id;
                     state.directorTimer = 4.0;
                } else {
                     state.directorTargetId = candidates[Math.floor(Math.random() * candidates.length)].id;
                     state.directorTimer = 3.0;
                }
            } else {
                state.directorTargetId = null;
            }
        }
    }
}