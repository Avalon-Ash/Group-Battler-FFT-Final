
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { ULT_VISUALS, UltVisualDef } from "../../../data/ult_visuals";
import { UNIT_BODY_OFFSET } from "../../../constants";

// Import generic spawners to compose archetypes
import * as Generic from "../vfx/spawners/generic";

interface Point3D { x: number; y: number; z: number; }

export class UltArchitect {

    public static play(
        id: string, 
        target: Point3D, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sourceId?: string
    ): boolean {
        const def = ULT_VISUALS[id];
        if (!def) return false; // Not defined in data, fall back to legacy/generic

        const { archetype, primaryColor, secondaryColor, scale, count, height, vfxOverride } = def;

        // Camera Trauma Scaling based on Impact Scale
        camera.addTrauma(0.3 * scale);

        switch (archetype) {
            case 'HEAVEN_FALL':
                this.playHeavenFall(vfx, target, primaryColor, secondaryColor, height || 1000, scale, vfxOverride);
                break;
            
            case 'SANCTUARY':
                this.playSanctuary(vfx, target, primaryColor, secondaryColor, count || 6, scale);
                break;
            
            case 'DOMAIN':
                this.playDomain(vfx, target, primaryColor, secondaryColor, scale, vfxOverride);
                break;
            
            case 'BEAM_SNIPE':
                this.playBeamSnipe(vfx, engine, grid, target, sourceId, primaryColor, secondaryColor, scale);
                break;
            
            case 'STORM':
                this.playStorm(vfx, target, primaryColor, secondaryColor, count || 10, scale, vfxOverride);
                break;
            
            case 'INSTANT_IMPACT':
                this.playInstantImpact(vfx, target, primaryColor, secondaryColor, scale, vfxOverride);
                break;
        }

        return true;
    }

    private static playHeavenFall(vfx: VFXSystem, target: Point3D, pColor: string, sColor: string, height: number, scale: number, type?: string) {
        // 1. The Falling Object
        const projectile = vfx.state.getParticle();
        projectile.x = target.x; 
        projectile.y = target.y; 
        projectile.z = target.z + height;
        
        projectile.vx = 0; 
        projectile.vy = 0; 
        
        // Calculate speed to hit roughly in 0.4s
        const speed = height / 0.4;
        projectile.vz = -speed;
        
        projectile.life = 0.45; // slightly longer to ensure hit
        projectile.maxLife = 0.45;
        projectile.color = pColor;
        projectile.size = 100 * scale;
        projectile.type = (type as any) || 'GIANT_HEX'; // Default to Hex if not specified
        
        if (projectile.type === 'GIANT_HEX') projectile.rotation = Math.random() * Math.PI;
        
        vfx.state.particles.push(projectile);

        // 2. The Impact (Delayed)
        setTimeout(() => {
            Generic.spawnExplosion(vfx, target.x, target.y, target.z, 20, sColor, 3.0 * scale, 1.0, 'DEBRIS');
            Generic.spawnShockwave(vfx, target.x, target.y, target.z, pColor, 1.2);
            Generic.addImpact(vfx, target.x, target.y, target.z, sColor, 'BLAST', 0.8 * scale);
        }, 400);
    }

