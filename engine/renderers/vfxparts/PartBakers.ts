/**
 * PartBakers — 特效零件的烘焙繪製（ART_SPEC §4、§5、§7）
 * -----------------------------------------------------------------------------
 *  - 只在烘焙階段執行：可以建立漸層、組路徑；執行期不會呼叫這裡。
 *  - 呼叫前 ctx 已平移到零件錨點並套用 BAKE_SCALE，座標一律是世界單位。
 *  - 獅心（LION_*）走乾淨對稱的幾何；灰燼（ASH_*）的粗糙度、鋸齒由參數控制。
 */

import { VFX_PARTS } from '../../../data/vfx/parts/partConfig';
import { VFX_RAMPS, VFX_NEUTRALS, type VFXRamp } from '../../../data/vfx/parts/vfxPalette';
import { type PartSpec, type ShardShape, type SigilEmblem, type BeamEdge, type MissileShape, type PrismStyle, type MagicCircleLayer, type MagicCircleStyle, createPartRng, boltPolyline } from './PartSpec';
import { HexGeometry } from '../../graphics/utils/HexGeometry';
import type { HexLayout } from '../../../types';

const TAU = Math.PI * 2;

/** 六角形第 k 個頂點（半徑 r，起始角見 VFX_PARTS.HEX）。 */
function hexVertex(r: number, k: number): [number, number] {
    const a = VFX_PARTS.HEX.ANGLE_OFFSET_RAD + (k / 6) * TAU;
    return [Math.cos(a) * r, Math.sin(a) * r];
}

