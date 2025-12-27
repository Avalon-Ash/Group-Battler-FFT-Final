
import { GameEvent, Team, Role } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";
import { SpriteManager } from "../../sprites";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { VFX_REGISTRY } from "../../../data/vfx/VFXRegistry";

// Architects
import { UltArchitect } from "./UltArchitect";
import { SkillArchitect } from "./SkillArchitect";

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
                    this.spawnUnitShatter(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
                }
                camera.addTrauma(0.1); 
                break;

            case 'SPAWN':
                vfx.playEffect('FX_TELEPORT', origin.x, origin.y, origin.z, event.color);
                break;
                
            case 'CAST_BREAK':
                vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
                camera.addTrauma(0.15); 
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

    private spawnUnitShatter(system: VFXSystem, x: number, y: number, z: number, team: Team, role: Role, impulseX: number, impulseY: number) {
        // ... (Existing shatter logic remains good)
        const assets = SpriteManager.getUnitImages(role, team);
        const factionConfig = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        
        const base = system.state.getParticle();
        base.x = x; base.y = y; base.z = z + 10;
        base.vx = impulseX * 0.8; base.vy = impulseY * 0.8; base.vz = 150 + Math.random() * 100;
        base.life = 2.0; base.maxLife = 2.0;
        base.color = '#fff'; base.size = 50; 
        base.type = 'SPRITE'; base.image = assets.base;
        base.vRotation = (Math.random() - 0.5) * 10;
        system.state.particles.push(base);

        const icon = system.state.getParticle();
        icon.x = x; icon.y = y; icon.z = z + 40; 
        icon.vx = impulseX * 1.2; icon.vy = impulseY * 1.2; icon.vz = 300 + Math.random() * 200;
        icon.life = 2.0; icon.maxLife = 2.0;
        icon.color = '#fff'; icon.size = 64; 
        icon.type = 'SPRITE'; icon.image = assets.icon;
        icon.vRotation = (Math.random() - 0.5) * 20; 
        system.state.particles.push(icon);

        const shardCount = 8;
        const colors = factionConfig.deathShatterColors;
        for(let i=0; i<shardCount; i++) {
            const p = system.state.getParticle();
            p.x = x + (Math.random()-0.5)*20; p.y = y + (Math.random()-0.5)*20; p.z = z + 30;
            const a = Math.random() * Math.PI * 2;
            const s = 150 + Math.random() * 250;
            p.vx = Math.cos(a)*s + impulseX*0.5; p.vy = Math.sin(a)*s + impulseY*0.5; p.vz = 250 + Math.random()*250; 
            p.life = 1.5; p.maxLife = 1.5;
            p.type = 'SHARD'; p.color = colors[Math.floor(Math.random() * colors.length)];
            p.size = 6 + Math.random()*8; 
            p.vRotation = (Math.random()-0.5)*30; 
            system.state.particles.push(p);
        }
    }
}
