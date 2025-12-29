import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "../game";
import { Camera, GameRenderer } from "../renderer"; 
import { Hex, Skill } from "../../types";
import { BackgroundRenderer } from "./background";
import { TacticalRenderer } from "./tactical";
import { HUDRenderer } from "./HUDRenderer";
import { PostProcessor } from "./PostProcessor"; 
import { RenderList, RenderOpType } from "./RenderList";
import { ProjectileDrawer } from "./ProjectileDrawer";
import { TerrainRenderer } from "./grid/TerrainRenderer";
import { GridOverlays } from "./grid/GridOverlays";
import { ParticleRenderer } from "../systems/vfx/renderers/ParticleRenderer";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { ENV_ANCHOR_X, ENV_ANCHOR_Y } from "../graphics/EnvironmentFactory";
export class RenderPipeline {
    private renderer: GameRenderer;
    private backgroundRenderer = new BackgroundRenderer();
    private tacticalRenderer = new TacticalRenderer();
    private hudRenderer = new HUDRenderer();
    private postProcessor = new PostProcessor();
    private renderList = new RenderList();
    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';
    constructor(renderer: GameRenderer) { this.renderer = renderer; }
    public setTransition(t: number, phase: 'IN' | 'OUT' | 'IDLE') {
        this.transitionT = t;
        this.transitionPhase = phase;
    }
    public update(dt: number, engine: GameEngine) { this.tacticalRenderer.update(dt, engine); }
    public draw(ctx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, fps: number, hoveredHex: Hex | null, hoveredSkill: Skill | null, globalTime: number): void {
        const physicalWidth = ctx.canvas.width, physicalHeight = ctx.canvas.height;
        if (physicalWidth === 0 || physicalHeight === 0) return;
        const dpr = window.devicePixelRatio || 1, logicalWidth = physicalWidth / dpr, logicalHeight = physicalHeight / dpr;
        const scene = engine.currentScene, layout = engine.mapConfig.layout;
        ctx.resetTransform(); ctx.clearRect(0, 0, physicalWidth, physicalHeight); ctx.scale(dpr, dpr);
        this.backgroundRenderer.draw(ctx, logicalWidth, logicalHeight, scene, engine.mapConfig, globalTime);
        ctx.save();
        this.renderer.camera.sync(camera); 
        this.renderer.camera.applyTransform(ctx, logicalWidth, logicalHeight);
        this.renderList.reset();
        const terrainHeightFunc = (q: number, r: number) => this.renderer.grid.getTerrainHeight(q, r, engine);
        this.renderer.grid.submitRenderables(this.renderList, engine, hoveredHex, hoveredSkill, highlight, engine.projectiles, this.transitionT, this.transitionPhase, globalTime);
        this.renderer.vfxRenderer.submitRenderables(this.renderList, engine, this.renderer.vfx, terrainHeightFunc, engine.mapConfig, this.transitionT, this.transitionPhase, { width: logicalWidth, height: logicalHeight, camera });
        this.renderer.unit.submitRenderables(this.renderList, engine.agents, terrainHeightFunc, globalTime, highlight, engine.mapConfig);
        this.renderList.sort();
        for (let i = 0; i < this.renderList.count; i++) {
            const op = this.renderList.ops[i], snapX = Math.round(op.tx), snapY = Math.round(op.ty);
            switch (op.type) {
                case RenderOpType.TERRAIN:
                    TerrainRenderer.drawBlock(ctx, snapX, snapY, op.tsize, op.th, op.ttheme, op.ttype, globalTime, layout);
                    GridOverlays.drawOverlays(ctx, snapX, snapY - op.th, op.tsize, op.oStatus, op.oDanger, op.oLightCol, op.oLightInt, op.oRange, op.oRangeCol, op.oHover, op.oHasUnit, op.tq, op.tr, op.time, op.oHazard, layout);
                    TerrainRenderer.drawTerrainDetail(ctx, snapX, snapY, op.th, op.ttype, op.tdetail, op.tq, op.tr);
                    break;
                case RenderOpType.OBSTACLE:
                    ctx.drawImage(SpriteManager.getObstacleSprite(op.ttype, layout), snapX - ENV_ANCHOR_X, snapY - ENV_ANCHOR_Y);
                    break;
                case RenderOpType.UNIT:
                    if (op.agent) this.renderer.unit.drawAssembly(ctx, op.agent, snapX, snapY, op.th, op.time, op.uSelected, op.uSilhouette);
                    break;
                case RenderOpType.DECAL:
                    ctx.save(); ctx.translate(snapX, snapY); ctx.scale(op.dScale, op.dScale); ctx.globalAlpha = Math.min(1, op.dLife);
                    ctx.drawImage(AssetManager.getBlastZone(op.dColor), -64, -32, 128, 64); ctx.restore();
                    break;
                case RenderOpType.VFX:
                    if (op.particle) { ctx.save(); ctx.translate(snapX, snapY); ParticleRenderer.drawSingleParticle(ctx, op.particle, 0, 0, op.vProgress, op.vChaos, layout); ctx.restore(); }
                    break;
                case RenderOpType.PROJECTILE:
                    ProjectileDrawer.draw(ctx, op, globalTime);
                    break;
            }
        }
        const occludedAgents = this.renderer.grid.getOccludedAgents(engine);
        if (occludedAgents.length > 0) occludedAgents.forEach(agent => this.renderer.unit.drawSilhouette(ctx, agent, terrainHeightFunc, globalTime, engine.mapConfig));
        this.renderer.statusOrchestrator.draw(ctx, engine.agents, globalTime, terrainHeightFunc);
        ctx.restore(); 
        let transitionAberration = 0;
        if (this.transitionPhase !== 'IDLE') transitionAberration = 4 * this.transitionT * (1 - this.transitionT) * 0.5;
        this.postProcessor.apply(ctx, physicalWidth, physicalHeight, this.renderer.camera.getTrauma(), transitionAberration);
        ctx.save(); 
        this.renderer.camera.applyTransform(ctx, logicalWidth, logicalHeight);
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.renderer.grid, globalTime);
        this.hudRenderer.draw(ctx, this.renderer.hud, engine.agents, terrainHeightFunc, engine.mapConfig, highlight, globalTime);
        ctx.restore(); 
        if (engine.directorTargetId) this.tacticalRenderer.drawHUD(ctx, engine, logicalWidth, logicalHeight, camera, globalTime);
        this.tacticalRenderer.drawDebug(ctx, fps);
        let blurAmount = engine.isFinishing ? 1.0 - (engine.victoryTimer / VICTORY_PHASE_DURATION) : (engine.winningTeam !== null ? 1.0 : 0);
        if (this.transitionPhase === 'OUT') blurAmount = 1.0; 
        else if (this.transitionPhase === 'IN') blurAmount = 1.0 - this.transitionT;
        if (blurAmount > 0) this.postProcessor.applyFinishBlur(ctx, physicalWidth, physicalHeight, Math.max(0, Math.min(1, blurAmount)));
    }
}