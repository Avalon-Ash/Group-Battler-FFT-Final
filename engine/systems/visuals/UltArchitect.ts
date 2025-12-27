
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { GameEngine } from "../../game";
import { ULT_VISUALS } from "../../../data/ult_visuals";
import { UNIT_BODY_OFFSET } from "../../../constants";

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
        if (!def) return false; 

        const { archetype, primaryColor, secondaryColor, scale, count, height, vfxOverride } = def;

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
        // Falling Object
        const projectile = vfx.state.getParticle();
        projectile.x = target.x; 
        projectile.y = target.y; 
        projectile.z = target.z + height;
        projectile.vx = 0; 
        projectile.vy = 0; 
        const speed = height / 0.4;
        projectile.vz = -speed;
        projectile.life = 0.45; projectile.maxLife = 0.45;
        projectile.color = pColor;
        projectile.size = 100 * scale;
        projectile.type = (type as any) || 'GIANT_HEX'; 
        if (projectile.type === 'GIANT_HEX') projectile.rotation = Math.random() * Math.PI;
        vfx.state.particles.push(projectile);

        // Impact
        setTimeout(() => {
            vfx.playEffect('FX_IMPACT_PHYSICAL', target.x, target.y, target.z, sColor);
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
            
            // Using New Beam System
            vfx.playBeam('TELEPORT_PILLAR', start, end, sColor, 3.0);
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

        // Initial Shockwave from generic registry logic (simulated manually here for custom scale)
        const shock = vfx.state.getParticle();
        shock.x = target.x; shock.y = target.y; shock.z = target.z + 5;
        shock.life = 1.5; shock.maxLife = 1.5;
        shock.color = sColor; shock.size = 50 * scale;
        shock.type = 'SHOCKWAVE';
        vfx.state.particles.push(shock);
    }

    private static playBeamSnipe(vfx: VFXSystem, engine: GameEngine, grid: GridSystem, target: Point3D, sourceId: string | undefined, pColor: string, sColor: string, scale: number) {
        if (!sourceId) return;
        const srcAgent = engine.agents.find(a => a.id === sourceId);
        if (!srcAgent) return;

        const terrainH = grid.getTerrainHeight(srcAgent.q, srcAgent.r, engine);
        const srcPt = {
            x: srcAgent.px,
            y: srcAgent.py,
            z: terrainH + srcAgent.physics.z + UNIT_BODY_OFFSET
        };

        if (pColor === '#000') {
             // Railgun
             vfx.playBeam('DEATH_RAY', srcPt, target, undefined, 0.6);
        } else {
             // Generic Snipe
             vfx.playBeam('GENERIC_BEAM', srcPt, target, pColor, 0.6);
        }
        
        vfx.playEffect('FX_IMPACT_PHYSICAL', target.x, target.y, target.z, sColor);
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
                p.type = 'BEAM'; 
                p.beamStyle = 'GENERIC_BEAM';
                // Hack: Set target Z far below to create vertical rain beam
                p.sx = p.x; p.sy = p.y; p.sz = p.z;
                p.tx = p.x; p.ty = p.y; p.tz = p.z - 800;
                p.size = 3;
            } else {
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
            vfx.playEffect('FX_GRID_IMPACT_VOID', target.x, target.y, target.z, pColor);
        } else {
            // Manual Explosion for scale control
            // Ideally we'd have Scalable Registry Effects, but for now this works or adding FX_EXPLOSION_LARGE
            vfx.playEffect('FX_IMPACT_PHYSICAL', target.x, target.y, target.z, pColor);
        }
    }
}
