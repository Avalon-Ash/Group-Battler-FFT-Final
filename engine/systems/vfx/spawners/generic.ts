
import { VFXSystem } from "../vfx";
import { Team, Role } from "../../../../types";
import { SpriteManager } from "../../../sprites";
import { ISO_SCALE_Y, THEME_IMPERIAL, THEME_COVENANT } from "../../../../constants";

interface Point3D { x: number; y: number; z: number; }

// 1. STANDARD EXPLOSION
export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE' | 'SHARD' | 'DEBRIS' | 'GLOW') {
    const safeCount = Math.min((type === 'SPARK' || type === 'GLOW') ? 15 : 8, count);
    
    for (let i = 0; i < safeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI; 
        const spd = Math.random() * 200 * speed;
        
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        
        const cosPhi = Math.cos(phi);
        p.vx = Math.cos(theta) * cosPhi * spd;
        p.vy = Math.sin(theta) * cosPhi * spd;
        p.vz = Math.sin(phi) * spd + (100 * speed); 
        
        p.life = life * (0.6 + Math.random() * 0.4); p.maxLife = life;
        p.color = color;
        p.size = (type === 'GLOW' ? 25 : 8) * (Math.random() + 0.5);
        p.type = type; 
        p.delay = 0;
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random() - 0.5) * 15;
        
        system.state.particles.push(p);
    }
}

// 2. COMPOSITE IMPACT SPAWNER
export function addImpact(system: VFXSystem, x: number, y: number, z: number, color: string, type: 'BLAST' | 'SHOCKWAVE', life: number) {
    if (type === 'SHOCKWAVE') {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        p.life = life; p.maxLife = life;
        p.color = color; p.size = 50;
        p.type = 'SHOCKWAVE';
        system.state.particles.push(p);
        return;
    }

    // --- HEX BLAST ---
    const flash = system.state.getParticle();
    flash.x = x; flash.y = y; flash.z = z + 10;
    flash.life = 0.2; flash.maxLife = 0.2;
    flash.color = '#ffffdd'; 
    flash.size = 60; 
    flash.type = 'BLAST'; 
    flash.rotation = Math.random() * Math.PI;
    flash.vRotation = 10; 
    system.state.particles.push(flash);

    const halo = system.state.getParticle();
    halo.x = x; halo.y = y; halo.z = z + 10;
    halo.life = 0.3; halo.maxLife = 0.3;
    halo.color = color;
    halo.size = 100;
    halo.type = 'GLOW'; 
    halo.rotation = Math.random() * Math.PI;
    system.state.particles.push(halo);

    const sparkCount = 6 + Math.floor(Math.random() * 3); 
    for(let i=0; i<sparkCount; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z + 10;
        const angle = Math.random() * Math.PI * 2;
        const speed = 400 + Math.random() * 300; 
        const lift = 100 + Math.random() * 200;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = lift;
        p.life = 0.3 + Math.random() * 0.2; p.maxLife = p.life;
        p.color = color; p.size = 4 + Math.random() * 2; 
        p.type = 'SPARK'; 
        system.state.particles.push(p);
    }
}

export function spawnShockwave(system: VFXSystem, x: number, y: number, z: number, color: string, life: number) {
    addImpact(system, x, y, z + 5, color, 'SHOCKWAVE', life);
}

// 🎯 REFACTORED BEAM: Uses explicit start/end 3D anchors like Projectiles
export function spawnBeam(system: VFXSystem, start: Point3D, end: Point3D, color: string, duration: number = 0.4, size: number = 4) {
    const p = system.state.getParticle();
    // Populate the new Projectile-mirroring fields
    p.sx = start.x; p.sy = start.y; p.sz = start.z;
    p.tx = end.x;   p.ty = end.y;   p.tz = end.z;
    
    // Sort Key: Use Start Y
    p.x = start.x; p.y = start.y; p.z = start.z;
    
    p.life = duration; p.maxLife = duration; 
    p.color = color; p.size = size; 
    p.type = 'BEAM'; 
    p.locked = true;
    system.state.particles.push(p);
}