/** 六角外框路徑（封閉）。 */
function hexPath(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
        const [x, y] = hexVertex(r, k);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

/** 六角周長上 u∈[0,1) 的點（從第 0 頂點起算）。 */
function hexPerimeterPoint(r: number, u: number): [number, number] {
    const t = (((u % 1) + 1) % 1) * 6;
    const k = Math.floor(t);
    const f = t - k;
    const [x0, y0] = hexVertex(r, k);
    const [x1, y1] = hexVertex(r, k + 1);
    return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
}

/** 沿六角周長描 u0→u1 的一段折線（跨頂點時會轉角）。 */
function hexArcPath(ctx: CanvasRenderingContext2D, r: number, u0: number, u1: number): void {
    ctx.beginPath();
    const [sx, sy] = hexPerimeterPoint(r, u0);
    ctx.moveTo(sx, sy);
    for (let k = Math.floor(u0 * 6) + 1; k / 6 < u1; k++) {
        const [x, y] = hexVertex(r, k);
        ctx.lineTo(x, y);
    }
    const [ex, ey] = hexPerimeterPoint(r, u1);
    ctx.lineTo(ex, ey);
}

/** '#rrggbb' + alpha → rgba()；只在烘焙時呼叫。 */
function withAlpha(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/** emblemRotation：只用於法陣，圖騰（外框以外的圖案）在烘焙時的旋轉；見 PartSpec.emblemCounterRotation。 */
export function bakePart(ctx: CanvasRenderingContext2D, n: PartSpec, frame: number, frames: number, emblemRotation: number = 0): void {
    switch (n.kind) {
        case 'glow': return bakeGlow(ctx, n.radius, VFX_RAMPS[n.ramp], !!n.hard);
        case 'ring': return bakeRing(ctx, n.radius, n.thickness, VFX_RAMPS[n.ramp], n.roughness ?? 0, n.seed ?? 0, !!n.soft);
        case 'slashArc': return bakeSlashArc(ctx, n.radius, n.arcDeg, n.thickness, VFX_RAMPS[n.ramp]);
        case 'rays': return bakeRays(ctx, n.radius, n.count, VFX_RAMPS[n.ramp], n.lengthJitter ?? 0, n.seed ?? 0);
        case 'bolt': return bakeBolt(ctx, n.length, n.branches, VFX_RAMPS[n.ramp], (n.seed ?? 0) * frames + frame);
        case 'flame': return bakeFlame(ctx, n.height, VFX_RAMPS[n.ramp], !!n.jagged, frame / frames);
        case 'smoke': return bakeSmoke(ctx, n.radius, VFX_NEUTRALS[n.color], n.roughness ?? 0, n.seed ?? 0);
        case 'shard': return bakeShard(ctx, n.size, n.shape, VFX_RAMPS[n.ramp], n.seed ?? 0);
        case 'sigil': return bakeSigil(ctx, n.radius, n.emblem, VFX_RAMPS[n.ramp], emblemRotation);
        case 'magicCircle': return bakeMagicCircle(ctx, n.radius, VFX_RAMPS[n.ramp], n.layer, n.style, n.seed ?? 0);
        case 'pillar': return bakePillar(ctx, n.width, n.height, VFX_RAMPS[n.ramp]);
        case 'spark': return bakeSpark(ctx, n.length, VFX_RAMPS[n.ramp]);
        case 'droplet': return bakeDroplet(ctx, n.size, VFX_RAMPS[n.ramp]);
        case 'beam': return bakeBeam(ctx, n.width, VFX_RAMPS[n.ramp], n.edge, n.seed ?? 0, frame);
        case 'missile': return bakeMissile(ctx, n.shape, n.length, VFX_RAMPS[n.ramp]);
        case 'prism': return bakePrism(ctx, n.radius, n.height, VFX_RAMPS[n.ramp], n.layout ?? 'FLAT', n.style);
        case 'construct': return bakeGreatsword(ctx, n.size, VFX_RAMPS[n.ramp]);
    }
}

function bakeGlow(ctx: CanvasRenderingContext2D, r: number, ramp: VFXRamp, hard: boolean): void {
    const C = VFX_PARTS.GLOW;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, ramp.core);
    if (hard) {
        g.addColorStop(C.HARD_CORE_STOP, ramp.core);
        g.addColorStop(C.HARD_MAIN_STOP, withAlpha(ramp.main, C.MAIN_ALPHA));
    } else {
        g.addColorStop(C.SOFT_MAIN_STOP, withAlpha(ramp.main, C.MAIN_ALPHA));
    }
    g.addColorStop(1, withAlpha(ramp.dark, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
}

function bakeRing(ctx: CanvasRenderingContext2D, r: number, t: number, ramp: VFXRamp, roughness: number, seed: number, soft: boolean): void {
    const C = VFX_PARTS.RING;
    const outer = r + t;
    // 六角環（ART_SPEC §0）：光暈 → 主色 → 核心三層描邊。光暈烘焙時模糊（2026-10-19：硬邊光暈像第二條實線，畫面毛刺）
    ctx.lineJoin = 'miter';
    ctx.filter = `blur(${C.HALO_BLUR * VFX_PARTS.BAKE_SCALE}px)`;
    ctx.strokeStyle = withAlpha(ramp.dark, C.HALO_ALPHA);
    ctx.lineWidth = t * C.HALO_WIDTH;
    hexPath(ctx, r);
    ctx.stroke();
    ctx.filter = 'none';
    if (soft) {
        // 柔光版：光暈改主色，不畫實心主線，只留細芯
        ctx.filter = `blur(${C.HALO_BLUR * VFX_PARTS.BAKE_SCALE}px)`;
        ctx.strokeStyle = withAlpha(ramp.main, C.SOFT_GLOW_ALPHA);
        ctx.lineWidth = t * C.MAIN_WIDTH;
        hexPath(ctx, r);
        ctx.stroke();
        ctx.filter = 'none';
        ctx.strokeStyle = withAlpha(ramp.core, C.SOFT_CORE_ALPHA);
        ctx.lineWidth = Math.max(1, t * C.CORE_WIDTH);
        hexPath(ctx, r);
        ctx.stroke();
        return;
    }
    ctx.strokeStyle = withAlpha(ramp.main, C.MAIN_ALPHA);
    ctx.lineWidth = t * C.MAIN_WIDTH;
    hexPath(ctx, r);
    ctx.stroke();
    ctx.strokeStyle = ramp.core;
    ctx.lineWidth = Math.max(1, t * C.CORE_WIDTH);
    hexPath(ctx, r);
    ctx.stroke();
    if (roughness <= 0) return;

    // 灰燼風：外緣鋸齒缺口＋斷裂（destination-out 挖掉）
    const rng = createPartRng(seed);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    const notches = Math.round(C.NOTCHES_AT_FULL * roughness);
    for (let i = 0; i < notches; i++) {
        const a = rng() * TAU;
        const half = (0.5 + rng()) * (TAU / C.NOTCHES_AT_FULL) * C.NOTCH_WIDTH;
        const depth = t * C.NOTCH_DEPTH * (0.5 + rng() * 0.5) * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - half) * (outer + 1), Math.sin(a - half) * (outer + 1));
        ctx.lineTo(Math.cos(a) * (outer - depth), Math.sin(a) * (outer - depth));
        ctx.lineTo(Math.cos(a + half) * (outer + 1), Math.sin(a + half) * (outer + 1));
        ctx.closePath();
        ctx.fill();
    }
    const gaps = Math.round(C.GAPS_AT_FULL * roughness);
    for (let i = 0; i < gaps; i++) {
        const a = (i / Math.max(1, gaps)) * TAU + rng() * 0.8;
        const span = C.GAP_ARC_RAD * (0.5 + rng() * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, outer + 1, a, a + span);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

/** 劍弧：擺動中心在原點，弧心朝 +x；尾端（逆時針側）漸細，前緣厚、末梢收尖。 */
function slashPath(ctx: CanvasRenderingContext2D, r: number, arcRad: number, t: number): void {
    const C = VFX_PARTS.SLASH;
    const a0 = -arcRad / 2;
    const n = C.SEGMENTS;
    const width = (u: number) => t * Math.pow(u, C.TAIL_POWER) * Math.min(1, (1 - u) / C.HEAD_FADE);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
        const u = i / n;
        const a = a0 + arcRad * u;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    for (let i = n; i >= 0; i--) {
        const u = i / n;
        const a = a0 + arcRad * u;
        const ri = r - width(u);
        ctx.lineTo(Math.cos(a) * ri, Math.sin(a) * ri);
    }
    ctx.closePath();
}

function bakeSlashArc(ctx: CanvasRenderingContext2D, r: number, arcDeg: number, t: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.SLASH;
    const arc = (arcDeg * Math.PI) / 180;
    // 外光暈（較寬、暗部色、低透明）
    ctx.globalAlpha = C.HALO_ALPHA;
    ctx.fillStyle = ramp.dark;
    slashPath(ctx, r + t * (C.HALO_RATIO - 1) * 0.3, arc, t * C.HALO_RATIO);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = ramp.main;
    slashPath(ctx, r, arc, t);
    ctx.fill();
    ctx.fillStyle = ramp.core;
    slashPath(ctx, r, arc, t * C.CORE_RATIO);
    ctx.fill();
}

function bakeRays(ctx: CanvasRenderingContext2D, r: number, count: number, ramp: VFXRamp, jitter: number, seed: number): void {
    const C = VFX_PARTS.RAYS;
    const rng = createPartRng(seed);
    const halfW = r * C.BASE_HALF_WIDTH * Math.min(1, C.REF_COUNT / count);
    for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU - Math.PI / 2;
        // 日輪：長短交錯；jitter 只作小幅隨機（灰燼語彙用較大值）
        const alt = i % 2 === 1 ? 1 - C.ALT_SHORTEN * jitter : 1;
        const len = r * alt * (1 - C.JITTER * jitter * rng());
        const ca = Math.cos(a), sa = Math.sin(a);
        const g = ctx.createLinearGradient(0, 0, ca * len, sa * len);
        g.addColorStop(0, ramp.core);
        g.addColorStop(C.MAIN_STOP, withAlpha(ramp.main, C.MAIN_ALPHA));
        g.addColorStop(1, withAlpha(ramp.dark, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-sa * halfW, ca * halfW);
        ctx.lineTo(ca * len, sa * len);
        ctx.lineTo(sa * halfW, -ca * halfW);
        ctx.closePath();
        ctx.fill();
    }
    bakeGlow(ctx, r * C.CENTER_GLOW_RATIO, ramp, true);
}

function strokePolyline(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>): void {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
}

/** 分叉雷：錨點在底部（命中點），往上延伸 length。 */
function bakeBolt(ctx: CanvasRenderingContext2D, length: number, branches: number, ramp: VFXRamp, seed: number): void {
    const C = VFX_PARTS.BOLT;
    const main = boltPolyline(length, seed).map(([x, y]) => [x, y - length] as [number, number]);
    const rng = createPartRng(seed + 101);
    const paths: Array<Array<[number, number]>> = [main];
    for (let b = 0; b < branches; b++) {
        const idx = 2 + Math.floor(rng() * (main.length * C.BRANCH_REACH));
        const [sx, sy] = main[Math.min(main.length - 2, idx)];
        const side = rng() < 0.5 ? -1 : 1;
        const bl = length * C.BRANCH_LEN * (0.5 + rng() * 0.5);
        const sub = boltPolyline(bl, seed * 7 + b + 1, C.DEPTH - C.SUB_DEPTH_DROP);
        const ang = side * C.BRANCH_ANGLE_RAD * (0.6 + rng() * 0.4);
        const cos = Math.cos(ang), sin = Math.sin(ang);
        paths.push(sub.map(([x, y]) => [sx + x * cos - y * sin, sy + x * sin + y * cos] as [number, number]));
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pass = (color: string, w: number, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < paths.length; i++) {
            ctx.lineWidth = i === 0 ? w : w * 0.6;
            strokePolyline(ctx, paths[i]);
        }
    };
    pass(ramp.dark, C.HALO_W, C.HALO_ALPHA);
    pass(ramp.main, C.MAIN_W, 1);
    pass(ramp.core, C.CORE_W, 1);
    ctx.globalAlpha = 1;
}

/** 火舌外形：底部寬、往上收尖，搖曳只用 phase 的週期函數 → 影格首尾無縫。 */
function flamePath(ctx: CanvasRenderingContext2D, h: number, halfW: number, phase: number, jagged: boolean, offsetX: number): void {
    const C = VFX_PARTS.FLAME;
    const n = C.SEGMENTS;
    const p = phase * TAU;
    const sway = (v: number) => Math.sin(p + v * 3) * h * C.SWAY * v;
    const width = (v: number) => {
        let w = halfW * Math.pow(Math.sin(Math.PI * (1 - v) * 0.5 + 0.0001), 0.8) * Math.min(1, v * 6 + 0.35);
        if (jagged) w *= 1 + C.JAG * Math.sin(v * C.JAG_FREQ * Math.PI + p * 2) * 2;
        return Math.max(0, w);
    };
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
        const v = i / n;
        const x = offsetX + sway(v) - width(v);
        if (i === 0) ctx.moveTo(x, -v * h); else ctx.lineTo(x, -v * h);
    }
    for (let i = n; i >= 0; i--) {
        const v = i / n;
        ctx.lineTo(offsetX + sway(v) + width(v), -v * h);
    }
    ctx.closePath();
}

function bakeFlame(ctx: CanvasRenderingContext2D, h: number, ramp: VFXRamp, jagged: boolean, phase: number): void {
    const C = VFX_PARTS.FLAME;
    const halfW = h * C.WIDTH_RATIO * 0.5;
    const colors = [ramp.dark, ramp.main, ramp.core];
    // 兩側小火舌（不同相位）
    for (const side of [-1, 1]) {
        ctx.fillStyle = withAlpha(ramp.dark, C.SIDE_ALPHA);
        flamePath(ctx, h * C.SIDE_SCALE, halfW * C.SIDE_SCALE, (phase + C.SIDE_PHASES[side > 0 ? 0 : 1]) % 1, jagged, side * halfW * C.SIDE_OFFSET * 2);
        ctx.fill();
    }
    for (let i = 0; i < C.LAYER_SCALES.length; i++) {
        const s = C.LAYER_SCALES[i];
        ctx.fillStyle = colors[i];
        flamePath(ctx, h * s, halfW * s, (phase + i * C.LAYER_PHASE) % 1, jagged, 0);
        ctx.fill();
        if (i === 0) {
            // 外層細亮邊：讓火焰在暗色地形上讀得出輪廓（烘焙一次，零每幀成本）
            ctx.lineJoin = 'round';
            ctx.lineWidth = C.RIM_WIDTH;
            ctx.strokeStyle = withAlpha(ramp.core, C.RIM_ALPHA);
            ctx.stroke();
        }
    }
}

function bakeSmoke(ctx: CanvasRenderingContext2D, r: number, color: string, roughness: number, seed: number): void {
    const C = VFX_PARTS.SMOKE;
    const rng = createPartRng(seed);
    const lumps = C.LUMPS_MIN + Math.round(C.LUMPS_EXTRA_AT_FULL * roughness);
    for (let i = 0; i < lumps; i++) {
        const a = rng() * TAU;
        const d = i === 0 ? 0 : r * (0.25 + rng() * 0.45);
        const lr = r * (C.LUMP_MIN + rng() * (C.LUMP_MAX - C.LUMP_MIN)) * (i === 0 ? 1.3 : 1);
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        const g = ctx.createRadialGradient(x, y, 0, x, y, lr);
        g.addColorStop(0, withAlpha(color, C.ALPHA));
        g.addColorStop(0.6, withAlpha(color, C.ALPHA * C.MID_ALPHA));
        g.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, lr, 0, TAU);
        ctx.fill();
    }
}

function bakeShard(ctx: CanvasRenderingContext2D, s: number, shape: ShardShape, ramp: VFXRamp, seed: number): void {
    const C = VFX_PARTS.SHARD;
    const rng = createPartRng(seed);
    ctx.lineWidth = C.OUTLINE_W;
    ctx.strokeStyle = ramp.dark;
    ctx.lineJoin = 'round';
    if (shape === 'hex') {
        // 六角晶格碎片（詠唱崩解、法術結構碎裂，ART_SPEC §13）：略壓扁的六角板＋左上斜角高光
        ctx.save();
        ctx.scale(1, C.HEX_SQUASH);
        ctx.fillStyle = ramp.main;
        hexPath(ctx, s);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ramp.core;
        ctx.beginPath();
        const [ax, ay] = hexVertex(s, 3);
        const [bx, by] = hexVertex(s, 4);
        const [cx, cy] = hexVertex(s, 5);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy);
        ctx.lineTo(cx * C.HEX_BEVEL, cy * C.HEX_BEVEL); ctx.lineTo(bx * C.HEX_BEVEL, by * C.HEX_BEVEL); ctx.lineTo(ax * C.HEX_BEVEL, ay * C.HEX_BEVEL);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
    }
    if (shape === 'crystal') {
        const w = s * C.CRYSTAL_ASPECT;
        ctx.fillStyle = ramp.main;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(w, -s * 0.2); ctx.lineTo(w * 0.6, s * 0.7); ctx.lineTo(0, s);
        ctx.lineTo(-w * 0.6, s * 0.7); ctx.lineTo(-w, -s * 0.2); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ramp.core;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(-w, -s * 0.2); ctx.lineTo(0, s * 0.1); ctx.closePath();
        ctx.fill();
        return;
    }
    if (shape === 'rock') {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < C.ROCK_POINTS; i++) {
            const a = (i / C.ROCK_POINTS) * TAU;
            const rr = s * (1 - C.ROCK_JITTER * rng());
            pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]);
        }
        ctx.fillStyle = ramp.main;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // 左上受光面
        ctx.fillStyle = ramp.core;
        ctx.globalAlpha = C.ROCK_LIGHT_ALPHA;
        ctx.beginPath();
        ctx.moveTo(pts[3][0] * 0.6, pts[3][1] * 0.6); ctx.lineTo(pts[4][0] * 0.8, pts[4][1] * 0.8); ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
    }
    // bone：細長骨片，兩端圓節
    const w = s * C.BONE_ASPECT;
    ctx.fillStyle = ramp.core;
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -w * 0.5); ctx.lineTo(s * 0.75, -w * 0.5); ctx.lineTo(s * 0.75, w * 0.5); ctx.lineTo(-s * 0.75, w * 0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (const ex of [-s * 0.8, s * 0.8]) {
        for (const ey of [-w * 0.6, w * 0.6]) {
            ctx.beginPath();
            ctx.arc(ex, ey, w * 0.6, 0, TAU);
            ctx.fill(); ctx.stroke();
        }
    }
}

