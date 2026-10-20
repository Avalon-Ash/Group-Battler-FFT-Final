#!/usr/bin/env node
/**
 * PreToolUse / PostToolUse guardrails for Claude Code in this repo (wired in .claude/settings.json).
 * Rules that prose alone kept failing to hold live here: a hook cannot be skipped.
 *
 * PreToolUse
 * 1. start_session must name a cheap model (CLAUDE.md tier table). Opus needs an explicit
 *    "[opus-ok]" marker in the prompt, so the reason is written down for the user to see.
 *    Accepting a proposal card (proposal_id only) passes through.
 * 2. No npm install/ci/uninstall/update inside .claude/worktrees: their node_modules is a
 *    junction to the main checkout, so npm would rewrite the shared folder.
 * 3. start_session / Agent prompts that touch rendering or coordinates must name RenderSpec.ts
 *    (the coordinate-protocol SSOT); sub-agents do not read AGENTS.md on their own.
 * 4. `git push` and `git merge` while on main always ask the user (CLAUDE.md 鐵律: the remote and
 *    main are the user's work). Exception: pushing a `claude/*` branch, which a cloud session is
 *    assigned to push and which reaches main only through the user's own review.
 * 5. Re-recording a fidelity / style baseline always asks the user, with the evidence steps.
 *
 * PostToolUse
 * 6. The first edit of a rendering / lifecycle file in a session gets a reminder that green
 *    lint/test/build is not enough (METHODOLOGY §4 lesson 1).
 *
 * Reads the hook payload as JSON on stdin; prints a decision as JSON, or nothing to allow.
 * Behaviour is covered by tests/HarnessContract.test.ts (runs this script with sample payloads).
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 只認「指令位置」上的指令（開頭或 ; & | ( 換行之後），避免把字串／文件內容裡的字樣誤判
const AT_CMD = '(^|[;&|(\\n]\\s*)';

/** `git push` 的目標分支；回傳 null 表示無法判斷（--all、--tags、刪除分支等）→ 一律詢問 */
function pushTargets(cmd, currentBranch) {
    const re = new RegExp(`${AT_CMD}git\\s+(?:-C\\s+\\S+\\s+)?push\\b([^;&|\\n]*)`, 'g');
    const targets = [];
    for (const m of cmd.matchAll(re)) {
        const args = m[2].trim().split(/\s+/).filter(Boolean);
        if (args.some(a => /^--(all|mirror|tags|delete)$/.test(a) || a === '-d' || a.startsWith(':'))) return null;
        const positional = args.filter(a => !a.startsWith('-'));
        const refspecs = positional.slice(1);   // 第一個是 remote
        if (refspecs.length === 0) {
            if (!currentBranch) return null;
            targets.push(currentBranch);
        }
        for (const spec of refspecs) {
            const dest = spec.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '');
            targets.push(dest === 'HEAD' ? (currentBranch || 'HEAD') : dest);
        }
    }
    return targets;
}

/** 回傳詢問理由；不需要詢問則回傳 null */
function gitAskReason(cmd, currentBranch) {
    const targets = pushTargets(cmd, currentBranch);
    if (targets === null || targets.some(t => !t.startsWith('claude/'))) {
        return 'git push 需要使用者明確同意（CLAUDE.md 鐵律；合併與 push 分開問）。只有雲端工作階段指定的 claude/* 分支可直接 push。';
    }
    if (new RegExp(`${AT_CMD}git\\s+(?:-C\\s+\\S+\\s+)?merge\\b`).test(cmd) && currentBranch === 'main') {
        return '在 main 上 git merge 需要使用者明確同意（CLAUDE.md 鐵律；合併與 push 分開問）。';
    }
    return null;
}

function baselineAskReason(cmd) {
    if (/perf:fidelity:record|render-fidelity\.mjs[^;&|\n]*--record|E2E_UPDATE_STYLE\s*=\s*1/.test(cmd)) {
        return '重錄保真／樣式基準需要使用者同意，並且要有證據：先產生新舊差異圖、確認只有預期元素變動，'
            + '重錄獨立一個 commit，訊息寫明哪些元素變了、哪些基準 0 差異（rebaseline-fidelity skill）。';
    }
    return null;
}

