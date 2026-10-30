// ╔══════════════════════════════════════════════════════════╗
// ║  PolymorphPainter — 變羊：單位本體換成一隻羊               ║
// ║  職責：從 CcBodyStore 取 Blender 烘焙的羊（四向、項圈依陣營   ║
// ║        上色、白色剪影），畫在單位腳底，加上跳動壓扁伸展       ║
// ║  [ARCH] 座標沿用精靈：呼叫時 ctx 已在單位局部座標（原點＝精靈  ║
// ║  繪製原點，腳底在 footOffsetLocal，RenderSpec §4），圖集錨點  ║
// ║  （格子中心地面點）貼在 footOffsetLocal 上，不新增座標或排序   ║
// ║  規則。方向與精靈同一套（selectSpriteDirection），陣營色只經   ║
// ║  CcBodyStore 依 FACTION_SKINS 合成。執行期只有 drawImage，零   ║
// ║  分配、無 shadowBlur、無漸層。圖集未載入時回傳 false，由呼叫    ║
// ║  端畫原本的單位。                                            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { UNIT_SCALE, UNIT_SPRITE } from "../../../../constants";
import { SHEEP_BODY } from "../../../../data/units/appearance/ccBody";
import { selectSpriteDirection } from "../../../../data/units/appearance/selectSpriteFrame";
import { ccBodyStore } from "../CcBodyStore";

const S = SHEEP_BODY;

export const PolymorphPainter = {
    /**
     * 在單位局部座標（UnitBodyPainter 已 translate／scale／rotate）畫羊，腳底貼在 footOffsetLocal。
     * 跳動在腳底上做（落地微壓扁、最高點伸展）。圖集未載入時什麼都不畫並回傳 false。
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean): boolean {
        const entry = ccBodyStore.get('SHEEP');
        if (!entry || !entry.silhouette) return false;
        const f = entry.frames[selectSpriteDirection(agent, t)];
        const phase = Math.abs(Math.sin(Math.PI * S.hop.hz * t));
        const hop = phase * S.hop.height;
        const squash = 1 - S.hop.squash * (1 - phase);
        const stretch = 1 + S.hop.squash * S.hop.stretchRatio * (1 - phase);
        const k = ccBodyStore.pixelScale * S.drawScale / UNIT_SCALE;

        ctx.save();
        ctx.translate(0, UNIT_SPRITE.footOffsetLocal - hop);
        ctx.scale(stretch * k, squash * k);
        if (isSilhouette) {
            ctx.globalAlpha *= UNIT_SPRITE.silhouetteAlpha;
            ctx.drawImage(entry.silhouette, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
        } else {
            ctx.drawImage(entry.colorByTeam[agent.team], f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
            if (agent.view.hitFlashTimer > 0) {
                ctx.globalAlpha *= Math.min(1, agent.view.hitFlashTimer / UNIT_SPRITE.hitFlashDuration);
                ctx.drawImage(entry.silhouette, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
            }
        }
        ctx.restore();
        return true;
    },
};
