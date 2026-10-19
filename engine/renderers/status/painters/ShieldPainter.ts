// ╔══════════════════════════════════════════════════════════╗
// ║  ShieldPainter — 護盾稜柱（全部是預烘焙零件）              ║
// ║  職責：貼合角色頭頂高度的六角稜柱＋上升掃描環＋上下緣陣營環 ║
// ║  [ARCH] 稜柱底面＝腳底（bodyCenterY − getVisualBodyCenterY 的 ║
// ║  反推，見 computeShieldGeometry），飛行單位的 bodyCenterY 已含 ║
// ║  升空，護盾自動跟著升。稜柱是 prism 零件（等距投影與版面烘焙 ║
// ║  在 sprite 裡，不可再旋轉／壓扁）；環是 ring 零件，貼地繪製   ║
// ║  （在地面旋轉到版面方向再壓扁 ISO_SCALE_Y）。sprite 依（版面、 ║
// ║  隊伍、高度）快取，每幀零配置。                              ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { HexLayout, Team } from "../../../../types";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { SHIELD_VISUAL, ISO_SCALE_Y } from "../../../../constants";
import { VisualMath } from "../../../math/VisualMath";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { SpriteUnitRenderer } from "../../units/factions/SpriteUnitRenderer";
import { VFX_PARTS } from "../../../../data/vfx/parts/partConfig";
import { vfxPartStore, drawPart, type PartSprite, type DrawPartOptions } from "../../vfxparts/VFXPartStore";
import { quantizeSize } from "../../vfxparts/PartSpec";

export interface ShieldGeometry {
    /** 稜柱總高度（螢幕單位） */
    height: number;
    /** 稜柱中心相對 body center Y 的垂直位移（正值＝往下），使稜柱底部貼齊腳底 */
    centerOffsetY: number;
}

/**
 * 依角色頭頂高度計算護盾稜柱幾何（純函式，便於測試）。
 * @param headHeight 腳底到頭頂的螢幕高度；null 表示圖集未就緒，退回 SHIELD_VISUAL.height
 */
export function computeShieldGeometry(headHeight: number | null): ShieldGeometry {
    const height = headHeight === null ? SHIELD_VISUAL.height : headHeight + SHIELD_VISUAL.headMargin;
    // body center 到腳底的距離：與 StatusOrchestrator 算 body center 用同一個 SSOT（VisualMath.getVisualBodyCenterY）
    const feetDropY = -VisualMath.getVisualBodyCenterY(0, 0);
    return { height, centerOffsetY: feetDropY - height / 2 };
}

interface ShieldSprites {
    prism: PartSprite;
    scans: PartSprite[];
    scanScales: number[];
    rim: PartSprite;
    rimScale: number;
}

/** key＝((版面 × 2 ＋ 隊伍編號) × 高度上限) ＋ 四捨五入的高度（Team 是 0／1 的數值列舉） */
const HEIGHT_SLOTS = 4096;
const cache = new Map<number, ShieldSprites>();
const OPTS: DrawPartOptions = { frame: 0, scale: 1, scaleY: 1, rotation: 0, alpha: 1 };

function resolve(team: Team, layout: HexLayout, height: number): ShieldSprites {
    const h = Math.round(height);
    const key = ((layout === 'POINTY' ? 2 : 0) + team) * HEIGHT_SLOTS + h;
    const hit = cache.get(key);
    if (hit) return hit;
    const S = SHIELD_VISUAL;
    const accent = getFactionSkin(team).shield.accentRamp;
    const scanR = S.SCAN_RATIOS.map((k) => S.radius * k);
    const s: ShieldSprites = {
        prism: vfxPartStore.get({ kind: 'prism', radius: S.radius, height: h, ramp: S.PRISM_RAMP, layout, style: 'glass' }),
        scans: scanR.map((r) => vfxPartStore.get({ kind: 'ring', radius: r, thickness: S.SCAN_THICKNESS, ramp: accent })),
        scanScales: scanR.map((r) => r / quantizeSize(r)),
        rim: vfxPartStore.get({ kind: 'ring', radius: S.radius, thickness: S.RIM_THICKNESS, ramp: accent }),
        rimScale: S.radius / quantizeSize(S.radius),
    };
    cache.set(key, s);
    return s;
}

function drawFlat(ctx: CanvasRenderingContext2D, sprite: PartSprite, x: number, y: number, scale: number, rotation: number, alpha: number): void {
    OPTS.scale = scale;
    OPTS.scaleY = ISO_SCALE_Y;
    OPTS.rotation = rotation;
    OPTS.alpha = alpha;
    OPTS.blend = SHIELD_VISUAL.BLEND;
    drawPart(ctx, sprite, x, y, OPTS);
}

export const ShieldPainter = {
    /**
     * 繪製包裹單位的能量護盾
     * @param y 單位視覺中心 Y（UnitFrame.bodyCenterY，已含飛行升空）
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        if (agent.shield <= 0) return;
        const S = SHIELD_VISUAL;
        const pct = Math.min(1, agent.shield / (agent.maxShield || S.DEFAULT_MAX));
        const alpha = S.BASE_ALPHA + pct * S.STRENGTH_ALPHA + Math.sin(t * S.PULSE_FREQ) * S.PULSE_ALPHA;

        const geometry = computeShieldGeometry(SpriteUnitRenderer.getHeadHeight(agent));
        const h = geometry.height;
        const baseY = y + geometry.centerOffsetY + h / 2;
        const s = resolve(agent.team, layout, h);
        const align = HexGeometry.alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD);

        // 1. 稜柱本體（立體零件：不旋轉、不壓扁；高度量化到 PRISM.STEP，誤差 ≤ 1 px）
        OPTS.scale = 1;
        OPTS.scaleY = 1;
        OPTS.rotation = 0;
        OPTS.alpha = alpha;
        OPTS.blend = S.BLEND;
        drawPart(ctx, s.prism, x, baseY, OPTS);

        // 2. 上下緣陣營環
        drawFlat(ctx, s.rim, x, baseY, s.rimScale, align, S.RIM_ALPHA);
        drawFlat(ctx, s.rim, x, baseY - h, s.rimScale, align, S.RIM_ALPHA);

        // 3. 由下往上掃過的六角環（兩道錯開半週期）
        for (let i = 0; i < s.scans.length; i++) {
            const lift = (t * S.SCAN_SPEED + h * i / s.scans.length) % h;
            drawFlat(ctx, s.scans[i], x, baseY - lift, s.scanScales[i], align, Math.min(1, alpha * S.SCAN_ALPHA_MULS[i]));
        }
    },

    /** 測試／工具用：丟掉解析快取 */
    reset(): void {
        cache.clear();
    },
};
