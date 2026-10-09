
// ╔══════════════════════════════════════════════════════════╗
// ║  HazardSystem — 地形危害（毒地/火場/冰面）管理           ║
// ║  職責：spatialHazard tick / 傷害觸發 / VFX 播放          ║
// ║  [ARCH] spatialHazard 的 VFX hexKey 由此寫入             ║
// ║  關聯：ZoneSystem（格子陷落時清除此系統資料）             ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine } from "../game";
import { Team, MovementType, SpatialHazard, GameEvent } from "../../types";
import { HexUtils } from "../utils";
import { COMBAT_PARAM, HEX_SIZE, DAMAGE_TEXT_COLORS } from "../../constants";

export type HazardRegisterContext = Pick<GameEngine, 'state' | 'getAgentAt' | 'mapConfig' | 'getTerrainHeight' | 'events'>;

export class HazardSystem {
    
    public registerHazard(hazard: SpatialHazard, engine: HazardRegisterContext) {
        engine.state.spatialHazards.push(hazard);
        
        // [PROACTIVE PUSH] If an agent is standing in any of the new tiles, force immediate AI tick
        hazard.cells.forEach(tile => {
            const victim = engine.getAgentAt(tile.q, tile.r);
            if (victim && victim.hp > 0 && victim.team !== hazard.team) {
                victim.forceAiUpdate = true;
            }
        });

        // Trigger decoupled visual spawn event
        hazard.cells.forEach(tile => {
            const px = HexUtils.toPx(tile.q, tile.r, engine.mapConfig);
            const hz = engine.getTerrainHeight(tile.q, tile.r);
            engine.events.push({
                type: 'HAZARD_SPAWN',
                pos: { x: px.x, y: px.y, z: hz },
                sourceId: hazard.sourceId,
                targetId: hazard.id,
                text: `FX_HAZARD_FIELD_${hazard.type}`,
                color: hazard.color
            });
        });
    }

    public update(dt: number, engine: GameEngine) {
        const spatialHazards = engine.state.spatialHazards;
        
        // 1. Lifecycle management
        for (let i = spatialHazards.length - 1; i >= 0; i--) {
            const h = spatialHazards[i];
            h.duration -= dt;
            if (h.duration <= 0) {
                spatialHazards.splice(i, 1);
            }
        }

        // 2. Logic Tick (AOE Damage & CC)
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;
            
            spatialHazards.forEach(h => {
                // Ignore friendly hazards
                if (h.team === agent.team) return;

                // Check if agent is inside this spatial hazard
                const isInside = h.cells.some(c => c.q === agent.q && c.r === agent.r);
                if (!isInside) return;

                // Flying units are immune to ground hazards like FIRE/POISON
                if (agent.movementType === MovementType.FLYING && (h.type === 'FIRE' || h.type === 'POISON')) return;

                // Damage Tick
                if (engine.battleTime >= h.lastTickTime + h.tickInterval) {
                     this.applyHazardEffect(agent, h, engine);
                }

                // Constant CC (Slows)
                if (h.type === 'GRAVITY') {
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.GRAVITY_SPEED_REDUCTION); 
                } else if (h.type === 'ICE') {
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.ICE_SPEED_REDUCTION);
                }
            });
        });

        // 3. Update tick timestamps for all hazards if applicable
        spatialHazards.forEach(h => {
            if (engine.battleTime >= h.lastTickTime + h.tickInterval) {
                h.lastTickTime += h.tickInterval;
            }
        });

        // 4. Global Pulling (GRAVITY)
        this.updateGravityPull(dt, engine);
    }

    private applyHazardEffect(agent: any, hazard: SpatialHazard, engine: GameEngine) {
        let dmg = hazard.power;
        
        // Shield Mitigation
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
                color: DAMAGE_TEXT_COLORS.ABSORB, 
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
                skill: { color: hazard.color, ccType: 'DOT' },
                sourceId: hazard.sourceId,
                targetId: agent.id
            });
        }
        
        const source = engine.agents.find(a => a.id === hazard.sourceId) || null;
        engine.log(source, 'HAZARD', '地形傷害', agent.id, `受到 ${Math.floor(dmg)} 傷害 (${hazard.type})`);
        
        if (hazard.sourceId) {
            agent.lastHitSourceId = hazard.sourceId;
        }

        if (agent.hp <= 0) {
            engine.agentManager.handleDeadState(agent, engine);
        }

        agent.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
    }

    private updateGravityPull(dt: number, engine: GameEngine) {
        const spatialHazards = engine.state.spatialHazards;
        
        spatialHazards.forEach(h => {
            if (h.type !== 'GRAVITY' || h.centerQ === undefined || h.centerR === undefined) return;
            
            const radius = h.pullRadius || (HEX_SIZE * 5);
            const centerPx = HexUtils.toPx(h.centerQ, h.centerR, engine.mapConfig);

            engine.agents.forEach(agent => {
                if (agent.hp <= 0 || agent.banished || agent.outOfBounds || agent.team === h.team) return;
                
                const dx = centerPx.x - agent.px, dy = centerPx.y - agent.py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < radius && dist > COMBAT_PARAM.GRAVITY_MIN_DIST) {
                    agent.physics.vx += (dx/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                    agent.physics.vy += (dy/dist) * COMBAT_PARAM.GRAVITY_PULL_FORCE * dt;
                    agent.moveSpeedMult = Math.min(agent.moveSpeedMult, COMBAT_PARAM.GRAVITY_SPEED_REDUCTION);
                }
            });
        });
    }
}
