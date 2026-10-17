
import { GameEvent, GameEventType, Point } from "../../types";

/** pushEvent / EventPool.get 可攜帶的選填欄位（GameEvent 去除 type/pos）。 */
export type GameEventOpts = Omit<GameEvent, 'type' | 'pos'>;

class GameEventPool {
    private pool: GameEvent[] = [];

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
        opts: GameEventOpts = {}
    ): GameEvent {
        let event: GameEvent;
        
        if (this.pool.length > 0) {
            event = this.pool.pop()!;
        } else {
            event = this.createEmpty();
        }

        // Hydrate
        event.type = type;
        
        // Critical: Clone position (incl. world-height z, see EventPos.ts) to avoid reference drift if 'pos' is reused/mutated elsewhere
        event.pos = pos.z === undefined ? { x: pos.x, y: pos.y } : { x: pos.x, y: pos.y, z: pos.z };
        
        event.value = opts.value;
        event.text = opts.text;
        event.color = opts.color;
        event.skill = opts.skill;
        event.sourceId = opts.sourceId;
        event.targetId = opts.targetId;
        event.team = opts.team;
        event.absorbed = opts.absorbed;

        return event;
    }

    public release(event: GameEvent) {
        // Clear references to help GC if the pool grows large, though mostly primitives/strings.
        event.skill = undefined;
        event.sourceId = undefined;
        event.targetId = undefined;
        event.team = undefined;
        event.absorbed = undefined;
        this.pool.push(event);
    }
}

export const EventPool = new GameEventPool(200);
