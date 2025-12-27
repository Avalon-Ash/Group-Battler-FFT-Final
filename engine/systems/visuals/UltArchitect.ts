
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { GameEngine } from "../../game";
import { CovenantUltDirector } from "./directors/CovenantUltDirector";
import { ImperialUltDirector } from "./directors/ImperialUltDirector";

// Re-export Point3D for Directors
export interface Point3D { x: number; y: number; z: number; }

export class UltArchitect {

    /**
     * Main Entry Point for Ultimate Visuals.
     * Routes the request to the appropriate Faction Director based on Skill ID.
     */
    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        
        // 1. Check for Covenant Director (Red Faction)
        // Handles IDs starting with tr_, wr_, rr_, mr_, sr_ (mostly)
        if (CovenantUltDirector.play(id, target, engine, vfx, grid, camera, sourceId)) {
            return true;
        }

        // 2. Check for Imperial Director (Blue Faction)
        // Handles IDs starting with tb_, wb_, rb_, mb_, sb_ (mostly)
        if (ImperialUltDirector.play(id, target, engine, vfx, grid, camera, sourceId)) {
            return true;
        }

        // If neither director handled it, we return false.
        // The fallback logic has been moved INTO the Directors to ensure strict style consistency.
        console.warn(`UltArchitect: No director handled Ultimate ID '${id}'. Visuals may be missing.`);
        return false;
    }
}
