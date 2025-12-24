
import { Agent, GameEngine } from "./game";
import { HexUtils } from "./utils";
import { Hex, GameEvent, Skill } from "../types";

// Sub-systems
import { GridSystem, RenderableItem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import { VFXRenderer } from "./systems/vfx/render";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";
import { CameraSystem, Camera } from "./systems/CameraSystem";
import { VisualEventListener } from "./systems/VisualEventListener";

// NEW Renderers
import { BackgroundRenderer } from "./renderers/background";
import { TacticalRenderer } from "./renderers/tactical";

export { Camera };

export class GameRenderer {
    public globalTime: number = 0;
    
    // Sub-systems
    public grid: GridSystem;
    public vfx: VFXSystem;
    private vfxRenderer: VFXRenderer;
    public unit: UnitRenderSystem;
    public hud: HUDSystem;
    public camera: CameraSystem;
    private eventListener: VisualEventListener;
    
    private backgroundRenderer: BackgroundRenderer;
    private tacticalRenderer: TacticalRenderer;

    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';

    constructor() {
        this.grid = new GridSystem();
        this.vfx = new VFXSystem();
        this.vfxRenderer = new VFXRenderer();
        this.unit = new UnitRenderSystem();
        this.hud = new HUDSystem();
        this.camera = new CameraSystem();
        this.eventListener = new VisualEventListener();
        this.backgroundRenderer = new BackgroundRenderer();
        this.tacticalRenderer = new TacticalRenderer();
    }

    public setTransition(t: number, phase: 'IN' | 'OUT' | 'IDLE') {
        this.transitionT = t;
        this.transitionPhase = phase;
    }

    // --- Core Accessors ---

    public getTerrainHeight(q: number, r: number, engine: GameEngine): number {
        return this.grid.getTerrainHeight(q, r, engine);
    }

    public getHexAtScreenPoint(mouseX: number, mouseY: number, camera: Camera, engine: GameEngine): Hex | null {
        return this.grid.getHexAtScreenPoint(mouseX, mouseY, camera, engine);
    }

    // --- Update Loop ---

    public update(dt: number, engine: GameEngine): void {
        this.globalTime += dt;
        this.camera.update(dt);
        this.tacticalRenderer.update(dt, engine);
        
        const getTerrainHeightPx = (x: number, y: number) => {
            const hex = HexUtils.fromPx(x, y, engine.mapConfig);
            return this.grid.getTerrainHeight(hex.q, hex.r, engine);
        };

        this.vfx.update(dt, this.globalTime, engine.currentScene.ambientType, getTerrainHeightPx);
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
        // High-DPI Handling
        const physicalWidth = ctx.canvas.width;
        const physicalHeight = ctx.canvas.height;
        
        if (physicalWidth === 0 || physicalHeight === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = physicalWidth / dpr;
        const logicalHeight = physicalHeight / dpr;

        const scene = engine.currentScene;

        // 1. Reset & Clear
        ctx.resetTransform();
        ctx.clearRect(0, 0, physicalWidth, physicalHeight);

        // 2. Apply Global Scale
        ctx.scale(dpr, dpr);

        // 3. Background
        this.backgroundRenderer.draw(ctx, logicalWidth, logicalHeight, scene, engine.mapConfig, this.globalTime);

        // 4. Camera Transform
        ctx.save();
        this.camera.sync(camera);
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 5. MAIN PASS: Collect and Sort Renderables
        // Logic: All sub-systems return standard RenderableItems.
        // We aggregate them into a single list and Z-Sort them.
        let renderList: RenderableItem[] = [];
        
        // Grid + Obstacles
        renderList.push(...this.grid.collectRenderables(
            engine, hoveredHex, hoveredSkill, highlight, 
            this.vfx.state.gridFlashes, engine.projectiles,
            this.transitionT, this.transitionPhase,
            this.globalTime
        ));
        
        // VFX (Ground/Physical)
        renderList.push(...this.vfxRenderer.collectRenderables(
            engine,
            this.vfx,
            (q, r) => this.grid.getTerrainHeight(q, r, engine),
            engine.mapConfig,
            this.transitionT,
            this.transitionPhase
        ));
        
        // Units
        renderList.push(...this.unit.collectRenderables(
            engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), this.globalTime, highlight, engine.mapConfig
        ));

        // Sorting: Y-Sort primarily, Z-Index secondarily
        renderList.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 2) return a.z - b.z;
            // Hack for "Always Top" layers (z > 50)
            if (a.z > 50 && b.z <= 50) return 1; 
            if (b.z > 50 && a.z <= 50) return -1;
            return a.y - b.y;
        });
        
        renderList.forEach(item => item.draw(ctx));

        // 6. Occlusion Pass (Silhouettes)
        const occludedAgents = this.grid.getOccludedAgents(engine);
        if (occludedAgents.length > 0) {
            ctx.save();
            occludedAgents.forEach(agent => {
                this.unit.drawSilhouette(
                    ctx, agent, 
                    (q, r) => this.grid.getTerrainHeight(q, r, engine), 
                    this.globalTime,
                    engine.mapConfig
                );
            });
            ctx.restore();
        }

        // 7. Tactical Overlay Lines
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.grid, this.globalTime);

        // 8. Top VFX (Particles above everything)
        this.vfxRenderer.drawTopLayerParticles(ctx, this.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        // 9. HUD (Health bars, floating text)
        this.hud.draw(ctx, engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), engine.mapConfig);

        // 10. Holographic Director HUD (Screen Space)
        if (engine.directorTargetId) {
            ctx.restore(); // Exit Camera Space
            this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, this.globalTime);
            ctx.save(); // Dummy save to match restore below
        } else {
            ctx.restore();
            ctx.save();
        }

        // 11. Post Processing & Debug
        ctx.restore(); 
        this.camera.applyPostProcessing(ctx, logicalWidth, logicalHeight);
        this.tacticalRenderer.drawDebug(ctx, fps);
    }
}
