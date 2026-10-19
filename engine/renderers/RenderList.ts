// ╔══════════════════════════════════════════════════════════╗
// ║  RenderList — RenderOp 池與深度排序（SUB_LAYER 唯一定義點） ║
// ║  職責：sortKey＝floor((op.y＋sortBias＋tiebreak＋10000)*100) ║
// ║        ＋subLayer。鍵只含足跡 Y、op.sortBias 與固定平局值：  ║
// ║        沒有高度 z 加權（空中特效的前緣由 VFXRenderer 以      ║
// ║        sortBias 提交，RenderSpec §2），也沒有「單位站在      ║
// ║        法陣上」的抬升（大型平貼特效改由 GroundDrapeLayer     ║
// ║        鋪在格子頂面，§9）。唯一例外：z > 600／奧義 +1e8      ║
// ║        （永遠最上層，投射物靠它）。                           ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §1、§2。       ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../game";
import type { UnitFrame } from "./frame/UnitFrame";
import { Particle } from "../presentation/vfx/state";
import { Projectile, Point, SpatialHazard, Team, ActiveZone } from "../../types";
import type { TerrainTheme } from "../../constants";

export enum RenderOpType {
    TERRAIN,
    OBSTACLE,
    UNIT,
    VFX,
    PROJECTILE,
    HAZARD,
    AURA,
    OVERLAY,
    CORPSE
}

export class RenderOp {
    type: RenderOpType = RenderOpType.TERRAIN;
    sortKey: number = 0;
    y: number = 0; 
    z: number = 0; 
    tx: number = 0; ty: number = 0; th: number = 0; 
    tsize: number = 0; ttheme: TerrainTheme | null = null;
    tq: number = 0; tr: number = 0;
    tEdge: number = 0; // 地形鄰格高度遮罩（6-bit，見 GridCache.CachedTile.edgeMask）
    tBase: number = 0; // 島嶼底座深度級數（見 GridCache.CachedTile.baseLevel）
    ttype: string = ''; tdetail: string = '';
    oStatus: string | undefined;
    oDanger: ActiveZone | undefined;
    oHazard: SpatialHazard | undefined;
    oLightCol: string | null = null;
    oLightInt: number = 0;
    oRange: boolean = false;
    oRangeCol: string = '';
    oHover: boolean = false;
    oHasUnit: boolean = false;
    oWarning: boolean = false;
    oLastStand: boolean = false;
    agent: Agent | null = null;
    /** UNIT／CORPSE：本幀的 UnitFrame（殘影偏移來源；唯讀） */
    unitFrame: UnitFrame | null = null;
    alpha: number = 1.0;
    uSelected: boolean = false;
    uSilhouette: boolean = false;
    isGround: boolean = false;
    sortBias: number = 0; // 排序前緣偏移（RenderSpec §2）
    /** 貼地 VFX 的投影後半寬／半高（前緣 sortBias 的來源；大型平貼特效已改鋪設，不進排序，RenderSpec §9） */
    gHalfW: number = 0; gHalfH: number = 0;
    particle: Particle | null = null;
    vProgress: number = 0;
    pVisX: number = 0; pVisY: number = 0;
    /** 投射物外觀鍵（PROJECTILE_VISUALS）與施法者陣營（共用外觀依陣營選色階） */
    pLookKey: string = ''; pTeam: Team = Team.BLUE;
    pIsUlt: boolean = false; pAngle: number = 0; pSpin: number = 0;
    pSpeed: number = 0;
    pTrail: Point[] = []; 
    proj: Projectile | null = null;
    time: number = 0;

