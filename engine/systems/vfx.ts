
import { VFXStateManager } from "./vfx/state";
import { VFXPlayer } from "./vfx/VFXPlayer";

const GRAVITY = 1800; 

// Interface for 3D points
interface Point3D { x: number; y: number; z: number; }

export class VFXSystem {
    public state: VFXStateManager = new VFXStateManager();
    private ambientTimer: number = 0;

    public reset() {
        this.state.reset();
        this.ambientTimer = 0;
    }

    /**
     * Play a particle effect from the registry
     */
    public playEffect(effectId: string, x: number, y: number, z: number, colorOverride?: string) {
        VFXPlayer.play(this, effectId, x, y, z, colorOverride);
    }

    /**
     * Play a beam effect between two points
     */
    public playBeam(styleId: string, start: Point3D, end: Point3D, colorOverride?: string, duration: number = 0.4) {
        const p = this.state.getParticle();
        
        // 3D Anchors
        p.sx = start.x; p.sy = start.y; p.sz = start.z;
        p.tx = end.x;   p.ty = end.y;   p.tz = end.z;
        
        // Sorting Key (Start Point)
        p.x = start.x; p.y = start.y; p.z = start.z;
        
        p.life = duration; 
        p.maxLife = duration; 
        p.color = colorOverride || '#fff'; 
        p.type = 'BEAM'; 
        p.style = styleId; // Generic Style Key
        p.locked = true;
        
        this.state.particles.push(p);
    }

    update(dt: number, globalTime: number, ambientType: string, getTerrainHeight?: (x: number, y: number) => number) {
        const particles = this.state.particles;
        let count = particles.length;

        for (let i = count - 1; i >= 0; i--) {
            const p = particles[i];
            
            if (p.delay && p.delay > 0) {
                p.delay -= dt;
                continue;
            }

            p.life -= dt;
            if (p.life <= 0) {
                this.state.releaseParticle(p);
                particles[i] = particles[count - 1];
                particles.pop();
                count--;
                continue;
            }

            // --- V2.0 PHYSICS LOCK ---
            // Locked particles are purely visual/kinematic (controlled by spawner or static)
            if (p.locked) {
                p.rotation += p.vRotation * dt;
                continue; 
            }

            // --- KILL AT TARGET ---
            if (p.killAtTarget !== undefined && p.targetX !== undefined && p.targetY !== undefined) {
                const dx = p.x - p.targetX;
                const dy = p.y - p.targetY;
                if (dx*dx + dy*dy < p.killAtTarget) {
                    p.life = 0; 
                }
            }

            // --- PHYSICS UPDATE ---
            const isPhysical = p.type === 'DEBRIS' || p.type === 'SHARD' || p.type === 'SPRITE' || p.type === 'ROCK' || p.type === 'CHIP';

            if (isPhysical) {
                // IMPORTANT: Fetch dynamic terrain height for this particle's location
                let groundH = getTerrainHeight ? getTerrainHeight(p.x, p.y) : 0;

                // Apply Gravity to Z (Height)
                p.vz -= GRAVITY * dt;
                
                // Integrate
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rotation += p.vRotation * dt;

                // Floor Collision
                if (p.z < groundH) {
                    p.z = groundH;
                    if (Math.abs(p.vz) > 100) {
                        p.vz = -p.vz * 0.5; // Bounce
                        p.vx *= 0.6; 
                        p.vy *= 0.6;
                        p.vRotation *= 0.5;
                    } else {
                        // Resting
                        p.vz = 0;
                        p.vx *= 0.1; 
                        p.vy *= 0.1;
                        p.vRotation = 0;
                        p.z = groundH; // Snap
                    }
                }
            } else {
                // Weightless / Atmospheric
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                p.rotation += p.vRotation * dt;

                if (p.drag !== undefined) {
                    const dragFactor = 1 - p.drag; 
                    p.vx *= dragFactor;
                    p.vy *= dragFactor;
                    p.vz *= dragFactor;
                } else if (p.type === 'SPARK' || p.type === 'SMOKE') {
                    p.vx *= 0.90; 
                    p.vy *= 0.90;
                    p.vz *= 0.90; 
                } else if (p.type === 'GLOW') {
                    // Float
                    p.vx += Math.sin(globalTime * 2 + p.x) * 50 * dt;
                    p.vy += Math.cos(globalTime * 2 + p.y) * 50 * dt;
                }
            }
        }

        // Update Decals
        for (let i = this.state.decals.length - 1; i >= 0; i--) {
            this.state.decals[i].life -= dt * 0.5;
            if (this.state.decals[i].life <= 0) {
                this.state.decals.splice(i, 1);
            }
        }

        this.updateAmbient(dt, ambientType);
    }

    private updateAmbient(dt: number, type: string) {
        if (type === 'NONE') return;
        this.ambientTimer += dt;
        const rate = type === 'SNOW' || type === 'ASH' ? 0.05 : 0.2; 
        
        if (this.ambientTimer > rate) {
            this.ambientTimer = 0;
            const x = Math.random() * 1200 - 100;
            const y = Math.random() * 800 - 100;
            
            const p = this.state.getParticle();
            p.x = x; p.y = y; p.z = Math.random() * 200 + 50;
            p.type = 'GLOW';
            
            if (type === 'SNOW') {
                p.color = '#fff';
                p.size = Math.random() * 3 + 1;
                p.vx = 20 + Math.random() * 20;
                p.vy = 50 + Math.random() * 30;
                p.life = 3.0; p.maxLife = 3.0;
            } else if (type === 'ASH') {
                p.color = '#78350f';
                p.size = Math.random() * 4 + 1;
                p.vx = 30 + Math.random() * 30;
                p.vy = 20 + Math.random() * 20;
                p.life = 4.0; p.maxLife = 4.0;
            } else if (type === 'EMBER') {
                p.color = '#fbbf24';
                p.size = Math.random() * 2 + 1;
                p.vx = (Math.random() - 0.5) * 20;
                p.vy = -30 - Math.random() * 20;
                p.life = 2.0; p.maxLife = 2.0;
            } else if (type === 'SPORES') {
                p.color = Math.random() > 0.5 ? '#bef264' : '#a855f7';
                p.size = Math.random() * 2 + 1;
                p.vx = (Math.random() - 0.5) * 10;
                p.vy = (Math.random() - 0.5) * 10;
                p.life = 5.0; p.maxLife = 5.0;
            }
            this.state.particles.push(p);
        }
    }
}
