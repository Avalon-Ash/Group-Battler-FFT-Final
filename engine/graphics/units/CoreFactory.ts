// 棋座核心（懸浮六角晶體）的烘焙：Lionheart 乾淨稜晶、Ashen 裂紋碎晶。
// 顏色與樣式來自 FACTION_SKINS（skin.core），尺寸來自 constants/units.ts 的 CORE_VISUAL。
// 本檔只在烘焙期執行（SpriteManager 快取），每幀只剩兩次 drawImage。
// 若 manifest 登記了 `core` 貼圖槽，晶體本體改用貼圖，光暈仍由皮膚色烘焙。

import { CORE_VISUAL } from "../../../constants";
import { CoreSkin, FactionSkin } from "../../../data/units/factionSkin";
import { createCanvas } from "../CanvasUtils";

export interface CoreSprites {
    /** 晶體本體（畫布中心＝晶體中心） */
    body: HTMLCanvasElement;
    /** 光暈（以 lighter 疊加，強度隨施法變化） */
    glow: HTMLCanvasElement;
}

type Pt = [number, number];

function tracePoly(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
}

/** 乾淨的六角雙錐稜晶：左半受光、右半背光，頂面一塊高光，金色細邊 */
function drawPrism(ctx: CanvasRenderingContext2D, c: CoreSkin, w: number, h: number): void {
    const top: Pt = [0, -h];
    const bottom: Pt = [0, h];
    const ul: Pt = [-w, -h * 0.4];
    const ur: Pt = [w, -h * 0.4];
    const ll: Pt = [-w, h * 0.4];
    const lr: Pt = [w, h * 0.4];

    tracePoly(ctx, [top, ul, ll, bottom]);
    ctx.fillStyle = c.light;
    ctx.fill();
    tracePoly(ctx, [top, ur, lr, bottom]);
    ctx.fillStyle = c.dark;
    ctx.fill();

    // 頂面高光與內芯
    tracePoly(ctx, [top, ul, [0, -h * 0.15]]);
    ctx.fillStyle = c.highlight;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = c.inner;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.05, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 腰線（六角腰）與細邊
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(ul[0], ul[1]); ctx.lineTo(0, -h * 0.15); ctx.lineTo(ur[0], ur[1]);
    ctx.moveTo(ll[0], ll[1]); ctx.lineTo(0, h * 0.15); ctx.lineTo(lr[0], lr[1]);
    ctx.stroke();
    ctx.globalAlpha = 1;
    tracePoly(ctx, [top, ur, lr, bottom, ll, ul]);
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'miter';
    ctx.stroke();
}

/** 碎裂的深紅碎晶：頂端缺角、右側崩口、一條透出餘燼的裂縫，焦黑粗邊 */
function drawShard(ctx: CanvasRenderingContext2D, c: CoreSkin, w: number, h: number): void {
    const top: Pt = [w * 0.25, -h * 1.05];
    const chip: Pt = [w * 0.55, -h * 0.72];
    const ur: Pt = [w * 0.9, -h * 0.35];
    const notch: Pt = [w * 0.62, -h * 0.05];
    const lr: Pt = [w * 0.95, h * 0.42];
    const bottom: Pt = [-w * 0.1, h];
    const ll: Pt = [-w * 0.95, h * 0.38];
    const ul: Pt = [-w, -h * 0.45];
    const outline: Pt[] = [top, chip, ur, notch, lr, bottom, ll, ul];

    tracePoly(ctx, outline);
    ctx.fillStyle = c.dark;
    ctx.fill();
    // 受光的左半
    tracePoly(ctx, [top, ul, ll, bottom, [-w * 0.05, h * 0.1], [w * 0.05, -h * 0.5]]);
    ctx.fillStyle = c.light;
    ctx.fill();
    tracePoly(ctx, [top, ul, [-w * 0.1, -h * 0.35]]);
    ctx.fillStyle = c.highlight;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 裂縫：深色底線＋餘燼亮線
    const crack: Pt[] = [[w * 0.1, -h * 0.75], [-w * 0.2, -h * 0.35], [w * 0.15, -h * 0.05], [-w * 0.15, h * 0.35], [w * 0.05, h * 0.8]];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(crack[0][0], crack[0][1]);
    for (let i = 1; i < crack.length; i++) ctx.lineTo(crack[i][0], crack[i][1]);
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = c.inner;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    tracePoly(ctx, outline);
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'miter';
    ctx.stroke();
}

function bakeBody(skin: FactionSkin, texture: CanvasImageSource | null): HTMLCanvasElement {
    const size = CORE_VISUAL.canvasSize;
    const { canvas, ctx } = createCanvas(size, size);
    if (texture) {
        ctx.drawImage(texture, 0, 0, size, size);
        return canvas;
    }
    const c = skin.core;
    ctx.translate(size / 2, size / 2);
    const w = CORE_VISUAL.halfWidth * c.sizeScale;
    const h = CORE_VISUAL.halfHeight * c.sizeScale;
    if (c.style === 'ASHEN_SHARD') drawShard(ctx, c, w, h);
    else drawPrism(ctx, c, w, h);
    return canvas;
}

function bakeGlow(skin: FactionSkin): HTMLCanvasElement {
    const size = CORE_VISUAL.canvasSize;
    const { canvas, ctx } = createCanvas(size, size);
    const r = CORE_VISUAL.halfHeight * skin.core.sizeScale * 2.1;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, r);
    g.addColorStop(0, skin.core.glow);
    g.addColorStop(0.35, skin.core.glow + '66');
    g.addColorStop(1, skin.core.glow + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
}

export const CoreFactory = {
    generate(skin: FactionSkin, texture: CanvasImageSource | null): CoreSprites {
        return { body: bakeBody(skin, texture), glow: bakeGlow(skin) };
    },
};
