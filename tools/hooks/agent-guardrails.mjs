#!/usr/bin/env node
/**
 * PreToolUse / PostToolUse guardrails for Claude Code in this repo (wired in .claude/settings.json).
 * Rules that prose alone kept failing to hold live here: a hook cannot be skipped.
 * Design rule: never stall an unattended chain on routine steps. Only irreversible actions ask;
 * everything else is a deny-with-fix (the agent retries at once) or an after-the-fact reminder.
 *
 * PreToolUse
 * 1. start_session must name a cheap model (CLAUDE.md tier table). Opus needs an explicit
 *    "[opus-ok]" marker in the prompt, so the reason is written down for the user to see.
 *    Accepting a proposal card (proposal_id only) passes through.
 * 2. No npm install/ci/uninstall/update inside .claude/worktrees or C:\Git\_wt_* worktrees: their
 *    node_modules is a junction to the main checkout, so npm would rewrite the shared folder.
 * 3. start_session / writing sub-agent prompts that touch rendering or coordinates must name
 *    RenderSpec.ts (the coordinate-protocol SSOT); sub-agents do not read AGENTS.md on their own.
 *    Read-only sub-agents (explorer, reviewer, Explore) are exempt.
 * 4. Destructive `git push` (force, --all/--mirror/--tags, deleting a branch) asks the user.
 *    A plain push or merge does not: the main agent asks in chat first (CLAUDE.md 鐵律), and a
 *    second dialog would stall the chain the user already approved.
 * 7. Codex (GPT) calls — codex-companion task/review, `codex exec`, the codex:codex-rescue
 *    sub-agent and the codex:rescue skill — must name --model (task also --effort): the user is
 *    on ChatGPT Plus and the Codex default is the costliest model. Astra, xhigh, or high on a
 *    non-Luna model needs "[codex-cost-ok]" in the command or prompt (CLAUDE.md 派工表).
 *    Each call in a chained command is checked on its own segment, so one call's flags or
 *    marker cannot cover another. Entry check only: Codex's own actions are not seen here.
 *
 * PostToolUse
 * 5. The first edit of a rendering / lifecycle file in a session gets a reminder that green
 *    lint/test/build is not enough (METHODOLOGY §4 lesson 1).
 * 6. Re-recording a fidelity / style baseline gets the evidence checklist as a reminder
 *    (rebaseline-fidelity skill); it does not block.
 *
 * Reads the hook payload as JSON on stdin; prints a decision as JSON, or nothing to allow.
 * Behaviour is covered by tests/HarnessContract.test.ts (runs this script with sample payloads).
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 只認「指令位置」上的指令（開頭或 ; & | ( 換行之後），避免把字串／文件內容裡的字樣誤判
const AT_CMD = '(^\\s*|[;&|(\\n]\\s*)';

/** 破壞性 push（強推、整批推 tag／分支、刪遠端分支）→ 回傳詢問理由；一般 push 回傳 null */
function destructivePushReason(cmd) {
    const re = new RegExp(`${AT_CMD}git\\s+(?:-C\\s+\\S+\\s+)?push(?![\\w-])([^;&|\\n]*)`, 'g');
    for (const m of cmd.matchAll(re)) {
        const args = m[2].trim().split(/\s+/).filter(Boolean);
        const destructive = args.some(a =>
            /^--(force|force-with-lease|force-if-includes|all|mirror|tags|delete|prune)(=.*)?$/.test(a)
            || /^-[a-zA-Z]*[fd]$/.test(a)
            || a.startsWith('+') || a.startsWith(':'));
        if (destructive) {
            return '破壞性 git push（強推、--all／--mirror／--tags、刪除或修剪遠端分支）需要使用者明確同意；遠端是使用者的作品，回退成本由他承擔。';
        }
    }
    return null;
}

// Codex（GPT）額度：使用者是 ChatGPT Plus，Astra 每 5 小時只有 5～45 則（CLAUDE.md 派工表）
const CODEX_COST_OK = '[codex-cost-ok]';
const CODEX_TIERS = '派工表：大量讀檔／摘要 gpt-6-luna＋medium、長線實作 gpt-6.1-sol＋medium、跨模型審查 gpt-6.1-sol。';
// 一段指令的開頭可帶環境變數、env、完整路徑（含引號包住的路徑，如 PowerShell 的 & "C:\…\node.exe"）
const CMD_HEAD = String.raw`^\s*(?:env\s+)?(?:\w+=\S*\s+)*(?:"[^"]*[\\/]|'[^']*[\\/]|[^\s"']*[\\/])?`;
const CODEX_TASK = new RegExp(`${CMD_HEAD}(?:node(?:\\.exe)?["']?\\s.*codex-companion\\.mjs["']?\\s+task\\b|codex(?:\\.exe)?["']?\\s+exec\\b)`, 'i');
const CODEX_REVIEW = new RegExp(`${CMD_HEAD}node(?:\\.exe)?["']?\\s.*codex-companion\\.mjs["']?\\s+(?:adversarial-)?review\\b`, 'i');

