import { Agent, GameEngine } from "../../game";
import { Skill, SpatialHazard } from "../../../types";
import { HEX_SIZE } from "../../../constants";

export const HazardManager = {
    
    spawnHazards(source: Agent, cells: {q: number, r: number}[], skill: Skill, engine: GameEngine, center?: {q: number, r: number}) {
        const dur = skill.ccDur || 5.0;
        let hType: SpatialHazard['type'] | null = null;
        let pullRad = skill.aoeRadius ? skill.aoeRadius * HEX_SIZE * 1.5 : undefined;

        // Map Skill Properties to Hazard Types
        if (skill.ccType === 'DOT') hType = 'POISON';
        if (skill.element === 'FIRE') hType = 'FIRE';
        if (skill.element === 'ICE') hType = 'ICE';
        if (skill.element === 'VOID' || skill.ccType === 'PULL') hType = 'GRAVITY';

        if (hType) {
            // [FIX] Spatial Entity Pattern: One hazard covers multiple cells, logic decoupled from grid
            const hazard: SpatialHazard = {
                id: engine.nextId('HZD'),
                type: hType,
                cells: [...cells],
                duration: dur,
                sourceId: source.id,
                team: source.team,
                color: skill.color,
                power: (Math.abs(skill.power) * 0.2) || 10,
                tickInterval: 0.5,
                lastTickTime: engine.battleTime,
                centerQ: center?.q,
                centerR: center?.r,
                pullRadius: pullRad
            };

            engine.hazardSystem.registerHazard(hazard, engine);
        }
    }
};