export function spawnDeathRay(system: VFXSystem, start: Point3D, end: Point3D, color: string) {
    const p = system.state.getParticle();
    p.sx = start.x; p.sy = start.y; p.sz = start.z;
    p.tx = end.x;   p.ty = end.y;   p.tz = end.z;
    
    p.x = start.x; p.y = start.y; p.z = start.z;
    
    p.life = 0.5; p.maxLife = 0.5;
    p.color = color;
    p.size = 10;
    p.type = 'DEATH_RAY';
    p.locked = true;
    system.state.particles.push(p);
}

export function spawnConnectorSlash(system: VFXSystem, start: Point3D, end: Point3D, color: string) {
    const p = system.state.getParticle();
    p.sx = start.x; p.sy = start.y; p.sz = start.z;
    p.tx = end.x;   p.ty = end.y;   p.tz = end.z;
    
    p.x = start.x; p.y = start.y; p.z = start.z;
    
    p.life = 0.2; p.maxLife = 0.2;
    p.color = color; p.size = 12;
    p.type = 'BEAM'; // Reusing beam logic for slash connector
    p.locked = true;
    system.state.particles.push(p);
}

export function spawnPhysicsSplatter(system: VFXSystem, x: number, y: number, z: number, dirX: number, dirY: number, color: string) {
    const impactAngle = Math.atan2(dirY, dirX);
    const mainCount = 6;
    for (let i = 0; i < mainCount; i++) {
        const spread = (Math.random() - 0.5) * 1.2; 
        const angle = impactAngle + spread;
        const speed = 300 + Math.random() * 300; 
        
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 150 + Math.random() * 250; 
        
        p.life = 0.4 + Math.random() * 0.3; p.maxLife = p.life;
        p.type = 'CHIP'; 
        p.color = color; 
        p.size = 2 + Math.random() * 3; 
        p.vRotation = (Math.random() - 0.5) * 50; 
        system.state.particles.push(p);
    }
    
    const dust = system.state.getParticle();
    dust.x = x; dust.y = y; dust.z = z;
    dust.life = 0.3; dust.maxLife = 0.3;
    dust.color = '#cbd5e1'; 
    dust.size = 15; 
    dust.type = 'SMOKE';
    system.state.particles.push(dust);
}

export function spawnUnitShatter(system: VFXSystem, x: number, y: number, z: number, team: Team, role: Role, impulseX: number = 0, impulseY: number = 0) {
    const assets = SpriteManager.getUnitImages(role, team);
    
    // 1. Core Components (Base & Icon)
    const base = system.state.getParticle();
    base.x = x; base.y = y; base.z = z + 10;
    base.vx = impulseX * 0.8; base.vy = impulseY * 0.8;
    base.vz = 150 + Math.random() * 100;
    base.life = 2.0; base.maxLife = 2.0;
    base.color = '#fff'; base.size = 50; 
    base.type = 'SPRITE'; base.image = assets.base;
    base.vRotation = (Math.random() - 0.5) * 10;
    system.state.particles.push(base);

    const icon = system.state.getParticle();
    icon.x = x; icon.y = y; icon.z = z + 40; 
    icon.vx = impulseX * 1.2; icon.vy = impulseY * 1.2;
    icon.vz = 300 + Math.random() * 200;
    icon.life = 2.0; icon.maxLife = 2.0;
    icon.color = '#fff'; icon.size = 64; 
    icon.type = 'SPRITE'; icon.image = assets.icon;
    icon.vRotation = (Math.random() - 0.5) * 20; 
    system.state.particles.push(icon);

    const theme = team === Team.BLUE ? THEME_IMPERIAL : THEME_COVENANT;
    const shardCount = 8;
    
    for(let i=0; i<shardCount; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*20; 
        p.y = y + (Math.random()-0.5)*20; 
        p.z = z + 30;
        
        const a = Math.random() * Math.PI * 2;
        const s = 150 + Math.random() * 250;
        p.vx = Math.cos(a)*s + impulseX*0.5;
        p.vy = Math.sin(a)*s + impulseY*0.5;
        p.vz = 250 + Math.random()*250; 
        
        p.life = 1.5; p.maxLife = 1.5;
        p.type = 'SHARD'; 
        p.color = Math.random() > 0.4 ? theme.primary : theme.armorDark;
        p.size = 6 + Math.random()*8; 
        p.vRotation = (Math.random()-0.5)*30; 
        system.state.particles.push(p);
    }

    for(let i=0; i<5; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z + 30;
        const a = Math.random() * Math.PI * 2;
        const s = 50 + Math.random() * 100;
        p.vx = Math.cos(a)*s;
        p.vy = Math.sin(a)*s;
        p.vz = 50 + Math.random()*50;
        p.life = 0.8; p.maxLife = 0.8;
        p.type = 'SPARK';
        p.color = theme.secondary; 
        p.size = 3 + Math.random()*3;
        system.state.particles.push(p);
    }
}