    public clear() {
        this.type = RenderOpType.TERRAIN;
        this.sortKey = 0;
        this.y = 0; this.z = 0;
        this.tx = 0; this.ty = 0; this.th = 0;
        this.tq = 0; this.tr = 0;
        this.tEdge = 0;
        this.tBase = 0;
        this.agent = null;
        this.unitFrame = null;
        this.alpha = 1.0;
        this.particle = null;
        this.proj = null;
        this.pIsUlt = false;
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
        this.gHalfW = 0; this.gHalfH = 0;
        this.ttheme = null;
        // [PERF5] 重用自有陣列，不每幀配置；只有 ProjectilePartPainter 在同一幀內區域讀取
        this.pTrail.length = 0;
    }
}

// [ARCH] RenderList — 所有 subLayer 的唯一定義點
// 數值之間保留足夠間距供未來插入新層級
const SUB_LAYER = {
    TERRAIN:        10,
    HAZARD:         30,
    GROUND_VFX:     32,   // isGround VFX，高於危險區但低於單位
    AURA:           38,   // [FIX] 從 35 改到 38，緊貼 UNIT 下方，確保光環在 OBSTACLE 後渲染
    OVERLAY:        42,   // [FIX] 從 25 改到 42，確保互動指示圈壓在障礙物之上但在 UNIT 之後
    OBSTACLE:       44,
    UNIT:           46,
    CORPSE:         48,   // [ARCH] 死亡單位 Ragdoll，subLayer 在 UNIT 之後，EFFECT 之下
    AIR_VFX:        50,   // isGround=false 的 VFX
    PROJECTILE:     50,
} as const;

// [ARCH] Tiebreak 偏移：僅解決同格深度平局，不影響跨格遮蔽邏輯
// 值必須遠小於相鄰格 screenY 差距（約 24px），建議不超過 2.0
const CORPSE_TIEBREAK = 0.5;
const VFX_TIEBREAK = 1.0;

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
            let finalSortY = op.y + (op.sortBias || 0);

            // [ARCH] Tiebreak: 確保在同一個 Y 坐標（同格）時，渲染順序符合預期
            // 屍體高於單位，VFX 高於屍體
            if (op.type === RenderOpType.CORPSE) {
                finalSortY += CORPSE_TIEBREAK;
            } else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) {
                finalSortY += VFX_TIEBREAK;
            }

            let sortKey = Math.floor((finalSortY + 10000) * 100);

            // Sub-layer within same Y bucket (unchanged)
            let subLayer = 0;
            if (op.type === RenderOpType.TERRAIN) subLayer = SUB_LAYER.TERRAIN;
            else if (op.type === RenderOpType.OVERLAY) subLayer = SUB_LAYER.OVERLAY;
            else if (op.type === RenderOpType.HAZARD) subLayer = SUB_LAYER.HAZARD;
            else if (op.type === RenderOpType.AURA) subLayer = SUB_LAYER.AURA;
            else if (op.type === RenderOpType.OBSTACLE) subLayer = SUB_LAYER.OBSTACLE;
            else if (op.type === RenderOpType.UNIT) subLayer = SUB_LAYER.UNIT;
            else if (op.type === RenderOpType.CORPSE) subLayer = SUB_LAYER.CORPSE;
            else if (op.type === RenderOpType.VFX || op.type === RenderOpType.PROJECTILE) {
                // Ground VFX sits at 32 - above HAZARD(30)/AURA(35) but below OBSTACLE(40)
                // so that nearby obstacles correctly occlude ground effects.
                subLayer = op.isGround ? SUB_LAYER.GROUND_VFX : SUB_LAYER.AIR_VFX;
            }

            sortKey += subLayer;
            
            // 空中特效／投射物的高度 z 不進排序鍵：舊的 `op.z * 20`（z>0）與固定 `+60`（z==0）和 y*100 互相抵銷，
            // 往下掉的碎片會相對地塊、單位、疊層逐幀翻轉（docs/COORD_GUARD_FINDINGS.md H3）。
            // 鍵對粒子壽命單調：只看足跡 Y（粒子在地面的投影）＋ VFXRenderer 提交的固定 sortBias（VFX_RENDER.AIR_SORT_BIAS）。

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
