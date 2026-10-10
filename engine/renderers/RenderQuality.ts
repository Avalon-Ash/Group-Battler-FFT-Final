/**
 * RenderQuality — 渲染解析度 SSOT 與品質調度模組
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 提供全局統一日 DPR 計算閘門，依據 RENDER_QUALITY.MAX_DPR 進行上限保護。
 *  - 供 RenderPipeline、HUDRenderer、GameCanvas 與 useGameLoop 統一引用。
 *  - 支援無 window（Node/測試）環境安全降級。
 */

import { RENDER_QUALITY } from '../../constants';

let currentTierScale = 1.0;

/**
 * 取得目前品質階層的解析度倍率（預設為 1.0）
 */
export function getTierScale(): number {
    return currentTierScale;
}

/**
 * 設定目前品質階層的解析度倍率（供調度器使用）
 */
export function setTierScale(scale: number): void {
    currentTierScale = scale;
}

/**
 * SSOT: 取得畫布實體像素 DPR。
 * 限制在 RENDER_QUALITY.MAX_DPR (2.0) 之內，並乘上當前品質階層縮放。
 */
export function getRenderDpr(): number {
    const rawDpr = typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
        ? (window.devicePixelRatio || 1)
        : RENDER_QUALITY.DEFAULT_DPR;

    return Math.min(rawDpr, RENDER_QUALITY.MAX_DPR) * currentTierScale;
}
