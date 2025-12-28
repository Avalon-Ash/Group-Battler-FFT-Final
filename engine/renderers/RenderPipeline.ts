
import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "../game";
import { Camera, GameRenderer } from "../renderer"; 
import { Hex, Skill } from "../../types";
import { HexUtils } from "../utils";

// Sub-renderers
import { BackgroundRenderer } from "./background";
import { TacticalRenderer } from "./tactical";
import { HUDRenderer } from "./HUDRenderer";
import { PostProcessor } from "./PostProcessor"; 
import { RenderList, RenderOpType } from "./RenderList";
import { ProjectileDrawer } from "./ProjectileDrawer";

// Painters
import { TerrainRenderer } from "./grid/TerrainRenderer";
import { GridOverlays } from "./grid/GridOverlays";
import { ParticleRenderer } from "../systems/vfx/renderers/ParticleRenderer";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { ENV_ANCHOR_X, ENV_ANCHOR_Y } from "../graphics/EnvironmentFactory";

export class RenderPipeline {
    private renderer: GameRenderer;
    
    private backgroundRenderer: BackgroundRenderer;
    private tacticalRenderer: TacticalRenderer;
    private hudRenderer: HUDRenderer;
    private postProcessor: PostProcessor;
    private renderList: RenderList;

    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';

    constructor(renderer: GameRenderer) {
        this.renderer = renderer;
        this.backgroundRenderer = new BackgroundRenderer();
        this.tacticalRenderer = new TacticalRenderer();
        this.hudRenderer = new HUDRenderer();
        this.postProcessor = new PostProcessor();
        this.renderList = new RenderList();
    }

    public setTransition(t: number, phase: 'IN' | 'OUT' | 'IDLE') {
        this.transitionT = t;
        this.transitionPhase = phase;
    }

    public update(dt: number, engine: GameEngine) {
        this.tacticalRenderer.update(dt, engine);
    }

    public draw(
        ctx: CanvasRenderingContext2D, 
        engine: GameEngine, 
        camera: Camera, 
        highlight: Agent | null, 
        fps: number, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null,
        globalTime: number
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
        this.backgroundRenderer.draw(ctx, logicalWidth, logicalHeight, scene, engine.mapConfig, globalTime);

        // 4. Camera Transform
        ctx.save();
        this.renderer.camera.sync(camera); 
        this.renderer.camera.applyTransform(ctx, logicalWidth, logicalHeight);

        // 5. MAIN PASS: Collect and Sort Renderables
        this.renderList.reset();
        
        const terrainHeightFunc = (q: number, r: number) => this.renderer.grid.getTerrainHeight(q, r, engine);

        // Collect Grid
        this.renderer.grid.submitRenderables(
            this.renderList,
            engine, hoveredHex, hoveredSkill, highlight, 
            engine.projectiles,
            this.transitionT, this.transitionPhase,
            globalTime
        );
        
        // Collect VFX
        this.renderer.vfxRenderer.submitRenderables(
            this.renderList,
            engine,
            this.renderer.vfx,
            terrainHeightFunc,
            engine.mapConfig,
            this.transitionT,
            this.transitionPhase,
            { width: logicalWidth, height: logicalHeight, camera } 
        );
        
        // Collect Units
        this.renderer.unit.submitRenderables(
            this.renderList,
            engine.agents, 
            terrainHeightFunc, 
            globalTime, 
            highlight, 
            engine.mapConfig
        );

        // Sort In-Place
        this.renderList.sort();
        
        // Execute Draws
        for (let i = 0; i < this.renderList.count; i++) {
            const op = this.renderList.ops[i];
            
            const snapX = Math.round(op.tx);
            const snapY = Math.round(op.ty);

            switch (op.type) {
                case RenderOpType.TERRAIN:
                    // Draw Solid Block
                    TerrainRenderer.drawBlock(
                        ctx, snapX, snapY, op.tsize, op.th, op.ttheme, op.ttype, globalTime
                    );
                    
                    // Draw Details on Top Face (Y - Height)
                    const visualTopY = snapY - op.th;
                    TerrainRenderer.drawTerrainDetail(ctx, snapX, snapY, op.th, op.ttype, op.tdetail, op.tq, op.tr);
                    
                    // Draw Overlays on Top Face
                    GridOverlays.drawOverlays(
                        ctx, snapX, visualTopY, op.tsize,
                        op.oStatus, op.oDanger,
                        op.oLightCol, op.oLightInt,
                        op.oRange, op.oRangeCol, op.oHover, op.oHasUnit,
                        op.tq, op.tr, op.time,
                        op.oHazard
                    );
                    break;
                    
                case RenderOpType.OBSTACLE:
                    const sprite = SpriteManager.getObstacleSprite(op.ttype);
                    // Standardized drawing:
                    // op.tx, op.ty is the Visual Surface Center of the hex.
                    // We offset by the factory's anchor point to align it perfectly.
                    ctx.drawImage(sprite, snapX - ENV_ANCHOR_X, snapY - ENV_ANCHOR_Y);
                    break;
                    
                case RenderOpType.UNIT:
                    if (op.agent) {
                        this.renderer.unit.drawAssembly(ctx, op.agent, snapX, snapY, op.th, op.time, op.uSelected, op.uSilhouette);
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
                        ParticleRenderer.drawSingleParticle(ctx, p, 0, 0, op.vProgress, op.vChaos);
                        ctx.restore();
                    }
                    break;
                    
                case RenderOpType.PROJECTILE:
                    ProjectileDrawer.draw(ctx, op, globalTime);
                    break;
            }
        }

        // 6. Occlusion & Status Layers
        const occludedAgents = this.renderer.grid.getOccludedAgents(engine);
        if (occludedAgents.length > 0) {
            ctx.save();
            occludedAgents.forEach(agent => {
                this.renderer.unit.drawSilhouette(ctx, agent, terrainHeightFunc, globalTime, engine.mapConfig);
            });
            ctx.restore();
        }

        // --- STATUS ORCHESTRATOR FIX ---
        // Pass terrainHeightFunc to ensure status icons render at Visual Top
        this.renderer.statusOrchestrator.draw(ctx, engine.agents, globalTime, terrainHeightFunc);
        
        this.renderer.vfxRenderer.drawTopLayerParticles(ctx, this.renderer.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        ctx.restore(); 
        
        // 9. Post Processing
        let transitionAberration = 0;
        if (this.transitionPhase !== 'IDLE') {
            transitionAberration = 4 * this.transitionT * (1 - this.transitionT) * 0.5;
        }

        this.postProcessor.apply(ctx, physicalWidth, physicalHeight, this.renderer.camera.getTrauma(), transitionAberration);
        
        // 10. HUD Layer
        ctx.save(); 
        this.renderer.camera.applyTransform(ctx, logicalWidth, logicalHeight);
        
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.renderer.grid, globalTime);
        this.hudRenderer.draw(ctx, this.renderer.hud, engine.agents, terrainHeightFunc, engine.mapConfig, highlight, globalTime);
        
        ctx.restore(); 

        if (engine.directorTargetId) {
            this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, globalTime);
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
}
