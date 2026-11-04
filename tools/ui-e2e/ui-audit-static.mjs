/**
 * ui-audit-static.mjs — UI 改版的靜態稽核（docs/UI_REFRESH_PLAN.md）
 * 用法：
 *   npm run audit:ui -- L1      只查某條線的檔案（清單在 tools/ui-e2e/ui-lines.json）
 *   npm run audit:ui -- all     查所有 tsx（整合後的全庫閘門）
 * 有違規就印出「檔案:行 規則 內容」並以退出碼 1 結束。
 *
 * 規則對應定義：設計值走 token、內部元件不模糊、互動元件走共用元件、components 不碰引擎內部。
 * 執行期算出來的 style 值（百分比寬度等）不算魔法數字，這裡不查。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const LINES = JSON.parse(readFileSync(join(here, 'ui-lines.json'), 'utf8'));

const PRIMITIVES_DIR = 'components/ui/primitives';
/** 只有這個檔案可以碰 renderer（宿主）。 */
const ENGINE_HOST = 'components/GameCanvas.tsx';

const PALETTE = 'cyan|slate|red|blue|amber|emerald|green|purple|orange|rose|indigo|sky|pink|yellow|gray|zinc|neutral|teal|lime|violet|fuchsia|white|black';
const RULES = [
    { id: 'arbitrary-value', re: /(?:^|[\s"'`!:])-?[a-z][a-z-]*-\[[^\]\s]+\]/ },
    { id: 'palette-class', re: new RegExp(`(?:^|[\\s"'\`!:])(?:bg|text|border|ring|shadow|from|to|via|fill|stroke|divide|outline|accent|placeholder)-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?(?=[\\s"'\`]|$)`) },
    { id: 'font-size-class', re: /(?:^|[\s"'`!:])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?=[\s"'`]|$)/ },
    { id: 'radius-class', re: /(?:^|[\s"'`!:])rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?(?=[\s"'`]|$)/ },
    { id: 'blur-class', re: /(?:^|[\s"'`!:])backdrop-(?:blur|saturate)(?:-[a-z0-9]+)?(?=[\s"'`]|$)/ },
    { id: 'legacy-class', re: /\b(?:liquid-[a-z-]+|custom-scrollbar|no-scrollbar|touch-target(?:-icon)?)\b/ },
    { id: 'literal-token', re: /--token-literal-/ },
    { id: 'color-literal', re: /#[0-9a-fA-F]{6}\b|\brgba?\(/ },
    { id: 'emoji-glyph', re: /[\u{1F300}-\u{1FAFF}⬀-⯿←-⇿■-◿☀-➿]/u },
];
const RAW_CONTROL = { id: 'raw-control', re: /<(?:button|select|input|textarea)\b/ };
const ENGINE_IMPORT = { id: 'engine-import', re: /from\s+['"][^'"]*\/engine\/(?!systems\/ui\/(?:selectors|views\/))[^'"]*['"]/ };

const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const listTsx = (rel) => {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return [];
    if (statSync(abs).isFile()) return [rel.replace(/\\/g, '/')];
    return readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
        const child = `${rel}/${e.name}`;
        if (e.isDirectory()) return listTsx(child);
        return /\.tsx$/.test(e.name) ? [child] : [];
    });
};

const target = process.argv[2];
if (!target || (target !== 'all' && !LINES[target])) {
    console.error(`用法：npm run audit:ui -- <${Object.keys(LINES).join('|')}|all>`);
    process.exit(2);
}
const files = target === 'all'
    ? [...listTsx('components'), 'App.tsx']
    : LINES[target].flatMap(listTsx);

let violations = 0;
const perRule = {};
for (const file of files) {
    const inPrimitives = file.startsWith(PRIMITIVES_DIR);
    const rules = [...RULES];
    if (!inPrimitives) rules.push(RAW_CONTROL);
    if (file !== ENGINE_HOST) rules.push(ENGINE_IMPORT);
    const lines = stripComments(readFileSync(join(ROOT, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
        for (const rule of rules) {
            if (!rule.re.test(line)) continue;
            violations++;
            perRule[rule.id] = (perRule[rule.id] ?? 0) + 1;
            console.log(`${relative(ROOT, join(ROOT, file)).replace(/\\/g, '/')}:${i + 1} ${rule.id} ${line.trim().slice(0, 110)}`);
        }
    });
}
console.log(`\n${target}: ${files.length} 檔，違規 ${violations}`, perRule);
process.exit(violations === 0 ? 0 : 1);
