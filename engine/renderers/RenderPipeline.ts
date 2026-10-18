// ╔══════════════════════════════════════════════════════════╗
// ║  RenderPipeline — 每幀渲染流程（提交→排序→分發→剪影→HUD） ║
// ║  職責：建立「繪製用地面高度」＝模擬高度－該格漂浮位移，    ║
// ║        傳給特效與 UnitFrameStore；drawWorld 開頭建一次     ║
// ║        UnitFrame，單位、HUD、狀態、剪影、選取連線都讀它    ║
// ║  [ARCH] 座標協議見 engine/renderers/RenderSpec.ts §4、§5；  ║
// ║  模擬端永遠不讀繪製用高度。每幀 begin 貼地鋪設層（§9），    ║
// ║  VFXRenderer 登記、RenderDispatcher 逐格繪製。             ║
// ╚══════════════════════════════════════════════════════════╝


import { Agent, GameEngine, VICTORY_PHASE_DURATION } from "../game";
import { Camera, GameRenderer } from "../renderer"; 
import { Hex, Skill } from "../../types";
import { BackgroundRenderer } from "./background";
import { TacticalRenderer } from "./tactical";
import { HUDRenderer } from "./HUDRenderer";
import { UnitFrameStore } from "./frame/UnitFrame";
import { PostProcessor } from "./PostProcessor"; 
import { RenderList, RenderOpType } from "./RenderList";
import { GroundDrapeLayer } from "./GroundDrape";
import { RenderDispatcher } from "./RenderDispatcher";
import { VisualMath } from "../math/VisualMath";
import { HexUtils } from "../utils";
import { RenderStats } from "./RenderStats";
import { getRenderDpr } from "./RenderQuality";
import { CtxOpCounter } from "./CtxOpCounter";
import { spriteAtlasStore } from "./units/SpriteAtlasStore";
import { terrainTextureStore } from "./grid/TerrainTextureStore";
import { particleTextureStore } from "./ParticleTextureStore";

let allAssetsReady = typeof Image === 'undefined';

void Promise.all([
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
    /** 本幀貼地鋪設特效（VFXRenderer 登記、RenderDispatcher 逐格繪製；RenderSpec §9） */
    private groundDrape = new GroundDrapeLayer();
    /** 每幀單位快照；唯一寫入者是 build（drawWorld 開頭），其餘只讀 */
    private frames = new UnitFrameStore();
    /** 屍體擊飛滑出已塌陷地塊就墜落用；與 _cachedTerrainH 同生命週期 */
    private _hasGround: ((q: number, r: number) => boolean) | null = null;
    private _isTileValid: ((q: number, r: number) => boolean) | null = null;

    // [FIX] 避免每幀重建 closure，只在 engine 實例變更時重建
    private _cachedTerrainH: ((q: number, r: number) => number) | null = null;
    private _terrainHEngine: GameEngine | null = null;
    /** 本幀漂浮位移的時間；非漂浮地形為 null。繪製用地面高度讀它（見 drawWorld） */
    private _floatT: number | null = null;
    
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
            this.tactical.drawOverlay(ctx, engine, highlight, this.renderer.grid, realTime, this.frames);
        });
        
        // this.frames 已由 drawWorld() 建立（先於此處執行）
        CtxOpCounter.track('hud', () => {
            this.hud.draw(ctx, this.renderer.hud, this.frames, highlight, battleTime, engine.state.isLastStand);
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
        this.groundDrape.begin();

        if (this._terrainHEngine !== engine || !this._cachedTerrainH) {
            this._terrainHEngine = engine;
            // 繪製用地面高度＝地形高度－該格漂浮位移（位移往下為正）。單位、屍體、狀態、HUD、貼地特效都從這裡取高度，
            // 所以跟 GridRenderStrategy 用同一個 VisualMath.floatBobAt 畫的地塊一起浮動。模擬端用 engine.getTerrainHeight，不受影響。
            this._cachedTerrainH = (q: number, r: number) => {
                const h = this.renderer.grid.getTerrainHeight(q, r, engine);
                if (this._floatT === null) return h;
                const c = HexUtils.toPx(q, r, engine.mapConfig);
                return h - VisualMath.floatBobAt(c.x, c.y, this._floatT);
            };
            this._isTileValid = (q: number, r: number) => engine.map.isValid(q, r);
            this._hasGround = (q: number, r: number) => engine.map.isValid(q, r) || engine.zones.collapsingTiles.has(`${q},${r}`);
        }
        this._floatT = VisualMath.isFloatingBiome(engine.currentScene.textureType) ? t : null;
        const terrainH = this._cachedTerrainH;

        const dpr = getRenderDpr();
        const lW = ctx.canvas.width / dpr;
        const lH = ctx.canvas.height / dpr;

        CtxOpCounter.track('submit', () => {
            this.frames.build(engine.agents, terrainH, engine.mapConfig, this.transitionT, this.transitionPhase, this._hasGround ?? undefined);
            this.renderer.grid.submitRenderables(this.renderList, engine, hoveredHex, hoveredSkill, highlight, engine.projectiles, this.transitionT, this.transitionPhase, t);
            this._viewportScratch.width = lW;
            this._viewportScratch.height = lH;
            this._viewportScratch.camera = camera;
            this.renderer.vfxRenderer.submitRenderables(this.renderList, engine, this.renderer.vfx, this.groundDrape, terrainH, engine.mapConfig, this.transitionT, this.transitionPhase, this._viewportScratch);
            this.renderer.unit.submitRenderables(this.renderList, this.frames, t, highlight, this.groundDrape);
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
                              op.type === RenderOpType.PROJECTILE ? 'projectile' :
                              op.type === RenderOpType.HAZARD ? 'hazard' :
                              op.type === RenderOpType.OBSTACLE ? 'obstacle' :
                              op.type === RenderOpType.OVERLAY ? 'overlay' : 'other';
                CtxOpCounter.setScope(scope);
            }
            RenderDispatcher.dispatch(ctx, op, engine.mapConfig.layout, t, this.renderer.unit, this.groundDrape);
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
                        const frame = this.frames.get(this._scratchOccludedList[i]);
                        if (frame) this.renderer.unit.drawSilhouette(ctx, frame, t, engine.mapConfig.layout);
                    }
                    ctx.restore();
                });
            }
        }
        
        // [FIX] Pass layout and map validity to StatusOrchestrator
        CtxOpCounter.track('status', () => {
            this.renderer.statusOrchestrator.draw(ctx, this.frames, t, engine.mapConfig.layout, this._isTileValid ?? undefined);
        });
    }
}
