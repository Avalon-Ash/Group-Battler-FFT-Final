// 技能圖示線條資料產生器（WORKLOG §2 DE）。
// 讀 data/ui/skillGlyphs.ts 的 SKILL_GLYPH，從 node_modules/lucide-react 抽出用到的圖，寫成 public/assets/ui/skill_glyphs.json：
// { "<lucide 名稱>": [["path", { "d": "..." }], ...] }。執行時由 hooks/adapters/skillGlyphs.ts 載入，不打進程式包。
// 改了對照表就重跑：npm run gen:skill-glyphs（tests/SkillGlyphs.test.ts 檢查同步）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LUCIDE_DIR = join(ROOT, 'node_modules/lucide-react/dist/esm/icons');
const OUT = join(ROOT, 'public/assets/ui/skill_glyphs.json');

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
    const { SKILL_GLYPH } = await server.ssrLoadModule('/data/ui/skillGlyphs.ts');
    const names = [...new Set(Object.values(SKILL_GLYPH))].sort();
    const out = {};
    for (const name of names) {
        const mod = await import(pathToFileURL(join(LUCIDE_DIR, `${name}.mjs`)).href);
        out[name] = mod.__iconData.node.map(([tag, attrs]) => {
            const { key: _key, ...rest } = attrs;
            return [tag, rest];
        });
    }
    mkdirSync(dirname(OUT), { recursive: true });
    // 一個圖一行，改表時的差異好讀
    const body = names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(out[n])}`).join(',\n');
    writeFileSync(OUT, `{\n${body}\n}\n`, 'utf8');
    console.log(`PASS  ${names.length} glyphs → ${OUT}`);
} finally {
    await server.close();
}