function sigilStrokes(ctx: CanvasRenderingContext2D, r: number, emblem: SigilEmblem, emblemRotation: number): void {
    const C = VFX_PARTS.SIGIL;
    const ring = (rr: number, gaps: number) => {
        // 法陣外框一律六角（ART_SPEC §0）；gaps > 0 為斷裂六角（灰燼）
        if (gaps <= 0) { hexPath(ctx, rr); ctx.stroke(); return; }
        const seg = 1 / gaps;
        for (let i = 0; i < gaps; i++) {
            hexArcPath(ctx, rr, i * seg + seg * 0.08, (i + 1) * seg - seg * 0.08);
            ctx.stroke();
        }
    };
    const ticks = (r0: number, r1: number, n: number) => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
            ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        }
        ctx.stroke();
    };
    if (emblem === 'sun') {
        // 六角外框＋內圓＋八芒星（長弦交織，沒有放射短線）＋中心圓
        const S = C.SUN;
        ring(r * C.OUTER_RING, 0);
        ctx.beginPath(); ctx.arc(0, 0, r * S.CIRCLE, 0, TAU); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i <= S.STAR_POINTS; i++) {
            const a = ((i * S.STAR_STEP) % S.STAR_POINTS) / S.STAR_POINTS * TAU - Math.PI / 2;
            const x = Math.cos(a) * r * S.STAR_R, y = Math.sin(a) * r * S.STAR_R;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * S.CORE, 0, TAU); ctx.stroke();
        return;
    }
    // 外框（六角環、刻度）之後的圖騰才套用 emblemRotation
    const turnEmblem = () => { if (emblemRotation !== 0) ctx.rotate(emblemRotation); };
    if (emblem === 'lionShield') {
        ring(r * C.OUTER_RING, 0);
        ticks(r * 0.85, r * C.OUTER_RING, 8);
        ctx.save();
        turnEmblem();
        // 騎士盾（heater）＋十字＋三尖冠
        const w = r * 0.5, top = -r * 0.55, mid = r * 0.1, bot = r * 0.7;
        ctx.beginPath();
        ctx.moveTo(-w, top); ctx.lineTo(w, top); ctx.lineTo(w, mid);
        ctx.quadraticCurveTo(w, bot * 0.8, 0, bot);
        ctx.quadraticCurveTo(-w, bot * 0.8, -w, mid);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, top + r * 0.12); ctx.lineTo(0, bot - r * 0.15);
        ctx.moveTo(-w * 0.65, -r * 0.1); ctx.lineTo(w * 0.65, -r * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * 0.6, top - r * 0.05); ctx.lineTo(-w * 0.6, top - r * 0.22); ctx.lineTo(-w * 0.3, top - r * 0.12);
        ctx.lineTo(0, top - r * 0.27); ctx.lineTo(w * 0.3, top - r * 0.12); ctx.lineTo(w * 0.6, top - r * 0.22); ctx.lineTo(w * 0.6, top - r * 0.05);
        ctx.stroke();
        ctx.restore();
        return;
    }
    if (emblem === 'hornSkull') {
        ring(r * C.OUTER_RING, C.RING_GAPS);
        ctx.save();
        turnEmblem();
        // 顱骨
        ctx.beginPath();
        ctx.arc(0, -r * 0.05, r * 0.3, Math.PI * 0.85, Math.PI * 0.15 + TAU);
        ctx.lineTo(r * 0.2, r * 0.32); ctx.lineTo(-r * 0.2, r * 0.32); ctx.closePath();
        ctx.stroke();
        // 眼窩（倒三角）
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * r * 0.05, -r * 0.05); ctx.lineTo(s * r * 0.2, -r * 0.08); ctx.lineTo(s * r * 0.12, r * 0.08); ctx.closePath();
            ctx.stroke();
        }
        // 彎角
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * r * 0.22, -r * 0.25);
            ctx.quadraticCurveTo(s * r * 0.65, -r * 0.35, s * r * 0.55, -r * 0.75);
            ctx.stroke();
        }
        ctx.restore();
        return;
    }
    // invTriangle：斷裂環＋倒三角＋頂點符刻
    ring(r * C.OUTER_RING, C.RING_GAPS + 2);
    ctx.save();
    turnEmblem();
    const tri = (rr: number) => {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = Math.PI / 2 + (i / 3) * TAU;
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    };
    tri(r * 0.8);
    tri(r * 0.35);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * TAU;
        const x = Math.cos(a) * r * 0.62, y = Math.sin(a) * r * 0.62;
        ctx.moveTo(x - r * 0.06, y - r * 0.05); ctx.lineTo(x + r * 0.02, y + r * 0.04); ctx.lineTo(x - r * 0.02, y + r * 0.08); ctx.lineTo(x + r * 0.06, y + r * 0.12);
    }
    ctx.stroke();
    ctx.restore();
}

