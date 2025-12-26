
import { GameEvent, Team } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET, THEME_IMPERIAL, THEME_COVENANT } from "../../../constants";

// Modular Spawners
import * as Generic from "../vfx/spawners/generic";
import * as Imperial from "../vfx/spawners/imperial";
import * as Covenant from "../vfx/spawners/covenant";

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
                    // Death Finger (Covenant Ult) - handled in dispatchUltVFX usually, but catch direct beam events
                    Generic.spawnDeathRay(vfx, origin, target, event.color || '#be123c');
                } else if (event.skill?.id === 'rb_u3') {
                    // Orbital Bombardment - handled in dispatchUltVFX
                } else {
                    // Generic Beam
                    Generic.spawnBeam(vfx, origin, target, event.color || '#fff');
                    Generic.spawnSoftStatusEffect(vfx, target.x, target.y, target.z, event.color || '#fff', 'GLOW');
                }
                break;

            // --- IMPACTS ---
            case 'DAMAGE': 
                // Only spawn splatter if it's NOT part of a skill impact already handled
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, target);
                }
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, vfx, grid, target, groundZ, camera); 
                } else {
                    // AOE Hit: Use soft ripple for non-lethal, small blast for lethal
                    if (event.skill && Math.abs(event.skill.power) < 50) {
                        Generic.spawnRipple(vfx, event.pos.x, event.pos.y, groundZ, event.skill.color);
                    } else {
                        Generic.addImpact(vfx, event.pos.x, event.pos.y, groundZ + 10, event.skill?.color || '#fff', 'BLAST', 0.2);
                    }
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
                // Use new lightweight cast break
                Generic.spawnCastBreak(vfx, origin.x, origin.y, origin.z, event.value || 1, event.color || '#fff');
                camera.addTrauma(0.05); 
                break;
                
            case 'CAST_FINISH':
                // Minimal feedback for successful cast
                if (event.skill && event.skill.tag === 'ULT') {
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         camera.addTrauma(0.05); 
                     }
                 }
                 break;
        }
    }

    private resolvePoint(defaultX: number, defaultY: number, agentId: string | undefined, engine: GameEngine, grid: GridSystem): Point3D {
        let agent = agentId ? engine.agents.find(a => a.id === agentId) : null;

        if (!agent && !agentId) {
            const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
            agent = engine.getAgentAt(hex.q, hex.r);
        }

        if (agent) {
            const terrainH = grid.getTerrainHeight(agent.q, agent.r, engine);
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
            z: terrainH 
        };
    }

    private handleDamageImpact(event: GameEvent, engine: GameEngine, vfx: VFXSystem, target: Point3D) {
        // Suppress visual for pure DoT/Status ticks unless critical
        if (Math.abs(event.value || 0) < 10) return;

        let dx = 0; let dy = -1;
        if (event.sourceId && event.targetId) {
            const s = engine.agents.find(a => a.id === event.sourceId);
            const t = engine.agents.find(a => a.id === event.targetId);
            if (s && t) {
                const diffX = t.px - s.px; 
                const diffY = t.py - s.py;
                const len = Math.sqrt(diffX*diffX + diffY*diffY);
                if (len > 0) { dx = diffX/len; dy = diffY/len; }
                const isVictimBlue = t.team === Team.BLUE;
                const debrisColor = isVictimBlue ? THEME_IMPERIAL.energy : THEME_COVENANT.secondary;
                
                Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
                return;
            }
        }
        // Fallback for environment damage
        if (event.value && event.value < -20) {
            Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, 0, -1, event.color || '#94a3b8');
        }
    }

    private handleHitVisuals(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, target: Point3D, groundZ: number, camera: CameraSystem): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        const skill = event.skill;
        const visualType = skill?.visual || 'BOLT';
        const source = engine.agents.find(a => a.id === event.sourceId);
        
        // --- 🔴 THE FIX: STATUS INTERCEPTION ---
        // If the skill is low power (utility) or purely status-based, 
        // FORCE it to use the new lightweight "WAVE" or "GLOW" logic.
        const isLowImpact = skill ? (Math.abs(skill.power) < 50) : false;
        const isPureStatus = skill ? (skill.ccType === 'TAUNT' || skill.ccType === 'FEAR' || skill.effectType === 'MANA_RESTORE' || skill.effectType === 'MANA_BURN') : false;
        
        if (skill && (visualType === 'WAVE' || isPureStatus || (isLowImpact && visualType === 'SMASH'))) {
            const mode = (isPureStatus || visualType === 'WAVE') ? 'RIPPLE' : 'GLOW';
            Generic.spawnSoftStatusEffect(vfx, target.x, target.y, target.z, color, mode);
            return; // 🛑 STOP HERE: Do not spawn impacts
        }

        if (isUlt && skill) {
            if (this.dispatchUltVFX(skill.id, target, color, engine, vfx, grid, camera, groundZ, event.sourceId)) {
                return;
            }
            camera.addTrauma(0.15); 
            const faction = source ? source.team : Team.BLUE;
            if (faction === Team.BLUE) Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.8);
            else Generic.spawnBloodRitual(vfx, target.x, target.y, target.z, color, 1.5);
        } else {
            // Standard Skills
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
                dx = (target.x - source.px) / len; dy = (target.y - source.py) / len;
            }
            
            if (visualType === 'SMASH') {
                if (skill?.type === 'AOE') {
                    // Further nerf for AOE Smash hits
                    Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.2); 
                } else {
                    Generic.addImpact(vfx, target.x, target.y, target.z, color, 'SHOCKWAVE', 0.4);
                }
                Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
            } 
            else if (visualType === 'SLASH') {
                if (source) Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
                else Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.3);
            }
            else if (visualType === 'FIREBALL' || visualType === 'BOMB') {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.5);
                Generic.spawnExplosion(vfx, target.x, target.y, target.z, 5, color, 0.5, 1.0, 'SMOKE');
            }
            else {
                Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.3);
                if (dx !== 0 || dy !== 0) Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, dx, dy, debrisColor);
            }
        }
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ };
        const color = event.color || '#fff';

        // 🚨 ROUTING FIX: Try specific spawners first
        if (this.dispatchUltVFX(event.skill.id, centerPt, color, engine, vfx, grid, camera, groundZ, event.sourceId)) {
            return;
        }

        // --- NEW: LOW IMPACT AOE ---
        if (event.skill.visual === 'WAVE' || Math.abs(event.skill.power) < 50) {
            Generic.spawnRipple(vfx, event.pos.x, event.pos.y, groundZ, color, 120);
            return;
        }

        // Generic Grid Reaction (Fallback for standard AOEs)
        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const radius = event.skill.aoeRadius || 1;
        const affectedHexes = HexUtils.range(centerHex, radius);

        affectedHexes.forEach(h => {
            if (engine.map.isValid(h.q, h.r)) {
                const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                const hHeight = grid.getTerrainHeight(h.q, h.r, engine);
                const dist = HexUtils.dist(centerHex, h);
                const delay = dist * 0.06;
                Generic.spawnGridImpact(vfx, tilePos.x, tilePos.y, hHeight, event.color || '#fff', Team.BLUE, delay);
            }
        });

        // Generic Core Impact
        Generic.addImpact(vfx, event.pos.x, event.pos.y, groundZ, event.color || '#fff', 'BLAST', 0.5);
        camera.addTrauma(0.15); // Reduced from 0.25
    }

    // ... (dispatchUltVFX remains unchanged)
    private dispatchUltVFX(
        skillId: string, 
        target: Point3D, 
        color: string, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem, 
        groundZ: number,
        sourceId?: string
    ): boolean {
        // ... (Existing implementation)
        // Camera Shake for all Ults
        camera.addTrauma(0.3);

        const source = sourceId ? engine.agents.find(a => a.id === sourceId) : null;
        const sourcePt = source ? { x: source.px, y: source.py, z: source.physics.z + grid.getTerrainHeight(source.q, source.r, engine) } : target;

        switch(skillId) {
            // BLUE TANK
            case 'tb_u1': Imperial.spawnImperialSanctuary(vfx, target, color); return true;
            case 'tb_u2': Imperial.spawnImperialKingsBlessing(vfx, target, color); return true;
            case 'tb_u3': Imperial.spawnImperialAegis(vfx, target, color); return true;
            case 'tb_u4': Imperial.spawnImperialTitan(vfx, target, color); return true;
            case 'tb_u5': Imperial.spawnImperialDefense(vfx, target, color); return true;
            
            // BLUE WARRIOR
            case 'wb_u1': Imperial.spawnImperialThunder(vfx, target, color); return true;
            case 'wb_u2': Imperial.spawnImperialDaybreak(vfx, target, color); return true;
            case 'wb_u3': Imperial.spawnImperialExcalibur(vfx, target, color); return true;
            case 'wb_u4': Imperial.spawnImperialBladestorm(vfx, target, color); return true;
            case 'wb_u5': Imperial.spawnImperialLightspeed(vfx, target, color); return true;

            // BLUE RANGER
            case 'rb_u1': Imperial.spawnImperialCrystalArrow(vfx, target, color); return true;
            case 'rb_u2': Imperial.spawnImperialStarfall(vfx, target, color); return true;
            case 'rb_u3': Imperial.spawnImperialOrbit(vfx, target, color); return true;
            case 'rb_u4': Imperial.spawnImperialLockdown(vfx, target, color); return true;
            case 'rb_u5': Imperial.spawnImperialOverload(vfx, target, color); return true;

            // BLUE MAGE
            case 'mb_u1': Imperial.spawnImperialBlackHole(vfx, target, color); return true;
            case 'mb_u2': Imperial.spawnImperialFrostfall(vfx, target, color); return true;
            case 'mb_u3': Imperial.spawnImperialTimeStop(vfx, target, color); return true;
            case 'mb_u4': Imperial.spawnImperialArcane(vfx, target, color); return true;
            case 'mb_u5': Imperial.spawnImperialFocus(vfx, target, color); return true;

            // BLUE SUPPORT
            case 'sb_u1': Imperial.spawnImperialIntervention(vfx, target, color); return true;
            case 'sb_u2': Imperial.spawnImperialResurrection(vfx, target, color); return true;
            case 'sb_u3': Imperial.spawnImperialHymn(vfx, target, color); return true;
            case 'sb_u4': Imperial.spawnImperialWrath(vfx, target, color); return true;
            case 'sb_u5': Imperial.spawnImperialRain(vfx, target, color); return true;

            // RED TANK
            case 'tr_u1': Covenant.spawnCovenantGuillotine(vfx, target, color); return true;
            case 'tr_u2': Covenant.spawnCovenantUndeadArmy(vfx, target, color); return true;
            case 'tr_u3': Covenant.spawnCovenantBloodEmbrace(vfx, target, color); return true;
            case 'tr_u4': Covenant.spawnCovenantUndying(vfx, target, color); return true;
            case 'tr_u5': Covenant.spawnCovenantRot(vfx, target, color); return true;

            // RED WARRIOR
            case 'wr_u1': Covenant.spawnCovenantRagnarok(vfx, target, color); return true;
            case 'wr_u2': Covenant.spawnCovenantBloodStorm(vfx, target, color); return true;
            case 'wr_u3': Covenant.spawnCovenantDemon(vfx, target, color); return true;
            case 'wr_u4': Covenant.spawnCovenantUnlimited(vfx, target, color); return true;
            case 'wr_u5': Covenant.spawnCovenantDevastate(vfx, target, color); return true;

            // RED RANGER
            case 'rr_u1': Covenant.spawnCovenantRailgun(vfx, sourcePt, target, color); return true;
            case 'rr_u2': Covenant.spawnCovenantNuke(vfx, target, color); return true;
            case 'rr_u3': Covenant.spawnCovenantBulletTime(vfx, target, color); return true;
            case 'rr_u4': Covenant.spawnCovenantInferno(vfx, target, color); return true;
            case 'rr_u5': Covenant.spawnCovenantHeadhunter(vfx, target, color); return true;

            // RED MAGE
            case 'mr_u1': Covenant.spawnCovenantMeteor(vfx, target, color); return true;
            case 'mr_u2': Covenant.spawnCovenantDeathFinger(vfx, sourcePt, target, color); return true;
            case 'mr_u3': Covenant.spawnCovenantChaosRain(vfx, target, color); return true;
            case 'mr_u4': Covenant.spawnCovenantVoidPortal(vfx, target, color); return true;
            case 'mr_u5': Covenant.spawnCovenantSoulBurn(vfx, target, color); return true;

            // RED SUPPORT
            case 'sr_u1': Covenant.spawnCovenantSoulLink(vfx, target, color); return true;
            case 'sr_u2': Covenant.spawnCovenantAncestors(vfx, target, color); return true;
            case 'sr_u3': Covenant.spawnCovenantVoodoo(vfx, target, color); return true;
            case 'sr_u4': Covenant.spawnCovenantBloodPact(vfx, target, color); return true;
            case 'sr_u5': Covenant.spawnCovenantNightmare(vfx, target, color); return true;
        }

        return false;
    }
}
