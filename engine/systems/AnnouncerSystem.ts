
import { GameEngine } from "../game";
import { KILL_STREAK_WINDOW } from "../../constants";

export class AnnouncerSystem {
    private killStreaks = new Map<string, { count: number, lastTime: number }>();
    private firstBlood = false;

    public reset() {
        this.killStreaks.clear();
        this.firstBlood = false;
    }

    public update(dt: number, engine: GameEngine) {
        // Iterate over events generated in this frame to find KILLS
        // We iterate backward or forward, doesn't matter much for simultaneous kills, 
        // but forward preserves order.
        
        // Note: engine.events is mutable. We can append to it while iterating if we are careful,
        // but it's safer to collect new events and push them after.
        
        const newEvents: any[] = [];

        engine.events.forEach(event => {
            if (event.type === 'KILL' && event.sourceId) {
                this.processKill(event.sourceId, event.pos, engine, newEvents);
            }
        });

        // Push new announcement events to the engine
        if (newEvents.length > 0) {
            engine.events.push(...newEvents);
        }
    }

    private processKill(killerId: string, pos: {x: number, y: number}, engine: GameEngine, outEvents: any[]) {
        const now = engine.battleTime;
        
        // 1. First Blood Logic
        if (!this.firstBlood) {
            this.firstBlood = true;
            outEvents.push({
                type: 'KILL_STREAK',
                pos: pos,
                sourceId: killerId,
                text: "FIRST BLOOD",
                color: "#ef4444",
                value: 1 // Rank
            });
        }

        // 2. Multi-Kill Logic
        let streak = 1;
        const existing = this.killStreaks.get(killerId);
        if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) {
            streak = existing.count + 1;
        }
        
        this.killStreaks.set(killerId, { count: streak, lastTime: now });

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
