// 放置預覽：在游標所在格畫「實體」（棋座＋職業字形＋核心），不畫角色投影。
// 角色投影要等放下後由 PLACE_AGENT 產生的單位以出生效果投射出來。
// 與場上單位共用同一組烘焙（SpriteManager.getUnitImages）與核心位置（CORE_VISUAL）。

import { BodyTypeId, HexLayout, Role, Team } from "../../../../types";
import { CORE_VISUAL, UNIT_SCALE } from "../../../../constants";
import { SpriteManager } from "../../../sprites";
import { UnitCorePainter } from "./UnitCorePainter";

export const PedestalGhostPainter = {
    /**
     * @param ctx 已套用鏡頭變換的世界座標 context
     * @param x, y 棋座中心（世界 x、已扣掉地形高度的等距視覺 y）
     */
    draw(
        ctx: CanvasRenderingContext2D,
        team: Team, role: Role, body: BodyTypeId, layout: HexLayout,
        x: number, y: number, t: number
    ): void {
        const { base } = SpriteManager.getUnitImages(role, team, body, layout);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = CORE_VISUAL.ghostAlpha;
        ctx.save();
        ctx.scale(UNIT_SCALE, UNIT_SCALE);
        ctx.drawImage(base, -64, -64);
        ctx.restore();
        UnitCorePainter.drawCore(ctx, team, role, body, layout, t, { casting: false, alpha: CORE_VISUAL.ghostAlpha, phase: 0 });
        ctx.restore();
    },
};
