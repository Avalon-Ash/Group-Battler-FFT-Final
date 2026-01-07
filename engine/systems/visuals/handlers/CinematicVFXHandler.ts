
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import { Point3D } from "../../../math/VisualMath";
import { SequenceSystem } from "../SequenceSystem";
import { SKILL_SEQUENCES } from "../../../../data/vfx/SkillSequences";

export class CinematicVFXHandler {

    public static handle(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        origin: Point3D, 
        target: Point3D
    ) {
        const skill = event.skill;
        if (!skill) return;

        // 1. DATA-DRIVEN ECS LOOKUP
        const sequence = SKILL_SEQUENCES[skill.id];
        
        if (sequence) {
            SequenceSystem.run(sequence, target, engine, vfx, event.sourceId);
            return;
        }

        // 2. MINIMAL FALLBACK (Prevents breaking if data entry is missing)
        if (event.type === 'VISUAL_SLASH') {
            vfx.playBeam('SLASH_CONNECT', origin, target, event.color || '#fff', 0.2);
        } else {
            vfx.playBeam('GENERIC_BEAM', origin, target, event.color || '#fff', 0.4);
        }
    }
}
