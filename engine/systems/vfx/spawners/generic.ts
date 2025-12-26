
import { VFXSystem } from "../vfx";
import { Team, Role } from "../../../../types";
import { SpriteManager } from "../../../sprites";
import { THEME_IMPERIAL, THEME_COVENANT } from "../../../../constants";

// =========================================================================================
// 🛠️ GENERIC / SHARED UTILS (2.5D Volumetric Building Blocks)
// =========================================================================================

// 1. STANDARD EXPLOSION (Physical Debris + Flash)
export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE' | 'SHARD' | 'DEBRIS' | 'GLOW') {
    // Determine count based on type
    const safeCount = Math.min((type === 'SPARK' || type === 'GLOW') ? 15 : 8, count);
    
    // Spawn Cluster
    for (let i = 0; i < safeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI; 
        const spd = Math.random() * 200 * speed;
        
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        
        // Velocity Distribution
        const cosPhi = Math.cos(phi);
        p.vx = Math.cos(theta) * cosPhi * spd;
        p.vy = Math.sin(theta) * cosPhi * spd;
        p.vz = Math.sin(phi) * spd + (100 * speed); 
        
        p.life = life * (0.6 + Math.random() * 0.4); p.maxLife = life;
        p.color = color;
        
        if (type === 'SPARK') {
            p.size = Math.random() * 3 + 2;
        } else if (type === 'SHARD') {
            p.size = 6 + Math.random() * 6;
        } else if (type === 'GLOW') {
            p.size = Math.random() * 20 + 10;
        } else {
            p.size = Math.random() * 15 + 10; 
        }
        
        p.type = type; 
        p.delay = 0;
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random() - 0.5) * 10;
        
        system.state.particles.push(p);
    }

    // Add extra "Oomph" for Explosions
    if (type === 'SPARK' && count > 5) {
        // Flash Core
        const flash = system.state.getParticle();
        flash.x = x; flash.y = y; flash.z = z;
        flash.life = 0.2; flash.maxLife = 0.2;
        flash.color = '#fff'; flash.size = 50;
        flash.type = 'BLAST'; // Spiky burst
        system.state.particles.push(flash);
        
        // Smoke Puff
        const smoke = system.state.getParticle();
        smoke.x = x; smoke.y = y; smoke.z = z;
        smoke.vx = 0; smoke.vy = 0; smoke.vz = 50;
        smoke.life = 1.0; smoke.maxLife = 1.0;
        smoke.color = color; smoke.size = 40;
        smoke.type = 'SMOKE';
        system.state.particles.push(smoke);
    }
}

// 2. GROUND IMPACT RINGS (Shockwaves)
export function spawnShockwave(system: VFXSystem, x: number, y: number, color: string, life: number) {
    // Inner Flash
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 5;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; 
    p.size = 150; // Max expansion size
    p.type = 'SHOCKWAVE';
    p.delay = 0;
    system.state.particles.push(p);
}

// 3. VOLUMETRIC BEAM (Cylinder)
export function spawnBeam(system: VFXSystem, sx: number, sy: number, sz: number, tx: number, ty: number, tz: number, color: string, duration: number = 0.4, size: number = 4) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = sz;
    p.targetX = tx; p.targetY = ty; 
    
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = duration; p.maxLife = duration; 
    p.color = color; p.size = size; 
    p.type = 'BEAM'; 
    p.delay = 0;
    system.state.particles.push(p);
}

// 4. RISING SPIKES
export function spawnRisingSpikes(system: VFXSystem, x: number, y: number, count: number, radius: number, color: string, type: 'SHARD' | 'DEBRIS') {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        
        const p = system.state.getParticle();
        p.x = x + Math.cos(angle) * dist;
        p.y = y + Math.sin(angle) * dist;
        p.z = -50; 
        
        p.vx = 0; p.vy = 0;
        p.vz = 300 + Math.random() * 200; 
        
        p.life = 2.0; p.maxLife = 2.0;
        p.color = color;
        p.size = 10 + Math.random() * 15;
        p.type = type;
        p.rotation = 0; 
        p.delay = dist * 0.005; 
        system.state.particles.push(p);
    }
}

// 5. DIRECTIONAL IMPACT
export function spawnDirectionalImpact(system: VFXSystem, x: number, y: number, z: number, dirX: number, dirY: number, color: string, type: 'PHYSICAL' | 'MAGICAL') {
    const isPhysical = type === 'PHYSICAL';
    const baseAngle = Math.atan2(dirY, dirX);
    const count = 8;
    const spread = 0.6; 

    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = 300 + Math.random() * 300; 
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 50 + Math.random() * 150; 
        
        p.life = 0.4; p.maxLife = p.life;
        p.color = isPhysical ? '#cbd5e1' : color; 
        p.size = 3 + Math.random() * 4; 
        p.type = 'SPARK'; 
        p.delay = 0;
        system.state.particles.push(p);
    }
    
    // Backsplash ring (Blast)
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = z;
    p.life = 0.3; p.maxLife = 0.3;
    p.color = color; p.size = 40; p.type = 'BLAST';
    system.state.particles.push(p);
}

