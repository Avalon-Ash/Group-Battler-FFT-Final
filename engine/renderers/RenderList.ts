
import { Agent } from "../game";
import { Particle } from "../systems/vfx/state";
import { Projectile, Point, GroundHazard } from "../../types";

export enum RenderOpType {
    TERRAIN,
    OBSTACLE,
    UNIT,
    VFX,
    PROJECTILE,
    DECAL,
    HAZARD
}

export class RenderOp {
    type: RenderOpType = RenderOpType.TERRAIN;
    sortKey: number = 0;
    y: number = 0; 
    z: number = 0; 
    tx: number = 0; ty: number = 0; th: number = 0; 
    tsize: number = 0; ttheme: any = null;
    tq: number = 0; tr: number = 0;
    ttype: string = ''; tdetail: string = '';
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
    pVisX: number = 0; pVisY: number = 0; pVisShadowY: number = 0;
    pSkillVis: string = ''; pColor: string = '';
    pIsUlt: boolean = false; pAngle: number = 0; pSpin: number = 0;
    pTrail: Point[] = []; 
    proj: Projectile | null = null;
    dColor: string = ''; dScale: number = 1; dLife: number = 0;
    time: number = 0;

    public clear() {
        this.type = RenderOpType.TERRAIN;
        this.sortKey = 0;
        this.y = 0; this.z = 0;
        this.tx = 0; this.ty = 0; this.th = 0;
        this.tq = 0; this.tr = 0;
        this.agent = null;
        this.particle = null;
        this.proj = null;
        this.pIsUlt = false; 
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
        op.clear(); 
        return op;
    }

    public sort() {
        if (this.count <= 1) return;
        for (let i = 0; i < this.count; i++) {
            const op = this.ops[i];
            
            /**
             * 唯一數學排序規範 v16.0 (Diamond Depth Sorting)
             * 
             * 1. 基底深度 (Base Depth): q + r 決定了在六邊形網格中的「排隊順序」。
             * 2. 高度偏置 (Height Bias): 瓦片本身的 Tier (th / BLOCK_HEIGHT)。
             * 3. 類別優先權 (Layer): 確保單位在瓦片頂面之上。
             */
            
            // 基礎座標權重：等角空間中的掃描線位置
            const coordDepth = (op.tq + op.tr) * 10000;
            
            // 高度權重：瓦片越高，視覺位置越靠前
            const heightTier = (op.th / 24) * 100;
            
            // 類別權重
            let layerScore = 0;
            if (op.type === RenderOpType.UNIT || op.type === RenderOpType.OBSTACLE) layerScore = 500;
            else if (op.type === RenderOpType.HAZARD) layerScore = 100;
            else if (op.type === RenderOpType.DECAL) layerScore = 50;

            // 針對奧義與飛行物的特殊處理 (絕對置頂)
            if (op.pIsUlt || op.z > 400) layerScore = 10000000;

            op.sortKey = coordDepth + heightTier + layerScore;
            this.sortView[i] = op;
        }

        const activeSegment = this.sortView.slice(0, this.count);
        activeSegment.sort((a, b) => a.sortKey - b.sortKey);

        for (let i = 0; i < this.count; i++) {
            this.ops[i] = activeSegment[i];
        }
    }
}
