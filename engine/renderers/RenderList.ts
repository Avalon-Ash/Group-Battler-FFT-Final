
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
    oWarning: boolean = false;
    agent: Agent | null = null;
    alpha: number = 1.0;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    isGround: boolean = false;
    particle: Particle | null = null;
    vProgress: number = 0;
    vChaos: boolean = false;
    pVisX: number = 0; pVisY: number = 0; pVisShadowY: number = 0;
    pSkillVis: string = ''; pColor: string = '';
    pIsUlt: boolean = false; pAngle: number = 0; pSpin: number = 0;
    pScale: number = 1.0; 
    pSpeed: number = 0;
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
        this.alpha = 1.0;
        this.particle = null;
        this.proj = null;
        this.pIsUlt = false; 
        this.pScale = 1.0;
        this.oRange = false;
        this.oHover = false;
        this.oWarning = false;
        this.oStatus = undefined;
        this.oHazard = undefined;
        this.oDanger = undefined;
        this.uSelected = false;
        this.uSilhouette = false;
        this.isGround = false;
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
             * 唯一數學排序規範 v18.0 (Interleaved Depth Sort)
             * 
             * 在等角投影中，深度由 Y 軸 (Footprint Y) 決定。
             * 為了正確處理遮擋，地形與單位必須交錯排序。
             */
            
            const baseSortY = op.y;
            let sortKey = Math.floor((baseSortY + 10000) * 100);
            
            // 同一 Y 軸位置下的子層級排序 (0-99)
            let subLayer = 0;
            if (op.type === RenderOpType.TERRAIN) subLayer = 10;
            else if (op.type === RenderOpType.DECAL || op.isGround) subLayer = 20;
            else if (op.type === RenderOpType.HAZARD) subLayer = 30;
            else if (op.type === RenderOpType.OBSTACLE) subLayer = 40;
            else if (op.type === RenderOpType.UNIT) subLayer = 45;
            else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) subLayer = 50;
            
            sortKey += subLayer;

            // Tiebreaker: 對 UNIT，用 px 的小數部分增加確定性
            if (op.type === RenderOpType.UNIT && op.agent) {
                sortKey += (op.agent.px % 1) * 0.001;
            }

            // 特殊：奧義/高空特效絕對置頂
            if (op.pIsUlt || op.z > 600) sortKey += 100000000;

            op.sortKey = sortKey;
            this.sortView[i] = op;
        }

        const activeSegment = this.sortView.slice(0, this.count);
        activeSegment.sort((a, b) => a.sortKey - b.sortKey);

        for (let i = 0; i < this.count; i++) {
            this.ops[i] = activeSegment[i];
        }
    }
}
