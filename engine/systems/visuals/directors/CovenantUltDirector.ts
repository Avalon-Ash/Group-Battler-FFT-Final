
import { VFXSystem } from "../../vfx";
import { GameEngine } from "../../../game";
import { GridSystem } from "../../grid";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../../UltArchitect";
import { Team } from "../../../../types";
import { ULT_VISUALS, UltVisualDef } from "../../../../data/vfx/ult_visuals";
import { UNIT_BODY_OFFSET } from "../../../../constants";

// =========================================================================================
// 👹 COVENANT ULTIMATE DIRECTOR (RED FACTION)
// 
// Handles ALL 25 Red Ultimates independently.
// Includes specialized implementations for key skills and generic archetype handlers for others.
// =========================================================================================

export class CovenantUltDirector {

    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        
        // 1. Dedicated Bespoke Visuals (The "Hero" Effects)
        switch (id) {
            case 'tr_u1': return this.playGuillotine(vfx, target, camera);
            case 'tr_u2': return this.playUndeadArmy(vfx, target, camera);
            case 'wr_u1': return this.playRagnarok(vfx, target, camera);
            case 'rr_u1': return this.playRailgun(vfx, target, engine, grid, sourceId);
            case 'rr_u2': return this.playNuke(vfx, target, camera);
            case 'mr_u1': return this.playMeteor(vfx, target, camera);
            case 'sr_u1': return this.playSoulLink(vfx, target);
        }

        // 2. Data-Driven Archetypes (Ported from UltArchitect, customized for RED)
        // This ensures every other ID defined in ULT_VISUALS is handled here, not in a generic fallback.
        const def = ULT_VISUALS[id];
        if (def) {
            return this.playArchetype(def, target, engine, vfx, grid, camera, sourceId);
        }

