import { floatXorHash2 as hash2 } from '../../math/hash';
/**
 * NoiseLib — Canvas 2D 版的 shader 噪聲庫
 * -----------------------------------------------------------------------------
 * 對方在 GLSL 裡每帧用 GPU 算噪聲；我們改成「一次性烘焙成離屏遮罩 + cache」，
 * 數學本質相同（value noise + fbm），但成本從 per-frame 變成 per-material。
 *
 * 噪聲為確定性（seed 驅動），所以同一個 key 每次產生完全一樣的紋理，
 * 不會出現隨機閃爍，也讓截圖比對可重現。
 */

import { createCanvas } from '../CanvasUtils';
import { NoiseFieldConfig } from '../../../data/vfx/materialConfig';

/** 整數雜湊 → [0,1)，取代 GLSL 的 fract(sin(dot(...))) */


function smootherstep(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 2D value noise，回傳 [0,1] */
function valueNoise(x: number, y: number, seed: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smootherstep(x - ix);
    const fy = smootherstep(y - iy);

    const a = hash2(ix, iy, seed);
    const b = hash2(ix + 1, iy, seed);
    const c = hash2(ix, iy + 1, seed);
    const d = hash2(ix + 1, iy + 1, seed);

    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy;
}

/** 分形疊加噪聲（fractal brownian motion），回傳 [0,1] */
function fbm(x: number, y: number, cfg: NoiseFieldConfig, seed: number): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < cfg.octaves; o++) {
        sum += valueNoise(x * freq, y * freq, seed + o * 101) * amp;
        norm += amp;
        amp *= cfg.persistence;
        freq *= cfg.lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
}

// =============================================================================
// 灰階顆粒層（detail noise）
// -----------------------------------------------------------------------------
// 不做門檻裁切，而是輸出中灰 ±contrast 的灰階圖，
// 搭配 globalCompositeOperation:'overlay' 疊在已繪製的表面上，
// 等價於 shader 裡對 albedo 乘上 detail noise —— 保留原色相，只加材質起伏。
// =============================================================================

import type { SurfaceGrainConfig } from '../../../data/vfx/materialConfig';

const grainCache = new Map<string, HTMLCanvasElement>();

/**
 * 產生一張灰階顆粒貼圖。
 * @param cfg     顆粒設定
 * @param variant 變體編號（同時作為 seed 與明度偏移依據）
 * @param size    輸出邊長（px）
 */
export function getGrainTile(cfg: SurfaceGrainConfig, variant: number, size: number): HTMLCanvasElement {
    const cacheKey = `grain_${size}_${cfg.octaves}_${cfg.frequency}_${cfg.contrast}_${cfg.edgeAO}_${cfg.edgeBand}_${cfg.tintSpread}_${variant}`;
    const hit = grainCache.get(cacheKey);
    if (hit) return hit;

    const { canvas, ctx } = createCanvas(size, size);
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const half = size / 2;
    const seed = 9001 + variant * 7919;

    // 變體整體明度偏移：讓相鄰格子有區塊色差，避免整張地圖像同一塊材質
    const centered = cfg.variants > 1 ? (variant / (cfg.variants - 1)) - 0.5 : 0;
    const tint = centered * cfg.tintSpread;

    const noiseCfg = {
        octaves: cfg.octaves,
        frequency: cfg.frequency,
        persistence: cfg.persistence,
        lacunarity: cfg.lacunarity,
        threshold: 0,
        softness: 0,
    };

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = (x / size) * cfg.frequency;
            const v = (y / size) * cfg.frequency;
            const n = fbm(u, v, noiseCfg, seed);

            // 0.5 為 overlay 的中性值：> 0.5 提亮、< 0.5 壓暗
            let lum = 0.5 + (n - 0.5) * 2 * cfg.contrast + tint;

            // 邊緣環境遮蔽：往外圈線性壓暗，讓每格讀起來是獨立的立體方塊
            if (cfg.edgeAO > 0 && cfg.edgeBand > 0) {
                const dx = (x - half) / half;
                const dy = (y - half) / half;
                const d = Math.sqrt(dx * dx + dy * dy);
                const t = Math.min(1, Math.max(0, (d - (1 - cfg.edgeBand)) / cfg.edgeBand));
                lum -= t * cfg.edgeAO;
            }

            lum = Math.min(1, Math.max(0, lum));
            const c = Math.round(lum * 255);
            const i = (y * size + x) * 4;
            data[i] = c;
            data[i + 1] = c;
            data[i + 2] = c;
            data[i + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
    grainCache.set(cacheKey, canvas);
    return canvas;
}

/** 由格座標推導 [0,1) 的確定性雜訊（同一格、同一種子永遠同值） */
export function tileHash01(q: number, r: number, seed: number): number {
    return hash2(Math.round(q), Math.round(r), seed);
}

/** 由格座標推導變體編號（確定性，同一格永遠同一張） */
export function variantFor(q: number, r: number, variants: number): number {
    if (variants <= 1) return 0;
    const h = hash2(Math.round(q), Math.round(r), 4242);
    return Math.min(variants - 1, Math.floor(h * variants));
}

