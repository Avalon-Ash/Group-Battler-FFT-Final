// ╔══════════════════════════════════════════════════════════╗
// ║  UnitAuraPainter — 詠唱光環（一般詠唱環、奧義聖域、AOE 擴張） ║
// ║  拆成兩部分（RenderSpec §9「懸空平面」）：                   ║
// ║  ・drawRings：腰部高度的水平環（平面），由 GroundDrapeLayer   ║
// ║    以 planeZ 逐格裁切繪製——前方較低的地塊不再蓋掉環，        ║
// ║    比環高的前景地塊照樣擋住；施法者那格的前半由 AURA op 補畫。║
// ║  ・drawCastingVFX／drawUltimateChantVFX：只剩垂直部分        ║
// ║    （上升光點、能量柱），留在 AURA op。                      ║
// ║  [ARCH] 全部是預烘焙零件（V5b）：環＝ring、聖域＝陣營 sigil、 ║
// ║  光點＝glow、能量柱＝pillar。色階＝陣營×技能屬性             ║
// ║  （data/vfx/element_ramps.ts），不吃技能顏色字串。平面零件   ║
// ║  先在地面旋轉再壓扁（drawPart scaleY＝ISO_SCALE_Y），與舊的   ║
// ║  traceRotatedHex 同一個投影；混合模式固定 CAST_RING.BLEND，   ║
// ║  鋪設的離屏貼回與施法者那格直接畫的結果一致。                 ║
// ║  sprite 依（色階、陣營）快取，每幀零配置。                    ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { HEX_SIZE, AGENT_MODEL_CENTER_Z, ISO_SCALE_Y, CAST_RING } from "../../../../constants";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { HexLayout, Team } from "../../../../types";
import { VisualMath } from "../../../math/VisualMath";
import { elementRamp, ULT_SANCTUM_EMBLEM } from "../../../../data/vfx/element_ramps";
import type { VFXRampId } from "../../../../data/vfx/parts/vfxPalette";
import { VFX_PARTS } from "../../../../data/vfx/parts/partConfig";
import { vfxPartStore, drawPart, type PartSprite } from "../../vfxparts/VFXPartStore";
import { quantizeSize } from "../../vfxparts/PartSpec";

/** 環所在平面離腳下地面的高度（螢幕 px）：與原本繪製位置相同（AURA 層偏移＋模型中心的一半） */
const RING_LIFT = VisualMath.Z_LAYERS.AURA + AGENT_MODEL_CENTER_Z * ISO_SCALE_Y;

interface AuraSprites {
    ring: PartSprite; ringScale: number;
    inner: PartSprite; innerScale: number;
    sanctum: PartSprite; sanctumScale: number;
    ultRing: PartSprite; ultRingScale: number;
    core: PartSprite; coreScale: number;
    mote: PartSprite; moteScale: number;
    pillar: PartSprite;
}

const cache = new Map<VFXRampId, Array<AuraSprites | undefined>>();

function resolve(ramp: VFXRampId, team: Team): AuraSprites {
    let entry = cache.get(ramp);
    if (!entry) { entry = []; cache.set(ramp, entry); }
    const hit = entry[team];
    if (hit) return hit;
    const C = CAST_RING;
    const ringR = HEX_SIZE * C.BASE_SIZE;
    const innerR = ringR * C.INNER_RATIO;
    const ultR = HEX_SIZE * C.ULT_SIZE;
    const coreR = ultR * C.ULT_CORE_RATIO;
    const s: AuraSprites = {
        ring: vfxPartStore.get({ kind: 'ring', radius: ringR, thickness: C.RING_THICKNESS, ramp }), ringScale: ringR / quantizeSize(ringR),
        inner: vfxPartStore.get({ kind: 'ring', radius: innerR, thickness: C.INNER_THICKNESS, ramp }), innerScale: innerR / quantizeSize(innerR),
        sanctum: vfxPartStore.get({ kind: 'sigil', radius: ultR, emblem: ULT_SANCTUM_EMBLEM[team], ramp }), sanctumScale: ultR / quantizeSize(ultR),
        ultRing: vfxPartStore.get({ kind: 'ring', radius: ultR, thickness: C.ULT_RING_THICKNESS, ramp }), ultRingScale: ultR / quantizeSize(ultR),
        core: vfxPartStore.get({ kind: 'glow', radius: coreR, ramp }), coreScale: coreR / quantizeSize(coreR),
        mote: vfxPartStore.get({ kind: 'glow', radius: C.MOTE_RADIUS, ramp, hard: true }), moteScale: C.MOTE_RADIUS / quantizeSize(C.MOTE_RADIUS),
        pillar: vfxPartStore.get({ kind: 'pillar', width: C.ULT_PILLAR_W, height: C.ULT_PILLAR_H, ramp }),
    };
    entry[team] = s;
    return s;
}

function castingSkill(agent: Agent) {
    return agent.castingSkillIdx !== -1 ? agent.skills[agent.castingSkillIdx] : undefined;
}

