// ╔══════════════════════════════════════════════════════════════════╗
// ║  AdrIndex — 架構決策紀錄（docs/adr）的格式與索引守門               ║
// ║  職責：ADR 檔名與編號、必備欄位、取代鏈雙向一致、DECISIONS.md 索引 ║
// ║    與資料夾一致、既有引用（DECISIONS §1／§4／§5、「UI」、         ║
// ║    「機動技落點」）仍找得到落點。                                 ║
// ║  [ARCH] 只檢查格式與連結，不判斷決策內容對不對。                   ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const ADR_DIR = path.join(ROOT, 'docs', 'adr');
const DECISIONS = path.join(ROOT, 'docs', 'DECISIONS.md');
const ADR_FILE = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const MIN_ADRS = 10;
const REQUIRED_SECTIONS = ['## 背景', '## 決定', '## 放棄的做法', '## 後果', '## 證據'];
const STATUS_LINE = /^狀態：(採用|提議|已取代（由 (\d{4})）)\s*$/m;
const SUPERSEDES_LINE = /^取代：(\d{4})\s*$/m;
// 其他檔案用這些字樣引用 DECISIONS.md，改成索引後仍要找得到
const KEPT_ANCHORS = [/^## 1\./m, /^## 4\./m, /^## 5\./m, /^## UI/m, /機動技落點/];

const listAdrs = () => (fs.existsSync(ADR_DIR) ? fs.readdirSync(ADR_DIR).filter((f) => ADR_FILE.test(f)).sort() : []);
const read = (f: string) => fs.readFileSync(path.join(ADR_DIR, f), 'utf8');
const numOf = (f: string) => (ADR_FILE.exec(f) as RegExpExecArray)[1];

describe('docs/adr', () => {
    it(`has a README and at least ${MIN_ADRS} ADRs`, () => {
        expect(fs.existsSync(path.join(ADR_DIR, 'README.md'))).toBe(true);
        expect(listAdrs().length).toBeGreaterThanOrEqual(MIN_ADRS);
    });

    it('numbers run 0001, 0002, … without gaps or duplicates', () => {
        const nums = listAdrs().map(numOf);
        expect(nums).toEqual(nums.map((_, i) => String(i + 1).padStart(4, '0')));
    });

    it('every ADR has a title, a status line and the required sections', () => {
        for (const f of listAdrs()) {
            const text = read(f);
            expect(text.startsWith(`# ${numOf(f)} `), `${f}: first line "# ${numOf(f)} <title>"`).toBe(true);
            expect(STATUS_LINE.test(text), `${f}: status line`).toBe(true);
            for (const s of REQUIRED_SECTIONS) expect(text.includes(`\n${s}`), `${f}: ${s}`).toBe(true);
        }
    });

    it('supersede links point both ways', () => {
        const byNum = new Map(listAdrs().map((f) => [numOf(f), read(f)]));
        for (const [num, text] of byNum) {
            const by = STATUS_LINE.exec(text)?.[2];
            if (by) {
                expect(byNum.has(by), `${num} superseded by missing ${by}`).toBe(true);
                expect(SUPERSEDES_LINE.exec(byNum.get(by) as string)?.[1], `${by} must say 取代：${num}`).toBe(num);
            }
            const replaces = SUPERSEDES_LINE.exec(text)?.[1];
            if (replaces) {
                expect(byNum.has(replaces), `${num} replaces missing ${replaces}`).toBe(true);
                expect(STATUS_LINE.exec(byNum.get(replaces) as string)?.[2], `${replaces} must be 已取代（由 ${num}）`).toBe(num);
            }
        }
    });
});

describe('docs/DECISIONS.md as the index', () => {
    const decisions = fs.readFileSync(DECISIONS, 'utf8');

    it('links every ADR exactly by file name, and every adr link exists', () => {
        const files = listAdrs();
        for (const f of files) expect(decisions.includes(`adr/${f}`), `index missing adr/${f}`).toBe(true);
        const linked = [...decisions.matchAll(/adr\/(\d{4}-[a-z0-9-]+\.md)/g)].map((m) => m[1]);
        for (const l of linked) expect(files.includes(l), `index links missing adr/${l}`).toBe(true);
    });

    it('keeps the anchors other files cite', () => {
        for (const a of KEPT_ANCHORS) expect(a.test(decisions), String(a)).toBe(true);
    });
});
