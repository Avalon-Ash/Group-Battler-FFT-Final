// ╔══════════════════════════════════════════════════════════════════╗
// ║  AdrIndex — 架構決策紀錄（docs/adr）的格式與索引守門               ║
// ║  職責：把 tools/adr/check-adr.mjs 接進 npm test，並給它本專案的   ║
// ║    參數（索引檔、最少份數、DECISIONS.md 要保留的錨點）。           ║
// ║  上游：tools/adr/check-adr.mjs（正本在全域 adr skill；檢查檔名與   ║
// ║    編號、標題、狀態、日期、五節、取代鏈雙向、索引與資料夾一致、    ║
// ║    證據路徑存在）。                                               ║
// ║  [ARCH] 規則只定義在腳本裡，本檔不重複判斷；只檢查格式與連結，     ║
// ║    不判斷決策內容對不對。                                         ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'tools', 'adr', 'check-adr.mjs');
const INDEX = 'docs/DECISIONS.md';
const MIN_ADRS = 10;
// 其他檔案用這些字樣引用 DECISIONS.md（「DECISIONS §4」「DECISIONS「UI」」「機動技落點」），索引要留著
const KEPT_ANCHORS = ['^## 1\\.', '^## 4\\.', '^## 5\\.', '^## UI', '機動技落點'];

describe('docs/adr', () => {
    it('passes tools/adr/check-adr.mjs with DECISIONS.md as the index', () => {
        const args = [CHECKER, '--root', ROOT, '--index', INDEX, '--min', String(MIN_ADRS), ...KEPT_ANCHORS.flatMap((a) => ['--anchor', a])];
        const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
        expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    });
});
