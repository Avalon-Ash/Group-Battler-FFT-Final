
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
import { HUDRenderer } from "./renderers/HUDRenderer"; // Import new renderer
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
    private hudRenderer: HUDRenderer; // New renderer instance
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
        this.hudRenderer = new HUDRenderer(); // Initialize
        this.camera = new CameraSystem();
        this.eventListener = new VisualEventListener();
        this.backgroundRenderer = new BackgroundRenderer();
        this.tacticalRenderer = new TacticalRenderer();
        this.postProcessor = new PostProcessor();
        this.renderList = new RenderList();
    }

    public reset() {
        this.vfx.reset();
        this.hud.reset();
        this.camera.reset();
        this.eventListener.reset();
    }

    public setTransition(t: number, phase: 'IN' | 'OUT' | 'IDLE') {
        this.transitionT = t;
        this.transitionPhase = phase;
    }

    // --- Core Accessors ---

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
        this.camera.sync(camera); 
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 5. MAIN PASS: Collect and Sort Renderables
        this.renderList.reset();
        
        const terrainHeightFunc = (q: number, r: number) => this.grid.getTerrainHeight(q, r, engine);

        // Collect
        this.grid.submitRenderables(
            this.renderList,
            engine, hoveredHex, hoveredSkill, highlight, 
            engine.projectiles,
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

        // Sort In-Place (Now utilizing strictly logical Y for stability)
        this.renderList.sort();
        
        // Execute Draws
        for (let i = 0; i < this.renderList.count; i++) {
            const op = this.renderList.ops[i];
            
            // PIXEL SNAPPING: Strictly align all translation anchors to integer coordinates
            const snapX = Math.round(op.tx);
            const snapY = Math.round(op.ty);

            switch (op.type) {
                case RenderOpType.TERRAIN:
                    TerrainRenderer.drawBlockGeometry(
                        ctx, snapX, snapY, op.tsize, op.th, op.ttheme, op.ttype, this.globalTime
                    );
                    TerrainRenderer.drawTerrainDetail(ctx, snapX, snapY - op.th, op.tq, op.tr, op.ttype, op.tdetail);
                    GridOverlays.drawOverlays(
                        ctx, snapX, snapY - op.th, op.tsize,
                        op.oStatus, op.oDanger,
                        op.oLightCol, op.oLightInt,
                        op.oRange, op.oRangeCol, op.oHover, op.oHasUnit,
                        op.tq, op.tr, op.time,
                        op.oHazard
                    );
                    break;
                    
                case RenderOpType.OBSTACLE:
                    const sprite = SpriteManager.getObstacleSprite(op.ttype);
                    ctx.drawImage(sprite, snapX - OBSTACLE_HALF_WIDTH, snapY);
                    break;
                    
                case RenderOpType.UNIT:
                    if (op.agent) {
                        this.unit.drawAssembly(ctx, op.agent, snapX, snapY, op.time, op.uSelected, op.uSilhouette);
                    }
                    break;
                    
                case RenderOpType.DECAL:
                    const dImg = AssetManager.getBlastZone(op.dColor);
                    ctx.save();
                    ctx.translate(snapX, snapY);
                    ctx.scale(op.dScale, op.dScale);
                    ctx.globalAlpha = Math.min(1, op.dLife);
                    ctx.drawImage(dImg, -64, -32, 128, 64);
                    ctx.restore();
                    break;
                    
                case RenderOpType.VFX:
                    if (op.particle) {
                        const p = op.particle;
                        ctx.save();
                        ctx.translate(snapX, snapY);
                        
                        if (p.targetX !== undefined && p.targetY !== undefined) {
                            const origTx = p.targetX;
                            const origTy = p.targetY;
                            p.targetX = origTx - snapX;
                            p.targetY = (origTy - (p.targetZ || 0)) - snapY;
                            ParticleRenderer.drawSingleParticle(ctx, p, 0, 0, op.vProgress, op.vChaos);
                            p.targetX = origTx;
                            p.targetY = origTy;
                        } else {
                            ParticleRenderer.drawSingleParticle(ctx, p, 0, 0, op.vProgress, op.vChaos);
                        }
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

        // 7. Top VFX (Particles above everything)
        this.vfxRenderer.drawTopLayerParticles(ctx, this.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        ctx.restore(); 
        
        let transitionAberration = 0;
        if (this.transitionPhase !== 'IDLE') {
            transitionAberration = 4 * this.transitionT * (1 - this.transitionT) * 0.5;
        }

        this.postProcessor.apply(ctx, physicalWidth, physicalHeight, this.camera.getTrauma(), transitionAberration);
        
        ctx.save(); 
        this.camera.applyTransform(ctx, logicalWidth, logicalHeight);
        
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.grid, this.globalTime);
        
        // Use the new HUDRenderer
        this.hudRenderer.draw(ctx, this.hud, engine.agents, terrainHeightFunc, engine.mapConfig, highlight, this.globalTime);
        
        ctx.restore(); 

        if (engine.directorTargetId) {
            this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, this.globalTime);
        } 

        this.tacticalRenderer.drawDebug(ctx, fps);

        let blurAmount = 0;
        if (engine.isFinishing) {
            blurAmount = 1.0 - (engine.victoryTimer / VICTORY_PHASE_DURATION);
        } else if (engine.winningTeam !== null) {
            blurAmount = 1.0;
        }

        if (this.transitionPhase === 'OUT') blurAmount = 1.0; 
        else if (this.transitionPhase === 'IN') blurAmount = 1.0 - this.transitionT;

        if (blurAmount > 0) {
            this.postProcessor.applyFinishBlur(ctx, physicalWidth, physicalHeight, Math.max(0, Math.min(1, blurAmount)));
        }
    }

    private drawProjectile(ctx: CanvasRenderingContext2D, op: RenderOp) {
        // --- VECTOR BEAM REFACTOR (Moving High-Speed Projectiles) ---
        const isRay = op.pSkillVis === 'BEAM'; 
        
        if (isRay && op.pTrail && op.pTrail.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            const start = op.pTrail[op.pTrail.length - 1]; 
            const end = { x: op.pVisX, y: op.pVisY };
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx);

            // 1. Energetic Core Beam
            const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.2, op.pColor);
            grad.addColorStop(0.8, op.pColor);
            grad.addColorStop(1, '#fff');

            ctx.strokeStyle = grad;
            ctx.lineWidth = op.pIsUlt ? 6 : 3;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.moveTo(Math.round(start.x), Math.round(start.y));
            ctx.lineTo(Math.round(end.x), Math.round(end.y));
            ctx.stroke();

            // 2. Shock Rings (Mach Cones)
            if (len > 20) {
                const ringCount = Math.floor(len / 30);
                ctx.translate(start.x, start.y);
                ctx.rotate(angle);
                ctx.strokeStyle = op.pColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.6;
                
                for(let i=1; i<=ringCount; i++) {
                    const x = i * 30 - (this.globalTime * 200 % 30); 
                    if (x > 0 && x < len) {
                        ctx.beginPath();
                        ctx.ellipse(x, 0, 3, 10, 0, 0, Math.PI*2);
                        ctx.stroke();
                    }
                }
            }
            
            // 3. Bloom
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = op.pIsUlt ? 16 : 8;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.restore();
            return;
        }

        // --- STANDARD SPRITE PROJECTILE ---
        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            const trail = op.pTrail;
            ctx.moveTo(Math.round(trail[0].x), Math.round(trail[0].y));
            for(let i=1; i<trail.length; i++) {
                ctx.lineTo(Math.round(trail[i].x), Math.round(trail[i].y));
            }
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        const shadowAltitude = op.pVisShadowY - op.pVisY; 
        if (Math.abs(shadowAltitude) > 5) {
            ctx.save();
            ctx.translate(Math.round(op.pVisX), Math.round(op.pVisShadowY));
            const shadowAlpha = Math.max(0, 0.4 - Math.abs(shadowAltitude)/800);
            ctx.scale(1, 0.5); 
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(Math.round(op.pVisX), Math.round(op.pVisY));
        if (op.pSpin !== 0) ctx.rotate(op.pSpin); // Using calc spin from config
        else ctx.rotate(op.pAngle);
        
        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            let scale = 0.6;
            if (op.pIsUlt) scale = 1.0;
            ctx.scale(scale, scale);
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
}
