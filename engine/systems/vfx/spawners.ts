
import { VFXSystem } from "../vfx";
import { Team, Role } from "../../../types";
import { SpriteManager } from "../../sprites";
import { VFXFactory } from "../../graphics/VFXFactory"; 

// =========================================================================================
// 🏭 PARTICLE SPAWNERS (Factory Functions)
// =========================================================================================

// --- 1. FACTION ULTIMATES ---

export function spawnDivinePillar(system: VFXSystem, x: number, y: number, color: string, life: number, delay: number = 0) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 100; 
    p.type = 'PILLAR'; 
    p.delay = delay;
    system.state.particles.push(p);
}

export function spawnBloodRitual(system: VFXSystem, x: number, y: number, color: string, life: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 120; 
    p.type = 'DOMAIN'; 
    p.delay = 0;
    system.state.particles.push(p);

    // Add rising debris
    for(let i=0; i<8; i++) {
        const d = system.state.getParticle();
        d.x = x + (Math.random()-0.5)*50; 
        d.y = y + (Math.random()-0.5)*30; 
        d.z = 0;
        d.vx = (Math.random()-0.5)*50;
        d.vy = (Math.random()-0.5)*50;
        d.vz = 100 + Math.random() * 200; 
        d.life = life * 0.8; d.maxLife = life * 0.8;
        d.color = '#000'; 
        d.size = 5 + Math.random() * 8;
        d.type = 'DEBRIS';
        d.rotation = Math.random();
        d.vRotation = Math.random();
        system.state.particles.push(d);
    }
}

// --- 2. IMPACTS & EXPLOSIONS ---

export function spawnGridImpact(system: VFXSystem, x: number, y: number, color: string, team: Team, delay: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.life = 1.2; p.maxLife = 1.2;
    p.color = color;
    p.size = 36; 
    p.type = 'GRID_FIELD'; 
    p.delay = delay;
    system.state.particles.push(p);

    if (Math.random() > 0.5) {
        const s = system.state.getParticle();
        s.x = x; s.y = y; s.z = 10;
        s.vx = 0; s.vy = 0; s.vz = 150; 
        s.life = 0.4; s.maxLife = 0.4;
        s.color = color; s.size = 20;
        s.type = 'SPARK';
        s.delay = delay;
        system.state.particles.push(s);
    }
}

export function spawnLingeringField(system: VFXSystem, x: number, y: number, color: string, type: string, duration: number, delay: number) {
    const count = 3;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*20;
        p.y = y + (Math.random()-0.5)*15;
        p.z = 5;
        p.vx = (Math.random()-0.5) * 20;
        p.vy = (Math.random()-0.5) * 20;
        p.vz = 10 + Math.random() * 20; 
        p.life = duration + Math.random(); p.maxLife = p.life;
        p.color = color;
        p.size = 25 + Math.random() * 25; // Larger puffs
        p.type = 'SMOKE';
        p.delay = delay + Math.random() * 0.5;
        system.state.particles.push(p);
    }
}

export function spawnCastBreak(system: VFXSystem, x: number, y: number, radiusTiles: number, color: string) {
    // Blast
    const blast = system.state.getParticle();
    blast.x = x; blast.y = y; blast.z = 20;
    blast.vx = 0; blast.vy = 0; blast.vz = 0;
    blast.life = 0.2; blast.maxLife = 0.2;
    blast.color = '#00ffff'; 
    blast.size = 100;
    blast.type = 'BLAST';
    system.state.particles.push(blast);

    // High Velocity Shards (Energy, not stone)
    const shardCount = 12;
    for(let i=0; i<shardCount; i++) {
        const p = system.state.getParticle();
        const angle = (Math.PI * 2 * i) / shardCount;
        const speed = 400 + Math.random() * 400; 
        p.x = x; p.y = y; p.z = 30;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 200 + Math.random() * 300; 
        p.life = 0.5 + Math.random() * 0.3; p.maxLife = p.life;
        p.color = Math.random() > 0.5 ? color : '#e2e8f0'; 
        p.size = 5 + Math.random() * 5;
        p.type = 'SHARD';
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random() - 0.5) * 30; 
        system.state.particles.push(p);
    }

    // Chips
    const glitchCount = 8;
    for(let i=0; i<glitchCount; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*40;
        p.y = y + (Math.random()-0.5)*40;
        p.z = 40;
        p.vx = (Math.random()-0.5) * 50; 
        p.vy = (Math.random()-0.5) * 50;
        p.vz = 0;
        p.life = 0.3; p.maxLife = 0.3;
        p.color = Math.random() > 0.5 ? '#00ffff' : '#ff00ff';
        p.size = 4 + Math.random() * 4;
        p.type = 'CHIP'; 
        system.state.particles.push(p);
    }
}

