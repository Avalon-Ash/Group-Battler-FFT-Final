// ╔══════════════════════════════════════════════════════════╗
// ║  LightingGate — 打光通道的延後載入與開關（ADR 0029）        ║
// ║  職責：打光通道的程式（著色器）不進進入點，這裡只留開關與   ║
// ║        動態載入；RenderPipeline 每幀問 getLightingPass()。 ║
// ║  [ARCH] 回 null＝走原本的 Canvas 2D 直接路徑（關閉、還在    ║
// ║         載入、WebGL2 拿不到）。狀態字串寫在                ║
// ║         window.__LIGHTING__ 供量測工具讀，不影響畫面。     ║
// ╚══════════════════════════════════════════════════════════╝

import type { LightingPass } from './LightingPass';

let pass: LightingPass | null = null;

/** 'loading'｜'active <顯示卡字串>'｜'unsupported <原因>' */
function report(state: string): void {
    (window as unknown as { __LIGHTING__?: string }).__LIGHTING__ = state;
}

if (typeof window !== 'undefined') {
    report('loading');
    void import('./LightingPass').then((m) => {
        pass = new m.LightingPass();
        report(`active ${pass.gpu}`);
    }).catch((e: unknown) => report(`unsupported ${String(e)}`));
}

export function getLightingPass(): LightingPass | null {
    return pass;
}
