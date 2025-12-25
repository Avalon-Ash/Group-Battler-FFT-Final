
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
                this.handleDamageImpact(event, engine, vfx, visualGroundY, camera);
                break;

            case 'VISUAL_BEAM':
                this.handleBeam(event, engine, grid, vfx, visualGroundY);
                break;

            case 'PROJECTILE_HIT': 
                this.handleHitVisuals(event, engine, visualGroundY, vfx, grid, camera); 
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
                VFXSpawners.spawnDomainShatter(vfx, event.pos.x, event.pos.y, event.value || 1, event.color || '#fff');
                camera.addTrauma(0.05);
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
        
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const centerH = grid.getTerrainHeight(centerHex.q, centerHex.r, engine);
        const centerVisualY = event.pos.y - centerH;

        if (isUlt) {
            camera.addTrauma(0.1); // Minimized from 0.2
            
            // 1. FACTION RITUAL
            if (faction === Team.BLUE) {
                VFXSpawners.spawnDivinePillar(vfx, event.pos.x, centerVisualY, color, 1.5, 0);
                VFXSpawners.spawnShockwave(vfx, event.pos.x, centerVisualY, color, 1.2);
            } else {
                VFXSpawners.spawnBloodRitual(vfx, event.pos.x, centerVisualY, color, 1.5);
            }

            // 2. AOE RIPPLE
            if (skill?.type === 'AOE') {
                const radius = skill.aoeRadius || 1;
                const affectedHexes = HexUtils.range(centerHex, radius);
                
                affectedHexes.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        const dist = HexUtils.dist(centerHex, h);
                        const delay = dist * 0.08; 
                        
                        VFXSpawners.spawnGridImpact(vfx, tilePos.x, tileVisualY, color, faction, delay);
                        
                        if (skill.ccType === 'DOT' || skill.ccType === 'SILENCE') {
                            VFXSpawners.spawnLingeringField(vfx, tilePos.x, tileVisualY, color, skill.ccType, 4.0, delay);
                        }
                    }
                });
            } else {
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 0, 40, color, 1.2, 0.8, 'SPARK');
            }
        } else {
            // Normal Skill Logic
            if (skill?.type === 'AOE') {
                const radius = skill.aoeRadius || 1;
                const affected = HexUtils.range(centerHex, radius);
                VFXSpawners.addDecal(vfx, event.pos.x, centerVisualY, color);
                
                affected.forEach(h => {
                    if (engine.isValid(h.q, h.r)) {
                        const tileH = grid.getTerrainHeight(h.q, h.r, engine);
                        const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                        const tileVisualY = tilePos.y - tileH;
                        const dist = HexUtils.dist(centerHex, h);
                        
                        if (dist <= radius) {
                            if (Math.random() < 0.6) { 
                                VFXSpawners.addImpact(vfx, tilePos.x, tileVisualY, 0, color, 'RING', 0.4);
                            }
                            if (skill.ccType === 'DOT') {
                                VFXSpawners.spawnLingeringField(vfx, tilePos.x, tileVisualY, color, skill.ccType, 3.0, dist * 0.05);
                            }
                        }
                    }
                });
            } else {
                VFXSpawners.addImpact(vfx, event.pos.x, visualY, 30, color, 'RING', 0.6);
                VFXSpawners.spawnExplosion(vfx, event.pos.x, visualY, 30, 12, color, 1.0, 0.5, 'SPARK');
            }
        }
    }
}
