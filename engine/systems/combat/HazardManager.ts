import { Agent, GameEngine } from "../../game";
import { Skill } from "../../../types";

export const HazardManager = {
    
    spawnHazards(source: Agent, cells: {q: number, r: number}[], skill: Skill, engine: GameEngine) {
        const dur = skill.ccDur || 5.0;
        let hType: any = null;

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
                    engine 
                );
            });
        }
    }
};