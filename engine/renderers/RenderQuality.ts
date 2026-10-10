/**
 * RenderQuality — 渲染解析度 SSOT 與自適應品質調度模組
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 提供全局統一日 DPR 計算閘門，依據 RENDER_QUALITY.MAX_DPR 進行上限保護。
 *  - 階層表 (Quality Tier):
 *      0: 完整效果 (ToneGrade ON, DPR Scale 1.0)
 *      1: 關閉色調分級 (ToneGrade OFF, DPR Scale 1.0)
 *      2: 色調分級關 + DPR 倍率 0.75 (ToneGrade OFF, DPR Scale 0.75)
 *      3: 色調分級關 + DPR 倍率 0.5 (ToneGrade OFF, DPR Scale 0.5)
 *  - 支援 ?quality=<0-3> 查詢參數釘死品質階層。
 *  - 包含視窗平均降階/升階/冷卻/忽略長幀的自適應品質調度器 (createQualityGovernor)。
 */

import { RENDER_QUALITY } from '../../constants';

export type QualityTier = 0 | 1 | 2 | 3;

export interface QualityGovernorConfig {
    ignoreFrameMs?: number;
    downMs?: number;
    downHoldS?: number;
    upMs?: number;
    upHoldS?: number;
    cooldownS?: number;
    windowFrames?: number;
    initialTier?: QualityTier;
    pinnedTier?: QualityTier | null;
}

/**
 * 讀取 URL 查詢參數 ?quality=<0-3>
 */
export function readPinnedQualityParam(): QualityTier | null {
    if (typeof location === 'undefined' || !location.search) return null;
    try {
        const val = new URLSearchParams(location.search).get(RENDER_QUALITY.QUERY_KEY);
        if (val !== null) {
            const parsed = parseInt(val, 10);
            if (parsed >= 0 && parsed <= 3) {
                return parsed as QualityTier;
            }
        }
    } catch {
        // 安全忽略無效 URL
    }
    return null;
}

// 模組級狀態
let activePinnedTier: QualityTier | null = readPinnedQualityParam();
let activeQualityTier: QualityTier = activePinnedTier !== null ? activePinnedTier : 0;

/**
 * 取得目前品質階層 (0..3)
 */
export function getQualityTier(): QualityTier {
    return activeQualityTier;
}

/**
 * 設定目前品質階層（若未釘死）
 */
export function setQualityTier(tier: QualityTier): void {
    if (activePinnedTier !== null) return;
    activeQualityTier = Math.max(0, Math.min(3, tier)) as QualityTier;
}

/**
 * 強制設定模組內部階層（供測試與調度器同步使用）
 */
export function forceSetQualityTier(tier: QualityTier): void {
    activeQualityTier = Math.max(0, Math.min(3, tier)) as QualityTier;
}

/**
 * 設定/清除釘死階層（供測試與調度器初始化使用）
 */
export function setPinnedTier(pinned: QualityTier | null): void {
    activePinnedTier = pinned;
    if (pinned !== null) {
        activeQualityTier = pinned;
    }
}

/**
 * 是否啟用色調分級 (ToneGrade) — 僅在 Tier 0 啟用
 */
export function isToneGradeEnabled(): boolean {
    return activeQualityTier === 0;
}

/**
 * 取得目前品質階層的解析度倍率 (1.0, 1.0, 0.75, 0.5)
 */
export function getTierScale(): number {
    return RENDER_QUALITY.TIER_SCALES[activeQualityTier];
}

/**
 * SSOT: 取得畫布實體像素 DPR。
 * 限制在 RENDER_QUALITY.MAX_DPR (2.0) 之內，並乘上當前品質階層縮放。
 */
export function getRenderDpr(): number {
    const rawDpr = typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
        ? (window.devicePixelRatio || 1)
        : RENDER_QUALITY.DEFAULT_DPR;

    return Math.min(rawDpr, RENDER_QUALITY.MAX_DPR) * getTierScale();
}

/**
 * 工廠函式：建立自適應品質調度器
 */
