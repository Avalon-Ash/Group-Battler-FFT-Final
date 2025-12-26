
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnLingeringField, spawnDeathRay } from "./generic";
import { ISO_SCALE_Y } from "../../../../constants";

interface Point3D { x: number; y: number; z: number; }

export function spawnCovenantGuillotine(system: VFXSystem, pt: Point3D, color: string) {
    const omen = system.state.getParticle();
    omen.x = pt.x; omen.y = pt.y; omen.z = pt.z;
    omen.life = 1.0; omen.maxLife = 1.0;
    omen.color = '#000';
    omen.size = 50;
    omen.type = 'GRID_FIELD';
    omen.locked = true;
    system.state.particles.push(omen);

    const blade = system.state.getParticle();
    blade.x = pt.x; blade.y = pt.y; 
    blade.z = pt.z + 1000; 
    blade.vx = 0; blade.vy = 0; 
    blade.vz = -4000; 
    
    blade.life = 0.5; blade.maxLife = 0.5;
    blade.color = '#7f1d1d';
    blade.size = 120; 
    blade.type = 'GIANT_HEX';
    blade.rotation = Math.random() * Math.PI;
    blade.sortBias = 50; 
    system.state.particles.push(blade);

    setTimeout(() => {
        spawnExplosion(system, pt.x, pt.y, pt.z, 10, '#ef4444', 2.0, 1.0, 'GLOW');
        spawnShockwave(system, pt.x, pt.y, pt.z, '#000', 0.8);
        addImpact(system, pt.x, pt.y, pt.z, '#7f1d1d', 'BLAST', 0.5);
    }, 250);
}

export function spawnCovenantUndeadArmy(system: VFXSystem, pt: Point3D, color: string) {
    const grid = system.state.getParticle();
    grid.x = pt.x; grid.y = pt.y; grid.z = pt.z;
    grid.life = 5.0; grid.maxLife = 5.0;
    grid.color = '#7f1d1d'; 
    grid.size = 250;
    grid.type = 'DOMAIN'; 
    grid.locked = true;
    system.state.particles.push(grid);

    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 200;
        p.x = pt.x + Math.cos(a)*d; p.y = pt.y + Math.sin(a)*d; p.z = pt.z - 20;
        p.vx = 0; p.vy = 0; p.vz = 60; 
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#fecaca'; 
        p.size = 15;
        p.type = 'DEBRIS'; 
        p.delay = Math.random() * 3.0;
        system.state.particles.push(p);
    }
}

export function spawnCovenantRagnarok(system: VFXSystem, pt: Point3D, color: string) {
    const crack = system.state.getParticle();
    crack.x = pt.x; crack.y = pt.y; crack.z = pt.z;
    crack.life = 3.0; crack.maxLife = 3.0;
    crack.color = '#ef4444'; 
    crack.size = 300;
    crack.type = 'GRID_FIELD'; 
    crack.locked = true;
    system.state.particles.push(crack);

    for(let i=0; i<8; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*150;
        p.y = pt.y + (Math.random()-0.5)*150;
        p.z = pt.z;
        p.targetX = p.x + (Math.random()-0.5)*80;
        p.targetY = p.y + (Math.random()-0.5)*80;
        p.targetZ = pt.z + 40; 
        p.life = 0.4; p.maxLife = 0.4;
        p.color = '#fca5a5';
        p.size = 5;
        p.type = 'BEAM'; 
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

export function spawnCovenantBloodStorm(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<40; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 50;
        p.x = pt.x + Math.cos(a)*r;
        p.y = pt.y + Math.sin(a)*r;
        p.z = pt.z + Math.random() * 150;
        p.vx = -Math.sin(a) * 500; 
        p.vy = Math.cos(a) * 500;
        p.vz = 300; 
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#991b1b';
        p.size = 20;
        p.type = 'SMOKE'; 
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

export function spawnCovenantRailgun(system: VFXSystem, src: Point3D, dst: Point3D, color: string) {
    spawnDeathRay(system, src, dst, '#f59e0b');
}

export function spawnCovenantNuke(system: VFXSystem, pt: Point3D, color: string) {
    const flash = system.state.getParticle();
    flash.x = pt.x; flash.y = pt.y; flash.z = pt.z + 30;
    flash.life = 0.2; flash.maxLife = 0.2;
    flash.color = '#FFFFFF';
    flash.size = 600; 
    flash.type = 'BLAST';
    flash.vRotation = 15;
    system.state.particles.push(flash);

    // ... (rest of logic mostly generic smoke, z handled by physics update)
    spawnShockwave(system, pt.x, pt.y, pt.z, '#FFFFFF', 0.6);
}

export function spawnCovenantMeteor(system: VFXSystem, pt: Point3D, color: string) {
    setTimeout(() => {
        spawnExplosion(system, pt.x, pt.y, pt.z, 40, '#f97316', 4.0, 1.5, 'DEBRIS'); 
        spawnShockwave(system, pt.x, pt.y, pt.z, '#ea580c', 1.2);
    }, 800);
}

export function spawnCovenantDeathFinger(system: VFXSystem, src: Point3D, dst: Point3D, color: string) {
    spawnDeathRay(system, src, dst, '#dc2626');
}

export function spawnCovenantSoulLink(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z + 20, '#b45309', 'BLAST', 1.0);

    const count = 8;
    const radius = 350;
    for(let i=0; i<count; i++) {
        const a = (i/count) * Math.PI*2;
        // Target is horizontal perimeter
        const tx = pt.x + Math.cos(a)*radius;
        const ty = pt.y + Math.sin(a)*radius;
        const tz = pt.z + 20; 
        
        spawnBeam(system, 
            {x: pt.x, y: pt.y, z: pt.z + 20}, 
            {x: tx, y: ty, z: tz}, 
            '#78350f', 2.5, 5
        );
    }
}

export function spawnCovenantAncestors(system: VFXSystem, pt: Point3D, color: string) {
    const zone = system.state.getParticle();
    zone.x = pt.x; zone.y = pt.y; zone.z = pt.z;
    zone.life = 4.0; zone.maxLife = 4.0;
    zone.color = '#ef4444'; 
    zone.size = 250;
    zone.type = 'DOMAIN'; 
    zone.locked = true;
    system.state.particles.push(zone);

    for(let i=0; i<30; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*200;
        p.y = pt.y + (Math.random()-0.5)*200;
        p.z = pt.z + 10;
        p.vx = 0; p.vy = 0; p.vz = 150;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#fbbf24';
        p.size = 5;
        p.type = 'SPARK';
        system.state.particles.push(p);
    }
}
