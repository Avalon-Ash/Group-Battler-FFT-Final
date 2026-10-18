// ╔══════════════════════════════════════════════════════════╗
// ║  UnitAuraPainter — 詠唱光環（一般詠唱環、奧義聖域、AOE 擴張） ║
// ║  拆成兩部分（RenderSpec §9「懸空平面」）：                   ║
// ║  ・drawRings：腰部高度的水平環（平面），由 GroundDrapeLayer   ║
// ║    以 planeZ 逐格裁切繪製——前方較低的地塊不再蓋掉環，        ║
// ║    比環高的前景地塊照樣擋住；施法者那格的前半由 AURA op 補畫。║
// ║  ・drawCastingVFX／drawUltimateChantVFX：只剩垂直部分        ║
// ║    （上升粒子、能量柱），留在 AURA op。                      ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { HEX_SIZE, AGENT_MODEL_CENTER_Z, ISO_SCALE_Y, CAST_RING } from "../../../../constants";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../types";
import { VisualMath } from "../../../math/VisualMath";

/** 環所在平面離腳下地面的高度（螢幕 px）：與原本繪製位置相同（AURA 層偏移＋模型中心的一半） */
const RING_LIFT = VisualMath.Z_LAYERS.AURA + AGENT_MODEL_CENTER_Z * ISO_SCALE_Y;

export const UnitAuraPainter = {
    RING_LIFT,

    /** 施法中的環在平面上的最大半徑（含光暈），GroundDrape 用來判斷蓋到哪些格；不在施法回傳 0 */
    ringRadius(agent: Agent): number {
        const skill = agent.castingSkillIdx !== -1 ? agent.skills[agent.castingSkillIdx] : undefined;
        if (!skill) return 0;
        const ring = skill.tag === 'ULT' ? HEX_SIZE * CAST_RING.ULT_SIZE : HEX_SIZE * CAST_RING.BASE_SIZE * (1 + CAST_RING.PULSE);
        const aoe = skill.tag !== 'ULT' && skill.type === 'AOE' ? (skill.aoeRadius || 1) * HEX_SIZE : 0;
        return Math.max(ring, aoe) + CAST_RING.GLOW_PAD;
    },

    /** 在原點（環平面的中心）畫施法者的所有水平環。GroundDrape 的繪製函式，也供 AURA op 補畫施法者那格的前半。 */
    drawRings(ctx: CanvasRenderingContext2D, agent: Agent, t: number, layout: HexLayout): void {
        const skill = agent.castingSkillIdx !== -1 ? agent.skills[agent.castingSkillIdx] : undefined;
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        ctx.save();
        ctx.strokeStyle = color;
        if (skill.tag === 'ULT') {
            const ultSize = HEX_SIZE * CAST_RING.ULT_SIZE;
            const rot = t * 1.5;
            // Layer 0: 外部柔光光暈 (雙層描邊取代昂貴的 shadowBlur)
            ctx.save();
            ctx.lineWidth = 8;
            ctx.globalAlpha = 0.25;
            HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize, rot, true, layout);
            ctx.stroke();
            ctx.restore();
            // Layer 1: 外部神聖格線 (核心線)
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.85;
            HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize, rot, true, layout);
            ctx.stroke();
            // Layer 2: 內部符文環 (虛線幾何)
            ctx.save();
            ctx.lineWidth = 1;
            ctx.setLineDash(CAST_RING.ULT_DASH);
            ctx.globalAlpha = 0.5;
            HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize * 0.85, -rot * 0.8, true, layout);
            ctx.stroke();
            ctx.restore();
            // Layer 3: 中心匯聚點
            ctx.globalAlpha = 0.3 + Math.sin(t * 15) * 0.2;
            ctx.fillStyle = color;
            HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize * 0.4, rot * 4, true, layout);
            ctx.fill();
        } else {
            // 法陣半徑隨律動震盪
            const currentSize = HEX_SIZE * CAST_RING.BASE_SIZE * (1.0 + Math.sin(t * 12) * CAST_RING.PULSE);
            const rotA = t * 3;
            // 柔和外光暈層
            ctx.save();
            ctx.lineWidth = 6;
            ctx.globalAlpha = 0.2;
            HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize, rotA, true, layout);
            ctx.stroke();
            ctx.restore();
            // 核心外環
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize, rotA, true, layout);
            ctx.stroke();
            // 幾何核心 (內環：逆時針，高頻旋轉)
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize * 0.7, -t * 6, true, layout);
            ctx.stroke();
            // AOE：精確的邊界擴張波紋
            if (skill.type === 'AOE') UnitAuraPainter.drawAoeExpansion(ctx, 0, 0, color, progress, skill.aoeRadius || 1, layout);
        }
        ctx.restore();
    },

    /** 一般詠唱的垂直部分（上升粒子）。y＝腳下繪製點 */
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, _layout: HexLayout) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        ctx.save();
        ctx.translate(x, y - RING_LIFT);
        UnitAuraPainter.drawRisingParticles(ctx, skill.color, progress, t);
        ctx.restore();
    },

    /** 奧義詠唱的垂直部分（能量柱）。y＝腳下繪製點 */
    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        const pillarH = CAST_RING.ULT_PILLAR_H * progress;
        if (pillarH <= CAST_RING.ULT_PILLAR_MIN_H) return;
        ctx.save();
        ctx.translate(x, y - RING_LIFT);
        ctx.fillStyle = skill.color;
        const points = HexGeometry.getVertices(HEX_SIZE * CAST_RING.ULT_SIZE * 0.7, true, layout);
        points.forEach((p, i) => {
            if (i % 2 === 0) {
                ctx.globalAlpha = (0.2 + 0.3 * Math.sin(t * 8 + i)) * progress;
                ctx.fillRect(p.x - 1, p.y - pillarH, 2, pillarH);
            }
        });
        ctx.restore();
    },

    /**
     * 繪製 AOE 擴張波紋 (Vector Ripple)
     */
    drawAoeExpansion(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, progress: number, rangeInTiles: number, layout: HexLayout) {
        ctx.save();
        ctx.translate(x, y);

        // 數學半徑：根據網格尺寸精確映射
        const maxPixelRadius = rangeInTiles * HEX_SIZE;
        const easedRadius = maxPixelRadius * (1 - Math.pow(1 - progress, 4));

        ctx.strokeStyle = color;
        ctx.fillStyle = color;

        // 1. 波導前端
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (1 - progress) * 0.7;
        HexGeometry.traceHex(ctx, 0, 0, easedRadius, true, layout);
        ctx.stroke();

        // 2. 內部漫反射
        ctx.globalAlpha = (1 - progress) * 0.08;
        ctx.fill();

        ctx.restore();
    },

    drawRisingParticles(ctx: CanvasRenderingContext2D, color: string, progress: number, t: number) {
        ctx.fillStyle = color;
        const count = 3;
        for(let i=0; i<count; i++) {
            const offset = i * (Math.PI * 2 / count);
            const cycle = (t * 2.5 + offset) % 1;

            const h = cycle * 70;
            const r = (1 - cycle) * 35;
            const angle = t * 5 + offset;

            const px = Math.cos(angle) * r;
            const py = (Math.sin(angle) * r * 0.5) - h;

            const alpha = Math.sin(cycle * Math.PI) * 0.8;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
    }
};
