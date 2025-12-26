
import { VFXSystem } from "../vfx";
import { spawnExplosion, spawnShockwave, addImpact, spawnBeam, spawnLingeringField } from "./generic";
import { ISO_SCALE_Y } from "../../../../constants";

interface Point3D { x: number; y: number; z: number; }

// 🛡️ TANK: FORTRESS OF HERA (tb_u1)
export function spawnImperialSanctuary(system: VFXSystem, pt: Point3D, color: string) {
    const radius = 160;
    
    // Central Pillar
    const beacon = system.state.getParticle();
    beacon.x = pt.x; beacon.y = pt.y; beacon.z = pt.z;
    beacon.life = 3.0; beacon.maxLife = 3.0;
    beacon.color = '#fbbf24'; 
    beacon.size = 40; 
    beacon.type = 'PILLAR'; 
    beacon.locked = true;
    beacon.sortBias = 20; 
    system.state.particles.push(beacon);

    // Perimeter Beams (Start at perimeter ground, End at center waist)
    for(let i=0; i<6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = pt.x + Math.cos(angle) * radius;
        const py = pt.y + Math.sin(angle) * radius;
        
        // Start: Perimeter Ground (+10 lift)
        const start = { x: px, y: py, z: pt.z + 10 };
        // End: Center (+40 waist)
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
    beam.size = 80; 
    beam.type = 'PILLAR';
    beam.locked = true;
    beam.sortBias = 20;
    system.state.particles.push(beam);
    
    spawnExplosion(system, pt.x, pt.y, pt.z, 20, '#fff', 5.0, 2.0, 'GLOW');
}

// ⚔️ WARRIOR: ORBITAL STRIKE (wb_u1)
export function spawnImperialThunder(system: VFXSystem, pt: Point3D, color: string) {
    const lock = system.state.getParticle();
    lock.x = pt.x; lock.y = pt.y; lock.z = pt.z + 5;
    lock.life = 0.5; lock.maxLife = 0.5;
    lock.color = '#22d3ee'; 
    lock.size = 60;
    lock.type = 'HEX_LOCK';
    lock.rotation = Math.random() * Math.PI;
    lock.locked = true;
    system.state.particles.push(lock);

    setTimeout(() => {
        const stackHeight = 12;
        for(let i=0; i<stackHeight; i++) {
            const p = system.state.getParticle();
            p.x = pt.x; p.y = pt.y; 
            p.z = pt.z + i * 80; 
            
            p.life = 0.3 + (i * 0.02); 
            p.maxLife = p.life;
            
            p.color = '#60a5fa';
            p.size = 40; 
            p.type = 'HEX_BEAM';
            p.locked = true; 
            p.sortBias = 20;
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
    beam.color = '#fffbeb';
    beam.size = 150;
    beam.type = 'PILLAR';
    beam.locked = true;
    beam.sortBias = 20;
    system.state.particles.push(beam);
}

// 🏹 RANGER: BOLTER VOLLEY (rb_u1)
export function spawnImperialCrystalArrow(system: VFXSystem, pt: Point3D, color: string) {
    for(let i=0; i<5; i++) {
        setTimeout(() => {
            const ox = (Math.random()-0.5) * 60;
            const oy = (Math.random()-0.5) * 60;
            spawnExplosion(system, pt.x+ox, pt.y+oy, pt.z + 20, 8, '#facc15', 1.5, 0.4, 'SPARK');
            spawnExplosion(system, pt.x+ox, pt.y+oy, pt.z + 20, 5, '#1e293b', 0.8, 0.8, 'SMOKE');
        }, i * 80);
    }
}

// 🏹 RANGER: DROP POD ASSAULT (rb_u2)
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
        pod.color = '#fcd34d'; 
        pod.size = 25;
        pod.type = 'DEBRIS'; 
        pod.delay = i * 0.1;
        system.state.particles.push(pod);
        
        setTimeout(() => {
            spawnExplosion(system, px, py, pt.z, 12, '#94a3b8', 1.5, 0.6, 'DEBRIS');
            addImpact(system, px, py, pt.z, '#fff', 'BLAST', 0.4);
        }, 400 + (i * 100));
    }
}

// 🔮 MAGE: VORTEX GRENADE (mb_u1)
export function spawnImperialBlackHole(system: VFXSystem, pt: Point3D, color: string) {
    const coreLife = 6.0;

    const core = system.state.getParticle();
    core.x = pt.x; core.y = pt.y; core.z = pt.z + 50;
    core.life = coreLife; core.maxLife = coreLife;
    core.color = '#000000'; 
    core.size = 120;
    core.type = 'GIANT_HEX';
    core.locked = true;
    core.sortBias = 100; 
    core.vRotation = 5;  
    system.state.particles.push(core);

    const horizon = system.state.getParticle();
    horizon.x = pt.x; horizon.y = pt.y; horizon.z = pt.z + 49; 
    horizon.life = coreLife; horizon.maxLife = coreLife;
    horizon.color = '#8800FF'; 
    horizon.size = 160;
    horizon.type = 'HEX_GLOW';
    horizon.locked = true;
    horizon.sortBias = 90; 
    horizon.vRotation = -30; 
    system.state.particles.push(horizon);

    const debrisCount = 40;
    for(let i=0; i<debrisCount; i++) {
        const p = system.state.getParticle();
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 250 + Math.random() * 150;
        
        p.x = pt.x + Math.cos(angle) * radius;
        p.y = pt.y + Math.sin(angle) * radius * ISO_SCALE_Y; 
        p.z = pt.z + 50; 
        
        const speed = 20 + Math.random() * 40;
        p.vx = -Math.cos(angle) * speed;
        p.vy = -Math.sin(angle) * speed * ISO_SCALE_Y;
        
        p.life = 2.0 + Math.random(); 
        p.maxLife = p.life;
        
        const palette = ['#fff', '#60a5fa', '#a855f7'];
        p.color = palette[Math.floor(Math.random() * palette.length)];
        
        p.size = 10 + Math.random() * 10;
        p.type = 'DEBRIS'; 
        p.drag = -0.05; 
        
        p.targetX = pt.x;
        p.targetY = pt.y;
        p.killAtTarget = 50 * 50; 
        p.delay = Math.random() * 2.0; 
        
        system.state.particles.push(p);
    }
}

// 🔮 MAGE: CRYOGENIC STASIS (mb_u2)
export function spawnImperialFrostfall(system: VFXSystem, pt: Point3D, color: string) {
    const grid = system.state.getParticle();
    grid.x = pt.x; grid.y = pt.y; grid.z = pt.z;
    grid.life = 3.0; grid.maxLife = 3.0;
    grid.color = '#bfdbfe';
    grid.size = 250;
    grid.type = 'GRID_FIELD';
    grid.locked = true;
    system.state.particles.push(grid);
    
    spawnLingeringField(system, pt.x, pt.y, pt.z, '#e0f2fe', 'SMOKE', 3.0, 0);
}

// ⚕️ SUPPORT: IRON HALO (sb_u1)
export function spawnImperialIntervention(system: VFXSystem, pt: Point3D, color: string) {
    const dome = system.state.getParticle();
    dome.x = pt.x; dome.y = pt.y; dome.z = pt.z;
    dome.life = 4.0; dome.maxLife = 4.0;
    dome.color = '#fef3c7'; 
    dome.size = 200;
    dome.type = 'DOMAIN'; 
    dome.locked = true;
    system.state.particles.push(dome);
    
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 4.0; beam.maxLife = 4.0;
    beam.color = '#fff';
    beam.size = 40;
    beam.type = 'PILLAR';
    beam.locked = true;
    beam.sortBias = 20;
    system.state.particles.push(beam);
}

// ⚕️ SUPPORT: APOTHECARY BEACON (sb_u2)
export function spawnImperialResurrection(system: VFXSystem, pt: Point3D, color: string) {
    const beam = system.state.getParticle();
    beam.x = pt.x; beam.y = pt.y; beam.z = pt.z;
    beam.life = 2.5; beam.maxLife = 2.5;
    beam.color = '#86efac'; 
    beam.size = 60; 
    beam.type = 'PILLAR'; 
    beam.locked = true;
    beam.sortBias = 20;
    system.state.particles.push(beam);
}
