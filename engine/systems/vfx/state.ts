
export interface Particle {
    active: boolean; 
    
    // Position (World Space - Ground Plane)
    x: number;
    y: number;
    z: number; // Current visual Z (height offset)
    
    // Physics
    vx: number;
    vy: number;
    vz: number;
    
    rotation: number;     
    vRotation: number;    
    
    life: number;
    maxLife: number;
    color: string;
    size: number;
    
    type: 'SPARK' | 'SMOKE' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'BEAM' | 'SHOCKWAVE' | 'PILLAR' | 'DOMAIN' | 'SPRITE' | 'BLAST' | 'CHIP' | 'GRID_FIELD' | 'DEATH_RAY' | 'ROCK' | 'HEX_LOCK' | 'HEX_BEAM' | 'GIANT_HEX' | 'HEX_GLOW';
    
    // 🎯 BEAM TARGETING (Explicit 3D Anchors)
    // We store Source and Target completely separately to emulate Projectile data structure
    sx?: number; sy?: number; sz?: number; // Start (World X, World Y, Terrain Z)
    tx?: number; ty?: number; tz?: number; // Target (World X, World Y, Terrain Z)
    
    // For moving particles
    targetX?: number; 
    targetY?: number; 
    targetZ?: number; 
    
    // Asset Keys
    style?: string; // Generic Style Key (Looked up in BEAM_VISUALS or PROCEDURAL_VISUALS)
    
    delay?: number;
    image?: HTMLCanvasElement; 
    
    // Flags
    locked?: boolean; 
    drag?: number;    
    killAtTarget?: number; 
    
    // Rendering
    texture?: HTMLCanvasElement; 
    blendMode?: GlobalCompositeOperation; 
    sortBias?: number; 
}

export interface Decal {
    x: number;
    y: number;
    color: string;
    life: number;
    scale: number;
}

export class VFXStateManager {
    public particles: Particle[] = [];
    public decals: Decal[] = [];

    // Object Pool
    private particlePool: Particle[] = [];

    public getParticle(): Particle {
        if (this.particlePool.length > 0) {
            const p = this.particlePool.pop()!;
            // Reset Properties
            p.active = true;
            p.x = 0; p.y = 0; p.z = 0;
            p.vx = 0; p.vy = 0; p.vz = 0;
            p.rotation = 0; p.vRotation = 0;
            p.life = 0; p.maxLife = 0;
            p.color = '#fff'; p.size = 0;
            p.type = 'SPARK';
            
            p.sx = undefined; p.sy = undefined; p.sz = undefined;
            p.tx = undefined; p.ty = undefined; p.tz = undefined;
            
            p.targetX = undefined;
            p.targetY = undefined;
            p.targetZ = undefined;
            
            p.image = undefined; 
            p.texture = undefined;
            p.blendMode = undefined;
            p.style = undefined; // Reset style
            
            p.delay = 0; 
            p.locked = false; 
            p.sortBias = 0; 
            p.drag = undefined; 
            p.killAtTarget = undefined; 
            
            return p;
        }
        return { 
            active: true,
            x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, 
            rotation: 0, vRotation: 0,
            life: 0, maxLife: 0, color: '#fff', size: 0, type: 'SPARK',
            delay: 0,
            locked: false,
            sortBias: 0
        };
    }

    public releaseParticle(p: Particle) {
        p.active = false;
        p.image = undefined;
        p.texture = undefined;
        this.particlePool.push(p);
    }

    public reset() {
        while (this.particles.length > 0) {
            const p = this.particles.pop();
            if (p) this.releaseParticle(p);
        }
        this.decals.length = 0;
    }
}