function bakeSigil(ctx: CanvasRenderingContext2D, r: number, emblem: SigilEmblem, ramp: VFXRamp, emblemRotation: number): void {
    const C = VFX_PARTS.SIGIL;
    const lw = Math.max(1, r * C.LINE_RATIO);
    const outer = r * C.OUTER_RING;
    // 透光圓盤：中心幾乎透明、往外漸亮，外緣淡出到 0
    const discR = outer * C.DISC.RADIUS;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, discR);
    g.addColorStop(0, withAlpha(ramp.main, C.DISC.CENTER_ALPHA));
    g.addColorStop(C.DISC.MID_STOP, withAlpha(ramp.main, C.DISC.MID_ALPHA));
    g.addColorStop(1, withAlpha(ramp.main, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, discR, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 光暈只在烘焙時模糊
    ctx.filter = `blur(${C.BLUR * VFX_PARTS.BAKE_SCALE}px)`;
    ctx.globalAlpha = C.GLOW_ALPHA;
    ctx.strokeStyle = ramp.main;
    ctx.lineWidth = lw * C.GLOW_WIDTH_MUL;
    sigilStrokes(ctx, r, emblem, emblemRotation);
    ctx.filter = 'none';
    ctx.globalAlpha = C.MAIN_ALPHA;
    ctx.lineWidth = lw * C.MAIN_WIDTH_MUL;
    sigilStrokes(ctx, r, emblem, emblemRotation);
    ctx.globalAlpha = C.CORE_ALPHA;
    ctx.strokeStyle = ramp.core;
    ctx.lineWidth = lw * C.CORE_WIDTH_MUL;
    sigilStrokes(ctx, r, emblem, emblemRotation);
    ctx.globalAlpha = 1;
}

/**
 * 發光描邊：先畫一層模糊的主色寬光暈（filter blur，只在烘焙時），再畫細的核心亮線。
 * path 每次都重建（filter 與 stroke 綁在同一條路徑上）。
 */
function glowStroke(ctx: CanvasRenderingContext2D, path: () => void, width: number, ramp: VFXRamp, alpha: number = 1): void {
    const M = VFX_PARTS.MAGIC;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.filter = `blur(${M.BLUR * VFX_PARTS.BAKE_SCALE}px)`;
    ctx.globalAlpha = M.HALO_ALPHA * alpha;
    ctx.strokeStyle = ramp.main;
    ctx.lineWidth = width * M.HALO_WIDTH_MUL;
    path();
    ctx.stroke();
    ctx.filter = 'none';
    ctx.globalAlpha = M.CORE_ALPHA * alpha;
    ctx.strokeStyle = ramp.core;
    ctx.lineWidth = width;
    path();
    ctx.stroke();
    ctx.restore();
}

function circlePath(ctx: CanvasRenderingContext2D, r: number): () => void {
    return () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); };
}

/** 符文：在 (0,0) 附近、大小 s 的方框裡畫 2～3 筆；LION 圓潤（短線＋小圓弧），ASH 折線 */
function runeGlyph(ctx: CanvasRenderingContext2D, s: number, style: MagicCircleStyle, rng: () => number): void {
    ctx.beginPath();
    const strokes = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < strokes; k++) {
        const x0 = (rng() - 0.5) * s, y0 = (rng() - 0.5) * s;
        if (style === 'LION' && rng() < 0.45) {
            ctx.moveTo(x0 + s * 0.22, y0);
            ctx.arc(x0, y0, s * 0.22, 0, TAU * (0.5 + rng() * 0.5));
        } else {
            const x1 = (rng() - 0.5) * s, y1 = (rng() - 0.5) * s;
            ctx.moveTo(x0, y0);
            if (style === 'ASH') ctx.lineTo((x0 + x1) / 2 + (rng() - 0.5) * s * 0.6, (y0 + y1) / 2 + (rng() - 0.5) * s * 0.6);
            ctx.lineTo(x1, y1);
        }
    }
}

