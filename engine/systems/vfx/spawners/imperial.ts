
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnRisingSpikes, spawnLingeringField } from "./generic";

// =========================================================================================
// 🔵 IMPERIAL (BLUE) - ULTRAMARINES THEME
// Keywords: Order, Tactical, Orbital Bombardment, Bolter Fire, Golden Light
// =========================================================================================

// 🛡️ TANK: FORTRESS OF HERA (tb_u1)
// "Sanctuary" -> Defensive Pylons. No giant walls.
export function spawnImperialSanctuary(system: VFXSystem, x: number, y: number, color: string) {
    const radius = 160;
    
    // 1. Central Aquila Beacon
    const beacon = system.state.getParticle();
    beacon.x = x; beacon.y = y; beacon.z = 0;
    beacon.life = 3.0; beacon.maxLife = 3.0;
    beacon.color = '#fbbf24'; // Gold
    beacon.size = 20; // Small width
    beacon.type = 'PILLAR'; 
    system.state.particles.push(beacon);

    // 2. Perimeter Shield Drones (Small points of light)
    for(let i=0; i<6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        const p = system.state.getParticle();
        p.x = px; p.y = py; p.z = 10;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#60a5fa'; // Blue
        p.size = 4; 
        p.type = 'GLOW'; // Just a glow dot
        system.state.particles.push(p);
        
        // Connect to center (Laser fence)
        const fence = system.state.getParticle();
        fence.x = px; fence.y = py; fence.z = 10;
        fence.targetX = x; fence.targetY = y; // Star shape pattern
        fence.life = 3.0; fence.maxLife = 3.0;
        fence.color = '#3b82f6';
        fence.size = 1; // Very thin
        fence.type = 'BEAM';
        system.state.particles.push(fence);
    }
}

// 🛡️ TANK: THE EMPEROR'S LIGHT (tb_u2)
// "Kings Blessing" -> Holy Halo.
export function spawnImperialKingsBlessing(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Ascending Golden Halo
    const halo = system.state.getParticle();
    halo.x = x; halo.y = y; halo.z = 0;
    halo.vx = 0; halo.vy = 0; halo.vz = 50; // Slowly rising
    halo.life = 2.0; halo.maxLife = 2.0;
    halo.color = '#fcd34d'; // Gold
    halo.size = 60;
    halo.type = 'RING';
    system.state.particles.push(halo);

    // 2. Shaft of Light (Transparent)
    const beam = system.state.getParticle();
    beam.x = x; beam.y = y; beam.z = 0;
    beam.life = 1.0; beam.maxLife = 1.0;
    beam.color = '#fff';
    beam.size = 30;
    beam.type = 'PILLAR';
    system.state.particles.push(beam);
}

// ⚔️ WARRIOR: ORBITAL STRIKE (wb_u1)
// "Thunder" -> Lance Strike from Orbit.
export function spawnImperialThunder(system: VFXSystem, x: number, y: number, color: string) {
    // 1. The Lance (Fast Beam)
    const beam = system.state.getParticle();
    beam.x = x; beam.y = y; beam.z = 0;
    beam.life = 0.2; beam.maxLife = 0.2;
    beam.color = '#60a5fa'; // Plasma Blue
    beam.size = 40; 
    beam.type = 'PILLAR';
    system.state.particles.push(beam);
    
    // 2. Ground Debris
    spawnExplosion(system, x, y, 0, 10, '#1e3a8a', 2.0, 0.5, 'DEBRIS'); // Blue chunks
    
    // 3. Shockwave
    spawnShockwave(system, x, y, '#93c5fd', 0.5);
}

// ⚔️ WARRIOR: EXTERMINATUS (wb_u2)
// "Daybreak" -> Massive Explosion.
export function spawnImperialDaybreak(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Central Flash
    spawnExplosion(system, x, y, 10, 20, '#f59e0b', 3.0, 0.8, 'SPARK');
    
    // 2. Expanding Ring
    const ring = system.state.getParticle();
    ring.x = x; ring.y = y; ring.z = 10;
    ring.life = 0.8; ring.maxLife = 0.8;
    ring.color = '#fbbf24';
    ring.size = 250;
    ring.type = 'RING';
    system.state.particles.push(ring);
    
    // 3. Smoke Puffs
    for(let i=0; i<8; i++) {
        const p = system.state.getParticle();
        const a = (i/8) * Math.PI * 2;
        p.x = x; p.y = y; p.z = 20;
        p.vx = Math.cos(a) * 200; p.vy = Math.sin(a) * 200; p.vz = 50;
        p.life = 1.5; p.maxLife = 1.5;
        p.color = '#fffbeb'; // White smoke
        p.size = 40;
        p.type = 'SMOKE';
        system.state.particles.push(p);
    }
}

