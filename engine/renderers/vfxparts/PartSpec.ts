/**
 * PartSpec — 特效零件的參數型別、量化、快取鍵與外框尺寸（ART_SPEC §7）
 * -----------------------------------------------------------------------------
 *  - 純函式、無 DOM 依賴，可直接單元測試。
 *  - normalizePartSpec 把連續參數量化到有限級距，確保快取量有上限。
 */

import { VFX_PARTS } from '../../../data/vfx/parts/partConfig';
import { VFX_SOLID_RAMPS, type VFXRampId, type VFXNeutralId } from '../../../data/vfx/parts/vfxPalette';

export type SigilEmblem = 'sun' | 'lionShield' | 'hornSkull' | 'invTriangle';
export type ShardShape = 'crystal' | 'hex' | 'rock' | 'bone';
/** 光束磚的邊緣樣式：乾淨光管、兩側虛線（死光）、鋸齒（閃電）、珠鏈（血鏈） */
export type BeamEdge = 'clean' | 'dashed' | 'zigzag' | 'beads';
/** 投射物本體外形（指向 +x，錨點在中心）；清單由 VFX_PARTS.MISSILE.HEIGHT 的鍵定義（data/vfx/parts/partConfig.ts） */
export type { MissileShape } from '../../../data/vfx/parts/partConfig';
import type { MissileShape } from '../../../data/vfx/parts/partConfig';
/** 實體投射物（一般混合）；其餘是能量（加法） */
const SOLID_MISSILES: ReadonlySet<MissileShape> = new Set<MissileShape>(['arrow', 'axe', 'bomb', 'hook']);

/**
 * 有上下方向的法陣圖騰（盾、顱骨、倒三角）。貼地零件在 POINTY 地圖會整張轉 π/6 讓六角外框對齊格子，
 * 這些圖騰若跟著轉會歪掉，所以烘焙時先反向轉回（見 VFXPartStore.get 的 groundRotation）。
 * 太陽紋（12 道放射＋同心六角）近似旋轉對稱，直接跟著轉，不另烘焙。
 */
const UPRIGHT_EMBLEMS: ReadonlySet<SigilEmblem> = new Set<SigilEmblem>(['lionShield', 'hornSkull', 'invTriangle']);

/** 貼地繪製時會再轉 groundRotation 的零件，烘焙時圖騰要反向轉多少（0 = 不需要另烘焙）。 */
export function emblemCounterRotation(n: PartSpec, groundRotation: number): number {
    if (groundRotation === 0 || n.kind !== 'sigil' || !UPRIGHT_EMBLEMS.has(n.emblem)) return 0;
    return -groundRotation;
}

export type PartSpec =
    | { kind: 'glow'; radius: number; ramp: VFXRampId; hard?: boolean }
    | { kind: 'ring'; radius: number; thickness: number; ramp: VFXRampId; roughness?: number; seed?: number }
    | { kind: 'slashArc'; radius: number; arcDeg: number; thickness: number; ramp: VFXRampId }
    | { kind: 'rays'; radius: number; count: number; ramp: VFXRampId; lengthJitter?: number; seed?: number }
    | { kind: 'bolt'; length: number; branches: number; ramp: VFXRampId; seed?: number }
    | { kind: 'flame'; height: number; ramp: VFXRampId; jagged?: boolean }
    | { kind: 'smoke'; radius: number; color: VFXNeutralId; roughness?: number; seed?: number }
    | { kind: 'shard'; size: number; shape: ShardShape; ramp: VFXRampId; seed?: number }
    | { kind: 'sigil'; radius: number; emblem: SigilEmblem; ramp: VFXRampId }
    | { kind: 'pillar'; width: number; height: number; ramp: VFXRampId }
    | { kind: 'spark'; length: number; ramp: VFXRampId }
    | { kind: 'droplet'; size: number; ramp: VFXRampId }
    | { kind: 'beam'; width: number; ramp: VFXRampId; edge: BeamEdge; seed?: number }
    | { kind: 'missile'; shape: MissileShape; length: number; ramp: VFXRampId };

export type PartKind = PartSpec['kind'];

/** 世界單位的外框：sprite 寬高與錨點（相對左上角）。 */
export interface PartBounds {
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
}

export function quantizeSize(v: number, steps: readonly number[] = VFX_PARTS.SIZE_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= v - 1e-4) return steps[i];
    }
    return steps[steps.length - 1];
}

function quantizeUnit(v: number | undefined): number {
    const x = Math.max(0, Math.min(1, v ?? 0));
    return Math.round(x / VFX_PARTS.UNIT_STEP) * VFX_PARTS.UNIT_STEP;
}

function quantizeAngleDeg(deg: number): number {
    const step = VFX_PARTS.ANGLE_STEP_DEG;
    return Math.max(step, Math.min(360, Math.round(deg / step) * step));
}

