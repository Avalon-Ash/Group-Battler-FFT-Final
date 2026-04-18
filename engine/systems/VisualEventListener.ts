
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
import { HexUtils } from "../utils";

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
        camera: CameraSystem,
        sequences: SequenceSystem
    ) {
        events.forEach(event => {
            this.hudMapper.process(event, engine, hud, grid, camera);
            if (event.type === 'CAST_START' && event.skill) {
                const sequence = SKILL_SEQUENCES[event.skill.id];
                if (sequence) {
                    const target3D = VisualMath.resolveTargetPoint(event.targetId || "", engine, event.pos);
                    
                    // SSOT FIX: If target is ground (no unit ID or generic), ensure correct Z
                    if (!event.targetId || event.targetId.startsWith('ground-')) {
                        const posX = event.pos?.x ?? 0;
                        const posY = event.pos?.y ?? 0;
                        target3D.x = posX;
                        target3D.y = posY;
                        
                        // Fix: Use event position to find hex and get terrain height
                        const hex = HexUtils.fromPx(posX, posY, engine.mapConfig);
                        target3D.z = engine.getTerrainHeight(hex.q, hex.r) + 5; // Add bias to prevent ground clipping
                    }
                    
                    // Final sanity check: if coordinates are NaN, discard sequence
                    if (isNaN(target3D.x) || isNaN(target3D.y)) return;
                    
                    sequences.run(sequence, target3D, engine, vfx, event.sourceId);
                    return; 
                }
            }
            this.vfxMapper.process(event, engine, vfx, grid, camera, sequences);
        });
    }
}
