#!/usr/bin/env node
/**
 * PreToolUse guardrails for Claude Code in this repo (wired in .claude/settings.json).
 *
 * 1. start_session must name a cheap model (CLAUDE.md tier table). Opus needs an explicit
 *    "[opus-ok]" marker in the prompt, so the reason is written down for the user to see.
 *    Accepting a proposal card (proposal_id only) passes through.
 * 2. No npm install/ci/uninstall/update inside .claude/worktrees: their node_modules is a
 *    junction to the main checkout, so npm would rewrite the shared folder.
 *
 * Reads the hook payload as JSON on stdin; prints a deny decision as JSON, or nothing to allow.
 */
import { readFileSync } from 'node:fs';

const deny = (reason) => {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
    }));
    process.exit(0);
};

let payload;
try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
    process.exit(0); // malformed payload: do not block
}
const tool = payload.tool_name || '';
const input = payload.tool_input || {};

if (tool.endsWith('__start_session')) {
    // 只接受提案卡（proposal_id）或先發 offer 卡（只有 title）：此時還沒有 brief，也不決定模型
    const startingProposal = input.proposal_id && !input.prompt && !input.title;
    const offerCard = input.initiation === 'offer' && !input.prompt;
    if (!startingProposal && !offerCard) {
        const model = String(input.model || '');
        const prompt = String(input.prompt || '');
        if (!model) {
            deny('start_session 必須指定 model（CLAUDE.md 分級：機械性實作 Sonnet／medium、追根因與審查 Sonnet／high、找檔 Haiku／low）。');
        }
        if (/opus/i.test(model) && !prompt.includes('[opus-ok]')) {
            deny('start_session 指定了 Opus。使用者是 Pro 方案；除非真的需要設計級推理，請改用 Sonnet。確有必要時在 prompt 寫明理由並加上 [opus-ok]。');
        }
    }
}

if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(input.command || '');
    const cwd = String(payload.cwd || '').replace(/\\/g, '/');
    // 只認「指令位置」上的 npm（開頭或 ; & | ( 換行之後），避免把字串／文件內容裡的字樣誤判
    const npmMutating = /(^|[;&|(\n]\s*)npm(\.cmd)?\s+(install|i|ci|uninstall|remove|rm|update|up|prune|dedupe)\b/i.test(cmd);
    const inWorktree = /\/\.claude\/worktrees\//i.test(cwd + '/') || /\.claude[\\/]worktrees/i.test(cmd);
    if (npmMutating && inWorktree) {
        deny('不可在 .claude/worktrees 內執行 npm install/ci/uninstall：node_modules 是指向主資料夾的 junction，會改寫共用的套件。需要套件時停下並回報主代理。');
    }
}

process.exit(0);
