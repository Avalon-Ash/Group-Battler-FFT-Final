import { GameEngine } from "../game";
import { GameEvent } from "../../types";
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "./grid";
import { CameraSystem } from "./CameraSystem";
import { SequenceSystem } from "./visuals/SequenceSystem";
import { EventHUDMapper } from "./visuals/EventHUDMapper";
import { EventVFXMapper } from "./visuals/EventVFXMapper";
import { VisualMath } from "../math/VisualMath";
import { SKILL_SEQUENCES } from "../../data/vfx/SkillSequences";
export class VisualEventListener {
    private hudMapper: EventHUDMapper;
    private vfxMapper: EventVFXMapper;
    constructor() {
        this.hudMapper = new EventHUDMapper();
        this.vfxMapper = new EventVFXMapper();
    }
    public reset() { this.hudMapper.reset(); }
    public process(
        events: GameEvent[], 
        engine: GameEngine, 
        vfx: VFXSystem, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        events.forEach(event => {
            this.hudMapper.process(event, engine, hud, grid, camera);
            if (event.type === 'CAST_START' && event.skill) {
                const sequence = SKILL_SEQUENCES[event.skill.id];
                if (sequence) {
                    const target3D = VisualMath.resolveTargetPoint(event.targetId || "", engine);
                    if (target3D.z < -9000) {
                        target3D.x = event.pos.x;
                        target3D.y = event.pos.y;
                        target3D.z = grid.getTerrainHeight(0, 0, engine) + 20; 
                    }
                    SequenceSystem.run(sequence, target3D, engine, vfx, event.sourceId);
                    return; 
                }
            }
            this.vfxMapper.process(event, engine, vfx, grid, camera);
        });
    }
}