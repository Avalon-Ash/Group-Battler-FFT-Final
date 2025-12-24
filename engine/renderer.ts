
import { Agent, GameEngine } from "./game";
import { HexUtils } from "./utils";
import { Hex, GameEvent, Skill } from "../types";

// Sub-systems
import { GridSystem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import { VFXRenderer } from "./systems/vfx/render";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";
import { CameraSystem, Camera } from "./systems/CameraSystem";
import { VisualEventListener } from "./systems/VisualEventListener";

// NEW Renderers & Pool
import { BackgroundRenderer } from "./renderers/background";
import { TacticalRenderer } from "./renderers/tactical";
import { RenderList, RenderOpType } from "./renderers/RenderList";
import { SpriteManager } from "./sprites";
import { TerrainRenderer } from "./renderers/grid/TerrainRenderer";
import { GridOverlays } from "./renderers/grid/GridOverlays";
import { AssetManager } from "./assets";
import { ParticleRenderer } from "./systems/vfx/renderers/ParticleRenderer";
import { Vector } from "./utils";
import { isChaosStyle } from "./systems/vfx/utils";

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
    
    // Memory Pool
    private renderList: RenderList;

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
        this.renderList = new RenderList();
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
        // Reset pool
        this.renderList.reset();
        
        const terrainHeightFunc = (q: number, r: number) => this.grid.getTerrainHeight(q, r, engine);

        // Collect
        this.grid.submitRenderables(
            this.renderList,
            engine, hoveredHex, hoveredSkill, highlight, 
            this.vfx.state.gridFlashes, engine.projectiles,
            this.transitionT, this.transitionPhase,
            this.globalTime
        );
        
        this.vfxRenderer.submitRenderables(
            this.renderList,
            engine,
            this.vfx,
            terrainHeightFunc,
            engine.mapConfig,
            this.transitionT,
            this.transitionPhase
        );
        
        this.unit.submitRenderables(
            this.renderList,
            engine.agents, 
            terrainHeightFunc, 
            this.globalTime, 
            highlight, 
            engine.mapConfig
        );

        // Sort In-Place (No allocation)
        this.renderList.sort();
        
        // Execute Draws
        for (let i = 0; i < this.renderList.count; i++) {
            const op = this.renderList.ops[i];
            
            switch (op.type) {
                case RenderOpType.TERRAIN:
                    TerrainRenderer.drawBlockGeometry(ctx, op.tx, op.ty, op.tsize, op.th, op.ttheme);
                    TerrainRenderer.drawTerrainDetail(ctx, op.tx, op.ty - op.th, op.tq, op.tr, op.ttype, op.tdetail);
                    GridOverlays.drawOverlays(
                        ctx, op.tx, op.ty - op.th, op.tsize,
                        op.oStatus, op.oDanger,
                        op.oLightCol, op.oLightInt,
                        op.oFlash, op.oRange, op.oRangeCol, op.oHover, op.oHasUnit,
                        op.tq, op.tr, op.time
                    );
                    break;
                    
                case RenderOpType.OBSTACLE:
                    const sprite = SpriteManager.getObstacleSprite(op.ttype);
                    ctx.drawImage(sprite, op.tx - OBSTACLE_HALF_WIDTH, op.ty);
                    break;
                    
                case RenderOpType.UNIT:
                    if (op.agent) {
                        this.unit.drawAssembly(ctx, op.agent, op.tx, op.ty, op.time, op.uSelected, op.uSilhouette);
                    }
                    break;
                    
                case RenderOpType.DECAL:
                    const dImg = AssetManager.getBlastZone(op.dColor);
                    ctx.save();
                    ctx.translate(op.tx, op.ty);
                    ctx.scale(op.dScale, op.dScale);
                    ctx.globalAlpha = Math.min(1, op.dLife);
                    ctx.drawImage(dImg, -64, -32, 128, 64);
                    ctx.restore();
                    break;
                    
                case RenderOpType.VFX:
                    if (op.particle) {
                        // Temp modification of particle state for drawing to match visual offset
                        // We must be careful not to mutate physics state
                        // The particle renderer expects `p.x` `p.y` to be center. 
                        // Our op.tx/ty are already the visual coordinates.
                        // We create a proxy object or just translate context
                        // ParticleRenderer.drawSingleParticle expects the object to have x,y.
                        // Let's modify the context to be at op.tx, op.ty and tell renderer we are at 0,0
                        
                        // Hack: Modifying particle temporarily is dangerous if shared
                        // Instead, ParticleRenderer should accept x,y override?
                        // Let's rely on the context translation in ParticleRenderer which uses p.x/p.y
                        // We will trick it by setting p.x/p.y to 0 and translating context ourselves.
                        
                        ctx.save();
                        ctx.translate(op.tx, op.ty); // Visual position
                        // Shadow needs to know 'z' (height from ground). passed in op.th
                        const pProxy = op.particle;
                        const originalX = pProxy.x; 
                        const originalY = pProxy.y;
                        pProxy.x = 0; pProxy.y = 0; // Relative to context
                        
                        ParticleRenderer.drawSingleParticle(ctx, pProxy, op.vProgress, op.vChaos);
                        
                        pProxy.x = originalX; pProxy.y = originalY; // Restore
                        ctx.restore();
                    }
                    break;
                    
                case RenderOpType.PROJECTILE:
                    this.drawProjectile(ctx, op);
                    break;
            }
        }

        // 6. Occlusion Pass (Silhouettes)
        const occludedAgents = this.grid.getOccludedAgents(engine);
        if (occludedAgents.length > 0) {
            ctx.save();
            occludedAgents.forEach(agent => {
                this.unit.drawSilhouette(
                    ctx, agent, 
                    terrainHeightFunc, 
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
        this.hud.draw(ctx, engine.agents, terrainHeightFunc, engine.mapConfig);

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

    private drawProjectile(ctx: CanvasRenderingContext2D, op: any) {
        // --- 1. Draw Trail ---
        const p = op.proj;
        if (p && p.trail.length > 1) {
            ctx.save();
            if (op.pSkillVis === 'ARROW') {
                ctx.beginPath();
                const tail = p.trail[0];
                // Recalculate tail pos visual? Too expensive.
                // Simplified trail for optimization: Line from start visual to head visual? 
                // No, physical trails are nicer.
                // We'll skip complex trails in the hot loop optimization for now or implement proper trail op.
                // Fallback: simple line
                ctx.moveTo(p.startX, p.startY); // This is wrong visually (no height)
                // Let's skip trail for this iteration of refactor to ensure stability
            }
            ctx.restore();
        }

        // --- 2. Draw Shadow ---
        const altitude = op.pVisShadowY - op.pVisY;
        if (altitude > 5) {
            ctx.save();
            ctx.translate(op.pVisX, op.pVisShadowY);
            const shadowScale = Math.max(0.2, 1 - altitude/400);
            ctx.scale(shadowScale, shadowScale);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // --- 3. Draw Projectile Head ---
        ctx.save();
        ctx.translate(op.pVisX, op.pVisY);
        if (op.pSkillVis === 'BOMB') ctx.rotate(op.pSpin);
        else ctx.rotate(op.pAngle);
        
        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            let scale = 0.6;
            if (op.pIsUlt) scale = 1.0;
            if (op.pSkillVis === 'BOMB' || op.pSkillVis === 'FIREBALL') scale *= 1.2;

            ctx.scale(scale, scale);
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
}
