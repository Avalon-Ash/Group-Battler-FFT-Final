
import { GameEvent, Team } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

// Modular Spawners
import * as Generic from "../vfx/spawners/generic";
import * as Imperial from "../vfx/spawners/imperial";
import * as Covenant from "../vfx/spawners/covenant";

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
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, visualGroundY, camera);
                }
                break;

            case 'VISUAL_BEAM':
                this.handleBeam(event, engine, grid, vfx, visualGroundY);
                break;

            case 'IMPACT_AOE':
                if (event.skill) {
                    const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                    const radius = event.skill.aoeRadius || 1;
                    const affectedHexes = HexUtils.range(centerHex, radius);
                    
                    const id = event.skill.id;
                    const color = event.color || '#fff';

                    // =================================================================
                    // 🔵 IMPERIAL (BLUE) ULTIMATE VFX MAPPING
                    // =================================================================
                    
                    if (id === 'tb_u1') { // Sanctuary
                        Imperial.spawnImperialSanctuary(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.7); return;
                    }
                    if (id === 'tb_u2') { // Kings Blessing
                        Imperial.spawnImperialKingsBlessing(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.3); return;
                    }
                    if (id === 'wb_u1') { // Thunder
                        Imperial.spawnImperialThunder(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.6); return;
                    }
                    if (id === 'wb_u2') { // Daybreak
                        Imperial.spawnImperialDaybreak(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.8); return;
                    }
                    if (id === 'rb_u1') { // Crystal Arrow
                        Imperial.spawnImperialCrystalArrow(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.6); return;
                    }
                    if (id === 'rb_u2') { // Starfall
                        Imperial.spawnImperialStarfall(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.4); return;
                    }
                    if (id === 'mb_u1') { // Black Hole
                        Imperial.spawnImperialBlackHole(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.5); return;
                    }
                    if (id === 'mb_u2') { // Absolute Zero
                        Imperial.spawnImperialFrostfall(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.5); return;
                    }
                    if (id === 'sb_u1') { // Intervention
                        Imperial.spawnImperialIntervention(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.3); return;
                    }
                    if (id === 'sb_u2') { // Resurrection
                        Imperial.spawnImperialResurrection(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.4); return;
                    }

                    // =================================================================
                    // 🔴 COVENANT (RED) ULTIMATE VFX MAPPING
                    // =================================================================
                    
                    if (id === 'tr_u1') { // Guillotine
                        Covenant.spawnCovenantGuillotine(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.8); return;
                    }
                    if (id === 'tr_u2') { // Undead Army
                        Covenant.spawnCovenantUndeadArmy(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.5); return;
                    }
                    if (id === 'wr_u1') { // Ragnarok
                        Covenant.spawnCovenantRagnarok(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.9); return;
                    }
                    if (id === 'wr_u2') { // Blood Storm
                        Covenant.spawnCovenantBloodStorm(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.6); return;
                    }
                    if (id === 'rr_u1') { // Railgun
                        Covenant.spawnCovenantRailgun(vfx, event.pos.x - 200, event.pos.y, event.pos.x, event.pos.y, color);
                        camera.addTrauma(0.8); return;
                    }
                    if (id === 'rr_u2') { // Nuke
                        Covenant.spawnCovenantNuke(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.8); return;
                    }
                    if (id === 'mr_u1') { // Meteor
                        Covenant.spawnCovenantMeteor(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.7); return;
                    }
                    if (id === 'mr_u2') { // Death Finger (AOE fallback)
                        Covenant.spawnCovenantDeathFinger(vfx, event.pos.x, event.pos.y - 200, event.pos.x, event.pos.y, color);
                        camera.addTrauma(0.7); return;
                    }
                    if (id === 'sr_u1') { // Soul Link
                        Covenant.spawnCovenantSoulLink(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.3); return;
                    }
                    if (id === 'sr_u2') { // Ancestors
                        Covenant.spawnCovenantAncestors(vfx, event.pos.x, visualGroundY, color);
                        camera.addTrauma(0.3); return;
                    }

                    // Generic Grid Reaction
                    affectedHexes.forEach(h => {
                        if (engine.map.isValid(h.q, h.r)) {
                            const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                            const hHeight = grid.getTerrainHeight(h.q, h.r, engine);
                            const tileVisualY = tilePos.y - hHeight;
                            const dist = HexUtils.dist(centerHex, h);
                            const delay = dist * 0.06;

                            Generic.spawnGridImpact(vfx, tilePos.x, tileVisualY, event.color || '#fff', Team.BLUE, delay);
                        }
                    });
                }

                // Generic Fallback
                Generic.spawnExplosion(vfx, event.pos.x, visualGroundY, 0, 20, event.color || '#fff', 2.0, 0.6, 'SPARK');
                Generic.addImpact(vfx, event.pos.x, visualGroundY, 0, event.color || '#fff', 'BLAST', 0.5);
                Generic.spawnShockwave(vfx, event.pos.x, visualGroundY, event.color || '#fff', 0.6);
                camera.addTrauma(0.25); 
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, visualGroundY, vfx, grid, camera); 
                } else {
                    const hitColor = event.skill?.color || '#fff';
                    Generic.spawnExplosion(vfx, event.pos.x, visualGroundY, 20, 8, hitColor, 1.0, 0.3, 'SPARK');
                }
                break;

            case 'DEATH':
                // Look for the agent in the engine (it might still exist in the array briefly)
                // OR we pass the team/role/velocity directly in the event data if agent is already gone from array.
                // The AgentManager handles 'fullyDead' later, so agent *should* still be findable by ID.
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                
                if (dAgent) {
                    // Extract physics momentum to give the ragdoll debris direction
                    const vx = dAgent.physics.vx || 0;
                    const vy = dAgent.physics.vy || 0;
                    
                    Generic.spawnUnitShatter(
                        vfx, 
                        event.pos.x, 
                        visualGroundY, 
                        dAgent.team, 
                        dAgent.role,
                        vx,
                        vy
                    );
                }
                camera.addTrauma(0.15); // Increased trauma on death
                break;

            case 'SPAWN':
                Generic.spawnTeleport(vfx, event.pos.x, visualGroundY, event.color || '#fff');
                break;
                
            case 'CAST_BREAK':
                Generic.spawnCastBreak(vfx, event.pos.x, visualGroundY, event.value || 1, event.color || '#fff');
                camera.addTrauma(0.3); 
                break;
                
            case 'CAST_FINISH':
                if (event.skill && event.skill.tag === 'ULT') {
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

                Generic.spawnConnectorSlash(vfx, source.px, source.py - sH, target.px, target.py - tH, event.color || '#fff', event.skill?.visual || 'SLASH');
            }
        }
    }

    private handleBeam(event: GameEvent, engine: GameEngine, grid: GridSystem, vfx: VFXSystem, visualGroundY: number) {
        if (event.sourceId) {
            const source = engine.agents.find(a => a.id === event.sourceId);
            if (source) {
                const sHex = HexUtils.fromPx(source.px, source.py, engine.mapConfig);
                const sH = grid.getTerrainHeight(sHex.q, sHex.r, engine);
                
                // Red Mage Death Finger (mr_u2) - Single Target Special
                if (event.skill?.id === 'mr_u2') {
                    Generic.spawnDeathRay(vfx, source.px, source.py - sH - 45, event.pos.x, visualGroundY - 30, event.color || '#be123c');
                    return;
                }

                Generic.spawnBeam(vfx, source.px, source.py - sH - 40, 0, event.pos.x, visualGroundY - 30, 0, event.color || '#fff');
                Generic.spawnExplosion(vfx, event.pos.x, visualGroundY - 30, 0, 5, event.color || '#fff', 0.5, 0.5, 'SPARK');
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
                    Generic.spawnDirectionalImpact(vfx, event.pos.x, visualGroundY, bodyHeight, dx/len, dy/len, event.color || '#fff', type);
                }
            }
        } else {
            Generic.spawnExplosion(vfx, event.pos.x, visualGroundY, 25, 5, event.color || '#fff', 1.0, 0.8, 'SPARK');
        }
        
        if (dmg > 50) camera.addTrauma(0.05); 
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
            
            // Death Finger target hit check
            if (skill && skill.id === 'mr_u2') {
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 0, 50, '#000', 3.0, 0.5, 'SPARK');
                Generic.addImpact(vfx, event.pos.x, visualY, 20, '#be123c', 'BLAST', 0.5);
                Generic.spawnShockwave(vfx, event.pos.x, visualY, '#000', 0.5);
                return; 
            }

            // FACTION RITUAL (Ult Hit)
            if (faction === Team.BLUE) {
                // Remove Pillar fallback. Use pure explosion/shockwave.
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 0, 40, color, 1.5, 0.8, 'SPARK');
                Generic.spawnShockwave(vfx, event.pos.x, centerVisualY, color, 0.8);
            } else {
                // Red faction uses Blood Ritual
                Generic.spawnBloodRitual(vfx, event.pos.x, centerVisualY, color, 1.5);
            }

            if (skill && skill.id === 'wr_u1') { // Ragnarok Hit
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 0, 50, '#991b1b', 2.0, 1.0, 'DEBRIS');
                Generic.addImpact(vfx, event.pos.x, visualY, 0, '#ef4444', 'BLAST', 0.8);
                camera.addTrauma(0.5);
            } 
            
        } else {
            // Standard Hits
            if (visualType === 'SMASH') {
                Generic.addImpact(vfx, event.pos.x, centerVisualY, 0, color, 'SHOCKWAVE', 0.4);
                Generic.spawnExplosion(vfx, event.pos.x, centerVisualY, 0, 8, color, 0.5, 0.6, 'SHARD'); 
            } 
            else if (visualType === 'SLASH') {
                if (source) {
                    const dx = event.pos.x - source.px;
                    const dy = event.pos.y - source.py;
                    const len = Math.sqrt(dx*dx + dy*dy) || 1;
                    Generic.spawnDirectionalImpact(vfx, event.pos.x, visualY, 30, dx/len, dy/len, color, 'PHYSICAL');
                } else {
                    Generic.spawnExplosion(vfx, event.pos.x, visualY, 30, 8, color, 1.5, 0.4, 'SPARK');
                }
            }
            else if (visualType === 'FIREBALL' || visualType === 'BOMB') {
                Generic.addImpact(vfx, event.pos.x, visualY, 20, color, 'BLAST', 0.5);
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 20, 5, color, 0.5, 1.0, 'SMOKE');
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 20, 8, '#fff', 1.0, 0.3, 'SPARK');
            }
            else {
                Generic.addImpact(vfx, event.pos.x, visualY, 30, color, 'RING', 0.4);
                Generic.spawnExplosion(vfx, event.pos.x, visualY, 30, 12, color, 2.0, 0.4, 'SPARK');
            }
        }
    }
}
