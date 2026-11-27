// ╔══════════════════════════════════════════════════════════╗
// ║  LightingGate — 打光通道的延後載入與開關（ADR 0029）        ║
// ║  職責：打光通道的程式（著色器）不進進入點，這裡只留開關與   ║
// ║        動態載入；RenderPipeline 每幀問 getLightingPass()。 ║
// ║  [ARCH] 回 null＝走原本的 Canvas 2D 直接路徑（關閉、還在    ║
// ║         載入、WebGL2 拿不到）。狀態字串寫在                ║
// ║         window.__LIGHTING__ 供量測工具讀，不影響畫面。     ║
// ║  [ARCH] 開關：網址 ?lit=1 開、?lit=0 關，沒寫時看          ║
// ║         RENDER_QUALITY.LIT_DEFAULT_ON；關閉時不載入、不建  ║
// ║         GL context，__LIGHTING__ 維持 undefined。          ║
// ╚══════════════════════════════════════════════════════════╝

import { RENDER_QUALITY } from '../../../constants';
import type { LightingPass } from './LightingPass';

let pass: LightingPass | null = null;

/** 'loading'｜'active <顯示卡字串>'｜'unsupported <原因>' */
function report(state: string): void {
    (window as unknown as { __LIGHTING__?: string }).__LIGHTING__ = state;
}

/** 網址 ?lit=1|0 優先，沒寫時看 RENDER_QUALITY.LIT_DEFAULT_ON */
function requested(): boolean {
    if (typeof window === 'undefined') return false;
    const v = new URLSearchParams(location.search).get(RENDER_QUALITY.LIT_QUERY_KEY);
    return v === null ? RENDER_QUALITY.LIT_DEFAULT_ON : v !== '0' && v !== 'false';
}

if (requested()) {
    report('loading');
    void import('./LightingPass').then((m) => {
        pass = new m.LightingPass();
        report(`active ${pass.gpu}`);
    }).catch((e: unknown) => report(`unsupported ${String(e)}`));
}

export function getLightingPass(): LightingPass | null {
    return pass;
}
