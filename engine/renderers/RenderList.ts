
import { Agent } from "../game";
import { Particle } from "../systems/vfx/state";
import { Projectile, Point } from "../../types";

export enum RenderOpType {
    TERRAIN,
    OBSTACLE,
    UNIT,
    VFX,
    PROJECTILE,
    DECAL
}

// Data-container for a single render operation.
// Reused every frame to avoid GC.
export class RenderOp {
    type: RenderOpType = RenderOpType.TERRAIN;
    y: number = 0; // World Y for sorting
    z: number = 0; // Secondary sort key
    
    // --- TERRAIN / OBSTACLE DATA ---
    tx: number = 0; 
    ty: number = 0; // Visual Y
    th: number = 0; // Height
    tsize: number = 0;
    ttheme: any = null;
    tq: number = 0;
    tr: number = 0;
    ttype: string = ''; // Texture or Obstacle ID
    tdetail: string = '';
    
    // Overlays
    oStatus: string | undefined;
    oDanger: any;
    oLightCol: string | null = null;
    oLightInt: number = 0;
    oRange: boolean = false;
    oRangeCol: string = '';
    oHover: boolean = false;
    oHasUnit: boolean = false;
    
    // --- UNIT DATA ---
    agent: Agent | null = null;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    
    // --- VFX DATA ---
    particle: Particle | null = null;
    vProgress: number = 0;
    vChaos: boolean = false;
    
    // --- PROJECTILE DATA ---
    // We store visual calc results here to avoid recalculating during draw
    pVisX: number = 0;
    pVisY: number = 0;
    pVisShadowY: number = 0;
    pSkillVis: string = '';
    pColor: string = '';
    pIsUlt: boolean = false;
    pAngle: number = 0;
    pSpin: number = 0;
    
    // Updated: Store pre-calculated visual trail points
    pTrail: Point[] = []; 
    
    proj: Projectile | null = null;
    
    // --- DECAL DATA ---
    dColor: string = '';
    dScale: number = 1;
    dLife: number = 0;
    
    // Global Context
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
            // Expand pool if necessary (rare)
            for(let i=0; i<1000; i++) this.ops.push(new RenderOp());
        }
        return this.ops[this.count++];
    }
    
    // In-place QuickSort for the active subset of the array
    public sort() {
        if (this.count > 1) {
            this.quickSort(0, this.count - 1);
        }
    }
    
    private quickSort(left: number, right: number) {
        if (left >= right) return;
        const pivot = this.ops[(left + right) >>> 1]; // Fast floor
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
        // "Always Top" Layer (z > 50)
        if (a.z > 50 && b.z <= 50) return 1;
        if (b.z > 50 && a.z <= 50) return -1;
        
        // Y-Sort (Depth)
        // Fuzzy compare to prevent z-fighting on same line
        if (Math.abs(a.y - b.y) < 2) return a.z - b.z;
        return a.y - b.y;
    }
}
