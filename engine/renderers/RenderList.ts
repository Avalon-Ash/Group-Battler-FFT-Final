
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
    pScale: number = 1.0; // New: Data-driven scale factor
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
        this.pScale = 1.0;
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
             * 唯一數學排序規範 v17.0 (Topological Ground Sort)
             * 
             * 1. 瓦片排序 (Terrain): 僅依賴 (q + r) 進行拓撲排序。
             *    - 高度 (th) 不參與排序，僅參與繪製幾何延伸。
             *    - 這保證了後方瓦片的地基永遠在前方瓦片的地基之前繪製。
             * 
             * 2. 物件排序 (Unit/Prop):
             *    - 物件依賴其 Screen Y (op.y) 進行排序。
             *    - op.y = py + offset (物理腳底位置)。
             */
            
            let sortKey = 0;

            if (op.type === RenderOpType.TERRAIN) {
                // 地形層：基礎權重 0 ~ 20,000,000
                // (q + r) 決定了 Isometric 的掃描線順序
                // 加上 2000 偏移量確保正數
                sortKey = (op.tq + op.tr + 2000) * 1000;
            } 
            else {
                // 物件層：基礎權重 20,000,000 +
                // 物件需要與地形混合，因此使用 Screen Y 映射到類似的量級
                // 但為了簡單起見，目前架構將物件層置於地形層之上 (Layered approach)
                // 若要實現單位被前方高牆遮擋，單位與地形需混合排序。
                
                // 混合排序策略：
                // 使用 (ScreenY * Scale) 作為統一標準
                // 但 RenderOp.TERRAIN 的 ScreenY 是指 BaseY。
                
                // 為了修復 "地板穿插"，我們採用分層策略：
                // 地形永遠先畫 (Layer 0)
                // 地面裝飾 (Layer 1)
                // 單位/障礙物 (Layer 2) - 依 Y 軸排序
                // 飛行物/特效 (Layer 3)
                
                let layerBase = 0;
                if (op.type === RenderOpType.HAZARD || op.type === RenderOpType.DECAL) layerBase = 20000000;
                else if (op.type === RenderOpType.OBSTACLE || op.type === RenderOpType.UNIT) layerBase = 40000000;
                else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) layerBase = 60000000;
                
                // 同層內依 Screen Y 排序 (由後至前 -> Y 值由小到大)
                sortKey = layerBase + Math.floor(op.y * 100) + Math.floor(op.z);
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
