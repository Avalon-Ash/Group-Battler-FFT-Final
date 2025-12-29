
import { Agent } from "../game";
import { Particle } from "../systems/vfx/state";
import { Projectile, Point, GroundHazard } from "../../types";

export enum RenderOpType {
    TERRAIN,
    OBSTACLE,
    UNIT,
    VFX,
    PROJECTILE,
    DECAL
}

export class RenderOp {
    type: RenderOpType = RenderOpType.TERRAIN;
    sortKey: number = 0;
    y: number = 0; 
    z: number = 0; 
    
    // Terrain / Common
    tx: number = 0; ty: number = 0; th: number = 0; 
    tsize: number = 0; ttheme: any = null;
    tq: number = 0; tr: number = 0;
    ttype: string = ''; tdetail: string = '';
    
    // Overlays
    oStatus: string | undefined;
    oDanger: any;
    oHazard: GroundHazard | undefined; 
    oLightCol: string | null = null;
    oLightInt: number = 0;
    oRange: boolean = false;
    oRangeCol: string = '';
    oHover: boolean = false;
    oHasUnit: boolean = false;
    
    // Entities
    agent: Agent | null = null;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    
    // Particles
    particle: Particle | null = null;
    vProgress: number = 0;
    vChaos: boolean = false;
    
    // Projectiles
    pVisX: number = 0; pVisY: number = 0; pVisShadowY: number = 0;
    pSkillVis: string = ''; pColor: string = '';
    pIsUlt: boolean = false; pAngle: number = 0; pSpin: number = 0;
    pTrail: Point[] = []; 
    proj: Projectile | null = null;
    
    // Decals
    dColor: string = ''; dScale: number = 1; dLife: number = 0;
    time: number = 0;

    /**
     * 🧹 POOL HYGIENE: Reset all properties to prevent data leaking.
     * Fixes the "Ghost Grid" bug by clearing cinematic flags.
     */
    public clear() {
        this.type = RenderOpType.TERRAIN;
        this.sortKey = 0;
        this.y = 0; this.z = 0;
        this.tx = 0; this.ty = 0; this.th = 0;
        this.agent = null;
        this.particle = null;
        this.proj = null;
        this.pIsUlt = false; // CRITICAL FIX
        this.oRange = false;
        this.oHover = false;
        this.oStatus = undefined;
        this.oHazard = undefined;
        this.oDanger = undefined;
        this.uSelected = false;
        this.uSilhouette = false;
        this.vChaos = false;
        this.ttheme = null;
        this.pTrail = [];
    }
}

export class RenderList {
    public ops: RenderOp[] = [];
    public count: number = 0;
    
    private sortView: RenderOp[] = [];
    private capacity: number = 8000;

    constructor() {
        for(let i=0; i<this.capacity; i++) {
            const op = new RenderOp();
            this.ops.push(op);
            this.sortView.push(op); 
        }
    }
    
    public reset() {
        this.count = 0;
    }
    
    public next(): RenderOp {
        if (this.count >= this.ops.length) {
            for(let i=0; i<1000; i++) {
                const op = new RenderOp();
                this.ops.push(op);
                this.sortView.push(op);
            }
        }
        const op = this.ops[this.count++];
        op.clear(); // Ensure clean state from pool
        return op;
    }
    
    public sort() {
        if (this.count <= 1) return;

        for (let i = 0; i < this.count; i++) {
            const op = this.ops[i];
            
            let layerScore = 0;
            // Only particles or projectiles tagged as Ultimates get the cinematic layer boost
            const isCinematic = (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) && op.pIsUlt;

            if (op.z > 500) {
                layerScore = 30000000; 
            } else if (isCinematic) {
                layerScore = 20000000; 
            } else if (op.z < 0) {
                layerScore = -10000000;
            }

            const yScore = Math.floor(op.y) * 1000;
            const zScore = Math.floor(op.z);
            
            op.sortKey = layerScore + yScore + zScore;
            this.sortView[i] = op;
        }

        const activeSegment = this.sortView.slice(0, this.count);
        activeSegment.sort((a, b) => a.sortKey - b.sortKey);
        
        for (let i = 0; i < this.count; i++) {
            this.ops[i] = activeSegment[i];
        }
    }
}
