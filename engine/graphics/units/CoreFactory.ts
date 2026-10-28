import { CORE_BAKE } from "../../../constants";
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
    const ul: Pt = [-w, -h * CORE_BAKE.PRISM_SHOULDER_Y];
    const ur: Pt = [w, -h * CORE_BAKE.PRISM_SHOULDER_Y];
    const ll: Pt = [-w, h * CORE_BAKE.PRISM_SHOULDER_Y];
    const lr: Pt = [w, h * CORE_BAKE.PRISM_SHOULDER_Y];

    tracePoly(ctx, [top, ul, ll, bottom]);
    ctx.fillStyle = c.light;
    ctx.fill();
    tracePoly(ctx, [top, ur, lr, bottom]);
    ctx.fillStyle = c.dark;
    ctx.fill();

    // 頂面高光與內芯
    tracePoly(ctx, [top, ul, [0, -h * CORE_BAKE.PRISM_WAIST_Y]]);
    ctx.fillStyle = c.highlight;
    ctx.globalAlpha = CORE_BAKE.PRISM_HIGHLIGHT_ALPHA;
    ctx.fill();
    ctx.globalAlpha = CORE_BAKE.PRISM_INNER_ALPHA;
    ctx.fillStyle = c.inner;
    ctx.beginPath();
    ctx.ellipse(0, h * CORE_BAKE.PRISM_INNER_Y, w * CORE_BAKE.PRISM_INNER_WIDTH, h * CORE_BAKE.PRISM_INNER_HEIGHT, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 腰線（六角腰）與細邊
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    ctx.globalAlpha = CORE_BAKE.PRISM_WAIST_ALPHA;
    ctx.beginPath();
    ctx.moveTo(ul[0], ul[1]); ctx.lineTo(0, -h * CORE_BAKE.PRISM_WAIST_Y); ctx.lineTo(ur[0], ur[1]);
    ctx.moveTo(ll[0], ll[1]); ctx.lineTo(0, h * CORE_BAKE.PRISM_WAIST_Y); ctx.lineTo(lr[0], lr[1]);
    ctx.stroke();
    ctx.globalAlpha = 1;
    tracePoly(ctx, [top, ur, lr, bottom, ll, ul]);
    ctx.lineWidth = CORE_BAKE.PRISM_OUTLINE_WIDTH;
    ctx.lineJoin = 'miter';
    ctx.stroke();
}

/** 碎裂的深紅碎晶：頂端缺角、右側崩口、一條透出餘燼的裂縫，焦黑粗邊 */
function drawShard(ctx: CanvasRenderingContext2D, c: CoreSkin, w: number, h: number): void {
    const top: Pt = [w * CORE_BAKE.SHARD_TOP_X, -h * CORE_BAKE.SHARD_TOP_Y];
    const chip: Pt = [w * CORE_BAKE.SHARD_CHIP_X, -h * CORE_BAKE.SHARD_CHIP_Y];
    const ur: Pt = [w * CORE_BAKE.SHARD_UPPER_RIGHT_X, -h * CORE_BAKE.SHARD_UPPER_RIGHT_Y];
    const notch: Pt = [w * CORE_BAKE.SHARD_NOTCH_X, -h * CORE_BAKE.SHARD_NOTCH_Y];
    const lr: Pt = [w * CORE_BAKE.SHARD_LOWER_RIGHT_X, h * CORE_BAKE.SHARD_LOWER_RIGHT_Y];
    const bottom: Pt = [-w * CORE_BAKE.SHARD_BOTTOM_LEFT, h];
    const ll: Pt = [-w * CORE_BAKE.SHARD_LOWER_LEFT_X, h * CORE_BAKE.SHARD_LOWER_LEFT_Y];
    const ul: Pt = [-w, -h * CORE_BAKE.SHARD_UPPER_LEFT_Y];
    const outline: Pt[] = [top, chip, ur, notch, lr, bottom, ll, ul];

    tracePoly(ctx, outline);
    ctx.fillStyle = c.dark;
    ctx.fill();
    // 受光的左半
    tracePoly(ctx, [top, ul, ll, bottom, [-w * CORE_BAKE.SHARD_LIGHT_LOWER_LEFT, h * CORE_BAKE.SHARD_LIGHT_LOWER_Y], [w * CORE_BAKE.SHARD_LIGHT_UPPER_X, -h * 0.5]]);
    ctx.fillStyle = c.light;
    ctx.fill();
    tracePoly(ctx, [top, ul, [-w * CORE_BAKE.SHARD_HIGHLIGHT_LEFT, -h * CORE_BAKE.SHARD_HIGHLIGHT_Y]]);
    ctx.fillStyle = c.highlight;
    ctx.globalAlpha = CORE_BAKE.SHARD_HIGHLIGHT_ALPHA;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 裂縫：深色底線＋餘燼亮線
    const crack: Pt[] = [[w * CORE_BAKE.CRACK_START_X, -h * CORE_BAKE.CRACK_START_Y], [-w * CORE_BAKE.CRACK_UPPER_LEFT, -h * CORE_BAKE.CRACK_UPPER_Y], [w * CORE_BAKE.CRACK_MID_X, -h * CORE_BAKE.CRACK_MID_Y], [-w * CORE_BAKE.CRACK_LOWER_LEFT, h * CORE_BAKE.CRACK_LOWER_Y], [w * CORE_BAKE.CRACK_END_X, h * CORE_BAKE.CRACK_END_Y]];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(crack[0][0], crack[0][1]);
    for (let i = 1; i < crack.length; i++) ctx.lineTo(crack[i][0], crack[i][1]);
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = CORE_BAKE.CRACK_SHADOW_WIDTH;
    ctx.stroke();
    ctx.strokeStyle = c.inner;
    ctx.lineWidth = CORE_BAKE.CRACK_EMBER_WIDTH;
    ctx.stroke();

    tracePoly(ctx, outline);
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = CORE_BAKE.SHARD_OUTLINE_WIDTH;
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
    const r = CORE_VISUAL.halfHeight * skin.core.sizeScale * CORE_BAKE.GLOW_RADIUS;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, r);
    g.addColorStop(0, skin.core.glow);
    g.addColorStop(CORE_BAKE.GLOW_MAIN_STOP, skin.core.glow + '66');
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
