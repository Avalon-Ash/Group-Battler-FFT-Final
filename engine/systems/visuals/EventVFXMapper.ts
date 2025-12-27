
import { GameEvent, Team, Role } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";
import { SpriteManager } from "../../sprites";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";

// Architect
import { UltArchitect } from "./UltArchitect";

// Explicit 3D Point Interface
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
                if (event.sourceId && event.targetId) {
                    vfx.playBeam('SLASH_CONNECT', origin, target, event.color || '#fff', 0.2);
                }
                break;

            case 'VISUAL_BEAM':
                if (event.skill && event.skill.tag === 'ULT') {
                     if (UltArchitect.play(event.skill.id, target, engine, vfx, grid, camera, event.sourceId)) {
                         return;
                     }
                }
                // Use generic beam logic
                vfx.playBeam('GENERIC_BEAM', origin, target, event.color || '#fff', 0.4);
                vfx.playEffect('FX_IMPACT_PHYSICAL', target.x, target.y, target.z, event.color);
                break;

            case 'DAMAGE': 
                if (!event.skill?.projectileSpeed) {
                    this.handleDamageImpact(event, engine, vfx, target);
                }
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    this.handleHitVisuals(event, engine, vfx, grid, target, groundZ, camera); 
                } else {
                    vfx.playEffect('FX_IMPACT_PHYSICAL', event.pos.x, event.pos.y, groundZ + 10, event.skill?.color);
                }
                break;

            case 'IMPACT_AOE':
                this.handleAOE(event, engine, vfx, grid, camera, groundZ);
                break;

            case 'DEATH':
                const dAgent = engine.agents.find(a => a.id === event.sourceId);
                if (dAgent) {
                    // Spawn Manual Unit Parts
                    this.spawnUnitShatter(vfx, origin.x, origin.y, origin.z, dAgent.team, dAgent.role, dAgent.physics.vx, dAgent.physics.vy);
                }
                camera.addTrauma(0.15); 
                break;

            case 'SPAWN':
                vfx.playEffect('FX_TELEPORT', origin.x, origin.y, origin.z, event.color);
                break;
                
            case 'CAST_BREAK':
                vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
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
        if (event.skill && event.skill.visualHitEffect) {
            vfx.playEffect(event.skill.visualHitEffect, target.x, target.y, target.z, event.color);
            return;
        }
        // Fallback
        vfx.playEffect('FX_IMPACT_PHYSICAL', target.x, target.y, target.z, event.color || '#94a3b8');
    }

    private handleHitVisuals(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, target: Point3D, groundZ: number, camera: CameraSystem): void {
        const color = event.skill?.color || '#fff';
        const isUlt = event.skill?.tag === 'ULT';
        const skill = event.skill;
        const source = engine.agents.find(a => a.id === event.sourceId);
        
        if (isUlt && skill) {
            if (UltArchitect.play(skill.id, target, engine, vfx, grid, camera, event.sourceId)) {
                return; 
            }
        }

        if (skill && skill.visualHitEffect) {
            vfx.playEffect(skill.visualHitEffect, target.x, target.y, target.z, color);
            return;
        }

        camera.addTrauma(0.2);
        
        // Data-Driven Fallback based on Attacker's Faction
        const faction = source ? source.team : Team.BLUE;
        const factionVis = FACTION_VISUALS[faction] || FACTION_VISUALS[Team.BLUE];
        
        vfx.playEffect(factionVis.defaultHitEffect, target.x, target.y, target.z, color);
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ };
        const color = event.color || '#fff';

        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) {
            return;
        }

        if (event.skill.visualHitEffect) {
            vfx.playEffect(event.skill.visualHitEffect, centerPt.x, centerPt.y, centerPt.z, color);
        }

        // GRID SYSTEM REACTION
        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const radius = event.skill.aoeRadius || 1;
        const affectedHexes = HexUtils.range(centerHex, radius);
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

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

        // Center Impact
        vfx.playEffect('FX_IMPACT_PHYSICAL', event.pos.x, event.pos.y, groundZ, event.color);
        camera.addTrauma(0.25); 
    }

    // Logic moved from generic.ts to keep specific sprite logic here
    private spawnUnitShatter(system: VFXSystem, x: number, y: number, z: number, team: Team, role: Role, impulseX: number = 0, impulseY: number = 0) {
        const assets = SpriteManager.getUnitImages(role, team);
        const factionConfig = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        
        // 1. Core Components (Base & Icon)
        const base = system.state.getParticle();
        base.x = x; base.y = y; base.z = z + 10;
        base.vx = impulseX * 0.8; base.vy = impulseY * 0.8;
        base.vz = 150 + Math.random() * 100;
        base.life = 2.0; base.maxLife = 2.0;
        base.color = '#fff'; base.size = 50; 
        base.type = 'SPRITE'; base.image = assets.base;
        base.vRotation = (Math.random() - 0.5) * 10;
        system.state.particles.push(base);

        const icon = system.state.getParticle();
        icon.x = x; icon.y = y; icon.z = z + 40; 
        icon.vx = impulseX * 1.2; icon.vy = impulseY * 1.2;
        icon.vz = 300 + Math.random() * 200;
        icon.life = 2.0; icon.maxLife = 2.0;
        icon.color = '#fff'; icon.size = 64; 
        icon.type = 'SPRITE'; icon.image = assets.icon;
        icon.vRotation = (Math.random() - 0.5) * 20; 
        system.state.particles.push(icon);

        // 2. Data-Driven Shards
        const shardCount = 8;
        const colors = factionConfig.deathShatterColors;
        
        for(let i=0; i<shardCount; i++) {
            const p = system.state.getParticle();
            p.x = x + (Math.random()-0.5)*20; p.y = y + (Math.random()-0.5)*20; p.z = z + 30;
            const a = Math.random() * Math.PI * 2;
            const s = 150 + Math.random() * 250;
            p.vx = Math.cos(a)*s + impulseX*0.5; p.vy = Math.sin(a)*s + impulseY*0.5; p.vz = 250 + Math.random()*250; 
            p.life = 1.5; p.maxLife = 1.5;
            p.type = 'SHARD'; 
            // Randomly pick a color from the faction palette
            p.color = colors[Math.floor(Math.random() * colors.length)];
            p.size = 6 + Math.random()*8; 
            p.vRotation = (Math.random()-0.5)*30; 
            system.state.particles.push(p);
        }
    }
}
