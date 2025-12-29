
import { GameEngine } from "../game";
import { Team } from "../../types";
import { HexUtils } from "../utils";

export interface ActiveZone {
    q: number;
    r: number;
    radius: number;
    color: string;
    progress: number;
    isEnemy: boolean;
}

export class ZoneSystem {
    public activeZones: ActiveZone[] = [];

    public update(engine: GameEngine) {
        this.activeZones = [];

        // Pre-process Unit Zones
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;
            
            if (a.stunTimer <= 0 && a.silenceTimer <= 0 && a.castingSkillIdx !== -1) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.type === 'AOE') {
                    let tq = a.q, tr = a.r;
                    if (a.targetHex) { tq = a.targetHex.q; tr = a.targetHex.r; }
                    else if (a.target) { tq = a.target.q; tr = a.target.r; }
                    
                    const progress = 1 - (a.castTimer / s.cast);
                    const radius = (s.aoeRadius || 1);
                    
                    // Unified Logic: Just track if it's an enemy
                    const isEnemy = a.team === Team.RED; // Assuming player perspective is Blue

                    this.activeZones.push({ 
                        q: tq, r: tr, 
                        radius, 
                        color: s.color, 
                        progress,
                        isEnemy
                    });
                }
            }
        }
    }

    public getZoneAt(q: number, r: number): ActiveZone | null {
        // Linear scan is fine for < 20 zones usually
        for (const zone of this.activeZones) {
            const dist = HexUtils.dist({q, r}, {q: zone.q, r: zone.r});
            if (dist <= zone.radius) {
                return zone;
            }
        }
        return null;
    }
}
