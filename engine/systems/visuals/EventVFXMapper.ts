
import { GameEvent } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";
import { VFX_REGISTRY } from "../../../data/vfx/VFXRegistry";

// Architects & Effects
import { UltArchitect } from "./UltArchitect";
import { SkillArchitect } from "./SkillArchitect";
import { UnitShatter } from "./effects/UnitShatter";

interface Point3D { x: number; y: number; z: number; }

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem
    ) {
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine, grid);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine, grid);
        
        const groundZ = grid.getTerrainHeight(
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).q,
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).r,
            engine
        );

        if (!event.targetId) target.z = groundZ + 20;

        switch (event.type) {
            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                // Visual Events trigger full cinematic scripts (Shakes, Beams, etc.)
                this.playCinematicEffect(event, engine, vfx, grid, camera, origin, target);
                break;

            case 'DAMAGE': 
                // CRITICAL FIX: Damage events NEVER trigger scripts. Only Hit VFX.
                // This prevents DoT/AOE ticks from causing repeated screen shakes ("10.0 Earthquake").
                if (!event.skill?.projectileSpeed) {
                    this.playHitVFX(event, vfx, target);
                }
                break;

            case 'PROJECTILE_HIT': 
                // Projectiles trigger impact. If it's AOE, we let IMPACT_AOE handle the main visual.
                if (event.skill?.type !== 'AOE') {
                    // Single target hits can trigger small shakes via HitVFX or Script?
                    // Safe approach: HitVFX only + manual small trauma.
                    this.playHitVFX(event, vfx, target);
                    camera.addTrauma(0.05); 
                } else {
                    // Direct hit for AOE (the projectile touching target) - just a small spark
                    vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, groundZ + 5, event.skill?.color);
                }
                break;

            case 'IMPACT_AOE':
                // AOE Centers trigger scripts (Big Boom)
                this.handleAOE(event, engine, vfx, grid, camera, groundZ);
                break;

            case 'DEATH':
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                if (dAgent) {
                    UnitShatter.spawn(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
                }
                camera.addTrauma(0.1); 
                break;

            case 'SPAWN':
                vfx.playEffect('FX_TELEPORT', origin.x, origin.y, origin.z, event.color);
                break;
                
            case 'CAST_BREAK':
                vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
                if (event.skill && event.skill.tag === 'ULT') {
                    camera.addTrauma(0.4);
                } else {
                    camera.addTrauma(0.15); 
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
        return { x: defaultX, y: defaultY, z: terrainH };
    }

    private playCinematicEffect(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, origin: Point3D, target: Point3D) {
        const skill = event.skill;
        if (!skill) return;

        // 1. Try Ult Script
        if (skill.tag === 'ULT') {
             if (UltArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;
        }
        
        // 2. Try Skill Script
        if (SkillArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;

        // 3. Fallback (If no script found)
        if (event.type === 'VISUAL_SLASH') {
            vfx.playBeam('SLASH_CONNECT', origin, target, event.color || '#fff', 0.2);
        } else {
            vfx.playBeam('GENERIC_BEAM', origin, target, event.color || '#fff', 0.4);
            this.playHitVFX(event, vfx, target);
        }
    }

    private playHitVFX(event: GameEvent, vfx: VFXSystem, target: Point3D) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        // 1. Data-Driven Override (From Skill DB)
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            vfx.playEffect(skill.visualHitEffect, target.x, target.y, target.z, color);
            return;
        }

        // 2. Fallback
        vfx.playEffect('FX_HIT_GENERIC', target.x, target.y, target.z, color);
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 5 };
        
        // AOE Centers usually trigger scripts (Sanctuary, Meteor, etc.)
        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;
        if (SkillArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;

        // Default Fallback
        this.playHitVFX(event, vfx, centerPt);
        camera.addTrauma(0.2);
    }
}
