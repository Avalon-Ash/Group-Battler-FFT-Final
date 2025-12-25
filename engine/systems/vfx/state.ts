
export interface Particle {
    active: boolean; // Pooling flag
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rotation: number;     // Current rotation
    vRotation: number;    // Rotation speed
    life: number;
    maxLife: number;
    color: string;
    size: number;
    type: 'SPARK' | 'SMOKE' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'RING' | 'BEAM' | 'SHOCKWAVE' | 'PILLAR' | 'DOMAIN' | 'SPRITE' | 'BLAST' | 'CHIP' | 'GRID_FIELD' | 'DEATH_RAY';
    targetX?: number; // For BEAM
    targetY?: number; // For BEAM
    delay?: number;
    image?: HTMLCanvasElement; // For SPRITE type (Unit parts)
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
            p.active = true;
            p.image = undefined; // Reset image reference
            p.delay = 0; // Reset delay
            return p;
        }
        return { 
            active: true,
            x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, 
            rotation: 0, vRotation: 0,
            life: 0, maxLife: 0, color: '#fff', size: 0, type: 'SPARK',
            delay: 0
        };
    }

    public releaseParticle(p: Particle) {
        p.active = false;
        p.image = undefined;
        this.particlePool.push(p);
    }
}