/** 抓旗標值（--model x、--model=x、-m x） */
function flagValue(text, names) {
    for (const name of names) {
        const m = text.match(new RegExp(`(?:^|\\s)${name}(?:=|\\s+)["']?([\\w.-]+)`));
        if (m) return m[1];
    }
    return '';
}

/** Codex 呼叫沒寫模型／強度，或用了高成本組合卻沒寫理由 → 回傳拒絕理由；合規回傳 null */
function codexCostReason(text, needEffort) {
    const model = flagValue(text, ['--model', '-m']);
    const effort = flagValue(text, ['--effort']) || (text.match(/model_reasoning_effort\s*=\s*["']?(\w+)/)?.[1] ?? '');
    if (!model || (needEffort && !effort)) {
        return `Codex 呼叫必須明寫 --model${needEffort ? ' 與 --effort' : ''}：不寫就會用 config 預設，可能是最貴的 Astra。${CODEX_TIERS}`;
    }
    const costly = /astra/i.test(model) || effort === 'xhigh' || (effort === 'high' && !/luna/i.test(model));
    if (costly && !text.includes(CODEX_COST_OK)) {
        return `Codex 指定了高成本組合（${model}／${effort || 'config 預設強度'}）。使用者是 Plus 方案，Astra 每 5 小時只有 5～45 則。${CODEX_TIERS}確有必要時寫明理由並加上 ${CODEX_COST_OK}。`;
    }
    return null;
}

/** 每一次 Codex 呼叫各自檢查：旗標與理由標記只算同一段指令裡的，不能被串接的另一個呼叫借用 */
function codexCommandReason(cmd) {
    for (const seg of cmd.split(/[;&|(\n]/)) {
        const task = CODEX_TASK.test(seg);
        if ((!task && !CODEX_REVIEW.test(seg)) || /\s(--help|-h)(\s|$)/.test(seg)) continue;
        const reason = codexCostReason(seg, task);
        if (reason) return reason;
    }
    return null;
}

const BASELINE_RECORD = /perf:fidelity:record|render-fidelity\.mjs[^;&|\n]*--record|E2E_UPDATE_STYLE\s*=\s*1|\$env:E2E_UPDATE_STYLE\s*=\s*['"]?1/;
const BASELINE_REMINDER = '你剛重錄了保真／樣式基準（rebaseline-fidelity skill）。確認：① 重錄前已產生新舊差異圖，'
    + '只有本輪預期的元素變動；② 重錄獨立一個 commit，訊息寫明哪些元素變了、哪些基準 0 差異、證據圖路徑；'
    + '③ 重錄後再跑一次 npm run perf:fidelity 全部通過。合併衝突時不得「取一邊再重錄」。';

// 改到這些路徑就是渲染或生命週期變更（CLAUDE.md：一定要本機實跑驗證）
const RENDER_PATH = /(^|\/)(engine\/(renderers|graphics|presentation)\/|engine\/(renderer|game)\.ts$|engine\/math\/VisualMath\.ts$|data\/vfx\/|hooks\/useGameApp\.ts$|components\/GameCanvas)/;

function isRenderPath(filePath) {
    return RENDER_PATH.test(String(filePath || '').replace(/\\/g, '/'));
}

const RENDER_REMINDER = '你改到渲染或生命週期檔案。lint／test／build 全綠不代表畫面正常：結束前要本機實跑'
    + '（render-verify skill：createServer＋playwright-core 讀 window.__TACTICAL_ENGINE__，0 頁面錯誤），'
    + '再加 npm run perf:guard。動到位置／高度／排序時同一個 commit 更新 RenderSpec.ts 與檔頭。';

// 只讀的子代理不改程式，不需要座標協議
const READ_ONLY_AGENTS = new Set(['explorer', 'reviewer', 'Explore', 'claude-code-guide']);

function requireRenderSpec(prompt, where, deny) {
    const touchesRender = /engine\/renderers|RenderList|RenderPipeline|VisualMath|sortBias|sortKey|op\.ty|getUnitGroundHeight|getCoreAnchor|getUnitAnchor|floatBob|depth sort|深度排序|排序鍵|錨點|發射點|閃爍/i.test(prompt);
    if (touchesRender && !/RenderSpec/.test(prompt)) {
        deny(`${where} 的任務說明動到渲染／座標，卻沒要求讀 engine/renderers/RenderSpec.ts。請在說明中寫明：先讀 RenderSpec 與所改檔案的方框檔頭，改規則時在同一個 commit 同步更新兩者。`);
    }
}

function postContext(text) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text },
    }));
}