export function spawnDirectionalImpact(system: VFXSystem, x: number, y: number, z: number, dirX: number, dirY: number, color: string, type: 'PHYSICAL' | 'MAGICAL') {
    const isPhysical = type === 'PHYSICAL';
    const baseAngle = Math.atan2(dirY, dirX);
    const count = 10;
    const spread = 0.8; 

    // Directional Cone Sparks (High speed light streaks)
    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = 400 + Math.random() * 400; // Faster sparks
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 50 + Math.random() * 200; 
        
        p.life = 0.3 + Math.random() * 0.3; p.maxLife = p.life;
        p.color = isPhysical ? '#e2e8f0' : color; 
        p.size = 4 + Math.random() * 6; // Larger kinetic sparks
        p.type = 'SPARK'; 
        p.delay = 0;
        system.state.particles.push(p);
    }
    
    if (isPhysical) {
        spawnExplosion(system, x, y, z, 3, '#fff', 0.2, 0.4, 'SMOKE');
    } else {
        // Magical impact ring
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.life = 0.4; p.maxLife = 0.4;
        p.color = color;
        p.size = 20; 
        p.type = 'RING';
        system.state.particles.push(p);
    }
}

export function spawnConnectorSlash(system: VFXSystem, x1: number, y1: number, x2: number, y2: number, color: string, visual: string) {
    const p = system.state.getParticle();
    p.x = x1; p.y = y1 - 30; 
    p.targetX = x2; p.targetY = y2 - 30;
    p.z = 30;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = 0.25; p.maxLife = 0.25;
    p.color = color; p.size = 10;
    p.type = 'BEAM'; 
    p.delay = 0;
    system.state.particles.push(p);
}

export function spawnUnitShatter(system: VFXSystem, x: number, y: number, team: Team, role: Role) {
    const assets = SpriteManager.getUnitImages(role, team);
    const spawnSprite = (img: HTMLCanvasElement, scale: number, zBase: number, vZ: number) => {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = zBase; 
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 150; 
        p.vx = Math.cos(angle) * dist; p.vy = Math.sin(angle) * dist; p.vz = vZ;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#fff'; p.size = 64 * scale; 
        p.type = 'SPRITE'; p.image = img;
        p.rotation = Math.random() * Math.PI * 2; p.vRotation = (Math.random() - 0.5) * 20; 
        system.state.particles.push(p);
    };

    const baseColor = '#52525b';
    for (let i = 0; i < 6; i++) {
        const p = system.state.getParticle();
        const angle = (i / 6) * Math.PI * 2 + (Math.random()-0.5)*0.5;
        p.x = x; p.y = y; p.z = 5;
        const speed = 100 + Math.random() * 100;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed; p.vz = 50 + Math.random() * 100; 
        p.life = 3.0; p.maxLife = 3.0;
        p.color = baseColor; p.size = 10 + Math.random() * 10;
        p.type = 'SHARD'; p.rotation = angle; p.vRotation = (Math.random()-0.5)*10;
        system.state.particles.push(p);
    }

    spawnSprite(assets.icon, 0.6, 70, 300);   

    addDecal(system, x, y, '#000'); 
    spawnExplosion(system, x, y, 10, 8, '#71717a', 0.5, 1.0, 'SMOKE');
}

export function spawnBeam(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.4; p.maxLife = 0.4; p.color = color; p.size = 4; p.type = 'BEAM'; p.delay = 0;
    system.state.particles.push(p);
}

export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE') {
    const safeCount = Math.min(type === 'SPARK' ? 12 : 6, count);
    for (let i = 0; i < safeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Higher velocity spread for kinetic feel
        const spd = Math.random() * 200 * speed;
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * spd; p.vy = Math.sin(angle) * spd;
        p.vz = (Math.random() * 200 + 100) * speed; 
        p.life = life * (0.6 + Math.random() * 0.4); p.maxLife = life;
        p.color = color;
        // Size varies more
        p.size = type === 'SPARK' ? Math.random() * 4 + 3 : Math.random() * 20 + 20;
        p.type = type; p.delay = 0;
        system.state.particles.push(p);
    }
}

export function spawnTeleport(system: VFXSystem, x: number, y: number, color: string) {
    spawnDivinePillar(system, x, y, color, 0.8, 0);
    addImpact(system, x, y, 5, color, 'RING', 0.8);
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

export function addImpact(system: VFXSystem, x: number, y: number, z: number, color: string, type: 'RING', life: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = z;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 30; // Default size
    p.type = type;
    p.delay = 0;
    system.state.particles.push(p);
}

export function addDecal(system: VFXSystem, x: number, y: number, color: string) {
    system.state.decals.push({
        x, y, color, life: 5.0, scale: 0.5 + Math.random() * 0.3
    });
}
