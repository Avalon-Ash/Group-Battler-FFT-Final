
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnLingeringField } from "./generic";
import { ISO_SCALE_Y } from "../../../../constants";

interface Point3D { x: number; y: number; z: number; }

// --- TANK ---

// 🛡️ TANK: FORTRESS OF HERA (tb_u1)
export function spawnImperialSanctuary(system: VFXSystem, pt: Point3D, color: string) {
    const radius = 160;
    const beacon = system.state.getParticle();
    beacon.x = pt.x; beacon.y = pt.y; beacon.z = pt.z;
    beacon.life = 3.0; beacon.maxLife = 3.0;
    beacon.color = '#fbbf24'; 
    beacon.size = 40; beacon.type = 'PILLAR'; 
    beacon.locked = true; beacon.sortBias = 20; 
    system.state.particles.push(beacon);

    for(let i=0; i<6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = pt.x + Math.cos(angle) * radius;
        const py = pt.y + Math.sin(angle) * radius;
        const start = { x: px, y: py, z: pt.z + 10 };
        const end = { x: pt.x, y: pt.y, z: pt.z + 40 };
        spawnBeam(system, start, end, '#3b82f6', 3.0, 2);
    }
}

// 🛡️ TANK: THE EMPEROR'S LIGHT (tb_u2)
export function spawnImperialKingsBlessing(system: VFXSystem, pt: Point3D, color: string) {
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 2.0; beam.maxLife = 2.0;
    beam.color = '#fcd34d';
    beam.size = 80; beam.type = 'PILLAR';
    beam.locked = true; beam.sortBias = 20;
    system.state.particles.push(beam);
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#fff', 5.0, 2.0, 'GLOW');
}

// 🛡️ TANK: AEGIS FALL (tb_u3)
export function spawnImperialAegis(system: VFXSystem, pt: Point3D, color: string) {
    // Giant Shield Graphic falling
    const shield = system.state.getParticle();
    shield.x = pt.x; shield.y = pt.y; shield.z = pt.z + 500;
    shield.vx = 0; shield.vy = 0; shield.vz = -2000;
    shield.life = 0.3; shield.maxLife = 0.3;
    shield.color = '#60a5fa'; shield.size = 150;
    shield.type = 'GIANT_HEX';
    system.state.particles.push(shield);

    setTimeout(() => {
        spawnShockwave(system, pt.x, pt.y, pt.z, '#3b82f6', 1.5);
        addImpact(system, pt.x, pt.y, pt.z, '#93c5fd', 'BLAST', 0.8);
    }, 250);
}

// 🛡️ TANK: TITAN SMASH (tb_u4)
export function spawnImperialTitan(system: VFXSystem, pt: Point3D, color: string) {
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#fcd34d', 4.0, 1.0, 'DEBRIS');
    addImpact(system, pt.x, pt.y, pt.z, '#fbbf24', 'SHOCKWAVE', 1.2);
    // Cracks
    const crack = system.state.getParticle();
    crack.x = pt.x; crack.y = pt.y; crack.z = pt.z;
    crack.life = 2.0; crack.maxLife = 2.0;
    crack.color = '#b45309'; crack.size = 120;
    crack.type = 'GRID_FIELD'; crack.locked = true;
    system.state.particles.push(crack);
}

// 🛡️ TANK: FINAL DEFENSE (tb_u5)
export function spawnImperialDefense(system: VFXSystem, pt: Point3D, color: string) {
    const dome = system.state.getParticle();
    dome.x = pt.x; dome.y = pt.y; dome.z = pt.z;
    dome.life = 5.0; dome.maxLife = 5.0;
    dome.color = '#60a5fa'; dome.size = 220;
    dome.type = 'DOMAIN'; dome.locked = true;
    system.state.particles.push(dome);
}

// --- WARRIOR ---

// ⚔️ WARRIOR: ORBITAL STRIKE (wb_u1)
export function spawnImperialThunder(system: VFXSystem, pt: Point3D, color: string) {
    const lock = system.state.getParticle();
    lock.x = pt.x; lock.y = pt.y; lock.z = pt.z + 5;
    lock.life = 0.5; lock.maxLife = 0.5;
    lock.color = '#22d3ee'; 
    lock.size = 60; lock.type = 'HEX_LOCK';
    lock.rotation = Math.random() * Math.PI; lock.locked = true;
    system.state.particles.push(lock);

    setTimeout(() => {
        const stackHeight = 12;
        for(let i=0; i<stackHeight; i++) {
            const p = system.state.getParticle();
            p.x = pt.x; p.y = pt.y; p.z = pt.z + i * 80; 
            p.life = 0.3 + (i * 0.02); p.maxLife = p.life;
            p.color = '#60a5fa'; p.size = 40; p.type = 'HEX_BEAM';
            p.locked = true; p.sortBias = 20;
            system.state.particles.push(p);
        }
        spawnExplosion(system, pt.x, pt.y, pt.z + 10, 20, '#fff', 3.0, 0.5, 'SPARK');
    }, 200);

    setTimeout(() => {
        spawnShockwave(system, pt.x, pt.y, pt.z, '#93c5fd', 0.6);
        addImpact(system, pt.x, pt.y, pt.z, '#3b82f6', 'BLAST', 0.5);
    }, 250);
}

