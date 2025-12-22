
import { VFXStateManager } from "./vfx/state";

const GRAVITY = 1800; // Gravity for particles

export class VFXSystem {
    // Encapsulated State
    public state: VFXStateManager = new VFXStateManager();

    update(dt: number, globalTime: number, ambientType: string) {
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

            // Physics Integration
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rotation += p.vRotation * dt;

            // Gravity & Environment Logic
            if (p.type === 'DEBRIS' || p.type === 'SHARD') {
                p.vz -= GRAVITY * dt; // Gravity
                
                // Ground Bounce
                if (p.z < 0) {
                    p.z = 0;
                    if (Math.abs(p.vz) > 100) {
                        p.vz = -p.vz * 0.5; // Bounce
                        p.vx *= 0.6; // Friction
                        p.vy *= 0.6;
                        p.vRotation *= 0.5;
                    } else {
                        p.vz = 0;
                        p.vx *= 0.1; // Stop sliding
                        p.vy *= 0.1;
                    }
                }
            } else if (p.type === 'SPARK' || p.type === 'SMOKE') {
                p.vx *= 0.90; 
                p.vy *= 0.90;
                p.vz *= 0.90; // Drag
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
    }
}
