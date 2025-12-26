
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnLingeringField, spawnDeathRay } from "./generic";
import { ISO_SCALE_Y } from "../../../../constants";

interface Point3D { x: number; y: number; z: number; }

// --- TANK ---

// 🛡️ TANK: GUILLOTINE (tr_u1)
export function spawnCovenantGuillotine(system: VFXSystem, pt: Point3D, color: string) {
    const omen = system.state.getParticle();
    omen.x = pt.x; omen.y = pt.y; omen.z = pt.z;
    omen.life = 1.0; omen.maxLife = 1.0;
    omen.color = '#000'; omen.size = 50; omen.type = 'GRID_FIELD'; omen.locked = true;
    system.state.particles.push(omen);

    const blade = system.state.getParticle();
    blade.x = pt.x; blade.y = pt.y; blade.z = pt.z + 1000; 
    blade.vx = 0; blade.vy = 0; blade.vz = -4000; 
    blade.life = 0.5; blade.maxLife = 0.5;
    blade.color = '#7f1d1d'; blade.size = 120; 
    blade.type = 'GIANT_HEX'; blade.rotation = Math.random() * Math.PI; blade.sortBias = 50; 
    system.state.particles.push(blade);

    setTimeout(() => {
        spawnExplosion(system, pt.x, pt.y, pt.z, 10, '#ef4444', 2.0, 1.0, 'GLOW');
        spawnShockwave(system, pt.x, pt.y, pt.z, '#000', 0.8);
        addImpact(system, pt.x, pt.y, pt.z, '#7f1d1d', 'BLAST', 0.5);
    }, 250);
}

// 🛡️ TANK: UNDEAD ARMY (tr_u2)
export function spawnCovenantUndeadArmy(system: VFXSystem, pt: Point3D, color: string) {
    const grid = system.state.getParticle();
    grid.x = pt.x; grid.y = pt.y; grid.z = pt.z;
    grid.life = 6.0; grid.maxLife = 6.0;
    grid.color = '#3f6212'; grid.size = 300; grid.type = 'DOMAIN'; grid.locked = true;
    system.state.particles.push(grid);

    for(let i=0; i<30; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 250;
        p.x = pt.x + Math.cos(a)*d; p.y = pt.y + Math.sin(a)*d; p.z = pt.z - 20;
        p.vx = 0; p.vy = 0; p.vz = 40 + Math.random() * 20; 
        p.life = 4.0; p.maxLife = 4.0;
        p.color = Math.random() > 0.5 ? '#fecaca' : '#a3e635'; 
        p.size = 15 + Math.random() * 10; p.type = 'DEBRIS'; p.delay = Math.random() * 3.0;
        system.state.particles.push(p);
    }
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#ecfccb', 'SMOKE', 6.0, 0);
}

// 🛡️ TANK: BLOOD EMBRACE (tr_u3)
export function spawnCovenantBloodEmbrace(system: VFXSystem, pt: Point3D, color: string) {
    // Reverse Shockwave (Implosion)
    const p = system.state.getParticle();
    p.x = pt.x; p.y = pt.y; p.z = pt.z + 5;
    p.life = 1.0; p.maxLife = 1.0;
    p.color = '#be123c'; p.size = 150; p.type = 'SHOCKWAVE';
    p.vx = 0; p.vy = 0; p.vz = 0; 
    // Using a simple trick: Scaling down is handled by progress in renderer, but we want visual suction
    // Here we just spawn multiple beams inwards
    for(let i=0; i<8; i++) {
        const a = (i/8)*Math.PI*2;
        const sx = pt.x + Math.cos(a)*200;
        const sy = pt.y + Math.sin(a)*200;
        spawnBeam(system, {x: sx, y: sy, z: pt.z}, {x: pt.x, y: pt.y, z: pt.z}, '#991b1b', 0.5, 4);
    }
}

// 🛡️ TANK: UNDYING (tr_u4)
export function spawnCovenantUndying(system: VFXSystem, pt: Point3D, color: string) {
    const aura = system.state.getParticle();
    aura.x = pt.x; aura.y = pt.y; aura.z = pt.z + 20;
    aura.life = 5.0; aura.maxLife = 5.0;
    aura.color = '#16a34a'; aura.size = 80; aura.type = 'GLOW';
    aura.locked = true;
    system.state.particles.push(aura);
}

