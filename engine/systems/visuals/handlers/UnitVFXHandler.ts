
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../../game";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../EventVFXMapper";
import { UnitShatter } from "../effects/UnitShatter";

export class UnitVFXHandler {

    public static handle(event: GameEvent, engine: GameEngine, vfx: VFXSystem, camera: CameraSystem, origin: Point3D, groundZ: number) {
        
        if (event.type === 'DEATH') {
            const dAgent = engine.agents.find(a => a.id === event.sourceId);
            if (dAgent) {
                // Death occurs at body center
                UnitShatter.spawn(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
            }
            camera.addTrauma(0.1);
            return;
        }

        if (event.type === 'SPAWN') {
            // Teleport is a floor-to-sky effect, verify groundZ
            vfx.playEffect('FX_TELEPORT', origin.x, origin.y, groundZ, event.color, groundZ);
            return;
        }

        if (event.type === 'CAST_BREAK') {
            vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
            if (event.skill && event.skill.tag === 'ULT') {
                camera.addTrauma(0.4);
            } else {
                camera.addTrauma(0.15); 
            }
            return;
        }
    }
}
