// ╔══════════════════════════════════════════════════════════╗
// ║  FrozenPainter — 凍結：單位被封在六角冰塊裡               ║
// ║  職責：把半透明六角稜柱冰塊烘焙一次成離屏畫布，疊在精靈之上   ║
// ║        （取代舊的 ICE_CRYSTAL 障礙物精靈＋hard-light）         ║
// ║  上游：data/units/appearance/ccBody.ts（ICE_BLOCK：尺寸、     ║
// ║        色階 VFX_RAMPS.LION_ICE、面板透明度）                  ║
// ║  下游：UnitBodyPainter（精靈與常駐 VFX 之後、同一個局部座標）  ║
// ║  [ARCH] 座標沿用精靈：ctx 已在單位局部座標（RenderSpec §4），  ║
// ║  冰塊底面六角中心貼在腳底 footOffsetLocal，所以和棋座同心、   ║
// ║  不新增座標或排序規則。烘焙一次、無 shadowBlur／漸層；        ║
// ║  只在非剪影時繪製（剪影仍是單位本身）。                       ║
// ╚══════════════════════════════════════════════════════════╝

import { ISO_SCALE_Y, UNIT_SPRITE } from "../../../../constants";
import { ICE_BLOCK } from "../../../../data/units/appearance/ccBody";
import { createCanvas } from "../../../graphics/CanvasUtils";

type Surface = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
export type SurfaceFactory = (w: number, h: number) => Surface;

const B = ICE_BLOCK;
const SIDE = Math.PI / 3;

/** 烘焙盒尺寸（局部單位）與底面六角中心在盒內的位置 */
export const ICE_BLOCK_BOX = {
    w: B.radius * 2 + B.pad * 2,
    h: B.height + B.radius * ISO_SCALE_Y * 2 + B.pad * 2,
    /** 底面六角中心（＝腳底）在盒內的 y */
    groundY: B.height + B.radius * ISO_SCALE_Y + B.pad,
} as const;

interface P { x: number; y: number }

function quad(ctx: CanvasRenderingContext2D, a: P, b: P, c: P, d: P) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
}

export function bakeIceBlock(createSurface: SurfaceFactory = createCanvas): HTMLCanvasElement {
    const k = B.bakeScale;
    const { canvas, ctx } = createSurface(Math.ceil(ICE_BLOCK_BOX.w * k), Math.ceil(ICE_BLOCK_BOX.h * k));
    ctx.imageSmoothingEnabled = true;
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    const cx = ICE_BLOCK_BOX.w / 2;
    const by = ICE_BLOCK_BOX.groundY;
    const v: P[] = [];
    for (let i = 0; i < 6; i++) v.push({ x: cx + B.radius * Math.cos(SIDE * i), y: by + B.radius * ISO_SCALE_Y * Math.sin(SIDE * i) });
    const up = (p: P): P => ({ x: p.x, y: p.y - B.height });
    const lerp = (a: P, b: P, u: number, w: number): P => ({
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u - B.height * w,
    });

    // 可見的三個側面（右、前、左；亮面朝左上，右側最暗）與頂面
    const faces: { a: P; b: P; color: string; alpha: number; streaks: boolean }[] = [
        { a: v[0], b: v[1], color: B.ramp.dark, alpha: B.alpha.right, streaks: false },
        { a: v[1], b: v[2], color: B.ramp.main, alpha: B.alpha.front, streaks: true },
        { a: v[2], b: v[3], color: B.ramp.main, alpha: B.alpha.left, streaks: true },
    ];
    for (const f of faces) {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        quad(ctx, f.a, f.b, up(f.b), up(f.a));
        ctx.fill();
        if (f.streaks) {
            ctx.globalAlpha = B.streakAlpha;
            ctx.fillStyle = B.ramp.core;
            for (const [u0, w] of B.streaks) {
                quad(ctx, lerp(f.a, f.b, u0, 0.12), lerp(f.a, f.b, u0 + w, 0.12), lerp(f.a, f.b, u0 + w + 0.18, 0.85), lerp(f.a, f.b, u0 + 0.18, 0.85));
                ctx.fill();
            }
        }
    }
    // 頂面
    ctx.globalAlpha = B.alpha.top;
    ctx.fillStyle = B.ramp.core;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const p = up(v[i]);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();

    // 邊線：頂面外框、四條可見垂直稜、底面前緣
    ctx.globalAlpha = B.edgeAlpha;
    ctx.strokeStyle = B.ramp.core;
    ctx.lineWidth = B.edgeWidth;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const p = up(v[i]);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    for (let i = 0; i <= 3; i++) {
        ctx.moveTo(v[i].x, v[i].y);
        ctx.lineTo(v[i].x, v[i].y - B.height);
    }
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i <= 3; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return canvas;
}

let cached: HTMLCanvasElement | null = null;

export const FrozenPainter = {
    /** 在單位局部座標畫冰塊，底面六角中心貼在腳底（footOffsetLocal）。 */
    draw(ctx: CanvasRenderingContext2D): void {
        if (!cached) cached = bakeIceBlock();
        ctx.save();
        ctx.globalAlpha *= B.drawAlpha;
        ctx.drawImage(cached, -ICE_BLOCK_BOX.w / 2, UNIT_SPRITE.footOffsetLocal - ICE_BLOCK_BOX.groundY, ICE_BLOCK_BOX.w, ICE_BLOCK_BOX.h);
        ctx.restore();
    },
};