export function quantizeSeed(seed: number | undefined): number {
    const n = Math.floor(Math.abs(seed ?? 0));
    return n % VFX_PARTS.SEED_VARIANTS;
}

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** 把參數量化成有限級距；同一組量化結果共用同一張烘焙 sprite。 */
export function normalizePartSpec(spec: PartSpec): PartSpec {
    switch (spec.kind) {
        case 'glow':
            return { kind: 'glow', radius: quantizeSize(spec.radius), ramp: spec.ramp, hard: !!spec.hard };
        case 'ring': {
            const radius = quantizeSize(spec.radius);
            const roughness = quantizeUnit(spec.roughness);
            // 種子只影響粗糙外緣；乾淨環共用同一張
            return { kind: 'ring', radius, thickness: Math.min(radius, quantizeSize(spec.thickness)), ramp: spec.ramp, roughness, seed: roughness > 0 ? quantizeSeed(spec.seed) : 0 };
        }
        case 'slashArc': {
            const radius = quantizeSize(spec.radius);
            return { kind: 'slashArc', radius, arcDeg: quantizeAngleDeg(spec.arcDeg), thickness: Math.min(radius, quantizeSize(spec.thickness)), ramp: spec.ramp };
        }
        case 'rays': {
            const lengthJitter = quantizeUnit(spec.lengthJitter);
            return { kind: 'rays', radius: quantizeSize(spec.radius), count: clampInt(spec.count, 3, 32), ramp: spec.ramp, lengthJitter, seed: lengthJitter > 0 ? quantizeSeed(spec.seed) : 0 };
        }
        case 'bolt':
            return { kind: 'bolt', length: quantizeSize(spec.length), branches: clampInt(spec.branches, 0, 6), ramp: spec.ramp, seed: quantizeSeed(spec.seed) };
        case 'flame':
            return { kind: 'flame', height: quantizeSize(spec.height), ramp: spec.ramp, jagged: !!spec.jagged };
        case 'smoke':
            return { kind: 'smoke', radius: quantizeSize(spec.radius), color: spec.color, roughness: quantizeUnit(spec.roughness), seed: quantizeSeed(spec.seed) };
        case 'shard':
            return { kind: 'shard', size: quantizeSize(spec.size), shape: spec.shape, ramp: spec.ramp, seed: spec.shape === 'rock' ? quantizeSeed(spec.seed) : 0 };
        case 'sigil':
            return { kind: 'sigil', radius: quantizeSize(spec.radius), emblem: spec.emblem, ramp: spec.ramp };
        case 'pillar':
            return { kind: 'pillar', width: quantizeSize(spec.width), height: quantizeSize(spec.height), ramp: spec.ramp };
        case 'spark':
            return { kind: 'spark', length: quantizeSize(spec.length), ramp: spec.ramp };
        case 'droplet':
            return { kind: 'droplet', size: quantizeSize(spec.size), ramp: spec.ramp };
        case 'beam':
            // 種子只影響鋸齒折線；其他邊緣共用同一張
            return { kind: 'beam', width: quantizeSize(spec.width), ramp: spec.ramp, edge: spec.edge, seed: spec.edge === 'zigzag' ? quantizeSeed(spec.seed) : 0 };
        case 'missile':
            return { kind: 'missile', shape: spec.shape, length: quantizeSize(spec.length), ramp: spec.ramp };
    }
}

/** 快取鍵：量化後參數依固定欄位順序串接（不含時間）。 */
export function partKey(n: PartSpec, frameCount: number): string {
    const fields = Object.keys(n).sort().map((k) => `${k}=${String((n as Record<string, unknown>)[k])}`);
    return `${fields.join('|')}|f=${frameCount}`;
}

/** 動畫零件的基準影格數（品質階層 0）；靜態零件為 1。 */
export function baseFrameCount(kind: PartKind): number {
    if (kind === 'flame') return VFX_PARTS.FRAMES.flame;
    if (kind === 'bolt') return VFX_PARTS.FRAMES.bolt;
    if (kind === 'beam') return VFX_PARTS.FRAMES.beam;
    return 1;
}

/** 依品質階層縮減影格數；主形狀不消失（至少 MIN_FRAMES）。 */
export function frameCountForTier(kind: PartKind, tier: number): number {
    const base = baseFrameCount(kind);
    if (base <= 1) return 1;
    const ratios = VFX_PARTS.TIER_FRAME_RATIO;
    const ratio = ratios[Math.max(0, Math.min(ratios.length - 1, tier))];
    return Math.max(VFX_PARTS.MIN_FRAMES, Math.round(base * ratio));
}

/** 預設混合模式：光類用加法（ART_SPEC §10-4）；煙、液滴、實體碎片、實體色階（血、瘴氣、深淵）用一般混合。 */
export function partBlend(n: PartSpec): GlobalCompositeOperation {
    // 光束一律是光（血鏈也是能量連線，不是實體血）
    if (n.kind === 'beam') return 'lighter';
    if (n.kind === 'smoke' || n.kind === 'droplet') return 'source-over';
    if (n.kind === 'missile' && SOLID_MISSILES.has(n.shape)) return 'source-over';
    if (VFX_SOLID_RAMPS.includes(n.ramp)) return 'source-over';
    if (n.kind === 'shard' && n.shape !== 'crystal' && n.shape !== 'hex') return 'source-over';
    return 'lighter';
}

