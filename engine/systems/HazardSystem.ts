
import { GameEngine } from "../game";
import { GroundHazard, Team, MovementType } from "../../types";
import { HexUtils } from "../utils";
import { HAZARD_VISUALS } from "../../data/vfx/hazard_visuals";
import { COMBAT_PARAM } from "../../constants";

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
        const hazards = engine.state.hazards;
        const existing = hazards.get(key);
        
        if (existing) {
            if (existing.type === type && existing.team === team) {
                existing.duration = Math.max(existing.duration, duration);
                existing.power = Math.max(existing.power, power); 
                existing.sourceId = sourceId; 
                return;
            }
        }

        const hazard: GroundHazard = {
            id: engine.nextId('HZD'),
            q, r, type, duration, sourceId, team, color, power, interval, timer: 0 
        };
        
        hazards.set(key, hazard);

        const def = HAZARD_VISUALS[type];
        if (def && def.spawnVfx) {
            const px = HexUtils.toPx(q, r, engine.mapConfig);
            engine.events.push({ 
                type: 'HAZARD_SPAWN', 
                pos: { x: px.x, y: px.y }, 
                text: def.spawnVfx 
            });
        }
    }

    public update(dt: number, engine: GameEngine) {
        const hazards = engine.state.hazards;
        const toRemove: string[] = [];
        
        for (const [key, h] of hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt; 
            if (h.duration <= 0) toRemove.push(key);
        }
        toRemove.forEach(k => hazards.delete(k));

        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            
            const hazard = hazards.get(HexUtils.key({q: agent.q, r: agent.r}));
            if (!hazard) return;

            if (hazard.team !== agent.team) {
                // Flying units are immune to ground hazards like Fire/Poison
                if (agent.movementType === MovementType.FLYING && (hazard.type === 'FIRE' || hazard.type === 'POISON')) return;

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
                    
                    const source = engine.agents.find(a => a.id === hazard.sourceId) || null;
                    engine.log(source, 'HAZARD', '地形傷害', agent.id, `受到 ${Math.floor(dmg)} 傷害 (${hazard.type})`);
                    
                    agent.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
                }

                if (hazard.type === 'GRAVITY') {
                    const center = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
                    const dx = center.x - agent.px, dy = center.y - agent.py;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > COMBAT_PARAM.GRAVITY_MIN_DIST) {
                        agent.physics.vx += (dx/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                        agent.physics.vy += (dy/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                        agent.moveSpeedMult = COMBAT_PARAM.GRAVITY_SPEED_REDUCTION; 
                    }
                } else if (hazard.type === 'ICE') {
                    agent.moveSpeedMult = COMBAT_PARAM.ICE_SPEED_REDUCTION;
                }
            }
        });

        for (const h of hazards.values()) {
            if (h.timer <= 0) h.timer = h.interval;
        }
    }
}
