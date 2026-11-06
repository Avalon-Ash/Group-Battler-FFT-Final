
// ╔══════════════════════════════════════════════════════════╗
// ║  GameEventPool — 遊戲核心事件物件池                      ║
// ║  職責：重用 GameEvent 物件減少 GC 壓力（hydrate / release）║
// ║  上游：CastingEngine / CombatSystem / DamageCalculator 等  ║
// ║  下游：VisualSystem / EventVFXMapper / AudioSystem       ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEvent, GameEventType, Point } from "../../types";

/** pushEvent / EventPool.get 可攜帶的選填欄位（GameEvent 去除 type/pos）。 */
export type GameEventOpts = Omit<GameEvent, 'type' | 'pos'>;

const EVENT_POOL_SIZE = 200;

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
        event.hexes = opts.hexes;
        event.effectKind = opts.effectKind;
        event.skillId = opts.skillId;
        event.skillName = opts.skillName;
        event.sourceSide = opts.sourceSide;
        event.element = opts.element;
        event.statusResult = opts.statusResult;
        event.statusChanges = opts.statusChanges;
        event.statusNew = opts.statusNew;
        event.grantedAmount = opts.grantedAmount;
        event.removedKindMask = opts.removedKindMask;
        event.periodicKind = opts.periodicKind;
        event.rate = opts.rate;
        event.dotVariant = opts.dotVariant;
        event.hazardKind = opts.hazardKind;
        event.feedbackKind = opts.feedbackKind;
        event.statusReason = opts.statusReason;

        return event;
    }

    public release(event: GameEvent) {
        // Clear references to help GC if the pool grows large, though mostly primitives/strings.
        event.skill = undefined;
        event.sourceId = undefined;
        event.targetId = undefined;
        event.team = undefined;
        event.absorbed = undefined;
        event.hexes = undefined;
        event.effectKind = undefined;
        event.skillId = undefined;
        event.skillName = undefined;
        event.sourceSide = undefined;
        event.element = undefined;
        event.statusResult = undefined;
        event.statusChanges = undefined;
        event.statusNew = undefined;
        event.grantedAmount = undefined;
        event.removedKindMask = undefined;
        event.periodicKind = undefined;
        event.rate = undefined;
        event.dotVariant = undefined;
        event.hazardKind = undefined;
        event.feedbackKind = undefined;
        event.statusReason = undefined;
        this.pool.push(event);
    }
}

export const EventPool = new GameEventPool(EVENT_POOL_SIZE);