        return false;
    }

    // --- ARCHETYPE DISPATCHER ---
    private static playArchetype(def: UltVisualDef, target: Point3D, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, sourceId?: string): boolean {
        // Red Faction Flavor: Still heavier than Blue, but much reduced.
        const shakeMult = 1.2; 
        camera.addTrauma(0.1 * def.scale * shakeMult); // Reduced base from 0.3 to 0.1

        switch (def.archetype) {
            case 'HEAVEN_FALL':
                this.runHeavenFall(vfx, target, def);
                break;
            case 'SANCTUARY':
                this.runSanctuary(vfx, target, def);
                break;
            case 'DOMAIN':
                this.runDomain(vfx, target, def);
                break;
            case 'BEAM_SNIPE':
                this.runBeamSnipe(vfx, engine, grid, target, sourceId, def);
                break;
            case 'STORM':
                this.runStorm(vfx, target, def);
                break;
            case 'INSTANT_IMPACT':
                this.runInstantImpact(vfx, target, def);
                break;
        }
        return true;
    }

    // --- GENERIC IMPLEMENTATIONS (RED FLAVOR) ---

    private static runHeavenFall(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        const height = def.height || 1000;
        const projectile = vfx.state.getParticle();
        projectile.x = target.x; 
        projectile.y = target.y; 
        projectile.z = target.z + height;
        projectile.vx = 0; 
        projectile.vy = 0; 
        const speed = height / (0.4 + (def.timing || 0)); // Slower fall for heavy objects
        projectile.vz = -speed;
        projectile.life = 0.5 + (def.timing || 0); 
        projectile.maxLife = projectile.life;
        projectile.color = def.primaryColor;
        projectile.size = 100 * def.scale;
        projectile.type = (def.vfxOverride as any) || 'GIANT_HEX'; 
        
        // Red Flavor: Random Rotation for chaos
        if (projectile.type === 'GIANT_HEX' || projectile.type === 'ROCK') {
            projectile.rotation = Math.random() * Math.PI;
            projectile.vRotation = 5; 
        }
        vfx.state.particles.push(projectile);

        setTimeout(() => {
            vfx.playEffect('FX_HIT_RED_HEAVY', target.x, target.y, target.z, def.secondaryColor);
        }, projectile.life * 1000 - 50);
    }

    private static runSanctuary(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        // Red Sanctuary = Ritual Circle
        const count = def.count || 6;
        const radius = 160 * def.scale;
        
        // Center Marker
        vfx.playEffect('FX_GRID_IMPACT_RED', target.x, target.y, target.z);

        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const px = target.x + Math.cos(angle) * radius;
            const py = target.y + Math.sin(angle) * radius;
            const start = { x: px, y: py, z: target.z };
            const end = { x: target.x, y: target.y, z: target.z + 200 }; // Cone shape meeting in air
            
            // Red beams are more jagged/vibrant
            vfx.playBeam('BEAM_RED_LINK', start, end, def.secondaryColor, 2.0);
        }
    }

    private static runDomain(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        const zone = vfx.state.getParticle();
        zone.x = target.x; zone.y = target.y; zone.z = target.z;
        zone.life = 4.0; zone.maxLife = 4.0;
        zone.color = def.primaryColor; 
        zone.size = 250 * def.scale;
        zone.type = (def.vfxOverride as any) || 'DOMAIN'; 
        zone.style = 'GRID_RED_RITUAL'; // Default to ritual for generic domains
        zone.locked = true;
        vfx.state.particles.push(zone);

        // Dark Pulse
        const shock = vfx.state.getParticle();
        shock.x = target.x; shock.y = target.y; shock.z = target.z + 5;
        shock.life = 1.5; shock.maxLife = 1.5;
        shock.color = def.secondaryColor; 
        shock.size = 50 * def.scale;
        shock.type = 'SHOCKWAVE';
        vfx.state.particles.push(shock);
    }

    private static runBeamSnipe(vfx: VFXSystem, engine: GameEngine, grid: GridSystem, target: Point3D, sourceId: string | undefined, def: UltVisualDef) {
        if (!sourceId) return;
        const srcAgent = engine.agents.find(a => a.id === sourceId);
        if (!srcAgent) return;

        const terrainH = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
        const srcPt = {
            x: srcAgent.px,
            y: srcAgent.py,
            z: terrainH + srcAgent.physics.z + UNIT_BODY_OFFSET
        };

        // Use Death Ray style for Red
        vfx.playBeam('DEATH_RAY', srcPt, target, def.primaryColor, 0.8);
        vfx.playEffect('FX_HIT_RED_HEAVY', target.x, target.y, target.z, def.secondaryColor);
    }

    private static runStorm(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        const count = def.count || 10;
        const radius = 200 * def.scale;
        const isRain = def.vfxOverride === 'BEAM';

        for(let i=0; i<count; i++) {
            const p = vfx.state.getParticle();
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            p.x = target.x + Math.cos(a) * r;
            p.y = target.y + Math.sin(a) * r;
            
            if (isRain) {
                // Blood Rain / Acid Rain
                p.z = target.z + 600;
                p.vx = 0; p.vy = 0; p.vz = -1200;
                p.life = 0.5; p.maxLife = 0.5;
                p.type = 'BEAM'; 
                p.style = 'GENERIC_BEAM';
                p.sx = p.x; p.sy = p.y; p.sz = p.z;
                p.tx = p.x; p.ty = p.y; p.tz = p.z - 600;
                p.size = 4;
            } else {
                // Chaos Explosions
                p.z = target.z + Math.random() * 50;
                p.vx = (Math.random()-0.5) * 100;
                p.vy = (Math.random()-0.5) * 100;
                p.vz = 50 + Math.random() * 100;
                p.life = 1.5; p.maxLife = 1.5;
                p.type = (def.vfxOverride as any) || 'SMOKE';
                p.size = 20 * def.scale;
            }
            p.color = Math.random() > 0.5 ? def.primaryColor : def.secondaryColor;
            p.delay = i * (def.timing || 0.05);
            vfx.state.particles.push(p);
        }
    }

    private static runInstantImpact(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        // Red impacts are heavier, use BLAST or SHOCKWAVE
        if (def.vfxOverride) {
            vfx.playEffect(def.vfxOverride, target.x, target.y, target.z, def.primaryColor);
        } else {
            vfx.playEffect('FX_HIT_RED_HEAVY', target.x, target.y, target.z, def.primaryColor);
        }
        
        // Add a ground crack for heavy impacts
        if (def.scale > 1.2) {
            const crack = vfx.state.getParticle();
            crack.x = target.x; crack.y = target.y; crack.z = target.z;
            crack.life = 2.0; crack.maxLife = 2.0;
            crack.color = def.secondaryColor;
            crack.size = 100 * def.scale;
            crack.type = 'GRID_FIELD';
            crack.style = 'GRID_RED_RITUAL';
            vfx.state.particles.push(crack);
        }
    }

    // --- BESPOKE IMPLEMENTATIONS (Copied from previous step) ---

    private static playGuillotine(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        vfx.playEffect('FX_GRID_IMPACT_RED', target.x, target.y, target.z);
        const blade = vfx.state.getParticle();
        blade.x = target.x; blade.y = target.y; blade.z = target.z + 800;
        blade.vx = 0; blade.vy = 0; blade.vz = -2000;
        blade.life = 0.4; blade.maxLife = 0.4;
        blade.color = '#7f1d1d'; blade.size = 150;
        blade.type = 'SHARD'; blade.locked = true;
        blade.rotation = Math.PI / 2;
        vfx.state.particles.push(blade);
        setTimeout(() => {
            vfx.playEffect('FX_ULT_RED_GUILLOTINE_IMPACT', target.x, target.y, target.z);
            camera.addTrauma(0.25); // Reduced from 0.6
        }, 400);
        return true;
    }

    private static playUndeadArmy(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        const zone = vfx.state.getParticle();
        zone.x = target.x; zone.y = target.y; zone.z = target.z;
        zone.life = 4.0; zone.maxLife = 4.0;
        zone.color = '#3f6212'; zone.size = 300;
        zone.type = 'GRID_FIELD'; zone.style = 'GRID_RED_POISON'; zone.locked = true;
        vfx.state.particles.push(zone);
        for(let i=0; i<15; i++) {
            const p = vfx.state.getParticle();
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 200;
            p.x = target.x + Math.cos(angle) * r; p.y = target.y + Math.sin(angle) * r; p.z = target.z;
            p.vz = 50 + Math.random() * 50;
            p.life = 2.0; p.maxLife = 2.0; p.type = 'GLOW'; p.color = '#bef264'; p.size = 20; p.delay = i * 0.1;
            vfx.state.particles.push(p);
        }
        return true;
    }

    private static playRagnarok(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        vfx.playEffect('FX_ULT_RED_RAGNAROK_ERUPTION', target.x, target.y, target.z);
        const cracks = vfx.state.getParticle();
        cracks.x = target.x; cracks.y = target.y; cracks.z = target.z;
        cracks.life = 3.0; cracks.maxLife = 3.0;
        cracks.color = '#ea580c'; cracks.size = 150;
        cracks.type = 'GRID_FIELD'; cracks.style = 'GRID_RED_RITUAL';
        vfx.state.particles.push(cracks);
        camera.addTrauma(0.2); // Reduced from 0.5
        return true;
    }

    private static playRailgun(vfx: VFXSystem, target: Point3D, engine: GameEngine, grid: GridSystem, sourceId?: string) {
        if (!sourceId) return false;
        const srcAgent = engine.agents.find(a => a.id === sourceId);
        if (!srcAgent) return false;
        const terrainH = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
        const srcPt = { x: srcAgent.px, y: srcAgent.py, z: terrainH + srcAgent.physics.z + 40 };
        vfx.playBeam('DEATH_RAY', srcPt, target, '#000', 0.8);
        vfx.playEffect('FX_HIT_RED_HEAVY', target.x, target.y, target.z);
        return true;
    }

    private static playNuke(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        vfx.playEffect('FX_ULT_RED_NUKE_FLASH', target.x, target.y, target.z + 100);
        const stem = vfx.state.getParticle();
        stem.x = target.x; stem.y = target.y; stem.z = target.z;
        stem.life = 2.5; stem.maxLife = 2.5;
        stem.color = '#1c1917'; stem.size = 100;
        stem.type = 'PILLAR'; stem.style = 'PILLAR_VOID';
        vfx.state.particles.push(stem);
        setTimeout(() => {
            vfx.playEffect('FX_ULT_RED_NUKE_CLOUD', target.x, target.y, target.z + 400);
            camera.addTrauma(0.6); // Reduced from 1.0 (Nuke is still heavy but manageable)
        }, 100);
        const wave = vfx.state.getParticle();
        wave.x = target.x; wave.y = target.y; wave.z = target.z + 10;
        wave.life = 1.0; wave.maxLife = 1.0;
        wave.color = '#ef4444'; wave.size = 400; wave.type = 'SHOCKWAVE';
        vfx.state.particles.push(wave);
        return true;
    }

    private static playMeteor(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        const height = 1500;
        const rock = vfx.state.getParticle();
        rock.x = target.x; rock.y = target.y; rock.z = target.z + height;
        rock.vx = 0; rock.vy = 0; rock.vz = -1200; 
        rock.life = 1.3; rock.maxLife = 1.3;
        rock.color = '#ea580c'; rock.size = 80; rock.type = 'ROCK'; 
        vfx.state.particles.push(rock);
        const impactTime = (height / 1200) * 1000;
        setTimeout(() => {
            vfx.playEffect('FX_ULT_RED_METEOR_IMPACT', target.x, target.y, target.z);
            camera.addTrauma(0.3); // Reduced from 0.7
        }, impactTime);
        return true;
    }

    private static playSoulLink(vfx: VFXSystem, target: Point3D) {
        vfx.playEffect('FX_ULT_RED_SOUL_WEB', target.x, target.y, target.z);
        for(let i=0; i<6; i++) {
            const angle = (i/6) * Math.PI * 2;
            const r = 100;
            const px = target.x + Math.cos(angle) * r;
            const py = target.y + Math.sin(angle) * r;
            const p = vfx.state.getParticle();
            p.x = px; p.y = py; p.z = target.z;
            p.life = 2.0; p.maxLife = 2.0;
            p.color = '#581c87'; p.size = 20; p.type = 'PILLAR'; p.style = 'PILLAR_VOID';
            vfx.state.particles.push(p);
        }
        return true;
    }
}
