
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
        // Calculate Origin & Target in 3D Space
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine, grid);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine, grid);
        
        // Calculate pure Ground Z for the target location (for floor-snapping effects)
        const groundZ = grid.getTerrainHeight(
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).q,
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).r,
            engine
        );

        // Fallback for non-unit targets (ground click)
        if (!event.targetId) target.z = groundZ + 20;

        switch (event.type) {
            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                // Visual Events trigger full cinematic scripts
                this.playCinematicEffect(event, engine, vfx, grid, camera, origin, target);
                break;

            case 'DAMAGE': 
                // Damage only triggers Hit VFX, never scripts (prevent shake spam)
                if (!event.skill?.projectileSpeed) {
                    this.playHitVFX(event, vfx, target, groundZ);
                }
                break;

            case 'PROJECTILE_HIT': 
                // Projectiles trigger impact.
                if (event.skill?.type !== 'AOE') {
                    this.playHitVFX(event, vfx, target, groundZ);
                    camera.addTrauma(0.05); 
                } else {
                    // Direct hit for AOE projectile contact (spark only)
                    vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, groundZ + 5, event.skill?.color, groundZ);
                }
                break;

            case 'IMPACT_AOE':
                // AOE Centers trigger scripts
                this.handleAOE(event, engine, vfx, grid, camera, groundZ);
                break;

            case 'DEATH':
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                if (dAgent) {
                    // Death occurs at body center
                    UnitShatter.spawn(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
                }
                camera.addTrauma(0.1); 
                break;

            case 'SPAWN':
                // Teleport is a floor-to-sky effect, verify groundZ
                vfx.playEffect('FX_TELEPORT', origin.x, origin.y, groundZ, event.color, groundZ);
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

        // If ID not found, check if there is an agent at that location spatially
        if (!agent && !agentId) {
            const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
            agent = engine.getAgentAt(hex.q, hex.r);
        }

        if (agent) {
            const terrainH = grid.getTerrainHeight(agent.q, agent.r, engine);
            return {
                x: agent.px,
                y: agent.py,
                // Critical: Target is Chest Height, not feet
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
            // Pass origin.z - UNIT_BODY_OFFSET as approximate groundZ if needed, but hit effect resolves its own ground
            const groundZ = Math.max(0, target.z - UNIT_BODY_OFFSET);
            this.playHitVFX(event, vfx, target, groundZ);
        }
    }

    private playHitVFX(event: GameEvent, vfx: VFXSystem, target: Point3D, groundZ: number) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        let effectId = 'FX_HIT_GENERIC';
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            effectId = skill.visualHitEffect;
        }

        // Pass groundZ separately so the player knows where the floor is for shockwaves
        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        
        // AOE Center is usually slightly above ground
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 5 };
        
        // Scripts
        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;
        if (SkillArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;

        // Fallback
        this.playHitVFX(event, vfx, centerPt, groundZ);
        camera.addTrauma(0.2);
    }
}
