
import { Agent, GameEngine } from "./game";
import { Hex, GameEvent, Skill } from "../types";
import { GridSystem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import { VFXRenderer } from "./systems/vfx/render";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";
import { CameraSystem } from "./systems/CameraSystem";
import type { Camera } from "./systems/CameraSystem";
import { VisualEventListener } from "./systems/VisualEventListener";
import { RenderPipeline } from "./renderers/RenderPipeline";
import { StatusOrchestrator } from "./renderers/status/StatusOrchestrator"; 
import { SequenceSystem } from "./systems/visuals/SequenceSystem"; 

export { Camera };

export class GameRenderer {
    public grid: GridSystem = new GridSystem();
    public vfx: VFXSystem = new VFXSystem();
    public vfxRenderer: VFXRenderer = new VFXRenderer();
    public unit: UnitRenderSystem = new UnitRenderSystem();
    public statusOrchestrator: StatusOrchestrator = new StatusOrchestrator(); 
    public hud: HUDSystem = new HUDSystem();
    public camera: CameraSystem = new CameraSystem();
    private eventListener: VisualEventListener = new VisualEventListener();
    private pipeline: RenderPipeline = new RenderPipeline(this);
    
    private boundEngine: GameEngine | null = null;

    // Decoupling: Explicit binding allows us to subscribe to events
    public bind(engine: GameEngine) {
        if (this.boundEngine === engine) return;
        
        // Unbind previous if exists
        if (this.boundEngine) {
            this.boundEngine.bus.off('GAME_RESET', this.handleReset);
            this.boundEngine.bus.off('GAME_CLEAR', this.handleReset);
            this.boundEngine.bus.off('ENV_UPDATE', this.handleReset);
            this.boundEngine.bus.off('CAMERA_SHAKE', this.handleShake);
            this.boundEngine.bus.off('CAMERA_MOVE', this.handleCameraMove);
        }

        this.boundEngine = engine;
        
        // Bind new
        this.boundEngine.bus.on('GAME_RESET', this.handleReset);
        this.boundEngine.bus.on('GAME_CLEAR', this.handleReset);
        this.boundEngine.bus.on('ENV_UPDATE', this.handleReset);
        this.boundEngine.bus.on('CAMERA_SHAKE', this.handleShake);
        this.boundEngine.bus.on('CAMERA_MOVE', this.handleCameraMove);
    }

    private handleReset = () => {
        this.reset();
    }

    private handleShake = (data: { intensity: number }) => {
        this.camera.addTrauma(data.intensity);
    }

    private handleCameraMove = (data: { x: number, y: number, zoom: number }) => {
        this.camera.setDirectorTarget(data.x, data.y, data.zoom);
    }

    public reset() {
        this.vfx.reset();
        this.hud.reset();
        this.camera.reset();
        this.eventListener.reset();
        this.grid.reset(); 
    }

    public setTransitionPhase(phase: 'IN' | 'OUT' | 'IDLE') { 
        this.pipeline.setTransitionPhase(phase); 
    }
    
    public getTerrainHeight(q: number, r: number, engine: GameEngine): number { return this.grid.getTerrainHeight(q, r, engine); }
    
    public getHexAtScreenPoint(mouseX: number, mouseY: number, width: number, height: number, camera: Camera, engine: GameEngine): Hex | null {
        const cx = width / 2, cy = height / 2;
        const wx = (mouseX - cx) / camera.zoom + camera.x;
        const wy = (mouseY - cy) / camera.zoom + camera.y;
        return this.grid.getHexAtWorldPoint(wx, wy, engine);
    }

    public update(dt: number, engine: GameEngine, externalCameraRef?: any): void {
        // 1. Camera Update (Always RealTime for smoothness)
        this.camera.update(dt);
        
        if (externalCameraRef?.current) {
            externalCameraRef.current.x = this.camera.x;
            externalCameraRef.current.y = this.camera.y;
        }

        // 2. SSOT Time Calculation
        // Simulation Time Delta = Real DT * TimeScale (0 if paused)
        const simDt = engine.isRunning ? dt * engine.timeScale : 0;
        const battleTime = engine.battleTime; // SSOT from Logic

        // 3. Sequence System (Logic Driven)
        SequenceSystem.update(engine, this.vfx);

        // 4. Render Pipeline (Transitions)
        this.pipeline.update(dt, engine); 
        
        // 5. VFX System (Time Dilation Applied)
        // Ambience and Particles now move in sync with game speed (Bullet Time ready)
        // NEW: Pass 'engine' so VFXSystem can read Agent states for dust/status effects
        this.vfx.update(
            simDt, 
            battleTime, 
            engine.currentScene.ambientType, 
            (x, y) => this.grid.getTerrainHeight(
                this.grid.getHexAtWorldPoint(x, y, engine)?.q || 0,
                this.grid.getHexAtWorldPoint(x, y, engine)?.r || 0,
                engine
            ),
            engine 
        );

        // 6. HUD System (Always RealTime, UI should not freeze)
        this.hud.update(dt);
    }

    public processEventsWithEngine(events: GameEvent[], engine: GameEngine): void { this.eventListener.process(events, engine, this.vfx, this.hud, this.grid, this.camera); }
    
    public draw(ctx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, fps: number, hoveredHex: Hex | null, hoveredSkill: Skill | null, battleTime: number, realTime: number): void {
        this.pipeline.draw(ctx, engine, camera, highlight, fps, hoveredHex, hoveredSkill, battleTime, realTime);
    }
}