export function createQualityGovernor(config: QualityGovernorConfig = {}) {
    const ignoreFrameMs = config.ignoreFrameMs ?? RENDER_QUALITY.IGNORE_FRAME_MS;
    const downMs = config.downMs ?? RENDER_QUALITY.DOWN_MS;
    const downHoldS = config.downHoldS ?? RENDER_QUALITY.DOWN_HOLD_S;
    const upMs = config.upMs ?? RENDER_QUALITY.UP_MS;
    const upHoldS = config.upHoldS ?? RENDER_QUALITY.UP_HOLD_S;
    const cooldownS = config.cooldownS ?? RENDER_QUALITY.COOLDOWN_S;
    const windowFrames = config.windowFrames ?? RENDER_QUALITY.WINDOW_FRAMES;

    let pinnedTier: QualityTier | null = config.pinnedTier !== undefined
        ? config.pinnedTier
        : readPinnedQualityParam();

    let currentTier: QualityTier = pinnedTier !== null
        ? pinnedTier
        : (config.initialTier ?? activeQualityTier);

    forceSetQualityTier(currentTier);

    // 零分配環狀緩衝區
    const buffer = new Float64Array(windowFrames);
    let head = 0;
    let count = 0;
    let sum = 0;

    let downHoldElapsed = 0;
    let upHoldElapsed = 0;
    let timeSinceLastDowngrade = cooldownS; // 初始允許在符合條件時升階

    function feedFrame(frameMs: number, dtSeconds?: number): QualityTier {
        if (frameMs > ignoreFrameMs) {
            // 忽略大於 250ms 的超長幀（分頁背景或卡頓）
            return currentTier;
        }

        const dtSec = dtSeconds ?? (frameMs / 1000);

        if (count < windowFrames) {
            buffer[head] = frameMs;
            sum += frameMs;
            count++;
        } else {
            sum = sum - buffer[head] + frameMs;
            buffer[head] = frameMs;
        }
        head = (head + 1) % windowFrames;

        if (pinnedTier !== null) {
            return currentTier;
        }

        timeSinceLastDowngrade += dtSec;
        const avgMs = sum / count;

        if (avgMs > downMs) {
            downHoldElapsed += dtSec;
            upHoldElapsed = 0;
            if (downHoldElapsed >= downHoldS && currentTier < 3) {
                currentTier = (currentTier + 1) as QualityTier;
                downHoldElapsed = 0;
                timeSinceLastDowngrade = 0;
                forceSetQualityTier(currentTier);
            }
        } else if (avgMs < upMs) {
            upHoldElapsed += dtSec;
            downHoldElapsed = 0;
            if (upHoldElapsed >= upHoldS && timeSinceLastDowngrade >= cooldownS && currentTier > 0) {
                currentTier = (currentTier - 1) as QualityTier;
                upHoldElapsed = 0;
                forceSetQualityTier(currentTier);
            }
        } else {
            // 13ms ~ 19ms 遲滯緩衝帶：清除累計以防抖動
            downHoldElapsed = 0;
            upHoldElapsed = 0;
        }

        return currentTier;
    }

    function getTier(): QualityTier {
        return currentTier;
    }

    function setTier(tier: QualityTier): void {
        currentTier = Math.max(0, Math.min(3, tier)) as QualityTier;
        forceSetQualityTier(currentTier);
    }

    function isPinned(): boolean {
        return pinnedTier !== null;
    }

    function reset(): void {
        count = 0;
        head = 0;
        sum = 0;
        downHoldElapsed = 0;
        upHoldElapsed = 0;
        timeSinceLastDowngrade = cooldownS;
    }

    return {
        feedFrame,
        getTier,
        setTier,
        isPinned,
        reset,
        getAvgMs: () => (count > 0 ? sum / count : 0),
    };
}

// 模組預設單例
let defaultGovernor: ReturnType<typeof createQualityGovernor> | null = null;

export function getDefaultQualityGovernor(): ReturnType<typeof createQualityGovernor> {
    if (!defaultGovernor) {
        defaultGovernor = createQualityGovernor();
    }
    return defaultGovernor;
}
