// ╔══════════════════════════════════════════════════════════╗
// ║  PolymorphPainter — 變羊：單位本體換成一隻羊               ║
// ║  職責：CcBodyStore 核可短腿羊，四向各四幀、無項圈／陣營色。║
// ║        腳底原點與 Blender 點頭序列原樣使用，不另加跳躍。    ║
// ║  [ARCH] 座標沿用精靈：呼叫時 ctx 已在單位局部座標（原點＝精靈  ║
// ║  繪製原點，腳底在 footOffsetLocal，RenderSpec §4），圖集錨點  ║
// ║  （格子中心地面點）貼在 footOffsetLocal 上，不新增座標或排序   ║
// ║  規則。方向與精靈同一套（selectSpriteDirection），時間取 t。  ║
// ║  執行期只有 drawImage，零                                  ║
// ║  分配、無 shadowBlur、無漸層。圖集未載入時回傳 false，由呼叫    ║
// ║  端畫原本的單位。                                            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { UNIT_SCALE, UNIT_SPRITE } from "../../../../constants";
import { SHEEP_BODY } from "../../../../data/units/appearance/ccBody";
import { selectSpriteDirection } from "../../../../data/units/appearance/selectSpriteFrame";
import { ccBodyStore } from "../CcBodyStore";
import { poisonMaterialStore } from '../../status/PoisonMaterialStore';
import { isStatusVisible } from '../../status/StatusActivity';

const S = SHEEP_BODY;
const poisonRect = { dx: 0, dy: 0, dw: 0, dh: 0, screenScale: 1, localScale: 1 };

export const PolymorphPainter = {
    /**
     * 在單位局部座標（UnitBodyPainter 已 translate／scale／rotate）畫羊，腳底貼在 footOffsetLocal。
     * 四幀點頭已烘在素材，無額外跳動。圖集未載入時什麼都不畫並回傳 false。
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean): boolean {
        const entry = ccBodyStore.get('SHEEP');
        if (!entry || !entry.silhouette) return false;
        const direction = selectSpriteDirection(agent, t);
        const frames = entry.animationFrames?.[direction];
        if (!frames) return false;
        const f = frames[Math.floor(t * S.fps) % frames.length];
        const k = S.drawScale / UNIT_SCALE;
        const dx = f.drawX * k, dy = f.drawY * k;
        const dw = f.drawW * k, dh = f.drawH * k;

        ctx.save();
        ctx.translate(0, UNIT_SPRITE.footOffsetLocal);
        if (isSilhouette) {
            ctx.globalAlpha *= UNIT_SPRITE.silhouetteAlpha;
            ctx.drawImage(entry.silhouette, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
        } else {
            poisonRect.dx = dx; poisonRect.dy = dy; poisonRect.dw = dw; poisonRect.dh = dh;
            if (!(isStatusVisible('POISON', agent) && poisonMaterialStore.draw(ctx, S.materialKey, frames,
                f, 1, poisonRect, dx, entry.colorByTeam[0]))) {
                ctx.drawImage(entry.colorByTeam[0], f.x, f.y, f.w, f.h, dx, dy, dw, dh);
            }
            if (agent.view.hitFlashTimer > 0) {
                ctx.globalAlpha *= Math.min(1, agent.view.hitFlashTimer / UNIT_SPRITE.hitFlashDuration);
                ctx.drawImage(entry.silhouette, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
            }
        }
        ctx.restore();
        return true;
    },
};