    private static playSanctuary(vfx: VFXSystem, target: Point3D, pColor: string, sColor: string, count: number, scale: number) {
        // Center Pillar
        const beacon = vfx.state.getParticle();
        beacon.x = target.x; beacon.y = target.y; beacon.z = target.z;
        beacon.life = 3.0; beacon.maxLife = 3.0;
        beacon.color = pColor; 
        beacon.size = 40 * scale; 
        beacon.type = 'PILLAR'; 
        beacon.locked = true; 
        vfx.state.particles.push(beacon);

        // Surrounding Beams
        const radius = 160 * scale;
        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const px = target.x + Math.cos(angle) * radius;
            const py = target.y + Math.sin(angle) * radius;
            const start = { x: px, y: py, z: target.z + 10 };
            const end = { x: target.x, y: target.y, z: target.z + 40 };
            Generic.spawnBeam(vfx, start, end, sColor, 3.0, 2 * scale);
        }
    }

    private static playDomain(vfx: VFXSystem, target: Point3D, pColor: string, sColor: string, scale: number, overrideType?: string) {
        // Base Zone
        const zone = vfx.state.getParticle();
        zone.x = target.x; zone.y = target.y; zone.z = target.z;
        zone.life = 4.0; zone.maxLife = 4.0;
        zone.color = pColor; 
        zone.size = 250 * scale;
        zone.type = (overrideType as any) || 'DOMAIN'; 
        zone.locked = true;
        vfx.state.particles.push(zone);

        // Initial Shockwave
        Generic.spawnShockwave(vfx, target.x, target.y, target.z, sColor, 1.5);
    }

    private static playBeamSnipe(vfx: VFXSystem, engine: GameEngine, grid: GridSystem, target: Point3D, sourceId: string | undefined, pColor: string, sColor: string, scale: number) {
        if (!sourceId) return;
        const srcAgent = engine.agents.find(a => a.id === sourceId);
        if (!srcAgent) return;

        // Resolve Source Point including body height
        const terrainH = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
        const srcPt = {
            x: srcAgent.px,
            y: srcAgent.py,
            z: terrainH + srcAgent.physics.z + UNIT_BODY_OFFSET
        };

        // Beam
        if (pColor === '#000') {
             // Railgun style (Black core, colored glow)
             Generic.spawnDeathRay(vfx, srcPt, target, '#000');
             Generic.spawnShockwave(vfx, srcPt.x, srcPt.y, srcPt.z, sColor, 0.5);
        } else {
             Generic.spawnDeathRay(vfx, srcPt, target, pColor);
        }
        
        // Impact at target
        Generic.addImpact(vfx, target.x, target.y, target.z, sColor, 'BLAST', 0.5 * scale);
    }

    private static playStorm(vfx: VFXSystem, target: Point3D, pColor: string, sColor: string, count: number, scale: number, overrideType?: string) {
        const radius = 200 * scale;
        
        for(let i=0; i<count; i++) {
            const p = vfx.state.getParticle();
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            
            p.x = target.x + Math.cos(a) * r;
            p.y = target.y + Math.sin(a) * r;
            
            const isRain = overrideType === 'BEAM';
            
            if (isRain) {
                p.z = target.z + 500;
                p.vx = 0; p.vy = 0; p.vz = -800;
                p.life = 0.6; p.maxLife = 0.6;
                p.type = 'BEAM'; // Rain drop reuse
                p.size = 3;
            } else {
                // Chaotic movement (Bladestorm / Firestorm)
                p.z = target.z + Math.random() * 50;
                p.vx = (Math.random()-0.5) * 200;
                p.vy = (Math.random()-0.5) * 200;
                p.vz = 50 + Math.random() * 100;
                p.life = 1.5; p.maxLife = 1.5;
                p.type = (overrideType as any) || 'SMOKE';
                p.size = 15 * scale;
            }
            
            p.color = Math.random() > 0.5 ? pColor : sColor;
            p.delay = i * 0.05;
            
            vfx.state.particles.push(p);
        }
    }

    private static playInstantImpact(vfx: VFXSystem, target: Point3D, pColor: string, sColor: string, scale: number, overrideType?: string) {
        if (overrideType === 'GRID_FIELD') {
            const grid = vfx.state.getParticle();
            grid.x = target.x; grid.y = target.y; grid.z = target.z;
            grid.life = 2.0; grid.maxLife = 2.0;
            grid.color = pColor; grid.size = 200 * scale;
            grid.type = 'GRID_FIELD'; grid.locked = true;
            vfx.state.particles.push(grid);
        } else {
            Generic.spawnExplosion(vfx, target.x, target.y, target.z, 15, pColor, 4.0 * scale, 1.0, (overrideType as any) || 'SPARK');
        }
        
        Generic.addImpact(vfx, target.x, target.y, target.z, sColor, 'BLAST', 0.8 * scale);
        Generic.spawnShockwave(vfx, target.x, target.y, target.z, pColor, 1.0 * scale);
    }
}
