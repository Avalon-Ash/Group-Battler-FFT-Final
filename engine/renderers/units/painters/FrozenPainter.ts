// ╔══════════════════════════════════════════════════════════╗
// ║  FrozenPainter — 凍結：單位被封在六角冰柱牢籠裡            ║
// ║  職責：從 CcBodyStore 取 Blender 烘焙的半透明冰柱牢籠（四向），  ║
// ║        疊在精靈之上；只在非剪影時繪製（剪影仍是單位本身）      ║
// ║  [ARCH] 座標沿用精靈：ctx 已在單位局部座標（RenderSpec §4），  ║
// ║  圖集錨點（格子中心地面點）貼在腳底 footOffsetLocal，所以和棋  ║
// ║  座同心、不新增座標或排序規則。方向與精靈同一套              ║
// ║  （selectSpriteDirection）。執行期只有 drawImage，零分配；圖集  ║
// ║  未載入時什麼都不畫。                                        ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { UNIT_SCALE, UNIT_SPRITE } from "../../../../constants";
import { ICE_BLOCK } from "../../../../data/units/appearance/ccBody";
import { selectSpriteDirection } from "../../../../data/units/appearance/selectSpriteFrame";
import { ccBodyStore } from "../CcBodyStore";

export const FrozenPainter = {
    /** 在單位局部座標畫冰柱牢籠，錨點貼在腳底（footOffsetLocal）。 */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number): void {
        const entry = ccBodyStore.get('ICE_BLOCK');
        if (!entry) return;
        const f = entry.frames[selectSpriteDirection(agent, t)];
        const k = ccBodyStore.pixelScale * ICE_BLOCK.drawScale / UNIT_SCALE;
        ctx.save();
        ctx.globalAlpha *= ICE_BLOCK.drawAlpha;
        ctx.translate(0, UNIT_SPRITE.footOffsetLocal);
        ctx.scale(k, k);
        ctx.drawImage(entry.colorByTeam[agent.team], f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
        ctx.restore();
    },
};
