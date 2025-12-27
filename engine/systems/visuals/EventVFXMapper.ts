
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
                // Tiny impact trigger
                this.resolveImpact(event, engine, vfx, target, false); 
                break;

            case 'DAMAGE': 
                if (!event.skill?.projectileSpeed) {
                    this.resolveImpact(event, engine, vfx, target, true);
                }
                break;

            case 'PROJECTILE_HIT': 
                if (event.skill?.type !== 'AOE') {
                    // For single target projectiles, we trigger impact VFX
                    this.resolveImpact(event, engine, vfx, target, true);
                    // REDUCED: Standard projectile hits should be barely perceptible
                    camera.addTrauma(0.05); 
                } else {
                    // AOE Projectiles trigger impact slightly above ground to avoid Z-fighting
                    // Actual large AOE effect is handled by IMPACT_AOE
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
                // REDUCED: Unit death is common, shouldn't shake screen too much
                camera.addTrauma(0.1); 
                break;

            case 'SPAWN':
                vfx.playEffect('FX_TELEPORT', origin.x, origin.y, origin.z, event.color);
                break;
                
            case 'CAST_BREAK':
                vfx.playEffect('FX_CAST_BREAK', origin.x, origin.y, origin.z, event.color);
                // REDUCED: Interrupt is important but not an explosion
                camera.addTrauma(0.15); 
                break;
                
            case 'CAST_FINISH':
                if (event.skill && event.skill.tag === 'ULT') {
                     if (event.skill.projectileSpeed === 0 || event.skill.power <= 0) {
                         // Very subtle bump for Ult cast completion
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

    // =========================================================================================
    // 💥 IMPACT RESOLUTION LOGIC
    // Determines the best VFX to play based on Skill > Element > Faction.
    // =========================================================================================
    private resolveImpact(event: GameEvent, engine: GameEngine, vfx: VFXSystem, target: Point3D, checkUlt: boolean) {
        const skill = event.skill;
        const color = event.color || '#fff';
        const source = engine.agents.find(a => a.id === event.sourceId);
        
        // 1. Ult Architect Override
        if (checkUlt && skill && skill.tag === 'ULT') {
            if (UltArchitect.play(skill.id, target, engine, vfx, engine.renderer!.grid, engine.renderer!.camera, event.sourceId)) {
                return;
            }
        }

        // 2. Explicit Skill Override (Highest Priority)
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            vfx.playEffect(skill.visualHitEffect, target.x, target.y, target.z, color);
            return;
        }

        // 3. Element / Tag Based Fallback
        if (skill) {
            if (skill.element === 'FIRE') { 
                // Check Faction flavor
                if (source?.team === Team.RED) vfx.playEffect('FX_HIT_RED_MAGMA', target.x, target.y, target.z);
                else vfx.playEffect('FX_HIT_FIRE', target.x, target.y, target.z); // Generic/Blue Fire
                return;
            }
            if (skill.element === 'ICE' || skill.specialVisualStatus === 'FROZEN') {
                vfx.playEffect('FX_HIT_BLUE_ICE', target.x, target.y, target.z);
                return;
            }
            if (skill.element === 'POISON' || skill.ccType === 'DOT') {
                if (source?.team === Team.RED) vfx.playEffect('FX_HIT_RED_FEL', target.x, target.y, target.z);
                else vfx.playEffect('FX_HIT_POISON', target.x, target.y, target.z);
                return;
            }
            if (skill.element === 'VOID' || skill.element === 'ARCANE') {
                if (source?.team === Team.RED) vfx.playEffect('FX_HIT_RED_SHADOW', target.x, target.y, target.z);
                else vfx.playEffect('FX_HIT_BLUE_ARCANE', target.x, target.y, target.z);
                return;
            }
            if (skill.element === 'HOLY') {
                vfx.playEffect('FX_HIT_BLUE_HOLY', target.x, target.y, target.z);
                return;
            }
            if (skill.element === 'LIGHTNING') {
                vfx.playEffect('FX_HIT_BLUE_TECH', target.x, target.y, target.z);
                return;
            }
            if (skill.element === 'BLOOD') {
                vfx.playEffect('FX_HIT_RED_BLOOD', target.x, target.y, target.z);
                return;
            }
        }

        // 4. Faction Default (Physical/Standard)
        const faction = source ? source.team : Team.BLUE;
        const factionVis = FACTION_VISUALS[faction];
        
        // Use faction default if available
        if (factionVis && factionVis.defaultHitEffect && VFX_REGISTRY[factionVis.defaultHitEffect]) {
            vfx.playEffect(factionVis.defaultHitEffect, target.x, target.y, target.z, color);
        } else {
            // Ultimate fallback
            vfx.playEffect('FX_HIT_GENERIC', target.x, target.y, target.z, color);
        }
    }

    private handleAOE(event: GameEvent, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, groundZ: number) {
        if (!event.skill) return;
        
        const centerPt = { x: event.pos.x, y: event.pos.y, z: groundZ + 5 };
        const color = event.color || '#fff';

        // 1. Ult Check
        if (UltArchitect.play(event.skill.id, centerPt, engine, vfx, grid, camera, event.sourceId)) {
            return;
        }

        // 2. Center Impact (Re-use Resolve Logic for consistency)
        this.resolveImpact(event, engine, vfx, centerPt, false);

        // 3. Grid Floor Effects
        const centerHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const radius = event.skill.aoeRadius || 1;
        const affectedHexes = HexUtils.range(centerHex, radius);
        const source = engine.agents.find(a => a.id === event.sourceId);
        const faction = source ? source.team : Team.BLUE;

        // Determine Grid Style
        let gridEffectId = faction === Team.BLUE ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED';
        
        // Override Grid Style based on Skill
        if (event.skill.ccType === 'PULL' || event.skill.visual === 'BOMB') {
             if (faction === Team.RED) gridEffectId = 'FX_GRID_IMPACT_RED';
        }
        if (event.skill.visual === 'BEAM') gridEffectId = 'FX_GRID_IMPACT_VOID';

        // Spawn Grid Effects
        affectedHexes.forEach(h => {
            if (engine.map.isValid(h.q, h.r)) {
                const tilePos = HexUtils.toPx(h.q, h.r, engine.mapConfig);
                const hHeight = grid.getTerrainHeight(h.q, h.r, engine);
                vfx.playEffect(gridEffectId, tilePos.x, tilePos.y, hHeight + 2, color);
            }
        });

        // REDUCED: Standard AOE Impact
        camera.addTrauma(0.15); 
    }

    private spawnUnitShatter(system: VFXSystem, x: number, y: number, z: number, team: Team, role: Role, impulseX: number = 0, impulseY: number = 0) {
        const assets = SpriteManager.getUnitImages(role, team);
        const factionConfig = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        
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
            p.color = colors[Math.floor(Math.random() * colors.length)];
            p.size = 6 + Math.random()*8; 
            p.vRotation = (Math.random()-0.5)*30; 
            system.state.particles.push(p);
        }
    }
}
