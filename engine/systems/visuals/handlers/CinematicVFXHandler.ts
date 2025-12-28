
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import { GridSystem } from "../../grid";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../EventVFXMapper";
import { UltArchitect } from "../UltArchitect";
import { SkillArchitect } from "../SkillArchitect";
import { UNIT_BODY_OFFSET } from "../../../../constants";

export class CinematicVFXHandler {

    public static handle(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem, 
        origin: Point3D, 
        target: Point3D
    ) {
        const skill = event.skill;
        if (!skill) return;

        // 1. Try Ult Script
        if (skill.tag === 'ULT') {
             if (UltArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;
        }
        
        // 2. Try Skill Script
        if (SkillArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;

        // 3. Fallback (If no script found)
        if (event.type === 'VISUAL_SLASH') {
            vfx.playBeam('SLASH_CONNECT', origin, target, event.color || '#fff', 0.2);
        } else {
            vfx.playBeam('GENERIC_BEAM', origin, target, event.color || '#fff', 0.4);
            // Pass origin.z - UNIT_BODY_OFFSET as approximate groundZ if needed
            // But generic hit is handled by CombatHandler usually. 
            // This is just the BEAM part.
        }
    }
}
