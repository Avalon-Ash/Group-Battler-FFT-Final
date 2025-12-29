
import { GameEngine } from "../game";
import { GameEvent } from "../../types";

// Systems
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "./grid";
import { CameraSystem } from "./CameraSystem";
import { SequenceSystem } from "./visuals/SequenceSystem";

// Mappers & Math
import { EventHUDMapper } from "./visuals/EventHUDMapper";
import { EventVFXMapper } from "./visuals/EventVFXMapper";
import { VisualMath } from "../math/VisualMath";

// Data
import { SKILL_SEQUENCES } from "../../data/vfx/SkillSequences";

export class VisualEventListener {
    private hudMapper: EventHUDMapper;
    private vfxMapper: EventVFXMapper;

    constructor() {
        this.hudMapper = new EventHUDMapper();
        this.vfxMapper = new EventVFXMapper();
    }
    
    public reset() {
        this.hudMapper.reset();
    }

    public process(
        events: GameEvent[], 
        engine: GameEngine, 
        vfx: VFXSystem, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        events.forEach(event => {
            // 1. UI Layer (Damage numbers, etc.)
            this.hudMapper.process(event, engine, hud, grid, camera);
            
            // 2. DATA-DRIVEN VFX SEQUENCE TRIGGER
            if (event.type === 'CAST_START' && event.skill) {
                const sequence = SKILL_SEQUENCES[event.skill.id];
                if (sequence) {
                    // Resolve exact 3D target point using global VisualMath truth
                    const target3D = VisualMath.resolveTargetPoint(event.targetId || "", engine);
                    
                    // Fallback for ground targeting if targetId is empty or invalid
                    if (target3D.z < -9000) {
                        target3D.x = event.pos.x;
                        target3D.y = event.pos.y;
                        target3D.z = grid.getTerrainHeight(0, 0, engine) + 20; 
                    }

                    SequenceSystem.run(sequence, target3D, engine, vfx, event.sourceId);
                    return; 
                }
            }

            // 3. Fallback to atomic mappers (Impact particles, Deaths)
            this.vfxMapper.process(event, engine, vfx, grid, camera);
        });
    }
}
