
import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "../game";
import { Camera, GameRenderer } from "../renderer"; 
import { Hex, Skill } from "../../types";
import { BackgroundRenderer } from "./background";
import { TacticalRenderer } from "./tactical";
import { HUDRenderer } from "./HUDRenderer";
import { PostProcessor } from "./PostProcessor"; 
import { RenderList, RenderOpType } from "./RenderList";
import { RenderDispatcher } from "./RenderDispatcher";
import { RenderStats } from "./RenderStats";
import { getRenderDpr } from "./RenderQuality";
import { CtxOpCounter } from "./CtxOpCounter";
import { spriteAtlasStore } from "./units/SpriteAtlasStore";
import { terrainTextureStore } from "./grid/TerrainTextureStore";
import { particleTextureStore } from "./ParticleTextureStore";

let allAssetsReady = typeof Image === 'undefined';

export const unifiedAssetsReadyPromise: Promise<void> = Promise.all([
    spriteAtlasStore.readyPromise,
    terrainTextureStore.readyPromise,
    particleTextureStore.readyPromise,
]).then(() => {
    allAssetsReady = true;
    if (typeof window !== 'undefined') {
        (window as unknown as { __ASSETS_READY__?: boolean }).__ASSETS_READY__ = true;
    }
});

export class RenderPipeline {
    private renderer: GameRenderer;
    private background = new BackgroundRenderer();
    private tactical = new TacticalRenderer();
    private hud = new HUDRenderer();
    private post = new PostProcessor();
    private renderList = new RenderList();

    // [FIX] 避免每幀重建 closure，只在 engine 實例變更時重建
    private _cachedTerrainH: ((q: number, r: number) => number) | null = null;
    private _terrainHEngine: GameEngine | null = null;
    
    // Scratch structures to eliminate per-frame allocations
    private _scratchOccludedSet = new Set<Agent>();
    private _scratchOccludedList: Agent[] = [];
    private _viewportScratch: { width: number; height: number; camera: Camera } = {
        width: 0,
        height: 0,
        camera: { x: 0, y: 0, zoom: 1 },
    };

    // Transition State managed internally (SSOT)
    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';
    private lastDt: number = 0.016;

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
        this.lastDt = dt;

