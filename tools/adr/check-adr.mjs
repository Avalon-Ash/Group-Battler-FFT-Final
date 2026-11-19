#!/usr/bin/env node
// check-adr.mjs — 架構決策紀錄（ADR）的格式與索引檢查。只用 node 內建模組。
// 正本：~/.claude/skills/adr/check-adr.mjs（全域 adr skill）。repo 裡的是副本，改規則先改正本再複製。
// 只檢查格式、連結與證據路徑存在，不判斷決策內容對不對。
//
// 用法：node check-adr.mjs [--root <repo 根目錄>] [--dir docs/adr] [--index <索引檔>]
//                          [--min <至少幾份>] [--anchor <regex>]... [--no-evidence]
//   --index   預設 <dir>/README.md；另有決策總表的 repo 指到那個檔（例 docs/DECISIONS.md）
//   --anchor  索引檔裡必須保留的字樣（其他文件引用它），可重複
// 退出碼：0 通過；1 有違規（逐條列在 stderr）；2 參數錯誤。

import fs from 'node:fs';
import path from 'node:path';

const ADR_FILE = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const ADR_LINK = /(?:^|[(/\s`])(\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md)/gm;
const REQUIRED_SECTIONS = ['## 背景', '## 決定', '## 放棄的做法', '## 後果', '## 證據'];
const EVIDENCE_SECTION = '## 證據';
const STATUS_LINE = /^狀態：(採用|提議|已取代（由 (\d{4})）)\s*$/m;
const DATE_LINE = /^日期：\d{4}-\d{2}-\d{2}\s*$/m;
const SUPERSEDES_LINE = /^取代：(\d{4})\s*$/m;
const NUMBER_WIDTH = 4;

const opts = { root: process.cwd(), dir: 'docs/adr', index: null, min: 0, anchors: [], evidence: true };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
        if (i + 1 >= argv.length) usage(`${a} 需要一個值`);
        return argv[++i];
    };
    if (a === '--root') opts.root = next();
    else if (a === '--dir') opts.dir = next();
    else if (a === '--index') opts.index = next();
    else if (a === '--min') opts.min = Number(next());
    else if (a === '--anchor') opts.anchors.push(new RegExp(next(), 'm'));
    else if (a === '--no-evidence') opts.evidence = false;
    else usage(`不認得的參數 ${a}`);
}
if (!Number.isInteger(opts.min) || opts.min < 0) usage('--min 要是非負整數');

function usage(msg) {
    console.error(`check-adr: ${msg}`);
    process.exit(2);
}

const root = path.resolve(opts.root);
const adrDir = path.resolve(root, opts.dir);
const indexPath = path.resolve(root, opts.index ?? path.join(opts.dir, 'README.md'));
const errors = [];
const fail = (msg) => errors.push(msg);

const files = fs.existsSync(adrDir) ? fs.readdirSync(adrDir).filter((f) => ADR_FILE.test(f)).sort() : [];
const numOf = (f) => ADR_FILE.exec(f)[1];
const texts = new Map(files.map((f) => [f, fs.readFileSync(path.join(adrDir, f), 'utf8').replace(/\r\n/g, '\n')]));

if (!fs.existsSync(path.join(adrDir, 'README.md'))) fail(`${opts.dir}/README.md 不存在`);
if (files.length < opts.min) fail(`ADR 只有 ${files.length} 份，至少要 ${opts.min} 份`);

// 檔名不合規的 .md（README 除外）多半是編號或命名寫錯
if (fs.existsSync(adrDir)) {
    for (const f of fs.readdirSync(adrDir)) {
        if (f.endsWith('.md') && f !== 'README.md' && !ADR_FILE.test(f)) fail(`${f}: 檔名要是「四位數編號-英文小寫連字號.md」`);
    }
}

// 編號從 0001 連續，不跳號、不重複
files.forEach((f, i) => {
    const want = String(i + 1).padStart(NUMBER_WIDTH, '0');
    if (numOf(f) !== want) fail(`${f}: 編號應為 ${want}（編號要連續、不重複）`);
});

// 標題、狀態、日期、五節
for (const f of files) {
    const text = texts.get(f);
    if (!text.startsWith(`# ${numOf(f)} `)) fail(`${f}: 第一行要是「# ${numOf(f)} <標題>」`);
    if (!STATUS_LINE.test(text)) fail(`${f}: 缺狀態行（狀態：採用｜提議｜已取代（由 NNNN））`);
    if (!DATE_LINE.test(text)) fail(`${f}: 缺日期行（日期：YYYY-MM-DD）`);
    for (const s of REQUIRED_SECTIONS) if (!text.includes(`\n${s}\n`)) fail(`${f}: 缺章節「${s}」`);
}

// 取代鏈雙向
const byNum = new Map(files.map((f) => [numOf(f), texts.get(f)]));
for (const [num, text] of byNum) {
    const by = STATUS_LINE.exec(text)?.[2];
    if (by) {
        if (!byNum.has(by)) fail(`${num}: 標成已取代（由 ${by}），但 ${by} 不存在`);
        else if (SUPERSEDES_LINE.exec(byNum.get(by))?.[1] !== num) fail(`${by}: 要寫「取代：${num}」`);
    }
    const replaces = SUPERSEDES_LINE.exec(text)?.[1];
    if (replaces) {
        if (!byNum.has(replaces)) fail(`${num}: 寫了取代 ${replaces}，但 ${replaces} 不存在`);
        else if (STATUS_LINE.exec(byNum.get(replaces))?.[2] !== num) fail(`${replaces}: 狀態要改成「已取代（由 ${num}）」`);
    }
}

// 索引與資料夾一致
const indexLabel = path.relative(root, indexPath).replace(/\\/g, '/');
if (!fs.existsSync(indexPath)) {
    fail(`索引檔 ${indexLabel} 不存在`);
} else {
    const index = fs.readFileSync(indexPath, 'utf8');
    const linked = new Set([...index.matchAll(ADR_LINK)].map((m) => m[1]));
    for (const f of files) if (!linked.has(f)) fail(`${indexLabel}: 沒有連到 ${f}`);
    for (const l of linked) if (!files.includes(l)) fail(`${indexLabel}: 連到不存在的 ${l}`);
    for (const a of opts.anchors) if (!a.test(index)) fail(`${indexLabel}: 少了要保留的字樣 ${a}`);
}

// 證據：反引號裡像 repo 路徑的字串必須存在（含 / 、沒有空白、不是網址或萬用字元）
if (opts.evidence) {
    for (const f of files) {
        const text = texts.get(f);
        const start = text.indexOf(`\n${EVIDENCE_SECTION}\n`);
        if (start < 0) continue;
        const rest = text.slice(start + EVIDENCE_SECTION.length + 2);
        const end = rest.search(/\n## /);
        const section = end < 0 ? rest : rest.slice(0, end);
        for (const m of section.matchAll(/`([^`\s]+)`/g)) {
            const token = m[1];
            if (!token.includes('/') || /[*<>{}$|]|:\/\//.test(token)) continue;
            const p = token.replace(/[#:].*$/, '').replace(/\/$/, '');
            if (!/\.[A-Za-z0-9]+$/.test(p) && !fs.existsSync(path.resolve(root, p))) {
                // 沒有副檔名又不存在：可能是指令或識別字，不是路徑，略過
                continue;
            }
            if (!fs.existsSync(path.resolve(root, p))) fail(`${f}: 證據裡的路徑不存在 ${token}`);
        }
    }
}

if (errors.length) {
    console.error(`ADR 檢查失敗（${errors.length} 項）：`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}
console.log(`ADR 檢查通過：${files.length} 份，索引 ${indexLabel}`);
