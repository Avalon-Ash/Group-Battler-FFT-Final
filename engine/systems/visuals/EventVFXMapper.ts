
import { GameEvent, Team } from "../../../types";
import { GameEngine, Agent } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET, THEME_IMPERIAL, THEME_COVENANT } from "../../../constants";

// Modular Spawners
import * as Generic from "../vfx/spawners/generic";
import * as Imperial from "../vfx/spawners/imperial";
import * as Covenant from "../vfx/spawners/covenant";

// Explicit 3D Point Interface (Terrain Z + Physics Z + Body Offset)
interface Point3D { x: number; y: number; z: number; }

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem
    ) {
        // 1. Calculate Absolute 3D Points (World X, World Y, Terrain Z + Body Height)
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine, grid);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine, grid);
        
        // Ground Z for surface effects (No body offset)
        const groundZ = grid.getTerrainHeight(
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).q,
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).r,
            engine
        );

        // Fallback: If hitting ground (no unit), lift target slightly to avoid z-fighting
        if (!event.targetId) target.z = groundZ + 20;

        switch (event.type) {
            // --- BEAMS & CONNECTORS ---
            case 'VISUAL_SLASH':
                if (event.sourceId && event.targetId) {
                    Generic.spawnConnectorSlash(vfx, origin, target, event.color || '#fff');
                }
                break;

            case 'VISUAL_BEAM':
                if (event.skill?.id === 'mr_u2') {
                    // Death Finger (Covenant Ult) - Handled in AOE block mostly, but catch direct calls here
                    Generic.spawnDeathRay(vfx, origin, target, event.color || '#be123c');
                } else {
                    // Generic Beam
                    Generic.spawnBeam(vfx, origin, target, event.color || '#fff');
                    Generic.addImpact(vfx, target.x, target.y, target.z, event.color || '#fff', 'BLAST', 0.4);
                }
                break;

            // --- IMPACTS ---
            case 'DAMAGE': 
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, target);
                }
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, vfx, target, groundZ, camera); 
                } else {
                    Generic.addImpact(vfx, event.pos.x, event.pos.y, groundZ + 10, event.skill?.color || '#fff', 'BLAST', 0.3);
                }
                break;

            // --- AOE & SKILLS ---
            case 'IMPACT_AOE':
                this.handleAOE(event, engine, vfx, grid, camera, groundZ);
                break;

            // --- UNITS ---
            case 'DEATH':
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                if (dAgent) {
                    // Use origin which has body offset
                    Generic.spawnUnitShatter(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
                }
                camera.addTrauma(0.15); 
                break;

            case 'SPAWN':
                Generic.spawnTeleport(vfx, origin.x, origin.y, origin.z, event.color || '#fff');
                break;
                
            case 'CAST_BREAK':
                Generic.spawnCastBreak(vfx, origin.x, origin.y, origin.z, event.value || 1, event.color || '#fff');
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

    /**
     * 📐 CORE 3D RESOLUTION
     * Returns {x, y, z} where z includes Terrain + Physics + Chest Offset.
     * This is the "Visual Center" of the unit or point.
     */
    private resolvePoint(defaultX: number, defaultY: number, agentId: string | undefined, engine: GameEngine, grid: GridSystem): Point3D {
        let agent = agentId ? engine.agents.find(a => a.id === agentId) : null;

        if (!agent && !agentId) {
            const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
            agent = engine.getAgentAt(hex.q, hex.r);
        }

        if (agent) {
            const terrainH = grid.getTerrainHeight(agent.q, agent.r, engine);
            // Z = Terrain + Physics Jump + Chest Height
            return {
                x: agent.px,
                y: agent.py,
                z: terrainH + agent.physics.z + UNIT_BODY_OFFSET
            };
        }

        const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
        const terrainH = grid.getTerrainHeight(hex.q, hex.r, engine);
        
        return {
            x: defaultX,
            y: defaultY,
            z: terrainH // Ground level for non-agent points
        };
    }

    private handleDamageImpact(event: GameEvent, engine: GameEngine, vfx: VFXSystem, target: Point3D) {
        let dx = 0;
        let dy = -1;

        if (event.sourceId && event.targetId) {
            const s = engine.agents.find(a => a.id === event.sourceId);
            const t = engine.agents.find(a => a.id === event.targetId);
            if (s && t) {
                const diffX = t.px - s.px; 
                const diffY = t.py - s.py;
                const len = Math.sqrt(diffX*diffX + diffY*diffY);
                if (len > 0) {
                    dx = diffX/len;
                    dy = diffY/len;
                }
                const isVictimBlue = t.team === Team.BLUE;
                const debrisColor = isVictimBlue ? THEME_IMPERIAL.energy : THEME_COVENANT.secondary;
                Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
                return;
            }
        }
        
        Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, 0, -1, event.color || '#94a3b8');
    }

    private handleHitVisuals(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        target: Point3D,
        groundZ: number,
        camera: CameraSystem
    ): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        const skill = event.skill;
        const visualType = skill?.visual || 'BOLT';
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        if (isUlt) {
            camera.addTrauma(0.15); 
            if (skill && skill.id === 'mr_u2') {
                Generic.addImpact(vfx, target.x, target.y, target.z, '#be123c', 'BLAST', 0.5);
                Generic.spawnShockwave(vfx, target.x, target.y, groundZ, '#000', 0.5);
                return; 
            }
            if (faction === Team.BLUE) {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.8);
            } else {
                Generic.spawnBloodRitual(vfx, target.x, target.y, target.z, color, 1.5);
            }
            if (skill && skill.id === 'wr_u1') { 
                Generic.addImpact(vfx, target.x, target.y, target.z, '#ef4444', 'BLAST', 0.8);
                camera.addTrauma(0.5);
            } 
        } else {
            let dx = 0, dy = 0;
            let debrisColor = color; 
            
            if (event.targetId) {
                const t = engine.agents.find(a => a.id === event.targetId);
                if (t) {
                    const isVictimBlue = t.team === Team.BLUE;
                    debrisColor = isVictimBlue ? THEME_IMPERIAL.energy : THEME_COVENANT.secondary;
                }
            }
            if (source) {
                const len = Math.sqrt((target.x - source.px)**2 + (target.y - source.py)**2) || 1;
                dx = (target.x - source.px) / len;
                dy = (target.y - source.py) / len;
            }

            if (visualType === 'SMASH') {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'SHOCKWAVE', 0.4);
                Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
            } 
            else if (visualType === 'SLASH') {
                if (source) {
                    Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
                } else {
                    Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.4);
                }
            }
            else if (visualType === 'FIREBALL' || visualType === 'BOMB') {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.5);
                Generic.spawnExplosion(vfx, target.x, target.y, target.z, 5, color, 0.5, 1.0, 'SMOKE');
            }
            else {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.4);
                if (dx !== 0 || dy !== 0) {
                    Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
                }
            }
        }
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const id = event.skill.id;
        const color = event.color || '#fff';
        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const radius = event.skill.aoeRadius || 1;
        const affectedHexes = HexUtils.range(centerHex, radius);

        // --- SKILL SPECIFIC EFFECTS ---
        
        // Railgun (Directional)
        if (id === 'rr_u1') { 
            const src = engine.agents.find(a => a.id === event.sourceId);
            if (src) {
                // Explicit 3D Source -> Impact Point
                const srcPt = this.resolvePoint(src.px, src.py, src.id, engine, grid);
                const dstPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 40 }; // Impact mid-air
                Covenant.spawnCovenantRailgun(vfx, srcPt, dstPt, color); 
                camera.addTrauma(0.8);
            }
            return; 
        }
        
        // Death Finger (Directional)
        if (id === 'mr_u2') { 
            const src = engine.agents.find(a => a.id === event.sourceId);
            if (src) {
                const srcPt = this.resolvePoint(src.px, src.py, src.id, engine, grid);
                const dstPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 40 };
                Covenant.spawnCovenantDeathFinger(vfx, srcPt, dstPt, color);
                camera.addTrauma(0.7);
            }
            return; 
        }

        // Standard Area Effects (Using 3D points where applicable)
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ };

        // IMPERIAL
        if (id === 'tb_u1') { Imperial.spawnImperialSanctuary(vfx, centerPt, color); camera.addTrauma(0.7); return; }
        if (id === 'tb_u2') { Imperial.spawnImperialKingsBlessing(vfx, centerPt, color); camera.addTrauma(0.3); return; }
        if (id === 'wb_u1') { Imperial.spawnImperialThunder(vfx, centerPt, color); camera.addTrauma(0.6); return; }
        if (id === 'wb_u2') { Imperial.spawnImperialDaybreak(vfx, centerPt, color); camera.addTrauma(0.8); return; }
        if (id === 'rb_u1') { Imperial.spawnImperialCrystalArrow(vfx, centerPt, color); camera.addTrauma(0.6); return; }
        if (id === 'rb_u2') { Imperial.spawnImperialStarfall(vfx, centerPt, color); camera.addTrauma(0.4); return; }
        if (id === 'mb_u1') { Imperial.spawnImperialBlackHole(vfx, centerPt, color); camera.addTrauma(0.5); return; }
        if (id === 'mb_u2') { Imperial.spawnImperialFrostfall(vfx, centerPt, color); camera.addTrauma(0.5); return; }
        if (id === 'sb_u1') { Imperial.spawnImperialIntervention(vfx, centerPt, color); camera.addTrauma(0.3); return; }
        if (id === 'sb_u2') { Imperial.spawnImperialResurrection(vfx, centerPt, color); camera.addTrauma(0.4); return; }

        // COVENANT
        if (id === 'tr_u1') { Covenant.spawnCovenantGuillotine(vfx, centerPt, color); camera.addTrauma(0.8); return; }
        if (id === 'tr_u2') { Covenant.spawnCovenantUndeadArmy(vfx, centerPt, color); camera.addTrauma(0.5); return; }
        if (id === 'wr_u1') { Covenant.spawnCovenantRagnarok(vfx, centerPt, color); camera.addTrauma(0.9); return; }
        if (id === 'wr_u2') { Covenant.spawnCovenantBloodStorm(vfx, centerPt, color); camera.addTrauma(0.6); return; }
        if (id === 'rr_u2') { Covenant.spawnCovenantNuke(vfx, centerPt, color); camera.addTrauma(1.0); return; }
        if (id === 'mr_u1') { Covenant.spawnCovenantMeteor(vfx, centerPt, color); camera.addTrauma(0.7); return; }
        if (id === 'sr_u1') { Covenant.spawnCovenantSoulLink(vfx, centerPt, color); camera.addTrauma(0.3); return; }
        if (id === 'sr_u2') { Covenant.spawnCovenantAncestors(vfx, centerPt, color); camera.addTrauma(0.3); return; }

        // Generic Grid Reaction
        affectedHexes.forEach(h => {
            if (engine.map.isValid(h.q, h.r)) {
                const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                const hHeight = grid.getTerrainHeight(h.q, h.r, engine);
                const dist = HexUtils.dist(centerHex, h);
                const delay = dist * 0.06;
                Generic.spawnGridImpact(vfx, tilePos.x, tilePos.y, hHeight, event.color || '#fff', Team.BLUE, delay);
            }
        });

        // Generic Fallback
        Generic.addImpact(vfx, event.pos.x, event.pos.y, groundZ, event.color || '#fff', 'BLAST', 0.5);
        camera.addTrauma(0.25); 
    }
}
