
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
                // Delegate to Skill Architect first if skill ID matches
                if (event.skill && SkillArchitect.play(event.skill.id, target, engine, vfx, grid, camera, event.sourceId)) {
                    return;
                }
                // Fallback
                if (event.sourceId && event.targetId) {
                    vfx.playBeam('SLASH_CONNECT', origin, target, event.color || '#fff', 0.2);
                }
                break;

            case 'VISUAL_BEAM':
                // Check Ult First
                if (event.skill && event.skill.tag === 'ULT') {
                     if (UltArchitect.play(event.skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;
                }
                // Check Skill Second
                if (event.skill && SkillArchitect.play(event.skill.id, target, engine, vfx, grid, camera, event.sourceId)) return;

                // Fallback Generic
                vfx.playBeam('GENERIC_BEAM', origin, target, event.color || '#fff', 0.4);
                this.resolveImpact(event, engine, vfx, target, false); 
                break;

            case 'DAMAGE': 
                if (!event.skill?.projectileSpeed) {
                    this.resolveImpact(event, engine, vfx, target, true);
                }
                break;

            case 'PROJECTILE_HIT': 
                // Only play impact if not AOE (AOE handles its own impact via IMPACT_AOE event)
                if (event.skill?.type !== 'AOE') {
                    this.resolveImpact(event, engine, vfx, target, true);
                    camera.addTrauma(0.05); 
                } else {
                    // Small hit for AOE direct hit (redundant but adds juice)
                    vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, groundZ + 5, event.skill?.color);
                }
                break;

            case 'IMPACT_AOE':
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
                // Standard Break
                vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
                
                // --- RESTORED: DOMAIN SHATTER FOR ULTS ---
                if (event.skill && event.skill.tag === 'ULT') {
                    // Spawn extra large shards to simulate the domain breaking
                    for(let i=0; i<8; i++) {
                        const p = vfx.state.getParticle();
                        p.x = origin.x + (Math.random()-0.5)*50;
                        p.y = origin.y + (Math.random()-0.5)*50;
                        p.z = origin.z + 50;
                        p.vx = (Math.random()-0.5) * 600;
                        p.vy = (Math.random()-0.5) * 600;
                        p.vz = 400 + Math.random() * 400;
                        p.life = 1.0; p.maxLife = 1.0;
                        p.color = event.color || '#fff';
                        p.size = 20 + Math.random() * 30; // Big chunks
                        p.type = 'SHARD'; 
                        p.gravity = 1500;
                        vfx.state.particles.push(p);
                    }
                    camera.addTrauma(0.4); // Significant impact for stopping an Ult
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

    private resolveImpact(event: GameEvent, engine: GameEngine, vfx: VFXSystem, target: Point3D, checkScript: boolean) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        // 1. Script Override (Ult or Skill)
        if (checkScript && skill) {
            if (skill.tag === 'ULT' && UltArchitect.play(skill.id, target, engine, vfx, engine.renderer!.grid, engine.renderer!.camera, event.sourceId)) return;
            if (SkillArchitect.play(skill.id, target, engine, vfx, engine.renderer!.grid, engine.renderer!.camera, event.sourceId)) return;
        }

        // 2. Data-Driven Override
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            vfx.playEffect(skill.visualHitEffect, target.x, target.y, target.z, color);
            return;
        }

        // 3. Fallback to Generic
        vfx.playEffect('FX_HIT_GENERIC', target.x, target.y, target.z, color);
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 5 };
        
        // 1. Script Check
        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;
        if (SkillArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) return;

        // 2. Default AOE Visuals
        this.resolveImpact(event, engine, vfx, centerPt, false);
        camera.addTrauma(0.2);
    }
}
