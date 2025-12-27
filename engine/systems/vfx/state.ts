
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
    
    // Added RUBBLE, SPIKE, DUST, ATMOSPHERE, GENERIC_DEBUG
    type: 'SPARK' | 'SMOKE' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'BEAM' | 'SHOCKWAVE' | 'PILLAR' | 'DOMAIN' | 'SPRITE' | 'BLAST' | 'CHIP' | 'GRID_FIELD' | 'DEATH_RAY' | 'ROCK' | 'HEX_LOCK' | 'HEX_BEAM' | 'GIANT_HEX' | 'HEX_GLOW' | 'STREAK' | 'RING' | 'CRACKS' | 'PEBBLE' | 'RUBBLE' | 'SPIKE' | 'DUST' | 'ATMOSPHERE' | 'GENERIC_DEBUG';
    
    // 🎯 BEAM TARGETING (Explicit 3D Anchors)
    sx?: number; sy?: number; sz?: number; 
    tx?: number; ty?: number; tz?: number; 
    
    targetX?: number; 
    targetY?: number; 
    targetZ?: number; 
    
    style?: string; 
    delay?: number;
    image?: HTMLCanvasElement; 
    locked?: boolean; 
    drag?: number;    
    killAtTarget?: number; 
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
            p.color = '#ff00ff'; p.size = 0;
            p.type = 'GENERIC_DEBUG'; // Distinctive default
            
            p.sx = undefined; p.sy = undefined; p.sz = undefined;
            p.tx = undefined; p.ty = undefined; p.tz = undefined;
            
            p.targetX = undefined;
            p.targetY = undefined;
            p.targetZ = undefined;
            
            p.image = undefined; 
            p.texture = undefined;
            p.blendMode = undefined;
            p.style = undefined; 
            
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
            life: 0, maxLife: 0, color: '#ff00ff', size: 0, type: 'GENERIC_DEBUG',
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
