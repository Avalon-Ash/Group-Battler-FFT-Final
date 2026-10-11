/**
 * TerrainBlockCache — 地形六角格 Sprite 快取與量化調度器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 地形格頂面與側面外觀是 (theme, layout, type, height, variant, floatOffset, renderScale) 的純函數。
 *  - 將耗時的 createLinearGradient、clip 與 overlay 顆粒在離屏 canvas 烘焙為 Sprite。
 *  - 依照 RENDER_CACHE.SCALE_STEPS 向上量化解析度，無字窗配置，純衍生快取不持遊戲狀態。
 *  - 內含 MATERIAL_CONFIG 逐欄數值簽章比對，即時調參時自動清空重建。
 */

import { RENDER_CACHE, TerrainTheme } from '../../../constants';
import { HexLayout } from '../../../types';
import { MATERIAL_CONFIG } from '../../../data/vfx/materialConfig';
import { createCanvas } from '../../graphics/CanvasUtils';

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
    scaleStep: number
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
    const fOffset = Math.max(0, Math.min(511, floatKey + 100));
    const packedInt = ((scaleIdx & 7) << 22) | ((hOffset & 511) << 13) | ((fOffset & 511) << 4) | (variant & 15);

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
    }

    function get(
        key: TerrainKeyCompound,
        bake: (factory: SurfaceFactory) => TerrainSpriteEntry
    ): TerrainSpriteEntry {
        checkMaterialSignature();

        let typeMap = themeMap.get(key.theme);
        if (typeMap) {
            const layoutMap = typeMap.get(key.type);
            if (layoutMap) {
                const intMap = layoutMap.get(key.layout);
                if (intMap) {
                    const hit = intMap.get(key.packedInt);
                    if (hit) return hit;
                }
            }
        }

        // 超過上限容量清空重建
        if (totalSprites >= RENDER_CACHE.MAX_TERRAIN_SPRITES) {
            clear();
            typeMap = undefined;
        }

        const entry = bake(createSurface);

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

    return {
        get,
        clear,
        size: () => totalSprites,
        checkMaterialSignature,
    };
}

export type TerrainSpriteStore = ReturnType<typeof createTerrainSpriteStore>;
