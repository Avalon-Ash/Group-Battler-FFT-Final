#!/usr/bin/env node
/**
 * Codex 版合約副本的唯一產生器：
 *   .claude/skills/<name>/SKILL.md  →  .agents/skills/<name>/SKILL.md（原樣，LF）
 *   .claude/agents/<name>.md        →  .codex/agents/<name>.toml（模型檔位依 CLAUDE.md 的 Codex 派工表）
 * 用法：node tools/agent/sync-codex-contracts.mjs          寫入
 *       node tools/agent/sync-codex-contracts.mjs --check  只比對，不一致就以退出碼 1 結束（tests/HarnessContract.test.ts 會跑）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');

// Codex 子代理檔位（CLAUDE.md 派工表）
const TIERS = {
    explorer: { model: 'gpt-6-luna', effort: 'low' },
    worker: { model: 'gpt-6-luna', effort: 'medium' },
    reviewer: { model: 'gpt-6.1-sol', effort: 'medium' },
};
const codexNote = (name) => `Codex note: this definition is generated from \`.claude/agents/${name}.md\` by \`tools/agent/sync-codex-contracts.mjs\`; edit the source and rerun it. `
    + 'Where the rules name Claude tools, use the Codex equivalent: `Grep` -> `rg`, `Read` with offset/limit -> `sed -n` or `Get-Content -TotalCount`, '
    + '`Glob` -> `rg --files`, `Bash` -> your shell tool. The rules themselves are unchanged.\n\n';

const lf = (s) => s.replace(/\r/g, '');
const tomlBasic = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
// 多行字面字串（'''）不處理跳脫；正文含 ''' 時改用多行基本字串
const tomlMulti = (s) => (s.includes("'''")
    ? '"""\n' + s.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"') + '"""'
    : "'''\n" + s + "'''");

function agentToml(name) {
    const src = lf(fs.readFileSync(path.join(ROOT, '.claude/agents', `${name}.md`), 'utf8'));
    const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error(`${name}.md: no frontmatter`);
    const fm = Object.fromEntries(m[1].split('\n').map(l => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map(x => [x[1], x[2].trim()]));
    if (fm.name !== name) throw new Error(`${name}.md: frontmatter name=${fm.name}`);
    const tier = TIERS[name];
    return [
        `name = ${tomlBasic(name)}`,
        `description = ${tomlBasic(fm.description)}`,
        `model = ${tomlBasic(tier.model)}`,
        `model_reasoning_effort = ${tomlBasic(tier.effort)}`,
        `developer_instructions = ${tomlMulti(codexNote(name) + m[2].trim() + '\n')}`,
        '',
    ].join('\n');
}

const outputs = new Map();
for (const name of fs.readdirSync(path.join(ROOT, '.claude/skills'))) {
    outputs.set(`.agents/skills/${name}/SKILL.md`, lf(fs.readFileSync(path.join(ROOT, '.claude/skills', name, 'SKILL.md'), 'utf8')));
}
for (const file of fs.readdirSync(path.join(ROOT, '.claude/agents')).filter(f => f.endsWith('.md'))) {
    const name = file.slice(0, -3);
    if (!TIERS[name]) throw new Error(`${file}: no Codex tier in TIERS`);
    outputs.set(`.codex/agents/${name}.toml`, agentToml(name));
}

const stale = [];
for (const [rel, text] of outputs) {
    const abs = path.join(ROOT, rel);
    const cur = fs.existsSync(abs) ? lf(fs.readFileSync(abs, 'utf8')) : null;
    if (cur === text) continue;
    stale.push(rel);
    if (!CHECK) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); }
}
if (CHECK && stale.length) {
    console.error(`Codex contract copies are stale (run node tools/agent/sync-codex-contracts.mjs):\n  ${stale.join('\n  ')}`);
    process.exit(1);
}
console.log(stale.length ? `updated ${stale.length}: ${stale.join(', ')}` : 'Codex contract copies up to date');
