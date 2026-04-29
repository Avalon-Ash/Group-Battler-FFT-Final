
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../../../math/VisualMath";
import { UnitShatter } from "../effects/UnitShatter";

export class UnitVFXHandler {

    public static handle(event: GameEvent, engine: GameEngine, vfx: VFXSystem, camera: CameraSystem, origin: Point3D, groundZ: number) {
        
        if (event.type === 'DEATH') {
            camera.addTrauma(0.1);
            return;
        }

        if (event.type === 'SPAWN') {
            const agent = engine.agents.find(a => a.id === event.sourceId);
            const isRed = agent?.team === 1; // Team.RED is 1
            const fxId = isRed ? 'FX_SPAWN_RED' : 'FX_SPAWN_BLUE';
            vfx.playEffect(fxId, origin.x, origin.y, groundZ, event.color, groundZ);
            return;
        }

        if (event.type === 'CAST_BREAK') {
            const progress = event.value || 0.1;
            const powerScale = 0.5 + progress;

            vfx.playEffect('FX_CAST_SHATTER', origin.x, origin.y, origin.z, event.color);
            
            if (event.skill && event.skill.tag === 'ULT') {
                camera.addTrauma(0.5 * powerScale);
                vfx.playEffect('FX_HIT_GENERIC', origin.x, origin.y, origin.z, '#ffffff');
            } else {
                camera.addTrauma(0.2 * powerScale); 
            }
            return;
        }
    }
}