/**
 * 詠唱法陣（2026-10-19 重新設計，取代高速旋轉的實線六角環）：
 *  outer：光暈圓盤（中心淡、近外緣亮的透光感）＋雙同心圓＋一圈符文＋內側刻度
 *  inner：獅心六芒星（兩個交疊三角）／灰燼倒三角＋斷弧、內圓、頂點光點、中心柔光
 */
function bakeMagicCircle(ctx: CanvasRenderingContext2D, r: number, ramp: VFXRamp, layer: MagicCircleLayer, style: MagicCircleStyle, seed: number): void {
    const M = VFX_PARTS.MAGIC;
    if (layer === 'outer') {
        const D = M.DISC;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, withAlpha(ramp.main, D.CENTER_ALPHA));
        g.addColorStop(D.MID_STOP, withAlpha(ramp.main, D.MID_ALPHA));
        g.addColorStop(D.RIM_STOP, withAlpha(ramp.core, D.RIM_ALPHA));
        g.addColorStop(1, withAlpha(ramp.main, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        glowStroke(ctx, circlePath(ctx, r * M.RING_A.R), M.RING_A.W, ramp);
        glowStroke(ctx, circlePath(ctx, r * M.RING_B.R), M.RING_B.W, ramp);
        // 符文帶：沿切線方向排一圈
        const R = M.RUNES;
        const count = style === 'LION' ? R.COUNT_LION : R.COUNT_ASH;
        const rng = createPartRng(seed + 101);
        // 光暈與芯各畫一次：每個符文用自己的種子重建，兩次筆畫相同
        const seeds = Array.from({ length: count }, () => Math.floor(rng() * 1e6));
        const drawRunes = () => {
            ctx.beginPath();
            for (let i = 0; i < count; i++) {
                const a = (i / count) * TAU;
                const local = createPartRng(seeds[i]);
                ctx.save();
                ctx.rotate(a);
                ctx.translate(r * R.R, 0);
                ctx.rotate(Math.PI / 2);
                runeGlyph(ctx, r * R.SIZE * 2, style, local);
                ctx.restore();
                ctx.stroke();
            }
        };
        ctx.save();
        ctx.lineCap = 'round';
        ctx.filter = `blur(${M.BLUR * VFX_PARTS.BAKE_SCALE}px)`;
        ctx.globalAlpha = M.HALO_ALPHA * R.ALPHA;
        ctx.strokeStyle = ramp.main;
        ctx.lineWidth = R.W * M.HALO_WIDTH_MUL;
        drawRunes();
        ctx.filter = 'none';
        ctx.globalAlpha = M.CORE_ALPHA * R.ALPHA;
        ctx.strokeStyle = ramp.core;
        ctx.lineWidth = R.W;
        drawRunes();
        ctx.restore();
        // 刻度
        const T = M.TICKS;
        glowStroke(ctx, () => {
            ctx.beginPath();
            for (let i = 0; i < T.COUNT; i++) {
                const a = (i / T.COUNT) * TAU;
                const len = i % 2 === 0 ? T.LEN : T.LEN * 0.5;
                ctx.moveTo(Math.cos(a) * r * T.R, Math.sin(a) * r * T.R);
                ctx.lineTo(Math.cos(a) * r * (T.R - len), Math.sin(a) * r * (T.R - len));
            }
        }, T.W, ramp, T.ALPHA);
        return;
    }

    // inner
    const S = M.STAR;
    const sr = r * S.R;
    const verts: Array<[number, number]> = [];
    const triangle = (offset: number) => {
        for (let k = 0; k < 3; k++) {
            const a = VFX_PARTS.HEX.ANGLE_OFFSET_RAD + offset + (k / 3) * TAU;
            const x = Math.cos(a) * sr, y = Math.sin(a) * sr;
            verts.push([x, y]);
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
    };
    if (style === 'LION') {
        glowStroke(ctx, () => { ctx.beginPath(); triangle(-Math.PI / 2); triangle(Math.PI / 2); }, S.W, ramp);
    } else {
        // 倒三角（尖端朝向鏡頭前方）＋三段斷弧
        glowStroke(ctx, () => { ctx.beginPath(); triangle(Math.PI / 2); }, S.W, ramp);
        const A = M.ASH_ARCS;
        glowStroke(ctx, () => {
            ctx.beginPath();
            for (let i = 0; i < A.COUNT; i++) {
                const a0 = (i / A.COUNT) * TAU + 0.3;
                ctx.moveTo(Math.cos(a0) * r * A.R, Math.sin(a0) * r * A.R);
                ctx.arc(0, 0, r * A.R, a0, a0 + A.SPAN_RAD);
            }
        }, A.W, ramp);
    }
    glowStroke(ctx, circlePath(ctx, r * M.INNER_RING.R), M.INNER_RING.W, ramp);
    // 頂點光點與中心柔光（柔邊漸層，不描邊）
    const node = (x: number, y: number, rr: number, alpha: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, withAlpha(ramp.core, alpha));
        g.addColorStop(0.4, withAlpha(ramp.main, alpha * 0.6));
        g.addColorStop(1, withAlpha(ramp.main, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    const nr = Math.max(1.5, r * M.NODES.R) * 2.5;
    const seen = new Set<string>();
    for (const [x, y] of verts) {
        const k = `${x.toFixed(2)},${y.toFixed(2)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        node(x, y, nr, M.NODES.ALPHA);
    }
    node(0, 0, r * M.CORE.R, M.CORE.ALPHA);
}

/** 光柱（六角稜柱）：錨點在底部中央，往上延伸 height，頂端淡出。正面最亮，左側面受光、右側面背光。 */
function bakePillar(ctx: CanvasRenderingContext2D, w: number, h: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.PILLAR;
    const hw = w / 2;
    const fw = hw * C.FRONT_RATIO;
    ctx.fillStyle = withAlpha(ramp.main, C.LIT_SIDE_ALPHA);
    ctx.fillRect(-hw, -h, hw - fw, h);
    ctx.fillStyle = withAlpha(ramp.dark, C.SHADE_SIDE_ALPHA);
    ctx.fillRect(fw, -h, hw - fw, h);
    ctx.fillStyle = ramp.core;
    ctx.fillRect(-fw, -h, fw * 2, h);
    // 稜線
    ctx.fillStyle = withAlpha(ramp.core, C.EDGE_ALPHA);
    const ew = Math.max(1, w * C.EDGE_WIDTH);
    ctx.fillRect(-fw - ew / 2, -h, ew, h);
    ctx.fillRect(fw - ew / 2, -h, ew, h);
    // 頂端淡出
    ctx.globalCompositeOperation = 'destination-in';
    const v = ctx.createLinearGradient(0, -h, 0, 0);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1 - C.TOP_FADE, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = v;
    ctx.fillRect(-hw, -h, w, h);
    ctx.globalCompositeOperation = 'source-over';
    // 底部光暈（橢圓，等距地面比例）
    ctx.save();
    ctx.scale(1, C.BASE_ELLIPSE);
    bakeGlow(ctx, hw, ramp, false);
    ctx.restore();
}

/**
 * 六角稜柱（錨點＝底面中心，往上長 h）：側面漸層填色 → 垂直稜線 → 頂蓋 → 底面輪廓。
 * 面朝向以邊中點的螢幕 Y 判斷（> 0＝朝向鏡頭）；glass 先畫背面再畫正面。
 */
function bakePrism(ctx: CanvasRenderingContext2D, r: number, h: number, ramp: VFXRamp, layout: HexLayout, style: PrismStyle): void {
    const S = style === 'glass' ? VFX_PARTS.PRISM.GLASS : VFX_PARTS.PRISM.SOLID;
    const v = HexGeometry.getVertices(r, true, layout);
    const side = ctx.createLinearGradient(0, -h, 0, 0);
    side.addColorStop(0, withAlpha(ramp.main, S.SIDE_TOP));
    side.addColorStop(1, withAlpha(ramp.main, S.SIDE_BASE));
    const edgeAt = [false, false, false, false, false, false];
    ctx.fillStyle = side;
    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 6; i++) {
            const j = (i + 1) % 6;
            const front = v[i].y + v[j].y > 0;
            if (front !== (pass === 1)) continue;
            if (!front && !S.BACK_FACES) continue;
            ctx.beginPath();
            ctx.moveTo(v[i].x, v[i].y);
            ctx.lineTo(v[j].x, v[j].y);
            ctx.lineTo(v[j].x, v[j].y - h);
            ctx.lineTo(v[i].x, v[i].y - h);
            ctx.closePath();
            ctx.fill();
            edgeAt[i] = true;
            edgeAt[j] = true;
        }
    }
    ctx.strokeStyle = withAlpha(ramp.core, S.EDGE_ALPHA);
    ctx.lineWidth = S.EDGE_W;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        if (!edgeAt[i]) continue;
        ctx.moveTo(v[i].x, v[i].y);
        ctx.lineTo(v[i].x, v[i].y - h);
    }
    ctx.stroke();
    const hexAt = (dy: number) => {
        ctx.beginPath();
        ctx.moveTo(v[0].x, v[0].y + dy);
        for (let i = 1; i < 6; i++) ctx.lineTo(v[i].x, v[i].y + dy);
        ctx.closePath();
    };
    hexAt(-h);
    ctx.fillStyle = withAlpha(ramp.main, S.CAP_FILL);
    ctx.fill();
    ctx.strokeStyle = withAlpha(ramp.core, S.CAP_EDGE_ALPHA);
    ctx.lineWidth = S.CAP_EDGE_W;
    ctx.stroke();
    if (S.BASE_EDGE_ALPHA > 0) {
        hexAt(0);
        ctx.strokeStyle = withAlpha(ramp.main, S.BASE_EDGE_ALPHA);
        ctx.lineWidth = S.EDGE_W;
        ctx.stroke();
    }
}

/** 火花拖尾：頭端在錨點（朝 +x），尾巴往 -x 漸細淡出。 */
function bakeSpark(ctx: CanvasRenderingContext2D, len: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.SPARK;
    const t = Math.max(1, len * C.THICK_RATIO);
    const g = ctx.createLinearGradient(-len, 0, 0, 0);
    g.addColorStop(0, withAlpha(ramp.dark, 0));
    g.addColorStop(C.MAIN_STOP, withAlpha(ramp.main, C.MAIN_ALPHA));
    g.addColorStop(1, ramp.core);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-len, 0); ctx.lineTo(0, -t / 2); ctx.lineTo(0, t / 2);
    ctx.closePath();
    ctx.fill();
    bakeGlow(ctx, Math.max(2, len * C.HEAD_GLOW_RATIO), ramp, true);
}

function bakeDroplet(ctx: CanvasRenderingContext2D, s: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.DROPLET;
    const r = s * C.BODY_RATIO;
    ctx.fillStyle = ramp.main;
    ctx.beginPath();
    ctx.moveTo(0, -r * C.TIP_RATIO);
    ctx.quadraticCurveTo(r, -r * 0.2, r, r * 0.25);
    ctx.arc(0, r * 0.25, r, 0, Math.PI);
    ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r * C.TIP_RATIO);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ramp.dark;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = ramp.core;
    ctx.beginPath();
    ctx.arc(-r * 0.35, 0, r * C.HIGHLIGHT_RATIO, 0, TAU);
    ctx.fill();
}

/**
 * 光束磚（x 0→TILE_LEN，y 以中線為 0）。左右兩端必須能首尾相接：漸層只沿 y、虛線與珠鏈週期整除磚長、
 * 鋸齒折線兩端回到中線。執行期由 PartPainter.drawBeam 沿光束平鋪。
 */
function bakeBeam(ctx: CanvasRenderingContext2D, w: number, ramp: VFXRamp, edge: BeamEdge, seed: number, frame: number): void {
    const B = VFX_PARTS.BEAM;
    const L = B.TILE_LEN;
    const hh = (w * B.HALO_RATIO) / 2;
    if (edge === 'zigzag') {
        // 閃電：每個影格一條不同的折線（三層描邊），兩端固定在中線
        const rng = createPartRng(seed * 7 + frame);
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= B.ZIGZAG_POINTS; i++) {
            const edgePt = i === 0 || i === B.ZIGZAG_POINTS;
            pts.push([(i / B.ZIGZAG_POINTS) * L, edgePt ? 0 : (rng() * 2 - 1) * w * B.ZIGZAG_AMP]);
        }
        ctx.lineJoin = 'round';
        const stroke = (width: number, style: string) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
            ctx.stroke();
        };
        stroke(hh, withAlpha(ramp.main, B.HALO_ALPHA));
        stroke(Math.max(1, w * B.ZIGZAG_MAIN_W), ramp.main);
        stroke(Math.max(1, w * B.ZIGZAG_CORE_W), ramp.core);
        return;
    }
    // 光暈
    const halo = ctx.createLinearGradient(0, -hh, 0, hh);
    halo.addColorStop(0, withAlpha(ramp.dark, 0));
    halo.addColorStop(0.5, withAlpha(ramp.main, B.HALO_ALPHA));
    halo.addColorStop(1, withAlpha(ramp.dark, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, -hh, L, hh * 2);
    // 管身（與舊 drawLayeredBeam 同樣的 0.35／0.5／0.65 色標）
    const m = (w * B.MAIN_RATIO) / 2;
    const tube = ctx.createLinearGradient(0, -m, 0, m);
    tube.addColorStop(0, withAlpha(ramp.main, 0));
    tube.addColorStop(0.35, ramp.main);
    tube.addColorStop(0.5, ramp.core);
    tube.addColorStop(0.65, ramp.main);
    tube.addColorStop(1, withAlpha(ramp.main, 0));
    ctx.fillStyle = tube;
    ctx.fillRect(0, -m, L, m * 2);
    // 最內芯
    const c = Math.max(0.5, (w * B.CORE_RATIO) / 2);
    ctx.fillStyle = ramp.core;
    ctx.fillRect(0, -c, L, c * 2);
    if (edge === 'dashed') {
        ctx.fillStyle = withAlpha(ramp.main, B.DASH_ALPHA);
        const off = w * B.DASH_OFFSET;
        for (let x = 0; x < L; x += B.DASH_PERIOD) {
            ctx.fillRect(x, -off - B.DASH_W / 2, B.DASH_ON, B.DASH_W);
            ctx.fillRect(x, off - B.DASH_W / 2, B.DASH_ON, B.DASH_W);
        }
    } else if (edge === 'beads') {
        const r = Math.max(1, w * B.BEAD_R);
        for (let x = B.BEAD_PERIOD / 2; x < L; x += B.BEAD_PERIOD) {
            ctx.fillStyle = ramp.main;
            ctx.beginPath(); ctx.arc(x, 0, r * 1.4, 0, TAU); ctx.fill();
            ctx.fillStyle = ramp.core;
            ctx.beginPath(); ctx.arc(x, 0, r, 0, TAU); ctx.fill();
        }
    }
}

/**
 * 投射物本體（指向 +x，中心在原點，長度 L）。實體外形（箭、斧、炸彈、鉤）用一般混合：主色填色＋暗色描邊＋左上受光的核心色高光；
 * 能量外形（能量彈、法球）用加法：由核心往外變暗。拖尾與頭部光暈是另外的零件（ProjectilePartPainter）。
 */
function bakeMissile(ctx: CanvasRenderingContext2D, shape: MissileShape, L: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.MISSILE;
    const h = L / 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = C.OUTLINE_W;
    ctx.strokeStyle = ramp.dark;
    if (shape === 'arrow') {
        const A = C.ARROW;
        // 桿身
        ctx.fillStyle = ramp.main;
        ctx.fillRect(-h, -L * A.SHAFT_W / 2, L * (0.5 + A.HEAD_START), L * A.SHAFT_W);
        // 尾羽（上下兩片）
        for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-h, 0);
            ctx.lineTo(-h + L * A.FLETCH_LEN * 0.4, sgn * L * A.FLETCH_HALF);
            ctx.lineTo(-h + L * A.FLETCH_LEN, sgn * L * A.FLETCH_HALF);
            ctx.lineTo(-h + L * A.FLETCH_LEN * 0.6, 0);
            ctx.closePath();
            ctx.fillStyle = sgn < 0 ? ramp.core : ramp.main;
            ctx.fill(); ctx.stroke();
        }
        // 箭頭：六角菱形（ART_SPEC §0 六角骨架）
        ctx.beginPath();
        ctx.moveTo(h, 0);
        ctx.lineTo(L * A.HEAD_START + L * 0.08, -L * A.HEAD_HALF);
        ctx.lineTo(L * A.HEAD_START, -L * A.HEAD_HALF * 0.5);
        ctx.lineTo(L * A.HEAD_START, L * A.HEAD_HALF * 0.5);
        ctx.lineTo(L * A.HEAD_START + L * 0.08, L * A.HEAD_HALF);
        ctx.closePath();
        ctx.fillStyle = ramp.core;
        ctx.fill(); ctx.stroke();
        return;
    }
    if (shape === 'bolt') {
        const B = C.BOLT;
        const crystal = (scale: number) => {
            ctx.beginPath();
            ctx.moveTo(h * scale, 0);
            ctx.lineTo(L * B.FRONT * scale, -L * B.WAIST_HALF * scale);
            ctx.lineTo(-L * B.BACK * scale, -L * B.WAIST_HALF * scale);
            ctx.lineTo(-h * scale, 0);
            ctx.lineTo(-L * B.BACK * scale, L * B.WAIST_HALF * scale);
            ctx.lineTo(L * B.FRONT * scale, L * B.WAIST_HALF * scale);
            ctx.closePath();
        };
        crystal(1);
        ctx.fillStyle = withAlpha(ramp.main, 0.85);
        ctx.fill();
        crystal(B.CORE_SCALE);
        ctx.fillStyle = ramp.core;
        ctx.fill();
        return;
    }
    if (shape === 'orb') {
        const O = C.ORB;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h);
        g.addColorStop(0, ramp.core);
        g.addColorStop(O.CORE, withAlpha(ramp.main, O.HALO_ALPHA));
        g.addColorStop(1, withAlpha(ramp.dark, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, h, 0, TAU); ctx.fill();
        ctx.fillStyle = ramp.core;
        hexPath(ctx, L * O.CORE * 0.5);
        ctx.fill();
        return;
    }
    if (shape === 'axe') {
        const X = C.AXE;
        ctx.fillStyle = ramp.dark;
        ctx.fillRect(-h, -L * X.HANDLE_W / 2, L, L * X.HANDLE_W);
        // 月牙刃：外緣弧＋內緣直線，刃口用核心色
        ctx.beginPath();
        ctx.moveTo(L * X.BLADE_START, -L * X.BLADE_HALF);
        ctx.quadraticCurveTo(h + L * X.BLADE_BULGE, 0, L * X.BLADE_START, L * X.BLADE_HALF);
        ctx.lineTo(L * X.BLADE_START + L * 0.08, 0);
        ctx.closePath();
        ctx.fillStyle = ramp.main;
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = ramp.core;
        ctx.lineWidth = C.OUTLINE_W * 1.5;
        ctx.beginPath();
        ctx.moveTo(L * X.BLADE_START + L * 0.05, -L * X.BLADE_HALF * 0.8);
        ctx.quadraticCurveTo(h + L * X.BLADE_BULGE * 0.6, 0, L * X.BLADE_START + L * 0.05, L * X.BLADE_HALF * 0.8);
        ctx.stroke();
        return;
    }
    if (shape === 'bomb') {
        const M = C.BOMB;
        const r = L * M.BODY;
        ctx.fillStyle = ramp.dark;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = ramp.main;
        ctx.stroke();
        ctx.fillStyle = withAlpha(ramp.core, 0.8);
        ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, TAU); ctx.fill();
        // 引信＋火花（朝飛行方向的後上方）
        ctx.strokeStyle = ramp.main;
        ctx.lineWidth = C.OUTLINE_W * 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.lineTo(-r * 0.6 - L * M.FUSE_LEN, -r * 0.8 - L * M.FUSE_LEN); ctx.stroke();
        bakeGlowAt(ctx, -r * 0.6 - L * M.FUSE_LEN, -r * 0.8 - L * M.FUSE_LEN, Math.max(2, L * M.SPARK), ramp);
        return;
    }
    // hook：短索＋鉤頭（J 形）＋倒刺
    const K = C.HOOK;
    const r = L * K.R;
    ctx.strokeStyle = ramp.main;
    ctx.lineWidth = L * K.LINE_W;
    ctx.beginPath();
    ctx.moveTo(L * K.SHAFT_FROM, 0);
    ctx.lineTo(h - r, 0);
    ctx.arc(h - r, r, r, -Math.PI / 2, Math.PI * 0.6);
    ctx.stroke();
    ctx.fillStyle = ramp.core;
    ctx.beginPath();
    const bx = h - r + Math.cos(Math.PI * 0.6) * r;
    const by = r + Math.sin(Math.PI * 0.6) * r;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - L * K.BARB, by - L * K.BARB * 1.4);
    ctx.lineTo(bx + L * K.BARB * 0.3, by - L * K.BARB * 0.6);
    ctx.closePath();
    ctx.fill();
}

/** 魔法構造體的一片：外暈（烘焙時 shadowBlur）→ 半透明體積填色 → 亮邊（core）。 */
function energyPiece(ctx: CanvasRenderingContext2D, path: () => void, fill: string | CanvasGradient, ramp: VFXRamp, L: number): void {
    const C = VFX_PARTS.CONSTRUCT;
    ctx.save();
    path();
    ctx.shadowColor = withAlpha(ramp.main, C.AURA_ALPHA);
    ctx.shadowBlur = L * C.AURA_BLUR;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    path();
    ctx.strokeStyle = withAlpha(ramp.core, C.RIM_ALPHA);
    ctx.lineWidth = Math.max(1, L * C.RIM_W);
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** 受光面（core→main，較實）與背光面（main→dark，較暗較透）的體積漸層。 */
function faceGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, ramp: VFXRamp, lit: boolean): CanvasGradient {
    const C = VFX_PARTS.CONSTRUCT;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    if (lit) {
        g.addColorStop(0, withAlpha(ramp.core, C.LIT_ALPHA[0]));
        g.addColorStop(1, withAlpha(ramp.main, C.LIT_ALPHA[1]));
    } else {
        g.addColorStop(0, withAlpha(ramp.main, C.SHADE_ALPHA[0]));
        g.addColorStop(1, withAlpha(ramp.dark, C.SHADE_ALPHA[1]));
    }
    return g;
}

/**
 * 獅翼聖劍（kind 'construct'，shape 'greatsword'）：劍尖在錨點 (0,0) 朝下，柄頭在 (0, −L)。
 * 魔法構造體：有體積（左半受光較亮較實、右半背光較暗較透），整體半透明、帶外暈與亮邊，中脊是一道內光；
 * 不是實心物件，不描深色外框（ULT-V01 使用者美術方向）。
 */
function bakeGreatsword(ctx: CanvasRenderingContext2D, L: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.CONSTRUCT;
    const G = C.GREATSWORD;
    const bw = (G.BLADE_W * L) / 2;
    const tipY = -G.TIP_LEN * L;
    const guardY = -G.GUARD_Y * L;
    const gh = G.GUARD_H * L;

    // 獅翼（在劍刃後面）：每側 FEATHERS 片尖羽，從護手根部往上展開成扇形；外側先畫、內側蓋上去
    const span = (G.WING_SPAN * L) / 2;
    const [a0, a1] = G.FEATHER_ANGLE_DEG;
    for (const side of [-1, 1]) {
        for (let i = G.FEATHERS - 1; i >= 0; i--) {
            const u = G.FEATHERS > 1 ? i / (G.FEATHERS - 1) : 1;
            const ang = ((a0 + (a1 - a0) * u) * Math.PI) / 180;
            const len = span * (G.FEATHER_LEN[0] + (G.FEATHER_LEN[1] - G.FEATHER_LEN[0]) * u);
            const rootX = side * bw * G.FEATHER_ROOT_X;
            const rootY = guardY - gh / 2;
            const tipX = rootX + side * Math.cos(ang) * len;
            const tipYw = rootY - Math.sin(ang) * len;
            const nx = side * Math.sin(ang), ny = Math.cos(ang);
            const wdt = len * G.FEATHER_WIDTH;
            const midX = (rootX + tipX) / 2, midY = (rootY + tipYw) / 2;
            const feather = () => {
                ctx.beginPath();
                ctx.moveTo(rootX, rootY);
                ctx.quadraticCurveTo(midX - nx * wdt, midY - ny * wdt, tipX, tipYw);
                ctx.quadraticCurveTo(midX + nx * wdt, midY + ny * wdt, rootX, rootY);
                ctx.closePath();
            };
            // 羽根往羽尖由背光漸亮（光從羽尖透出來）
            energyPiece(ctx, feather, faceGradient(ctx, tipX, tipYw, rootX, rootY, ramp, side < 0), ramp, L);
        }
    }

    // 劍刃：左半受光、右半背光
    const leftHalf = () => {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-bw, tipY); ctx.lineTo(-bw, guardY); ctx.lineTo(0, guardY);
        ctx.closePath();
    };
    const rightHalf = () => {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, guardY); ctx.lineTo(bw, guardY); ctx.lineTo(bw, tipY);
        ctx.closePath();
    };
    energyPiece(ctx, leftHalf, faceGradient(ctx, -bw, guardY, 0, 0, ramp, true), ramp, L);
    energyPiece(ctx, rightHalf, faceGradient(ctx, 0, guardY, bw, 0, ramp, false), ramp, L);
    // 中脊內光：一道 core 細線加光暈，沿劍身流動的能量
    ctx.save();
    ctx.shadowColor = ramp.core;
    ctx.shadowBlur = L * C.CORE_BLUR;
    ctx.strokeStyle = ramp.core;
    ctx.lineWidth = Math.max(1, L * C.CORE_W);
    ctx.beginPath();
    ctx.moveTo(0, tipY * G.CORE_START);
    ctx.lineTo(0, guardY);
    ctx.stroke();
    ctx.restore();

    // 護手橫桿：上亮下暗
    const gx = bw * G.GUARD_EXTENT;
    energyPiece(ctx, () => { ctx.beginPath(); ctx.rect(-gx, guardY - gh, gx * 2, gh); },
        faceGradient(ctx, 0, guardY - gh, 0, guardY, ramp, true), ramp, L);

    // 握柄：背光較透，纏繩是幾道亮紋
    const gw = (G.GRIP_W * L) / 2;
    const gripTop = guardY - gh - G.GRIP_LEN * L;
    energyPiece(ctx, () => { ctx.beginPath(); ctx.rect(-gw, gripTop, gw * 2, G.GRIP_LEN * L); },
        faceGradient(ctx, -gw, gripTop, gw, gripTop, ramp, false), ramp, L);
    ctx.strokeStyle = withAlpha(ramp.core, C.WRAP_ALPHA);
    ctx.lineWidth = Math.max(1, L * C.RIM_W);
    ctx.beginPath();
    for (let k = 1; k <= G.WRAPS; k++) {
        const y = guardY - gh - (G.GRIP_LEN * L * k) / (G.WRAPS + 1);
        ctx.moveTo(-gw, y + gw * G.WRAP_SLANT);
        ctx.lineTo(gw, y - gw * G.WRAP_SLANT);
    }
    ctx.stroke();

    // 柄頭六角寶石：光源
    const pr = G.POMMEL_R * L;
    ctx.save();
    ctx.translate(0, gripTop - pr * G.POMMEL_LIFT);
    bakeGlow(ctx, G.GEM_GLOW * L, ramp, false);
    hexPath(ctx, pr);
    ctx.fillStyle = withAlpha(ramp.main, C.LIT_ALPHA[1]);
    ctx.fill();
    hexPath(ctx, pr * G.GEM_CORE);
    ctx.fillStyle = ramp.core;
    ctx.fill();
    ctx.restore();
}

/** 在 (x, y) 畫一顆硬光點（bakeGlow 的平移版，炸彈引信火花用）。 */
function bakeGlowAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ramp: VFXRamp): void {
    ctx.save();
    ctx.translate(x, y);
    bakeGlow(ctx, r, ramp, true);
    ctx.restore();
}