/** 世界單位外框（未含 PAD）。錨點：圓形零件在中心；柱狀、火焰、雷在底部中央；火花在頭端。 */
export function partBounds(n: PartSpec): PartBounds {
    const pad = VFX_PARTS.PAD;
    switch (n.kind) {
        case 'sigil': {
            const S = VFX_PARTS.SIGIL;
            const haloHalf = Math.max(1, n.radius * S.LINE_RATIO) * S.HALO_RATIO * S.HALO_WIDTH_MUL / 2;
            const d = (n.radius * S.OUTER_RING + haloHalf) * 2 + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'glow':
        case 'rays': {
            const d = n.radius * 2 + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'ring': {
            // 六角頂點（內角 120°）的斜接會讓光暈描邊外凸 halfWidth / sin(60°)
            const halfHalo = n.thickness * VFX_PARTS.RING.HALO_WIDTH / 2;
            const d = (n.radius + halfHalo / Math.sin(Math.PI / 3)) * 2 + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'slashArc': {
            const d = (n.radius + n.thickness) * 2 + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'smoke': {
            const d = n.radius * 2 * VFX_PARTS.SMOKE.EXTENT + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'bolt': {
            // 中點位移累積上限約 2×DISPLACE×L，分叉再外伸 BRANCH_LEN×L（可低於命中點）；光暈半寬另計
            const B = VFX_PARTS.BOLT;
            const halo = B.HALO_W / 2;
            const reach = n.branches > 0 ? n.length * B.BRANCH_LEN : 0;
            const half = n.length * 2 * B.DISPLACE + reach + halo;
            const w = half * 2 + pad * 2;
            const h = halo + n.length + reach + halo + pad * 2;
            return { width: w, height: h, anchorX: w / 2, anchorY: pad + halo + n.length };
        }
        case 'flame': {
            const w = n.height * VFX_PARTS.FLAME.WIDTH_RATIO * VFX_PARTS.FLAME.EXTENT + pad * 2;
            const h = n.height + pad * 2;
            return { width: w, height: h, anchorX: w / 2, anchorY: h - pad };
        }
        case 'pillar': {
            const w = n.width + pad * 2;
            const h = n.height + n.width * VFX_PARTS.PILLAR.BASE_ELLIPSE + pad * 2;
            return { width: w, height: h, anchorX: w / 2, anchorY: h - pad - n.width * VFX_PARTS.PILLAR.BASE_ELLIPSE / 2 };
        }
        case 'spark': {
            const t = Math.max(2, n.length * VFX_PARTS.SPARK.HEAD_GLOW_RATIO);
            const w = n.length + t + pad * 2;
            const h = t * 2 + pad * 2;
            return { width: w, height: h, anchorX: w - t - pad, anchorY: h / 2 };
        }
        case 'beam': {
            // 左右不加 PAD：磚要首尾無縫平鋪。錨點在左端中線（光束起點）。
            const h = n.width * VFX_PARTS.BEAM.HALO_RATIO + pad * 2;
            return { width: VFX_PARTS.BEAM.TILE_LEN, height: h, anchorX: 0, anchorY: h / 2 };
        }
        case 'shard':
        case 'droplet': {
            const d = n.size * 2 + pad * 2;
            return { width: d, height: d, anchorX: d / 2, anchorY: d / 2 };
        }
        case 'missile': {
            // 長度方向 = length；高度依外形（VFX_PARTS.MISSILE.HEIGHT）；錨點在中心（投射物位置）
            const w = n.length + pad * 2;
            const h = n.length * VFX_PARTS.MISSILE.HEIGHT[n.shape] + pad * 2;
            return { width: w, height: h, anchorX: w / 2, anchorY: h / 2 };
        }
    }
}

/** 烘焙用的確定性亂數（mulberry32）；只用於視覺外形，不影響戰鬥。 */
export function createPartRng(seed: number): () => number {
    let a = (seed + 0x9e3779b9) >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 中點位移分叉雷的折線（純幾何，可測試）。起點 (0,0) 在上，終點 (0,length) 在下。 */
export function boltPolyline(length: number, seed: number, depth: number = VFX_PARTS.BOLT.DEPTH, displace: number = VFX_PARTS.BOLT.DISPLACE): Array<[number, number]> {
    const rng = createPartRng(seed);
    let pts: Array<[number, number]> = [[0, 0], [0, length]];
    let amp = length * displace;
    for (let d = 0; d < depth; d++) {
        const next: Array<[number, number]> = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1];
            const [x1, y1] = pts[i];
            next.push([(x0 + x1) / 2 + (rng() * 2 - 1) * amp, (y0 + y1) / 2], [x1, y1]);
        }
        pts = next;
        amp *= VFX_PARTS.BOLT.FALLOFF;
    }
    // 終點固定在命中點
    pts[pts.length - 1] = [0, length];
    return pts;
}
