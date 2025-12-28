
import { GameEngine } from "../game";
import { GroundHazard, Team } from "../../types";
import { HexUtils } from "../utils";
import { HAZARD_VISUALS } from "../../data/vfx/hazard_visuals";

export class HazardSystem {
    // Spatial Hash Map: "q,r" -> Hazard
    public hazards: Map<string, GroundHazard> = new Map();

    public reset() {
        this.hazards.clear();
    }

    public addHazard(
        q: number, r: number, 
        type: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC', 
        duration: number, 
        sourceId: string, 
        team: Team, 
        color: string,
        power: number,
        interval: number,
        engine?: GameEngine 
    ) {
        if (!engine || !engine.map.isValid(q, r)) return;
        const key = HexUtils.key({q, r});
        
        // Persistence Logic: Extend existing hazards of same type/team
        const existing = this.hazards.get(key);
        
        if (existing) {
            if (existing.type === type && existing.team === team) {
                existing.duration = Math.max(existing.duration, duration);
                existing.power = Math.max(existing.power, power); 
                existing.sourceId = sourceId; 
                return;
            }
        }

        // New Hazard Instance
        const hazard: GroundHazard = {
            id: Math.random().toString(36).substr(2, 6),
            q, r, type, duration, sourceId, team, color, power, interval, timer: 0 
        };
        
        this.hazards.set(key, hazard);

        // Spawn VFX
        if (engine.renderer) {
            const def = HAZARD_VISUALS[type];
            if (def && def.spawnVfx) {
                const px = HexUtils.toPx(q, r, engine.mapConfig);
                const h = engine.map.getTerrainHeight(q, r);
                engine.renderer.vfx.playEffect(def.spawnVfx, px.x, px.y, h);
            }
        }
    }

    public getHazardAt(q: number, r: number): GroundHazard | undefined {
        return this.hazards.get(HexUtils.key({q, r}));
    }

    public update(dt: number, engine: GameEngine) {
        const toRemove: string[] = [];
        
        // 1. Hazard Lifecycle Management
        for (const [key, h] of this.hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt; 
            if (h.duration <= 0) toRemove.push(key);
        }
        toRemove.forEach(k => this.hazards.delete(k));

        // 2. Spatial Effect Application (Iterate Agents O(N))
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            
            // O(1) Lookup
            const hazard = this.getHazardAt(agent.q, agent.r);
            if (!hazard) return;

            // Hostility Check
            const isHostile = hazard.team !== agent.team;
            if (!isHostile) return;

            // Flyer Immunity Check
            // Flying units avoid Ground Fire/Poison, but Gravity/Generic (Magic) hits them
            if (agent.movementType === 1 && (hazard.type === 'FIRE' || hazard.type === 'POISON')) {
                return;
            }

            // A. Damage Tick
            if (hazard.timer <= 0) {
                const dmg = hazard.power;
                agent.hp = Math.max(0, agent.hp - dmg);
                
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.floor(dmg), 
                    color: hazard.color,
                    skill: { color: hazard.color, ccType: 'DOT' } as any 
                });

                engine.log(agent, 'HAZARD', hazard.type, `(${hazard.q},${hazard.r})`, `地形傷害 ${Math.floor(dmg)}`);
            }

            // B. Physics Tick (Continuous)
            if (hazard.type === 'GRAVITY') {
                const center = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
                const dx = center.x - agent.px;
                const dy = center.y - agent.py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    const pullForce = 300; 
                    const fx = (dx/dist) * pullForce;
                    const fy = (dy/dist) * pullForce;
                    
                    // Directly modify physics velocity
                    agent.physics.vx += fx * dt;
                    agent.physics.vy += fy * dt;
                    
                    // Strong Slow
                    agent.moveSpeedMult = 0.3; 
                }
            } else if (hazard.type === 'ICE') {
                // Minor slip? Or just slow?
                agent.moveSpeedMult = 0.6;
            }
        });

        // 3. Reset Hazard Timers (Safe Batch Reset)
        for (const h of this.hazards.values()) {
            if (h.timer <= 0) {
                h.timer = h.interval;
            }
        }
    }
}
