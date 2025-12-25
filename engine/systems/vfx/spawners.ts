
import { VFXSystem } from "../vfx";
import { Team, Role } from "../../../types";
import { SpriteManager } from "../../sprites";

// =========================================================================================
// 🏭 PARTICLE SPAWNERS (Factory Functions)
// =========================================================================================

// --- 1. FACTION ULTIMATES ---

export function spawnDivinePillar(system: VFXSystem, x: number, y: number, color: string, life: number, delay: number = 0) {
    // Blue/Imperial: Clean, Vertical, Geometric
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 100; // Radius
    p.type = 'PILLAR'; // Uses "Order" render style
    p.delay = delay;
    system.state.particles.push(p);
}

export function spawnBloodRitual(system: VFXSystem, x: number, y: number, color: string, life: number) {
    // Red/Covenant: Chaotic, Ground-breaking, Dark
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; p.size = 120; // Radius
    p.type = 'DOMAIN'; // Re-using Domain type but with chaos flag in renderer
    p.delay = 0;
    system.state.particles.push(p);

    // Add rising "Blood/Darkness" debris
    for(let i=0; i<8; i++) {
        const d = system.state.getParticle();
        d.x = x + (Math.random()-0.5)*50; 
        d.y = y + (Math.random()-0.5)*30; 
        d.z = 0;
        d.vx = (Math.random()-0.5)*50;
        d.vy = (Math.random()-0.5)*50;
        d.vz = 100 + Math.random() * 200; // Rising slow
        d.life = life * 0.8; d.maxLife = life * 0.8;
        d.color = '#000'; // Obsidian chunks
        d.size = 5 + Math.random() * 8;
        d.type = 'DEBRIS';
        d.rotation = Math.random();
        d.vRotation = Math.random();
        system.state.particles.push(d);
    }
}

// --- 2. GRID CONSISTENCY ---

export function spawnGridImpact(system: VFXSystem, x: number, y: number, color: string, team: Team, delay: number) {
    // Replaced shockwaves with "GRID_FIELD" which is a stationary volumetric effect
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    
    // Duration needs to be long enough to feel like a "Zone" logic execution
    // Standard impact duration + fade
    p.life = 1.2; p.maxLife = 1.2;
    p.color = color;
    p.size = 36; // Matches HEX_SIZE approx
    p.type = 'GRID_FIELD'; 
    p.delay = delay;
    system.state.particles.push(p);

    // Add a quick flash for immediate impact feel
    if (Math.random() > 0.5) {
        const s = system.state.getParticle();
        s.x = x; s.y = y; s.z = 10;
        s.vx = 0; s.vy = 0; s.vz = 150; // Fly up
        s.life = 0.4; s.maxLife = 0.4;
        s.color = color; s.size = 20;
        s.type = 'SPARK';
        s.delay = delay;
        system.state.particles.push(s);
    }
}

export function spawnLingeringField(system: VFXSystem, x: number, y: number, color: string, type: string, duration: number, delay: number) {
    // Spawns smoke/clouds that persist
    const count = 3;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        p.x = x + (Math.random()-0.5)*20;
        p.y = y + (Math.random()-0.5)*15;
        p.z = 5;
        
        // Drift slowly
        p.vx = (Math.random()-0.5) * 20;
        p.vy = (Math.random()-0.5) * 20;
        p.vz = 10 + Math.random() * 20; // Rise slowly
        
        p.life = duration + Math.random(); 
        p.maxLife = p.life;
        p.color = color;
        p.size = 20 + Math.random() * 20;
        p.type = 'SMOKE';
        p.delay = delay + Math.random() * 0.5;
        
        system.state.particles.push(p);
    }
}

// --- 3. EXISTING HELPERS (Preserved) ---

export function spawnDirectionalImpact(system: VFXSystem, x: number, y: number, z: number, dirX: number, dirY: number, color: string, type: 'PHYSICAL' | 'MAGICAL') {
    const isPhysical = type === 'PHYSICAL';
    const baseAngle = Math.atan2(dirY, dirX);
    const count = isPhysical ? 8 : 10;
    const spread = 0.8; 

    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = 250 + Math.random() * 250; 
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 50 + Math.random() * 200; 
        
        p.life = 0.6 + Math.random() * 0.4; 
        p.maxLife = p.life;
        p.color = isPhysical ? '#e2e8f0' : color; 
        p.size = 3 + Math.random() * 3; 
        p.type = 'CHIP'; 
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random()-0.5) * 20;
        p.delay = 0;
        
        system.state.particles.push(p);
    }
    spawnExplosion(system, x, y, z, 3, '#fff', 0.2, 0.4, 'SMOKE');
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

    // Spawn Icon (Head)
    spawnSprite(assets.icon, 0.6, 70, 300);   

    const coreColor = team === Team.BLUE ? '#3b82f6' : '#ef4444';
    for (let i = 0; i < 8; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 40;
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 150;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed; p.vz = 150 + Math.random() * 150;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = coreColor; p.size = 6 + Math.random() * 6;
        p.type = 'DEBRIS'; 
        p.rotation = Math.random() * Math.PI; p.vRotation = (Math.random()-0.5) * 15;
        system.state.particles.push(p);
    }
    addDecal(system, x, y, '#000'); 
    spawnExplosion(system, x, y, 10, 8, '#71717a', 0.5, 1.0, 'SMOKE');
}

export function spawnDomainShatter(system: VFXSystem, x: number, y: number, radiusTiles: number, color: string) {
    const radiusPx = radiusTiles * 40; 
    const count = Math.max(12, radiusTiles * 8); 
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const p = system.state.getParticle();
        const px = x + Math.cos(angle) * radiusPx;
        const py = y + Math.sin(angle) * radiusPx * 0.55; 
        p.x = px; p.y = py; p.z = 5; 
        const speed = 50 + Math.random() * 80;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed; p.vz = 20 + Math.random() * 30;
        p.life = 0.5; p.maxLife = 0.5; 
        p.color = color; p.size = 2 + Math.random() * 2; 
        p.type = 'SPARK'; p.delay = 0;
        system.state.particles.push(p);
    }
    spawnExplosion(system, x, y, 10, 5, '#ffffff', 0.5, 0.5, 'SMOKE');
}

export function spawnBeam(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.4; p.maxLife = 0.4; p.color = color; p.size = 4; p.type = 'BEAM'; p.delay = 0;
    system.state.particles.push(p);
}

export function spawnDomainExpansion(system: VFXSystem, x: number, y: number, color: string, duration: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 10;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = duration; p.maxLife = duration;
    p.color = color; p.size = 0;
    p.type = 'DOMAIN'; p.delay = 0;
    system.state.particles.push(p);
}

export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE') {
    const safeCount = Math.min(type === 'SPARK' ? 12 : 6, count);
    for (let i = 0; i < safeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 100 * speed;
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * spd; p.vy = Math.sin(angle) * spd;
        p.vz = (Math.random() * 100 + 50) * speed; 
        p.life = life * (0.6 + Math.random() * 0.4); p.maxLife = life;
        p.color = color;
        p.size = type === 'SPARK' ? Math.random() * 3 + 2 : Math.random() * 3 + 1;
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
    p.color = color; p.size = 0;
    p.type = type;
    p.delay = 0;
    system.state.particles.push(p);
}

export function addDecal(system: VFXSystem, x: number, y: number, color: string) {
    system.state.decals.push({
        x, y, color, life: 5.0, scale: 0.5 + Math.random() * 0.3
    });
}
