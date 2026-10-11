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
    /** Downgrade when the averaged frame INTERVAL (rAF dt) exceeds this. */
    downMs?: number;
    downHoldS?: number;
    /**
     * Upgrade when the averaged main-thread WORK time (not the rAF interval) is below this.
     * The rAF interval is pinned to the display refresh (16.7 ms @ 60 Hz), so it can never show headroom;
     * work time is vsync-independent and is the only signal that can justify recovering quality.
     */
    upMs?: number;
    upHoldS?: number;
    cooldownS?: number;
    windowFrames?: number;
    /** Frames during the first N seconds are ignored (JIT warm-up, sprite baking, first layout). */
    startupGraceS?: number;
    /** Max exponent of the upgrade-cooldown backoff (cooldown doubles each time an upgrade is immediately undone). */
    maxUpBackoff?: number;
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
    const startupGraceS = config.startupGraceS ?? RENDER_QUALITY.STARTUP_GRACE_S;
    const maxUpBackoff = config.maxUpBackoff ?? RENDER_QUALITY.MAX_UP_BACKOFF;

    // Zero-allocation ring buffers: frame interval (rAF dt) and main-thread work time.
    const buffer = new Float64Array(windowFrames);
    const workBuffer = new Float64Array(windowFrames);
    let head = 0;
    let count = 0;
    let sum = 0;
    let workSum = 0;

    let elapsedS = 0;
    let downHoldElapsed = 0;
    let upHoldElapsed = 0;
    let timeSinceLastDowngrade = cooldownS; // allow an upgrade as soon as the conditions hold
    let timeSinceLastUpgrade = Infinity;
    let upBackoff = 0;

    function clearWindow(): void {
        count = 0;
        head = 0;
        sum = 0;
        workSum = 0;
        downHoldElapsed = 0;
        upHoldElapsed = 0;
    }

    /**
     * @param frameMs    rAF interval of this frame (pinned to the display refresh when the GPU/CPU keep up)
     * @param dtSeconds  optional override of the elapsed seconds this frame represents (tests)
     * @param workMs     main-thread time spent in this frame's update+draw (vsync independent). Defaults to frameMs.
     */
    function feedFrame(frameMs: number, dtSeconds?: number, workMs?: number): QualityTier {
        if (frameMs > ignoreFrameMs) {
            // Ignore ultra-long frames (background tab / stalls).
            return currentTier;
        }

        const dtSec = dtSeconds ?? (frameMs / 1000);
        elapsedS += dtSec;
        // Startup grace: JIT warm-up, sprite baking and first layout must not trigger a downgrade.
        if (elapsedS < startupGraceS) return currentTier;

        const work = workMs ?? frameMs;
        if (count < windowFrames) {
            buffer[head] = frameMs;
            workBuffer[head] = work;
            sum += frameMs;
            workSum += work;
            count++;
        } else {
            sum = sum - buffer[head] + frameMs;
            workSum = workSum - workBuffer[head] + work;
            buffer[head] = frameMs;
            workBuffer[head] = work;
        }
        head = (head + 1) % windowFrames;

        if (pinnedTier !== null) {
            return currentTier;
        }

        timeSinceLastDowngrade += dtSec;
        timeSinceLastUpgrade += dtSec;
        const avgMs = sum / count;
        const avgWorkMs = workSum / count;

        if (avgMs > downMs) {
            downHoldElapsed += dtSec;
            upHoldElapsed = 0;
            if (downHoldElapsed >= downHoldS && currentTier < 3) {
                // An upgrade that is immediately undone means the headroom estimate was wrong: back off.
                if (timeSinceLastUpgrade < cooldownS * 2) {
                    upBackoff = Math.min(upBackoff + 1, maxUpBackoff);
                }
                currentTier = (currentTier + 1) as QualityTier;
                timeSinceLastDowngrade = 0;
                clearWindow();
                forceSetQualityTier(currentTier);
            }
        } else if (avgWorkMs < upMs) {
            upHoldElapsed += dtSec;
            downHoldElapsed = 0;
            const effectiveCooldown = cooldownS * Math.pow(2, upBackoff);
            if (upHoldElapsed >= upHoldS && timeSinceLastDowngrade >= effectiveCooldown && currentTier > 0) {
                currentTier = (currentTier - 1) as QualityTier;
                timeSinceLastUpgrade = 0;
                clearWindow();
                forceSetQualityTier(currentTier);
            }
        } else {
            // Hysteresis band: clear the accumulated holds to avoid flapping.
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
        clearWindow();
        elapsedS = 0;
        timeSinceLastDowngrade = cooldownS;
        timeSinceLastUpgrade = Infinity;
        upBackoff = 0;
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
