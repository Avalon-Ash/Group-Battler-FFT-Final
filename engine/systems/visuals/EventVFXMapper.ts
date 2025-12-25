
import { GameEvent, Team } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";
import * as VFXSpawners from "../vfx/spawners";

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const terrainHeight = grid.getTerrainHeight(hex.q, hex.r, engine);
        const visualGroundY = event.pos.y - terrainHeight;

        switch (event.type) {
            case 'VISUAL_SLASH':
                this.handleSlash(event, engine, grid, vfx, visualGroundY);
                break;

            case 'DAMAGE': 
                // Only spawn impact if it wasn't a projectile hit (which handles its own visuals)
                // or if it's a direct instant damage event.
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, visualGroundY, camera);
                }
                break;

            case 'VISUAL_BEAM':
                this.handleBeam(event, engine, grid, vfx, visualGroundY);
                break;

            case 'IMPACT_AOE':
                // Check for High-Tier Ultimates first
                if (event.skill) {
                    // Tactical Nuke (Red Ranger Ult 2)
                    if (event.skill.id === 'rr_u2') {
                        VFXSpawners.spawnTacticalNuke(vfx, event.pos.x, visualGroundY, event.color || '#ef4444');
                        camera.addTrauma(0.8); // MASSIVE SHAKE
                        return;
                    }
                    // Meteor (Red Mage Ult 1)
                    if (event.skill.id === 'mr_u1') {
                        VFXSpawners.spawnMeteorImpact(vfx, event.pos.x, visualGroundY, event.color || '#ea580c');
                        camera.addTrauma(0.6);
                        return;
                    }
                    // Black Hole (Blue Mage Ult 1)
                    if (event.skill.id === 'mb_u1') {
                        VFXSpawners.spawnBlackHoleCollapse(vfx, event.pos.x, visualGroundY, '#000');
                        camera.addTrauma(0.4);
                        return;
                    }
                }

                // Default AOE Blast
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualGroundY, 0, 20, event.color || '#fff', 2.0, 0.6, 'SPARK');
                VFXSpawners.addImpact(vfx, event.pos.x, visualGroundY, 0, event.color || '#fff', 'BLAST', 0.5);
                VFXSpawners.spawnShockwave(vfx, event.pos.x, visualGroundY, event.color || '#fff', 0.6);
                camera.addTrauma(0.25); 
                break;

            case 'PROJECTILE_HIT': 
                // Only handle special visuals if not handled by IMPACT_AOE
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, visualGroundY, vfx, grid, camera); 
                }
                break;

            case 'DEATH':
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                if (dAgent) VFXSpawners.spawnUnitShatter(vfx, event.pos.x, visualGroundY, dAgent.team, dAgent.role);
                camera.addTrauma(0.05); // Minimal impact
                break;

            case 'SPAWN':
                VFXSpawners.spawnTeleport(vfx, event.pos.x, visualGroundY, event.color || '#fff');
                break;
                
            case 'CAST_BREAK':
                // High Impact Cast Break
                VFXSpawners.spawnCastBreak(vfx, event.pos.x, visualGroundY, event.value || 1, event.color || '#fff');
                camera.addTrauma(0.3); 
                break;
                
            case 'CAST_FINISH':
                if (event.skill && event.skill.tag === 'ULT') {
                     // Very slight nudge on Ult finish
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         camera.addTrauma(0.05); 
                     }
                 }
                 break;
        }
    }

    private handleSlash(event: GameEvent, engine: GameEngine, grid: GridSystem, vfx: VFXSystem, visualGroundY: number) {
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
    }

    private handleBeam(event: GameEvent, engine: GameEngine, grid: GridSystem, vfx: VFXSystem, visualGroundY: number) {
        if (event.sourceId) {
            const source = engine.agents.find(a => a.id === event.sourceId);
            if (source) {
                const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                const sH = grid.getTerrainHeight(sHex.q, sHex.r, engine);
                VFXSpawners.spawnBeam(vfx, source.px, source.py - sH - 40, event.pos.x, visualGroundY - 30, event.color || '#fff');
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualGroundY - 30, 0, 5, event.color || '#fff', 0.5, 0.5, 'SPARK');
            }
        }
    }

    private handleDamageImpact(event: GameEvent, engine: GameEngine, vfx: VFXSystem, visualGroundY: number, camera: CameraSystem) {
        const dmg = Math.abs(event.value || 0);
        
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
        
        if (dmg > 50) camera.addTrauma(0.05); // Minimized
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
        const visualType = skill?.visual || 'BOLT';
        
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const centerH = grid.getTerrainHeight(centerHex.q, centerHex.r, engine);
        const centerVisualY = event.pos.y - centerH;

        if (isUlt) {
            camera.addTrauma(0.15); 
            
            // 1. FACTION RITUAL (The Ground Effect)
            if (faction === Team.BLUE) {
                VFXSpawners.spawnDivinePillar(vfx, event.pos.x, centerVisualY, color, 1.5, 0);
                VFXSpawners.spawnShockwave(vfx, event.pos.x, centerVisualY, color, 1.2);
            } else {
                VFXSpawners.spawnBloodRitual(vfx, event.pos.x, centerVisualY, color, 1.5);
            }

            // Check for specific single target ults
            if (skill && skill.id === 'wr_u1') { // Ragnarok
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 50, '#991b1b', 2.0, 1.0, 'DEBRIS'); // Blood explosion
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, 0, '#ef4444', 'BLAST', 0.8);
                camera.addTrauma(0.5);
            } else {
                // Generic Single Target Ult
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 40, color, 1.2, 0.8, 'SPARK');
            }
            
        } else {
            // --- NORMAL SKILLS (Specific Visuals) ---
            
            // 1. SMASH: Heavy Ground Impact
            if (visualType === 'SMASH') {
                VFXSpawners.addImpact(vfx, event.pos.x, centerVisualY, 0, color, 'SHOCKWAVE', 0.4);
                // Debris flies up
                VFXSpawners.spawnExplosion(vfx, event.pos.x, centerVisualY, 0, 8, color, 0.5, 0.6, 'SHARD'); 
            } 
            // 2. SLASH: Directional Energy
            else if (visualType === 'SLASH') {
                // Direction calculated relative to source
                if (source) {
                    const dx = event.pos.x - source.px;
                    const dy = event.pos.y - source.py;
                    const len = Math.sqrt(dx*dx + dy*dy) || 1;
                    VFXSpawners.spawnDirectionalImpact(vfx, event.pos.x, visualY, 30, dx/len, dy/len, color, 'PHYSICAL');
                } else {
                    VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 30, 8, color, 1.5, 0.4, 'SPARK');
                }
            }
            // 3. FIREBALL / BOMB: Volumetric Explosion
            else if (visualType === 'FIREBALL' || visualType === 'BOMB') {
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, 20, color, 'BLAST', 0.5);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 20, 5, color, 0.5, 1.0, 'SMOKE');
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 20, 8, '#fff', 1.0, 0.3, 'SPARK');
            }
            // 4. BOLT / ARROW / BEAM: High Precision
            else {
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, 30, color, 'RING', 0.4);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 30, 12, color, 2.0, 0.4, 'SPARK');
            }
        }
    }
}
