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
    const a = VFX_PARTS.HEX.ANGLE_OFFSET_RAD + (k / VFX_PARTS.HEX.SIDES) * TAU;
    return [Math.cos(a) * r, Math.sin(a) * r];
}

/** 六角外框路徑（封閉）。 */
function hexPath(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let k = 0; k < VFX_PARTS.HEX.SIDES; k++) {
        const [x, y] = hexVertex(r, k);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

/** 六角周長上 u∈[0,1) 的點（從第 0 頂點起算）。 */
function hexPerimeterPoint(r: number, u: number): [number, number] {
    const t = (((u % 1) + 1) % 1) * VFX_PARTS.HEX.SIDES;
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
    for (let k = Math.floor(u0 * VFX_PARTS.HEX.SIDES) + 1; k / VFX_PARTS.HEX.SIDES < u1; k++) {
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
        case 'spiral': return bakeSpiral(ctx, n.radius, n.arms, n.turns, n.thickness, VFX_RAMPS[n.ramp]);
        case 'construct': {
            const ramp = VFX_RAMPS[n.ramp];
            if (n.shape === 'singularity') return bakeSingularity(ctx, n.size, ramp);
            if (n.shape === 'warhead') return bakeWarhead(ctx, n.size, ramp);
            if (n.shape === 'eclipse') return bakeEclipse(ctx, n.size, ramp);
            if (n.shape === 'bladeWheel') return bakeBladeWheel(ctx, n.size, ramp);
            if (n.shape === 'towerShield') return bakeTowerShield(ctx, n.size, ramp);
            if (n.shape === 'crown') return bakeCrown(ctx, n.size, ramp);
            if (n.shape === 'fist') return bakeFist(ctx, n.size, ramp);
            if (n.shape === 'guillotine') return bakeGuillotine(ctx, n.size, ramp);
            if (n.shape === 'ribSpike') return bakeRibSpike(ctx, n.size, ramp);
            if (n.shape === 'eye') return bakeEye(ctx, n.size, ramp);
            if (n.shape === 'arrow') return bakeArrow(ctx, n.size, ramp);
            if (n.shape === 'demonWings') return bakeDemonWings(ctx, n.size, ramp);
            return bakeGreatsword(ctx, n.size, ramp);
        }
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
        const a = (i / Math.max(1, gaps)) * TAU + rng() * VFX_PARTS.RING.GAP_ANGLE_JITTER;
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
    slashPath(ctx, r + t * (C.HALO_RATIO - 1) * VFX_PARTS.SLASH.HALO_RADIUS_OFFSET, arc, t * C.HALO_RATIO);
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
    const rng = createPartRng(seed + VFX_PARTS.BOLT.BRANCH_SEED_OFFSET);
    const paths: Array<Array<[number, number]>> = [main];
    for (let b = 0; b < branches; b++) {
        const idx = 2 + Math.floor(rng() * (main.length * C.BRANCH_REACH));
        const [sx, sy] = main[Math.min(main.length - 2, idx)];
        const side = rng() < 0.5 ? -1 : 1;
        const bl = length * C.BRANCH_LEN * (0.5 + rng() * 0.5);
        const sub = boltPolyline(bl, seed * VFX_PARTS.BOLT.SUB_SEED_MULT + b + 1, C.DEPTH - C.SUB_DEPTH_DROP);
        const ang = side * C.BRANCH_ANGLE_RAD * (VFX_PARTS.BOLT.ANGLE_MIN_RATIO + rng() * VFX_PARTS.BOLT.ANGLE_JITTER);
        const cos = Math.cos(ang), sin = Math.sin(ang);
        paths.push(sub.map(([x, y]) => [sx + x * cos - y * sin, sy + x * sin + y * cos] as [number, number]));
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pass = (color: string, w: number, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < paths.length; i++) {
            ctx.lineWidth = i === 0 ? w : w * VFX_PARTS.BOLT.SUB_WIDTH_RATIO;
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
        let w = halfW * Math.pow(Math.sin(Math.PI * (1 - v) * 0.5 + VFX_PARTS.FLAME.WIDTH_PHASE_EPS), VFX_PARTS.FLAME.WIDTH_POWER) * Math.min(1, v * VFX_PARTS.FLAME.BASE_TAPER_RATE + VFX_PARTS.FLAME.BASE_WIDTH_RATIO);
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
        const d = i === 0 ? 0 : r * (VFX_PARTS.SMOKE.LUMP_DISTANCE_MIN + rng() * VFX_PARTS.SMOKE.LUMP_DISTANCE_RANGE);
        const lr = r * (C.LUMP_MIN + rng() * (C.LUMP_MAX - C.LUMP_MIN)) * (i === 0 ? VFX_PARTS.SMOKE.CENTER_LUMP_SCALE : 1);
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        const g = ctx.createRadialGradient(x, y, 0, x, y, lr);
        g.addColorStop(0, withAlpha(color, C.ALPHA));
        g.addColorStop(VFX_PARTS.SMOKE.MID_STOP, withAlpha(color, C.ALPHA * C.MID_ALPHA));
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
        ctx.moveTo(0, -s); ctx.lineTo(w, -s * VFX_PARTS.SHARD.CRYSTAL_SHOULDER_Y); ctx.lineTo(w * VFX_PARTS.SHARD.CRYSTAL_LOWER_WIDTH, s * VFX_PARTS.SHARD.CRYSTAL_LOWER_Y); ctx.lineTo(0, s);
        ctx.lineTo(-w * VFX_PARTS.SHARD.CRYSTAL_LOWER_WIDTH, s * VFX_PARTS.SHARD.CRYSTAL_LOWER_Y); ctx.lineTo(-w, -s * VFX_PARTS.SHARD.CRYSTAL_SHOULDER_Y); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = ramp.core;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(-w, -s * VFX_PARTS.SHARD.CRYSTAL_SHOULDER_Y); ctx.lineTo(0, s * VFX_PARTS.SHARD.CRYSTAL_LIGHT_Y); ctx.closePath();
        ctx.fill();
        return;
    }
    if (shape === 'rock') {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < C.ROCK_POINTS; i++) {
            const a = (i / C.ROCK_POINTS) * TAU;
            const rr = s * (1 - C.ROCK_JITTER * rng());
            pts.push([Math.cos(a) * rr, Math.sin(a) * rr * VFX_PARTS.SHARD.ROCK_SQUASH]);
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
        ctx.moveTo(pts[3][0] * VFX_PARTS.SHARD.ROCK_LIGHT_START, pts[3][1] * VFX_PARTS.SHARD.ROCK_LIGHT_START); ctx.lineTo(pts[4][0] * VFX_PARTS.SHARD.ROCK_LIGHT_END, pts[4][1] * VFX_PARTS.SHARD.ROCK_LIGHT_END); ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
    }
    if (shape === 'chevron') {
        // 下壓雙箭頭：兩枚向下的 V（上方一枚較淡），主色填、暗色描邊
        const K = VFX_PARTS.SHARD.CHEVRON;
        ctx.fillStyle = ramp.main;
        for (let i = 0; i < K.COUNT; i++) {
            const y0 = s * (K.TOP + i * K.STEP);
            ctx.globalAlpha = i === 0 ? K.UPPER_ALPHA : 1;
            ctx.beginPath();
            ctx.moveTo(-s, y0); ctx.lineTo(0, y0 + s * K.DEPTH); ctx.lineTo(s, y0);
            ctx.lineTo(s, y0 + s * K.THICK); ctx.lineTo(0, y0 + s * (K.DEPTH + K.THICK)); ctx.lineTo(-s, y0 + s * K.THICK);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        return;
    }
    // bone：細長骨片，兩端圓節
    const w = s * C.BONE_ASPECT;
    ctx.fillStyle = ramp.core;
    ctx.beginPath();
    ctx.moveTo(-s * VFX_PARTS.SHARD.BONE_SHAFT_HALF, -w * 0.5); ctx.lineTo(s * VFX_PARTS.SHARD.BONE_SHAFT_HALF, -w * 0.5); ctx.lineTo(s * VFX_PARTS.SHARD.BONE_SHAFT_HALF, w * 0.5); ctx.lineTo(-s * VFX_PARTS.SHARD.BONE_SHAFT_HALF, w * 0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (const ex of [-s * VFX_PARTS.SHARD.BONE_JOINT_X, s * VFX_PARTS.SHARD.BONE_JOINT_X]) {
        for (const ey of [-w * VFX_PARTS.SHARD.BONE_JOINT_Y, w * VFX_PARTS.SHARD.BONE_JOINT_Y]) {
            ctx.beginPath();
            ctx.arc(ex, ey, w * VFX_PARTS.SHARD.BONE_JOINT_RADIUS, 0, TAU);
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
            hexArcPath(ctx, rr, i * seg + seg * VFX_PARTS.SIGIL.GAP_MARGIN, (i + 1) * seg - seg * VFX_PARTS.SIGIL.GAP_MARGIN);
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
        ticks(r * VFX_PARTS.SIGIL.LION_TICK_INNER, r * C.OUTER_RING, VFX_PARTS.SIGIL.LION_TICKS);
        ctx.save();
        turnEmblem();
        // 騎士盾（heater）＋十字＋三尖冠
        const w = r * 0.5, top = -r * VFX_PARTS.SIGIL.LION_TOP, mid = r * VFX_PARTS.SIGIL.LION_MID, bot = r * VFX_PARTS.SIGIL.LION_BOTTOM;
        ctx.beginPath();
        ctx.moveTo(-w, top); ctx.lineTo(w, top); ctx.lineTo(w, mid);
        ctx.quadraticCurveTo(w, bot * VFX_PARTS.SIGIL.LION_CURVE_Y, 0, bot);
        ctx.quadraticCurveTo(-w, bot * VFX_PARTS.SIGIL.LION_CURVE_Y, -w, mid);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, top + r * VFX_PARTS.SIGIL.LION_CROSS_TOP_PAD); ctx.lineTo(0, bot - r * VFX_PARTS.SIGIL.LION_CROSS_BOTTOM_PAD);
        ctx.moveTo(-w * VFX_PARTS.SIGIL.LION_CROSS_HALF, -r * VFX_PARTS.SIGIL.LION_CROSS_Y); ctx.lineTo(w * VFX_PARTS.SIGIL.LION_CROSS_HALF, -r * VFX_PARTS.SIGIL.LION_CROSS_Y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * VFX_PARTS.SIGIL.LION_CROWN_HALF, top - r * VFX_PARTS.SIGIL.LION_CROWN_BASE_Y); ctx.lineTo(-w * VFX_PARTS.SIGIL.LION_CROWN_HALF, top - r * VFX_PARTS.SIGIL.LION_CROWN_SIDE_Y); ctx.lineTo(-w * VFX_PARTS.SIGIL.LION_CROWN_INNER_X, top - r * VFX_PARTS.SIGIL.LION_CROWN_INNER_Y);
        ctx.lineTo(0, top - r * VFX_PARTS.SIGIL.LION_CROWN_CENTER_Y); ctx.lineTo(w * VFX_PARTS.SIGIL.LION_CROWN_INNER_X, top - r * VFX_PARTS.SIGIL.LION_CROWN_INNER_Y); ctx.lineTo(w * VFX_PARTS.SIGIL.LION_CROWN_HALF, top - r * VFX_PARTS.SIGIL.LION_CROWN_SIDE_Y); ctx.lineTo(w * VFX_PARTS.SIGIL.LION_CROWN_HALF, top - r * VFX_PARTS.SIGIL.LION_CROWN_BASE_Y);
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
        ctx.arc(0, -r * VFX_PARTS.SIGIL.SKULL_CENTER_Y, r * VFX_PARTS.SIGIL.SKULL_RADIUS, Math.PI * 0.85, Math.PI * 0.15 + TAU);
        ctx.lineTo(r * VFX_PARTS.SIGIL.SKULL_JAW_HALF, r * VFX_PARTS.SIGIL.SKULL_JAW_Y); ctx.lineTo(-r * VFX_PARTS.SIGIL.SKULL_JAW_HALF, r * VFX_PARTS.SIGIL.SKULL_JAW_Y); ctx.closePath();
        ctx.stroke();
        // 眼窩（倒三角）
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * r * VFX_PARTS.SIGIL.SKULL_EYE_INNER_X, -r * VFX_PARTS.SIGIL.SKULL_EYE_TOP_Y); ctx.lineTo(s * r * VFX_PARTS.SIGIL.SKULL_EYE_OUTER_X, -r * VFX_PARTS.SIGIL.SKULL_EYE_OUTER_Y); ctx.lineTo(s * r * VFX_PARTS.SIGIL.SKULL_EYE_LOWER_X, r * VFX_PARTS.SIGIL.SKULL_EYE_LOWER_Y); ctx.closePath();
            ctx.stroke();
        }
        // 彎角
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * r * VFX_PARTS.SIGIL.SKULL_HORN_ROOT_X, -r * VFX_PARTS.SIGIL.SKULL_HORN_ROOT_Y);
            ctx.quadraticCurveTo(s * r * VFX_PARTS.SIGIL.SKULL_HORN_CONTROL_X, -r * VFX_PARTS.SIGIL.SKULL_HORN_CONTROL_Y, s * r * VFX_PARTS.SIGIL.SKULL_HORN_TIP_X, -r * VFX_PARTS.SIGIL.SKULL_HORN_TIP_Y);
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
    tri(r * VFX_PARTS.SIGIL.TRIANGLE_OUTER);
    tri(r * VFX_PARTS.SIGIL.TRIANGLE_INNER);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * TAU;
        const x = Math.cos(a) * r * VFX_PARTS.SIGIL.TRIANGLE_RUNE_RADIUS, y = Math.sin(a) * r * VFX_PARTS.SIGIL.TRIANGLE_RUNE_RADIUS;
        ctx.moveTo(x - r * VFX_PARTS.SIGIL.TRI_RUNE_START_X, y - r * VFX_PARTS.SIGIL.TRI_RUNE_START_Y); ctx.lineTo(x + r * VFX_PARTS.SIGIL.TRI_RUNE_BEND_X, y + r * VFX_PARTS.SIGIL.TRI_RUNE_BEND_Y); ctx.lineTo(x - r * VFX_PARTS.SIGIL.TRI_RUNE_RETURN_X, y + r * VFX_PARTS.SIGIL.TRI_RUNE_RETURN_Y); ctx.lineTo(x + r * VFX_PARTS.SIGIL.TRI_RUNE_END_X, y + r * VFX_PARTS.SIGIL.TRI_RUNE_END_Y);
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
        if (style === 'LION' && rng() < VFX_PARTS.MAGIC.RUNE_ARC_CHANCE) {
            ctx.moveTo(x0 + s * VFX_PARTS.MAGIC.RUNE_ARC_RADIUS, y0);
            ctx.arc(x0, y0, s * VFX_PARTS.MAGIC.RUNE_ARC_RADIUS, 0, TAU * (0.5 + rng() * 0.5));
        } else {
            const x1 = (rng() - 0.5) * s, y1 = (rng() - 0.5) * s;
            ctx.moveTo(x0, y0);
            if (style === 'ASH') ctx.lineTo((x0 + x1) / 2 + (rng() - 0.5) * s * VFX_PARTS.MAGIC.RUNE_JAG_RANGE, (y0 + y1) / 2 + (rng() - 0.5) * s * VFX_PARTS.MAGIC.RUNE_JAG_RANGE);
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
        const rng = createPartRng(seed + VFX_PARTS.MAGIC.RUNE_SEED_OFFSET);
        // 光暈與芯各畫一次：每個符文用自己的種子重建，兩次筆畫相同
        const seeds = Array.from({ length: count }, () => Math.floor(rng() * VFX_PARTS.MAGIC.RUNE_SEED_RANGE));
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
                const a0 = (i / A.COUNT) * TAU + VFX_PARTS.MAGIC.ASH_ARC_OFFSET;
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
        g.addColorStop(VFX_PARTS.MAGIC.NODE_MAIN_STOP, withAlpha(ramp.main, alpha * VFX_PARTS.MAGIC.NODE_MAIN_ALPHA));
        g.addColorStop(1, withAlpha(ramp.main, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    const nr = Math.max(VFX_PARTS.MAGIC.NODE_MIN_RADIUS, r * M.NODES.R) * VFX_PARTS.MAGIC.NODE_RADIUS_SCALE;
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
        for (let i = 0; i < VFX_PARTS.HEX.SIDES; i++) {
            const j = (i + 1) % VFX_PARTS.HEX.SIDES;
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
    for (let i = 0; i < VFX_PARTS.HEX.SIDES; i++) {
        if (!edgeAt[i]) continue;
        ctx.moveTo(v[i].x, v[i].y);
        ctx.lineTo(v[i].x, v[i].y - h);
    }
    ctx.stroke();
    const hexAt = (dy: number) => {
        ctx.beginPath();
        ctx.moveTo(v[0].x, v[0].y + dy);
        for (let i = 1; i < VFX_PARTS.HEX.SIDES; i++) ctx.lineTo(v[i].x, v[i].y + dy);
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
    ctx.quadraticCurveTo(r, -r * VFX_PARTS.DROPLET.SHOULDER_Y, r, r * VFX_PARTS.DROPLET.BODY_CENTER_Y);
    ctx.arc(0, r * VFX_PARTS.DROPLET.BODY_CENTER_Y, r, 0, Math.PI);
    ctx.quadraticCurveTo(-r, -r * VFX_PARTS.DROPLET.SHOULDER_Y, 0, -r * C.TIP_RATIO);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ramp.dark;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = ramp.core;
    ctx.beginPath();
    ctx.arc(-r * VFX_PARTS.DROPLET.HIGHLIGHT_X, 0, r * C.HIGHLIGHT_RATIO, 0, TAU);
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
        const rng = createPartRng(seed * VFX_PARTS.BEAM.FRAME_SEED_MULT + frame);
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
    tube.addColorStop(VFX_PARTS.BEAM.TUBE_MAIN_STOP_LOW, ramp.main);
    tube.addColorStop(0.5, ramp.core);
    tube.addColorStop(VFX_PARTS.BEAM.TUBE_MAIN_STOP_HIGH, ramp.main);
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
            ctx.beginPath(); ctx.arc(x, 0, r * VFX_PARTS.BEAM.BEAD_OUTER_SCALE, 0, TAU); ctx.fill();
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
            ctx.lineTo(-h + L * A.FLETCH_LEN * VFX_PARTS.MISSILE.ARROW.FLETCH_PEAK, sgn * L * A.FLETCH_HALF);
            ctx.lineTo(-h + L * A.FLETCH_LEN, sgn * L * A.FLETCH_HALF);
            ctx.lineTo(-h + L * A.FLETCH_LEN * VFX_PARTS.MISSILE.ARROW.FLETCH_ROOT, 0);
            ctx.closePath();
            ctx.fillStyle = sgn < 0 ? ramp.core : ramp.main;
            ctx.fill(); ctx.stroke();
        }
        // 箭頭：六角菱形（ART_SPEC §0 六角骨架）
        ctx.beginPath();
        ctx.moveTo(h, 0);
        ctx.lineTo(L * A.HEAD_START + L * VFX_PARTS.MISSILE.ARROW.HEAD_SHOULDER, -L * A.HEAD_HALF);
        ctx.lineTo(L * A.HEAD_START, -L * A.HEAD_HALF * 0.5);
        ctx.lineTo(L * A.HEAD_START, L * A.HEAD_HALF * 0.5);
        ctx.lineTo(L * A.HEAD_START + L * VFX_PARTS.MISSILE.ARROW.HEAD_SHOULDER, L * A.HEAD_HALF);
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
        ctx.fillStyle = withAlpha(ramp.main, VFX_PARTS.MISSILE.BOLT.MAIN_ALPHA);
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
        ctx.lineTo(L * X.BLADE_START + L * VFX_PARTS.MISSILE.AXE.INNER_NOTCH, 0);
        ctx.closePath();
        ctx.fillStyle = ramp.main;
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = ramp.core;
        ctx.lineWidth = C.OUTLINE_W * VFX_PARTS.MISSILE.AXE.EDGE_WIDTH_MULT;
        ctx.beginPath();
        ctx.moveTo(L * X.BLADE_START + L * VFX_PARTS.MISSILE.AXE.EDGE_INSET, -L * X.BLADE_HALF * VFX_PARTS.MISSILE.AXE.EDGE_HALF);
        ctx.quadraticCurveTo(h + L * X.BLADE_BULGE * VFX_PARTS.MISSILE.AXE.EDGE_BULGE, 0, L * X.BLADE_START + L * VFX_PARTS.MISSILE.AXE.EDGE_INSET, L * X.BLADE_HALF * VFX_PARTS.MISSILE.AXE.EDGE_HALF);
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
        ctx.fillStyle = withAlpha(ramp.core, VFX_PARTS.MISSILE.BOMB.HIGHLIGHT_ALPHA);
        ctx.beginPath(); ctx.arc(-r * VFX_PARTS.MISSILE.BOMB.HIGHLIGHT_OFFSET, -r * VFX_PARTS.MISSILE.BOMB.HIGHLIGHT_OFFSET, r * VFX_PARTS.MISSILE.BOMB.HIGHLIGHT_RADIUS, 0, TAU); ctx.fill();
        // 引信＋火花（朝飛行方向的後上方）
        ctx.strokeStyle = ramp.main;
        ctx.lineWidth = C.OUTLINE_W * VFX_PARTS.MISSILE.BOMB.FUSE_WIDTH_MULT;
        ctx.beginPath(); ctx.moveTo(-r * VFX_PARTS.MISSILE.BOMB.FUSE_X, -r * VFX_PARTS.MISSILE.BOMB.FUSE_Y); ctx.lineTo(-r * VFX_PARTS.MISSILE.BOMB.FUSE_X - L * M.FUSE_LEN, -r * VFX_PARTS.MISSILE.BOMB.FUSE_Y - L * M.FUSE_LEN); ctx.stroke();
        bakeGlowAt(ctx, -r * VFX_PARTS.MISSILE.BOMB.FUSE_X - L * M.FUSE_LEN, -r * VFX_PARTS.MISSILE.BOMB.FUSE_Y - L * M.FUSE_LEN, Math.max(2, L * M.SPARK), ramp);
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
    ctx.lineTo(bx - L * K.BARB, by - L * K.BARB * VFX_PARTS.MISSILE.HOOK.BARB_UP);
    ctx.lineTo(bx + L * K.BARB * VFX_PARTS.MISSILE.HOOK.BARB_RIGHT, by - L * K.BARB * VFX_PARTS.MISSILE.HOOK.BARB_LOWER);
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

/**
 * 螺旋吸積帶（kind 'spiral'）：arms 條彎曲光帶，從外緣 R 繞 turns 圈收到 INNER×R，越往內越細。
 * 填色是以中心為圓心的放射漸層（外緣暗而透 → 中心 core 亮）：亮度只跟半徑有關，光帶整條一次填完，沒有分段接縫。
 * 角度隨深入而增加，所以執行期要「往內流」須給負的 vRotation。
 */
function bakeSpiral(ctx: CanvasRenderingContext2D, R: number, arms: number, turns: number, thickness: number, ramp: VFXRamp): void {
    const S = VFX_PARTS.SPIRAL;
    const r0 = R * S.INNER;
    const fill = ctx.createRadialGradient(0, 0, r0, 0, 0, R);
    fill.addColorStop(0, ramp.core);
    fill.addColorStop(1 - S.MID_STOP, withAlpha(ramp.main, S.MID_ALPHA));
    fill.addColorStop(1, withAlpha(ramp.dark, S.OUTER_ALPHA));
    const coreFill = ctx.createRadialGradient(0, 0, r0, 0, 0, R);
    coreFill.addColorStop(0, withAlpha(ramp.core, S.CORE_ALPHA));
    coreFill.addColorStop(1, withAlpha(ramp.core, 0));
    const N = S.SEGMENTS;
    for (let a = 0; a < arms; a++) {
        const a0 = (a / arms) * TAU;
        const center: Array<[number, number]> = [];
        const left: Array<[number, number]> = [];
        const right: Array<[number, number]> = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const r = R - (R - r0) * t;
            const th = a0 + turns * TAU * t;
            const w = (thickness * (1 - (1 - S.TAPER) * t)) / 2;
            const cx = Math.cos(th) * r, cy = Math.sin(th) * r;
            // 法線取半徑方向：光帶寬度落在內外兩側
            const nx = Math.cos(th), ny = Math.sin(th);
            center.push([cx, cy]);
            left.push([cx + nx * w, cy + ny * w]);
            right.push([cx - nx * w, cy - ny * w]);
        }
        ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (let i = 1; i <= N; i++) ctx.lineTo(left[i][0], left[i][1]);
        for (let i = N; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
        ctx.closePath();
        ctx.save();
        ctx.shadowColor = withAlpha(ramp.main, S.HALO_ALPHA);
        ctx.shadowBlur = thickness * S.HALO_BLUR;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();
        // 中線亮芯
        ctx.beginPath();
        ctx.moveTo(center[0][0], center[0][1]);
        for (let i = 1; i <= N; i++) ctx.lineTo(center[i][0], center[i][1]);
        ctx.strokeStyle = coreFill;
        ctx.lineWidth = Math.max(1, thickness * S.CORE_W);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

/**
 * 多面奇點（kind 'construct'，shape 'singularity'）：錨點在中心，D＝直徑。
 * 外六角切成 6 個三角面，頂點偏左上：朝左上的面受光（main 較實）、朝右下的面背光（dark 較透），中心最深；
 * 中央是轉 30° 的深色事件視界，外圈一道 core 壓縮亮環。魔法能量體：半透明＋外暈＋亮邊，不描深色外框（ULT-V01）。
 */
function bakeSingularity(ctx: CanvasRenderingContext2D, D: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.CONSTRUCT;
    const S = C.SINGULARITY;
    const R = D / 2;
    const ax = S.APEX[0] * R, ay = S.APEX[1] * R;
    // 光源在左上：面朝向 (−1,−1)/√2 的程度決定受光
    const lx = -Math.SQRT1_2, ly = -Math.SQRT1_2;

    // 整體外暈（先畫，面再蓋上去）
    ctx.save();
    hexPath(ctx, R);
    ctx.shadowColor = withAlpha(ramp.main, C.AURA_ALPHA);
    ctx.shadowBlur = D * C.AURA_BLUR;
    ctx.fillStyle = withAlpha(ramp.dark, S.FACET_SHADE_ALPHA);
    ctx.fill();
    ctx.restore();

    for (let k = 0; k < VFX_PARTS.HEX.SIDES; k++) {
        const [x0, y0] = hexVertex(R, k);
        const [x1, y1] = hexVertex(R, k + 1);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const len = Math.hypot(mx, my) || 1;
        const lit = Math.max(0, (mx * lx + my * ly) / len);
        const g = ctx.createLinearGradient(ax, ay, mx, my);
        g.addColorStop(0, withAlpha(ramp.dark, S.FACET_CENTER_ALPHA));
        if (lit > 0) {
            // 受光面：外緣是 main，最亮的面再往 core 透出一點光
            g.addColorStop(S.FACET_EDGE_STOP, withAlpha(ramp.main, S.FACET_SHADE_ALPHA + (S.FACET_LIT_ALPHA - S.FACET_SHADE_ALPHA) * lit));
            g.addColorStop(1, withAlpha(ramp.core, S.FACET_GLINT_ALPHA * lit));
        } else {
            g.addColorStop(1, withAlpha(ramp.dark, S.FACET_SHADE_ALPHA));
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
    }

    // 稜線：頂點到六個角
    ctx.strokeStyle = withAlpha(ramp.core, S.EDGE_ALPHA);
    ctx.lineWidth = Math.max(1, D * C.RIM_W);
    ctx.beginPath();
    for (let k = 0; k < VFX_PARTS.HEX.SIDES; k++) {
        const [x, y] = hexVertex(R, k);
        ctx.moveTo(ax, ay); ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 事件視界：轉 30° 的深色內六角，邊緣一圈被壓縮的亮光
    ctx.save();
    ctx.translate(ax * 0.5, ay * 0.5);
    ctx.rotate(Math.PI / 6);
    hexPath(ctx, R * S.HORIZON);
    ctx.shadowColor = ramp.main;
    ctx.shadowBlur = D * C.CORE_BLUR;
    ctx.strokeStyle = withAlpha(ramp.core, S.HORIZON_RIM_ALPHA);
    ctx.lineWidth = Math.max(1, D * S.HORIZON_RIM_W);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = withAlpha(VFX_NEUTRALS[S.HORIZON_COLOR], S.HORIZON_ALPHA);
    ctx.fill();
    ctx.restore();

    // 外框亮邊
    hexPath(ctx, R);
    ctx.strokeStyle = withAlpha(ramp.core, C.RIM_ALPHA);
    ctx.lineWidth = Math.max(1, D * C.RIM_W);
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 壓縮光環：整圈是柔和的 main 光暈，受光側（左上）再疊一段 core 亮弧，看得出圓環有前後與受光
    ctx.save();
    ctx.shadowColor = ramp.main;
    ctx.shadowBlur = D * S.RING_BLUR;
    ctx.strokeStyle = withAlpha(ramp.main, S.RING_ALPHA);
    ctx.lineWidth = Math.max(1, D * S.RING_W);
    ctx.beginPath();
    ctx.arc(0, 0, D * S.RING_R, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(ramp.core, S.RING_LIT_ALPHA);
    ctx.lineWidth = Math.max(1, D * S.RING_W * S.RING_LIT_W);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, D * S.RING_R, S.RING_LIT_ARC_DEG[0] * Math.PI / 180, S.RING_LIT_ARC_DEG[1] * Math.PI / 180);
    ctx.stroke();
    ctx.restore();
}

/** 正 n 邊形路徑（第一個頂點在正上方），中心 (cx, cy)。 */
function polygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number): void {
    ctx.beginPath();
    for (let k = 0; k < sides; k++) {
        const a = -Math.PI / 2 + (k / sides) * TAU;
        if (k === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
}

/**
 * 多面蝕月（kind 'construct'，shape 'eclipse'）：錨點在中心，D＝直徑。
 * 日冕光暈 → 低多邊形月面（三角面、受光在左上）→ 偏右下的深色暗影蓋住大半，露出左上月牙 → 暗影上淡淡的稜線 → 月牙 core 紅緣。
 * 魔法能量體：月面半透明＋外暈，不是實心石球，也不是六角柱（ULT-V01）。
 */
function bakeEclipse(ctx: CanvasRenderingContext2D, D: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.CONSTRUCT;
    const E = C.ECLIPSE;
    const R = D / 2;
    const n = E.SIDES;
    const ax = E.APEX[0] * R, ay = E.APEX[1] * R;
    const vtx = (k: number): [number, number] => {
        const a = -Math.PI / 2 + (k / n) * TAU;
        return [Math.cos(a) * R, Math.sin(a) * R];
    };

    // 日冕
    const corona = ctx.createRadialGradient(0, 0, R * E.CORONA_IN, 0, 0, R * E.CORONA_OUT);
    corona.addColorStop(0, withAlpha(ramp.main, E.CORONA_ALPHA));
    corona.addColorStop(1, withAlpha(ramp.dark, 0));
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(0, 0, R * E.CORONA_OUT, 0, TAU);
    ctx.fill();

    // 月面三角面：朝左上的面受光
    const lx = -Math.SQRT1_2, ly = -Math.SQRT1_2;
    for (let k = 0; k < n; k++) {
        const [x0, y0] = vtx(k);
        const [x1, y1] = vtx(k + 1);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const lit = Math.max(0, (mx * lx + my * ly) / (Math.hypot(mx, my) || 1));
        const g = ctx.createLinearGradient(ax, ay, mx, my);
        g.addColorStop(0, withAlpha(ramp.dark, E.FACET_CENTER_ALPHA));
        g.addColorStop(1, withAlpha(lit > 0 ? ramp.main : ramp.dark, E.FACET_SHADE_ALPHA + (E.FACET_LIT_ALPHA - E.FACET_SHADE_ALPHA) * lit));
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
    }
    const edges = (alpha: number) => {
        ctx.strokeStyle = withAlpha(ramp.core, alpha);
        ctx.lineWidth = Math.max(1, D * C.RIM_W);
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
            const [x, y] = vtx(k);
            ctx.moveTo(ax, ay); ctx.lineTo(x, y);
        }
        ctx.stroke();
    };
    edges(E.EDGE_ALPHA);

    // 蝕影：偏右下的深色多邊形，只蓋在月面上（clip），露出左上月牙
    ctx.save();
    polygonPath(ctx, 0, 0, R, n);
    ctx.clip();
    const sx = E.SHADOW_OFF[0] * R, sy = E.SHADOW_OFF[1] * R, sr = R * E.SHADOW_R;
    const shade = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    shade.addColorStop(0, withAlpha(VFX_NEUTRALS[E.SHADOW_COLOR], E.SHADOW_ALPHA));
    shade.addColorStop(E.SHADOW_CORE_STOP, withAlpha(VFX_NEUTRALS[E.SHADOW_COLOR], E.SHADOW_ALPHA));
    shade.addColorStop(1, withAlpha(ramp.dark, E.SHADOW_RIM_ALPHA));
    polygonPath(ctx, sx, sy, sr, n);
    ctx.fillStyle = shade;
    ctx.fill();
    edges(E.SHADOW_EDGE_ALPHA);
    ctx.restore();

    // 月牙紅緣
    ctx.save();
    ctx.shadowColor = ramp.main;
    ctx.shadowBlur = D * C.CORE_BLUR;
    ctx.strokeStyle = withAlpha(ramp.core, E.RIM_ALPHA);
    ctx.lineWidth = Math.max(1, D * E.RIM_W);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, R, (E.RIM_ARC_DEG[0] * Math.PI) / 180, (E.RIM_ARC_DEG[1] * Math.PI) / 180);
    ctx.stroke();
    ctx.restore();
}

/**
 * 劍輪（kind 'construct'，shape 'bladeWheel'）：錨點在中心，D＝直徑。BLADES 把能量劍從內圈伸到外緣、劍尖順著旋轉方向偏一點，
 * 每把劍前緣受光、後緣背光，後方拖一道殘影弧。貼地＋vRotation 播放＝劍刃繞施法者旋轉（ULT-V01：魔法構造體，不是實心刀）。
 */
function bakeBladeWheel(ctx: CanvasRenderingContext2D, D: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.CONSTRUCT;
    const B = C.BLADE_WHEEL;
    const R = D / 2;
    const r0 = R * B.ROOT;
    const hw = (R * B.WIDTH) / 2;
    const sweep = (B.SWEEP_DEG * Math.PI) / 180;
    for (let i = 0; i < B.BLADES; i++) {
        const a = (i / B.BLADES) * TAU;
        // 殘影弧：在劍的後方（逆旋轉方向）
        ctx.save();
        ctx.strokeStyle = withAlpha(ramp.core, B.TRAIL_ALPHA);
        ctx.lineWidth = Math.max(1, D * B.TRAIL_W);
        ctx.lineCap = 'round';
        ctx.shadowColor = ramp.main;
        ctx.shadowBlur = D * C.CORE_BLUR;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1 + B.ROOT) / 2, a + sweep / 2 - (B.TRAIL_DEG * Math.PI) / 180, a + sweep / 2 - sweep);
        ctx.stroke();
        ctx.restore();
        // 劍身：根部在 r0（角度 a），劍尖在 R（角度 a＋sweep）；前緣（旋轉方向那側）受光
        const ca = Math.cos(a), sa = Math.sin(a);
        const tx = Math.cos(a + sweep) * R, ty = Math.sin(a + sweep) * R;
        const bx = ca * r0, by = sa * r0;
        const nx = -sa, ny = ca;
        const mx = Math.cos(a + sweep * VFX_PARTS.CONSTRUCT.BLADE_WHEEL.MID_SWEEP) * R * VFX_PARTS.CONSTRUCT.BLADE_WHEEL.MID_RADIUS, my = Math.sin(a + sweep * VFX_PARTS.CONSTRUCT.BLADE_WHEEL.MID_SWEEP) * R * VFX_PARTS.CONSTRUCT.BLADE_WHEEL.MID_RADIUS;
        const half = (side: number) => () => {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + nx * hw * side, by + ny * hw * side);
            ctx.lineTo(mx + nx * hw * side, my + ny * hw * side);
            ctx.lineTo(tx, ty);
            ctx.lineTo(mx, my);
            ctx.closePath();
        };
        energyPiece(ctx, half(1), faceGradient(ctx, bx, by, tx, ty, ramp, true), ramp, D);
        energyPiece(ctx, half(-1), faceGradient(ctx, bx, by, tx, ty, ramp, false), ramp, D);
        // 劍格
        const g = (R * B.GUARD) / 2;
        coreLine(ctx, ramp, D, () => { ctx.beginPath(); ctx.moveTo(bx + nx * g, by + ny * g); ctx.lineTo(bx - nx * g, by - ny * g); });
    }
}

/**
 * 塔盾（kind 'construct'，shape 'towerShield'）：盾尖在錨點 (0,0) 朝下，上緣在 −H。
 * 左半受光、右半背光，盾面一道聖十字內光，盾心一顆寶石光（ULT-V01：魔法光盾，不是實心鐵盾）。
 */
function bakeTowerShield(ctx: CanvasRenderingContext2D, H: number, ramp: VFXRamp): void {
    const S = VFX_PARTS.CONSTRUCT.TOWER_SHIELD;
    const hw = (S.WIDTH * H) / 2;
    const yS = -S.SHOULDER * H;
    const half = (side: number) => () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * hw, yS * VFX_PARTS.CONSTRUCT.TOWER_SHIELD.TIP_CURVE, side * hw, yS);
        ctx.lineTo(side * hw, -H * (1 - S.TOP_ARCH));
        ctx.quadraticCurveTo(side * hw * 0.5, -H, 0, -H);
        ctx.closePath();
    };
    energyPiece(ctx, half(-1), faceGradient(ctx, -hw, -H, 0, 0, ramp, true), ramp, H);
    energyPiece(ctx, half(1), faceGradient(ctx, 0, -H, hw, 0, ramp, false), ramp, H);
    coreLine(ctx, ramp, H, () => { ctx.beginPath(); ctx.moveTo(0, -S.CROSS_V[0] * H); ctx.lineTo(0, -S.CROSS_V[1] * H); });
    coreLine(ctx, ramp, H, () => { ctx.beginPath(); ctx.moveTo(-S.CROSS_HALF * H, -S.CROSS_H * H); ctx.lineTo(S.CROSS_HALF * H, -S.CROSS_H * H); });
    bakeGlowAt(ctx, 0, -S.BOSS_Y * H, S.BOSS_R * H, ramp);
}

/**
 * 冠冕（kind 'construct'，shape 'crown'）：錨點在中心，W＝寬。下方冠環（上亮下暗）＋ POINTS 個冠尖（左側受光），
 * 冠尖頂與冠環上各有寶石光。
 */
function bakeCrown(ctx: CanvasRenderingContext2D, W: number, ramp: VFXRamp): void {
    const C = VFX_PARTS.CONSTRUCT.CROWN;
    const hw = W / 2;
    const bottom = (C.HEIGHT * W) / 2;
    const bandTop = bottom - C.BAND_H * W;
    const tipY = bandTop - C.POINT_H * W;
    // 冠尖（在冠環後面）
    for (let i = 0; i < C.POINTS; i++) {
        const u = C.POINTS > 1 ? i / (C.POINTS - 1) : 0.5;
        const cx = -hw + W * u;
        const pw = W / (C.POINTS - 1) / 2;
        const h = i % 2 === 0 ? 1 : VFX_PARTS.CONSTRUCT.CROWN.ALT_POINT_HEIGHT;
        const ty = bandTop - (bandTop - tipY) * h;
        const point = () => {
            ctx.beginPath();
            ctx.moveTo(Math.max(-hw, cx - pw), bandTop);
            ctx.lineTo(cx, ty);
            ctx.lineTo(Math.min(hw, cx + pw), bandTop);
            ctx.closePath();
        };
        energyPiece(ctx, point, faceGradient(ctx, cx - pw, ty, cx + pw, bandTop, ramp, u < 0.5), ramp, W);
        bakeGlowAt(ctx, cx, ty, C.GEM_R * W, ramp);
    }
    // 冠環
    energyPiece(ctx, () => { ctx.beginPath(); ctx.rect(-hw, bandTop, W, bottom - bandTop); },
        faceGradient(ctx, 0, bandTop, 0, bottom, ramp, true), ramp, W);
    coreLine(ctx, ramp, W, () => { ctx.beginPath(); ctx.moveTo(-hw, (bandTop + bottom) / 2); ctx.lineTo(hw, (bandTop + bottom) / 2); });
    for (let i = 0; i < C.BAND_GEMS; i++) {
        const x = -hw + (W * (i + 1)) / (C.BAND_GEMS + 1);
        bakeGlowAt(ctx, x, (bandTop + bottom) / 2, C.GEM_R * W * VFX_PARTS.CONSTRUCT.CROWN.BAND_GEM_SCALE, ramp);
    }
}

/**
 * 巨拳（kind 'construct'，shape 'fist'）：拳面底部在錨點 (0,0) 朝下，前臂往上到 −L。
 * 前臂與拳頭都是左受光右背光的能量體，底部一排指節、左側拇指，前臂兩道護腕亮紋（ULT-V01：泰坦之力的魔法拳，不是石雕）。
 */
function bakeFist(ctx: CanvasRenderingContext2D, L: number, ramp: VFXRamp): void {
    const F = VFX_PARTS.CONSTRUCT.FIST;
    const aw = (F.ARM_W * L) / 2;
    const hw = (F.HAND_W * L) / 2;
    const handTop = -F.HAND_TOP * L;
    const kr = F.KNUCKLE_R * L;
    // 圓角塊：只把外側兩角做圓（左右兩半拼起來是一整塊圓角體）
    const rr = F.ROUND * L;
    const block = (x0: number, y0: number, x1: number, y1: number, lit: boolean) => {
        const r = Math.min(rr, (x1 - x0) / 2, (y1 - y0) / 2);
        const outerLeft = lit;
        energyPiece(ctx, () => {
            ctx.beginPath();
            if (outerLeft) {
                ctx.moveTo(x1, y0); ctx.lineTo(x0 + r, y0); ctx.quadraticCurveTo(x0, y0, x0, y0 + r);
                ctx.lineTo(x0, y1 - r); ctx.quadraticCurveTo(x0, y1, x0 + r, y1); ctx.lineTo(x1, y1);
            } else {
                ctx.moveTo(x0, y0); ctx.lineTo(x1 - r, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
                ctx.lineTo(x1, y1 - r); ctx.quadraticCurveTo(x1, y1, x1 - r, y1); ctx.lineTo(x0, y1);
            }
            ctx.closePath();
        }, faceGradient(ctx, x0, y0, x1, y1, ramp, lit), ramp, L);
    };
    // 前臂
    block(-aw, -F.ARM_TOP * L, 0, handTop, true);
    block(0, -F.ARM_TOP * L, aw, handTop, false);
    for (const b of F.BRACER) coreLine(ctx, ramp, L, () => { ctx.beginPath(); ctx.moveTo(-aw, -b * L); ctx.lineTo(aw, -b * L); });
    // 拳頭
    block(-hw, handTop, 0, -kr, true);
    block(0, handTop, hw, -kr, false);
    // 指節
    for (let i = 0; i < F.KNUCKLES; i++) {
        const x = -hw + kr + ((hw * 2 - kr * 2) * i) / (F.KNUCKLES - 1);
        energyPiece(ctx, () => { ctx.beginPath(); ctx.arc(x, -kr, kr, 0, TAU); }, faceGradient(ctx, x - kr, -kr * 2, x + kr, 0, ramp, x < 0), ramp, L);
    }
    // 拇指
    energyPiece(ctx, () => { ctx.beginPath(); ctx.ellipse(F.THUMB_X * L, -F.THUMB_Y * L, F.THUMB_R[0] * L, F.THUMB_R[1] * L, 0, 0, TAU); },
        faceGradient(ctx, F.THUMB_X * L - F.THUMB_R[0] * L, -F.THUMB_Y * L, F.THUMB_X * L + F.THUMB_R[0] * L, -F.THUMB_Y * L, ramp, true), ramp, L);
}

/**
 * 斷頭刃（kind 'construct'，shape 'guillotine'）：刃底中央在錨點 (0,0)，往上到 −H。
 * 厚重斜刃（刃口左低右高）＋頂部配重塊；左半受光右半背光，刃口一道 core 亮線（ULT-V01：血色能量刃，不是鐵器）。
 */
function bakeGuillotine(ctx: CanvasRenderingContext2D, H: number, ramp: VFXRamp): void {
    const G = VFX_PARTS.CONSTRUCT.GUILLOTINE;
    const hw = (G.WIDTH * H) / 2;
    const wy = -H * (1 - G.WEIGHT_H);
    const edgeL = 0, edgeR = -G.SLANT * H;
    // 刃身左右兩半（刃口是從左下到右上的斜線）
    const midEdge = (edgeL + edgeR) / 2;
    energyPiece(ctx, () => { ctx.beginPath(); ctx.moveTo(-hw, edgeL); ctx.lineTo(0, midEdge); ctx.lineTo(0, wy); ctx.lineTo(-hw, wy); ctx.closePath(); },
        faceGradient(ctx, -hw, wy, 0, edgeL, ramp, true), ramp, H);
    energyPiece(ctx, () => { ctx.beginPath(); ctx.moveTo(0, midEdge); ctx.lineTo(hw, edgeR); ctx.lineTo(hw, wy); ctx.lineTo(0, wy); ctx.closePath(); },
        faceGradient(ctx, 0, wy, hw, edgeR, ramp, false), ramp, H);
    // 配重塊
    const ww = hw * G.WEIGHT_W;
    energyPiece(ctx, () => { ctx.beginPath(); ctx.rect(-ww, -H, ww * 2, H * G.WEIGHT_H); },
        faceGradient(ctx, 0, -H, 0, wy, ramp, false), ramp, H);
    // 刃口亮線
    ctx.save();
    ctx.shadowColor = ramp.main;
    ctx.shadowBlur = H * VFX_PARTS.CONSTRUCT.CORE_BLUR;
    ctx.strokeStyle = withAlpha(ramp.core, G.EDGE_ALPHA);
    ctx.lineWidth = Math.max(1, H * VFX_PARTS.CONSTRUCT.CORE_W * VFX_PARTS.CONSTRUCT.GUILLOTINE.EDGE_WIDTH_MULT);
    ctx.beginPath(); ctx.moveTo(-hw, edgeL); ctx.lineTo(hw, edgeR); ctx.stroke();
    ctx.restore();
}

/**
 * 骨刺（kind 'construct'，shape 'ribSpike'）：根部中央在錨點 (0,0)，往上彎成尖刺到 −H。
 * 左緣受光、右緣背光，刺身兩道骨節亮紋（ULT-V01：血骨能量刺，半透明）。
 */
function bakeRibSpike(ctx: CanvasRenderingContext2D, H: number, ramp: VFXRamp): void {
    const R = VFX_PARTS.CONSTRUCT.RIB_SPIKE;
    const bw = (R.BASE_W * H) / 2;
    const tipX = R.BEND * H, tipY = -H;
    const cx = tipX * VFX_PARTS.CONSTRUCT.RIB_SPIKE.CONTROL_X, cy = -H * VFX_PARTS.CONSTRUCT.RIB_SPIKE.CONTROL_Y;
    const half = (side: number) => () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(side * bw, 0);
        ctx.quadraticCurveTo(cx + side * bw * VFX_PARTS.CONSTRUCT.RIB_SPIKE.CONTROL_WIDTH, cy, tipX, tipY);
        ctx.quadraticCurveTo(cx, cy, 0, 0);
        ctx.closePath();
    };
    energyPiece(ctx, half(-1), faceGradient(ctx, -bw, 0, tipX, tipY, ramp, true), ramp, H);
    energyPiece(ctx, half(1), faceGradient(ctx, bw, 0, tipX, tipY, ramp, false), ramp, H);
    for (const r of R.RIDGES) {
        const y = -r * H;
        const x = tipX * r * r;
        const w = bw * (1 - r);
        coreLine(ctx, ramp, H, () => { ctx.beginPath(); ctx.moveTo(x - w, y + w * VFX_PARTS.CONSTRUCT.RIB_SPIKE.RIDGE_SLOPE); ctx.lineTo(x + w, y - w * VFX_PARTS.CONSTRUCT.RIB_SPIKE.RIDGE_SLOPE); });
    }
}

/**
 * 深淵之眼（kind 'construct'，shape 'eye'）：錨點在中心，W＝寬。杏仁形深色眼（半透明）＋發光虹膜＋深色縱瞳＋core 眼緣。
 * 貼地（PART_GROUND）播放＝地面暗影裂開成眼。
 */
function bakeEye(ctx: CanvasRenderingContext2D, W: number, ramp: VFXRamp): void {
    const E = VFX_PARTS.CONSTRUCT.EYE;
    const C = VFX_PARTS.CONSTRUCT;
    const hw = W / 2, hh = (E.HEIGHT * W) / 2;
    const almond = () => {
        ctx.beginPath();
        ctx.moveTo(-hw, 0);
        ctx.quadraticCurveTo(0, -hh * 2, hw, 0);
        ctx.quadraticCurveTo(0, hh * 2, -hw, 0);
        ctx.closePath();
    };
    energyPiece(ctx, almond, withAlpha(ramp.dark, E.FILL_ALPHA), ramp, W);
    // 虹膜
    const ir = E.IRIS_R * W;
    const iris = ctx.createRadialGradient(0, 0, 0, 0, 0, ir);
    iris.addColorStop(0, ramp.core);
    iris.addColorStop(VFX_PARTS.CONSTRUCT.EYE.IRIS_MAIN_STOP, withAlpha(ramp.main, C.LIT_ALPHA[0]));
    iris.addColorStop(1, withAlpha(ramp.dark, C.SHADE_ALPHA[0]));
    ctx.save();
    almond();
    ctx.clip();
    ctx.fillStyle = iris;
    ctx.beginPath(); ctx.arc(0, 0, ir, 0, TAU); ctx.fill();
    // 縱瞳
    ctx.fillStyle = withAlpha(VFX_NEUTRALS.CHAR, E.FILL_ALPHA);
    ctx.beginPath(); ctx.ellipse(0, 0, (E.PUPIL_W * W) / 2, ir * E.PUPIL_H, 0, 0, TAU); ctx.fill();
    ctx.restore();
}

/**
 * 神矢（kind 'construct'，shape 'arrow'）：矢尖在錨點 (0,0) 朝下，尾端在 −L。
 * 寬矢頭左受光右背光，細矢桿一道 core 內光，尾端兩對尾羽，矢尖一點光（ULT-V01：聚光成形的神矢，不是木箭）。
 */
function bakeArrow(ctx: CanvasRenderingContext2D, L: number, ramp: VFXRamp): void {
    const A = VFX_PARTS.CONSTRUCT.ARROW;
    const hl = A.HEAD_LEN * L, hw = (A.HEAD_W * L) / 2, sw = (A.SHAFT_W * L) / 2;
    // 尾羽（在矢桿後面）
    const f0 = -A.FLETCH_START * L, f1 = f0 - A.FLETCH_LEN * L;
    for (const side of [-1, 1]) {
        energyPiece(ctx, () => {
            ctx.beginPath(); ctx.moveTo(side * sw, f0); ctx.lineTo(side * A.FLETCH_W * L, f1); ctx.lineTo(side * sw, f1 + A.FLETCH_LEN * L * VFX_PARTS.CONSTRUCT.ARROW.FLETCH_RETURN); ctx.closePath();
        }, faceGradient(ctx, side * A.FLETCH_W * L, f1, 0, f0, ramp, side < 0), ramp, L);
    }
    // 矢桿
    energyPiece(ctx, () => { ctx.beginPath(); ctx.rect(-sw, -L, sw * 2, L - hl); }, faceGradient(ctx, -sw, 0, sw, 0, ramp, true), ramp, L);
    coreLine(ctx, ramp, L, () => { ctx.beginPath(); ctx.moveTo(0, -hl); ctx.lineTo(0, -L); });
    // 矢頭
    energyPiece(ctx, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-hw, -hl); ctx.lineTo(0, -hl * VFX_PARTS.CONSTRUCT.ARROW.HEAD_NOTCH); ctx.closePath(); },
        faceGradient(ctx, -hw, -hl, 0, 0, ramp, true), ramp, L);
    energyPiece(ctx, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hl * VFX_PARTS.CONSTRUCT.ARROW.HEAD_NOTCH); ctx.lineTo(hw, -hl); ctx.closePath(); },
        faceGradient(ctx, 0, -hl, hw, 0, ramp, false), ramp, L);
    bakeGlowAt(ctx, 0, 0, A.TIP_GLOW * L, ramp);
}

/**
 * 惡魔翼（kind 'construct'，shape 'demonWings'）：背心在錨點 (0,0)，W＝翼展。
 * 左右翼膜（扇形下緣、半透明、靠翼臂的一側受光）＋翼骨 core 亮線＋中央一對角冠（ULT-V01：血色魔力凝成的翼影，不是肉翼）。
 */
function bakeDemonWings(ctx: CanvasRenderingContext2D, W: number, ramp: VFXRamp): void {
    const D = VFX_PARTS.CONSTRUCT.DEMON_WINGS;
    for (const side of [-1, 1]) {
        const sx = side * D.SHOULDER[0] * W, sy = D.SHOULDER[1] * W;
        const tx = side * D.TIP[0] * W, ty = D.TIP[1] * W;
        const hem = D.HEM_Y * W;
        // 翼骨末端：從翼尖沿下緣往翼根分布
        const ends: Array<[number, number]> = [];
        for (let i = 0; i < D.FINGERS; i++) {
            const u = (i + 1) / (D.FINGERS + 1);
            ends.push([tx + (sx - tx) * u, ty + (hem - ty) * Math.sqrt(u)]);
        }
        const membrane = () => {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            let px = tx, py = ty;
            for (const [ex, ey] of [...ends, [sx, hem * VFX_PARTS.CONSTRUCT.DEMON_WINGS.HEM_ROOT] as [number, number]]) {
                ctx.quadraticCurveTo((px + ex) / 2, (py + ey) / 2 - D.HEM_SAG * W, ex, ey);
                px = ex; py = ey;
            }
            ctx.closePath();
        };
        energyPiece(ctx, membrane, faceGradient(ctx, sx, sy, tx, hem, ramp, false), ramp, W);
        // 翼臂與翼骨
        coreLine(ctx, ramp, W, () => {
            ctx.beginPath();
            ctx.moveTo(sx, sy); ctx.lineTo(tx, ty);
            for (const [ex, ey] of ends) { ctx.moveTo(tx + (sx - tx) * VFX_PARTS.CONSTRUCT.DEMON_WINGS.FINGER_ROOT, ty + (sy - ty) * VFX_PARTS.CONSTRUCT.DEMON_WINGS.FINGER_ROOT); ctx.lineTo(ex, ey); }
        });
        // 角冠
        const bx = side * D.HORN_BASE[0] * W, by = D.HORN_BASE[1] * W;
        const hx = side * D.HORN_TIP[0] * W, hy = D.HORN_TIP[1] * W;
        const hw = D.HORN_W * W;
        energyPiece(ctx, () => {
            ctx.beginPath(); ctx.moveTo(bx - hw, by); ctx.quadraticCurveTo(bx - side * hw, (by + hy) / 2, hx, hy); ctx.quadraticCurveTo(bx + side * hw * 2, (by + hy) / 2, bx + hw, by); ctx.closePath();
        }, faceGradient(ctx, bx, by, hx, hy, ramp, true), ramp, W);
    }
}

/** 內光線：core 細線加光暈（彈頭環帶與中脊）。 */
function coreLine(ctx: CanvasRenderingContext2D, ramp: VFXRamp, L: number, path: () => void): void {
    const C = VFX_PARTS.CONSTRUCT;
    ctx.save();
    ctx.shadowColor = ramp.core;
    ctx.shadowBlur = L * C.CORE_BLUR;
    ctx.strokeStyle = ramp.core;
    ctx.lineWidth = Math.max(1, L * C.CORE_W);
    ctx.lineCap = 'round';
    path();
    ctx.stroke();
    ctx.restore();
}

/**
 * 重型能量彈頭（kind 'construct'，shape 'warhead'）：彈尖在錨點 (0,0) 朝下，尾端在 (0, −TAIL_Y×L)。
 * 尾焰先畫（在彈身後面往上拖），彈身左半受光、右半背光，兩片尾翼，彈身兩道發光環帶與中脊內光，彈尖一點熱光。
 */
function bakeWarhead(ctx: CanvasRenderingContext2D, L: number, ramp: VFXRamp): void {
    const W = VFX_PARTS.CONSTRUCT.WARHEAD;
    const bw = (W.BODY_W * L) / 2;
    const tw = (W.TAIL_W * L) / 2;
    const yS = -W.SHOULDER * L;
    const yT = -W.TAIL_Y * L;

    // 尾焰：從尾端往上收成尖，core → main → 透明
    const trailTop = yT - W.TRAIL_LEN * L;
    const trailHalf = (W.TRAIL_W * L) / 2;
    const trail = ctx.createLinearGradient(0, yT, 0, trailTop);
    trail.addColorStop(0, withAlpha(ramp.core, W.TRAIL_ALPHA));
    trail.addColorStop(W.TRAIL_MID_STOP, withAlpha(ramp.main, W.TRAIL_ALPHA * W.TRAIL_MID_ALPHA));
    trail.addColorStop(1, withAlpha(ramp.dark, 0));
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(-trailHalf, yT);
    ctx.quadraticCurveTo(-trailHalf / 2, (yT + trailTop) / 2, 0, trailTop);
    ctx.quadraticCurveTo(trailHalf / 2, (yT + trailTop) / 2, trailHalf, yT);
    ctx.closePath();
    ctx.fill();

    // 尾翼（在彈身後面）：從 FIN_START 往尾端外展
    const fy0 = -W.FIN_START * L;
    const fy1 = fy0 - W.FIN_LEN * L;
    const span = (W.FIN_SPAN * L) / 2;
    for (const side of [-1, 1]) {
        const fin = () => {
            ctx.beginPath();
            ctx.moveTo(side * bw * W.FIN_ROOT, fy0);
            ctx.lineTo(side * span, fy1 + W.FIN_LEN * L * W.FIN_EDGE);
            ctx.lineTo(side * span, fy1);
            ctx.lineTo(side * tw, yT);
            ctx.closePath();
        };
        energyPiece(ctx, fin, faceGradient(ctx, side * span, fy1, side * bw, fy0, ramp, side < 0), ramp, L);
    }

    // 彈身：彈尖弧形收斂到肩部，直身到尾端前再收窄
    const half = (side: number) => () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * bw, yS * W.OGIVE, side * bw, yS);
        ctx.lineTo(side * bw, yT + (yS - yT) * W.BOAT_TAIL);
        ctx.lineTo(side * tw, yT);
        ctx.lineTo(0, yT);
        ctx.closePath();
    };
    energyPiece(ctx, half(-1), faceGradient(ctx, -bw, yT, 0, 0, ramp, true), ramp, L);
    energyPiece(ctx, half(1), faceGradient(ctx, 0, yT, bw, 0, ramp, false), ramp, L);

    // 發光環帶（略向下彎，看得出彈身是圓柱）與中脊內光
    for (const b of W.BAND_Y) {
        const y = -b * L;
        coreLine(ctx, ramp, L, () => { ctx.beginPath(); ctx.moveTo(-bw, y); ctx.quadraticCurveTo(0, y + bw * W.BAND_CURVE, bw, y); });
    }
    coreLine(ctx, ramp, L, () => { ctx.beginPath(); ctx.moveTo(-bw * W.SPINE_X, yS * W.OGIVE); ctx.lineTo(-bw * W.SPINE_X, yT); });

    // 彈尖熱光
    bakeGlowAt(ctx, 0, 0, W.NOSE_GLOW * L, ramp);
}

/** 在 (x, y) 畫一顆硬光點（bakeGlow 的平移版，炸彈引信火花用）。 */
function bakeGlowAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ramp: VFXRamp): void {
    ctx.save();
    ctx.translate(x, y);
    bakeGlow(ctx, r, ramp, true);
    ctx.restore();
}