// ⚔️ WARRIOR: EXTERMINATUS (wb_u2)
export function spawnImperialDaybreak(system: VFXSystem, pt: Point3D, color: string) {
    spawnExplosion(system, pt.x, pt.y, pt.z + 10, 30, '#f59e0b', 4.0, 1.0, 'SPARK');
    addImpact(system, pt.x, pt.y, pt.z + 20, '#fbbf24', 'BLAST', 1.0);
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 1.0; beam.maxLife = 1.0;
    beam.color = '#fffbeb'; beam.size = 150; beam.type = 'PILLAR';
    beam.locked = true; beam.sortBias = 20;
    system.state.particles.push(beam);
}

// ⚔️ WARRIOR: EXCALIBUR (wb_u3)
export function spawnImperialExcalibur(system: VFXSystem, pt: Point3D, color: string) {
    // Giant vertical sword slash effect
    const sword = system.state.getParticle();
    sword.x = pt.x; sword.y = pt.y; sword.z = pt.z + 200;
    sword.life = 0.5; sword.maxLife = 0.5;
    sword.color = '#fef08a'; sword.size = 200;
    sword.type = 'GIANT_HEX'; // Reusing as blade
    sword.vx = 0; sword.vy = 0; sword.vz = -100;
    system.state.particles.push(sword);
    
    setTimeout(() => {
        spawnShockwave(system, pt.x, pt.y, pt.z, '#eab308', 1.0);
        addImpact(system, pt.x, pt.y, pt.z, '#facc15', 'BLAST', 0.5);
    }, 200);
}

// ⚔️ WARRIOR: BLADESTORM (wb_u4)
export function spawnImperialBladestorm(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 80;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z + 20;
        p.vx = -Math.sin(a) * 400; // Orbit velocity
        p.vy = Math.cos(a) * 400;
        p.vz = 50;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = '#60a5fa'; p.size = 20;
        p.type = 'SHARD'; p.rotation = a;
        system.state.particles.push(p);
    }
}

// ⚔️ WARRIOR: LIGHTSPEED (wb_u5)
export function spawnImperialLightspeed(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z, '#e0f2fe', 'BLAST', 0.5);
    spawnExplosion(system, pt.x, pt.y, pt.z, 10, '#bfdbfe', 5.0, 0.5, 'SPARK');
}

// --- RANGER ---

