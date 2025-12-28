
import { Agent, GameEngine } from "./game";
import { Hex, GameEvent, Skill } from "../types";

// Sub-systems
import { GridSystem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import { VFXRenderer } from "./systems/vfx/render";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";
import { CameraSystem, Camera } from "./systems/CameraSystem";
import { VisualEventListener } from "./systems/VisualEventListener";

// Renderers & Pipeline
import { RenderPipeline } from "./renderers/RenderPipeline";
import { StatusOrchestrator } from "./renderers/status/StatusOrchestrator"; 

export { Camera };

export class GameRenderer {
    public globalTime: number = 0;
    
    // Sub-systems (Context Holders)
    public grid: GridSystem;
    public vfx: VFXSystem;
    public vfxRenderer: VFXRenderer;
    public unit: UnitRenderSystem;
    public statusOrchestrator: StatusOrchestrator;
    public hud: HUDSystem;
    public camera: CameraSystem;
    
    // Logic
    private eventListener: VisualEventListener;
    private pipeline: RenderPipeline;

    constructor() {
        this.grid = new GridSystem();
        this.vfx = new VFXSystem();
        this.vfxRenderer = new VFXRenderer();
        this.unit = new UnitRenderSystem();
        this.statusOrchestrator = new StatusOrchestrator(); 
        this.hud = new HUDSystem();
        this.camera = new CameraSystem();
        this.eventListener = new VisualEventListener();
        
        // Initialize Pipeline (The Draw Loop Logic)
        this.pipeline = new RenderPipeline(this);
    }

    public reset() {
        this.vfx.reset();
        this.hud.reset();
        this.camera.reset();
        this.eventListener.reset();
    }

    public setTransition(t: number, phase: 'IN' | 'OUT' | 'IDLE') {
        this.pipeline.setTransition(t, phase);
    }

    // --- Core Accessors (Delegated) ---

    public getTerrainHeight(q: number, r: number, engine: GameEngine): number {
        return this.grid.getTerrainHeight(q, r, engine);
    }

    public getHexAtScreenPoint(mouseX: number, mouseY: number, width: number, height: number, camera: Camera, engine: GameEngine): Hex | null {
        const cx = width / 2;
        const cy = height / 2;
        const wx = (mouseX - cx) / camera.zoom + camera.x;
        const wy = (mouseY - cy) / camera.zoom + camera.y;
        return this.grid.getHexAtWorldPoint(wx, wy, engine);
    }

    // --- Update Loop (Logic) ---

    public update(dt: number, engine: GameEngine): void {
        this.globalTime += dt;
        this.camera.update(dt);
        this.pipeline.update(dt, engine); 
        
        // Update VFX with a terrain lookup closure
        this.vfx.update(dt, this.globalTime, engine.currentScene.ambientType, 
            (x, y) => this.grid.getTerrainHeight(
                this.grid.getHexAtWorldPoint(x, y, engine)?.q || 0,
                this.grid.getHexAtWorldPoint(x, y, engine)?.r || 0,
                engine
            )
        );
        this.hud.update(dt);
    }

    public processEventsWithEngine(events: GameEvent[], engine: GameEngine): void {
        this.eventListener.process(
            events, 
            engine, 
            this.vfx, 
            this.hud, 
            this.grid, 
            this.camera
        );
    }

    // --- Main Rendering Loop (Delegated) ---

    public draw(
        ctx: CanvasRenderingContext2D, 
        engine: GameEngine, 
        camera: Camera, 
        highlight: Agent | null, 
        fps: number, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null
    ): void {
        this.pipeline.draw(ctx, engine, camera, highlight, fps, hoveredHex, hoveredSkill, this.globalTime);
    }
}