// 🏹 RANGER: BOLTER VOLLEY (rb_u1)
// "Crystal Arrow" -> Concentrated Bolter Fire.
export function spawnImperialCrystalArrow(system: VFXSystem, x: number, y: number, color: string) {
    // Multiple small explosions in a line/cluster
    for(let i=0; i<5; i++) {
        setTimeout(() => {
            const ox = (Math.random()-0.5) * 40;
            const oy = (Math.random()-0.5) * 40;
            spawnExplosion(system, x+ox, y+oy, 20, 5, '#facc15', 1.0, 0.3, 'SPARK');
            spawnExplosion(system, x+ox, y+oy, 20, 3, '#1e293b', 0.5, 0.5, 'SMOKE');
        }, i * 100);
    }
}

// 🏹 RANGER: DROP POD ASSAULT (rb_u2)
// "Starfall" -> Drop Pods landing.
export function spawnImperialStarfall(system: VFXSystem, x: number, y: number, color: string) {
    const count = 5;
    const radius = 150;
    
    for(let i=0; i<count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        // Falling Pod trail
        const pod = system.state.getParticle();
        pod.x = px; pod.y = py; pod.z = 800;
        pod.vx = 0; pod.vy = 0; pod.vz = -2000; // Fast fall
        pod.life = 0.4; pod.maxLife = 0.4;
        pod.color = '#1e3a8a';
        pod.size = 20;
        pod.type = 'DEBRIS'; // Represent pod as big debris
        pod.delay = i * 0.1;
        system.state.particles.push(pod);
        
        // Impact
        setTimeout(() => {
            spawnExplosion(system, px, py, 0, 8, '#94a3b8', 1.0, 0.5, 'DEBRIS');
            addImpact(system, px, py, 0, '#fff', 'BLAST', 0.3);
        }, 400 + (i * 100));
    }
}

// 🔮 MAGE: VORTEX GRENADE (mb_u1)
// "Black Hole" -> Vortex Grenade (Warp implosion).
export function spawnImperialBlackHole(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Implosion Sphere (Small, Dark)
    const hole = system.state.getParticle();
    hole.x = x; hole.y = y; hole.z = 40;
    hole.life = 3.0; hole.maxLife = 3.0;
    hole.color = '#000'; 
    hole.size = 60;
    hole.type = 'GLOW'; // Black orb
    system.state.particles.push(hole);

    // 2. Reality Tears (Lightning)
    for(let i=0; i<10; i++) {
        const p = system.state.getParticle();
        p.x = x; p.y = y; p.z = 40;
        p.targetX = x + (Math.random()-0.5)*200;
        p.targetY = y + (Math.random()-0.5)*200;
        p.life = 0.2; p.maxLife = 0.2;
        p.color = '#3b82f6'; // Arcane Blue
        p.size = 2;
        p.type = 'BEAM';
        p.delay = Math.random() * 3.0;
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: CRYOGENIC STASIS (mb_u2)
// "Absolute Zero" -> Tech-Freeze.
export function spawnImperialFrostfall(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Grid Freeze (Floor)
    const grid = system.state.getParticle();
    grid.x = x; grid.y = y; grid.z = 0;
    grid.life = 2.0; grid.maxLife = 2.0;
    grid.color = '#bfdbfe';
    grid.size = 200;
    grid.type = 'GRID_FIELD';
    system.state.particles.push(grid);
    
    // 2. Mist
    spawnLingeringField(system, x, y, '#e0f2fe', 'SMOKE', 2.0, 0);
}

// ⚕️ SUPPORT: IRON HALO (sb_u1)
// "Intervention" -> Protective Field.
export function spawnImperialIntervention(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Clean Dome Outline
    const dome = system.state.getParticle();
    dome.x = x; dome.y = y; dome.z = 0;
    dome.life = 3.0; dome.maxLife = 3.0;
    dome.color = '#fef3c7'; // Pale Gold
    dome.size = 180;
    dome.type = 'DOMAIN'; // Uses new thin line render
    system.state.particles.push(dome);
}

// ⚕️ SUPPORT: APOTHECARY BEACON (sb_u2)
// "Resurrection" -> Helix.
export function spawnImperialResurrection(system: VFXSystem, x: number, y: number, color: string) {
    // 1. Medical Helix
    const beam = system.state.getParticle();
    beam.x = x; beam.y = y; beam.z = 0;
    beam.targetX = x; beam.targetY = y; // Vertical
    beam.life = 2.0; beam.maxLife = 2.0;
    beam.color = '#fff'; 
    beam.size = 20; 
    beam.type = 'BEAM'; // Hack: Use beam as vertical shaft
    // Actually BEAM draws horizontal. Let's use PILLAR but strictly white/clean.
    // Revert to PILLAR for simplicity
    beam.type = 'PILLAR';
    system.state.particles.push(beam);
}

// HELPER for Grid Highlights
function spawnGridImpact(system: VFXSystem, x: number, y: number, color: string, team: number, delay: number) {
    const p = system.state.getParticle();
    p.x = x; p.y = y; p.z = 0;
    p.life = 1.0; p.maxLife = 1.0;
    p.color = color;
    p.size = 36; 
    p.type = 'GRID_FIELD'; 
    p.delay = delay;
    system.state.particles.push(p);
}