// 🏹 RANGER: CRYSTAL ARROW (rb_u1)
export function spawnImperialCrystalArrow(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z + 20, '#60a5fa', 'SHOCKWAVE', 0.8);
    for(let i=0; i<25; i++) {
        const p = system.state.getParticle();
        p.x = pt.x; p.y = pt.y; p.z = pt.z + 30;
        const a = Math.random() * Math.PI * 2;
        const s = 300 + Math.random() * 500; 
        p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.vz = 150 + Math.random() * 400;
        p.life = 1.2 + Math.random() * 0.6; p.maxLife = p.life;
        p.color = Math.random() > 0.5 ? '#bae6fd' : '#fff';
        p.size = 12 + Math.random() * 18; p.type = 'SHARD'; 
        p.vRotation = (Math.random()-0.5) * 40;
        system.state.particles.push(p);
    }
    for(let i=0; i<12; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 60;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r; p.z = pt.z + 10;
        p.vx = (Math.random()-0.5)*30; p.vy = (Math.random()-0.5)*30; p.vz = 40;
        p.life = 2.5; p.maxLife = 2.5;
        p.color = '#e0f2fe'; p.size = 50 + Math.random() * 30;
        p.type = 'SMOKE'; p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

// 🏹 RANGER: STARFALL (rb_u2)
export function spawnImperialStarfall(system: VFXSystem, pt: Point3D, color: string) {
    const count = 6;
    const radius = 180;
    for(let i=0; i<count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = pt.x + Math.cos(angle) * radius;
        const py = pt.y + Math.sin(angle) * radius;
        const pod = system.state.getParticle();
        pod.x = px; pod.y = py; pod.z = pt.z + 1000;
        pod.vx = 0; pod.vy = 0; pod.vz = -2500; 
        pod.life = 0.4; pod.maxLife = 0.4;
        pod.color = '#fcd34d'; pod.size = 25;
        pod.type = 'DEBRIS'; pod.delay = i * 0.1;
        system.state.particles.push(pod);
        setTimeout(() => {
            spawnExplosion(system, px, py, pt.z, 12, '#94a3b8', 1.5, 0.6, 'DEBRIS');
            addImpact(system, px, py, pt.z, '#fff', 'BLAST', 0.4);
        }, 400 + (i * 100));
    }
}

// 🏹 RANGER: ORBITAL BOMBARDMENT (rb_u3)
export function spawnImperialOrbit(system: VFXSystem, pt: Point3D, color: string) {
    // Ion Cannon Beam
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 1.5; beam.maxLife = 1.5;
    beam.color = '#22d3ee'; beam.size = 80; beam.type = 'PILLAR';
    beam.locked = true; 
    system.state.particles.push(beam);
    spawnShockwave(system, pt.x, pt.y, pt.z, '#06b6d4', 1.5);
}

// 🏹 RANGER: ABSOLUTE LOCKDOWN (rb_u4)
export function spawnImperialLockdown(system: VFXSystem, pt: Point3D, color: string) {
    const grid = system.state.getParticle();
    grid.x = pt.x; grid.y = pt.y; grid.z = pt.z;
    grid.life = 3.0; grid.maxLife = 3.0;
    grid.color = '#8b5cf6'; grid.size = 200;
    grid.type = 'GRID_FIELD'; grid.locked = true;
    system.state.particles.push(grid);
}

// 🏹 RANGER: OVERLOAD (rb_u5)
export function spawnImperialOverload(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*30; 
        p.y = pt.y + (Math.random()-0.5)*30; 
        p.z = pt.z + 30;
        p.vx = (Math.random()-0.5)*300; 
        p.vy = (Math.random()-0.5)*300; 
        p.vz = 200;
        p.life = 0.5; p.maxLife = 0.5;
        p.color = '#fff'; p.size = 4; p.type = 'SPARK';
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}

// --- MAGE ---

// 🔮 MAGE: VORTEX GRENADE (mb_u1)
export function spawnImperialBlackHole(system: VFXSystem, pt: Point3D, color: string) {
    const coreLife = 6.0;
    const core = system.state.getParticle();
    core.x = pt.x; core.y = pt.y; core.z = pt.z + 50;
    core.life = coreLife; core.maxLife = coreLife;
    core.color = '#000000'; core.size = 120;
    core.type = 'GIANT_HEX'; core.locked = true;
    core.sortBias = 100; core.vRotation = 5;  
    system.state.particles.push(core);

    const horizon = system.state.getParticle();
    horizon.x = pt.x; horizon.y = pt.y; horizon.z = pt.z + 49; 
    horizon.life = coreLife; horizon.maxLife = coreLife;
    horizon.color = '#8800FF'; horizon.size = 160;
    horizon.type = 'HEX_GLOW'; horizon.locked = true;
    horizon.sortBias = 90; horizon.vRotation = -30; 
    system.state.particles.push(horizon);

    for(let i=0; i<40; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const radius = 250 + Math.random() * 150;
        p.x = pt.x + Math.cos(angle) * radius;
        p.y = pt.y + Math.sin(angle) * radius * ISO_SCALE_Y; 
        p.z = pt.z + 50; 
        const speed = 20 + Math.random() * 40;
        p.vx = -Math.cos(angle) * speed; p.vy = -Math.sin(angle) * speed * ISO_SCALE_Y;
        p.life = 2.0 + Math.random(); p.maxLife = p.life;
        const palette = ['#fff', '#60a5fa', '#a855f7'];
        p.color = palette[Math.floor(Math.random() * palette.length)];
        p.size = 10 + Math.random() * 10; p.type = 'DEBRIS'; p.drag = -0.05; 
        p.targetX = pt.x; p.targetY = pt.y; p.killAtTarget = 50 * 50; 
        p.delay = Math.random() * 2.0; 
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: CRYOGENIC STASIS (mb_u2)
export function spawnImperialFrostfall(system: VFXSystem, pt: Point3D, color: string) {
    const grid = system.state.getParticle();
    grid.x = pt.x; grid.y = pt.y; grid.z = pt.z;
    grid.life = 4.0; grid.maxLife = 4.0;
    grid.color = '#bfdbfe'; grid.size = 250;
    grid.type = 'GRID_FIELD'; grid.locked = true;
    system.state.particles.push(grid);
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#e0f2fe', 'SMOKE', 4.0, 0);
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        const a = Math.random() * Math.PI * 2;
        const r = 40 + Math.random() * 160;
        p.x = pt.x + Math.cos(a)*r; p.y = pt.y + Math.sin(a)*r;
        p.z = pt.z - 30; 
        p.vx = 0; p.vy = 0; p.vz = 350 + Math.random() * 100;
        p.life = 0.5 + Math.random() * 0.3; p.maxLife = p.life; 
        p.color = '#bae6fd'; p.size = 15 + Math.random() * 15;
        p.type = 'SHARD'; p.delay = Math.random() * 0.8; 
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: TIME STOP (mb_u3)
export function spawnImperialTimeStop(system: VFXSystem, pt: Point3D, color: string) {
    const dome = system.state.getParticle();
    dome.x = pt.x; dome.y = pt.y; dome.z = pt.z;
    dome.life = 4.0; dome.maxLife = 4.0;
    dome.color = '#fef08a'; dome.size = 400; // Giant
    dome.type = 'DOMAIN'; dome.locked = true;
    system.state.particles.push(dome);
    spawnShockwave(system, pt.x, pt.y, pt.z, '#fde047', 2.0);
}

// 🔮 MAGE: ARCANE TORRENT (mb_u4)
export function spawnImperialArcane(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<20; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*100; 
        p.y = pt.y + (Math.random()-0.5)*100; 
        p.z = pt.z + 10;
        p.vx = 0; p.vy = 0; p.vz = 150;
        p.life = 1.0; p.maxLife = 1.0;
        p.color = '#a855f7'; p.size = 5; p.type = 'SPARK';
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
    spawnShockwave(system, pt.x, pt.y, pt.z, '#a855f7', 1.0);
}

// 🔮 MAGE: FOCUS BEAM (mb_u5)
export function spawnImperialFocus(system: VFXSystem, pt: Point3D, color: string) {
    addImpact(system, pt.x, pt.y, pt.z, '#60a5fa', 'BLAST', 0.5);
}

// --- SUPPORT ---

// ⚕️ SUPPORT: IRON HALO (sb_u1)
export function spawnImperialIntervention(system: VFXSystem, pt: Point3D, color: string) {
    const dome = system.state.getParticle();
    dome.x = pt.x; dome.y = pt.y; dome.z = pt.z;
    dome.life = 4.0; dome.maxLife = 4.0;
    dome.color = '#fef3c7'; dome.size = 200;
    dome.type = 'DOMAIN'; dome.locked = true;
    system.state.particles.push(dome);
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 4.0; beam.maxLife = 4.0;
    beam.color = '#fff'; beam.size = 40; beam.type = 'PILLAR';
    beam.locked = true; beam.sortBias = 20;
    system.state.particles.push(beam);
}

// ⚕️ SUPPORT: APOTHECARY BEACON (sb_u2)
export function spawnImperialResurrection(system: VFXSystem, pt: Point3D, color: string) {
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 2.5; beam.maxLife = 2.5;
    beam.color = '#86efac'; beam.size = 60; beam.type = 'PILLAR'; 
    beam.locked = true; beam.sortBias = 20;
    system.state.particles.push(beam);
    const count = 20;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        const angle = (i / count) * Math.PI * 2;
        const radius = 60;
        p.x = pt.x + Math.cos(angle) * radius; p.y = pt.y + Math.sin(angle) * radius; p.z = pt.z;
        p.vx = -Math.sin(angle) * 100; p.vy = Math.cos(angle) * 100; p.vz = 200 + Math.random() * 50; 
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#ffffff'; p.size = 5 + Math.random() * 4; p.type = 'GLOW';
        p.drag = 0; p.delay = i * 0.1; 
        system.state.particles.push(p);
    }
    addImpact(system, pt.x, pt.y, pt.z, '#4ade80', 'SHOCKWAVE', 1.5);
}

// ⚕️ SUPPORT: HYMN (sb_u3)
export function spawnImperialHymn(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*150;
        p.y = pt.y + (Math.random()-0.5)*150;
        p.z = pt.z;
        p.vx = 0; p.vy = 0; p.vz = 80;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#3b82f6'; p.size = 8; p.type = 'CHIP'; 
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }
}

// ⚕️ SUPPORT: WRATH (sb_u4)
export function spawnImperialWrath(system: VFXSystem, pt: Point3D, color: string) {
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#fcd34d', 3.0, 1.0, 'SPARK');
    spawnShockwave(system, pt.x, pt.y, pt.z, '#fbbf24', 1.0);
}

// ⚕️ SUPPORT: RAIN (sb_u5)
export function spawnImperialRain(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<40; i++) {
        const p = system.state.getParticle();
        p.x = pt.x + (Math.random()-0.5)*300;
        p.y = pt.y + (Math.random()-0.5)*300;
        p.z = pt.z + 300;
        p.vx = 0; p.vy = 0; p.vz = -400;
        p.life = 0.8; p.maxLife = 0.8;
        p.color = '#86efac'; p.size = 3; p.type = 'BEAM'; // Rain streaks
        p.delay = i * 0.05;
        system.state.particles.push(p);
    }
}
