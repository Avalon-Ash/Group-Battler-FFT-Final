
import { VFXSystem } from "../vfx";
import { Team, Role } from "../../../types";
import { SpriteManager } from "../../sprites";
import { VFXFactory } from "../../graphics/VFXFactory"; 
import { THEME_IMPERIAL, THEME_COVENANT } from "../../../constants";

// =========================================================================================
// 🏭 PARTICLE SPAWNERS (Factory Functions)
// =========================================================================================

// --- 1. FACTION ULTIMATES ---

export function spawnDivinePillar(system: VFXSystem, x: number, y: number, color: string, life: number, delay: number = 0) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.color = color; 
    // Size reduced to 18 (approx half Hex width) to ensure gaps between adjacent pillars
    p.size = 18; 
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

export function spawnDeathRay(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0; 
    p.targetX = tx; p.targetY = ty;
    p.life = 0.3; p.maxLife = 0.3; // Very fast, sharp flash
    p.color = color; 
    p.size = 8; // Thin beam
    p.type = 'DEATH_RAY'; 
    p.delay = 0;
    system.state.particles.push(p);
}

// --- 2. SUPER ULTIMATES (Cinematic Levels) ---

// 🛰️ ORBITAL RAY (Legacy / Deprecated for now, replaced by Grid Ripple)
export function spawnOrbitalRay(system: VFXSystem, x: number, y: number, color: string) {
    // Just spawn a slightly larger pillar for fallback
    spawnDivinePillar(system, x, y, color, 1.5, 0);
}

// ✝️ GRAND CROSS (Divine Field)
export function spawnGrandCross(system: VFXSystem, x: number, y: number, color: string) {
    // Center Blast
    spawnDivinePillar(system, x, y, color, 1.5, 0);
    
    // 4 Directional Waves (Creating the Cross shape)
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    dirs.forEach((d, i) => {
        // Create a line of explosions radiating out
        for(let step=1; step<=3; step++) {
            const dist = step * 40;
            const px = x + d[0] * dist;
            const py = y + d[1] * dist;
            
            const p = system.state.getParticle();
            p.x = px; p.y = py; p.z = 0;
            p.life = 0.5; p.maxLife = 0.5;
            p.color = color;
            p.size = 60;
            p.type = 'BLAST';
            p.delay = step * 0.05; // Ripple out
            system.state.particles.push(p);
            
            // Vertical Light Spike at each point
            const spike = system.state.getParticle();
            spike.x = px; spike.y = py; spike.z = 0;
            spike.life = 0.8; spike.maxLife = 0.8;
            spike.color = '#fff'; spike.size = 30;
            spike.type = 'PILLAR';
            spike.delay = step * 0.05;
            system.state.particles.push(spike);
        }
    });

    addImpact(system, x, y, 0, color, 'SHOCKWAVE', 0.8);
}

// ☢️ TACTICAL NUKE (Mushroom Cloud)
export function spawnTacticalNuke(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Initial Blinding Flash
    const flash = system.state.getParticle();
    flash.x = x; flash.y = y; flash.z = 50;
    flash.life = 0.2; flash.maxLife = 0.2;
    flash.color = '#fff'; flash.size = 800; // Screen filler
    flash.type = 'GLOW'; // Reuse GLOW for simple flash
    system.state.particles.push(flash);

    // 2. The Stem (Rising Pillar of Fire/Smoke)
    const stemLayers = 8;
    for(let i=0; i<stemLayers; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 10;
        p.vx = (Math.random()-0.5) * 20;
        p.vy = (Math.random()-0.5) * 20;
        p.vz = 100 + i * 80; // Fast rising
        p.life = 1.5 + Math.random(); p.maxLife = p.life;
        p.color = i < 3 ? '#fbbf24' : '#4b5563'; // Fire bottom, Smoke top
        p.size = 40 + i * 5;
        p.type = 'SMOKE';
        p.delay = 0.1;
        system.state.particles.push(p);
    }

    // 3. The Cap (Expanding Mushroom Top)
    const capCount = 12;
    for(let i=0; i<capCount; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 30;
        p.x = x + Math.cos(angle)*dist; 
        p.y = y + Math.sin(angle)*dist; 
        p.z = 250; // Start high
        p.vx = Math.cos(angle) * 80; // Expand outward
        p.vy = Math.sin(angle) * 80;
        p.vz = 20 + Math.random() * 40; // Slowly rise
        p.life = 2.0; p.maxLife = 2.0;
        p.color = Math.random() > 0.5 ? '#ef4444' : '#1f2937'; // Red/Dark Grey
        p.size = 60 + Math.random() * 40;
        p.type = 'SMOKE';
        p.rotation = Math.random() * Math.PI;
        p.delay = 0.3; // Wait for stem
        system.state.particles.push(p);
    }

    // 4. Ground Shockwave Rings
    for(let i=0; i<3; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 5;
        p.life = 0.8 + i * 0.2; p.maxLife = p.life;
        p.color = color;
        p.size = 150 + i * 50; 
        p.type = 'SHOCKWAVE';
        p.delay = i * 0.1;
        system.state.particles.push(p);
    }

    // 5. Debris flying everywhere
    spawnExplosion(system, x, y, 10, 20, '#000', 3.0, 1.5, 'DEBRIS');
}

