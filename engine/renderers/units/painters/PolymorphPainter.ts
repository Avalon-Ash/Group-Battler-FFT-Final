// ╔══════════════════════════════════════════════════════════╗
// ║  PolymorphPainter — 變羊：單位本體換成一隻羊               ║
// ║  職責：把羊（毛球叢、深色臉與腿、陣營色項圈）烘焙一次成離屏   ║
// ║        畫布（含白色剪影變體），繪製時只有 drawImage + 變換   ║
// ║  上游：data/units/appearance/ccBody.ts（尺寸、顏色、跳動）、  ║
// ║        factionSkin（項圈色）、UNIT_SPRITE.footOffsetLocal     ║
// ║  下游：UnitBodyPainter（取代精靈的那一層）                   ║
// ║  [ARCH] 座標沿用精靈：呼叫時 ctx 已在單位局部座標（原點＝精靈  ║
// ║  繪製原點，腳底在 footOffsetLocal，RenderSpec §4），烘焙盒的   ║
// ║  腳底線貼在 footOffsetLocal 上，不新增座標或排序規則。陣營色   ║
// ║  只經 FACTION_SKINS（無陣營分支）。烘焙快取依陣營一份，執行期  ║
// ║  零分配、無 shadowBlur、無漸層。                             ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../../core/Agent";
import { UNIT_SPRITE } from "../../../../constants";
import { SHEEP_BODY, type WoolPuff } from "../../../../data/units/appearance/ccBody";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { createCanvas } from "../../../graphics/CanvasUtils";

type Surface = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
export type SurfaceFactory = (w: number, h: number) => Surface;

export interface SheepSprite {
    color: HTMLCanvasElement;
    /** 純白剪影（被遮擋輪廓、受擊閃白共用） */
    silhouette: HTMLCanvasElement;
}

const S = SHEEP_BODY;
const C = S.colors;
const TAU = Math.PI * 2;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
    ctx.fill();
}

function puff(ctx: CanvasRenderingContext2D, p: WoolPuff) {
    disc(ctx, p.x, p.y, p.r, C.woolShade);
    disc(ctx, p.x + p.r * S.puffLight.dx, p.y + p.r * S.puffLight.dy, p.r * S.puffLight.rScale, C.woolBase);
    if (p.r >= S.puffHighlight.minR) {
        disc(ctx, p.x + p.r * S.puffHighlight.dx, p.y + p.r * S.puffHighlight.dy, p.r * S.puffHighlight.rScale, C.woolHighlight);
    }
}

function drawLegs(ctx: CanvasRenderingContext2D, far: boolean, grow: number) {
    for (const leg of S.legs) {
        if (leg.far !== far) continue;
        const x = leg.x - leg.w / 2 - grow;
        const w = leg.w + grow * 2;
        const h = S.groundY - leg.top + grow * 2;
        ctx.fillStyle = grow > 0 ? C.outline : (far ? C.skinFar : C.skin);
        ctx.fillRect(x, leg.top - grow, w, h);
        if (grow === 0) {
            ctx.fillStyle = C.hoof;
            ctx.fillRect(x, S.groundY - S.hoofHeight, w, S.hoofHeight);
        }
    }
}

