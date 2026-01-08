
import { VFXStateManager } from "./vfx/state";
import { VFXPlayer } from "./vfx/VFXPlayer";
import { VFXPhysics } from "./vfx/VFXPhysics";
import { VFXAmbience } from "./vfx/VFXAmbience";
import { Point3D } from "../math/VisualMath";

export class VFXSystem {
    public state: VFXStateManager = new VFXStateManager();
    private ambience: VFXAmbience = new VFXAmbience();
    
    public reset() { this.state.reset(); }
    
    public playEffect(effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number) {
        VFXPlayer.play(this, effectId, x, y, z, colorOverride, groundZ);
    }
    
    public playBeam(styleId: string, start: Point3D, end: Point3D, colorOverride?: string, duration: number = 0.4) {
        const p = this.state.getParticle();
        p.sx = start.x; p.sy = start.y; p.sz = start.z;
        p.tx = end.x; p.ty = end.y; p.tz = end.z;
        p.x = start.x; p.y = start.y; p.z = start.z;
        p.life = duration; p.maxLife = duration; 
        p.color = colorOverride || '#fff'; 
        p.type = 'BEAM'; p.style = styleId; p.locked = true;
        this.state.particles.push(p);
    }

    /**
     * SSOT Update:
     * @param dt - Scaled Simulation Delta Time (0 if paused)
     * @param battleTime - Current Battle Time (for procedural shaders)
     */
    update(dt: number, battleTime: number, ambientType: string, getTerrainHeight?: (x: number, y: number) => number) {
        const particles = this.state.particles;
        let count = particles.length;
        
        for (let i = count - 1; i >= 0; i--) {
            const p = particles[i];
            
            // Apply Time Dilation to Delays
            if (p.delay && p.delay > 0) { 
                p.delay -= dt; 
                continue; 
            }
            
            p.life -= dt;
            
            if (p.life <= 0) {
                this.state.releaseParticle(p);
                particles[i] = particles[count - 1];
                particles.pop(); count--; continue;
            }
            
            if (p.locked) { 
                p.rotation += p.vRotation * dt; 
                continue; 
            }
            
            if (p.killAtTarget !== undefined && p.targetX !== undefined && p.targetY !== undefined) {
                const dx = p.x - p.targetX, dy = p.y - p.targetY;
                if (dx*dx + dy*dy < p.killAtTarget) p.life = 0; 
            }
            
            VFXPhysics.update(p, dt, getTerrainHeight);
        }
        
        // Decals also respect time scale
        for (let i = this.state.decals.length - 1; i >= 0; i--) {
            this.state.decals[i].life -= dt * 0.5;
            if (this.state.decals[i].life <= 0) this.state.decals.splice(i, 1);
        }
        
        this.ambience.update(dt, ambientType, this.state);
    }
}
