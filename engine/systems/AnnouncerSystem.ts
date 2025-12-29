import { GameEngine } from "../game";
import { KILL_STREAK_WINDOW } from "../../constants";

export class AnnouncerSystem {
    public update(dt: number, engine: GameEngine) {
        const newEvents: any[] = [];
        engine.events.forEach(event => {
            if (event.type === 'KILL' && event.sourceId) {
                this.processKill(event.sourceId, event.pos, engine, newEvents);
            }
        });
        if (newEvents.length > 0) {
            engine.events.push(...newEvents);
        }
    }

    private processKill(killerId: string, pos: {x: number, y: number}, engine: GameEngine, outEvents: any[]) {
        const now = engine.battleTime;
        const state = engine.sessionState;
        
        if (!state.firstBloodTriggered) {
            state.firstBloodTriggered = true;
            outEvents.push({
                type: 'KILL_STREAK',
                pos: pos,
                sourceId: killerId,
                text: "FIRST BLOOD",
                color: "#ef4444",
                value: 1
            });
        }

        let streak = 1;
        const existing = state.killStreaks.get(killerId);
        if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) {
            streak = existing.count + 1;
        }
        
        state.killStreaks.set(killerId, { count: streak, lastTime: now });

        if (streak >= 2) {
            let streakText = "DOUBLE KILL";
            let streakColor = "#cbd5e1";
            let rank = 2;
            
            if (streak === 3) { streakText = "TRIPLE KILL"; streakColor = "#fcd34d"; rank = 3; }
            else if (streak === 4) { streakText = "QUADRA KILL"; streakColor = "#fb923c"; rank = 4; }
            else if (streak >= 5) { streakText = "PENTA KILL"; streakColor = "#ef4444"; rank = 5; }
            
            outEvents.push({
                type: 'KILL_STREAK',
                pos: pos,
                sourceId: killerId,
                text: streakText,
                color: streakColor,
                value: rank
            });
        }
    }
}