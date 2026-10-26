import { VFX_PARAM } from '../../../constants';
import type { ParticleType, PartAnim } from '../../../types/VFXSchema';
import type { PartSprite } from '../../renderers/vfxparts/VFXPartStore';

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
    /** 光束芯色（陣營色階 core）；未設則為白 */
    /** 整組特效的縮放（序列動作的 scale，VFXPlayer.play 設定）：零件繪製尺寸與生成散佈範圍都乘上它；未設＝1 */
    fxScale?: number;
    /** 光束兩端光點（硬光暈零件，VFXSystem.playBeam 設定、PartPainter.drawBeam 畫在起點與終點） */
    beamEnd?: PartSprite;
    /**
     * 光束終點相對起點的繪製時額外 Y 位移（螢幕 px，正值往下）＝終點格漂浮位移 − 起點格漂浮位移（RenderSpec §5）。
     * 唯一寫入者 VFXRenderer.submitRenderables（每幀提交時算），只給 PartPainter.drawBeam 讀；模擬端不讀不寫。
     */
    beamEndDy?: number;
    ownerId?: string;
    /** 終極技粒子標記（SequenceSystem 寫入，vfx/render.ts 讀取以決定繪製排序）。 */
    pIsUlt?: boolean;
    /** 生成這顆粒子的序列編號（SequenceSystem 寫入）：CAST_BREAK 取消該次詠唱序列、單體綁定跟隨目標用 */
    seqRun?: number;
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
    /** 零件粒子的烘焙 sprite（生成時取一次，繪製時只 drawImage） */
    part?: PartSprite;
    partAnim?: PartAnim;
    /** 每次物理更新都貼齊地面高度（看板仍正常繪製） */
    groundAnchored?: boolean;
    /** 出生高度：partAnim.rise 以它為基準算每幀高度（VFXPhysics） */
    spawnZ?: number;
    /**
     * 天氣／氛圍層編號（VFXAmbience 生成；1＝場景天氣，2 起＝BIOME_ATMOSPHERE），計數同時存在的粒子用。
     * 不用 ownerId：沒有對應單位的 ownerId 會被 VFXSystem 當成擁有者已死而移除
     */
    weather?: number;
}
export class VFXStateManager {
    public particles: Particle[] = [];
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
            p.beamEnd = undefined;
            p.fxScale = undefined;
            p.beamEndDy = undefined;
            p.visualStyle = undefined;
            p.ownerId = undefined;
            p.pIsUlt = undefined;
            p.seqRun = undefined;
            p.delay = 0; 
            p.locked = false; 
            p.lockReason = undefined;
            p.sortBias = 0; 
            p.drag = undefined; 
            p.gravity = undefined;
            p.killAtTarget = undefined; 
            p.lastGroundHeight = undefined;
            p.hexKey = undefined;
            p.part = undefined;
            p.partAnim = undefined;
            p.groundAnchored = undefined;
            p.spawnZ = undefined;
            p.weather = undefined;
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
        p.part = undefined;
        if (this.particlePool.length >= VFX_PARAM.MAX_POOL_SIZE) return;
        this.particlePool.push(p);
    }
    public cancelSequenceRun(runId: number) {
        this.particles = this.particles.filter(p => {
            if (p.seqRun === runId) {
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
    }
}