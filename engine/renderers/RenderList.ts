
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
    
    // Sort Key (Calculated once)
    sortKey: number = 0;
    
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
    
    // Double buffer approach for sorting
    private sortBuffer: RenderOp[] = [];
    private capacity: number = 8000;

    constructor() {
        for(let i=0; i<this.capacity; i++) {
            this.ops.push(new RenderOp());
            this.sortBuffer.push(new RenderOp()); 
        }
    }
    
    public reset() {
        this.count = 0;
    }
    
    public next(): RenderOp {
        if (this.count >= this.ops.length) {
            // Panic expand
            for(let i=0; i<1000; i++) {
                this.ops.push(new RenderOp());
                this.sortBuffer.push(new RenderOp());
            }
        }
        const op = this.ops[this.count++];
        op.sortBias = 0; 
        return op;
    }
    
    public sort() {
        if (this.count > 1) {
            // 1. Calculate Sort Keys for Active Ops (Batch Processing)
            // Concept: (Layer * 10,000,000) + (Y * 1000) + Z
            // Layer 0: Ground/Low
            // Layer 1: High/Air (Z > 50)
            // Using integer math avoids slow float comparisons in the sort function
            
            for (let i = 0; i < this.count; i++) {
                const op = this.ops[i];
                // Bias high-Z items (Projectiles, Flying Units, UI FX) to draw last in same-y situations
                // Shift by 10,000,000 to segregate "Air Layer"
                const layerScore = (op.z > 50) ? 10000000 : 0;
                
                // Y-Sorting (Primary Depth)
                // Multiply Y by 1000 to preserve sub-pixel order if integers, 
                // but rounding usually fine. Using Math.floor ensures stable int key.
                // Add sortBias for manual tweaking (e.g. Decals below Units)
                const yScore = Math.floor(op.y + op.sortBias) * 1000;
                
                // Z-Sorting (Secondary Depth)
                // Within same Y line, higher Z draws on top
                const zScore = Math.floor(op.z);
                
                op.sortKey = layerScore + yScore + zScore;
            }

            // 2. Copy active pointers to buffer
            for (let i = 0; i < this.count; i++) {
                this.sortBuffer[i] = this.ops[i];
            }
            
            // 3. Sort buffer (Fast Integer Compare)
            const activeView = this.sortBuffer.slice(0, this.count);
            activeView.sort((a, b) => a.sortKey - b.sortKey);
            
            // 4. Copy back
            for (let i = 0; i < this.count; i++) {
                this.ops[i] = activeView[i];
            }
        }
    }
}