export const UnitAuraPainter = {
    RING_LIFT,

    /** 施法中的環在平面上的最大半徑（含光暈），GroundDrape 用來判斷蓋到哪些格；不在施法回傳 0 */
    ringRadius(agent: Agent): number {
        const skill = castingSkill(agent);
        if (!skill) return 0;
        const ring = skill.tag === 'ULT' ? HEX_SIZE * CAST_RING.ULT_SIZE : HEX_SIZE * CAST_RING.BASE_SIZE * (1 + CAST_RING.PULSE);
        const aoe = skill.tag !== 'ULT' && skill.type === 'AOE' ? (skill.aoeRadius || 1) * HEX_SIZE : 0;
        return Math.max(ring, aoe) + CAST_RING.GLOW_PAD;
    },

    /** 在原點（環平面的中心）畫施法者的所有水平環。GroundDrape 的繪製函式，也供 AURA op 補畫施法者那格的前半。 */
    drawRings(ctx: CanvasRenderingContext2D, agent: Agent, t: number, layout: HexLayout): void {
        const skill = castingSkill(agent);
        if (!skill) return;
        const C = CAST_RING;
        const s = resolve(elementRamp(agent.team, skill.element), agent.team);
        const align = HexGeometry.alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD);
        const blend = C.BLEND;
        if (skill.tag === 'ULT') {
            const rot = t * C.ULT_ROT_SPEED;
            drawPart(ctx, s.sanctum, 0, 0, { rotation: align + rot, scaleY: ISO_SCALE_Y, scale: s.sanctumScale, alpha: C.ULT_SIGIL_ALPHA, blend });
            drawPart(ctx, s.ultRing, 0, 0, { rotation: align - rot * C.ULT_INNER_ROT_MUL, scaleY: ISO_SCALE_Y, scale: s.ultRingScale, alpha: C.ULT_RING_ALPHA, blend });
            const pulse = C.ULT_CORE_ALPHA + Math.sin(t * C.ULT_CORE_PULSE_FREQ) * C.ULT_CORE_PULSE;
            drawPart(ctx, s.core, 0, 0, { scaleY: ISO_SCALE_Y, scale: s.coreScale, alpha: pulse, blend });
            return;
        }
        // 一般詠唱：外環律動＋內環反向高速旋轉
        const pulse = 1 + Math.sin(t * C.PULSE_FREQ) * C.PULSE;
        drawPart(ctx, s.ring, 0, 0, { rotation: align + t * C.ROT_SPEED, scaleY: ISO_SCALE_Y, scale: s.ringScale * pulse, alpha: C.RING_ALPHA, blend });
        drawPart(ctx, s.inner, 0, 0, { rotation: align - t * C.INNER_ROT_SPEED, scaleY: ISO_SCALE_Y, scale: s.innerScale, alpha: C.INNER_ALPHA, blend });
        // AOE：環從中心擴張到技能範圍（ease-out），越接近完成越淡
        if (skill.type === 'AOE') {
            const progress = 1 - (agent.castTimer / skill.cast);
            const radius = (skill.aoeRadius || 1) * HEX_SIZE * (1 - Math.pow(1 - progress, 4));
            const ringR = HEX_SIZE * C.BASE_SIZE;
            drawPart(ctx, s.ring, 0, 0, { rotation: align, scaleY: ISO_SCALE_Y, scale: s.ringScale * radius / ringR, alpha: (1 - progress) * C.AOE_ALPHA, blend });
        }
    },

    /** 一般詠唱的垂直部分（繞圈上升的光點）。y＝腳下繪製點 */
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, _layout: HexLayout) {
        const skill = castingSkill(agent);
        if (!skill) return;
        const C = CAST_RING;
        const s = resolve(elementRamp(agent.team, skill.element), agent.team);
        const cy = y - RING_LIFT;
        for (let i = 0; i < C.MOTES; i++) {
            const offset = i * (Math.PI * 2 / C.MOTES);
            const cycle = (t * C.MOTE_CYCLE_SPEED + offset) % 1;
            const r = (1 - cycle) * C.MOTE_ORBIT;
            const angle = t * C.MOTE_SPIN + offset;
            const px = x + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r * ISO_SCALE_Y - cycle * C.MOTE_RISE;
            drawPart(ctx, s.mote, px, py, { scale: s.moteScale, alpha: Math.sin(cycle * Math.PI) * C.MOTE_ALPHA });
        }
    },

    /** 奧義詠唱的垂直部分（聖域外緣隔一個頂點升起的能量柱）。y＝腳下繪製點 */
    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        const skill = castingSkill(agent);
        if (!skill) return;
        const C = CAST_RING;
        const progress = 1 - (agent.castTimer / skill.cast);
        const pillarH = C.ULT_PILLAR_H * progress;
        if (pillarH <= C.ULT_PILLAR_MIN_H) return;
        const s = resolve(elementRamp(agent.team, skill.element), agent.team);
        const verts = HexGeometry.getVertices(HEX_SIZE * C.ULT_SIZE * C.ULT_PILLAR_RING, true, layout);
        const sy = pillarH / C.ULT_PILLAR_H;
        for (let i = 0; i < verts.length; i += 2) {
            const alpha = (C.ULT_PILLAR_ALPHA + C.ULT_PILLAR_FLICKER * Math.sin(t * C.ULT_PILLAR_FLICKER_FREQ + i)) * progress;
            drawPart(ctx, s.pillar, x + verts[i].x, y - RING_LIFT + verts[i].y, { scaleY: sy, alpha });
        }
    },

    /** 測試／工具用：丟掉解析快取 */
    reset(): void {
        cache.clear();
    },
};
