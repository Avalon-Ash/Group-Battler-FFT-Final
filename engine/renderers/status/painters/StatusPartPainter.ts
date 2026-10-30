// ╔══════════════════════════════════════════════════════════╗
// ║  StatusPartPainter — 狀態／控制效果的六角零件繪製           ║
// ║  職責：依 STATUS_PARTS 把預烘焙零件（PartSprite）畫在單位    ║
// ║        腳下／投影中心／頭頂；執行期只有 drawImage 與變換     ║
// ║  [ARCH] 疊加規則：頭頂標記（HEAD 層）與腳下圈（flat 的 GROUND   ║
// ║  層）每個單位各只畫優先序最高的那個狀態，其餘狀態只留身上      ║
// ║  （BODY／立體 GROUND）的零件（全部狀態另列在 HUD 圖示列）。    ║
// ║  錨點：GROUND＝floorY − physics.z；BODY＝投影中心；           ║
// ║  HEAD＝頭頂 + HEAD_MARGIN（RenderSpec §4）。總覽層繪製（單位  ║
// ║  之後），所以貼地層限制在腳下那格（GROUND_MAX_RADIUS），不做   ║
// ║  鋪設。解析後的 sprite 依（隊伍、版面、狀態）快取，品質階層   ║
// ║  改變時整份重解；每幀不配置物件。                            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { Team, type HexLayout } from "../../../../types";
import {
    STATUS_PARTS, STATUS_PART_ORDER, STATUS_PART_RENDER,
    type StatusPartKey, type StatusPartLayer, type StatusAnchor,
} from "../../../../data/vfx/status_parts";
import { resolveBodyType } from "../../../../data/units/appearance/bodyTypes";
import { projectionCenterHeight, projectionTopHeight } from "../../../../data/units/appearance/projection";
import { getQualityTier } from "../../RenderQuality";
import { resolvePartLayer, drawPartLayer, layoutAlign, type ResolvedPartLayer } from "../../vfxparts/PartLayerPainter";
import type { UnitFrame } from "../../frame/UnitFrame";
import { isStatusActive } from "../StatusActivity";

type ResolvedLayer = ResolvedPartLayer<StatusPartLayer>;

const ORDER_LEN = STATUS_PART_ORDER.length;
const LAYOUTS: readonly HexLayout[] = ['FLAT', 'POINTY'];
const TEAMS = 2;
const ANCHORS: readonly StatusAnchor[] = ['GROUND', 'BODY', 'HEAD'];

/** resolved[team][layoutIdx][orderIdx]：同一組的所有層；undefined＝尚未解析 */
const resolved: (ResolvedLayer[] | undefined)[][][] = Array.from({ length: TEAMS }, () => LAYOUTS.map(() => new Array<ResolvedLayer[] | undefined>(ORDER_LEN)));
let resolvedTier = -1;

/** 每幀暫存（重用，不配置） */
const activeIdx = new Int16Array(ORDER_LEN);

function layersOf(key: StatusPartKey): readonly StatusPartLayer[] {
    return STATUS_PARTS[STATUS_PARTS[key].alias ?? key].layers;
}

function resolveSet(orderIdx: number, team: number, layoutIdx: number): ResolvedLayer[] {
    const out: ResolvedLayer[] = [];
    for (const layer of layersOf(STATUS_PART_ORDER[orderIdx])) out.push(resolvePartLayer(layer, team, LAYOUTS[layoutIdx]));
    return out;
}

export const StatusPartPainter = {
    draw(ctx: CanvasRenderingContext2D, frame: UnitFrame, t: number, layout: HexLayout): void {
        const agent: Agent = frame.agent;
        const tier = getQualityTier();
        if (tier !== resolvedTier) {
            for (const perTeam of resolved) for (const perLayout of perTeam) perLayout.fill(undefined);
            resolvedTier = tier;
        }

        // 1. 依優先序挑出成立的狀態（截斷；頭頂標記由優先序最高者獨占）
        const maxSets = STATUS_PART_RENDER.MAX_SETS_BY_TIER[Math.min(tier, STATUS_PART_RENDER.MAX_SETS_BY_TIER.length - 1)];
        let nActive = 0;
        // 頭頂標記與腳下圈的唯一贏家：activeIdx 依優先序排列，所以第一個擁有該類層的狀態就是贏家（-1＝沒有）
        let headWinner = -1;
        let groundWinner = -1;
        for (let i = 0; i < ORDER_LEN && nActive < maxSets; i++) {
            const key = STATUS_PART_ORDER[i];
            if (!isStatusActive(key, agent)) continue;
            // 別名在原狀態成立時由原狀態自己畫
            const alias = STATUS_PARTS[key].alias;
            if (alias && isStatusActive(alias, agent)) continue;
            const layers = layersOf(key);
            for (let j = 0; j < layers.length; j++) {
                const L = layers[j];
                if (headWinner < 0 && L.anchor === 'HEAD') headWinner = nActive;
                else if (groundWinner < 0 && L.anchor === 'GROUND' && L.flat) groundWinner = nActive;
            }
            activeIdx[nActive++] = i;
        }
        if (nActive === 0) return;

        // 2. 錨點（全部來自 UnitFrame + projection SSOT）
        const body = resolveBodyType(agent);
        const z = isNaN(agent.physics?.z) ? 0 : agent.physics.z;
        const groundY = frame.floorY - z + STATUS_PART_RENDER.GROUND_BIAS;
        const bodyY = frame.floorY - z - projectionCenterHeight(body);
        const headY = frame.floorY - z - projectionTopHeight(body) - STATUS_PART_RENDER.HEAD_MARGIN;
        const x = frame.footX;
        const teamIdx = agent.team === Team.RED ? 1 : 0;
        const layoutIdx = layout === 'POINTY' ? 1 : 0;
        const align = layoutAlign(layout);
        const cutDecor = tier >= STATUS_PART_RENDER.DECOR_CUT_TIER;
        // 放逐中：只畫放逐／凝滯，其他狀態只留腳下層（沿用原行為：地面 CC 繼續顯示）
        const banished = agent.banished;

        // 3. 腳下 → 身體 → 頭頂（後者蓋在前者上）
        for (let pass = 0; pass < 3; pass++) {
            const anchor = ANCHORS[pass];
            const ay = pass === 0 ? groundY : pass === 1 ? bodyY : headY;
            for (let k = 0; k < nActive; k++) {
                const oi = activeIdx[k];
                const key = STATUS_PART_ORDER[oi];
                if (banished && pass !== 0 && key !== 'BANISH' && key !== 'STASIS') continue;
                if (anchor === 'HEAD' && k !== headWinner) continue;
                let set = resolved[teamIdx][layoutIdx][oi];
                if (!set) { set = resolveSet(oi, teamIdx, layoutIdx); resolved[teamIdx][layoutIdx][oi] = set; }
                for (let j = 0; j < set.length; j++) {
                    const r = set[j];
                    if (r.layer.anchor !== anchor) continue;
                    if (r.layer.flat && anchor === 'GROUND' && k !== groundWinner) continue;
                    if (cutDecor && r.layer.decor) continue;
                    drawPartLayer(ctx, r, x, ay, t, align);
                }
            }
        }
    },
};