/** 烘焙一隻羊（朝右、腳底線＝S.groundY）。collarColor 由陣營皮膚傳入。 */
export function bakeSheep(collarColor: string, createSurface: SurfaceFactory = createCanvas): SheepSprite {
    const k = S.bakeScale;
    const { canvas, ctx } = createSurface(Math.ceil(S.boxW * k), Math.ceil(S.boxH * k));
    ctx.imageSmoothingEnabled = true;
    ctx.scale(k, k);
    ctx.lineCap = 'round';
    const o = S.outlineWidth;

    // 1. 外框（整隻羊的聯集外輪廓）：每個形狀先以外框色放大畫一次
    drawLegs(ctx, true, o);
    drawLegs(ctx, false, o);
    for (const p of S.wool) disc(ctx, p.x, p.y, p.r + o, C.outline);
    disc(ctx, S.tail.x, S.tail.y, S.tail.r + o, C.outline);
    ellipse(ctx, S.head.x, S.head.y, S.head.rx + o, S.head.ry + o, C.outline);
    disc(ctx, S.fringe.x, S.fringe.y, S.fringe.r + o, C.outline);
    ctx.save();
    ctx.translate(S.ear.x, S.ear.y);
    ctx.rotate(S.ear.angle);
    ellipse(ctx, 0, 0, S.ear.rx + o, S.ear.ry + o, C.outline);
    ctx.restore();

    // 2. 腿（遠側先、近側後）
    drawLegs(ctx, true, 0);
    drawLegs(ctx, false, 0);

    // 3. 身體羊毛（背→前）與尾巴
    puff(ctx, { x: S.tail.x, y: S.tail.y, r: S.tail.r });
    for (const p of S.wool) puff(ctx, p);

    // 4. 頭：臉、耳、眼、口鼻、額前羊毛、項圈
    ellipse(ctx, S.head.x, S.head.y, S.head.rx, S.head.ry, C.skin);
    ellipse(ctx, S.head.x - S.head.rx * 0.25, S.head.y - S.head.ry * 0.3, S.head.rx * 0.6, S.head.ry * 0.5, C.skinLight);
    ellipse(ctx, S.muzzle.x, S.muzzle.y, S.muzzle.rx, S.muzzle.ry, C.skinLight);
    disc(ctx, S.nose.x, S.nose.y, S.nose.r, C.outline);
    ctx.save();
    ctx.translate(S.ear.x, S.ear.y);
    ctx.rotate(S.ear.angle);
    ellipse(ctx, 0, 0, S.ear.rx, S.ear.ry, C.skin);
    ellipse(ctx, 0, S.ear.ry * 0.1, S.ear.innerRx, S.ear.innerRy, C.earInner);
    ctx.restore();
    disc(ctx, S.eye.x, S.eye.y, S.eye.r, C.eyeWhite);
    disc(ctx, S.eye.x + S.eye.pupilDx, S.eye.y, S.eye.pupilR, C.eyePupil);
    puff(ctx, { x: S.fringe.x, y: S.fringe.y, r: S.fringe.r });
    ctx.strokeStyle = collarColor;
    ctx.lineWidth = S.collar.width;
    ctx.beginPath();
    ctx.moveTo(S.collar.x0, S.collar.y0);
    ctx.lineTo(S.collar.x1, S.collar.y1);
    ctx.stroke();

    // 剪影變體：同形狀、純白
    const sil = createSurface(canvas.width, canvas.height);
    sil.ctx.drawImage(canvas, 0, 0);
    sil.ctx.globalCompositeOperation = 'source-in';
    sil.ctx.fillStyle = C.silhouette;
    sil.ctx.fillRect(0, 0, sil.canvas.width, sil.canvas.height);

    return { color: canvas, silhouette: sil.canvas };
}

const cache = new Map<string, SheepSprite>();

function getSheep(agent: Agent): SheepSprite {
    const key = String(agent.team);
    let sprite = cache.get(key);
    if (!sprite) {
        sprite = bakeSheep(getFactionSkin(agent.team).fallbackBodyColor);
        cache.set(key, sprite);
    }
    return sprite;
}

export const PolymorphPainter = {
    /**
     * 在單位局部座標（UnitBodyPainter 已 translate／scale／rotate）畫羊，腳底線貼在 footOffsetLocal。
     * 朝向由 agent.facing 翻轉；跳動在腳底上做（落地微壓扁、最高點伸展）。
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean): void {
        const sprite = getSheep(agent);
        const phase = Math.abs(Math.sin(Math.PI * S.hop.hz * t));
        const hop = phase * S.hop.height;
        const squash = 1 - S.hop.squash * (1 - phase);
        const stretch = 1 + S.hop.squash * 0.5 * (1 - phase);

        ctx.save();
        ctx.translate(0, UNIT_SPRITE.footOffsetLocal - hop);
        const k = S.drawScale;
        ctx.scale((agent.facing > 0 ? stretch : -stretch) * k, squash * k);
        ctx.translate(-S.boxW / 2, -S.groundY);
        if (isSilhouette) {
            ctx.globalAlpha *= UNIT_SPRITE.silhouetteAlpha;
            ctx.drawImage(sprite.silhouette, 0, 0, S.boxW, S.boxH);
        } else {
            ctx.drawImage(sprite.color, 0, 0, S.boxW, S.boxH);
            if (agent.hitFlashTimer > 0) {
                ctx.globalAlpha *= Math.min(1, agent.hitFlashTimer / UNIT_SPRITE.hitFlashDuration);
                ctx.drawImage(sprite.silhouette, 0, 0, S.boxW, S.boxH);
            }
        }
        ctx.restore();
    },
};
