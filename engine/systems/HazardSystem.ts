import { GameEngine } from "../game";
import { GroundHazard, Team } from "../../types";
import { HexUtils } from "../utils";
import { HAZARD_VISUALS } from "../../data/vfx/hazard_visuals";

export class HazardSystem {
    public addHazard(
        q: number, r: number, 
        type: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC', 
        duration: number, 
        sourceId: string, 
        team: Team, 
        color: string,
        power: number,
        interval: number,
        engine: GameEngine 
    ) {
        if (!engine.map.isValid(q, r)) return;
        const key = HexUtils.key({q, r});
        const existing = engine.hazards.get(key);
        
        if (existing) {
            if (existing.type === type && existing.team === team) {
                existing.duration = Math.max(existing.duration, duration);
                existing.power = Math.max(existing.power, power); 
                existing.sourceId = sourceId; 
                return;
            }
        }

        const hazard: GroundHazard = {
            id: Math.random().toString(36).substr(2, 6),
            q, r, type, duration, sourceId, team, color, power, interval, timer: 0 
        };
        
        engine.hazards.set(key, hazard);

        if (engine.renderer) {
            const def = HAZARD_VISUALS[type];
            if (def && def.spawnVfx) {
                const px = HexUtils.toPx(q, r, engine.mapConfig);
                const h = engine.map.getTerrainHeight(q, r);
                engine.renderer.vfx.playEffect(def.spawnVfx, px.x, px.y, h);
            }
        }
    }

    public update(dt: number, engine: GameEngine) {
        const toRemove: string[] = [];
        
        for (const [key, h] of engine.hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt; 
            if (h.duration <= 0) toRemove.push(key);
        }
        toRemove.forEach(k => engine.hazards.delete(k));

        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            
            const hazard = engine.hazards.get(HexUtils.key({q: agent.q, r: agent.r}));
            if (!hazard) return;

            if (hazard.team !== agent.team) {
                if (agent.movementType === 1 && (hazard.type === 'FIRE' || hazard.type === 'POISON')) return;

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
                    agent.hitFlashTimer = 0.1;
                }

                if (hazard.type === 'GRAVITY') {
                    const center = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
                    const dx = center.x - agent.px, dy = center.y - agent.py;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 5) {
                        const pullForce = 300; 
                        agent.physics.vx += (dx/dist) * pullForce * dt;
                        agent.physics.vy += (dy/dist) * pullForce * dt;
                        agent.moveSpeedMult = 0.3; 
                    }
                } else if (hazard.type === 'ICE') {
                    agent.moveSpeedMult = 0.6;
                }
            }
        });

        for (const h of engine.hazards.values()) {
            if (h.timer <= 0) h.timer = h.interval;
        }
    }
}