// 🛡️ TANK: ROT EXPLOSION (tr_u5)
export function spawnCovenantRot(system: VFXSystem, pt: Point3D, color: string) {
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#3f6212', 3.0, 1.0, 'SMOKE');
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#a3e635', 'SMOKE', 3.0, 0);
}

// --- WARRIOR ---

// ⚔️ WARRIOR: RAGNAROK (wr_u1)
export function spawnCovenantRagnarok(system: VFXSystem, pt: Point3D, color: string) {
    const crack = system.state.getParticle();
    crack.x = pt.x; crack.y = pt.y; crack.z = pt.z;
    crack.life = 3.0; crack.maxLife = 3.0;
    crack.color = '#ef4444'; crack.size = 300;
    crack.type = 'GRID_FIELD'; crack.locked = true;
    system.state.particles.push(crack);

    for(let i=0; i<8; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*150; p.y = pt.y + (Math.random()-0.5)*150; p.z = pt.z;
        p.targetX = p.x + (Math.random()-0.5)*80; p.targetY = p.y + (Math.random()-0.5)*80; p.targetZ = pt.z + 40; 
        p.life = 0.4; p.maxLife = 0.4;
        p.color = '#fca5a5'; p.size = 5; p.type = 'BEAM'; p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: BLOOD STORM (wr_u2)
export function spawnCovenantBloodStorm(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<40; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 50;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z + Math.random() * 150;
        p.vx = -Math.sin(a) * 500; p.vy = Math.cos(a) * 500; p.vz = 300; 
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#991b1b'; p.size = 20; p.type = 'SMOKE'; p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: DEMON FORM (wr_u3)
export function spawnCovenantDemon(system: VFXSystem, pt: Point3D, color: string) {
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#000', 4.0, 1.0, 'SMOKE');
    spawnShockwave(system, pt.x, pt.y, pt.z, '#7f1d1d', 1.0);
}

// ⚔️ WARRIOR: UNLIMITED BLADE (wr_u4)
export function spawnCovenantUnlimited(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*150;
        p.y = pt.y + (Math.random()-0.5)*150;
        p.z = pt.z + 100;
        p.vx = 0; p.vy = 0; p.vz = -400;
        p.life = 0.5; p.maxLife = 0.5;
        p.color = '#ef4444'; p.size = 15; p.type = 'SHARD'; // Sword-like
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: DEVASTATE (wr_u5)
export function spawnCovenantDevastate(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z, '#000', 'BLAST', 0.8);
    spawnExplosion(system, pt.x, pt.y, pt.z, 15, '#7f1d1d', 3.0, 0.5, 'DEBRIS');
}

// --- RANGER ---

// 🏹 RANGER: RAILGUN (rr_u1)
export function spawnCovenantRailgun(system: VFXSystem, src: Point3D, dst: Point3D, color: string) {
    spawnDeathRay(system, src, dst, '#000');
    // Recoil ring at src
    spawnShockwave(system, src.x, src.y, src.z, '#ef4444', 0.5);
}

// 🏹 RANGER: NUKE (rr_u2)
export function spawnCovenantNuke(system: VFXSystem, pt: Point3D, color: string) {
    const flash = system.state.getParticle();
    flash.x = pt.x; flash.y = pt.y; flash.z = pt.z + 50;
    flash.life = 0.3; flash.maxLife = 0.3;
    flash.color = '#FFFFFF'; flash.size = 1000; flash.type = 'BLAST'; flash.vRotation = 0;
    system.state.particles.push(flash);

    spawnShockwave(system, pt.x, pt.y, pt.z, '#FFFFFF', 0.8);
    addImpact(system, pt.x, pt.y, pt.z, color, 'BLAST', 1.0);

    for(let i=0; i<25; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 35;
        p.x = pt.x + Math.cos(angle)*radius; p.y = pt.y + Math.sin(angle)*radius; p.z = pt.z + 10;
        p.vx = (Math.random()-0.5)*30; p.vy = (Math.random()-0.5)*30; p.vz = 450 + Math.random() * 300; 
        p.life = 1.8 + Math.random() * 0.5; p.maxLife = p.life;
        p.color = Math.random() > 0.6 ? '#2a0a0a' : '#450a0a'; 
        p.size = 50 + Math.random() * 40; p.type = 'SMOKE'; 
        p.drag = 0.06; p.delay = i * 0.03;
        system.state.particles.push(p);
    }

    const capHeight = 350;
    const capDelay = 0.35;
    for(let i=0; i<50; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 60;
        p.x = pt.x + Math.cos(angle)*radius; p.y = pt.y + Math.sin(angle)*radius; p.z = pt.z + capHeight; 
        const speed = 150 + Math.random() * 250;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed; p.vz = (Math.random() - 0.3) * 100; 
        p.life = 2.5 + Math.random(); p.maxLife = p.life;
        const rng = Math.random();
        if (rng > 0.7) p.color = '#171717'; 
        else if (rng > 0.4) p.color = '#ef4444'; 
        else p.color = '#fbbf24'; 
        p.size = 90 + Math.random() * 70; p.type = 'SMOKE'; 
        p.delay = capDelay + Math.random() * 0.4; p.drag = 0.08; 
        system.state.particles.push(p);
    }
    spawnExplosion(system, pt.x, pt.y, pt.z + 100, 20, '#f97316', 4.0, 1.5, 'DEBRIS');
}

// 🏹 RANGER: BULLET TIME (rr_u3)
export function spawnCovenantBulletTime(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<20; i++) {
        const sx = pt.x + (Math.random()-0.5)*400;
        const sy = pt.y + (Math.random()-0.5)*400;
        const tx = sx + (Math.random()-0.5)*200;
        const ty = sy + (Math.random()-0.5)*200;
        spawnBeam(system, {x: sx, y: sy, z: pt.z+30}, {x: tx, y: ty, z: pt.z+30}, '#f87171', 0.2, 2);
    }
}

// 🏹 RANGER: INFERNO (rr_u4)
export function spawnCovenantInferno(system: VFXSystem, pt: Point3D, color: string) {
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#ea580c', 'SMOKE', 4.0, 0);
    spawnExplosion(system, pt.x, pt.y, pt.z, 15, '#f97316', 3.0, 1.0, 'SPARK');
}

// 🏹 RANGER: HEADHUNTER (rr_u5)
export function spawnCovenantHeadhunter(system: VFXSystem, pt: Point3D, color: string) {
    // Crosshair lock
    const p = system.state.getParticle();
    p.x = pt.x; p.y = pt.y; p.z = pt.z + 5;
    p.life = 0.5; p.maxLife = 0.5;
    p.color = '#7f1d1d'; p.size = 40; p.type = 'HEX_LOCK';
    system.state.particles.push(p);
    spawnBeam(system, {x: pt.x, y: pt.y, z: pt.z+800}, {x: pt.x, y: pt.y, z: pt.z}, '#7f1d1d', 0.2, 5);
}

// --- MAGE ---

// 🔮 MAGE: METEOR (mr_u1)
export function spawnCovenantMeteor(system: VFXSystem, pt: Point3D, color: string) {
    const warning = system.state.getParticle();
    warning.x = pt.x; warning.y = pt.y; warning.z = pt.z + 5;
    warning.life = 0.8; warning.maxLife = 0.8;
    warning.color = '#f97316'; warning.size = 150; warning.type = 'SHOCKWAVE'; warning.locked = true;
    system.state.particles.push(warning);

    setTimeout(() => {
        spawnExplosion(system, pt.x, pt.y, pt.z, 60, '#f97316', 5.0, 2.0, 'DEBRIS'); 
        spawnExplosion(system, pt.x, pt.y, pt.z, 40, '#7c2d12', 3.0, 2.5, 'SMOKE');
        spawnShockwave(system, pt.x, pt.y, pt.z, '#ea580c', 1.5);
        addImpact(system, pt.x, pt.y, pt.z, '#fbbf24', 'BLAST', 1.0);
    }, 800);
}

// 🔮 MAGE: DEATH FINGER (mr_u2)
export function spawnCovenantDeathFinger(system: VFXSystem, src: Point3D, dst: Point3D, color: string) {
    spawnDeathRay(system, src, dst, '#dc2626');
}

// 🔮 MAGE: CHAOS RAIN (mr_u3)
export function spawnCovenantChaosRain(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<8; i++) {
        const p = system.state.getParticle();
        const r = Math.random() * 100;
        const a = Math.random() * Math.PI * 2;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z + 500;
        p.vx = 0; p.vy = 0; p.vz = -800;
        p.life = 0.6; p.maxLife = 0.6;
        p.color = '#22c55e'; p.size = 20; p.type = 'BLAST'; 
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: VOID PORTAL (mr_u4)
export function spawnCovenantVoidPortal(system: VFXSystem, pt: Point3D, color: string) {
    const portal = system.state.getParticle();
    portal.x = pt.x; portal.y = pt.y; portal.z = pt.z + 10;
    portal.life = 4.0; portal.maxLife = 4.0;
    portal.color = '#581c87'; portal.size = 160; 
    portal.type = 'GIANT_HEX'; portal.rotation = Math.random() * Math.PI; 
    portal.sortBias = 100; portal.vRotation = 2.0; 
    system.state.particles.push(portal);

    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const dist = 180;
        p.x = pt.x + Math.cos(a)*dist; p.y = pt.y + Math.sin(a)*dist; p.z = pt.z + 20;
        p.targetX = pt.x; p.targetY = pt.y; p.killAtTarget = 30*30;
        const speed = 80;
        p.vx = -Math.cos(a)*speed; p.vy = -Math.sin(a)*speed; p.vz = 0;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#a855f7'; p.size = 8; p.type = 'SHARD'; p.delay = i * 0.2;
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: SOUL BURN (mr_u5)
export function spawnCovenantSoulBurn(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<20; i++) {
        const p = system.state.getParticle();
        const r = Math.random() * 150; const a = Math.random() * Math.PI * 2;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z;
        p.vx = 0; p.vy = 0; p.vz = 50;
        p.life = 1.0; p.maxLife = 1.0;
        p.color = '#9333ea'; p.size = 8; p.type = 'SPARK';
        system.state.particles.push(p);
    }
}

// --- SUPPORT ---

// ⚕️ SUPPORT: SOUL LINK (sr_u1)
export function spawnCovenantSoulLink(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z + 20, '#b45309', 'BLAST', 1.0);
    const count = 8;
    const radius = 350;
    for(let i=0; i<count; i++) {
        const a = (i/count) * Math.PI*2;
        const tx = pt.x + Math.cos(a)*radius;
        const ty = pt.y + Math.sin(a)*radius;
        const tz = pt.z + 20; 
        spawnBeam(system, {x: pt.x, y: pt.y, z: pt.z + 20}, {x: tx, y: ty, z: tz}, '#78350f', 2.5, 5);
    }
}

// ⚕️ SUPPORT: ANCESTORS (sr_u2)
export function spawnCovenantAncestors(system: VFXSystem, pt: Point3D, color: string) {
    const zone = system.state.getParticle();
    zone.x = pt.x; zone.y = pt.y; zone.z = pt.z;
    zone.life = 4.0; zone.maxLife = 4.0;
    zone.color = '#ef4444'; zone.size = 250;
    zone.type = 'DOMAIN'; zone.locked = true;
    system.state.particles.push(zone);

    for(let i=0; i<30; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*200; p.y = pt.y + (Math.random()-0.5)*200; p.z = pt.z + 10;
        p.vx = 0; p.vy = 0; p.vz = 150;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#bef264'; p.size = 5; p.type = 'SPARK';
        system.state.particles.push(p);
    }
}

// ⚕️ SUPPORT: VOODOO (sr_u3)
export function spawnCovenantVoodoo(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        const r = Math.random() * 100; const a = Math.random() * Math.PI * 2;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z + 20;
        p.vx = 0; p.vy = 0; p.vz = 50;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#84cc16'; p.size = 15; p.type = 'SMOKE';
        system.state.particles.push(p);
    }
}

// ⚕️ SUPPORT: BLOOD PACT (sr_u4)
export function spawnCovenantBloodPact(system: VFXSystem, pt: Point3D, color: string) {
    spawnShockwave(system, pt.x, pt.y, pt.z, '#dc2626', 1.5);
    addImpact(system, pt.x, pt.y, pt.z, '#dc2626', 'BLAST', 0.8);
}

// ⚕️ SUPPORT: NIGHTMARE (sr_u5)
export function spawnCovenantNightmare(system: VFXSystem, pt: Point3D, color: string) {
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#4c1d95', 'SMOKE', 4.0, 0);
}
