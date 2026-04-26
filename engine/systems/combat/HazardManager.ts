import { Agent, GameEngine } from "../../game";
import { Skill, GroundHazard } from "../../../types";

import { HEX_SIZE } from "../../../constants";

export const HazardManager = {
    
    spawnHazards(source: Agent, cells: {q: number, r: number}[], skill: Skill, engine: GameEngine, center?: {q: number, r: number}) {
        const dur = skill.ccDur || 5.0;
        let hType: GroundHazard['type'] | null = null;
        let pullRad = skill.aoeRadius ? skill.aoeRadius * HEX_SIZE * 1.5 : undefined;

        // Map Skill Properties to Hazard Types
        if (skill.ccType === 'DOT') hType = 'POISON';
        if (skill.element === 'FIRE') hType = 'FIRE';
        if (skill.element === 'ICE') hType = 'ICE';
        if (skill.element === 'VOID' || skill.ccType === 'PULL') hType = 'GRAVITY';

        if (hType) {
            cells.forEach(tile => {
                // Corrected: Route through hazardSystem
                engine.hazardSystem.addHazard(
                    tile.q, tile.r, 
                    hType, 
                    dur, 
                    source.id, 
                    source.team, 
                    skill.color,
                    (Math.abs(skill.power) * 0.2) || 10, 
                    0.5,
                    engine,
                    center?.q,
                    center?.r,
                    pullRad
                );
            });
        }
    }
};