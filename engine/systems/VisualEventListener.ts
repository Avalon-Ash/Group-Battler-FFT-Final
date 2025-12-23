
import { GameEngine, Agent } from "../game";
import { GameEvent, Team } from "../../types";
import { HexUtils } from "../utils";
import { UNIT_VISUAL_HEIGHT, HUD_PADDING, UNIT_BODY_OFFSET } from "../../constants";

// Systems
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "./grid";
import { CameraSystem } from "./CameraSystem";
import * as VFXSpawners from "./vfx/spawners";

const HUD_TEXT_OFFSET = UNIT_VISUAL_HEIGHT + HUD_PADDING + 20;
const KILL_STREAK_WINDOW = 12.0; 

export class VisualEventListener {
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
        if (engine.battleTime < 0.1) {
            this.killStreaks.clear();
            this.firstBlood = false;
        }

        events.forEach(event => {
            const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
            const terrainHeight = grid.getTerrainHeight(hex.q, hex.r, engine);
            const visualGroundY = event.pos.y - terrainHeight;

            // 1. HUD & Text
            if (['DAMAGE', 'HEAL', 'CC_APPLIED'].includes(event.type)) {
                 const baseY = visualGroundY - HUD_TEXT_OFFSET; 
                 let text = "";
                 let color = "#fff";
                 let size = 16;
                 let type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' = 'DAMAGE';
                 let xOffset = 0;

                 if (event.type === 'DAMAGE') {
                     const val = Math.abs(event.value || 0);
                     text = val.toString();
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

                 if (text) hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);

            } else if (event.type === 'CAST_START') {
                 if (event.skill && event.skill.tag !== 'BASIC') {
                     const isUlt = event.skill.tag === 'ULT';
                     const baseY = visualGroundY - HUD_TEXT_OFFSET - (isUlt ? 30 : 10); 
                     const xOffset = 55; 
                     hud.addFloatingText(event.pos.x + xOffset, baseY, event.skill.name, event.skill.color, 14, 'SHOUT', isUlt);
                 }
            } else if (event.type === 'CAST_FINISH') {
                 if (event.skill && event.skill.tag === 'ULT') {
                     // Only spawn instant impact logic here if it's not a projectile
                     // If it is projectile, the HIT event handles the big boom
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         camera.addTrauma(0.2); 
                     }
                 }
            } else if (event.type === 'KILL' && event.sourceId) {
                // ... (Kill Streak Logic kept same for brevity, it works fine) ...
                const now = engine.battleTime;
                const killer = event.sourceId;
                const killerAgent = engine.agents.find(a => a.id === killer);
                
                if (!this.firstBlood) {
                    this.firstBlood = true;
                    if (killerAgent) {
                        const kHex = HexUtils.fromPx(killerAgent.px, killerAgent.py, engine.mapConfig);
                        const kH = grid.getTerrainHeight(kHex.q, kHex.r, engine);
                        hud.addFloatingText(killerAgent.px, killerAgent.py - kH - HUD_TEXT_OFFSET - 60, "FIRST BLOOD", "#ef4444", 36, 'KILL_STREAK');
                        camera.addTrauma(0.3);
                    }
                }

                let streak = 1;
                const existing = this.killStreaks.get(killer);
                if (existing && now - existing.lastTime <= KILL_STREAK_WINDOW) streak = existing.count + 1;
                
                this.killStreaks.set(killer, { count: streak, lastTime: now });
                
                if (streak >= 2 && killerAgent) {
                    let streakText = "DOUBLE KILL";
                    let streakColor = "#cbd5e1";
                    if (streak === 3) { streakText = "TRIPLE KILL"; streakColor = "#fcd34d"; }
                    else if (streak === 4) { streakText = "QUADRA KILL"; streakColor = "#fb923c"; }
                    else if (streak >= 5) { streakText = "PENTA KILL"; streakColor = "#ef4444"; }
                    
                    const kHex = HexUtils.fromPx(killerAgent.px, killerAgent.py, engine.mapConfig);
                    const kH = grid.getTerrainHeight(kHex.q, kHex.r, engine);
                    hud.addFloatingText(killerAgent.px, killerAgent.py - kH - HUD_TEXT_OFFSET - 40, streakText, streakColor, 32 + (streak * 4), 'KILL_STREAK');
                    camera.addTrauma(0.2 + streak * 0.1);
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

                            VFXSpawners.spawnConnectorSlash(vfx, source.px, source.py - sH, target.px, target.py - tH, event.color || '#fff', event.skill?.visual || 'SLASH');
                        }
                    }
                    break;

                case 'DAMAGE': 
                    const dmg = Math.abs(event.value || 0);
                    // Standard hit spark
                    if (event.sourceId && event.targetId) {
                        const s = engine.agents.find(a => a.id === event.sourceId);
                        const t = engine.agents.find(a => a.id === event.targetId);
                        if (s && t) {
                            const bodyHeight = UNIT_BODY_OFFSET + t.physics.z;
                            const dx = t.px - s.px; const dy = t.py - s.py;
                            const len = Math.sqrt(dx*dx + dy*dy);
                            if (len > 0) {
                                const type = (event.skill?.visual === 'SLASH' || event.skill?.visual === 'SMASH') ? 'PHYSICAL' : 'MAGICAL';
                                VFXSpawners.spawnDirectionalImpact(vfx, event.pos.x, visualGroundY, bodyHeight, dx/len, dy/len, event.color || '#fff', type);
                            }
                        }
                    } else {
                        VFXSpawners.spawnExplosion(vfx, event.pos.x, visualGroundY, 25, 5, event.color || '#fff', 1.0, 0.8, 'SPARK');
                    }
                    if (dmg > 50) camera.addTrauma(0.15);
                    break;

                case 'VISUAL_BEAM':
                    if (event.sourceId) {
                        const source = engine.agents.find(a => a.id === event.sourceId);
                        if (source) {
                            const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                            const sH = grid.getTerrainHeight(sHex.q, sHex.r, engine);
                            VFXSpawners.spawnBeam(vfx, source.px, source.py - sH - 40, event.pos.x, visualGroundY - 30, event.color || '#fff');
                            VFXSpawners.spawnExplosion(vfx, event.pos.x, visualGroundY - 30, 0, 5, event.color || '#fff', 0.5, 0.5, 'SPARK');
                        }
                    }
                    break;

                case 'PROJECTILE_HIT': 
                    this.handleHitVisuals(event, engine, visualGroundY, vfx, grid, camera); 
                    break;

                case 'DEATH':
                    const dAgent = engine.agents.find(a => a.id === event.sourceId);
                    if (dAgent) VFXSpawners.spawnUnitShatter(vfx, event.pos.x, visualGroundY, dAgent.team, dAgent.role);
                    camera.addTrauma(0.3); 
                    break;

                case 'SPAWN':
                    VFXSpawners.spawnTeleport(vfx, event.pos.x, visualGroundY, event.color || '#fff');
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
        const skill = event.skill;
        
        // Find Source Agent to determine Faction Style
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const centerH = grid.getTerrainHeight(centerHex.q, centerHex.r, engine);
        const centerVisualY = event.pos.y - centerH;

        if (isUlt) {
            camera.addTrauma(0.5);
            
            // --- 1. CENTER PIECE: FACTION SPECIFIC RITUAL ---
            if (faction === Team.BLUE) {
                // Imperial: Divine Pillar (Order)
                // Spawn a clean, geometric pillar of light
                VFXSpawners.spawnDivinePillar(vfx, event.pos.x, centerVisualY, color, 1.5, 0);
                VFXSpawners.spawnShockwave(vfx, event.pos.x, centerVisualY, color, 1.2);
            } else {
                // Covenant: Hellgate (Chaos)
                // Spawn fissures, blood, and dark energy
                VFXSpawners.spawnBloodRitual(vfx, event.pos.x, centerVisualY, color, 1.5);
            }

            // --- 2. AOE RIPPLE: PER TILE SPLASH ---
            if (skill?.type === 'AOE') {
                const radius = skill.aoeRadius || 1;
                const affectedHexes = HexUtils.range(centerHex, radius);
                
                affectedHexes.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        
                        const dist = HexUtils.dist(centerHex, h);
                        // Delay creates the "Ripple" expanding outward
                        const delay = dist * 0.08; 
                        
                        // Spawn a sub-effect on this specific tile
                        VFXSpawners.spawnGridImpact(vfx, tilePos.x, tileVisualY, color, faction, delay);
                        
                        // --- 3. PERSISTENT FIELD EFFECTS (SMOKE/FIRE) ---
                        // If skill has DoT, spawn lingering particles
                        if (skill.ccType === 'DOT' || skill.ccType === 'SILENCE') {
                            VFXSpawners.spawnLingeringField(vfx, tilePos.x, tileVisualY, color, skill.ccType, 4.0, delay);
                        }
                    }
                });
            } else {
                // Single Target Ult Explosion
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 40, color, 1.2, 0.8, 'SPARK');
            }
        } else {
            // Normal Skill Logic
            if (skill?.type === 'AOE') {
                const radius = skill.aoeRadius || 1;
                const affected = HexUtils.range(centerHex, radius);
                
                // Add Decal at center
                VFXSpawners.addDecal(vfx, event.pos.x, centerVisualY, color);
                
                affected.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        const dist = HexUtils.dist(centerHex, h);
                        
                        // Smaller ripple for normal skills
                        if (dist <= radius) {
                            if (Math.random() < 0.6) { // Not every tile needs a heavy hit for basics
                                VFXSpawners.addImpact(vfx, tilePos.x, tileVisualY, 0, color, 'RING', 0.4);
                            }
                            if (skill.ccType === 'DOT') {
                                VFXSpawners.spawnLingeringField(vfx, tilePos.x, tileVisualY, color, skill.ccType, 3.0, dist * 0.05);
                            }
                        }
                    }
                });
            } else {
                // Single hit
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, 30, color, 'RING', 0.6);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 30, 12, color, 1.0, 0.5, 'SPARK');
            }
        }
    }
}
