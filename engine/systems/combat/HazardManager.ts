import { Agent, GameEngine } from "../../game";
import { Skill, SpatialHazard } from "../../../types";
import { HEX_SIZE, HAZARD_RULES } from "../../../constants";

export const HazardManager = {
    
    spawnHazard(source: Agent, cells: {q: number, r: number}[], skill: Skill, engine: GameEngine, center: {q: number, r: number}, type: SpatialHazard['type'], duration: number, onEnter?: SpatialHazard['onEnter']) {
        const pullRad = skill.aoeRadius ? skill.aoeRadius * HEX_SIZE * HAZARD_RULES.PULL_RADIUS_FACTOR : undefined;

        // [FIX] Spatial Entity Pattern: One hazard covers multiple cells, logic decoupled from grid
        const hazard: SpatialHazard = {
                id: engine.nextId('HZD'),
                type,
                cells: [...cells],
                duration,
                sourceId: source.id,
                team: source.team,
                side: source.side,
                color: skill.color,
                power: (Math.abs(skill.power) * HAZARD_RULES.DAMAGE_FACTOR) || 10,
                tickInterval: HAZARD_RULES.TICK_INTERVAL,
                lastTickTime: engine.battleTime,
                centerQ: center.q,
                centerR: center.r,
                pullRadius: pullRad,
                onEnter,
                skill: onEnter ? skill : undefined,
                triggeredIds: onEnter ? new Set<string>() : undefined,
            };

        engine.hazardSystem.registerHazard(hazard, engine);
    }
};
