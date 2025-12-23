
import { VFXSystem } from "../vfx";
import { Team } from "../../../types";

// =========================================================================================
// 🏭 PARTICLE SPAWNERS (Factory Functions)
// =========================================================================================

export function spawnDirectionalImpact(
    system: VFXSystem, 
    x: number, y: number, 
    dirX: number, dirY: number, 
    color: string, 
    type: 'PHYSICAL' | 'MAGICAL'
) {
    const isPhysical = type === 'PHYSICAL';
    
    // 1. Main Spark/Splatter Cone (Opposite to hit direction = Blowback)
    // Actually, visually it looks better if sparks fly *through* the target (same direction as hit)
    // OR fly out from point of impact (radial but biased).
    // Let's bias towards the hit direction.
    const baseAngle = Math.atan2(dirY, dirX);
    const cone = 1.0; // Spread radians

    const count = isPhysical ? 8 : 12;
    for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * cone;
        const speed = (isPhysical ? 150 : 200) + Math.random() * 100;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = 25; // Hit height
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 50 + Math.random() * 100; // Upward kick
        
        p.life = 0.4 + Math.random() * 0.3;
        p.maxLife = p.life;
        p.color = color;
        p.size = Math.random() * 4 + 2;
        p.type = isPhysical ? 'SPARK' : 'GLOW'; // Use GLOW for magic
        p.delay = 0;
        
        system.state.particles.push(p);
    }

    // 2. Ring Burst (Perpendicular to hit)
    addImpact(system, x, y - 25, color, 'RING', isPhysical ? 0.4 : 0.6);
}

export function spawnConnectorSlash(
    system: VFXSystem,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string,
    visual: string
) {
    // Spawns a beam-like particle but styled as a slash
    // We use the BEAM type but with specific handling in renderer to look sharp
    const p = system.state.getParticle();
    p.x = x1; p.y = y1 - 30; // Waist height
    p.targetX = x2; p.targetY = y2 - 30;
    p.z = 30;
    p.vx = 0; p.vy = 0; p.vz = 0;
    
    p.life = 0.25; // Very fast flash
    p.maxLife = 0.25;
    p.color = color;
    p.size = 10;
    p.type = 'BEAM'; // We reuse BEAM logic but style it in renderer based on Chaos check
    p.delay = 0;
    system.state.particles.push(p);
}

export function spawnUnitShatter(system: VFXSystem, x: number, y: number, team: Team) {
    // Colors
    const armorColor = team === Team.BLUE ? '#e2e8f0' : '#27272a';
    const trimColor = team === Team.BLUE ? '#fbbf24' : '#a1a1aa';
    const coreColor = team === Team.BLUE ? '#3b82f6' : '#ef4444';

    // 1. Armor Shards (Heavy chunks) - KEEP FOR DEATH
    for (let i = 0; i < 6; i++) { 
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 150;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = 30 + Math.random() * 30; 
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 200 + Math.random() * 200; 
        
        p.life = 2.0; p.maxLife = 2.0; 
        p.color = Math.random() > 0.5 ? armorColor : trimColor;
        p.size = 5 + Math.random() * 4; 
        p.type = 'SHARD'; 
        p.rotation = Math.random() * Math.PI;
        p.vRotation = (Math.random() - 0.5) * 20;
        p.delay = 0;
        system.state.particles.push(p);
    }

    // 2. Core Sparks
    spawnExplosion(system, x, y, 30, 15, coreColor, 1.2, 0.6, 'SPARK');

    // 3. Shockwave
    addImpact(system, x, y, coreColor, 'RING', 0.5);
    
    // 4. Ground Scorch
    addDecal(system, x, y, '#000');
}

export function spawnDomainShatter(system: VFXSystem, x: number, y: number, radiusTiles: number, color: string) {
    const radiusPx = radiusTiles * 40; 
    const count = Math.max(12, radiusTiles * 8); // Reduced count
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const p = system.state.getParticle();
        const px = x + Math.cos(angle) * radiusPx;
        const py = y + Math.sin(angle) * radiusPx * 0.55; 
        
        p.x = px; p.y = py; p.z = 5; 
        const speed = 50 + Math.random() * 80;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.vz = 20 + Math.random() * 30;
        
        p.life = 0.5; p.maxLife = 0.5; 
        p.color = color; 
        p.size = 2 + Math.random() * 2; 
        p.type = 'SPARK'; 
        p.delay = 0;
        
        system.state.particles.push(p);
    }
    
    // Center "Poof"
    spawnExplosion(system, x, y, 10, 5, '#ffffff', 0.5, 0.5, 'SMOKE');
    addImpact(system, x, y, '#ffffff', 'RING', 0.15);
}

export function spawnBeam(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.4; p.maxLife = 0.4; // Shorter life
    p.color = color; p.size = 4;
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
    const safeCount = Math.min(type === 'SPARK' ? 12 : 6, count);
    
    for (let i = 0; i < safeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 100 * speed;
        const p = system.state.getParticle();
        
        p.x = x; p.y = y; p.z = z;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.vz = (Math.random() * 100 + 50) * speed; 
        p.life = life * (0.6 + Math.random() * 0.4);
        p.maxLife = life;
        p.color = color;
        p.size = type === 'SPARK' ? Math.random() * 3 + 2 : Math.random() * 3 + 1;
        p.type = type;
        p.delay = 0;
        
        system.state.particles.push(p);
    }
}

export function spawnDebris(system: VFXSystem, x: number, y: number, color: string, count: number) {
    // Keeping disabled for normal hits to reduce noise, can be re-enabled for heavy hits specifically in SkillResolution
}

export function spawnTeleport(system: VFXSystem, x: number, y: number, color: string) {
    spawnPillar(system, x, y, color, 0.8, 0);
    addImpact(system, x, y, color, 'RING', 0.8);
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
    system.state.gridFlashes.push({ q, r, color, life: 0.5 }); // Reduced life
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
        x, y, color, life: 5.0, scale: 0.5 + Math.random() * 0.3
    });
}
