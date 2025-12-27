
import { VFXSystem } from "../../vfx";
import { GameEngine } from "../../../game";
import { GridSystem } from "../../grid";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../../UltArchitect";
import { HexUtils } from "../../../utils";
import { ULT_VISUALS, UltVisualDef } from "../../../../data/vfx/ult_visuals";
import { UNIT_BODY_OFFSET } from "../../../../constants";

// =========================================================================================
// 💠 IMPERIAL ULTIMATE DIRECTOR (BLUE FACTION)
// 
// Handles ALL 25 Blue Ultimates independently.
// Includes specialized implementations and Imperial-flavored archetypes.
// =========================================================================================

export class ImperialUltDirector {

    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        
        // 1. Dedicated Bespoke Visuals
        switch (id) {
            case 'tb_u1': return this.playSanctuary(vfx, target, camera);
            case 'wb_u1': return this.playThunderSlam(vfx, target, camera);
            case 'rb_u3': return this.playOrbitalStrike(vfx, target, camera);
            case 'rb_u1': return this.playCrystalArrow(vfx, target, engine, grid, sourceId, camera);
            case 'mb_u2': return this.playAbsoluteZero(vfx, target, camera);
            case 'sb_u2': return this.playResurrection(vfx, target);
        }

        // 2. Data-Driven Archetypes (Imperial Flavor)
        const def = ULT_VISUALS[id];
        if (def) {
            return this.playArchetype(def, target, engine, vfx, grid, camera, sourceId);
        }

