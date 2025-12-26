
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
    sortBias: number = 0; // Added for manual Z-depth tweaking
    
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
    oHazard: GroundHazard | undefined; // NEW
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
    private capacity: number = 4000;

    constructor() {
        for(let i=0; i<this.capacity; i++) this.ops.push(new RenderOp());
    }
    
    public reset() {
        this.count = 0;
    }
    
    public next(): RenderOp {
        if (this.count >= this.ops.length) {
            for(let i=0; i<1000; i++) this.ops.push(new RenderOp());
        }
        const op = this.ops[this.count++];
        op.sortBias = 0; // Reset bias on reuse
        return op;
    }
    
    public sort() {
        if (this.count > 1) {
            this.quickSort(0, this.count - 1);
        }
    }
    
    private quickSort(left: number, right: number) {
        if (left >= right) return;
        const pivot = this.ops[(left + right) >>> 1]; 
        const index = this.partition(left, right, pivot);
        this.quickSort(left, index - 1);
        this.quickSort(index, right);
    }
    
    private partition(left: number, right: number, pivot: RenderOp): number {
        while (left <= right) {
            while (this.compare(this.ops[left], pivot) < 0) left++;
            while (this.compare(this.ops[right], pivot) > 0) right--;
            if (left <= right) {
                const temp = this.ops[left];
                this.ops[left] = this.ops[right];
                this.ops[right] = temp;
                left++;
                right--;
            }
        }
        return left;
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