function main() {
    // Opt in from Codex hooks; preserve Claude's existing decision behavior.
    const codex = process.argv.includes('--codex');
    const decide = (permissionDecision, reason) => {
        process.stdout.write(JSON.stringify({
            hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: codex && permissionDecision === 'ask' ? 'deny' : permissionDecision, permissionDecisionReason: reason },
        }));
        process.exit(0);
    };
    const deny = (reason) => decide('deny', reason);

    let payload;
    try {
        payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
    } catch {
        process.exit(0); // malformed payload: do not block
    }
    const tool = codex && payload.tool_name === 'spawn_agent' ? 'Agent' : payload.tool_name || '';
    const input = codex && payload.tool_name === 'spawn_agent'
        ? { ...payload.tool_input, subagent_type: payload.tool_input?.agent_type, prompt: payload.tool_input?.message }
        : payload.tool_input || {};
    // Codex apply_patch sends patch text, not file_path. Include move destinations.
    const patchPaths = codex && tool === 'apply_patch'
        ? [...String(input.command || '').matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): ([^\r\n]+)\r?$/gm)].map(m => m[1])
        : [];

    if (payload.hook_event_name === 'PostToolUse') {
        if ((/^(Edit|Write|MultiEdit)$/.test(tool) && isRenderPath(input.file_path)) || patchPaths.some(isRenderPath)) {
            // 每個工作階段只提醒一次，避免每次編輯都塞同一段話進上下文
            const marker = join(tmpdir(), `tactical-render-reminder-${String(payload.session_id || 'nosession').replace(/[^\w-]/g, '')}`);
            if (!existsSync(marker)) {
                try { writeFileSync(marker, ''); } catch { /* 提醒照發 */ }
                postContext(RENDER_REMINDER);
            }
        } else if ((tool === 'Bash' || tool === 'PowerShell') && BASELINE_RECORD.test(String(input.command || ''))) {
            postContext(BASELINE_REMINDER);
        }
        process.exit(0);
    }

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
            requireRenderSpec(prompt, 'start_session', deny);
        }
    }

    if ((tool === 'Agent' || tool === 'Task') && !READ_ONLY_AGENTS.has(String(input.subagent_type || ''))) {
        requireRenderSpec(String(input.prompt || ''), '子代理', deny);
    }

    // codex-rescue 子代理與 codex:rescue skill 會把文字裡的 --model／--effort 轉給 codex-companion task
    const codexRequest = (tool === 'Agent' || tool === 'Task') && input.subagent_type === 'codex:codex-rescue'
        ? String(input.prompt || '')
        : tool === 'Skill' && input.skill === 'codex:rescue' ? String(input.args || '') : null;
    if (codexRequest !== null) {
        const reason = codexCostReason(codexRequest, true);
        if (reason) deny(reason);
    }

    if (tool === 'Bash' || tool === 'PowerShell') {
        const cmd = String(input.command || '');
        const cwd = String(payload.cwd || '').replace(/\\/g, '/');
        const npmMutating = new RegExp(`${AT_CMD}npm(\\.cmd)?\\s+(install|i|ci|uninstall|remove|rm|update|up|prune|dedupe)\\b`, 'i').test(cmd);
        // 兩種工作樹都用 junction 共用主資料夾的 node_modules：.claude/worktrees 與 repo 外的 C:\Git\_wt_*
        const inWorktree = /\/\.claude\/worktrees\/|\/_wt_[^/]*\//i.test(cwd + '/') || /\.claude[\\/]worktrees|[\\/]_wt_/i.test(cmd);
        if (npmMutating && inWorktree) {
            deny('不可在 .claude/worktrees 內執行 npm install/ci/uninstall：node_modules 是指向主資料夾的 junction，會改寫共用的套件。需要套件時停下並回報主代理。');
        }
        const codex = codexCommandReason(cmd);
        if (codex) deny(codex);
        const push = destructivePushReason(cmd);
        if (push) decide('ask', push);
    }

    process.exit(0);
}

main();
