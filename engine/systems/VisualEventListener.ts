
import { GameEngine } from "../game";
import { GameEvent } from "../../types";

// Systems
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "./grid";
import { CameraSystem } from "./CameraSystem";

// Mappers
import { EventHUDMapper } from "./visuals/EventHUDMapper";
import { EventVFXMapper } from "./visuals/EventVFXMapper";

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
            // 1. UI Layer
            this.hudMapper.process(event, engine, hud, grid, camera);
            
            // 2. VFX Layer
            this.vfxMapper.process(event, engine, vfx, grid, camera);
        });
    }
}
