import { VFX_PARAM } from '../../../constants';
import type { ParticleType } from '../../../types/VFXSchema';

export interface Particle {
    active: boolean; 
    x: number;
    y: number;
    z: number; 
    vx: number;
    vy: number;
    vz: number;
    rotation: number;     
    vRotation: number;    
    life: number;
    maxLife: number;
    color: string;
    size: number;
    height?: number; 
    type: ParticleType;
    sx?: number; sy?: number; sz?: number; 
    tx?: number; ty?: number; tz?: number; 
    targetX?: number; 
    targetY?: number; 
    targetZ?: number; 
    style?: string; 
    ownerId?: string;
    /** 終極技粒子標記（SequenceSystem 寫入，vfx/render.ts 讀取以決定繪製排序）。 */
    pIsUlt?: boolean;
    /** 終極技施放者 ID，供 cancelUltBySource 取消。 */
    ultSourceId?: string;
    visualStyle?: string;
    delay?: number;
    image?: HTMLCanvasElement; 
    locked?: boolean; 
    lockReason?: 'BEAM' | 'HAZARD_FIELD';
    drag?: number;
    gravity?: number;   
    killAtTarget?: number; 
    texture?: HTMLCanvasElement; 
    blendMode?: GlobalCompositeOperation; 
    sortBias?: number; 
    lastGroundHeight?: number; 
    hexKey?: string; 
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
    private particlePool: Particle[] = [];
    public getParticle(): Particle {
        if (this.particlePool.length > 0) {
            const p = this.particlePool.pop()!;
            p.active = true;
            p.x = 0; p.y = 0; p.z = 0;
            p.vx = 0; p.vy = 0; p.vz = 0;
            p.rotation = 0; p.vRotation = 0;
            p.life = 0; p.maxLife = 0;
            p.color = '#ff00ff'; p.size = 0;
            p.height = undefined;
            p.type = 'GENERIC_DEBUG'; 
            p.sx = undefined; p.sy = undefined; p.sz = undefined;
            p.tx = undefined; p.ty = undefined; p.tz = undefined;
            p.targetX = undefined;
            p.targetY = undefined;
            p.targetZ = undefined;
            p.image = undefined; 
            p.texture = undefined;
            p.blendMode = undefined;
            p.style = undefined; 
            p.visualStyle = undefined;
            p.ownerId = undefined;
            p.pIsUlt = undefined;
            p.ultSourceId = undefined;
            p.delay = 0; 
            p.locked = false; 
            p.lockReason = undefined;
            p.sortBias = 0; 
            p.drag = undefined; 
            p.gravity = undefined;
            p.killAtTarget = undefined; 
            p.lastGroundHeight = undefined;
            p.hexKey = undefined;
            return p;
        }
        return { 
            active: true,
            x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, 
            rotation: 0, vRotation: 0,
            life: 0, maxLife: 0, color: '#ff00ff', size: 0, height: undefined, type: 'GENERIC_DEBUG',
            delay: 0,
            locked: false,
            lockReason: undefined,
            sortBias: 0,
            ownerId: undefined,
            hexKey: undefined
        };
    }
    public releaseParticle(p: Particle) {
        p.active = false;
        p.image = undefined;
        p.texture = undefined;
        if (this.particlePool.length >= VFX_PARAM.MAX_POOL_SIZE) return;
        this.particlePool.push(p);
    }
    public cancelUltBySource(sourceId: string) {
        this.particles = this.particles.filter(p => {
            if (p.ultSourceId === sourceId) {
                this.releaseParticle(p);
                return false;
            }
            return true;
        });
    }

    public reset() {
        while (this.particles.length > 0) {
            const p = this.particles.pop();
            if (p) this.releaseParticle(p);
        }
        this.decals.length = 0;
    }
}