
import { VFXSystem } from "../vfx";
import { Team } from "../../../types";

// =========================================================================================
// 🏭 PARTICLE SPAWNERS (Factory Functions)
// =========================================================================================

export function spawnUnitShatter(system: VFXSystem, x: number, y: number, team: Team) {
    // Colors
    // Blue: Silver armor, Gold trim, Blue energy
    // Red: Iron armor, Bone trim, Red energy
    const armorColor = team === Team.BLUE ? '#e2e8f0' : '#27272a';
    const trimColor = team === Team.BLUE ? '#fbbf24' : '#a1a1aa';
    const coreColor = team === Team.BLUE ? '#3b82f6' : '#ef4444';

    // 1. Armor Shards (Heavy chunks) - FALLS AND BOUNCES
    for (let i = 0; i < 8; i++) { // Increased count slightly
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 200;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = 30 + Math.random() * 30; // Start at chest height
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 200 + Math.random() * 300; // Pop up high
        
        p.life = 3.0; p.maxLife = 3.0; // Lasts longer on ground
        p.color = Math.random() > 0.5 ? armorColor : trimColor;
        p.size = 7 + Math.random() * 6; // Bigger chunks
        p.type = 'SHARD'; // Uses Gravity & Bounce Physics
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random() - 0.5) * 20;
        p.delay = 0;
        system.state.particles.push(p);
    }

    // 2. Core Sparks (Energy leak)
    spawnExplosion(system, x, y, 30, 15, coreColor, 1.5, 0.8, 'SPARK');

    // 3. Shockwave
    addImpact(system, x, y, coreColor, 'RING', 0.5);
    
    // 4. Ground Scorch
    addDecal(system, x, y, '#000');
}

export function spawnDomainShatter(system: VFXSystem, x: number, y: number, radiusTiles: number, color: string) {
    // Convert hex radius to pixel radius (approx)
    const radiusPx = radiusTiles * 40; 
    
    // CHANGE: Use SPARKS instead of SHARDS.
    // Sparks in this system ignore gravity and rely on drag, 
    // creating a "suspension" or "dissipation" effect in mid-air.
    
    // Circumference Fizzle
    const count = Math.max(16, radiusTiles * 12);
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const p = system.state.getParticle();
        
        // Start exactly on the ring edge
        const px = x + Math.cos(angle) * radiusPx;
        const py = y + Math.sin(angle) * radiusPx * 0.55; 
        
        p.x = px;
        p.y = py;
        p.z = 5; 
        
        // Velocity: Burst OUT fast, then drag will stop it
        const speed = 80 + Math.random() * 120;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 20 + Math.random() * 50; // Slight drift up, no heavy jump
        
        p.life = 0.6; p.maxLife = 0.6; // Short life, vanishes quickly
        p.color = color; 
        p.size = 2 + Math.random() * 3; // Small bits
        p.type = 'SPARK'; // Uses Drag Physics (No Gravity)
        p.delay = 0;
        
        system.state.particles.push(p);
    }
    
    // Center "Poof" Cloud (White smoke indicating failure)
    const innerCount = 8;
    for(let i=0; i<innerCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radiusPx * 0.5;
        
        const p = system.state.getParticle();
        p.x = x + Math.cos(angle) * dist;
        p.y = y + Math.sin(angle) * dist * 0.55;
        p.z = 10;
        
        p.vx = (Math.random()-0.5) * 50;
        p.vy = (Math.random()-0.5) * 50;
        p.vz = 50 + Math.random() * 50; // Drifts up like steam
        
        p.life = 0.8; p.maxLife = 0.8;
        p.color = '#ffffff'; 
        p.size = 4 + Math.random() * 4;
        p.type = 'SMOKE';
        p.delay = 0;
        system.state.particles.push(p);
    }
    
    // Sharp White Flash Ring to emphasize the "Break"
    addImpact(system, x, y, '#ffffff', 'RING', 0.15);
}

export function spawnBeam(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.5; p.maxLife = 0.5;
    p.color = color; p.size = 5;
    p.type = 'BEAM';
    p.delay = 0;
    system.state.particles.push(p);
}

export function spawnDomainExpansion(system: VFXSystem, x: number, y: number, color: string, duration: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 10;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = duration; p.maxLife = duration;
    p.color = color; p.size = 0;
    p.type = 'DOMAIN';
    p.delay = 0;
    system.state.particles.push(p);
}

export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE') {
    const actualCount = type === 'SPARK' ? count * 1.5 : count;
    
    for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 150 * speed;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.vz = (Math.random() * 150 + 50) * speed; // Sparks fly up
        p.life = life * (0.5 + Math.random() * 0.5);
        p.maxLife = life;
        p.color = color;
        p.size = type === 'SPARK' ? Math.random() * 4 + 3 : Math.random() * 3 + 1;
        p.type = type;
        p.delay = 0;
        
        system.state.particles.push(p);
    }
}

export function spawnDebris(system: VFXSystem, x: number, y: number, color: string, count: number) {
    // Fallback for generic debris
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 50 + 20;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = 20;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = Math.random() * 100 + 100;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = color; p.size = Math.random() * 4 + 2;
        p.type = 'DEBRIS';
        p.delay = 0;
        
        system.state.particles.push(p);
    }
}

export function spawnTeleport(system: VFXSystem, x: number, y: number, color: string) {
    spawnPillar(system, x, y, color, 1.0, 0);
    addImpact(system, x, y, color, 'RING', 1.0);
}

export function spawnDivinePillar(system: VFXSystem, x: number, y: number, color: string, life: number, delay: number = 0) {
    spawnPillar(system, x, y, color, life, delay);
}

export function spawnPillar(system: VFXSystem, x: number, y: number, color: string, life: number, delay: number = 0) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 100;
    p.type = 'PILLAR';
    p.delay = delay;
    system.state.particles.push(p);
}

export function spawnShockwave(system: VFXSystem, x: number, y: number, color: string, life: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 10;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 0;
    p.type = 'SHOCKWAVE';
    p.delay = 0;
    system.state.particles.push(p);
}

export function addGridFlash(system: VFXSystem, q: number, r: number, color: string) {
    system.state.gridFlashes.push({ q, r, color, life: 1.0 });
}

export function addImpact(system: VFXSystem, x: number, y: number, color: string, type: 'RING', life: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 5;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 0;
    p.type = type;
    p.delay = 0;
    system.state.particles.push(p);
}

export function addDecal(system: VFXSystem, x: number, y: number, color: string) {
    system.state.decals.push({
        x, y, color, life: 10.0, scale: 0.5 + Math.random() * 0.5
    });
}
