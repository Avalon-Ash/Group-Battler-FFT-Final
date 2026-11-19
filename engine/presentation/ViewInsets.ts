// ╔══════════════════════════════════════════════════════════╗
// ║  ViewInsets — 畫面被 UI 蓋住的邊（契約 R3）                ║
// ║  職責：把「整個畫面＋四邊被蓋住的寬度」換成取景用的有效    ║
// ║        區域。導播（DirectorSystem）與手動置中都用它，       ║
// ║        主角才不會被手機底部面板蓋住。                      ║
// ║  [ARCH] 純計算，不依賴引擎。insets 由 UI 層用畫面指令       ║
// ║  SET_VIEW_INSETS 回報（不進回放），存在 DirectorSystem。    ║
// ╚══════════════════════════════════════════════════════════╝

import { sanitizeInsets, type ViewInsets } from '../math/insets';

// 型別與清理規則定義在 engine/math/insets.ts（模擬端的 UICommandSystem 也要用，不得 import 表現端）
export type { ViewInsets };

/** 有效區域的寬高，以及它的中心相對整個畫面中心的位移（螢幕 px；shiftY 負值＝往上） */
export interface EffectiveViewport {
    w: number;
    h: number;
    shiftX: number;
    shiftY: number;
}

/**
 * w＝screenW − left − right、h＝screenH − top − bottom（各自不小於 1）；
 * shiftX＝(left − right) / 2、shiftY＝(top − bottom) / 2。負數或非有限的 inset 當 0。
 */
export function effectiveViewport(screenW: number, screenH: number, insets: ViewInsets): EffectiveViewport {
    const { top, right, bottom, left } = sanitizeInsets(insets);
    return {
        w: Math.max(1, screenW - left - right),
        h: Math.max(1, screenH - top - bottom),
        shiftX: (left - right) / 2,
        shiftY: (top - bottom) / 2,
    };
}
