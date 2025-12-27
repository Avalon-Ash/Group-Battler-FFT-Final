
import { GameEvent, Team } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET, THEME_IMPERIAL, THEME_COVENANT } from "../../../constants";

// Modular Spawners
import * as Generic from "../vfx/spawners/generic";
import { UltArchitect } from "./UltArchitect";

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
                // Check if this beam is actually an Ult masquerading as a basic visual event
                if (event.skill && event.skill.tag === 'ULT') {
                     if (UltArchitect.play(event.skill.id, target, engine, vfx, grid, camera, event.sourceId)) {
                         return;
                     }
                }
                
                // Generic Beam
                Generic.spawnBeam(vfx, origin, target, event.color || '#fff');
                Generic.addImpact(vfx, target.x, target.y, target.z, event.color || '#fff', 'BLAST', 0.4);
                break;

            // --- IMPACTS ---
            case 'DAMAGE': 
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, target);
                }
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, vfx, grid, target, groundZ, camera); 
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
        
        // Check: Does the skill have a specific Hit Effect?
        if (event.skill && event.skill.visualHitEffect) {
            vfx.playEffect(event.skill.visualHitEffect, target.x, target.y, target.z, event.color);
            return;
        }

        // Fallback: Generic Physics Splatter
        Generic.spawnPhysicsSplatter(vfx, target.x, target.y, target.z, 0, -1, event.color || '#94a3b8');
    }

    private handleHitVisuals(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, target: Point3D, groundZ: number, camera: CameraSystem): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        const skill = event.skill;
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        // 1. DATA-DRIVEN ARCHITECT
        if (isUlt && skill) {
            if (UltArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) {
                return; 
            }
        }

        // 2. DATA-DRIVEN: VISUAL HIT EFFECT
        if (skill && skill.visualHitEffect) {
            vfx.playEffect(skill.visualHitEffect, target.x, target.y, target.z, color);
            return;
        }

        // 3. FALLBACK
        camera.addTrauma(0.2); 
        
        if (faction === Team.BLUE) {
            Generic.addImpact(vfx, target.x, target.y, target.z, color, 'BLAST', 0.6);
            Generic.spawnShockwave(vfx, target.x, target.y, target.z, color, 0.4);
        } else {
            Generic.spawnBloodRitual(vfx, target.x, target.y, target.z, color, 1.2);
        }
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ };
        const color = event.color || '#fff';

        // 1. DATA-DRIVEN ARCHITECT
        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) {
            return;
        }

        // 2. DATA-DRIVEN: VISUAL HIT EFFECT
        if (event.skill.visualHitEffect) {
            vfx.playEffect(event.skill.visualHitEffect, centerPt.x, centerPt.y, centerPt.z, color);
        }

        // 3. GRID SYSTEM REACTION (Data-Driven)
        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const radius = event.skill.aoeRadius || 1;
        const affectedHexes = HexUtils.range(centerHex, radius);
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        // Determine which Grid Effect to play
        let gridEffectId = faction === Team.BLUE ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED';
        if (event.skill.ccType === 'PULL' || event.skill.visual === 'BOMB') {
             if (faction === Team.RED) gridEffectId = 'FX_GRID_IMPACT_RED';
        }
        if (event.skill.visual === 'BEAM') gridEffectId = 'FX_GRID_IMPACT_VOID';

        affectedHexes.forEach(h => {
            if (engine.map.isValid(h.q, h.r)) {
                const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                const hHeight = grid.getTerrainHeight(h.q, h.r, engine);
                vfx.playEffect(gridEffectId, tilePos.x, tilePos.y, hHeight, color);
            }
        });

        // Generic Core Impact (Center)
        Generic.addImpact(vfx, event.pos.x, event.pos.y, groundZ, event.color || '#fff', 'BLAST', 0.5);
        camera.addTrauma(0.25); 
    }
}