// ☄️ METEOR IMPACT
export function spawnMeteorImpact(system: VFXSystem, x: number, y: number, color: string) {
    // 1. The Falling Rock (Fast Beam down)
    const meteor = system.state.getParticle();
    meteor.x = x - 200; meteor.y = y - 400; meteor.z = 0; // Visual start
    meteor.targetX = x; meteor.targetY = y;
    meteor.life = 0.2; meteor.maxLife = 0.2;
    meteor.color = '#ea580c'; meteor.size = 40;
    meteor.type = 'BEAM'; 
    system.state.particles.push(meteor);

    // 2. Massive Impact (Delayed)
    const delay = 0.2;
    
    // Core Blast
    const blast = system.state.getParticle();
    blast.x = x; blast.y = y; blast.z = 20;
    blast.life = 0.8; blast.maxLife = 0.8;
    blast.color = '#f97316'; blast.size = 120;
    blast.type = 'BLAST';
    blast.delay = delay;
    system.state.particles.push(blast);

    // Ejected Magma
    for(let i=0; i<15; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const spd = 100 + Math.random() * 300;
        p.x = x; p.y = y; p.z = 10;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.vz = 200 + Math.random() * 400;
        p.life = 1.0; p.maxLife = 1.0;
        p.color = Math.random() > 0.5 ? '#fca5a5' : '#7f1d1d';
        p.size = 6 + Math.random() * 8;
        p.type = 'SHARD';
        p.delay = delay;
        system.state.particles.push(p);
    }
}

// 🕳️ BLACK HOLE COLLAPSE
export function spawnBlackHoleCollapse(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Event Horizon (Dark Sphere)
    const hole = system.state.getParticle();
    hole.x = x; hole.y = y; hole.z = 50;
    hole.vx = 0; hole.vy = 0; hole.vz = 0;
    hole.life = 1.5; hole.maxLife = 1.5;
    hole.color = '#000000'; hole.size = 100;
    hole.type = 'GLOW'; // Re-purposed as dark matter orb
    system.state.particles.push(hole);

    // 2. Accretion Disk (Swirling Particles INWARD)
    const count = 30;
    for(let i=0; i<count; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 100;
        p.x = x + Math.cos(angle) * dist;
        p.y = y + Math.sin(angle) * dist;
        p.z = 50;
        p.targetX = x; p.targetY = y; // Custom logic needed or simulate via velocity
        // Calculate velocity towards center
        const dx = x - p.x; const dy = y - p.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const speed = 400;
        p.vx = (dx/len) * speed;
        p.vy = (dy/len) * speed;
        p.vz = 0;
        p.life = len / speed; p.maxLife = p.life;
        p.color = Math.random() > 0.5 ? '#60a5fa' : '#c084fc';
        p.size = 4 + Math.random() * 4;
        p.type = 'SPARK'; // Streaks
        system.state.particles.push(p);
    }

    // 3. Final Pop (Delayed)
    const shock = system.state.getParticle();
    shock.x = x; shock.y = y; shock.z = 50;
    shock.life = 0.5; shock.maxLife = 0.5;
    shock.color = '#fff'; shock.size = 200;
    shock.type = 'RING';
    shock.delay = 1.2; // When collapse finishes
    system.state.particles.push(shock);
}

// --- 3. IMPACTS & EXPLOSIONS ---

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

