
import { GameEngine } from "../game";
import { GroundHazard, Team, MovementType } from "../../types";
import { HexUtils } from "../utils";
import { HAZARD_VISUALS } from "../../data/vfx/hazard_visuals";
import { COMBAT_PARAM, HEX_SIZE } from "../../constants";

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
        engine: GameEngine,
        centerQ?: number,
        centerR?: number,
        pullRadius?: number
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
                if (centerQ !== undefined) existing.centerQ = centerQ;
                if (centerR !== undefined) existing.centerR = centerR;
                if (pullRadius !== undefined) existing.pullRadius = pullRadius;
                return;
            }
        }

        const hazard: GroundHazard = {
            id: engine.nextId('HZD'),
            q, r, type, duration, sourceId, team, color, power, interval, timer: 0,
            centerQ: centerQ ?? q,
            centerR: centerR ?? r,
            pullRadius
        };
        
        hazards.set(key, hazard);

        const def = HAZARD_VISUALS[type];
        if (def && def.spawnVfx) {
            const px = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
            const hz = engine.getTerrainHeight(hazard.q, hazard.r);
            engine.events.push({ 
                type: 'HAZARD_SPAWN', 
                pos: { x: px.x, y: px.y, z: hz }, 
                text: def.spawnVfx,
                sourceId: hazard.sourceId,
                targetId: hazard.id 
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

        // Use a set to track which hazards triggered damage this frame so we only reset timer once
        const triggeredHazards = new Set<string>();

        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            
            const hazardKey = HexUtils.key({q: agent.q, r: agent.r});
            const hazard = hazards.get(hazardKey);
            if (!hazard) return;

            if (hazard.team !== agent.team) {
                // Flying units are immune to ground hazards like Fire/Poison
                if (agent.movementType === MovementType.FLYING && (hazard.type === 'FIRE' || hazard.type === 'POISON')) return;

                if (triggeredHazards.has(hazardKey)) return;

                if (hazard.timer <= 0) {
                    let dmg = hazard.power;
                    
                    // Shield Mitigation logic
                    let absorbed = 0;
                    if (agent.shield > 0) {
                        absorbed = Math.min(agent.shield, dmg);
                        agent.shield -= absorbed;
                        dmg -= absorbed;
                    }
                    
                    if (dmg > 0) {
                        agent.hp = Math.max(0, agent.hp - dmg);
                    }

                    if (absorbed > 0) {
                        engine.events.push({ 
                            type: 'DAMAGE', 
                            pos: { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: agent.physics.z }, 
                            value: -Math.floor(absorbed), 
                            color: '#bae6fd', 
                            text: "ABSORB",
                            sourceId: hazard.sourceId,
                            targetId: agent.id
                        });
                    }

                    if (dmg > 0 || absorbed === 0) {
                        engine.events.push({ 
                            type: 'DAMAGE', 
                            pos: { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: agent.physics.z }, 
                            value: -Math.floor(dmg > 0 ? dmg : hazard.power),
                            color: hazard.color,
                            skill: { color: hazard.color, ccType: 'DOT' } as any,
                            sourceId: hazard.sourceId,
                            targetId: agent.id
                        });
                    }
                    
                    const source = engine.agents.find(a => a.id === hazard.sourceId) || null;
                    engine.log(source, 'HAZARD', '地形傷害', agent.id, `受到 ${Math.floor(dmg)} 傷害 (護盾抵擋 ${Math.floor(absorbed)}) (${hazard.type})`);
                    
                    if (hazard.sourceId) {
                        agent.lastHitSourceId = hazard.sourceId;
                    }

                    agent.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
                    // Mark hazard to be reset at the end of the loop
                    triggeredHazards.add(hazardKey);
                }

                if (hazard.type === 'GRAVITY') {
                    // Pulling is now handled globally, just apply slow if on tile
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.GRAVITY_SPEED_REDUCTION); 
                } else if (hazard.type === 'ICE') {
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.ICE_SPEED_REDUCTION);
                }
            }
        });

        // ==========================================
        // Global Sweep for GRAVITY Area Pull Effect
        // ==========================================
        const gravityCenters = new Map<string, {q: number, r: number, team: Team, radius: number}>();
        for (const [key, h] of hazards.entries()) {
            if (h.type === 'GRAVITY' && h.centerQ !== undefined && h.centerR !== undefined) {
                // If pullRadius is not explicitly set, default to 3 hexes worth of distance
                const r = h.pullRadius || (HEX_SIZE * 5);
                gravityCenters.set(`${h.centerQ},${h.centerR},${h.team}`, {q: h.centerQ, r: h.centerR, team: h.team, radius: r});
            }
        }
        
        gravityCenters.forEach(centerConfig => {
            const centerPx = HexUtils.toPx(centerConfig.q, centerConfig.r, engine.mapConfig);
            engine.agents.forEach(agent => {
                // Ignore dead, banished, or same team
                if (agent.hp <= 0 || agent.banished || agent.team === centerConfig.team) return;
                
                const dx = centerPx.x - agent.px, dy = centerPx.y - agent.py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Distances are measured in pixels (pullRadius and GRAVITY_MIN_DIST are in px)
                if (dist < centerConfig.radius && dist > COMBAT_PARAM.GRAVITY_MIN_DIST) {
                    agent.physics.vx += (dx/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                    agent.physics.vy += (dy/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.GRAVITY_SPEED_REDUCTION);
                }
            });
        });

        // Reset the timer for all hazards that triggered this frame
        triggeredHazards.forEach(key => {
            const h = hazards.get(key);
            if (h) h.timer = h.interval || 1.0;
        });
    }
}
