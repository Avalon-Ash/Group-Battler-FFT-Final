// ╔══════════════════════════════════════════════════════════╗
// ║  ProjectilePartPainter — 投射物（零件版，V4）              ║
// ║  職責：PROJECTILE op → 拖尾＋頭部光暈＋本體，全部是預烘焙  ║
// ║        零件，執行期只有 drawImage／alpha／混合／變換       ║
// ║  [ARCH] 不讀技能顏色、不猜陣營：色階來自 look（共用外觀依   ║
// ║  op.pTeam 選）。排序由 ProjectileRenderer 提交（§1），這裡  ║
// ║  只畫。解析後的 sprite 依（外觀鍵、陣營）快取，每幀零配置。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { RenderOp } from "../../../../renderers/RenderList";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE_KEY, projectileRamp, type ProjectileLook } from "../../../../../data/vfx/projectile_visuals";
import { PROJECTILE_RENDER } from "../../../../../constants";
import { vfxPartStore, drawPart, type PartSprite } from "../../../../renderers/vfxparts/VFXPartStore";
import { quantizeSize } from "../../../../renderers/vfxparts/PartSpec";
import { drawTrailStreak } from "../../../../renderers/vfxparts/TrailStreak";
import { Team } from "../../../../../types";

interface LookSprites {
    look: ProjectileLook;
    body: PartSprite;
    /** 量化長度 → 實際長度的縮放 */
    bodyScale: number;
    trail: PartSprite | null;
    trailScale: number;
    glow: PartSprite | null;
    glowScale: number;
}

/** 煙拖尾零件的粗糙度與種子（固定一種外形，限制快取量） */
const SMOKE_ROUGHNESS = 0.5;
const SMOKE_SEED = 1;

const cache = new Map<string, Array<LookSprites | undefined>>();

function resolve(key: string, team: Team): LookSprites {
    let entry = cache.get(key);
    if (!entry) { entry = []; cache.set(key, entry); }
    const hit = entry[team];
    if (hit) return hit;
    const look = (PROJECTILE_VISUALS[key] ?? PROJECTILE_VISUALS[DEFAULT_PROJECTILE_KEY]).look;
    const ramp = projectileRamp(look, team);
    const body = vfxPartStore.get({ kind: 'missile', shape: look.shape, length: look.size, ramp });
    let trail: PartSprite | null = null;
    if (look.trail === 'streak') trail = vfxPartStore.get({ kind: 'beam', width: look.trailWidth, ramp, edge: 'clean' });
    else if (look.trail === 'smoke') trail = vfxPartStore.get({ kind: 'smoke', radius: look.trailWidth, color: look.smoke ?? 'ASH', roughness: SMOKE_ROUGHNESS, seed: SMOKE_SEED });
    const resolved: LookSprites = {
        look,
        body,
        bodyScale: look.size / quantizeSize(look.size),
        trail,
        trailScale: look.trailWidth > 0 ? look.trailWidth / quantizeSize(look.trailWidth) : 0,
        glow: look.glow > 0 ? vfxPartStore.get({ kind: 'glow', radius: look.glow, ramp }) : null,
        glowScale: look.glow > 0 ? look.glow / quantizeSize(look.glow) : 0,
    };
    entry[team] = resolved;
    return resolved;
}

/** 煙：每隔 SMOKE_EVERY 個取樣點蓋一團，越往尾端越大越淡。 */
function drawSmoke(ctx: CanvasRenderingContext2D, puff: PartSprite, trail: RenderOp['pTrail'], scale: number): void {
    const n = trail.length;
    const every = PROJECTILE_RENDER.SMOKE_EVERY;
    for (let i = every - 1; i < n; i += every) {
        const k = i / n;
        drawPart(ctx, puff, trail[i].x, trail[i].y, {
            scale: scale * (1 + k * (PROJECTILE_RENDER.SMOKE_GROW - 1)),
            alpha: (1 - k) * PROJECTILE_RENDER.SMOKE_ALPHA,
        });
    }
}

export const ProjectilePartPainter = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp): void {
        const s = resolve(op.pLookKey, op.pTeam);
        const ult = op.pIsUlt ? PROJECTILE_RENDER.ULT_SCALE : 1;
        const x = op.pVisX, y = op.pVisY;

        // 1. 拖尾（在本體後面）
        if (s.trail && op.pTrail.length > 0) {
            if (s.look.trail === 'streak') drawTrailStreak(ctx, s.trail, x, y, op.pTrail, op.pTrail.length, s.trailScale * ult, PROJECTILE_RENDER.STREAK_ALPHA);
            else drawSmoke(ctx, s.trail, op.pTrail, s.trailScale * ult);
        }

        // 2. 頭部光暈
        if (s.glow) drawPart(ctx, s.glow, x, y, { scale: s.glowScale * ult, alpha: PROJECTILE_RENDER.GLOW_ALPHA });

        // 3. 本體：自轉的投射物用自轉角；其他沿飛行方向，依速度拉長
        const body = s.body;
        const k = s.bodyScale * ult;
        ctx.save();
        ctx.translate(x, y);
        if (op.pSpin !== 0) {
            ctx.rotate(op.pSpin);
            ctx.scale(k, k);
        } else {
            const stretch = 1 + Math.max(0, op.pSpeed - PROJECTILE_RENDER.STRETCH_SPEED_REF) / PROJECTILE_RENDER.STRETCH_SPEED_SPAN;
            ctx.rotate(op.pAngle);
            ctx.scale(k * stretch, k * Math.max(PROJECTILE_RENDER.SQUISH_MIN, 1 / stretch));
        }
        ctx.globalCompositeOperation = body.blend;
        ctx.drawImage(body.frames[0], -body.anchorX, -body.anchorY, body.width, body.height);
        ctx.restore();
    },

    /** 測試／工具用：丟掉解析快取（外觀表或品質階層變動後） */
    reset(): void {
        cache.clear();
    },
};
