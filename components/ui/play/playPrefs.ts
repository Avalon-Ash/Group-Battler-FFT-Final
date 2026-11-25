/**
 * PLAY 模式本機偏好（ADR 0026 K3）：只被延遲載入的 PlaySetup／PlayHUD 引用，不進進入點。
 * 鍵名常數集中於此唯一擁有者（constants/ui.ts 的 UI_PIN 受 tests/ConstantsBarrel.test.ts 快照鎖定）。
 */
const PLAY_PREFS_STORAGE_KEY = 'tactical_play_prefs';
const DEFAULT_QUICK_CAST = false;

/** 觸控裝置（粗指標）：瞄準提示不提鍵盤、選主角不顯示鍵盤用的 Quick Cast 開關。 */
export const isCoarsePointer = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

function reportStorageError(op: string, err: unknown): void {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(`[playPrefs] ${op} failed:`, err);
    }
}

export function readQuickCast(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
        return DEFAULT_QUICK_CAST;
    }
    try {
        const raw = window.localStorage.getItem(PLAY_PREFS_STORAGE_KEY);
        if (!raw) return DEFAULT_QUICK_CAST;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return DEFAULT_QUICK_CAST;
        const quickCast = (parsed as { quickCast?: unknown }).quickCast;
        return typeof quickCast === 'boolean' ? quickCast : DEFAULT_QUICK_CAST;
    } catch (err: unknown) {
        reportStorageError('load', err);
        return DEFAULT_QUICK_CAST;
    }
}

export function writeQuickCast(quickCast: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(PLAY_PREFS_STORAGE_KEY, JSON.stringify({ quickCast }));
    } catch (err: unknown) {
        reportStorageError('save', err);
    }
}