// 💥 IMPROVED UNIT SHATTER 💥
export function spawnUnitShatter(system: VFXSystem, x: number, y: number, team: Team, role: Role) {
    const assets = SpriteManager.getUnitImages(role, team);
    const isBlue = team === Team.BLUE;
    
    const theme = isBlue ? THEME_IMPERIAL : THEME_COVENANT;
    const baseColor = isBlue ? '#94a3b8' : '#27272a'; // Base debris (Pedestal)
    const armorColor = theme.primary; // Armor chunks
    const glowColor = isBlue ? THEME_IMPERIAL.energy : theme.secondary; // Soul energy

    // 1. Icon Sprite (Spinning out)
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 60; 
    const angle = Math.random() * Math.PI * 2;
    p.vx = Math.cos(angle) * 150; 
    p.vy = Math.sin(angle) * 150; 
    p.vz = 350; // Pop up high
    p.life = 1.5; p.maxLife = 1.5;
    p.color = '#fff'; p.size = 64 * 0.6; 
    p.type = 'SPRITE'; p.image = assets.icon;
    p.rotation = Math.random() * Math.PI * 2; 
    p.vRotation = (Math.random() - 0.5) * 40; // Fast spin
    system.state.particles.push(p);

    // 2. Base Debris (Heavy, Darker)
    for (let i = 0; i < 5; i++) {
        const p = system.state.getParticle();
        const angle = (i / 5) * Math.PI * 2;
        p.x = x; p.y = y; p.z = 10;
        // Explode outward
        const speed = 150 + Math.random() * 100;
        p.vx = Math.cos(angle) * speed; 
        p.vy = Math.sin(angle) * speed; 
        p.vz = 150 + Math.random() * 150; 
        p.life = 2.0; p.maxLife = 2.0;
        p.color = baseColor; 
        p.size = 8 + Math.random() * 8; // Chunky
        p.type = 'DEBRIS'; 
        p.rotation = angle; 
        p.vRotation = (Math.random()-0.5)*15;
        system.state.particles.push(p);
    }

    // 3. Armor Shards (Light, Neon/Colored)
    for (let i = 0; i < 8; i++) {
        const p = system.state.getParticle();
        const angle = Math.random() * Math.PI * 2;
        p.x = x; p.y = y; p.z = 40; // Higher center
        // Fly further
        const speed = 200 + Math.random() * 200;
        p.vx = Math.cos(angle) * speed; 
        p.vy = Math.sin(angle) * speed; 
        p.vz = 250 + Math.random() * 250; 
        p.life = 1.5; p.maxLife = 1.5;
        p.color = Math.random() > 0.5 ? armorColor : theme.secondary; 
        p.size = 5 + Math.random() * 5; // Smaller, sharper
        p.type = 'SHARD'; 
        p.rotation = angle; 
        p.vRotation = (Math.random()-0.5)*25;
        system.state.particles.push(p);
    }

    // 4. Soul Release (Vertical Beam/Glow)
    const soul = system.state.getParticle();
    soul.x = x; soul.y = y; soul.z = 10;
    soul.vx = 0; soul.vy = 0; soul.vz = 20; // Slowly rise
    soul.life = 0.8; soul.maxLife = 0.8;
    soul.color = glowColor;
    soul.size = 120;
    soul.type = 'PILLAR'; // Use miniature pillar effect
    system.state.particles.push(soul);

    // 5. Ground Scorch
    addDecal(system, x, y, '#000'); 
    spawnShockwave(system, x, y, glowColor, 0.4);
    spawnExplosion(system, x, y, 40, 15, baseColor, 0.8, 0.8, 'SMOKE');
}

export function spawnBeam(system: VFXSystem, sx: number, sy: number, tx: number, ty: number, color: string) {
    const p = system.state.getParticle();
    p.x = sx; p.y = sy; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0;
    p.targetX = tx; p.targetY = ty;
    p.life = 0.4; p.maxLife = 0.4; p.color = color; p.size = 4; p.type = 'BEAM'; p.delay = 0;
    system.state.particles.push(p);
}

export function spawnExplosion(system: VFXSystem, x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE' | 'SHARD' | 'DEBRIS') {
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
        if (type === 'SHARD' || type === 'DEBRIS') p.size = 5 + Math.random() * 5;
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

export function addImpact(system: VFXSystem, x: number, y: number, z: number, color: string, type: 'RING' | 'BLAST' | 'SHOCKWAVE', life: number) {
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
