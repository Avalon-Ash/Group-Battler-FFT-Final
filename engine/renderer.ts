
import { Agent, GameEngine } from "./game";
import { HexUtils } from "./utils";
import { SpriteManager } from "./sprites";
import { AssetManager } from "./assets";
import { Hex, GameEvent, Skill, SceneTheme, Team } from "../types";
import { HEX_SIZE } from "../constants";

// Sub-systems
import { GridSystem, RenderableItem } from "./systems/grid";
import { VFXSystem } from "./systems/vfx";
import { UnitRenderSystem } from "./systems/unit";
import { HUDSystem } from "./systems/hud";

// Constants
const HUD_TEXT_OFFSET = 40; 
const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_OFFSET_Y = 86; 

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
    public unit: UnitRenderSystem;
    public hud: HUDSystem;

    // Camera Shake Effects
    private shakeTimer = 0; 
    private shakeIntensity = 0;

    // Transition State
    private transitionT: number = 0;
    private transitionPhase: 'IN' | 'OUT' | 'IDLE' = 'IDLE';

    // Hologram Glitch State
    private holoGlitchTimer = 0;
    private lastDirectorTarget = "";

    constructor() {
        this.grid = new GridSystem();
        this.vfx = new VFXSystem();
        this.unit = new UnitRenderSystem();
        this.hud = new HUDSystem();
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
        
        // Hologram Glitch Logic
        if (engine.directorTargetId !== this.lastDirectorTarget) {
            this.lastDirectorTarget = engine.directorTargetId || "";
            this.holoGlitchTimer = 0.3; // Trigger glitch for 0.3s
        }
        if (this.holoGlitchTimer > 0) this.holoGlitchTimer -= dt;

        // Propagate updates to sub-systems
        this.vfx.update(dt, this.globalTime, engine.currentScene.ambientType);
        this.hud.update(dt);
    }

    public processEventsWithEngine(events: GameEvent[], engine: GameEngine): void {
        events.forEach(event => {
            // 1. HUD Events (Floating Text)
            if (['DAMAGE', 'HEAL', 'CC_APPLIED'].includes(event.type)) {
                 const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                 const terrainHeight = this.grid.getTerrainHeight(hex.q, hex.r, engine);
                 const baseY = event.pos.y - terrainHeight - HUD_TEXT_OFFSET; 

                 let text = "";
                 let color = "#fff";
                 let size = 16;
                 let type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' = 'DAMAGE';
                 let xOffset = 0;

                 if (event.type === 'DAMAGE') {
                     const val = Math.abs(event.value || 0);
                     text = val.toString();
                     color = val > 100 ? '#ef4444' : '#fff'; // Crit Red vs White
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
                 
                 // --- BEAM VISUAL CHECK ---
                 if (event.skill && event.skill.visual === 'BEAM' && event.sourceId) {
                     const source = engine.agents.find(a => a.id === event.sourceId);
                     if (source) {
                         // Use visual position for beam start/end
                         const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                         const sH = this.grid.getTerrainHeight(sHex.q, sHex.r, engine);
                         const sx = source.px;
                         const sy = source.py - sH - 40; 
                         const tH = terrainHeight; 
                         const tx = event.pos.x;
                         const ty = event.pos.y - tH - 20; 
                         this.vfx.spawnBeam(sx, sy, tx, ty, event.skill.color);
                     }
                 }

            } else if (event.type === 'CAST_START') {
                 if (event.skill && event.skill.tag !== 'BASIC') {
                     const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                     const terrainHeight = this.grid.getTerrainHeight(hex.q, hex.r, engine);
                     const isUlt = event.skill.tag === 'ULT';
                     const baseY = event.pos.y - terrainHeight - HUD_TEXT_OFFSET - (isUlt ? 30 : 10); 
                     const xOffset = 55; 
                     this.hud.addFloatingText(event.pos.x + xOffset, baseY, event.skill.name, event.skill.color, 14, 'SHOUT', isUlt);
                 }
            } else if (event.type === 'CAST_FINISH') {
                 if (event.skill && event.skill.tag === 'ULT') {
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         this.vfx.spawnDomainExpansion(event.pos.x, event.pos.y, event.skill.color, 4.0);
                         this.triggerCameraShake(0.5, 8); 
                     }
                 }
            }

            const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
            const terrainHeight = this.grid.getTerrainHeight(hex.q, hex.r, engine);
            const visualY = event.pos.y - terrainHeight;

            switch (event.type) {
                case 'DAMAGE': 
                    this.vfx.spawnExplosion(event.pos.x, visualY, 0, 5, event.color || '#fff', 1.0, 0.8, 'SPARK'); 
                    break;
                case 'PROJECTILE_HIT': 
                    this.handleHitVisuals(event, engine, visualY); 
                    break;
                case 'DEATH':
                    // Trigger massive shatter effect
                    // event.team is passed from AgentManager
                    const team = event.team !== undefined ? event.team : Team.BLUE; 
                    this.vfx.spawnUnitShatter(event.pos.x, visualY, team);
                    break;
                case 'SPAWN':
                    // Trigger spawn visual (Beam in)
                    this.vfx.spawnTeleport(event.pos.x, visualY, event.color || '#fff');
                    break;
            }
        });
    }

    private handleHitVisuals(event: GameEvent, engine: GameEngine, visualY: number): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        
        if (isUlt) {
            this.triggerCameraShake(0.6, 15); 
            this.vfx.spawnDivinePillar(event.pos.x, visualY, color, 1.5);
            this.vfx.spawnShockwave(event.pos.x, visualY, color, 2.0);
            
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
                            this.vfx.spawnDivinePillar(tilePos.x, tileVisualY, color, 0.7, delay);
                            this.vfx.addGridFlash(h.q, h.r, color);
                        } else {
                            this.vfx.addGridFlash(h.q, h.r, color);
                        }
                    }
                });
            } else {
                this.vfx.addImpact(event.pos.x, visualY, color, 'RING', 3.0);
                this.vfx.spawnExplosion(event.pos.x, visualY, 0, 50, color, 2.0, 1.0, 'SPARK');
            }
        } else {
            if (event.skill?.type === 'AOE') {
                const center = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                const radius = event.skill.aoeRadius || 1;
                HexUtils.range(center, radius).forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        this.vfx.addGridFlash(h.q, h.r, color);
                        if (h.q === center.q && h.r === center.r) {
                            this.vfx.addDecal(event.pos.x, visualY, color);
                        }
                    }
                });
                this.vfx.addImpact(event.pos.x, visualY, color, 'RING', 1.2);
            } else {
                this.vfx.addImpact(event.pos.x, visualY, color, 'RING', 0.8);
                this.vfx.spawnExplosion(event.pos.x, visualY, 0, 8, color, 1.2, 0.6, 'SPARK');
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

        // 1. Complex Background
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.drawComplexBackground(ctx, canvasWidth, canvasHeight, scene);

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
            this.vfx.gridFlashes, engine.projectiles,
            this.transitionT, this.transitionPhase,
            this.globalTime
        ));
        
        renderList.push(...this.vfx.collectRenderables(
            engine,
            (q, r) => this.grid.getTerrainHeight(q, r, engine),
            engine.mapConfig,
            this.transitionT,
            this.transitionPhase
        ));
        
        renderList.push(...this.unit.collectRenderables(
            engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), this.globalTime, highlight, engine.mapConfig
        ));

        // Refactored: Iterate over Map<string, string>
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
                         // Use the specific type stored in the Map, or fallback to default
                         const sprite = SpriteManager.getObstacleSprite(type || defaultStyle);
                         c.drawImage(sprite, pos.x - 32, visualY - terrainH - OBSTACLE_OFFSET_Y + 20);
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

        // 5. Atmospheric Fog
        this.drawAtmosphericFog(ctx, engine.mapConfig.w * HEX_SIZE * 2, engine.mapConfig.h * HEX_SIZE * 2, scene);

        // 6. Tactical Overlay Lines (World Space)
        this.drawTacticalOverlay(ctx, engine, highlight);

        // 7. Top VFX
        this.vfx.drawTopLayerParticles(ctx, scene, engine.mapConfig, this.transitionT, this.transitionPhase);

        // 8. HUD
        this.hud.draw(ctx, engine.agents, (q, r) => this.grid.getTerrainHeight(q, r, engine), engine.mapConfig);

        // 9. Holographic Director HUD (Screen Space, but Diegetic)
        if (engine.directorTargetId) {
            const focus = engine.agents.find(a => a.id === engine.directorTargetId);
            if (focus) {
                // We draw this *inside* the camera transform if we want it tied to world, 
                // BUT the requirement is screen corner.
                // To make it look "in-world" but stuck to corner, we draw it after restore() but apply manual perspective.
                ctx.restore(); // Exit Camera
                this.drawHolographicHUD(ctx, focus, canvasWidth, canvasHeight, camera);
                ctx.save(); // Restore dummy save to match final restore() call
            } else {
                ctx.restore();
                ctx.save();
            }
        } else {
            ctx.restore();
            ctx.save();
        }

        ctx.restore(); // Final restore

        // 10. Debug Overlay
        this.drawDebugOverlay(ctx, fps);
    }

    // =========================================================================================
    // 📺 HOLOGRAPHIC TACTICAL HUD (Diegetic UI)
    // =========================================================================================
    
    private drawHolographicHUD(ctx: CanvasRenderingContext2D, agent: Agent, w: number, h: number, cam: Camera) {
        // Position: Top Right, floating
        const hudX = w - 260; 
        const hudY = 60;
        const width = 240;
        const height = 160;

        ctx.save();
        
        // --- 1. Glitch Effect ---
        let gx = 0, gy = 0;
        let alphaMod = 1.0;
        if (this.holoGlitchTimer > 0) {
            gx = (Math.random() - 0.5) * 10;
            gy = (Math.random() - 0.5) * 5;
            alphaMod = 0.5 + Math.random() * 0.5;
            if (Math.random() > 0.8) alphaMod = 0.2; // Flicker out
        }
        
        // --- 2. Perspective Transform ---
        // CHANGED: Use Horizontal Shear (c=-0.15) instead of Vertical Shear (b=-0.12).
        // This keeps text horizontal (better readability) while making the panel lean left.
        // matrix(1, 0, -0.15, 1, x, y)
        ctx.transform(1, 0, -0.15, 1, hudX + gx, hudY + gy);

        // --- 3. Glass Background ---
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        const baseColor = agent.team === Team.BLUE ? '#06b6d4' : '#f97316'; // Cyan vs Orange
        
        bgGrad.addColorStop(0, `${baseColor}40`); // 25% opacity
        bgGrad.addColorStop(1, `${baseColor}05`); // 2% opacity
        
        ctx.fillStyle = bgGrad;
        ctx.globalAlpha = alphaMod;
        ctx.fillRect(0, 0, width, height);
        
        // Grid Lines
        ctx.strokeStyle = `${baseColor}30`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=width; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
        for(let i=0; i<=height; i+=20) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
        ctx.stroke();

        // Border corners
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        const len = 15;
        ctx.beginPath();
        ctx.moveTo(0, len); ctx.lineTo(0, 0); ctx.lineTo(len, 0); // TL
        ctx.moveTo(width-len, 0); ctx.lineTo(width, 0); ctx.lineTo(width, len); // TR
        ctx.moveTo(width, height-len); ctx.lineTo(width, height); ctx.lineTo(width-len, height); // BR
        ctx.moveTo(len, height); ctx.lineTo(0, height); ctx.lineTo(0, height-len); // BL
        ctx.stroke();

        // --- 4. Content: Logic Visualization ---
        
        // Header
        ctx.fillStyle = baseColor;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`TARGET: ${agent.id}`, 10, 20);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`STATUS: ${agent.btStatus.toUpperCase()}`, 10, 35);

        // Logic Graph
        // [SCAN] -> [DECISION] -> [ACTION]
        const nodes = [
            { x: 30, y: 80, label: 'SCAN', active: true }, // Always active
            { x: 100, y: 80, label: 'THINK', active: agent.btStatus !== '待機' },
            { x: 170, y: 80, label: 'ACT', active: agent.castingSkillIdx !== -1 || agent.isMoving }
        ];

        // Draw Connections
        ctx.strokeStyle = `${baseColor}60`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.stroke();

        // Draw Active Flow (Pulse)
        const flowTime = (this.globalTime * 3) % 1; 
        const flowX = 30 + flowTime * 140;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flowX, 80);
        ctx.lineTo(flowX + 15, 80);
        ctx.stroke();

        // Draw Nodes
        nodes.forEach(n => {
            const isActive = n.active;
            
            // Outer Ring
            ctx.strokeStyle = isActive ? baseColor : `${baseColor}40`;
            ctx.fillStyle = `${baseColor}10`;
            ctx.beginPath(); ctx.arc(n.x, n.y, 10, 0, Math.PI*2); 
            ctx.fill(); ctx.stroke();
            
            // Inner Dot
            if (isActive) {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = baseColor; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Label
            ctx.fillStyle = isActive ? '#fff' : `${baseColor}60`;
            ctx.textAlign = 'center';
            ctx.fillText(n.label, n.x, n.y + 22);
        });

        // Special Alert: ULTIMATE
        if (agent.castingSkillIdx !== -1 && agent.skills[agent.castingSkillIdx]?.tag === 'ULT') {
            ctx.fillStyle = '#ef4444';
            ctx.globalAlpha = (0.5 + Math.sin(this.globalTime * 20) * 0.5) * alphaMod;
            ctx.fillRect(0, 130, width, 20);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1.0 * alphaMod;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WARNING: ULTIMATE DETECTED', width/2, 144);
        } else if (agent.hp < agent.maxHp * 0.3) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('CRITICAL CONDITION', width - 70, 20);
        }

        // --- 5. Tether Line to Unit ---
        // Tether should NOT be transformed by the panel skew to look connected to world
        // But since we are in transformed state, we draw a short "antenna" instead.
        ctx.beginPath();
        ctx.moveTo(10, height);
        ctx.lineTo(10, height + 20);
        ctx.strokeStyle = `${baseColor}40`;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    // =========================================================================================
    // ⚔️ TACTICAL OVERLAY SYSTEM (Visualizing AI Intent)
    // =========================================================================================
    
    private drawTacticalOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine, highlight: Agent | null) {
        ctx.save();
        
        // B. Selected Agent Details (Path & Targets)
        if (highlight && highlight.hp > 0) {
            const hH = this.grid.getTerrainHeight(highlight.q, highlight.r, engine);
            const startPx = highlight.px;
            const startPy = highlight.py - hH - 30; // Waist height

            // 1. Movement Trajectory
            if (highlight.trajectory.length > 0) {
                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                
                highlight.trajectory.forEach(hex => {
                    const p = HexUtils.toPx(hex.q, hex.r, engine.mapConfig);
                    const h = this.grid.getTerrainHeight(hex.q, hex.r, engine);
                    ctx.lineTo(p.x, p.y - h - 30);
                });
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]); // Dashed Line
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                ctx.setLineDash([]); // Reset
                ctx.globalAlpha = 1.0;
                
                // Destination Marker
                const dest = highlight.trajectory[highlight.trajectory.length - 1];
                const dP = HexUtils.toPx(dest.q, dest.r, engine.mapConfig);
                const dH = this.grid.getTerrainHeight(dest.q, dest.r, engine);
                
                ctx.save();
                ctx.translate(dP.x, dP.y - dH);
                ctx.scale(1, 0.6);
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); 
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3; ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.lineWidth=2; ctx.stroke();
                ctx.restore();
            }

            // 2. Target Line
            if (highlight.target && highlight.target.hp > 0) {
                const t = highlight.target;
                const tH = this.grid.getTerrainHeight(t.q, t.r, engine);
                const endPx = t.px;
                const endPy = t.py - tH - 30;

                const grad = ctx.createLinearGradient(startPx, startPy, endPx, endPy);
                const isEnemy = highlight.team !== t.team;
                const color = isEnemy ? '#ef4444' : '#4ade80';
                
                grad.addColorStop(0, 'rgba(0,0,0,0)'); // Fade out near source
                grad.addColorStop(0.2, color);
                grad.addColorStop(1, color);

                ctx.beginPath();
                ctx.moveTo(startPx, startPy);
                ctx.lineTo(endPx, endPy);
                
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8 + Math.sin(this.globalTime * 10) * 0.2; // Pulse
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.restore();
    }

    // =========================================================================================
    // 🌌 COMPLEX BACKGROUND SYSTEM
    // =========================================================================================

    private drawComplexBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme): void {
        const t = this.globalTime;

        // 1. Base Gradient (Sky + Horizon)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background); // Sky Top
        bgGrad.addColorStop(0.6, scene.horizon);  // Horizon Line
        bgGrad.addColorStop(1, '#000');           // Below Horizon (Ground blend)
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // 2. Stars / Nebula (For Space/Ice/Night themes)
        if (scene.id === 'VOID' || scene.id === 'ICE' || scene.id === 'FOREST') {
             // Nebula clouds
             ctx.globalCompositeOperation = 'screen';
             const cloudCount = 3;
             for(let i=0; i<cloudCount; i++) {
                 const x = (Math.sin(i * 1.5 + t * 0.05) * 0.5 + 0.5) * w;
                 const y = (Math.cos(i * 1.2 + t * 0.03) * 0.3 + 0.3) * h;
                 const radius = w * 0.4;
                 const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                 grad.addColorStop(0, scene.ambientColor);
                 grad.addColorStop(1, 'transparent');
                 ctx.fillStyle = grad;
                 ctx.globalAlpha = 0.15;
                 ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
             }

             // Stars
             ctx.fillStyle = '#fff';
             const seed = 123; 
             for(let i=0; i<80; i++) {
                 const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
                 const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.8; // Keep stars in upper sky
                 const size = Math.random() * 2;
                 const alpha = Math.sin(t + i) * 0.5 + 0.5;
                 ctx.globalAlpha = alpha * (scene.id === 'VOID' ? 0.8 : 0.4);
                 ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
             }
        }

        // 3. Distant Silhouette / Terrain (Mountains)
        if (scene.id === 'FOREST' || scene.id === 'ICE' || scene.id === 'DESERT' || scene.id === 'MAGMA') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = scene.background; // Blend with sky color but darker
            ctx.globalAlpha = 0.5;
            
            const drawMountainLayer = (speed: number, yOffset: number, roughness: number) => {
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
                    // Simple procedural terrain noise
                    const n = Math.sin(x * 0.01 + t * speed) * Math.cos(x * 0.03) * roughness;
                    ctx.lineTo(x, h * 0.6 + yOffset + n);
                }
                ctx.lineTo(w, h);
                ctx.fill();
            };

            // Far Layer
            drawMountainLayer(0.01, 0, 50);
            // Near Layer (Darker)
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.3;
            drawMountainLayer(0.02, 50, 30);
        }

        // 4. Special Sky Features
        this.drawSkyFeatures(ctx, w, h, scene, t);

        ctx.restore();
    }

    private drawSkyFeatures(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number) {
        if (scene.bgFeature === 'NONE') return;

        ctx.globalCompositeOperation = 'screen';
        
        if (scene.bgFeature === 'SKY_RIVER') {
            // --- COSMIC RIVER ---
            const color = scene.ambientColor; // Purple
            
            // Draw multiple sine waves to simulate a flowing river
            for(let i=0; i<5; i++) {
                const lineWidth = 30 + i * 10;
                const amplitude = 30 + i * 10;
                const phase = t * (0.2 + i * 0.05);
                const yBase = h * 0.3 + i * 20;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = 0.1 - (i * 0.01);
                ctx.beginPath();
                for(let x=0; x<=w; x+=10) {
                    const y = yBase + Math.sin(x * 0.005 + phase) * amplitude + Math.cos(x * 0.01 - t*0.5) * 20;
                    if (x===0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            
            // Add particles in the river
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.6;
            for(let i=0; i<20; i++) {
                const prog = (t * 0.1 + i / 20) % 1;
                const x = prog * w;
                const y = h * 0.3 + 50 + Math.sin(x * 0.005 + t * 0.2) * 40;
                ctx.beginPath(); ctx.arc(x, y, Math.random()*2 + 1, 0, Math.PI*2); ctx.fill();
            }

        } else if (scene.bgFeature === 'AURORA') {
            // --- VERTICAL CURTAINS ---
            const colors = ['#34d399', '#22d3ee', '#818cf8']; // Green, Cyan, Indigo
            
            for(let i=0; i<3; i++) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.2, colors[i]);
                grad.addColorStop(0.8, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.globalAlpha = 0.15;
                
                const phase = t * 0.5 + i * 2;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
                    const y = h * 0.4 + Math.sin(x * 0.01 + phase) * 100 * Math.sin(x*0.002);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(w, 0); // Top Right
                ctx.lineTo(0, 0); // Top Left
                ctx.fill();
            }

        } else if (scene.bgFeature === 'CANOPY') {
            // --- GOD RAYS ---
            ctx.globalCompositeOperation = 'overlay';
            const centerX = w * 0.8;
            const centerY = -100;
            
            const grad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, w);
            grad.addColorStop(0, '#fef08a'); // Yellow light
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.2;
            
            // Draw Angular Rays
            for(let i=0; i<6; i++) {
                const angle = Math.PI / 2 + Math.sin(t * 0.2 + i) * 0.2 + (i * 0.3);
                const width = Math.PI / 16;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + Math.cos(angle - width) * w * 1.5, centerY + Math.sin(angle - width) * w * 1.5);
                ctx.lineTo(centerX + Math.cos(angle + width) * w * 1.5, centerY + Math.sin(angle + width) * w * 1.5);
                ctx.fill();
            }
        } else if (scene.bgFeature === 'HEAT_WAVE') {
            // Rising heat distortion visual
            ctx.fillStyle = '#fca5a5';
            ctx.globalAlpha = 0.05;
            for(let i=0; i<10; i++) {
                const x = (i / 10) * w;
                const height = h * 0.5 + Math.sin(t * 2 + i) * 50;
                const width = w / 10;
                ctx.fillRect(x, h - height, width, height);
            }
        }
    }

    private drawAtmosphericFog(ctx: CanvasRenderingContext2D, mapW: number, mapH: number, scene: SceneTheme) {
        const t = this.globalTime;
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        const fogColor = scene.fogColor || '#fff';
        const fogSprite = AssetManager.getFogCloud(fogColor); // Use pre-rendered sprite
        const numClouds = 8;
        
        for (let i = 0; i < numClouds; i++) {
            // Moving clouds across the map
            const speed = 20;
            const x = ((t * speed + i * (mapW / numClouds)) % (mapW * 1.5)) - mapW * 0.25;
            const y = (Math.sin(i * 123 + t * 0.1) * 0.5 + 0.5) * mapH;
            const size = 300 + Math.sin(i) * 100;
            
            ctx.globalAlpha = 0.1 + Math.sin(t * 0.5 + i) * 0.05; // Pulse opacity
            ctx.drawImage(fogSprite, x - size/2, y - size/2, size, size * 0.6);
        }
        
        ctx.restore();
    }

    private drawDebugOverlay(ctx: CanvasRenderingContext2D, fps: number): void {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; 
        ctx.font = '10px monospace';
        ctx.fillText(`FPS: ${fps}`, 10, 20);
    }
}
