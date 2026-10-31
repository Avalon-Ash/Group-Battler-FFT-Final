#!/usr/bin/env node
/**
 * 工具修剪的證據（借自 microsoft/TokenEconomizer 的 tool pruning）：每個預先載入的工具，
 * 定義都會隨每次請求送出；長期沒用到的工具可以放進 .claude/settings.json 的 permissions.deny。
 * 本腳本只讀本專案的 Claude Code 對話紀錄（~/.claude/projects/<專案>/*.jsonl），列出每個工具
 * 用過幾次、在幾個工作階段用過，並依 TE 的門檻提出建議；不寫任何設定，由使用者決定。
 *
 * 門檻（TE 預設）：從沒用過，且跨 ≥2 個工作階段累積 ≥10 個提示，或 ≥5 個工作階段。
 * 工作面工具（PROTECTED）永不建議。紀錄不含「載入了哪些工具」，所以候選清單用 --tools 傳入，
 * 預設是 Claude Code 會預先載入的內建工具。延後載入（deferred）的工具只送名字，修剪效益很小。
 *
 * 用法：node tools/agent/tool-usage-audit.mjs [--dir <紀錄資料夾>] [--tools A,B,C]
 * 套用：在工作階段結尾才改 deny（快取規則，METHODOLOGY §1）；要恢復就刪掉 deny 那一行。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MIN_PROMPTS = 10;
const MIN_PROMPT_SESSIONS = 2;
const MIN_SESSIONS = 5;
const PROTECTED = new Set(['Bash', 'PowerShell', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Skill', 'ToolSearch', 'Agent', 'AskUserQuestion']);
const DEFAULT_CANDIDATES = ['NotebookEdit', 'WebFetch', 'WebSearch', 'TodoWrite', 'EnterPlanMode', 'ExitPlanMode', 'Monitor', 'SendUserFile', 'ScheduleWakeup', 'ListAgents', 'ReportFindings'];

function arg(name) {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
}

const dir = arg('--dir') || path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));
const candidates = (arg('--tools')?.split(',') ?? DEFAULT_CANDIDATES).map(s => s.trim()).filter(Boolean);
if (!fs.existsSync(dir)) {
    console.error(`找不到對話紀錄資料夾：${dir}（用 --dir 指定）`);
    process.exit(1);
}

const uses = new Map();      // tool -> 次數
const usedIn = new Map();    // tool -> Set<session>
const sessions = new Map();  // session -> 提示數
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
    const session = path.basename(file, '.jsonl');
    let prompts = 0;
    for (const line of fs.readFileSync(path.join(dir, file), 'utf8').split('\n')) {
        if (!line) continue;
        let rec;
        try { rec = JSON.parse(line); } catch { continue; }
        const content = rec.message?.content;
        if (rec.type === 'user' && (typeof content === 'string' || (Array.isArray(content) && !content.some(b => b?.type === 'tool_result')))) prompts += 1;
        if (rec.type !== 'assistant' || !Array.isArray(content)) continue;
        for (const b of content) {
            if (b?.type !== 'tool_use' || !b.name) continue;
            uses.set(b.name, (uses.get(b.name) || 0) + 1);
            if (!usedIn.has(b.name)) usedIn.set(b.name, new Set());
            usedIn.get(b.name).add(session);
        }
    }
    sessions.set(session, prompts);
}

const totalPrompts = [...sessions.values()].reduce((a, b) => a + b, 0);
const promptSessions = [...sessions.values()].filter(n => n > 0).length;
console.log(`紀錄：${dir}\n工作階段 ${sessions.size}、提示 ${totalPrompts}\n`);
console.log('用過的工具（次數／工作階段數）：');
for (const [name, n] of [...uses].sort((a, b) => b[1] - a[1])) console.log(`  ${name}: ${n}／${usedIn.get(name).size}`);

const enough = (totalPrompts >= MIN_PROMPTS && promptSessions >= MIN_PROMPT_SESSIONS) || sessions.size >= MIN_SESSIONS;
const propose = candidates.filter(t => !PROTECTED.has(t) && !uses.has(t));
console.log('');
if (!enough) {
    console.log(`證據不足（需 ≥${MIN_PROMPTS} 個提示跨 ≥${MIN_PROMPT_SESSIONS} 個工作階段，或 ≥${MIN_SESSIONS} 個工作階段），先不建議修剪。`);
} else if (!propose.length) {
    console.log('候選工具都用過，沒有建議。');
} else {
    console.log('建議加入 .claude/settings.json 的 permissions.deny（從沒用過）：');
    for (const t of propose) console.log(`  "${t}"`);
}
