
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnRisingSpikes, spawnLingeringField, spawnDeathRay } from "./generic";

// =========================================================================================
// 🔴 COVENANT (RED) - KHORNE / WORLD EATERS THEME
// Keywords: Blood, Skulls, Brass, Chains, Fire, Brutality
// =========================================================================================

// 🛡️ TANK: SKULL TAKER (tr_u1)
// "Guillotine" -> Giant Phantom Axe.
export function spawnCovenantGuillotine(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Vertical Red Flash (The Strike)
    const slash = system.state.getParticle();
    slash.x = x; slash.y = y; slash.z = 50;
    slash.life = 0.3; slash.maxLife = 0.3;
    slash.color = '#7f1d1d'; // Blood Red
    slash.size = 150; 
    slash.type = 'BLAST'; // Spiky
    system.state.particles.push(slash);

    // 2. Blood Spray
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 20;
        p.vx = (Math.random()-0.5)*300; 
        p.vy = (Math.random()-0.5)*300; 
        p.vz = 200 + Math.random()*200;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = '#991b1b';
        p.size = 8;
        p.type = 'DEBRIS'; // Chunks
        system.state.particles.push(p);
    }
}

// 🛡️ TANK: BLOOD LAKE (tr_u2)
// "Undead Army" -> Boiling Blood Ground.
export function spawnCovenantUndeadArmy(system: VFXSystem, x: number, y: number, color: string) {
    // 1. The Lake (Jagged red area)
    const grid = system.state.getParticle();
    grid.x = x; grid.y = y; grid.z = 0;
    grid.life = 4.0; grid.maxLife = 4.0;
    grid.color = '#7f1d1d'; 
    grid.size = 220;
    grid.type = 'DOMAIN'; // Chaos style (Jagged)
    system.state.particles.push(grid);

    // 2. Bubbles / Skulls rising
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 180;
        p.x = x + Math.cos(a)*d; p.y = y + Math.sin(a)*d; p.z = -20;
        p.vx = 0; p.vy = 0; p.vz = 50; // Rise
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#fecaca'; // Bone white
        p.size = 12;
        p.type = 'DEBRIS'; // Skull chunk
        p.delay = Math.random() * 2.0;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: WARP STORM (wr_u1)
// "Ragnarok" -> Red Lightning Fissures.
export function spawnCovenantRagnarok(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Cracks
    const crack = system.state.getParticle();
    crack.x = x; crack.y = y; crack.z = 0;
    crack.life = 2.5; crack.maxLife = 2.5;
    crack.color = '#ef4444'; // Bright Red
    crack.size = 250;
    crack.type = 'GRID_FIELD'; // Jagged
    system.state.particles.push(crack);

    // 2. Warp Lightning
    for(let i=0; i<5; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*100;
        p.y = y + (Math.random()-0.5)*100;
        p.z = 0;
        p.targetX = p.x + (Math.random()-0.5)*50;
        p.targetY = p.y + (Math.random()-0.5)*50;
        p.life = 0.3; p.maxLife = 0.3;
        p.color = '#fca5a5';
        p.size = 3;
        p.type = 'BEAM'; // Short arcs
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: BUTCHER'S NAILS (wr_u2)
// "Blood Storm" -> Red Tornado.
export function spawnCovenantBloodStorm(system: VFXSystem, x: number, y: number, color: string) {
    for(let i=0; i<30; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 40;
        
        p.x = x + Math.cos(a)*r;
        p.y = y + Math.sin(a)*r;
        p.z = Math.random() * 100;
        
        p.vx = -Math.sin(a) * 400; // Spin
        p.vy = Math.cos(a) * 400;
        p.vz = 200; // Rise
        
        p.life = 1.5; p.maxLife = 1.5;
        p.color = '#991b1b';
        p.size = 15;
        p.type = 'SMOKE'; 
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

// 🏹 RANGER: SKULL CANNON (rr_u1)
// "Railgun" -> Demon Engine Shot.
export function spawnCovenantRailgun(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    // 1. The Shot (Fire & Brass)
    const beam = system.state.getParticle();
    beam.x = sx; beam.y = sy; beam.z = 40; 
    beam.targetX = tx; beam.targetY = ty;
    beam.life = 0.5; beam.maxLife = 0.5;
    beam.color = '#f59e0b'; // Brass/Fire
    beam.size = 12;
    beam.type = 'DEATH_RAY';
    system.state.particles.push(beam);
}

// 🏹 RANGER: HELLFIRE BOMB (rr_u2)
// "Nuke" -> Warp Explosion.
export function spawnCovenantNuke(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Flash
    spawnExplosion(system, x, y, 10, 30, '#ef4444', 3.0, 1.0, 'SPARK');
    
    // 2. Rising Mushroom (Smoke)
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 0;
        p.vx = (Math.random()-0.5)*50; 
        p.vy = (Math.random()-0.5)*50;
        p.vz = 200 + i * 20; 
        p.life = 2.5; p.maxLife = 2.5;
        p.color = '#18181b'; // Black smoke
        p.size = 50 + i * 5;
        p.type = 'SMOKE';
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: INFERNAL ROCK (mr_u1)
// "Meteor" -> Falling Debris.
export function spawnCovenantMeteor(system: VFXSystem, x: number, y: number, color: string) {
    // Just the impact, renderer handles projectile
    setTimeout(() => {
        spawnExplosion(system, x, y, 0, 30, '#f97316', 3.0, 1.0, 'DEBRIS'); 
        spawnShockwave(system, x, y, '#ea580c', 1.0);
    }, 800);
}

// 🔮 MAGE: GORE BEAM (mr_u2)
// "Death Finger" -> Red Lightning.
export function spawnCovenantDeathFinger(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    spawnDeathRay(system, sx, sy, tx, ty, '#dc2626');
}

// ⚕️ SUPPORT: BRASS CHAINS (sr_u1)
// "Soul Link" -> Chains binding enemies.
export function spawnCovenantSoulLink(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Central Hub
    addImpact(system, x, y, 20, '#b45309', 'BLAST', 1.0); // Brass impact

    // 2. Chains (Visualized as thin beams)
    const count = 8;
    const radius = 300;
    for(let i=0; i<count; i++) {
        const a = (i/count) * Math.PI*2;
        const tx = x + Math.cos(a)*radius;
        const ty = y + Math.sin(a)*radius;
        
        const chain = system.state.getParticle();
        chain.x = x; chain.y = y; chain.z = 20;
        chain.targetX = tx; chain.targetY = ty;
        chain.life = 2.0; chain.maxLife = 2.0;
        chain.color = '#78350f'; // Rusty Iron
        chain.size = 3;
        chain.type = 'BEAM';
        system.state.particles.push(chain);
    }
}

// ⚕️ SUPPORT: ICON OF WRATH (sr_u2)
// "Ancestors" -> Burning Icon.
export function spawnCovenantAncestors(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Burning Circle
    const zone = system.state.getParticle();
    zone.x = x; zone.y = y; zone.z = 0;
    zone.life = 3.0; zone.maxLife = 3.0;
    zone.color = '#ef4444'; 
    zone.size = 200;
    zone.type = 'DOMAIN'; 
    system.state.particles.push(zone);

    // 2. Embers
    for(let i=0; i<20; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*150;
        p.y = y + (Math.random()-0.5)*150;
        p.z = 10;
        p.vx = 0; p.vy = 0; p.vz = 100;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = '#fbbf24';
        p.size = 4;
        p.type = 'SPARK';
        system.state.particles.push(p);
    }
}
