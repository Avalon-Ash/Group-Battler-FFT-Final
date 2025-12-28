
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
    
    // Sub-systems
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
        
        // Initialize Pipeline
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

    // --- Core Accessors ---

    public getTerrainHeight(q: number, r: number, engine: GameEngine): number {
        return this.grid.getTerrainHeight(q, r, engine);
    }

    public getHexAtScreenPoint(mouseX: number, mouseY: number, width: number, height: number, camera: Camera, engine: GameEngine): Hex | null {
        // Delegate to GridSystem directly or Pipeline utility? 
        // Keeping logic here for now as it's a utility function used by Input.
        const cx = width / 2;
        const cy = height / 2;
        
        const wx = (mouseX - cx) / camera.zoom + camera.x;
        const wy = (mouseY - cy) / camera.zoom + camera.y;
        
        return this.grid.getHexAtWorldPoint(wx, wy, engine);
    }

    // --- Update Loop ---

    public update(dt: number, engine: GameEngine): void {
        this.globalTime += dt;
        this.camera.update(dt);
        this.pipeline.update(dt, engine); // Ticks tactical effects
        
        // Pre-calc terrain lookups for VFX logic? 
        // Currently VFXSystem asks for it via callback.
        
        // Use GridSystem's cache if possible
        // Note: We need a way to pass getTerrainHeight efficiently without closure creation every frame?
        // Actually, creating the closure `(x,y) => ...` is cheap. The lookup inside is the cost.
        // GridSystem now caches tiles, so it's relatively fast.
        
        // const getTerrainHeightPx = (x: number, y: number) => {
        //     const hex = HexUtils.fromPx(x, y, engine.mapConfig);
        //     return this.grid.getTerrainHeight(hex.q, hex.r, engine);
        // };
        // Moved this logic to RenderPipeline or keep in VFXSystem update?
        // VFXSystem update is called here.
        
        // OPTIMIZATION: Pass the GridSystem method directly if signature matches or wrap once.
        this.vfx.update(dt, this.globalTime, engine.currentScene.ambientType, 
            (x, y) => this.grid.getTerrainHeight(
                // Inline approximate hex calc for speed? Or use utils.
                // Using GridSystem.getHexAtWorldPoint might be overkill.
                // Let's stick to the callback for now, optimization in VFXPhysics.
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

    // --- Main Rendering Loop ---

    public draw(
        ctx: CanvasRenderingContext2D, 
        engine: GameEngine, 
        camera: Camera, 
        highlight: Agent | null, 
        fps: number, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null
    ): void {
        // Delegate to Pipeline
        this.pipeline.draw(ctx, engine, camera, highlight, fps, hoveredHex, hoveredSkill, this.globalTime);
    }
}
