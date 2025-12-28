
import { GameEvent, GameEventType, Skill, Team, Point } from "../../types";

export class GameEventPool {
    private pool: GameEvent[] = [];
    private _index = 0;

    constructor(initialSize: number = 100) {
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createEmpty());
        }
    }

    private createEmpty(): GameEvent {
        return {
            type: 'DAMAGE', // Dummy
            pos: { x: 0, y: 0 }
        };
    }

    public get(
        type: GameEventType, 
        pos: Point, 
        opts: { 
            value?: number, 
            text?: string, 
            color?: string, 
            skill?: Skill, 
            sourceId?: string, 
            targetId?: string, 
            team?: Team 
        } = {}
    ): GameEvent {
        let event: GameEvent;
        
        if (this.pool.length > 0) {
            event = this.pool.pop()!;
        } else {
            event = this.createEmpty();
        }

        // Hydrate
        event.type = type;
        
        // Critical: Clone position to avoid reference drift if 'pos' is reused/mutated elsewhere
        event.pos = { x: pos.x, y: pos.y };
        
        event.value = opts.value;
        event.text = opts.text;
        event.color = opts.color;
        event.skill = opts.skill;
        event.sourceId = opts.sourceId;
        event.targetId = opts.targetId;
        event.team = opts.team;

        return event;
    }

    public release(event: GameEvent) {
        // Clear references to help GC if the pool grows large, though mostly primitives/strings.
        event.skill = undefined;
        event.sourceId = undefined;
        event.targetId = undefined;
        event.team = undefined;
        this.pool.push(event);
    }
}

export const EventPool = new GameEventPool(200);
