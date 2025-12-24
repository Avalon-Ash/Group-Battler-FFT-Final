
import { VFXStateManager } from "./vfx/state";

const GRAVITY = 1800; // Gravity for particles

export class VFXSystem {
    // Encapsulated State
    public state: VFXStateManager = new VFXStateManager();
    
    // Ambient Spawn State
    private ambientTimer: number = 0;

    update(dt: number, globalTime: number, ambientType: string, getTerrainHeight?: (x: number, y: number) => number) {
        // Update Particles
        // Iterate backwards to allow safe removal
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const p = this.state.particles[i];
            
            if (p.delay && p.delay > 0) {
                p.delay -= dt;
                continue;
            }

            p.life -= dt;
            if (p.life <= 0) {
                this.state.releaseParticle(p);
                this.state.particles.splice(i, 1);
                continue;
            }

            // --- PHYSICS UPDATE ---
            // Types affected by gravity and floor collisions
            const isPhysical = p.type === 'DEBRIS' || p.type === 'SHARD' || p.type === 'SPRITE';

            if (isPhysical) {
                // Get ground height at particle position
                let groundH = 0;
                if (getTerrainHeight) {
                    groundH = getTerrainHeight(p.x, p.y);
                }

                // RESTING CHECK (The Anti-Jitter Fix)
                // If on ground (at terrain height) and barely moving
                const distToGround = p.z - groundH;
                const isResting = distToGround <= 0.5 && Math.abs(p.vz) < 50 && Math.abs(p.vx) < 10 && Math.abs(p.vy) < 10;

                if (isResting) {
                    p.z = groundH; // Snap to terrain top
                    p.vz = 0;
                    p.vx = 0;
                    p.vy = 0;
                    p.vRotation = 0;
                    // Skip integration, just render static
                } else {
                    // Apply Gravity
                    p.vz -= GRAVITY * dt;
                    
                    // Integrate Position
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.z += p.vz * dt;
                    p.rotation += p.vRotation * dt;

                    // Ground Collision
                    // Recalculate groundH for new position if moving horizontally?
                    // Ideally yes, but for small dt it's okay. 
                    // Better: clamp z to current pos groundH.
                    
                    if (p.z < groundH) {
                        p.z = groundH;
                        // Bounce Logic
                        if (Math.abs(p.vz) > 100) {
                            // High Energy: Bounce
                            p.vz = -p.vz * 0.5; 
                            p.vx *= 0.6; // Friction on bounce
                            p.vy *= 0.6;
                            p.vRotation *= 0.5;
                        } else {
                            // Low Energy: Slide
                            p.vz = 0;
                            // Heavy Ground Friction
                            p.vx *= 0.1; 
                            p.vy *= 0.1;
                            p.vRotation *= 0.1;
                        }
                    }
                }
            } else {
                // Non-Physical Particles (Smoke, Sparks, etc.)
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rotation += p.vRotation * dt;

                if (p.type === 'SPARK' || p.type === 'SMOKE') {
                    p.vx *= 0.90; 
                    p.vy *= 0.90;
                    p.vz *= 0.90; // Drag
                } else if (p.type === 'GLOW') {
                    // Ambient particles float/wobble
                    p.vx += Math.sin(globalTime * 2 + p.x) * 50 * dt;
                    p.vy += Math.cos(globalTime * 2 + p.y) * 50 * dt;
                }
            }
        }

        // Update Decals
        for (let i = this.state.decals.length - 1; i >= 0; i--) {
            this.state.decals[i].life -= dt * 0.5;
            if (this.state.decals[i].life <= 0) this.state.decals.splice(i, 1);
        }

        // Update Grid Flashes
        for (let i = this.state.gridFlashes.length - 1; i >= 0; i--) {
            this.state.gridFlashes[i].life -= dt * 2.0;
            if (this.state.gridFlashes[i].life <= 0) this.state.gridFlashes.splice(i, 1);
        }

        // --- AMBIENT SPAWNER ---
        this.updateAmbient(dt, ambientType);
    }

    private updateAmbient(dt: number, type: string) {
        if (type === 'NONE') return;

        this.ambientTimer += dt;
        // Spawn rate based on type
        const rate = type === 'SNOW' || type === 'ASH' ? 0.05 : 0.2; 
        
        if (this.ambientTimer > rate) {
            this.ambientTimer = 0;
            this.spawnAmbientParticle(type);
        }
    }

    private spawnAmbientParticle(type: string) {
        // Spawn randomly in a large area around center
        const x = Math.random() * 1200 - 100;
        const y = Math.random() * 800 - 100;
        
        const p = this.state.getParticle();
        p.x = x; p.y = y; p.z = Math.random() * 200 + 50; // Keep off ground
        p.type = 'GLOW';
        
        if (type === 'SNOW') {
            p.color = '#fff';
            p.size = Math.random() * 3 + 1;
            p.vx = 20 + Math.random() * 20; // Wind
            p.vy = 50 + Math.random() * 30; // Fall
            p.life = 3.0; p.maxLife = 3.0;
        } else if (type === 'ASH') {
            p.color = '#78350f'; // Dark grey/brown
            p.size = Math.random() * 4 + 1;
            p.vx = 30 + Math.random() * 30;
            p.vy = 20 + Math.random() * 20;
            p.life = 4.0; p.maxLife = 4.0;
        } else if (type === 'EMBER') {
            p.color = '#fbbf24';
            p.size = Math.random() * 2 + 1;
            p.vx = (Math.random() - 0.5) * 20;
            p.vy = -30 - Math.random() * 20; // Rise
            p.life = 2.0; p.maxLife = 2.0;
        } else if (type === 'SPORES') {
            p.color = Math.random() > 0.5 ? '#bef264' : '#a855f7';
            p.size = Math.random() * 2 + 1;
            p.vx = (Math.random() - 0.5) * 10;
            p.vy = (Math.random() - 0.5) * 10; // Float
            p.life = 5.0; p.maxLife = 5.0;
        }
        
        this.state.particles.push(p);
    }
}
