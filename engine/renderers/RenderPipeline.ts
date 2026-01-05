
import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "../game";
import { Camera, GameRenderer } from "../renderer"; 
import { Hex, Skill } from "../../types";
import { BackgroundRenderer } from "./background";
import { TacticalRenderer } from "./tactical";
import { HUDRenderer } from "./HUDRenderer";
import { PostProcessor } from "./PostProcessor"; 
import { RenderList } from "./RenderList";
import { RenderDispatcher } from "./RenderDispatcher";

export class RenderPipeline {
    private renderer: GameRenderer;
    private background = new BackgroundRenderer();
    private tactical = new TacticalRenderer();
    private hud = new HUDRenderer();
    private post = new PostProcessor();
    private renderList = new RenderList();
    
    // Transition State managed internally (SSOT)
    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';

    constructor(renderer: GameRenderer) { 
        this.renderer = renderer; 
    }

    public setTransitionPhase(phase: 'IN' | 'OUT' | 'IDLE') {
        if (this.transitionPhase !== phase) {
            this.transitionPhase = phase;
            // Reset progress when phase changes, unless going to IDLE
            if (phase !== 'IDLE') {
                this.transitionT = 0;
            }
        }
    }

    public update(dt: number, engine: GameEngine) { 
        this.tactical.update(dt, engine); 

        // Animation Logic moved from GameCanvas to here
        if (this.transitionPhase !== 'IDLE') {
            // Slower, weightier transition speed
            const speed = 0.5; 
            this.transitionT = Math.min(1.0, this.transitionT + dt * speed);
        } else {
            this.transitionT = 0;
        }
    }

    public draw(ctx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, fps: number, hoveredHex: Hex | null, hoveredSkill: Skill | null, battleTime: number, realTime: number): void {
        const { width: pW, height: pH } = ctx.canvas;
        if (pW === 0 || pH === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const [lW, lH] = [pW / dpr, pH / dpr];
        const { mapConfig: cfg, currentScene: sc } = engine;
        
        // 1. Clear & Background
        ctx.resetTransform(); 
        ctx.fillStyle = '#020617'; 
        ctx.fillRect(0, 0, pW, pH);
        ctx.scale(dpr, dpr);
        // Background uses RealTime for ambient effects (stars, fog) even when game paused
        this.background.draw(ctx, lW, lH, sc, cfg, realTime);
        
        // 2. Main Scene (World Space)
        ctx.save();
        this.renderer.camera.sync(camera); 
        this.renderer.camera.applyTransform(ctx, lW, lH);
        // World objects use BattleTime to sync with logic
        this.drawWorld(ctx, engine, camera, highlight, hoveredHex, hoveredSkill, battleTime);
        ctx.restore(); 

        // 3. Post Processing
        let transAb = (this.transitionPhase !== 'IDLE') ? 4 * this.transitionT * (1 - this.transitionT) * 0.5 : 0;
        this.post.apply(ctx, pW, pH, this.renderer.camera.getTrauma(), transAb);
        
        // 4. Overlays (Screen/World Hybrid)
        ctx.save(); 
        this.renderer.camera.applyTransform(ctx, lW, lH);
        this.tactical.drawOverlay(ctx, engine, highlight, this.renderer.grid, realTime);
        this.hud.draw(ctx, this.renderer.hud, engine.agents, (q, r) => this.renderer.grid.getTerrainHeight(q, r, engine), cfg, highlight, battleTime);
        ctx.restore(); 

        if (engine.directorTargetId) this.tactical.drawHUD(ctx, engine, lW, lH, camera, realTime);
        this.tactical.drawDebug(ctx, fps);
        
        // 5. Global Transition/Finish Blur
        let blur = engine.victory.isFinishing ? 1.0 - (engine.victory.victoryTimer / VICTORY_PHASE_DURATION) : (engine.victory.winningTeam !== null ? 1.0 : 0);
        if (this.transitionPhase === 'OUT') blur = 1.0; 
        else if (this.transitionPhase === 'IN') blur = 1.0 - this.transitionT;
        if (blur > 0) this.post.applyFinishBlur(ctx, pW, pH, Math.max(0, Math.min(1, blur)));
    }

    private drawWorld(ctx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, hoveredHex: Hex | null, hoveredSkill: Skill | null, t: number) {
        this.renderList.reset();
        const terrainH = (q: number, r: number) => this.renderer.grid.getTerrainHeight(q, r, engine);
        const lW = ctx.canvas.width / (window.devicePixelRatio || 1);
        const lH = ctx.canvas.height / (window.devicePixelRatio || 1);

        this.renderer.grid.submitRenderables(this.renderList, engine, hoveredHex, hoveredSkill, highlight, engine.projectiles, this.transitionT, this.transitionPhase, t);
        this.renderer.vfxRenderer.submitRenderables(this.renderList, engine, this.renderer.vfx, terrainH, engine.mapConfig, this.transitionT, this.transitionPhase, { width: lW, height: lH, camera });
        this.renderer.unit.submitRenderables(this.renderList, engine.agents, terrainH, t, highlight, engine.mapConfig);
        
        this.renderList.sort();
        for (let i = 0; i < this.renderList.count; i++) {
            RenderDispatcher.dispatch(ctx, this.renderList.ops[i], engine.mapConfig.layout, t, this.renderer.unit);
        }

        const occluded = this.renderer.grid.getOccludedAgents(engine);
        if (occluded.length > 0) {
            ctx.save();
            occluded.forEach(a => this.renderer.unit.drawSilhouette(ctx, a, terrainH, t, engine.mapConfig));
            ctx.restore();
        }
        
        // [FIX] Pass layout to StatusOrchestrator
        this.renderer.statusOrchestrator.draw(ctx, engine.agents, t, terrainH, engine.mapConfig.layout);
    }
}
