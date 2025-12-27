
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { GameEngine } from "../../game";
import { Point3D, UltContext } from "./ultimates/UltTypes";
import { SKILL_SCRIPTS } from "./skills/SkillVisuals";
import { UNIT_BODY_OFFSET } from "../../../constants";

export class SkillArchitect {

    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        
        const script = SKILL_SCRIPTS[id];
        
        if (script) {
            let sourcePos: Point3D | undefined;
            if (sourceId) {
                const srcAgent = engine.agents.find(a => a.id === sourceId);
                if (srcAgent) {
                    const h = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
                    sourcePos = {
                        x: srcAgent.px,
                        y: srcAgent.py,
                        z: h + srcAgent.physics.z + UNIT_BODY_OFFSET
                    };
                }
            }

            const ctx: UltContext = {
                engine,
                vfx,
                grid,
                camera,
                target,
                sourceId,
                sourcePos
            };

            script(ctx);
            return true;
        }
        return false;
    }
}
