/**
 * TerrainBlockCache — 地形六角格 Sprite 快取與量化調度器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 地形格頂面與側面外觀是 (theme, layout, type, height, variant, renderScale, edgeMask, baseLevel) 的純函數。
 *    漂浮位移不進鍵：TerrainRenderer 一律傳 floatOffset＝0，整塊在繪製時平移（RenderSpec §5，docs/PERF_LIFECYCLE_FINDINGS.md）。
 *  - 將耗時的 createLinearGradient、clip 與 overlay 顆粒在離屏 canvas 烘焙為 Sprite。
 *  - 依照 RENDER_CACHE.SCALE_STEPS 向上量化解析度，無字窗配置，純衍生快取不持遊戲狀態。
 *  - 內含 MATERIAL_CONFIG 逐欄數值簽章比對，即時調參時自動清空重建。
 */

import { RENDER_CACHE, TerrainTheme } from '../../../constants';
import { HexLayout } from '../../../types';
import { MATERIAL_CONFIG } from '../../../data/vfx/materialConfig';
import { createCanvas } from '../../graphics/CanvasUtils';
import { RenderStats } from '../RenderStats';

export interface TerrainSpriteEntry {
    canvas: HTMLCanvasElement;
    anchorX: number;
    anchorY: number;
    width: number;
    height: number;
}

export type SurfaceFactory = (width: number, height: number) => { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

/**
 * 向上取到 RENDER_CACHE.SCALE_STEPS 的下一級
 */
export function quantizeRenderScale(scale: number, steps: readonly number[] = RENDER_CACHE.SCALE_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= scale - 1e-4) {
            return steps[i];
        }
    }
    return steps[steps.length - 1];
}

/**
 * 帶遲滯的縮放級距：已在某級距時，縮放需超出該級距 (1 + margin) 才升級；降級立即生效。
 * 只要升級側有緩衝，鏡頭在級距邊界（例如導演鏡頭 1.21～1.54 跨 1.5）來回時就不會切換解析度、
 * 同時保留兩組 sprite 而撐爆快取；降級不延遲，畫面結果與無遲滯版本一致（保真基準不受鏡頭歷程影響）。
 */
export function quantizeRenderScaleSticky(
    scale: number,
    prevStep: number,
    margin: number = RENDER_CACHE.SCALE_HYSTERESIS,
    steps: readonly number[] = RENDER_CACHE.SCALE_STEPS
): number {
    const target = quantizeRenderScale(scale, steps);
    const prevIdx = steps.indexOf(prevStep);
    if (prevIdx < 0 || target === prevStep) return target;
    if (target > prevStep) {
        return scale > prevStep * (1 + margin) ? target : prevStep;
    }
    return target;
}

/** packedInt 內「縮放級距索引」的位元位置與遮罩（與 terrainSpriteKey 的打包方式一致） */
const SCALE_BIT_SHIFT = 22;
const SCALE_BIT_MASK = 7;
/** packedInt 內「鄰格高度遮罩」：bit 25-30（共 6 bit），不得與其他欄位重疊，總長不得超過 31 bit */
export const EDGE_MASK_BIT_SHIFT = 25;
export const EDGE_MASK_BIT_MASK = 63;
/**
 * packedInt 內「島嶼底座深度級數」：bit 9-12（共 4 bit）。
 * 原本 bit 4-12 都給漂浮位移，但漂浮已改為繪製時平移（drawBlock 固定傳 0），故漂浮欄位縮為 bit 4-8（±16 級，±8 px）。
 */
export const BASE_LEVEL_BIT_SHIFT = 9;
export const BASE_LEVEL_BIT_MASK = 15;
const FLOAT_BIT_SHIFT = 4;
const FLOAT_BIT_MASK = 31;
const FLOAT_KEY_BIAS = 16;

export interface TerrainKeyCompound {
    theme: TerrainTheme;
    layout: HexLayout;
    type: string;
    packedInt: number;
}

/**
 * 計算無字串配置的快取鍵（利用物件身分與 31-bit 整數打包）
 */
export function terrainSpriteKey(
    theme: TerrainTheme,
    layout: HexLayout,
    type: string,
    h: number,
    variant: number,
    floatOffset: number,
    scaleStep: number,
    edgeMask: number = 0,
    baseLevel: number = 0
): TerrainKeyCompound {
    const hKey = Math.round(h * RENDER_CACHE.HEIGHT_KEY_SCALE);
    const floatKey = Math.round(floatOffset / RENDER_CACHE.FLOAT_STEP);

    let scaleIdx = 0;
    for (let i = 0; i < RENDER_CACHE.SCALE_STEPS.length; i++) {
        if (Math.abs(RENDER_CACHE.SCALE_STEPS[i] - scaleStep) < 0.01) {
            scaleIdx = i;
            break;
        }
    }

    const hOffset = Math.max(0, Math.min(511, hKey + 100));
    const fOffset = Math.max(0, Math.min(FLOAT_BIT_MASK, floatKey + FLOAT_KEY_BIAS));
    const packedInt = ((edgeMask & EDGE_MASK_BIT_MASK) << EDGE_MASK_BIT_SHIFT)
        | ((scaleIdx & SCALE_BIT_MASK) << SCALE_BIT_SHIFT)
        | ((hOffset & 511) << 13)
        | ((baseLevel & BASE_LEVEL_BIT_MASK) << BASE_LEVEL_BIT_SHIFT)
        | ((fOffset & FLOAT_BIT_MASK) << FLOAT_BIT_SHIFT)
        | (variant & 15);

    return {
        theme,
        layout,
        type,
        packedInt,
    };
}

