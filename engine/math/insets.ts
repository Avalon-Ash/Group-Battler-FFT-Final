// ╔══════════════════════════════════════════════════════════╗
// ║  insets — 畫面四邊被 UI 蓋住的寬度（契約 R3）              ║
// ║  職責：型別與清理規則（負數、非有限 → 0）的唯一定義處。    ║
// ║  上游：UICommandSystem（SET_VIEW_INSETS 存值，模擬端）、   ║
// ║        presentation/ViewInsets（取景用的有效區域）。       ║
// ║  [ARCH] 放在 math 是因為模擬端不得 import 表現端            ║
// ║  （tests/LayerBoundary.test.ts）。                          ║
// ╚══════════════════════════════════════════════════════════╝

/** 四邊被 UI 蓋住的寬度（CSS px，不小於 0） */
export interface ViewInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

const cleanInset = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

/** 負數或非有限的 inset 當 0（規則只在這裡；SET_VIEW_INSETS 存值與取景都經過它） */
export function sanitizeInsets(insets: ViewInsets): ViewInsets {
    return {
        top: cleanInset(insets.top),
        right: cleanInset(insets.right),
        bottom: cleanInset(insets.bottom),
        left: cleanInset(insets.left),
    };
}
