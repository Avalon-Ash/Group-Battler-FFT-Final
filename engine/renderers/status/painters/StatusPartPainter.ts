// ╔══════════════════════════════════════════════════════════╗
// ║  StatusPartPainter — 狀態／控制效果的六角零件繪製           ║
// ║  職責：依 STATUS_PARTS 把預烘焙零件（PartSprite）畫在單位    ║
// ║        腳下／投影中心／頭頂；執行期只有 drawImage 與變換     ║
// ║  上游：data/vfx/status_parts.ts（表）、StatusActivity（成立）、║
// ║        UnitFrame（floorY、footX）、projection（頭頂／中心高度）║
// ║        、VFXPartStore（烘焙快取）                            ║
// ║  [ARCH] 錨點：GROUND＝floorY − physics.z；BODY＝投影中心；    ║
// ║  HEAD＝頭頂 + HEAD_MARGIN（RenderSpec §4）。總覽層繪製（單位  ║
// ║  之後），所以貼地層限制在腳下那格（GROUND_MAX_RADIUS），不做   ║
// ║  鋪設。解析後的 sprite 依（隊伍、版面、狀態）快取，品質階層   ║
// ║  改變時整份重解；每幀不配置物件。                            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { Team, type HexLayout } from "../../../../types";
import { ISO_SCALE_Y } from "../../../../constants";
import { VFX_PARTS } from "../../../../data/vfx/parts/partConfig";
import {
    STATUS_PARTS, STATUS_PART_ORDER, STATUS_PART_RENDER,
    type StatusPartKey, type StatusPartLayer, type StatusAnchor,
} from "../../../../data/vfx/status_parts";
import { resolveBodyType } from "../../../../data/units/appearance/bodyTypes";
import { projectionCenterHeight, projectionTopHeight } from "../../../../data/units/appearance/projection";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { getQualityTier } from "../../RenderQuality";
import { vfxPartStore, drawPart, partFrameAt, type PartSprite, type DrawPartOptions } from "../../vfxparts/VFXPartStore";
import type { UnitFrame } from "../../frame/UnitFrame";
import { isStatusActive } from "../StatusActivity";

const TAU = Math.PI * 2;
/** 上升層水平散佈用的黃金角（rad），讓份數不排成一直線 */
const GOLDEN_ANGLE = 2.399;

interface ResolvedLayer {
    layer: StatusPartLayer;
    sprite: PartSprite;
    /** 繞行／上升的份數（至少 1） */
    count: number;
}

const ORDER_LEN = STATUS_PART_ORDER.length;
const LAYOUTS: readonly HexLayout[] = ['FLAT', 'POINTY'];
const TEAMS = 2;
const ANCHORS: readonly StatusAnchor[] = ['GROUND', 'BODY', 'HEAD'];

/** resolved[team][layoutIdx][orderIdx]：同一組的所有層；undefined＝尚未解析 */
const resolved: (ResolvedLayer[] | undefined)[][][] = Array.from({ length: TEAMS }, () => LAYOUTS.map(() => new Array<ResolvedLayer[] | undefined>(ORDER_LEN)));
let resolvedTier = -1;

/** 每幀暫存（重用，不配置） */
const activeIdx = new Int16Array(ORDER_LEN);
const headBlocked = new Uint8Array(ORDER_LEN);
const OPTS: DrawPartOptions = { frame: 0, scale: 1, scaleY: 1, rotation: 0, alpha: 1 };

function layersOf(key: StatusPartKey): readonly StatusPartLayer[] {
    return STATUS_PARTS[STATUS_PARTS[key].alias ?? key].layers;
}

