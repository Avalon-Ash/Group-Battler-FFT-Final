import { GameEngine } from "../game";
import { KILL_STREAK_WINDOW, KILL_SPREE_MIN_KILLS, KILL_SPREE_MAX_TIER, BATTLE_RULES } from "../../constants";
import { GameEvent, Point } from "../../types";
import { ANNOUNCER_TEXT_COLORS } from "../../constants/palette";

export class AnnouncerSystem {
    public update(dt: number, engine: GameEngine) {
        const newEvents: GameEvent[] = [];
        engine.events.forEach(event => {
            if (event.type === 'KILL' && event.sourceId) {
                this.processKill(event.sourceId, event.pos, engine, newEvents);
            }
        });
        if (newEvents.length > 0) {
            engine.events.push(...newEvents);
        }
    }

    private processKill(killerId: string, pos: Point, engine: GameEngine, outEvents: GameEvent[]) {
        const now = engine.battleTime;
        const state = engine.sessionState;
        
        if (!state.firstBloodTriggered) {
            state.firstBloodTriggered = true;
            outEvents.push({
                type: 'KILL_STREAK',
                pos: pos,
                sourceId: killerId,
                text: "FIRST BLOOD",
                color: ANNOUNCER_TEXT_COLORS.firstBlood,
                value: 1
            });
            outEvents.push({ type: 'KILL_SPREE', pos, sourceId: killerId, value: 1 });
        }

        let streak = 1;
        const existing = state.killStreaks.get(killerId);
        if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) {
            streak = existing.count + 1;
        }
        const total = (existing?.total ?? 0) + 1;

        state.killStreaks.set(killerId, { count: streak, lastTime: now, total });

        // 累計擊殺播報（只有音效；畫面文字仍是下方的短時間連殺）
        if (total >= KILL_SPREE_MIN_KILLS) {
            outEvents.push({ type: 'KILL_SPREE', pos, sourceId: killerId, value: Math.min(total, KILL_SPREE_MAX_TIER) });
        }

        if (streak >= 2) {
            let streakText = "DOUBLE KILL";
            let streakColor: string = ANNOUNCER_TEXT_COLORS.doubleKill;
            let rank = 2;
            
            if (streak === 3) { streakText = "TRIPLE KILL"; streakColor = ANNOUNCER_TEXT_COLORS.tripleKill; rank = 3; }
            else if (streak === 4) { streakText = "QUADRA KILL"; streakColor = ANNOUNCER_TEXT_COLORS.quadraKill; rank = 4; }
            else if (streak >= BATTLE_RULES.PENTA_KILL_TIER) { streakText = "PENTA KILL"; streakColor = ANNOUNCER_TEXT_COLORS.pentaKill; rank = BATTLE_RULES.PENTA_KILL_TIER; }
            
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