        return false; 
    }

    // --- ARCHETYPE DISPATCHER ---
    private static playArchetype(def: UltVisualDef, target: Point3D, engine: GameEngine, vfx: VFXSystem, grid: GridSystem, camera: CameraSystem, sourceId?: string): boolean {
        // Imperial Flavor: Cleaner, barely any shake for generic ults
        camera.addTrauma(0.05 * def.scale);

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

    // --- GENERIC IMPLEMENTATIONS (BLUE FLAVOR) ---

    private static runHeavenFall(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        const height = def.height || 1000;
        const projectile = vfx.state.getParticle();
        projectile.x = target.x; 
        projectile.y = target.y; 
        projectile.z = target.z + height;
        projectile.vx = 0; 
        projectile.vy = 0; 
        const speed = height / (0.4 + (def.timing || 0)); 
        projectile.vz = -speed;
        projectile.life = 0.5 + (def.timing || 0); 
        projectile.maxLife = projectile.life;
        projectile.color = def.primaryColor;
        projectile.size = 100 * def.scale;
        
        // Blue Flavor: Default to GIANT_HEX for a "Tech Drop" look
        projectile.type = (def.vfxOverride as any) || 'GIANT_HEX'; 
        if (projectile.type === 'GIANT_HEX') {
            projectile.rotation = 0; // Organized, no random rotation
            projectile.vRotation = 1; // Slow spin
        }
        vfx.state.particles.push(projectile);

        setTimeout(() => {
            vfx.playEffect('FX_HIT_BLUE_PHYSICAL', target.x, target.y, target.z, def.secondaryColor);
        }, projectile.life * 1000 - 50);
    }

    private static runSanctuary(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        // Blue Sanctuary = Pillar Ring
        const count = def.count || 6;
        const radius = 160 * def.scale;
        
        // Center Beacon
        const beacon = vfx.state.getParticle();
        beacon.x = target.x; beacon.y = target.y; beacon.z = target.z;
        beacon.life = 3.0; beacon.maxLife = 3.0;
        beacon.color = def.primaryColor; 
        beacon.size = 40 * def.scale; 
        beacon.type = 'PILLAR'; 
        beacon.style = 'PILLAR_HOLY';
        beacon.locked = true; 
        vfx.state.particles.push(beacon);

        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const px = target.x + Math.cos(angle) * radius;
            const py = target.y + Math.sin(angle) * radius;
            const start = { x: px, y: py, z: target.z + 10 };
            const end = { x: target.x, y: target.y, z: target.z + 40 };
            // Blue beams are straighter/techy
            vfx.playBeam('TELEPORT_PILLAR', start, end, def.secondaryColor, 3.0);
        }
    }

    private static runDomain(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        const zone = vfx.state.getParticle();
        zone.x = target.x; zone.y = target.y; zone.z = target.z;
        zone.life = 4.0; zone.maxLife = 4.0;
        zone.color = def.primaryColor; 
        zone.size = 250 * def.scale;
        zone.type = (def.vfxOverride as any) || 'DOMAIN'; 
        zone.style = 'DOMAIN_STANDARD'; // Clean style
        zone.locked = true;
        vfx.state.particles.push(zone);

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

        // Use standard Beam for Blue
        vfx.playBeam('GENERIC_BEAM', srcPt, target, def.primaryColor, 0.6);
        vfx.playEffect('FX_HIT_BLUE_TECH', target.x, target.y, target.z, def.secondaryColor);
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
                // Holy Rain
                p.z = target.z + 500;
                p.vx = 0; p.vy = 0; p.vz = -800;
                p.life = 0.6; p.maxLife = 0.6;
                p.type = 'BEAM'; 
                p.style = 'GENERIC_BEAM';
                p.sx = p.x; p.sy = p.y; p.sz = p.z;
                p.tx = p.x; p.ty = p.y; p.tz = p.z - 800;
                p.size = 3;
            } else {
                // Sparkles / Lights
                p.z = target.z + Math.random() * 50;
                p.vx = (Math.random()-0.5) * 50;
                p.vy = (Math.random()-0.5) * 50;
                p.vz = 50 + Math.random() * 50;
                p.life = 1.5; p.maxLife = 1.5;
                p.type = (def.vfxOverride as any) || 'SPARK';
                p.size = 5 * def.scale;
            }
            p.color = Math.random() > 0.5 ? def.primaryColor : def.secondaryColor;
            p.delay = i * (def.timing || 0.05);
            vfx.state.particles.push(p);
        }
    }

    private static runInstantImpact(vfx: VFXSystem, target: Point3D, def: UltVisualDef) {
        // Blue impacts: Tech Grid or Holy Blast
        if (def.vfxOverride) {
            vfx.playEffect(def.vfxOverride, target.x, target.y, target.z, def.primaryColor);
        } else {
            vfx.playEffect('FX_HIT_BLUE_HOLY', target.x, target.y, target.z, def.primaryColor);
        }
        
        // Add Grid Floor if impactful
        if (def.scale > 1.2) {
            vfx.playEffect('FX_GRID_IMPACT_BLUE', target.x, target.y, target.z, def.primaryColor);
        }
    }

    // --- BESPOKE IMPLEMENTATIONS (Copied from previous step) ---

    private static playSanctuary(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        const center = vfx.state.getParticle();
        center.x = target.x; center.y = target.y; center.z = target.z;
        center.life = 3.5; center.maxLife = 3.5;
        center.color = '#fbbf24'; center.size = 120;
        center.type = 'PILLAR'; center.style = 'PILLAR_HOLY';
        vfx.state.particles.push(center);
        const ring = vfx.state.getParticle();
        ring.x = target.x; ring.y = target.y; ring.z = target.z;
        ring.life = 3.5; ring.maxLife = 3.5;
        ring.color = '#fffbeb'; ring.size = 350;
        ring.type = 'DOMAIN'; ring.style = 'DOMAIN_STANDARD';
        vfx.state.particles.push(ring);
        for(let i=0; i<6; i++) {
            const angle = i * (Math.PI / 3);
            const r = 250;
            const px = target.x + Math.cos(angle) * r;
            const py = target.y + Math.sin(angle) * r;
            const beam = vfx.state.getParticle();
            beam.sx = px; beam.sy = py; beam.sz = target.z + 800;
            beam.tx = px; beam.ty = py; beam.tz = target.z;
            beam.x = px; beam.y = py; beam.z = target.z;
            beam.life = 0.5; beam.maxLife = 0.5; beam.delay = i * 0.1;
            beam.color = '#f59e0b'; beam.type = 'BEAM'; beam.style = 'TELEPORT_PILLAR'; beam.size = 20;
            vfx.state.particles.push(beam);
        }
        setTimeout(() => {
            vfx.playEffect('FX_ULT_BLUE_SANCTUARY_IMPACT', target.x, target.y, target.z);
            camera.addTrauma(0.15); // Reduced from 0.4
        }, 500);
        return true;
    }

    private static playThunderSlam(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        vfx.playEffect('FX_GRID_IMPACT_BLUE', target.x, target.y, target.z);
        const bolt = vfx.state.getParticle();
        bolt.sx = target.x; bolt.sy = target.y; bolt.sz = target.z + 1000;
        bolt.tx = target.x; bolt.ty = target.y; bolt.tz = target.z;
        bolt.x = target.x; bolt.y = target.y; bolt.z = target.z;
        bolt.life = 0.3; bolt.maxLife = 0.3;
        bolt.color = '#3b82f6'; bolt.type = 'BEAM'; bolt.style = 'TELEPORT_PILLAR'; bolt.size = 80;
        vfx.state.particles.push(bolt);
        setTimeout(() => {
            vfx.playEffect('FX_ULT_BLUE_THUNDER_SLAM', target.x, target.y, target.z);
            camera.addTrauma(0.2); // Reduced from 0.6
        }, 100);
        return true;
    }

    private static playOrbitalStrike(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        const reticle = vfx.state.getParticle();
        reticle.x = target.x; reticle.y = target.y; reticle.z = target.z;
        reticle.life = 1.0; reticle.maxLife = 1.0;
        reticle.color = '#22d3ee'; reticle.size = 150;
        reticle.type = 'HEX_BEAM'; reticle.vRotation = 5;
        vfx.state.particles.push(reticle);
        setTimeout(() => {
            const beam = vfx.state.getParticle();
            beam.sx = target.x; beam.sy = target.y; beam.sz = target.z + 2000;
            beam.tx = target.x; beam.ty = target.y; beam.tz = target.z;
            beam.x = target.x; beam.y = target.y; beam.z = target.z;
            beam.life = 1.5; beam.maxLife = 1.5;
            beam.color = '#06b6d4'; beam.type = 'BEAM'; beam.style = 'DEATH_RAY'; beam.size = 60;
            vfx.state.particles.push(beam);
            vfx.playEffect('FX_ULT_BLUE_ORBITAL_BEAM', target.x, target.y, target.z);
            camera.addTrauma(0.25); // Reduced from 0.7
        }, 800);
        return true;
    }

    private static playCrystalArrow(vfx: VFXSystem, target: Point3D, engine: GameEngine, grid: GridSystem, sourceId: string | undefined, camera: CameraSystem) {
        if (!sourceId) return false;
        const srcAgent = engine.agents.find(a => a.id === sourceId);
        if (!srcAgent) return false;
        const h = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
        const start = { x: srcAgent.px, y: srcAgent.py, z: h + 50 };
        vfx.playBeam('GENERIC_BEAM', start, target, '#60a5fa', 0.5);
        vfx.playEffect('FX_ULT_BLUE_GLACIAL_BURST', target.x, target.y, target.z);
        camera.addTrauma(0.2); // Reduced from 0.5
        return true;
    }

    private static playAbsoluteZero(vfx: VFXSystem, target: Point3D, camera: CameraSystem) {
        const field = vfx.state.getParticle();
        field.x = target.x; field.y = target.y; field.z = target.z;
        field.life = 2.0; field.maxLife = 2.0;
        field.color = '#e0f2fe'; field.size = 400;
        field.type = 'DOMAIN'; field.style = 'DOMAIN_STANDARD';
        vfx.state.particles.push(field);
        vfx.playEffect('FX_ULT_BLUE_GLACIAL_BURST', target.x, target.y, target.z);
        for(let i=0; i<8; i++) {
            const angle = i * (Math.PI / 4);
            const r = 150 + Math.random() * 100;
            const px = target.x + Math.cos(angle) * r;
            const py = target.y + Math.sin(angle) * r;
            const spike = vfx.state.getParticle();
            spike.x = px; spike.y = py; spike.z = target.z;
            spike.life = 1.5; spike.maxLife = 1.5;
            spike.color = '#bae6fd'; spike.size = 40;
            spike.type = 'PILLAR'; spike.style = 'PILLAR_HOLY'; spike.delay = i * 0.05;
            vfx.state.particles.push(spike);
        }
        camera.addTrauma(0.15); // Reduced from 0.3
        return true;
    }

    private static playResurrection(vfx: VFXSystem, target: Point3D) {
        vfx.playEffect('FX_ULT_BLUE_RESURRECTION', target.x, target.y, target.z);
        for(let i=0; i<10; i++) {
            const p = vfx.state.getParticle();
            p.x = target.x + (Math.random()-0.5)*100; p.y = target.y + (Math.random()-0.5)*100; p.z = target.z;
            p.vz = 100 + Math.random() * 200; 
            p.life = 2.0; p.maxLife = 2.0; p.color = '#86efac'; p.size = 8; p.type = 'GLOW';
            vfx.state.particles.push(p);
        }
        return true;
    }
}