function resolveSet(orderIdx: number, team: number, layoutIdx: number): ResolvedLayer[] {
    const align = HexGeometry.alignRotation(LAYOUTS[layoutIdx], VFX_PARTS.HEX.ANGLE_OFFSET_RAD);
    const out: ResolvedLayer[] = [];
    for (const layer of layersOf(STATUS_PART_ORDER[orderIdx])) {
        const spec = team === 1 && layer.rampRed && 'ramp' in layer.spec ? { ...layer.spec, ramp: layer.rampRed } : layer.spec;
        out.push({ layer, sprite: vfxPartStore.get(spec, layer.flat ? align : 0), count: Math.max(1, layer.count ?? 1) });
    }
    return out;
}

function drawLayer(ctx: CanvasRenderingContext2D, r: ResolvedLayer, x: number, y: number, t: number, align: number): void {
    const L = r.layer;
    const orbitR = L.orbitRadius ?? 0;
    const orbitSpd = L.orbitSpeed ?? 0;
    let scale = L.scale ?? 1;
    if (L.pulse) scale *= 1 + L.pulse.amp * Math.sin(t * TAU * L.pulse.hz);
    let lift = L.lift ?? 0;
    if (L.bob) lift += L.bob.amp * Math.sin(t * TAU * L.bob.hz);
    let rotation = L.rotation ?? 0;
    if (L.spin) rotation += t * L.spin;
    if (L.flat) rotation += align;
    const shakeX = L.shake ? Math.sin(t * TAU * STATUS_PART_RENDER.SHAKE_HZ) * L.shake : 0;
    const shakeY = L.shake ? Math.cos(t * TAU * STATUS_PART_RENDER.SHAKE_HZ * 1.3) * L.shake * 0.5 : 0;
    const frame = partFrameAt(r.sprite, t);
    const baseAlpha = L.alpha ?? 1;
    const n = r.count;
    for (let i = 0; i < n; i++) {
        const phase = i / n;
        let ox = 0;
        let oy = 0;
        let alpha = baseAlpha;
        if (L.rise) {
            const p = (t / L.rise.period + phase) % 1;
            oy = -p * L.rise.height;
            alpha *= Math.sin(p * Math.PI);
            ox = Math.cos(phase * TAU * GOLDEN_ANGLE) * orbitR;
        } else if (orbitR > 0) {
            const a = phase * TAU + t * orbitSpd;
            ox = Math.cos(a) * orbitR;
            oy = Math.sin(a) * orbitR * ISO_SCALE_Y;
        }
        OPTS.frame = frame;
        OPTS.scale = scale;
        OPTS.scaleY = L.flat ? ISO_SCALE_Y : 1;
        OPTS.rotation = rotation;
        OPTS.alpha = alpha;
        OPTS.blend = L.blend;
        drawPart(ctx, r.sprite, x + ox + shakeX, y - lift + oy + shakeY, OPTS);
    }
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
        let headTaken = false;
        for (let i = 0; i < ORDER_LEN && nActive < maxSets; i++) {
            const key = STATUS_PART_ORDER[i];
            if (!isStatusActive(key, agent)) continue;
            // 別名在原狀態成立時由原狀態自己畫
            const alias = STATUS_PARTS[key].alias;
            if (alias && isStatusActive(alias, agent)) continue;
            const layers = layersOf(key);
            let hasHead = false;
            for (let j = 0; j < layers.length; j++) if (layers[j].anchor === 'HEAD') { hasHead = true; break; }
            headBlocked[nActive] = hasHead && headTaken ? 1 : 0;
            if (hasHead) headTaken = true;
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
        const align = HexGeometry.alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD);
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
                if (anchor === 'HEAD' && headBlocked[k] === 1) continue;
                let set = resolved[teamIdx][layoutIdx][oi];
                if (!set) { set = resolveSet(oi, teamIdx, layoutIdx); resolved[teamIdx][layoutIdx][oi] = set; }
                for (let j = 0; j < set.length; j++) {
                    const r = set[j];
                    if (r.layer.anchor !== anchor) continue;
                    if (cutDecor && r.layer.decor) continue;
                    drawLayer(ctx, r, x, ay, t, align);
                }
            }
        }
    },
};
