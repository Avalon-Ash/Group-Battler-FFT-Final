// ╔══════════════════════════════════════════════════════════════════╗
// ║  DocDrift — 文件與註解防過時守門測試                             ║
// ║  職責：文件與程式註解裡提到的東西必須真的存在：                  ║
// ║    ① repo 內路徑（engine/…、docs/…、tests/… 等）與 md 相對連結   ║
// ║    ② 方框檔頭第一行的類別／模組名必須出現在該檔                  ║
// ║    ③ 已移除的狀態欄位名（LEGACY_EFFECT_FIELDS）不得出現在註解    ║
// ║  [ARCH] 過時文件直接刪除、不歸檔（DECISIONS §4）；WORKLOG 是歷史 ║
// ║  紀錄，允許提到已刪除的檔案，不檢查。                            ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LEGACY_EFFECT_FIELDS } from './legacyEffectFields';

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', 'worktrees', 'baseline']);
const TEXT_EXT = /\.(ts|tsx|mjs|js|md)$/;
// 歷史紀錄：允許提到已刪除的檔案與舊欄位
const HISTORY_DOCS = new Set(['docs/WORKLOG.md']);
// 設計當時的欄位名有「現況」說明，只檢查路徑
const LEGACY_FIELD_ALLOWED = new Set(['docs/WORKLOG.md', 'docs/DECISIONS.md', 'docs/STATE_OWNERSHIP_DESIGN.md', 'tests/EffectFieldsRatchet.test.ts', 'tests/DocDrift.test.ts']);
// 執行期才產生的輸出位置，不在 repo 裡
const GENERATED_PREFIXES = ['tools/ui-e2e/out/', 'dist/'];

function walk(dir: string, out: string[]) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue;
            walk(path.join(dir, e.name), out);
        } else if (TEXT_EXT.test(e.name)) {
            out.push(path.relative(ROOT, path.join(dir, e.name)).replace(/\\/g, '/'));
        }
    }
}

function listFiles(): string[] {
    const files: string[] = [];
    for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
        if (e.isFile() && TEXT_EXT.test(e.name)) files.push(e.name);
    }
    for (const d of ['engine', 'components', 'data', 'constants', 'hooks', 'tests', 'tools', 'docs', '.claude/agents', '.claude/skills', 'types']) {
        if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d), files);
    }
    return files;
}

/** 程式檔只看註解；md 看全文 */
function commentText(file: string, src: string): string {
    if (file.endsWith('.md')) return src;
    const parts: string[] = [];
    const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
        // 排除字串裡的 '//'（URL）：前一個字元是引號或冒號就跳過
        const prev = src[m.index - 1];
        if (prev === ':' || prev === "'" || prev === '"' || prev === '`') continue;
        parts.push(m[0]);
    }
    return parts.join('\n');
}

const ROOTS = '(?:engine|components|data|constants|hooks|tests|tools|docs|public|types|art-source)';
const PATH_RE = new RegExp(`(?<![\\w./-])(${ROOTS}/[\\w./@-]*[\\w])`, 'g');
const FILE_LIKE = /\.(ts|tsx|mjs|js|md|json|png|jpg|ogg|mp3|html|py|css)$/;

function brokenPaths(file: string, text: string): string[] {
    const bad: string[] = [];
    for (const m of text.matchAll(PATH_RE)) {
        const p = m[1];
        if (!FILE_LIKE.test(p)) continue;                    // 只檢查明確的檔案路徑（目錄名常是概念）
        if (GENERATED_PREFIXES.some(g => p.startsWith(g))) continue;
        if (!fs.existsSync(path.join(ROOT, p))) bad.push(`${file}: ${p}`);
    }
    if (file.endsWith('.md')) {
        for (const m of text.matchAll(/\]\(([^)#\s]+\.(?:md|ts|tsx|mjs|png|jpg))(?:#[^)]*)?\)/g)) {
            const target = m[1];
            if (/^[a-z]+:/i.test(target)) continue;           // http:、file: 等外部連結
            const abs = path.resolve(ROOT, path.dirname(file), target);
            if (!fs.existsSync(abs)) bad.push(`${file}: (${target})`);
        }
    }
    return bad;
}

const files = listFiles();
const sources = new Map(files.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));

describe('DocDrift', () => {
    it('文件與註解裡的 repo 路徑都存在', () => {
        const bad: string[] = [];
        for (const [f, src] of sources) {
            if (HISTORY_DOCS.has(f)) continue;
            bad.push(...brokenPaths(f, commentText(f, src)));
        }
        expect(bad).toEqual([]);
    });

    it('方框檔頭第一行的名稱出現在該檔程式碼裡', () => {
        const bad: string[] = [];
        for (const [f, src] of sources) {
            if (f.endsWith('.md')) continue;
            const lines = src.split(/\r?\n/).slice(0, 6);
            const top = lines.findIndex(l => l.includes('╔'));
            if (top < 0 || top + 1 >= lines.length) continue;
            const m = lines[top + 1].match(/║\s*(?:\[[A-Z]+\]\s*)?([A-Za-z_][A-Za-z0-9_]*)\s+—/);
            if (!m) continue;
            const name = m[1];
            if (name === path.basename(f).replace(/(\.test)?\.[a-z]+$/, '')) continue;   // 以檔名當標題
            const body = src.split(/\r?\n/).filter(l => !l.includes('║')).join('\n');
            if (!new RegExp(`\\b${name}\\b`).test(body)) bad.push(`${f}: ${name}`);
        }
        expect(bad).toEqual([]);
    });

    it('已移除的狀態欄位名不出現在註解與文件', () => {
        const re = new RegExp(`\\b(${LEGACY_EFFECT_FIELDS.join('|')})\\b`, 'g');
        const bad: string[] = [];
        for (const [f, src] of sources) {
            if (LEGACY_FIELD_ALLOWED.has(f)) continue;
            for (const m of commentText(f, src).matchAll(re)) bad.push(`${f}: ${m[1]}`);
        }
        expect(bad).toEqual([]);
    });
});
