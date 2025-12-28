
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
            // This prevents visual flickering (spawn/despawn loop) on continuous application.
            if (existing.type === type && existing.team === team) {
                existing.duration = Math.max(existing.duration, duration);
                existing.power = Math.max(existing.power, power); // Update power if stronger
                existing.sourceId = sourceId; // Update credit
                // Do NOT reset existing.timer or existing.id
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
        
        // 1. Tick Durations
        for (const [key, h] of this.hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt; // Tick timer counts down
            if (h.duration <= 0) toRemove.push(key);
        }
        toRemove.forEach(k => this.hazards.delete(k));

        // 2. Resolve Effects (Damage/CC)
        for (const h of this.hazards.values()) {
            if (h.timer <= 0) {
                h.timer = h.interval; // Reset tick
                
                // Find units in this tile
                const occupants = engine.agents.filter(a => 
                    a.hp > 0 && !a.banished && a.q === h.q && a.r === h.r && a.team !== h.team
                );
                
                occupants.forEach(agent => {
                    if (agent.movementType === 1 && (h.type === 'FIRE' || h.type === 'POISON')) return; // Flyers avoid ground hazards

                    const dmg = h.power;
                    agent.hp = Math.max(0, agent.hp - dmg);
                    
                    // Visual Feedback
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: {x: agent.px, y: agent.py}, 
                        value: -Math.floor(dmg), 
                        color: h.color,
                        skill: { color: h.color, ccType: 'DOT' } as any 
                    });

                    engine.log(agent, 'HAZARD', h.type, `(${h.q},${h.r})`, `受到地形傷害 ${Math.floor(dmg)}`);
                });
            }
        }

        // 3. Physics (Gravity/Suction)
        // Optimization: Gravity logic should be in PhysicsSystem or centralized, but keeping here for cohesion for now.
        // To optimize FPS, ensure this loop is tight.
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            const hazard = this.getHazardAt(agent.q, agent.r);
            
            if (hazard && hazard.type === 'GRAVITY' && hazard.team !== agent.team) {
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
    }
}