// 6. UNIT DEATH
export function spawnUnitShatter(system: VFXSystem, x: number, y: number, team: Team, role: Role, impulseX: number = 0, impulseY: number = 0) {
    const assets = SpriteManager.getUnitImages(role, team);
    const isBlue = team === Team.BLUE;
    
    // 1. Base
    const base = system.state.getParticle();
    base.x = x; base.y = y; base.z = 10;
    base.vx = impulseX * 0.8; base.vy = impulseY * 0.8;
    base.vz = 150 + Math.random() * 100;
    base.life = 2.0; base.maxLife = 2.0;
    base.color = '#fff'; base.size = 50; 
    base.type = 'SPRITE'; base.image = assets.base;
    base.vRotation = (Math.random() - 0.5) * 10;
    system.state.particles.push(base);

    // 2. Icon
    const icon = system.state.getParticle();
    icon.x = x; icon.y = y; icon.z = 40; 
    icon.vx = impulseX * 1.2; icon.vy = impulseY * 1.2;
    icon.vz = 300 + Math.random() * 200;
    icon.life = 2.0; icon.maxLife = 2.0;
    icon.color = '#fff'; icon.size = 64; 
    icon.type = 'SPRITE'; icon.image = assets.icon;
    icon.vRotation = (Math.random() - 0.5) * 20; 
    system.state.particles.push(icon);

    // 3. Debris
    spawnExplosion(system, x, y, 30, 12, isBlue ? '#94a3b8' : '#52525b', 1.5, 2.0, 'DEBRIS');
    
    // 4. Soul Flash
    const flash = system.state.getParticle();
    flash.x = x; flash.y = y; flash.z = 40;
    flash.life = 0.3; flash.maxLife = 0.3;
    flash.color = '#fff'; flash.size = 80;
    flash.type = 'BLAST';
    system.state.particles.push(flash);
}

// 7. TELEPORT
export function spawnTeleport(system: VFXSystem, x: number, y: number, color: string) {
    const beam = system.state.getParticle();
    beam.x = x; beam.y = y; beam.z = 0;
    beam.life = 0.5; beam.maxLife = 0.5;
    beam.color = color; beam.size = 40; beam.type = 'PILLAR';
    system.state.particles.push(beam);
    
    spawnShockwave(system, x, y, color, 0.5);
}

// 8. LINGERING FOG
export function spawnLingeringField(system: VFXSystem, x: number, y: number, color: string, type: string, duration: number, delay: number) {
    // Create a cluster of smoke particles that spawn over time
    const count = 5;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        const r = 20;
        p.x = x + (Math.random()-0.5)*r;
        p.y = y + (Math.random()-0.5)*r;
        p.z = 5;
        
        p.vx = (Math.random()-0.5) * 10;
        p.vy = (Math.random()-0.5) * 10;
        p.vz = 10 + Math.random() * 10; 
        
        p.life = duration + Math.random(); p.maxLife = p.life;
        p.color = color;
        p.size = 30 + Math.random() * 20; 
        p.type = 'SMOKE';
        p.delay = delay + (i * 0.1); // Stagger spawn
        system.state.particles.push(p);
    }
}

// 9. CAST INTERRUPT
export function spawnCastBreak(system: VFXSystem, x: number, y: number, radiusTiles: number, color: string) {
    const blast = system.state.getParticle();
    blast.x = x; blast.y = y; blast.z = 40;
    blast.life = 0.25; blast.maxLife = 0.25;
    blast.color = '#00ffff'; blast.size = 80;
    blast.type = 'BLAST';
    system.state.particles.push(blast);

    for(let i=0; i<6; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 40;
        p.vx = (Math.random()-0.5) * 150; p.vy = (Math.random()-0.5) * 150;
        p.life = 0.4; p.maxLife = 0.4;
        p.color = '#ff00ff'; p.size = 5; p.type = 'CHIP'; 
        system.state.particles.push(p);
    }
}

// 10. GRID IMPACT
export function spawnGridImpact(system: VFXSystem, x: number, y: number, color: string, team: Team, delay: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.life = 1.0; p.maxLife = 1.0;
    p.color = color;
    p.size = 36; 
    p.type = 'GRID_FIELD'; 
    p.delay = delay;
    system.state.particles.push(p);
}

// 11. CONNECTOR SLASH
export function spawnConnectorSlash(system: VFXSystem, x1: number, y1: number, x2: number, y2: number, color: string, visual: string) {
    const p = system.state.getParticle();
    p.x = x1; p.y = y1 - 30; p.z = 30;
    p.targetX = x2; p.targetY = y2 - 30;
    p.life = 0.2; p.maxLife = 0.2;
    p.color = color; p.size = 12;
    p.type = 'BEAM'; 
    system.state.particles.push(p);
}

// 12. HELPER: Add generic impact
export function addImpact(system: VFXSystem, x: number, y: number, z: number, color: string, type: 'RING' | 'BLAST' | 'SHOCKWAVE', life: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = z;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 50;
    p.type = type;
    system.state.particles.push(p);
}

// 13. DEATH RAY
export function spawnDeathRay(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 40;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.5; p.maxLife = 0.5;
    p.color = color;
    p.size = 10;
    p.type = 'DEATH_RAY';
    system.state.particles.push(p);
}

// 14. BLOOD RITUAL
export function spawnBloodRitual(system: VFXSystem, x: number, y: number, color: string, scale: number) {
    addImpact(system, x, y, 0, color, 'BLAST', 0.5);
    
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*30 * scale;
        p.y = y + (Math.random()-0.5)*30 * scale;
        p.z = 5;
        p.vx = (Math.random()-0.5)*20;
        p.vy = (Math.random()-0.5)*20;
        p.vz = 50 + Math.random() * 100;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = color;
        p.size = 20 + Math.random() * 10;
        p.type = 'SMOKE';
        system.state.particles.push(p);
    }
}
