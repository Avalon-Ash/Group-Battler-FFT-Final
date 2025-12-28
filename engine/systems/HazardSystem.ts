
import { GameEngine } from "../game";
import { GroundHazard, Team } from "../../types";
import { HexUtils } from "../utils";
import { HAZARD_VISUALS } from "../../data/vfx/hazard_visuals";

export class HazardSystem {
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
        
        // --- PERSISTENCE FIX ---
        // Check if a compatible hazard already exists
        const existing = this.hazards.get(key);
        
        if (existing) {
            // If same type and team, EXTEND it instead of replacing it.
            if (existing.type === type && existing.team === team) {
                existing.duration = Math.max(existing.duration, duration);
                existing.power = Math.max(existing.power, power); // Update power if stronger
                existing.sourceId = sourceId; // Update credit
                return;
            }
        }

        // Create New
        const hazard: GroundHazard = {
            id: Math.random().toString(36).substr(2, 6),
            q, r, type, duration, sourceId, team, color, power, interval, timer: 0 
        };
        
        this.hazards.set(key, hazard);

        // Trigger Spawn VFX only on NEW creation
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
        
        // 1. Tick Durations & Update Global Timers
        for (const [key, h] of this.hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt; // Tick timer counts down
            if (h.duration <= 0) toRemove.push(key);
        }
        toRemove.forEach(k => this.hazards.delete(k));

        // 2. Resolve Effects (Optimized: Iterate Agents, not Hazards)
        // O(Agents) is much better than O(Hazards * Agents) when carpet bombing
        
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            
            // Spatial Lookup
            const hazard = this.getHazardAt(agent.q, agent.r);
            if (!hazard) return;

            // Effect Logic
            if (hazard.timer <= 0) {
                // Apply Damage if hostile
                if (hazard.team !== agent.team) {
                    if (agent.movementType === 1 && (hazard.type === 'FIRE' || hazard.type === 'POISON')) return; // Flyers check

                    const dmg = hazard.power;
                    agent.hp = Math.max(0, agent.hp - dmg);
                    
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: {x: agent.px, y: agent.py}, 
                        value: -Math.floor(dmg), 
                        color: hazard.color,
                        skill: { color: hazard.color, ccType: 'DOT' } as any 
                    });

                    engine.log(agent, 'HAZARD', hazard.type, `(${hazard.q},${hazard.r})`, `受到地形傷害 ${Math.floor(dmg)}`);
                }
            }

            // Physics Logic (Gravity)
            if (hazard.type === 'GRAVITY' && hazard.team !== agent.team) {
                const center = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
                const dx = center.x - agent.px;
                const dy = center.y - agent.py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    const pull = 300 * dt;
                    agent.physics.vx += (dx/dist) * pull;
                    agent.physics.vy += (dy/dist) * pull;
                    agent.moveSpeedMult = 0.3; // Slow down
                }
            }
        });

        // 3. Reset Hazard Timers (Batch)
        // Since logic is applied via Agent iteration, we need to reset the tick timer for hazards that "fired".
        // But since hazards fire on a frequency, we can just reset any negative timer.
        for (const h of this.hazards.values()) {
            if (h.timer <= 0) {
                h.timer = h.interval;
            }
        }
    }
}