export function spawnTeleport(system: VFXSystem, x: number, y: number, z: number, color: string) {
    const beam = system.state.getParticle();
    beam.x = x; beam.y = y; beam.z = z;
    beam.life = 0.5; beam.maxLife = 0.5;
    beam.color = color; beam.size = 40; beam.type = 'PILLAR';
    beam.locked = true;
    system.state.particles.push(beam);
    spawnShockwave(system, x, y, z, color, 0.5);
}

export function spawnLingeringField(system: VFXSystem, x: number, y: number, z: number, color: string, type: string, duration: number, delay: number) {
    const count = 5;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        const r = 20;
        const a = Math.random() * Math.PI * 2;
        const dist = Math.random() * r;
        
        p.x = x + Math.cos(a) * dist;
        p.y = y + Math.sin(a) * dist * ISO_SCALE_Y;
        p.z = z + 5;
        
        p.vx = (Math.random()-0.5) * 10;
        p.vy = (Math.random()-0.5) * 10;
        p.vz = 10 + Math.random() * 10; 
        p.life = duration + Math.random(); p.maxLife = p.life;
        p.color = color;
        p.size = 40 + Math.random() * 20; 
        p.type = 'SMOKE';
        p.delay = delay + (i * 0.1); 
        p.vRotation = (Math.random() - 0.5) * 5;
        system.state.particles.push(p);
    }
}

export function spawnCastBreak(system: VFXSystem, x: number, y: number, z: number, radiusTiles: number, color: string) {
    addImpact(system, x, y, z + 40, color, 'BLAST', 0.2); 
    for(let i=0; i<8; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z + 30;
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 200;
        p.vx = Math.cos(angle) * speed; 
        p.vy = Math.sin(angle) * speed;
        p.vz = 200 + Math.random() * 150; 
        p.life = 0.6; p.maxLife = 0.6;
        p.color = color; p.size = 8 + Math.random() * 8; 
        p.type = 'SHARD'; 
        system.state.particles.push(p);
    }
}

export function spawnGridImpact(system: VFXSystem, x: number, y: number, z: number, color: string, team: Team, delay: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = z;
    p.life = 1.0; p.maxLife = 1.0;
    p.color = color;
    p.size = 36; 
    p.type = 'GRID_FIELD'; 
    p.delay = delay;
    p.locked = true;
    system.state.particles.push(p);
}

export function spawnBloodRitual(system: VFXSystem, x: number, y: number, z: number, color: string, scale: number) {
    addImpact(system, x, y, z, color, 'BLAST', 0.5);
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*30 * scale;
        p.y = y + (Math.random()-0.5)*30 * scale;
        p.z = z + 5;
        p.vx = (Math.random()-0.5)*20;
        p.vy = (Math.random()-0.5)*20;
        p.vz = 50 + Math.random() * 100;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = color;
        p.size = 20 + Math.random() * 10;
        p.type = 'SMOKE';
        p.vRotation = (Math.random()-0.5)*5;
        system.state.particles.push(p);
    }
}
