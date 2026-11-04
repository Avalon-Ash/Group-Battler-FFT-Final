// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorFight — 導播要框的那一對                        ║
// ║  職責：主角和主角的目標；舊目標多留一下，死了立刻離開。   ║
// ║  [ARCH] 只有這一對決定鏡頭：打主角的人、別處的奧義都不算。 ║
// ║  實測框進攻擊者時手機 81% 停在全景（WORKLOG）。           ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../core/Agent";
import type { ShotMember } from "../../types";
import { DIRECTOR_PARAM } from "../../constants";
import { VisualMath } from "../math/VisualMath";

interface MemberRecord {
    agent: Agent;
    weight: number;
    linger: number;
}

export class DirectorFight {
    private members = new Map<string, MemberRecord>();

    public reset(): void {
        this.members.clear();
    }

    public collect(
        anchor: Agent,
        agents: readonly Agent[],
        isEligible: (a: Agent) => boolean,
        dt: number
    ): ShotMember[] {
        const seenIds = new Set<string>();
        const radiusSq = DIRECTOR_PARAM.FIGHT_RADIUS_PX * DIRECTOR_PARAM.FIGHT_RADIUS_PX;
        const walkRadiusSq = DIRECTOR_PARAM.WALK_TARGET_RADIUS_PX * DIRECTOR_PARAM.WALK_TARGET_RADIUS_PX;

        for (const a of agents) {
            seenIds.add(a.id);
            const eligible = isEligible(a);
            const dx = a.px - anchor.px;
            const dy = a.py - anchor.py;
            const inRadius = (dx * dx + dy * dy) <= radiusSq;

            if (!eligible || !inRadius) {
                this.members.delete(a.id);
                continue;
            }

            let weight: number | null = null;
            if (a === anchor) {
                weight = DIRECTOR_PARAM.ANCHOR_WEIGHT;
            } else if (a === anchor.target && (!anchor.isMoving || dx * dx + dy * dy <= walkRadiusSq)) {
                weight = DIRECTOR_PARAM.RELATED_WEIGHT;
            }

            if (weight !== null) {
                const existing = this.members.get(a.id);
                if (existing) {
                    existing.agent = a;
                    existing.weight = weight;
                    existing.linger = DIRECTOR_PARAM.MEMBER_LINGER_S;
                } else {
                    this.members.set(a.id, {
                        agent: a,
                        weight,
                        linger: DIRECTOR_PARAM.MEMBER_LINGER_S,
                    });
                }
            } else {
                const existing = this.members.get(a.id);
                if (existing) {
                    existing.agent = a;
                    existing.linger -= dt;
                    if (existing.linger <= 0) {
                        this.members.delete(a.id);
                    }
                }
            }
        }

        for (const [id] of this.members) {
            if (!seenIds.has(id)) {
                this.members.delete(id);
            }
        }

        const result: ShotMember[] = [];
        for (const record of this.members.values()) {
            const a = record.agent;
            result.push({
                x: a.px + a.physics.x,
                y: VisualMath.getVisualBodyCenterY(a.py + a.physics.y, a.physics.z),
                weight: record.weight,
            });
        }
        return result;
    }
}
