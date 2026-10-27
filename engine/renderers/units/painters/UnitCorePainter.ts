// ╔══════════════════════════════════════════════════════════╗
// ║  UnitCorePainter — 棋座核心（懸浮六角晶體）              ║
// ║  世界觀：棋座才是本體，核心是把角色投影出來的投影器；     ║
// ║  投影成形後，核心藏到角色後面，只有光暈從輪廓邊緣透出。   ║
// ║  位置：投影可見（活著、出生完成、非拖曳預覽）→ 投影中心   ║
// ║  （VisualMath.getProjectionCenterY，與發射點／受擊點       ║
// ║  VisualMath.projectionCenterAt 同一個高度公式）；跟著      ║
// ║  physics.z 與受擊晃動。分兩層畫：BEHIND（角色之前畫，被   ║
// ║  角色擋住、不蓋住臉；平時幾乎看不見，施法／受擊時光暈     ║
// ║  放大 behindGlowScale 從邊緣亮起）與 FRONT（角色之後畫）。║
// ║  投影不可見（拖曳預覽、放置幽靈、出生前）→ 實體寶石懸在   ║
// ║  棋座上（CORE_VISUAL.hoverHeight），走 FRONT。出生期間依  ║
// ║  spawnTimer 從棋座升到投影中心，FRONT 淡出、BEHIND 淡入。 ║
// ║  只做 drawImage：晶體與光暈都是烘焙好的 sprite。         ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §4。     ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../core/Agent";
import { BodyTypeId, HexLayout, Role, Team } from "../../../../types";
import { CORE_VISUAL, UNIT_SCALE, UNIT_SPRITE } from "../../../../constants";
import { SpriteManager } from "../../../sprites";
import { resolveBodyType } from "../../../../data/units/appearance/bodyTypes";
import { VisualMath } from "../../../math/VisualMath";

const TWO_PI = Math.PI * 2;

export interface CoreDrawOptions {
    /** 施法中：光暈拉滿並略微放大 */
    casting: boolean;
    /** 整體不透明度（放置預覽用半透明） */
    alpha: number;
    /** 浮動相位偏移（讓同場單位的核心不同步） */
    phase: number;
    /** 寶石中心離 ctx 原點（棋座地面）的高度；省略＝CORE_VISUAL.hoverHeight */
    lift?: number;
    /** 投影化程度 0..1：0＝實體寶石（棋座上）、1＝藏進投影中心的淡色寶石；省略＝0 */
    projected?: number;
    /** 受擊閃光程度 0..1（hitFlashTimer 正規化）；省略＝0 */
    flash?: number;
    /** 畫在角色後面：光暈放大 CORE_VISUAL.behindGlowScale，從角色輪廓邊緣透出 */
    behind?: boolean;
}

/** BEHIND＝角色之前畫（被角色擋住），FRONT＝角色之後畫 */
export type CoreLayer = 'BEHIND' | 'FRONT';

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const UnitCorePainter = {
    /**
     * @param ctx 已平移到棋座中心（地面，與 UnitShadowPainter 同一原點）
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, layout: HexLayout, layer: CoreLayer): void {
        if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;

        const body = resolveBodyType(agent);
        const isDragPreview = agent.dragOverQ !== null || agent.dragOverR !== null;
        let projected = 0;
        if (!isDragPreview) {
            if (agent.spawnTimer > 0) {
                // 出生：核心把角色投影出來——寶石從棋座升到投影中心（easeOutCubic）
                const progress = 1 - Math.min(1, agent.spawnTimer / UNIT_SPRITE.spawnDuration);
                projected = 1 - Math.pow(1 - progress, 3);
            } else {
                projected = 1;
            }
        }
        // 投影成形的部分在 BEHIND 層，實體寶石的部分在 FRONT 層；出生期間兩層交叉淡入淡出
        const weight = layer === 'BEHIND' ? projected : 1 - projected;
        if (weight <= 0) return;

        const pz = isNaN(agent.physics?.z) ? 0 : agent.physics.z;
        // 與模擬端同一個高度公式（ctx 原點＝腳底，所以 floor = 0）：不含受擊晃動，晃動在下面當純繪製位移加上去
        const centerLift = -VisualMath.getProjectionCenterY(0, pz, body);
        const lift = lerp(CORE_VISUAL.hoverHeight, centerLift, projected);

        ctx.save();
        if (projected > 0) {
            // 投影跟著受擊晃動（UnitBodyPainter 以 visualOffset 平移身體）
            ctx.translate(agent.view.visualOffset.x * projected, agent.view.visualOffset.y * projected);
        }
        UnitCorePainter.drawCore(ctx, agent.team, agent.role, body, layout, t, {
            casting: agent.castingSkillIdx !== -1,
            alpha: weight,
            phase: agent.q * 1.7 + agent.r * 2.9,
            lift,
            projected,
            flash: Math.min(1, Math.max(0, agent.view.hitFlashTimer / UNIT_SPRITE.hitFlashDuration)),
            behind: layer === 'BEHIND',
        });
        ctx.restore();
    },

    drawCore(
        ctx: CanvasRenderingContext2D,
        team: Team, role: Role, body: BodyTypeId, layout: HexLayout,
        t: number, opts: CoreDrawOptions
    ): void {
        const { core } = SpriteManager.getUnitImages(role, team, body, layout);
        const k = opts.projected ?? 0;
        const lift = opts.lift ?? CORE_VISUAL.hoverHeight;
        // 投影成形後寶石不再上下浮動（它藏在角色裡，浮動由角色本身的待機起伏負責）
        const bob = Math.sin((t / CORE_VISUAL.bobPeriod + opts.phase) * TWO_PI) * CORE_VISUAL.bobAmplitude * (1 - k);
        const pulse = Math.sin(t * 5 + opts.phase);
        const solidGlow = opts.casting
            ? CORE_VISUAL.castGlow + pulse * CORE_VISUAL.castGlowPulse
            : CORE_VISUAL.idleGlow + pulse * CORE_VISUAL.idleGlowPulse;
        const projectedGlow = opts.casting
            ? CORE_VISUAL.projectedCastGlow + pulse * CORE_VISUAL.castGlowPulse
            : CORE_VISUAL.projectedGlow + pulse * CORE_VISUAL.projectedGlowPulse;
        const glow = lerp(solidGlow, projectedGlow, k) + (opts.flash ?? 0) * CORE_VISUAL.hitGlow;
        const scale = UNIT_SCALE * (opts.casting ? CORE_VISUAL.castScale : 1);
        const half = CORE_VISUAL.canvasSize / 2;
        const glowHalf = half * (opts.behind ? CORE_VISUAL.behindGlowScale : 1);

        ctx.save();
        ctx.translate(0, -(lift + bob));
        ctx.scale(scale, scale);
        ctx.globalAlpha = opts.alpha * Math.min(1, Math.max(0, glow));
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(core.glow, -glowHalf, -glowHalf, glowHalf * 2, glowHalf * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opts.alpha * lerp(1, CORE_VISUAL.projectedAlpha, k);
        ctx.drawImage(core.body, -half, -half);
        ctx.restore();
    },
};
