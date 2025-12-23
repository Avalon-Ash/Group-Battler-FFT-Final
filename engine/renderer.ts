
import { Agent, GameEngine } from "./game";
import { HexUtils } from "./utils";
import { SpriteManager } from "./sprites";
import { Hex, GameEvent, Skill, Team } from "../types";
import { UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../constants";

// Sub-systems
import { GridSystem, RenderableItem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import * as VFXSpawners from "./systems/vfx/spawners"; 
import { VFXRenderer } from "./systems/vfx/render";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";

// NEW Renderers
import { BackgroundRenderer } from "./renderers/background";
import { TacticalRenderer } from "./renderers/tactical";

// Constants
const HUD_TEXT_OFFSET = UNIT_VISUAL_HEIGHT + HUD_PADDING + 20; 
const OBSTACLE_Z_INDEX = 10;
// CHANGED: From 86 to 80 to match Sprite Generation Anchor (cy=80)
const OBSTACLE_OFFSET_Y = 80; 

export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export class GameRenderer {
    public globalTime: number = 0;
    
    // Sub-systems
    public grid: GridSystem;
    public vfx: VFXSystem;
    private vfxRenderer: VFXRenderer;
    public unit: UnitRenderSystem;
    public hud: HUDSystem;
    
    // New Composition Renderers
    private backgroundRenderer: BackgroundRenderer;
    private tacticalRenderer: TacticalRenderer;

    // Camera Shake Effects
    private shakeTimer = 0; 
    private shakeIntensity = 0;

    // Transition State
    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';

    constructor() {
        this.grid = new GridSystem();
        this.vfx = new VFXSystem();
        this.vfxRenderer = new VFXRenderer();
        this.unit = new UnitRenderSystem();
        this.hud = new HUDSystem();
        
        // Initialize sub-renderers
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
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
        
        // Delegate updates
        this.tacticalRenderer.update(dt, engine);
        this.vfx.update(dt, this.globalTime, engine.currentScene.ambientType);
        this.hud.update(dt);
    }

    public processEventsWithEngine(events: GameEvent[], engine: GameEngine): void {
        events.forEach(event => {
            const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
            const terrainHeight = this.grid.getTerrainHeight(hex.q, hex.r, engine);
            const visualY = event.pos.y - terrainHeight;

            // 1. HUD Events (Floating Text)
            if (['DAMAGE', 'HEAL', 'CC_APPLIED'].includes(event.type)) {
                 const baseY = visualY - HUD_TEXT_OFFSET; 

                 let text = "";
                 let color = "#fff";
                 let size = 16;
                 let type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' = 'DAMAGE';
                 let xOffset = 0;

                 if (event.type === 'DAMAGE') {
                     const val = Math.abs(event.value || 0);
                     text = val.toString();
                     color = val > 100 ? '#ef4444' : '#fff'; 
                     size = val > 100 ? 24 : 16;
                     type = 'DAMAGE';
                     xOffset = (Math.random() - 0.5) * 10;
                 } else if (event.type === 'HEAL') {
                     text = "+" + Math.abs(event.value || 0);
                     color = '#4ade80';
                     type = 'HEAL';
                     xOffset = (Math.random() - 0.5) * 10;
                 } else {
                     text = event.text || "";
                     color = event.color || "#fff";
                     type = 'CC';
                     size = 14;
                     xOffset = -45;
                 }

                 if (text) {
                     this.hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);
                 }

            } else if (event.type === 'CAST_START') {
                 if (event.skill && event.skill.tag !== 'BASIC') {
                     const isUlt = event.skill.tag === 'ULT';
                     const baseY = visualY - HUD_TEXT_OFFSET - (isUlt ? 30 : 10); 
                     const xOffset = 55; 
                     this.hud.addFloatingText(event.pos.x + xOffset, baseY, event.skill.name, event.skill.color, 14, 'SHOUT', isUlt);
                 }
            } else if (event.type === 'CAST_FINISH') {
                 if (event.skill && event.skill.tag === 'ULT') {
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         VFXSpawners.spawnDomainExpansion(this.vfx, event.pos.x, event.pos.y, event.skill.color, 4.0);
                         this.triggerCameraShake(0.5, 8); 
                     }
                 }
            }

            // 2. VFX Handling
            switch (event.type) {
                case 'DAMAGE': 
                    const isHeavy = Math.abs(event.value || 0) > 50;
                    VFXSpawners.spawnExplosion(this.vfx, event.pos.x, visualY - 20, 0, 5, event.color || '#fff', 1.0, 0.8, 'SPARK');
                    
                    if (isHeavy) {
                        this.triggerCameraShake(0.2, 5); 
                        VFXSpawners.spawnDebris(this.vfx, event.pos.x, visualY - 20, event.color || '#fff', 3);
                    }
                    break;

                case 'VISUAL_BEAM':
                    if (event.sourceId) {
                        const source = engine.agents.find(a => a.id === event.sourceId);
                        if (source) {
                            const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                            const sH = this.grid.getTerrainHeight(sHex.q, sHex.r, engine);
                            const sx = source.px;
                            const sy = source.py - sH - 40; 
                            
                            const tx = event.pos.x;
                            const ty = visualY - 20; 
                            
                            VFXSpawners.spawnBeam(this.vfx, sx, sy, tx, ty, event.color || '#fff');
                            VFXSpawners.spawnExplosion(this.vfx, tx, ty, 0, 8, event.color || '#fff', 0.5, 0.5, 'SPARK');
                        }
                    }
                    break;

                case 'PROJECTILE_HIT': 
                    this.handleHitVisuals(event, engine, visualY); 
                    break;

                case 'DEATH':
                    const team = event.team !== undefined ? event.team : Team.BLUE; 
                    VFXSpawners.spawnUnitShatter(this.vfx, event.pos.x, visualY, team);
                    this.triggerCameraShake(0.3, 10);
                    break;

                case 'SPAWN':
                    VFXSpawners.spawnTeleport(this.vfx, event.pos.x, visualY, event.color || '#fff');
                    break;
            }
        });
    }

    private handleHitVisuals(event: GameEvent, engine: GameEngine, visualY: number): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        
        if (isUlt) {
            this.triggerCameraShake(0.6, 15); 
            VFXSpawners.spawnDivinePillar(this.vfx, event.pos.x, visualY, color, 1.5);
            VFXSpawners.spawnShockwave(this.vfx, event.pos.x, visualY, color, 2.0);
            
            if (event.skill?.type === 'AOE') {
                const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                const radius = event.skill.aoeRadius || 1;
                const affectedHexes = HexUtils.range(centerHex, radius);
                
                affectedHexes.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = this.grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        
                        const distToCenter = Math.abs(h.q - centerHex.q) + Math.abs(h.r - centerHex.r);
                        if (distToCenter > 0) {
                            const delay = distToCenter * 0.05;
                            VFXSpawners.spawnDivinePillar(this.vfx, tilePos.x, tileVisualY, color, 0.7, delay);
                            VFXSpawners.addGridFlash(this.vfx, h.q, h.r, color);
                        } else {
                            VFXSpawners.addGridFlash(this.vfx, h.q, h.r, color);
                        }
                    }
                });
            } else {
                VFXSpawners.addImpact(this.vfx, event.pos.x, visualY, color, 'RING', 3.0);
                VFXSpawners.spawnExplosion(this.vfx, event.pos.x, visualY, 0, 50, color, 2.0, 1.0, 'SPARK');
            }
        } else {
            if (event.skill?.type === 'AOE') {
                const center = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                const radius = event.skill.aoeRadius || 1;
                HexUtils.range(center, radius).forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        VFXSpawners.addGridFlash(this.vfx, h.q, h.r, color);
                        if (h.q === center.q && h.r === center.r) {
                            VFXSpawners.addDecal(this.vfx, event.pos.x, visualY, color);
                        }
                    }
                });
                VFXSpawners.addImpact(this.vfx, event.pos.x, visualY, color, 'RING', 1.2);
            } else {
                VFXSpawners.addImpact(this.vfx, event.pos.x, visualY, color, 'RING', 0.8);
                VFXSpawners.spawnExplosion(this.vfx, event.pos.x, visualY, 0, 8, color, 1.2, 0.6, 'SPARK');
            }
        }
    }

    private triggerCameraShake(duration: number, intensity: number) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
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
        const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
        const scene = engine.currentScene;
        const defaultStyle = scene.obstacleStyle || 'WALL'; 

        // 1. Complex Background (Delegated)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.backgroundRenderer.draw(ctx, canvasWidth, canvasHeight, scene, engine.mapConfig, this.globalTime);

        // 2. Camera Transform application
        ctx.save();
        
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (this.shakeTimer > 0) {
            shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
            shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
        }

        ctx.translate(canvasWidth / 2 + shakeOffsetX, canvasHeight / 2 + shakeOffsetY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x - canvasWidth / 2 / camera.zoom, -camera.y - canvasHeight / 2 / camera.zoom);

        // 3. MAIN PASS: Collect and Sort Renderables
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

        // Iterate over Obstacles
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
                         // REMOVED +20 OFFSET to align visual Y=80 anchor to tile center
                         c.drawImage(sprite, pos.x - 32, visualY - terrainH - OBSTACLE_OFFSET_Y);
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

        // 4. Occlusion Pass
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

        // 5. Tactical Overlay Lines (World Space) - Delegated
        this.tacticalRenderer.drawOverlay(ctx, engine, highlight, this.grid, this.globalTime);

        // 6. Top VFX (Delegated to VFX Renderer)
        this.vfxRenderer.drawTopLayerParticles(ctx, this.vfx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        // 7. HUD
        this.hud.draw(ctx, engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), engine.mapConfig);

        // 8. Holographic Director HUD (Delegated)
        if (engine.directorTargetId) {
            ctx.restore(); 
            this.tacticalRenderer.drawHUD(ctx, engine, canvasWidth, canvasHeight, camera, this.globalTime);
            ctx.save();
        } else {
            ctx.restore();
            ctx.save();
        }

        ctx.restore(); // Final restore

        // 9. Debug Overlay (Delegated)
        this.tacticalRenderer.drawDebug(ctx, fps);
    }
}
