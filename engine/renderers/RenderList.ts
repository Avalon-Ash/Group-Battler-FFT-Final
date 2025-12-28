
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
    y: number = 0; 
    z: number = 0; 
    sortBias: number = 0; 
    
    tx: number = 0; 
    ty: number = 0; 
    th: number = 0; 
    tsize: number = 0;
    ttheme: any = null;
    tq: number = 0;
    tr: number = 0;
    ttype: string = ''; 
    tdetail: string = '';
    
    oStatus: string | undefined;
    oDanger: any;
    oHazard: GroundHazard | undefined; 
    oLightCol: string | null = null;
    oLightInt: number = 0;
    oRange: boolean = false;
    oRangeCol: string = '';
    oHover: boolean = false;
    oHasUnit: boolean = false;
    
    agent: Agent | null = null;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    
    particle: Particle | null = null;
    vProgress: number = 0;
    vChaos: boolean = false;
    
    pVisX: number = 0;
    pVisY: number = 0;
    pVisShadowY: number = 0;
    pSkillVis: string = '';
    pColor: string = '';
    pIsUlt: boolean = false;
    pAngle: number = 0;
    pSpin: number = 0;
    pTrail: Point[] = []; 
    proj: Projectile | null = null;
    
    dColor: string = '';
    dScale: number = 1;
    dLife: number = 0;
    
    time: number = 0;
}

export class RenderList {
    public ops: RenderOp[] = [];
    public count: number = 0;
    // Increased capacity to 8000 to handle massive particle counts without resizing
    private capacity: number = 8000;

    constructor() {
        for(let i=0; i<this.capacity; i++) this.ops.push(new RenderOp());
    }
    
    public reset() {
        this.count = 0;
    }
    
    public next(): RenderOp {
        if (this.count >= this.ops.length) {
            // Expand pool if necessary (should be rare now)
            for(let i=0; i<1000; i++) this.ops.push(new RenderOp());
        }
        const op = this.ops[this.count++];
        op.sortBias = 0; 
        return op;
    }
    
    public sort() {
        if (this.count > 1) {
            // Use native sort on the subarray
            // Modern JS engines (Chrome/V8) use Timsort which is extremely fast for partially sorted data
            const activeOps = this.ops.slice(0, this.count);
            activeOps.sort(this.compare);
            
            // Copy back (Native sort is in-place, but we sliced to avoid sorting empty tail)
            // Ideally we'd sort in place but .sort() on the whole array scans the whole array.
            // A subarray view or copy is needed. Copying pointers is cheap.
            for (let i = 0; i < this.count; i++) {
                this.ops[i] = activeOps[i];
            }
        }
    }
    
    private compare(a: RenderOp, b: RenderOp): number {
        // High Z items (Floating UI/Effects) always on top
        if (a.z > 50 && b.z <= 50) return 1;
        if (b.z > 50 && a.z <= 50) return -1;
        
        const scoreA = a.y + a.sortBias;
        const scoreB = b.y + b.sortBias;

        if (Math.abs(scoreA - scoreB) < 2) return a.z - b.z;
        return scoreA - scoreB;
    }
}
