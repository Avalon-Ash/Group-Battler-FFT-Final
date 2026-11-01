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
        // 擊殺者的陣營；擊殺者已移出場上（例如死後的持續傷害）就不算陣營累計，事件不帶 side（不會播）
        const side = engine.agents.find(a => a.id === killerId)?.side;

        if (!state.firstBloodTriggered) {
            state.firstBloodTriggered = true;
            outEvents.push({
                type: 'KILL_STREAK',
                pos: pos,
                sourceId: killerId,
                side,
                text: "FIRST BLOOD",
                color: ANNOUNCER_TEXT_COLORS.firstBlood,
                value: 1
            });
            outEvents.push({ type: 'KILL_SPREE', pos, sourceId: killerId, side, value: 1 });
        }

        let streak = 1;
        const existing = state.killStreaks.get(killerId);
        if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) {
            streak = existing.count + 1;
        }

        state.killStreaks.set(killerId, { count: streak, lastTime: now });

        // 累計擊殺播報（只有音效）：每個陣營一個池；畫面文字仍是下方的個人短時間連殺
        if (side !== undefined) {
            const total = (state.sideKills.get(side) ?? 0) + 1;
            state.sideKills.set(side, total);
            if (total >= KILL_SPREE_MIN_KILLS) {
                outEvents.push({ type: 'KILL_SPREE', pos, sourceId: killerId, side, value: Math.min(total, KILL_SPREE_MAX_TIER) });
            }
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
                side,
                text: streakText,
                color: streakColor,
                value: rank
            });
        }
    }
}
