
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
    HAZARD,
    AURA,
    OVERLAY = 8
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
    oLastStand: boolean = false;
    agent: Agent | null = null;
    alpha: number = 1.0;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    isGround: boolean = false;
    sortBias: number = 0; // NEW: SSOT depth sorting adjustment (mostly for ground decals)
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
    simDt: number = 0.016;

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
        this.oLastStand = false;
        this.oStatus = undefined;
        this.oHazard = undefined;
        this.oDanger = undefined;
        this.uSelected = false;
        this.uSilhouette = false;
        this.isGround = false;
        this.sortBias = 0;
        this.vChaos = false;
        this.ttheme = null;
        this.pTrail = [];
    }
}

// [ARCH] RenderList — 所有 subLayer 的唯一定義點
// 數值之間保留足夠間距供未來插入新層級
const SUB_LAYER = {
    TERRAIN:        10,
    DECAL:          20,
    HAZARD:         30,
    GROUND_VFX:     32,   // isGround VFX，高於危險區但低於單位
    AURA:           38,   // [FIX] 從 35 改到 38，緊貼 UNIT 下方，確保光環在 OBSTACLE 後渲染
    OVERLAY:        42,   // [FIX] 從 25 改到 42，確保互動指示圈壓在障礙物之上但在 UNIT 之後
    OBSTACLE:       44,
    UNIT:           46,
    AIR_VFX:        50,   // isGround=false 的 VFX
    PROJECTILE:     50,
} as const;

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

            // SSOT: Use base world Y plus a conceptual "sort bias" (e.g. front edge of a decal)
            const baseSortY = op.y + (op.sortBias || 0);
            let sortKey = Math.floor((baseSortY + 10000) * 100);

            // Sub-layer within same Y bucket (unchanged)
            let subLayer = 0;
            if (op.type === RenderOpType.TERRAIN) subLayer = SUB_LAYER.TERRAIN;
            else if (op.type === RenderOpType.DECAL) subLayer = SUB_LAYER.DECAL;
            else if (op.type === RenderOpType.OVERLAY) subLayer = SUB_LAYER.OVERLAY;
            else if (op.type === RenderOpType.HAZARD) subLayer = SUB_LAYER.HAZARD;
            else if (op.type === RenderOpType.AURA) subLayer = SUB_LAYER.AURA;
            else if (op.type === RenderOpType.OBSTACLE) subLayer = SUB_LAYER.OBSTACLE;
            else if (op.type === RenderOpType.UNIT) subLayer = SUB_LAYER.UNIT;
            else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) {
                // Ground VFX sits at 32 - above HAZARD(30)/AURA(35) but below OBSTACLE(40)
                // so that nearby obstacles correctly occlude ground effects.
                subLayer = op.isGround ? SUB_LAYER.GROUND_VFX : SUB_LAYER.AIR_VFX;
            }

            sortKey += subLayer;

            // ── FIX: VFX z-height sort compensation ──────────────────────────
            // Ground-locked VFX (BLAST, SHOCKWAVE, RING, etc.) have op.z set by
            // VFXRenderer but the sort algo never uses it. As a result, terrain tiles
            // further from camera (higher Y) override VFX subLayer advantage and clip
            // on top of effects. We inject op.z as a sort boost so effects with any
            // elevation always sort in front of terrain at the same footprint.
            //
            // Case A: isGround — no boost applied. subLayer 32 is enough.
            // Case B: air effect (z > 0) — add op.z * 20 boost.
            // Case C: zero-height non-ground — add flat +60 boost.
            if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) {
                if (!op.isGround) {
                    if (op.z > 0) {
                        sortKey += op.z * 20;   // Case B
                    } else {
                        sortKey += 60;          // Case C
                    }
                }
            }
            // ─────────────────────────────────────────────────────────────────

            // Tiebreaker for UNIT determinism (unchanged)
            if (op.type === RenderOpType.UNIT && op.agent) {
                const idHash = parseInt(op.agent.id.slice(-4), 36) % 100;
                sortKey += idHash * 0.00001;
            }

            // Absolute override: ULT / sky-high effects (unchanged)
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