// 改到這些路徑就是渲染或生命週期變更（CLAUDE.md：一定要本機實跑驗證）
const RENDER_PATH = /(^|\/)(engine\/(renderers|graphics|presentation)\/|engine\/(renderer|game)\.ts$|engine\/math\/VisualMath\.ts$|data\/vfx\/|hooks\/useGameApp\.ts$|components\/GameCanvas)/;

function isRenderPath(filePath) {
    return RENDER_PATH.test(String(filePath || '').replace(/\\/g, '/'));
}

const RENDER_REMINDER = '你改到渲染或生命週期檔案。lint／test／build 全綠不代表畫面正常：結束前要本機實跑'
    + '（render-verify skill：createServer＋playwright-core 讀 window.__TACTICAL_ENGINE__，0 頁面錯誤），'
    + '再加 npm run perf:guard。動到位置／高度／排序時同一個 commit 更新 RenderSpec.ts 與檔頭。';

function currentBranchOf(cwd) {
    try {
        return execFileSync('git', ['-C', cwd || '.', 'symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function requireRenderSpec(prompt, where, deny) {
    const touchesRender = /engine\/renderers|RenderList|RenderPipeline|VisualMath|sortBias|sortKey|op\.ty|getUnitGroundHeight|getCoreAnchor|getUnitAnchor|floatBob|depth sort|深度排序|排序鍵|錨點|發射點|閃爍/i.test(prompt);
    if (touchesRender && !/RenderSpec/.test(prompt)) {
        deny(`${where} 的任務說明動到渲染／座標，卻沒要求讀 engine/renderers/RenderSpec.ts。請在說明中寫明：先讀 RenderSpec 與所改檔案的方框檔頭，改規則時在同一個 commit 同步更新兩者。`);
    }
}

function main() {
    const decide = (permissionDecision, reason) => {
        process.stdout.write(JSON.stringify({
            hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason: reason },
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
    const tool = payload.tool_name || '';
    const input = payload.tool_input || {};

    if (payload.hook_event_name === 'PostToolUse') {
        if (/^(Edit|Write|MultiEdit)$/.test(tool) && isRenderPath(input.file_path)) {
            // 每個工作階段只提醒一次，避免每次編輯都塞同一段話進上下文
            const marker = join(tmpdir(), `tactical-render-reminder-${String(payload.session_id || 'nosession').replace(/[^\w-]/g, '')}`);
            if (!existsSync(marker)) {
                try { writeFileSync(marker, ''); } catch { /* 提醒照發 */ }
                process.stdout.write(JSON.stringify({
                    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: RENDER_REMINDER },
                }));
            }
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

    if (tool === 'Agent' || tool === 'Task') {
        requireRenderSpec(String(input.prompt || ''), '子代理', deny);
    }

    if (tool === 'Bash' || tool === 'PowerShell') {
        const cmd = String(input.command || '');
        const cwd = String(payload.cwd || '').replace(/\\/g, '/');
        const npmMutating = new RegExp(`${AT_CMD}npm(\\.cmd)?\\s+(install|i|ci|uninstall|remove|rm|update|up|prune|dedupe)\\b`, 'i').test(cmd);
        const inWorktree = /\/\.claude\/worktrees\//i.test(cwd + '/') || /\.claude[\\/]worktrees/i.test(cmd);
        if (npmMutating && inWorktree) {
            deny('不可在 .claude/worktrees 內執行 npm install/ci/uninstall：node_modules 是指向主資料夾的 junction，會改寫共用的套件。需要套件時停下並回報主代理。');
        }
        if (new RegExp(`${AT_CMD}git\\s+(?:-C\\s+\\S+\\s+)?(push|merge)\\b`).test(cmd)) {
            const reason = gitAskReason(cmd, currentBranchOf(payload.cwd));
            if (reason) decide('ask', reason);
        }
        const baseline = baselineAskReason(cmd);
        if (baseline) decide('ask', baseline);
    }

    process.exit(0);
}

main();
