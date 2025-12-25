
import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "./game";
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

// Renderers & Pool
import { BackgroundRenderer } from "./renderers/background";
import { TacticalRenderer } from "./renderers/tactical";
import { RenderList, RenderOpType, RenderOp } from "./renderers/RenderList";
import { SpriteManager } from "./sprites";
import { TerrainRenderer } from "./renderers/grid/TerrainRenderer";
import { GridOverlays } from "./renderers/grid/GridOverlays";
import { AssetManager } from "./assets";
import { ParticleRenderer } from "./systems/vfx/renderers/ParticleRenderer";
import { PostProcessor } from "./renderers/PostProcessor"; 

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
    private postProcessor: PostProcessor;
    
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
        this.postProcessor = new PostProcessor();
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

    // UPDATED: Now performs proper Screen->World transform taking center pivot into account
    public getHexAtScreenPoint(mouseX: number, mouseY: number, width: number, height: number, camera: Camera, engine: GameEngine): Hex | null {
        // Center Pivot Logic (Matching ApplyTransform)
        // Screen = (World - Cam) * Zoom + Center
        // World = (Screen - Center) / Zoom + Cam
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
        // Updated Sync: Purely syncs pos/zoom, removed mapConfig args
        this.camera.sync(camera); 
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 5. MAIN PASS: Collect and Sort Renderables
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
                    // Pass globalTime to TerrainRenderer for animations
                    TerrainRenderer.drawBlockGeometry(
                        ctx, op.tx, op.ty, op.tsize, op.th, op.ttheme, op.ttype, this.globalTime
                    );
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
                        ctx.save();
                        ctx.translate(op.tx, op.ty); // Visual position
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

        // 7. Top VFX (Particles above everything, e.g. Weather or High flying magic)
        // Kept before Post-Process to allow them to glow/bloom properly.
        this.vfxRenderer.drawTopLayerParticles(ctx, this.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        // --- POST PROCESSING BARRIER (Bloom / Shake) ---
        ctx.restore(); // Exit Camera Space
        
        this.postProcessor.apply(ctx, physicalWidth, physicalHeight, this.camera.getTrauma());
        
        ctx.save(); // Prepare for UI overlays (Screen Space or World Space projection)
        
        // RE-APPLY CAMERA TRANSFORM for World-Space UI (Tactical Lines, HUD Bars)
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 8. Tactical Overlay Lines (Clean lines, no bloom/ghosting)
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.grid, this.globalTime);

        // 9. HUD (Health bars, floating text)
        // PASSED highlight Agent for Selection Glow
        this.hud.draw(ctx, engine.agents, terrainHeightFunc, engine.mapConfig, highlight, this.globalTime);

        ctx.restore(); // Exit Camera Space

        // 10. Holographic Director HUD (Screen Space)
        if (engine.directorTargetId) {
            this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, this.globalTime);
        } 

        // 11. Debug Overlay
        this.tacticalRenderer.drawDebug(ctx, fps);

        // --- FINAL PASS: FROSTED GLASS TRANSITIONS (Victory / Map Swap) ---
        // Enhanced Logic: Strict Sync
        let blurAmount = 0;
        
        if (engine.isFinishing) {
            // Ramping Up (Active Victory Phase)
            blurAmount = 1.0 - (engine.victoryTimer / VICTORY_PHASE_DURATION);
        } else if (engine.winningTeam !== null) {
            // Bridge Gap: Game finished but transition hasn't started
            blurAmount = 1.0;
        }

        // Transition Overrides
        // Logic:
        // OUT: Fade Blur In (0 -> 1) as map leaves.
        // IN: Fade Blur Out (1 -> 0) as map enters.
        if (this.transitionPhase === 'OUT') {
            // 0 -> 1
            blurAmount = this.transitionT; 
        } else if (this.transitionPhase === 'IN') {
            // 1 -> 0
            // Linear fade out to perfectly match the tile landing at t=1.0
            blurAmount = 1.0 - this.transitionT;
        }

        if (blurAmount > 0) {
            const clampedProgress = Math.max(0, Math.min(1, blurAmount));
            this.postProcessor.applyFinishBlur(ctx, physicalWidth, physicalHeight, clampedProgress);
        }
    }

    private drawProjectile(ctx: CanvasRenderingContext2D, op: RenderOp) {
        // --- 1. Draw Trail ---
        // Using the pre-calculated visual trail points in op.pTrail
        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = op.pColor;
            
            // Trail Width Logic: Tapering
            // We iterate through the visual points (Screen Space relative to map origin)
            
            // Draw the line strip
            ctx.beginPath();
            
            const trail = op.pTrail;
            if (trail.length > 0) {
                // The first point in trail array is the HEAD (newest)
                ctx.moveTo(trail[0].x, trail[0].y);
                for(let i=1; i<trail.length; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }
            }
            
            // Style: Fade out
            const grad = ctx.createLinearGradient(trail[0].x, trail[0].y, trail[trail.length-1].x, trail[trail.length-1].y);
            grad.addColorStop(0, op.pColor); // Head
            grad.addColorStop(1, 'rgba(0,0,0,0)'); // Tail
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            // Inner Core Line
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            
            ctx.restore();
        }

        // --- 2. Draw Shadow ---
        // Simple blob shadow on ground
        // We use pVisShadowY stored in op
        const shadowAltitude = op.pVisShadowY - op.pVisY; // Difference between ground and air
        
        // Don't draw shadow if too low (to avoid clipping with sprite)
        // Or if really high, shadow fades
        if (Math.abs(shadowAltitude) > 5) {
            ctx.save();
            ctx.translate(op.pVisX, op.pVisShadowY);
            // Scale shadow based on height (higher = smaller/blurrier)
            const shadowScale = Math.max(0.2, 1 - Math.abs(shadowAltitude)/600);
            const shadowAlpha = Math.max(0, 0.4 - Math.abs(shadowAltitude)/800);
            
            ctx.scale(shadowScale, shadowScale * 0.5); // Flattened ellipse
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
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
