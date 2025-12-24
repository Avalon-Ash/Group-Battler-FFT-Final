
import { Agent, GameEngine } from "./game";
import { HexUtils } from "./utils";
import { SpriteManager } from "./sprites";
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

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 95; 
const OBSTACLE_HALF_WIDTH = 40; 

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
        // Canvas dimensions are PHYSICAL (e.g. 2000px wide for a 1000px screen on Retina)
        const physicalWidth = ctx.canvas.width;
        const physicalHeight = ctx.canvas.height;
        
        // Zero-dimension Safety Guard
        if (physicalWidth === 0 || physicalHeight === 0) return;

        const dpr = window.devicePixelRatio || 1;
        // Logical dimensions are what the game logic thinks the screen size is
        const logicalWidth = physicalWidth / dpr;
        const logicalHeight = physicalHeight / dpr;

        const scene = engine.currentScene;
        const defaultStyle = scene.obstacleStyle || 'WALL'; 

        // 1. Reset & Clear (Use Physical coords to clear everything)
        ctx.resetTransform();
        ctx.clearRect(0, 0, physicalWidth, physicalHeight);

        // 2. Apply Global Scale for High-DPI
        // All subsequent drawing calls can assume logical coordinates
        ctx.scale(dpr, dpr);

        // 3. Background (Draws in Logical Coords)
        this.backgroundRenderer.draw(ctx, logicalWidth, logicalHeight, scene, engine.mapConfig, this.globalTime);

        // 4. Camera Transform
        ctx.save();
        this.camera.sync(camera);
        // Pass LOGICAL dimensions to camera centering logic
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 5. MAIN PASS: Collect and Sort Renderables
        let renderList: RenderableItem[] = [];
        
        renderList.push(...this.grid.collectRenderables(
            engine, hoveredHex, hoveredSkill, highlight, 
            this.vfx.state.gridFlashes, engine.projectiles,
            this.transitionT, this.transitionPhase,
            this.globalTime
        ));
        
        renderList.push(...this.vfxRenderer.collectRenderables(
            engine,
            this.vfx,
            (q, r) => this.grid.getTerrainHeight(q, r, engine),
            engine.mapConfig,
            this.transitionT,
            this.transitionPhase
        ));
        
        renderList.push(...this.unit.collectRenderables(
            engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), this.globalTime, highlight, engine.mapConfig
        ));

        // Obstacles
        engine.obstacles.forEach((type, key) => {
             const [q, r] = key.split(',').map(Number);
             const pos = HexUtils.toPx(q, r, engine.mapConfig);
             
             let visualY = pos.y;
             if (this.transitionPhase !== 'IDLE') {
                 const centerQ = Math.floor(engine.mapConfig.w / 2);
                 const centerR = Math.floor(engine.mapConfig.h / 2);
                 const dist = Math.sqrt((q - centerQ)**2 + (r - centerR)**2);
                 const maxDist = Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2;
                 const d = dist / maxDist;
                 
                 if (this.transitionPhase === 'OUT') {
                    const trigger = d * 0.3;
                    if (this.transitionT > trigger) {
                        const fallT = Math.min(1, (this.transitionT - trigger) * 2.5);
                        visualY += fallT * fallT * fallT * 1000;
                    }
                 } else if (this.transitionPhase === 'IN') {
                    const trigger = d * 0.3;
                    const riseT = Math.max(0, Math.min(1, (this.transitionT - trigger) * 2.5));
                    const easedRise = 1 - Math.pow(1 - riseT, 3);
                    visualY += (1 - easedRise) * 1000;
                 }
             }

             if (visualY < pos.y + 800) {
                 const terrainH = this.grid.getTerrainHeight(q, r, engine);
                 renderList.push({
                     y: visualY, z: OBSTACLE_Z_INDEX,
                     draw: (c) => {
                         const sprite = SpriteManager.getObstacleSprite(type || defaultStyle);
                         c.drawImage(sprite, pos.x - OBSTACLE_HALF_WIDTH, visualY - terrainH - OBSTACLE_ANCHOR_Y);
                     }
                 });
             }
        });

        renderList.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 2) return a.z - b.z;
            if (a.z > 50 && b.z <= 50) return 1; 
            if (b.z > 50 && a.z <= 50) return -1;
            return a.y - b.y;
        });
        
        renderList.forEach(item => item.draw(ctx));

        // 6. Occlusion Pass
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

        // 8. Top VFX
        this.vfxRenderer.drawTopLayerParticles(ctx, this.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        // 9. HUD
        this.hud.draw(ctx, engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), engine.mapConfig);

        // 10. Holographic Director HUD
        if (engine.directorTargetId) {
            ctx.restore(); // Undo Camera
            // Tactical HUD draws in Screen Space (Logical)
            this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, this.globalTime);
            ctx.save(); // Restore dummy state for symmetric restore below
        } else {
            ctx.restore();
            ctx.save();
        }

        // 11. Post Processing
        ctx.restore(); // Ensure we are in Screen Space (but still Scaled by DPR)
        this.camera.applyPostProcessing(ctx, logicalWidth, logicalHeight);

        // 12. Debug Overlay
        this.tacticalRenderer.drawDebug(ctx, fps);
    }
}
