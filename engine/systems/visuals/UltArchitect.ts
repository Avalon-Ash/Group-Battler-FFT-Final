
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { GameEngine } from "../../game";
import { Point3D, UltContext } from "./ultimates/UltTypes";
import { ULT_SCRIPTS } from "./ultimates/UltRegistry";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

export { Point3D };

export class UltArchitect {

    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        
        const script = ULT_SCRIPTS[id];
        
        if (script) {
            // Construct Context
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

            // Execute
            script(ctx);
            return true;
        }

        // Fallback for development/missing scripts
        console.warn(`UltArchitect: No script found for Ultimate ID '${id}'.`);
        return false;
    }
}
