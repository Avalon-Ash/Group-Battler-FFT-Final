
import { GameEngine } from "../game";
import { GameEvent, Team } from "../../types";
import { HexUtils } from "../utils";
import { UNIT_VISUAL_HEIGHT, HUD_PADDING } from "../../constants";

// Systems
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "./grid";
import { CameraSystem } from "./CameraSystem";
import * as VFXSpawners from "./vfx/spawners";

const HUD_TEXT_OFFSET = UNIT_VISUAL_HEIGHT + HUD_PADDING + 20;
// TA TUNING: Increased from 5.0s to 12.0s. 
// Auto-battler units have move/cast times that make 5s too strict for a Penta.
const KILL_STREAK_WINDOW = 12.0; 

export class VisualEventListener {
    // Kill Streak State: AgentID -> { Count, LastTime }
    private killStreaks = new Map<string, { count: number, lastTime: number }>();
    private firstBlood = false;
    
    public process(
        events: GameEvent[], 
        engine: GameEngine, 
        vfx: VFXSystem, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        // Reset Logic: If battle just started or reset, clear streaks
        if (engine.battleTime < 0.1) {
            this.killStreaks.clear();
            this.firstBlood = false;
        }

        events.forEach(event => {
            const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
            const terrainHeight = grid.getTerrainHeight(hex.q, hex.r, engine);
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
                     // Highlight high damage
                     const isCrit = val > 100;
                     color = isCrit ? '#ef4444' : '#fff'; 
                     size = isCrit ? 24 : 16;
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
                     hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);
                 }

            } else if (event.type === 'CAST_START') {
                 if (event.skill && event.skill.tag !== 'BASIC') {
                     const isUlt = event.skill.tag === 'ULT';
                     const baseY = visualY - HUD_TEXT_OFFSET - (isUlt ? 30 : 10); 
                     const xOffset = 55; 
                     hud.addFloatingText(event.pos.x + xOffset, baseY, event.skill.name, event.skill.color, 14, 'SHOUT', isUlt);
                 }
            } else if (event.type === 'CAST_FINISH') {
                 if (event.skill && event.skill.tag === 'ULT') {
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         VFXSpawners.spawnDomainExpansion(vfx, event.pos.x, event.pos.y, event.skill.color, 4.0);
                         // Reduced cast impact
                         camera.addTrauma(0.2); 
                     }
                 }
            }

            // 2. Kill Streaks (New)
            if (event.type === 'KILL' && event.sourceId) {
                const now = engine.battleTime;
                const killer = event.sourceId;
                const killerAgent = engine.agents.find(a => a.id === killer);
                
                // FIRST BLOOD LOGIC
                if (!this.firstBlood) {
                    this.firstBlood = true;
                    if (killerAgent) {
                        const kHex = HexUtils.fromPx(killerAgent.px, killerAgent.py, engine.mapConfig);
                        const kH = grid.getTerrainHeight(kHex.q, kHex.r, engine);
                        hud.addFloatingText(
                            killerAgent.px, 
                            killerAgent.py - kH - HUD_TEXT_OFFSET - 60, 
                            "FIRST BLOOD", 
                            "#ef4444", 
                            36, 
                            'KILL_STREAK'
                        );
                        camera.addTrauma(0.3);
                    }
                }

                let streak = 1;
                const existing = this.killStreaks.get(killer);
                
                if (existing) {
                    if (now - existing.lastTime <= KILL_STREAK_WINDOW) {
                        streak = existing.count + 1;
                    } else {
                        streak = 1; // Expired
                    }
                }
                
                this.killStreaks.set(killer, { count: streak, lastTime: now });
                
                // Trigger Visual if Streak > 1
                if (streak >= 2) {
                    let streakText = "";
                    let streakColor = "#fff";
                    let trauma = 0;
                    
                    if (streak === 2) { streakText = "DOUBLE KILL"; streakColor = "#cbd5e1"; trauma = 0.2; }
                    else if (streak === 3) { streakText = "TRIPLE KILL"; streakColor = "#fcd34d"; trauma = 0.3; }
                    else if (streak === 4) { streakText = "QUADRA KILL"; streakColor = "#fb923c"; trauma = 0.4; }
                    else if (streak >= 5) { streakText = "PENTA KILL"; streakColor = "#ef4444"; trauma = 0.6; } // Epic
                    
                    // Display above unit
                    if (killerAgent) {
                        const kHex = HexUtils.fromPx(killerAgent.px, killerAgent.py, engine.mapConfig);
                        const kH = grid.getTerrainHeight(kHex.q, kHex.r, engine);
                        // Offset higher than damage numbers
                        hud.addFloatingText(
                            killerAgent.px, 
                            killerAgent.py - kH - HUD_TEXT_OFFSET - 40, 
                            streakText, 
                            streakColor, 
                            32 + (streak * 4), // Scale up size with streak
                            'KILL_STREAK'
                        );
                        
                        camera.addTrauma(trauma);
                    }
                }
            }

            // 3. VFX Handling
            switch (event.type) {
                case 'VISUAL_SLASH':
                    if (event.sourceId && event.targetId) {
                        const source = engine.agents.find(a => a.id === event.sourceId);
                        const target = engine.agents.find(a => a.id === event.targetId);
                        if (source && target) {
                            const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                            const sH = grid.getTerrainHeight(sHex.q, sHex.r, engine);
                            
                            const tHex = HexUtils.fromPx(target.px, target.py, engine.mapConfig);
                            const tH = grid.getTerrainHeight(tHex.q, tHex.r, engine);

                            VFXSpawners.spawnConnectorSlash(
                                vfx,
                                source.px, source.py - sH,
                                target.px, target.py - tH,
                                event.color || '#fff',
                                event.skill?.visual || 'SLASH'
                            );
                        }
                    }
                    break;

                case 'DAMAGE': 
                    const dmg = Math.abs(event.value || 0);
                    const isHeavy = dmg > 50; 
                    
                    // Directional Impact Logic
                    let handled = false;
                    if (event.sourceId && event.targetId) {
                        const s = engine.agents.find(a => a.id === event.sourceId);
                        const t = engine.agents.find(a => a.id === event.targetId);
                        if (s && t) {
                            // Calc direction
                            // We use world coordinates (px, py) from Agent, which are flat.
                            const dx = t.px - s.px;
                            const dy = t.py - s.py;
                            const len = Math.sqrt(dx*dx + dy*dy);
                            if (len > 0) {
                                const dirX = dx / len;
                                const dirY = dy / len;
                                
                                const type = (event.skill?.visual === 'SLASH' || event.skill?.visual === 'SMASH') ? 'PHYSICAL' : 'MAGICAL';
                                
                                VFXSpawners.spawnDirectionalImpact(
                                    vfx,
                                    event.pos.x, visualY - 20,
                                    dirX, dirY,
                                    event.color || '#fff',
                                    type
                                );
                                handled = true;
                            }
                        }
                    }

                    if (!handled) {
                        // Fallback generic explosion
                        // Reduced particle count via factory
                        VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY - 20, 0, 5, event.color || '#fff', 1.0, 0.8, 'SPARK');
                    }
                    
                    if (isHeavy) {
                        // Only shake on heavy hits
                        camera.addTrauma(0.15);
                        // Debris is now disabled in spawner, but we could re-enable for crits here if desired
                        // VFXSpawners.spawnDebris(vfx, event.pos.x, visualY - 20, event.color || '#fff', 3);
                    }
                    break;

                case 'VISUAL_BEAM':
                    if (event.sourceId) {
                        const source = engine.agents.find(a => a.id === event.sourceId);
                        if (source) {
                            const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                            const sH = grid.getTerrainHeight(sHex.q, sHex.r, engine);
                            const sx = source.px;
                            const sy = source.py - sH - 40; 
                            
                            const tx = event.pos.x;
                            const ty = visualY - 20; 
                            
                            VFXSpawners.spawnBeam(vfx, sx, sy, tx, ty, event.color || '#fff');
                            VFXSpawners.spawnExplosion(vfx, tx, ty, 0, 5, event.color || '#fff', 0.5, 0.5, 'SPARK');
                        }
                    }
                    break;

                case 'PROJECTILE_HIT': 
                    this.handleHitVisuals(event, engine, visualY, vfx, grid, camera); 
                    break;

                case 'DEATH':
                    const team = event.team !== undefined ? event.team : Team.BLUE; 
                    VFXSpawners.spawnUnitShatter(vfx, event.pos.x, visualY, team);
                    camera.addTrauma(0.3); 
                    break;

                case 'SPAWN':
                    VFXSpawners.spawnTeleport(vfx, event.pos.x, visualY, event.color || '#fff');
                    break;
                    
                case 'CAST_BREAK':
                    VFXSpawners.spawnDomainShatter(vfx, event.pos.x, event.pos.y, event.value || 1, event.color || '#fff');
                    camera.addTrauma(0.1);
                    break;
            }
        });
    }

    private handleHitVisuals(
        event: GameEvent, 
        engine: GameEngine, 
        visualY: number, 
        vfx: VFXSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        
        if (isUlt) {
            camera.addTrauma(0.4); // Ult impact
            VFXSpawners.spawnDivinePillar(vfx, event.pos.x, visualY, color, 1.2);
            VFXSpawners.spawnShockwave(vfx, event.pos.x, visualY, color, 1.5);
            
            if (event.skill?.type === 'AOE') {
                const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                const radius = event.skill.aoeRadius || 1;
                const affectedHexes = HexUtils.range(centerHex, radius);
                
                affectedHexes.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        
                        // Reduced visual density for AOE tiles
                        if (Math.random() < 0.3) { 
                            VFXSpawners.spawnExplosion(vfx, tilePos.x, tileVisualY, 0, 3, color, 1.0, 0.5, 'SPARK');
                        }
                    }
                });
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, color, 'RING', 2.0);
            } else {
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, color, 'RING', 2.0);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 30, color, 1.5, 0.8, 'SPARK');
            }
        } else {
            // Normal Projectile
            if (event.skill?.type === 'AOE') {
                const center = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                const radius = event.skill.aoeRadius || 1;
                HexUtils.range(center, radius).forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        // REMOVED: GridFlash on normal hits (Too noisy)
                        if (h.q === center.q && h.r === center.r) {
                            VFXSpawners.addDecal(vfx, event.pos.x, visualY, color);
                        }
                    }
                });
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, color, 'RING', 0.8);
            } else {
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, color, 'RING', 0.6);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 5, color, 1.0, 0.5, 'SPARK');
            }
        }
    }
}
