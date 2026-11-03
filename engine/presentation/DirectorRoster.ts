// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorRoster — 導播的排分清單                         ║
// ║  職責：每 tick 依單位正在做的事給分，分數隨時間衰減；      ║
// ║        分數高的在前，同分時先進榜的在前。                 ║
// ║  [ARCH] 沒有依 ID、職業或陣列順序的加分：兩邊機會一樣，   ║
// ║  同分也不會在幾個單位之間來回跳。分數掉到 0 就離榜，       ║
// ║  再回來算新進榜。                                         ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../core/Agent";
import { AIState } from "../../types";
import { DIRECTOR_PARAM } from "../../constants";

export interface RosterEntry {
    agent: Agent;
    score: number;
    /** 進榜序號；同分時小的在前 */
    seq: number;
}

const byRank = (a: RosterEntry, b: RosterEntry) => b.score - a.score || a.seq - b.seq;

/** 這一刻做的事值幾分（施法分依技能等級，其餘累加） */
function instantScore(a: Agent): number {
    let score = 0;
    if (a.castingSkillIdx !== -1) {
        const tag = a.skills[a.castingSkillIdx]?.tag;
        score += tag === 'ULT' ? DIRECTOR_PARAM.ULT_SCORE
            : tag === 'ACTIVE' ? DIRECTOR_PARAM.ACTIVE_SCORE
            : DIRECTOR_PARAM.BASIC_SCORE;
    }
    if (a.view.hitFlashTimer > 0) score += DIRECTOR_PARAM.HIT_SCORE;
    if (a.isMoving) score += DIRECTOR_PARAM.MOVING_SCORE;
    if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) score += DIRECTOR_PARAM.EVADE_SCORE;
    return score;
}

export class DirectorRoster {
    private entries = new Map<string, RosterEntry>();
    private nextSeq = 0;
    /** 依名次排好的清單；update 之後才有效 */
    public readonly ranked: RosterEntry[] = [];

    public reset(): void {
        this.entries.clear();
        this.ranked.length = 0;
        this.nextSeq = 0;
    }

    public update(agents: readonly Agent[], dt: number, isEligible: (a: Agent) => boolean): void {
        const decay = DIRECTOR_PARAM.SCORE_DECAY_PER_S * dt;
        const present = new Set<string>();
        for (const a of agents) {
            if (!isEligible(a)) continue;
            present.add(a.id);
            const instant = instantScore(a);
            const entry = this.entries.get(a.id);
            if (entry) {
                entry.agent = a;
                entry.score = Math.max(entry.score - decay, instant);
                if (entry.score <= 0) this.entries.delete(a.id);
            } else if (instant > 0) {
                this.entries.set(a.id, { agent: a, score: instant, seq: this.nextSeq++ });
            }
        }
        this.ranked.length = 0;
        for (const [id, entry] of this.entries) {
            if (present.has(id)) this.ranked.push(entry);
            else this.entries.delete(id);
        }
        this.ranked.sort(byRank);
    }

    public scoreOf(id: string): number {
        return this.entries.get(id)?.score ?? 0;
    }
}
