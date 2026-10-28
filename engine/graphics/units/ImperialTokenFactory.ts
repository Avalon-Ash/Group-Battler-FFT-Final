import { IMPERIAL_TOKEN_BAKE } from "../../../constants";
// Lionheart（BLUE）棋座程序化畫法：乾淨的金邊六角、皇家藍琺瑯頂面。
// 顏色全部來自 FACTION_SKINS（data/units/factionSkin.ts）；手繪貼圖存在時由 UnitFactory 逐層取代。
import { HexLayout } from "../../../types";
import { FactionSkin } from "../../../data/units/factionSkin";
import type { PedestalPainter } from "../UnitFactory";
import {
    PedestalOutline,
    projectIso,
    hexPlane,
    tracePedestalOutline,
    drawPedestalSlab,
    fillPedestalTop,
} from "./PedestalGeometry";

export const ImperialTokenFactory: PedestalPainter = {

    outline(skin: FactionSkin, layout: HexLayout): PedestalOutline {
        return projectIso(hexPlane(skin.pedestal.radius, layout));
    },

    drawSlab(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
        drawPedestalSlab(ctx, skin, outline);
    },

    drawTop(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
        fillPedestalTop(ctx, skin, outline);
    },

    drawRim(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline, layout: HexLayout): void {
        const p = skin.pedestal;
        ctx.save();
        ctx.lineJoin = 'miter';

        // 金邊：暗金底線＋亮金高光，連續不斷
        tracePedestalOutline(ctx, outline);
        ctx.strokeStyle = p.rimShadow;
        ctx.lineWidth = IMPERIAL_TOKEN_BAKE.RIM_SHADOW_WIDTH;
        ctx.stroke();
        ctx.strokeStyle = p.rim;
        ctx.lineWidth = IMPERIAL_TOKEN_BAKE.RIM_WIDTH;
        ctx.stroke();

        // 內緣亮線
        tracePedestalOutline(ctx, projectIso(hexPlane(p.radius - IMPERIAL_TOKEN_BAKE.INNER_RIM_INSET, layout)));
        ctx.strokeStyle = p.innerRim;
        ctx.lineWidth = IMPERIAL_TOKEN_BAKE.INNER_RIM_WIDTH;
        ctx.stroke();

        // 內環（儀表環，虛線六角）
        tracePedestalOutline(ctx, projectIso(hexPlane(p.radius * IMPERIAL_TOKEN_BAKE.RING_RADIUS, layout)));
        ctx.strokeStyle = p.ring;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    drawEmblem(ctx: CanvasRenderingContext2D, skin: FactionSkin, layout: HexLayout): void {
        // 程序化徽記：小金色六角章＋中心點（佔位，日後由 emblem 貼圖取代）
        const p = skin.pedestal;
        const er = p.radius * p.emblemScale;
        ctx.save();
        ctx.globalAlpha = p.emblemAlpha;
        tracePedestalOutline(ctx, projectIso(hexPlane(er, layout)));
        ctx.strokeStyle = p.emblem;
        ctx.lineWidth = IMPERIAL_TOKEN_BAKE.EMBLEM_WIDTH;
        ctx.stroke();
        tracePedestalOutline(ctx, projectIso(hexPlane(er * IMPERIAL_TOKEN_BAKE.EMBLEM_CORE_RADIUS, layout)));
        ctx.fillStyle = p.emblem;
        ctx.fill();
        ctx.restore();
    },
};