export function createTerrainSpriteStore(createSurface: SurfaceFactory = createCanvas) {
    const themeMap = new Map<TerrainTheme, Map<string, Map<HexLayout, Map<number, TerrainSpriteEntry>>>>();
    let totalSprites = 0;
    let hits = 0;
    let misses = 0;
    let clears = 0;
    let evictions = 0;
    let fallbacks = 0;
    let deferrals = 0;
    let bakeSpentMs = 0;

    // 材質簽章追蹤（逐欄數值比較，零字串配置）
    let sigEnabled = MATERIAL_CONFIG.enabled;
    let sigMaskRes = MATERIAL_CONFIG.maskResolution;
    let sigSideGrain = MATERIAL_CONFIG.terrain.sideGrain;
    let sigGrainEnabled = MATERIAL_CONFIG.terrain.grain.enabled;
    let sigOctaves = MATERIAL_CONFIG.terrain.grain.octaves;
    let sigFreq = MATERIAL_CONFIG.terrain.grain.frequency;
    let sigPers = MATERIAL_CONFIG.terrain.grain.persistence;
    let sigLacu = MATERIAL_CONFIG.terrain.grain.lacunarity;
    let sigStr = MATERIAL_CONFIG.terrain.grain.strength;
    let sigContrast = MATERIAL_CONFIG.terrain.grain.contrast;
    let sigVariants = MATERIAL_CONFIG.terrain.grain.variants;
    let sigTint = MATERIAL_CONFIG.terrain.grain.tintSpread;
    let sigEdgeAO = MATERIAL_CONFIG.terrain.grain.edgeAO;
    let sigEdgeBand = MATERIAL_CONFIG.terrain.grain.edgeBand;

    function checkMaterialSignature(): void {
        const g = MATERIAL_CONFIG.terrain.grain;
        if (
            sigEnabled !== MATERIAL_CONFIG.enabled ||
            sigMaskRes !== MATERIAL_CONFIG.maskResolution ||
            sigSideGrain !== MATERIAL_CONFIG.terrain.sideGrain ||
            sigGrainEnabled !== g.enabled ||
            sigOctaves !== g.octaves ||
            sigFreq !== g.frequency ||
            sigPers !== g.persistence ||
            sigLacu !== g.lacunarity ||
            sigStr !== g.strength ||
            sigContrast !== g.contrast ||
            sigVariants !== g.variants ||
            sigTint !== g.tintSpread ||
            sigEdgeAO !== g.edgeAO ||
            sigEdgeBand !== g.edgeBand
        ) {
            clear();
            sigEnabled = MATERIAL_CONFIG.enabled;
            sigMaskRes = MATERIAL_CONFIG.maskResolution;
            sigSideGrain = MATERIAL_CONFIG.terrain.sideGrain;
            sigGrainEnabled = g.enabled;
            sigOctaves = g.octaves;
            sigFreq = g.frequency;
            sigPers = g.persistence;
            sigLacu = g.lacunarity;
            sigStr = g.strength;
            sigContrast = g.contrast;
            sigVariants = g.variants;
            sigTint = g.tintSpread;
            sigEdgeAO = g.edgeAO;
            sigEdgeBand = g.edgeBand;
        }
    }

    function clear(): void {
        themeMap.clear();
        totalSprites = 0;
        clears++;
    }

    function resetStats(): void {
        hits = 0;
        misses = 0;
        clears = 0;
        evictions = 0;
        fallbacks = 0;
        deferrals = 0;
    }

    function lookup(key: TerrainKeyCompound, packed: number): TerrainSpriteEntry | undefined {
        return themeMap.get(key.theme)?.get(key.type)?.get(key.layout)?.get(packed);
    }

    /** 尚未烘焙時，借用相鄰縮放級距、其他條件完全相同的既有 sprite（以其 width/height 縮放繪製） */
    function findScaleFallback(key: TerrainKeyCompound): TerrainSpriteEntry | undefined {
        const own = (key.packedInt >> SCALE_BIT_SHIFT) & SCALE_BIT_MASK;
        const base = key.packedInt & ~(SCALE_BIT_MASK << SCALE_BIT_SHIFT);
        const stepCount = RENDER_CACHE.SCALE_STEPS.length;
        for (let d = 1; d < stepCount; d++) {
            if (own + d < stepCount) {
                const up = lookup(key, base | ((own + d) << SCALE_BIT_SHIFT));
                if (up) return up;
            }
            if (own - d >= 0) {
                const down = lookup(key, base | ((own - d) << SCALE_BIT_SHIFT));
                if (down) return down;
            }
        }
        return undefined;
    }

    /** 容量滿時只丟棄「非目前縮放級距」的舊 sprite；回傳丟棄數量 */
    function evictOtherScales(currentScaleIdx: number): number {
        let removed = 0;
        for (const typeMap of themeMap.values()) {
            for (const layoutMap of typeMap.values()) {
                for (const intMap of layoutMap.values()) {
                    for (const packed of intMap.keys()) {
                        if (((packed >> SCALE_BIT_SHIFT) & SCALE_BIT_MASK) !== currentScaleIdx) {
                            intMap.delete(packed);
                            removed++;
                        }
                    }
                }
            }
        }
        totalSprites -= removed;
        return removed;
    }

    /** 換地圖主題時丟棄其他主題的 sprite，避免多張地圖累積到上限後整體清空；回傳丟棄數量 */
    function evictOtherThemes(theme: TerrainTheme): number {
        let removed = 0;
        for (const [t, typeMap] of themeMap) {
            if (t === theme) continue;
            for (const layoutMap of typeMap.values()) {
                for (const intMap of layoutMap.values()) removed += intMap.size;
            }
            themeMap.delete(t);
        }
        if (removed > 0) {
            totalSprites -= removed;
            evictions += removed;
            if (RenderStats.enabled) RenderStats.recordTerrainCacheEviction(removed);
        }
        return removed;
    }

    /**
     * opts.tileFallback：同一格上一次畫的 sprite（鄰格塌陷改了邊緣遮罩、高度時，新鍵沒有其他級距可借）。
     * opts.defer：超過預算又無可借用時回傳 null（呼叫端這幀不畫），只在轉場期間使用；否則照舊強制烘焙。
     * opts.budgetMs：本次使用的預算（預設 RENDER_CACHE.BAKE_BUDGET_MS）。
     */
    function get(
        key: TerrainKeyCompound,
        bake: (factory: SurfaceFactory) => TerrainSpriteEntry,
        opts?: { tileFallback?: TerrainSpriteEntry; defer?: boolean; budgetMs?: number }
    ): TerrainSpriteEntry | null {
        checkMaterialSignature();

        const hit = lookup(key, key.packedInt);
        if (hit) {
            hits++;
            if (RenderStats.enabled) RenderStats.recordTerrainCacheHit();
            return hit;
        }

        // 烘焙預算（每幀，beginFrame 重置）：本幀烘焙耗時超標時，先借用相鄰縮放級距或同格上一次的 sprite，
        // 避免縮放／塌陷／換景時一幀內烘焙上百塊造成數百毫秒卡頓；無可借用者才強制烘焙（轉場中改為延後）。
        const now = performance.now();
        if (bakeSpentMs >= (opts?.budgetMs ?? RENDER_CACHE.BAKE_BUDGET_MS)) {
            const fallback = findScaleFallback(key) ?? opts?.tileFallback;
            if (fallback) {
                fallbacks++;
                return fallback;
            }
            if (opts?.defer) {
                deferrals++;
                return null;
            }
        }

        misses++;
        if (RenderStats.enabled) RenderStats.recordTerrainCacheMiss();

        // 超過上限容量：優先只丟棄舊縮放級距；仍無法釋放才整體清空
        if (totalSprites >= RENDER_CACHE.MAX_TERRAIN_SPRITES) {
            const removed = evictOtherScales((key.packedInt >> SCALE_BIT_SHIFT) & SCALE_BIT_MASK);
            if (removed > 0) {
                evictions += removed;
                if (RenderStats.enabled) RenderStats.recordTerrainCacheEviction(removed);
            } else {
                evictions += totalSprites;
                if (RenderStats.enabled) RenderStats.recordTerrainCacheEviction(totalSprites);
                clear();
            }
        }

        const entry = bake(createSurface);
        bakeSpentMs += performance.now() - now;

        let typeMap = themeMap.get(key.theme);
        if (!typeMap) {
            typeMap = new Map();
            themeMap.set(key.theme, typeMap);
        }
        let layoutMap = typeMap.get(key.type);
        if (!layoutMap) {
            layoutMap = new Map();
            typeMap.set(key.type, layoutMap);
        }
        let intMap = layoutMap.get(key.layout);
        if (!intMap) {
            intMap = new Map();
            layoutMap.set(key.layout, intMap);
        }

        intMap.set(key.packedInt, entry);
        totalSprites++;
        return entry;
    }

    /** 每幀開頭呼叫一次（TerrainRenderer.beginFrame）：重置本幀烘焙預算 */
    function beginFrame(): void {
        bakeSpentMs = 0;
    }

    return {
        get,
        beginFrame,
        clear,
        evictOtherThemes,
        resetStats,
        size: () => totalSprites,
        getStats: () => ({ size: totalSprites, hits, misses, clears, evictions, fallbacks, deferrals }),
        checkMaterialSignature,
    };
}

export type TerrainSpriteStore = ReturnType<typeof createTerrainSpriteStore>;
