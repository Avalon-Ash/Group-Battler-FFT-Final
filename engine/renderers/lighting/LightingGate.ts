// ╔══════════════════════════════════════════════════════════╗
// ║  LightingGate — 打光通道的延後載入與開關（ADR 0029）        ║
// ║  職責：打光通道的程式（著色器）不進進入點，這裡只留開關與   ║
// ║        動態載入；RenderPipeline 每幀問 getLightingPass()。 ║
// ║  [ARCH] 回 null＝走原本的 Canvas 2D 直接路徑（關閉、還在    ║
// ║         載入、WebGL2 拿不到）。狀態字串寫在                ║
// ║         window.__LIGHTING__ 供量測工具讀，不影響畫面。     ║
// ║  [ARCH] 開關：網址 ?lit=1 開、?lit=0 關，沒寫時看          ║
// ║         RENDER_QUALITY.LIT_DEFAULT_ON，但觸控裝置預設一律  ║
// ║         關；關閉時不載入、不建 GL context，__LIGHTING__    ║
// ║         維持 undefined。                                   ║
// ║  [ARCH] 跑不動就關：品質階層超過 LIT_MAX_TIER 時釋放通道、  ║
// ║         這個頁面不再打開（避免明暗來回跳）；網址明寫 lit=1  ║
// ║         時不關。                                           ║
// ╚══════════════════════════════════════════════════════════╝

import { RENDER_QUALITY } from '../../../constants';
import { getQualityTier, isMemoryConstrainedDevice } from '../RenderQuality';
import type { LightingPass } from './LightingPass';

let pass: LightingPass | null = null;
/** 網址明寫 lit=1：品質降階時也不關 */
let forced = false;

/** 'loading'｜'active <顯示卡字串>'｜'unsupported <原因>' */
function report(state: string): void {
    (window as unknown as { __LIGHTING__?: string }).__LIGHTING__ = state;
}

/** 網址 ?lit=1|0 優先；沒寫時桌機看 RENDER_QUALITY.LIT_DEFAULT_ON，觸控裝置關 */
function requested(): boolean {
    if (typeof window === 'undefined') return false;
    const v = new URLSearchParams(location.search).get(RENDER_QUALITY.LIT_QUERY_KEY);
    if (v === null) return RENDER_QUALITY.LIT_DEFAULT_ON && !isMemoryConstrainedDevice();
    forced = v !== '0' && v !== 'false';
    return forced;
}

if (requested()) {
    report('loading');
    void import('./LightingPass').then((m) => {
        pass = new m.LightingPass();
        report(`active ${pass.gpu}`);
    }).catch((e: unknown) => report(`unsupported ${String(e)}`));
}

export function getLightingPass(): LightingPass | null {
    if (pass && !forced && getQualityTier() > RENDER_QUALITY.LIT_MAX_TIER) {
        pass.dispose();
        pass = null;
        report('shed');
    }
    return pass;
}
