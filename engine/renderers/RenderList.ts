
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

            const baseSortY = op.y;
            let sortKey = Math.floor((baseSortY + 10000) * 100);

            // Sub-layer within same Y bucket (unchanged)
            let subLayer = 0;
            if (op.type === RenderOpType.TERRAIN) subLayer = 10;
            else if (op.type === RenderOpType.DECAL || op.isGround) subLayer = 20;
            else if (op.type === RenderOpType.HAZARD) subLayer = 30;
            else if (op.type === RenderOpType.OBSTACLE) subLayer = 40;
            else if (op.type === RenderOpType.UNIT) subLayer = 45;
            else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) subLayer = 50;

            sortKey += subLayer;

            // ── FIX: VFX z-height sort compensation ──────────────────────────
            // Ground-locked VFX (BLAST, SHOCKWAVE, RING, etc.) have op.z set by
            // VFXRenderer but the sort algo never uses it. As a result, terrain tiles
            // further from camera (higher Y) override VFX subLayer advantage and clip
            // on top of effects. We inject op.z as a sort boost so effects with any
            // elevation always sort in front of terrain at the same footprint.
            //
            // For ground effects: op.z = GROUND_Z_BIAS = 5, boost = 5 * 20 = 100.
            // For mid-air effects: op.z = particle.z (can be 50–400), boost is larger.
            // This is always safe because the pIsUlt / z > 600 path already handles
            // sky-high effects with a 100,000,000 absolute override below.
            if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) {
                if (op.z > 0) {
                    sortKey += op.z * 20;
                } else {
                    // Ground-locked effect with z=0: still needs to clear terrain subLayer.
                    // Add a flat +60 to guarantee VFX (subLayer 50) beats OBSTACLE (40)
                    // and TERRAIN (10) even when z is not populated.
                    sortKey += 60;
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