        // Animation Logic moved from GameCanvas to here
        if (this.transitionPhase !== 'IDLE') {
            // Slower, weightier transition speed
            const speed = 0.5; 
            this.transitionT = Math.min(1.0, this.transitionT + dt * speed);
        } else {
            this.transitionT = 0;
        }
    }

    public draw(rawCtx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, fps: number, hoveredHex: Hex | null, hoveredSkill: Skill | null, battleTime: number, realTime: number): void {
        const { width: pW, height: pH } = rawCtx.canvas;
        if (pW === 0 || pH === 0) return;

        // 資產載入閘門：載入完成前不進戰場主渲染（維持乾淨黑底），避免前幾幀閃過未載入殘影
        if (!allAssetsReady && !spriteAtlasStore.isReady()) {
            rawCtx.resetTransform();
            rawCtx.fillStyle = '#020617';
            rawCtx.fillRect(0, 0, pW, pH);
            return;
        }

        const ctx = CtxOpCounter.wrapContext(rawCtx);
        CtxOpCounter.beginFrame();

        const dpr = getRenderDpr();
        const lW = pW / dpr;
        const lH = pH / dpr;
        const { mapConfig: cfg, currentScene: sc } = engine;
        
        // 1. Clear & Background
        RenderStats.begin('background');
        ctx.resetTransform(); 
        ctx.fillStyle = '#020617'; 
        ctx.fillRect(0, 0, pW, pH);
        ctx.scale(dpr, dpr);
        // Background uses RealTime for ambient effects (stars, fog) even when game paused
        CtxOpCounter.track('background', () => {
            this.background.draw(ctx, lW, lH, sc, cfg, realTime);
        });
        RenderStats.end('background');
        
        // 2. Main Scene (World Space)
        RenderStats.begin('world');
        ctx.save();
        this.renderer.camera.sync(camera); 
        this.renderer.camera.applyTransform(ctx, lW, lH);
        // World objects use BattleTime to sync with logic
        this.drawWorld(ctx, engine, camera, highlight, hoveredHex, hoveredSkill, battleTime, this.lastDt);
        ctx.restore(); 
        RenderStats.end('world');

        // 3. Post Processing
        RenderStats.begin('post');
        CtxOpCounter.track('post', () => {
            let transAb = (this.transitionPhase !== 'IDLE') ? 4 * this.transitionT * (1 - this.transitionT) * 0.5 : 0;
            this.post.apply(ctx, pW, pH, this.renderer.camera.getTrauma(), transAb);
            // [MATERIAL UPGRADE] 色調分級：只作用於世界層，HUD/Overlay 之前
            this.post.applyToneGrade(ctx, pW, pH);
        });
        RenderStats.end('post');
        
        // 4. Overlays (Screen/World Hybrid)
        RenderStats.begin('overlay+hud');
        ctx.save(); 
        this.renderer.camera.applyTransform(ctx, lW, lH);
        CtxOpCounter.track('tactical-overlay', () => {
            this.tactical.drawOverlay(ctx, engine, highlight, this.renderer.grid, realTime);
        });
        
        // _cachedTerrainH guaranteed non-null: drawWorld() runs before this point
        CtxOpCounter.track('hud', () => {
            this.hud.draw(ctx, this.renderer.hud, engine.agents, this._cachedTerrainH!, cfg, highlight, battleTime, engine.state.isLastStand);
        });
        ctx.restore(); 

        if (engine.directorTargetId) {
            CtxOpCounter.track('director-hud', () => {
                this.tactical.drawHUD(ctx, engine, lW, lH, camera, realTime);
            });
        }
        RenderStats.end('overlay+hud');
        this.tactical.drawDebug(ctx, fps, engine);
        
        // 5. Global Transition/Finish Blur
        let blur = engine.victory.isFinishing ? 1.0 - (engine.victory.victoryTimer / VICTORY_PHASE_DURATION) : (engine.victory.winningTeam !== null ? 1.0 : 0);
        if (this.transitionPhase === 'OUT') blur = 1.0; 
        else if (this.transitionPhase === 'IN') blur = 1.0 - this.transitionT;
        if (blur > 0) this.post.applyFinishBlur(ctx, pW, pH, Math.max(0, Math.min(1, blur)));

        if (CtxOpCounter.enabled) {
            CtxOpCounter.drawDebug(ctx);
        }
        CtxOpCounter.endFrame();
    }

    private drawWorld(ctx: CanvasRenderingContext2D, engine: GameEngine, camera: Camera, highlight: Agent | null, hoveredHex: Hex | null, hoveredSkill: Skill | null, t: number, dt: number) {
        this.renderList.reset();

        if (this._terrainHEngine !== engine || !this._cachedTerrainH) {
            this._terrainHEngine = engine;
            this._cachedTerrainH = (q: number, r: number) => this.renderer.grid.getTerrainHeight(q, r, engine);
        }
        const terrainH = this._cachedTerrainH;

        const dpr = getRenderDpr();
        const lW = ctx.canvas.width / dpr;
        const lH = ctx.canvas.height / dpr;

        CtxOpCounter.track('submit', () => {
            this.renderer.grid.submitRenderables(this.renderList, engine, hoveredHex, hoveredSkill, highlight, engine.projectiles, this.transitionT, this.transitionPhase, t);
            this._viewportScratch.width = lW;
            this._viewportScratch.height = lH;
            this._viewportScratch.camera = camera;
            this.renderer.vfxRenderer.submitRenderables(this.renderList, engine, this.renderer.vfx, terrainH, engine.mapConfig, this.transitionT, this.transitionPhase, this._viewportScratch);
            this.renderer.unit.submitRenderables(this.renderList, engine.agents, terrainH, t, highlight, engine.mapConfig, this.transitionT, this.transitionPhase, dt);
        });
        
        CtxOpCounter.track('sort', () => {
            this.renderList.sort();
        });

        // 單一渲染 pass：依據深度排序後的順序進行繪製（包含存活單位與死亡布娃娃）
        for (let i = 0; i < this.renderList.count; i++) {
            const op = this.renderList.ops[i];
            if (CtxOpCounter.enabled) {
                const scope = op.type === RenderOpType.TERRAIN ? 'terrain' :
                              op.type === RenderOpType.UNIT || op.type === RenderOpType.CORPSE || op.type === RenderOpType.AURA ? 'units' :
                              op.type === RenderOpType.VFX ? 'vfx' :
                              op.type === RenderOpType.DECAL ? 'decal' :
                              op.type === RenderOpType.PROJECTILE ? 'projectile' :
                              op.type === RenderOpType.HAZARD ? 'hazard' :
                              op.type === RenderOpType.OBSTACLE ? 'obstacle' :
                              op.type === RenderOpType.OVERLAY ? 'overlay' : 'other';
                CtxOpCounter.setScope(scope);
            }
            RenderDispatcher.dispatch(ctx, op, engine.mapConfig.layout, t, this.renderer.unit);
        }

        // [FIX] 編輯模式（isRunning === false）下禁用 silhouette pass：
        // 地形高度被拖拉改變時，遮擋偵測會誤判，產生幽靈梯形。
        // Silhouette 只在戰鬥進行中有意義。
        if (engine.isRunning) {
            const occluded = this.renderer.grid.getOccludedAgents(engine);
            const obstacleOccluded = this.renderer.grid.getObstacleOccludedAgents(engine);

            this._scratchOccludedSet.clear();
            this._scratchOccludedList.length = 0;

            for (let i = 0; i < occluded.length; i++) {
                const a = occluded[i];
                if (!this._scratchOccludedSet.has(a)) {
                    this._scratchOccludedSet.add(a);
                    this._scratchOccludedList.push(a);
                }
            }
            for (let i = 0; i < obstacleOccluded.length; i++) {
                const a = obstacleOccluded[i];
                if (!this._scratchOccludedSet.has(a)) {
                    this._scratchOccludedSet.add(a);
                    this._scratchOccludedList.push(a);
                }
            }

            if (this._scratchOccludedList.length > 0) {
                CtxOpCounter.track('silhouette', () => {
                    ctx.save();
                    for (let i = 0; i < this._scratchOccludedList.length; i++) {
                        this.renderer.unit.drawSilhouette(ctx, this._scratchOccludedList[i], terrainH, t, engine.mapConfig);
                    }
                    ctx.restore();
                });
            }
        }
        
        // [FIX] Pass layout and map validity to StatusOrchestrator
        CtxOpCounter.track('status', () => {
            this.renderer.statusOrchestrator.draw(ctx, engine.agents, t, terrainH, engine.mapConfig.layout, (q, r) => engine.map.isValid(q, r));
        });
    }
}
