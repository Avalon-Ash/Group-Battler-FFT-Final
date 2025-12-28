
import { GameEngine } from "../game";
import { Team } from "../../types";
import { HexUtils } from "../utils";
import { HexMath } from "../math/HexMath";

export interface ActiveZone {
    type: 'CAST';
    q: number;
    r: number;
    radius: number;
    color: string;
    visual: string;
    progress: number;
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
                    
                    // Visual Tag Logic
                    let visualTag = s.tag as string;
                    if (a.team === Team.RED) {
                        visualTag = 'AOE_WARNING';
                    }

                    this.activeZones.push({ 
                        type: 'CAST', 
                        q: tq, r: tr, 
                        radius, 
                        color: s.color, 
                        visual: visualTag, 
                        progress 
                    });
                }
            }
        }
    }

    public getZoneAt(q: number, r: number): { zone: ActiveZone, dist: number } | null {
        // Linear scan is fine for < 20 zones usually
        for (const zone of this.activeZones) {
            const dist = HexMath.distance({q, r}, {q: zone.q, r: zone.r});
            if (dist <= zone.radius) {
                return { zone, dist };
            }
        }
        return null;
    }
}
