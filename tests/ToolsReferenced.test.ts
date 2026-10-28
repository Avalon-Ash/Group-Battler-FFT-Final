// tools/ 底下進版控的腳本都要有入口：被 package.json、測試、skill、文件或其他工具引用。
// 一次性的探針、截圖、重現腳本寫在 tools/ui-e2e/out/（不進版控），做完就丟（AGENTS §3）。
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT_EXT = /\.(mjs|cjs|js|ts|py|html)$/;
// 歷史紀錄與清冊會提到已刪除的腳本，不算入口
const NOT_AN_ENTRY = new Set(['docs/WORKLOG.md']);
const NOT_AN_ENTRY_EXT = /\.csv$/;

function tracked(...pathspecs: string[]): string[] {
    return execSync(`git ls-files ${pathspecs.join(' ')}`, { cwd: ROOT, encoding: 'utf8' })
        .split('\n').filter(Boolean);
}

describe('ToolsReferenced', () => {
    it('每個 tools/ 腳本都有入口', () => {
        const scripts = tracked('tools').filter(f => SCRIPT_EXT.test(f));
        const sources = tracked('.').filter(f =>
            /\.(ts|tsx|mjs|cjs|js|py|html|md|json)$/.test(f) &&
            !f.startsWith('public/') &&
            !NOT_AN_ENTRY.has(f) && !NOT_AN_ENTRY_EXT.test(f));
        const texts = new Map(sources.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
        const orphans = scripts.filter(script => {
            const name = path.basename(script);
            for (const [f, text] of texts) {
                if (f !== script && text.includes(name)) return false;
            }
            return true;
        });
        expect(orphans).toEqual([]);
    });
});
