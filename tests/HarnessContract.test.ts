// ╔══════════════════════════════════════════════════════════════════╗
// ║  HarnessContract — 主代理合約（skill／子代理／hook）守門測試     ║
// ║  職責：① 每個 skill 有合法 frontmatter，且在 CLAUDE.md 有觸發句  ║
// ║        （沒被點名的 skill 不會被打開）                           ║
// ║    ② 子代理定義鎖定模型，且不是 Opus（使用者是 Pro 方案）        ║
// ║    ③ settings.json 掛的 hook 腳本存在                            ║
// ║    ④ agent-guardrails.mjs 以實際 payload 執行的判定              ║
// ║    ⑤ METHODOLOGY §6 環境事實的條數、日期與禁用詞                 ║
// ║  [ARCH] 能寫成測試的合約規則就寫成測試（DECISIONS §4）。         ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(ROOT, 'tools/hooks/agent-guardrails.mjs');

function frontmatter(file: string): Record<string, string> {
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const out: Record<string, string> = {};
    if (!m) return out;
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w+):\s*(.*)$/);
        if (kv) out[kv[1]] = kv[2].trim();
    }
    return out;
}

function runHook(payload: object, args: string[] = []): { permissionDecision?: string; additionalContext?: string } {
    const res = spawnSync(process.execPath, [HOOK, ...args], { input: JSON.stringify(payload), encoding: 'utf8' });
    expect(res.error).toBeUndefined();
    expect(res.status).toBe(0);
    if (!res.stdout.trim()) return {};
    return JSON.parse(res.stdout).hookSpecificOutput;
}

describe('HarnessContract', () => {
    it('每個 skill 的 name 與目錄一致、有 description，並在 CLAUDE.md 有觸發句', () => {
        const skillsDir = path.join(ROOT, '.claude/skills');
        const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
        const bad: string[] = [];
        for (const name of fs.readdirSync(skillsDir)) {
            const file = path.join(skillsDir, name, 'SKILL.md');
            if (!fs.existsSync(file)) { bad.push(`${name}: 缺 SKILL.md`); continue; }
            const fm = frontmatter(file);
            if (fm.name !== name) bad.push(`${name}: frontmatter name=${fm.name}`);
            if (!fm.description) bad.push(`${name}: 缺 description`);
            if (!claudeMd.includes(`\`${name}\``)) bad.push(`${name}: CLAUDE.md 沒有觸發句`);
        }
        expect(bad).toEqual([]);
    });

    it('METHODOLOGY §6 環境事實：≤12 條、每條有確認日期、只寫事實不寫「可略過／已完成」', () => {
        const doc = fs.readFileSync(path.join(ROOT, 'docs/METHODOLOGY.md'), 'utf8');
        const block = doc.match(/<!-- env-facts:start -->([\s\S]*?)<!-- env-facts:end -->/);
        expect(block, '缺 env-facts 區塊標記').not.toBeNull();
        const facts = block![1].split('\n').filter(l => l.startsWith('- '));
        expect(facts.length).toBeGreaterThan(0);
        expect(facts.length).toBeLessThanOrEqual(12);
        // 借自 TokenEconomizer 的 fact lint：事實一旦帶上結論，就成了跳過驗證的藉口
        const verdict = /略過|跳過|不必|不用(?:跑|測|驗)|免(?:驗|測|跑)|已完成|已修好|\bskip\b|\bno need\b|\bdone\b/i;
        const bad = facts.filter(l => !/（確認 \d{4}-\d{2}-\d{2}）$/.test(l) || verdict.test(l));
        expect(bad).toEqual([]);
    });

    it('Codex 版合約副本（.agents/skills、.codex/agents）與 .claude 來源同步', () => {
        const res = spawnSync(process.execPath, [path.join(ROOT, 'tools/agent/sync-codex-contracts.mjs'), '--check'], { encoding: 'utf8' });
        expect(res.stderr).toBe('');
        expect(res.status).toBe(0);
        // 沒有來源的多餘 skill 副本
        expect(fs.readdirSync(path.join(ROOT, '.agents/skills')).sort()).toEqual(fs.readdirSync(path.join(ROOT, '.claude/skills')).sort());
    });

    it('子代理定義鎖定模型，且不是 Opus', () => {
        const dir = path.join(ROOT, '.claude/agents');
        const bad = fs.readdirSync(dir)
            .filter(f => f.endsWith('.md'))
            .map(f => [f, frontmatter(path.join(dir, f)).model ?? ''] as const)
            .filter(([, model]) => !model || /opus/i.test(model))
            .map(([f, model]) => `${f}: model=${model}`);
        expect(bad).toEqual([]);
    });

    it('settings.json 掛的 hook 腳本存在', () => {
        const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
        const commands: string[] = [];
        for (const entries of Object.values(settings.hooks ?? {}) as { hooks: { command: string }[] }[][]) {
            for (const entry of entries) for (const h of entry.hooks) commands.push(h.command);
        }
        expect(commands.length).toBeGreaterThan(0);
        for (const cmd of commands) {
            const rel = cmd.match(/\$CLAUDE_PROJECT_DIR\/([^"\s]+)/)?.[1];
            expect(rel && fs.existsSync(path.join(ROOT, rel))).toBeTruthy();
        }
    });

    describe('agent-guardrails hook', () => {
        const codex = (payload: object) => runHook(payload, ['--codex']);

        it('Codex Bash payload blocks worktree npm and destructive push without unsupported ask', () => {
            const shell = (command: string, cwd = ROOT) => codex({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd });
            expect(shell('cd .claude/worktrees/nonexistent && npm install').permissionDecision).toBe('deny');
            expect(shell('npm ci', 'C:/Git/_wt_test').permissionDecision).toBe('deny');
            expect(shell('git push --force origin main').permissionDecision).toBe('deny');
            expect(shell('git push origin main').permissionDecision).toBeUndefined();
            expect(shell('codex exec "fix"').permissionDecision).toBe('deny');
            expect(shell('codex exec -m gpt-6-luna -c model_reasoning_effort=low "fix"').permissionDecision).toBeUndefined();
        });

        it('Codex spawn_agent maps message and agent_type while preserving read-only exemptions', () => {
            const spawn = (agent_type: string, message: string) => codex({ hook_event_name: 'PreToolUse', tool_name: 'spawn_agent', tool_input: { agent_type, message } });
            expect(spawn('worker', 'Fix engine/renderers sorting').permissionDecision).toBe('deny');
            expect(spawn('worker', 'Fix engine/renderers sorting; read RenderSpec.ts').permissionDecision).toBeUndefined();
            expect(spawn('explorer', 'Find sortKey writers').permissionDecision).toBeUndefined();
            expect(spawn('reviewer', 'Review engine/renderers').permissionDecision).toBeUndefined();
        });

        it('Codex apply_patch paths trigger one render reminder, including move destinations', () => {
            const session = `codex-test-${process.pid}-${Date.now()}`;
            const patch = (command: string) => codex({ hook_event_name: 'PostToolUse', session_id: session, tool_name: 'apply_patch', tool_input: { command } });
            try {
                expect(patch('*** Begin Patch\n*** Update File: data/skills/red.ts\n*** End Patch').additionalContext).toBeUndefined();
                expect(patch('*** Begin Patch\r\n*** Update File: scratch.ts\r\n*** Move to: engine/math/VisualMath.ts\r\n*** End Patch').additionalContext).toMatch(/render-verify/);
                expect(patch('*** Begin Patch\n*** Add File: data/vfx/example.ts\n*** End Patch').additionalContext).toBeUndefined();
            } finally {
                fs.rmSync(path.join(os.tmpdir(), `tactical-render-reminder-${session}`), { force: true });
            }
        });

        it('Codex PostToolUse Bash retains baseline evidence reminders', () => {
            expect(codex({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'npm run perf:fidelity:record' } }).additionalContext).toMatch(/rebaseline-fidelity/);
        });

        const bash = (command: string, cwd = ROOT) => runHook({ tool_name: 'Bash', tool_input: { command }, cwd });

        it('一般 push／merge 不擋（自動長鏈）；只有破壞性 push 詢問', () => {
            expect(bash('git push origin main').permissionDecision).toBeUndefined();
            expect(bash('cd /c/Git/x && git push origin main 2>&1 | tail -1').permissionDecision).toBeUndefined();
            expect(bash('git push -u origin claude/some-branch').permissionDecision).toBeUndefined();
            expect(bash('git merge --no-ff -q feat/x -m "Merge"').permissionDecision).toBeUndefined();
            expect(bash('git merge-tree --write-tree main feat/x').permissionDecision).toBeUndefined();
            expect(bash('git push --force origin main').permissionDecision).toBe('ask');
            expect(bash('git push -f origin main').permissionDecision).toBe('ask');
            expect(bash('git push origin +main').permissionDecision).toBe('ask');
            expect(bash('git push --tags').permissionDecision).toBe('ask');
            expect(bash('git push origin --delete feat/x').permissionDecision).toBe('ask');
            expect(bash('git push origin :feat/x').permissionDecision).toBe('ask');
            expect(bash('echo "later: git push --force"').permissionDecision).toBeUndefined();
        });

        it('重錄基準不擋，跑完後提醒取證流程', () => {
            const post = (command: string) => runHook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command } });
            expect(bash('npm run perf:fidelity:record').permissionDecision).toBeUndefined();
            expect(post('npm run perf:fidelity:record').additionalContext).toMatch(/rebaseline-fidelity/);
            expect(post('node tools/ui-e2e/render-fidelity.mjs --record').additionalContext).toMatch(/差異圖/);
            expect(post('E2E_UPDATE_STYLE=1 npm run e2e:ui').additionalContext).toMatch(/獨立一個 commit/);
            expect(post('npm run perf:fidelity').additionalContext).toBeUndefined();
        });

        it('會寫程式的子代理動到渲染卻沒提 RenderSpec 時拒絕；唯讀子代理放行', () => {
            expect(runHook({ tool_name: 'Agent', tool_input: { prompt: '修 engine/renderers 的排序鍵' } }).permissionDecision).toBe('deny');
            expect(runHook({ tool_name: 'Agent', tool_input: { subagent_type: 'worker', prompt: '修排序鍵' } }).permissionDecision).toBe('deny');
            expect(runHook({ tool_name: 'Agent', tool_input: { prompt: '修排序鍵，先讀 RenderSpec.ts' } }).permissionDecision).toBeUndefined();
            expect(runHook({ tool_name: 'Agent', tool_input: { subagent_type: 'explorer', prompt: '找誰寫 sortKey' } }).permissionDecision).toBeUndefined();
            expect(runHook({ tool_name: 'Agent', tool_input: { subagent_type: 'reviewer', prompt: '查閃爍根因' } }).permissionDecision).toBeUndefined();
        });

        it('改到渲染檔案時，每個工作階段提醒一次實跑驗證', () => {
            const session = `test-${process.pid}-${Date.now()}`;
            const edit = (file_path: string) => runHook({ hook_event_name: 'PostToolUse', session_id: session, tool_name: 'Edit', tool_input: { file_path } });
            expect(edit('/repo/data/skills/red.ts').additionalContext).toBeUndefined();
            expect(edit('C:\\Git\\repo\\engine\\renderers\\RenderList.ts').additionalContext).toMatch(/render-verify/);
            expect(edit('/repo/engine/renderers/RenderList.ts').additionalContext).toBeUndefined();
            fs.rmSync(path.join(os.tmpdir(), `tactical-render-reminder-${session}`), { force: true });
        });

        it('Codex 呼叫必須寫模型／強度；高成本組合要寫理由', () => {
            const cc = 'node "C:/x/codex/scripts/codex-companion.mjs"';
            expect(bash(`${cc} task --write --model gpt-6.1-sol --effort medium --prompt-file p.md`).permissionDecision).toBeUndefined();
            expect(bash(`${cc} task --model gpt-6-luna --effort high "讀清冊"`).permissionDecision).toBeUndefined();
            expect(bash(`${cc} task --write "修 bug"`).permissionDecision).toBe('deny');
            expect(bash(`${cc} task --model gpt-6.1-sol "修 bug"`).permissionDecision).toBe('deny');
            expect(bash(`${cc} task --model gpt-6-astra --effort low "追根因"`).permissionDecision).toBe('deny');
            expect(bash(`${cc} task --model gpt-6-astra --effort low "追根因" # [codex-cost-ok] Sol 兩次沒找到`).permissionDecision).toBeUndefined();
            expect(bash(`${cc} task --model gpt-6.1-sol --effort high "x"`).permissionDecision).toBe('deny');
            expect(bash(`${cc} task --model gpt-6-luna --effort xhigh "x"`).permissionDecision).toBe('deny');
            expect(bash(`${cc} adversarial-review --background --base main`).permissionDecision).toBe('deny');
            expect(bash(`${cc} review --wait --model gpt-6.1-sol --base main`).permissionDecision).toBeUndefined();
            expect(bash(`${cc} status --all`).permissionDecision).toBeUndefined();
            expect(bash('codex exec "fix"').permissionDecision).toBe('deny');
            expect(bash('codex exec -m gpt-6-luna -c model_reasoning_effort=medium "sum"').permissionDecision).toBeUndefined();
            expect(bash('git commit -m "docs: codex-companion.mjs task 規則"').permissionDecision).toBeUndefined();
            const rescue = (prompt: string) => runHook({ tool_name: 'Agent', tool_input: { subagent_type: 'codex:codex-rescue', prompt } }).permissionDecision;
            expect(rescue('查 X 的根因')).toBe('deny');
            expect(rescue('--model gpt-6.1-sol --effort medium 查 X 的根因')).toBeUndefined();
            expect(runHook({ tool_name: 'Skill', tool_input: { skill: 'codex:rescue', args: '修 X' } }).permissionDecision).toBe('deny');
        });

        it('Codex 每次呼叫各自檢查，前綴與完整路徑不能繞過', () => {
            const cc = 'node "C:/x/codex/scripts/codex-companion.mjs"';
            const cheap = `${cc} task --model gpt-6-luna --effort medium "a"`;
            // 便宜呼叫的旗標與另一段的理由標記都不能借給昂貴呼叫
            expect(bash(`${cheap} && ${cc} task --model gpt-6-astra --effort high "b"`).permissionDecision).toBe('deny');
            expect(bash(`${cheap} ; ${cc} task --write "b"`).permissionDecision).toBe('deny');
            expect(bash(`echo "[codex-cost-ok]" ; ${cc} task --model gpt-6-astra --effort low "b"`).permissionDecision).toBe('deny');
            expect(bash(`${cheap} && ${cc} review --model gpt-6.1-sol --base main`).permissionDecision).toBeUndefined();
            // 開頭空白、環境變數、env、完整路徑、PowerShell 呼叫運算子
            expect(bash('  codex exec "fix"').permissionDecision).toBe('deny');
            expect(bash(`FOO=1 ${cc} task "x"`).permissionDecision).toBe('deny');
            expect(bash(`env FOO=1 ${cc} task "x"`).permissionDecision).toBe('deny');
            expect(bash('"C:/Program Files/nodejs/node.exe" C:/x/codex-companion.mjs task "x"').permissionDecision).toBe('deny');
            expect(bash('& "C:\\Program Files\\nodejs\\node.exe" "C:/x/codex-companion.mjs" task "x"').permissionDecision).toBe('deny');
            expect(bash('C:/tools/codex.exe exec "x"').permissionDecision).toBe('deny');
            expect(bash('codex exec --help').permissionDecision).toBeUndefined();
        });

        it('repo 外的 _wt_ 工作樹也不准 npm 安裝（node_modules 是 junction）', () => {
            expect(bash('npm install', 'C:/Git/_wt_codex2').permissionDecision).toBe('deny');
            expect(bash('cd /c/Git/_wt_x && npm ci').permissionDecision).toBe('deny');
            expect(bash('npm install', 'C:/Git/.claude/worktrees/x').permissionDecision).toBe('deny');
            expect(bash('npm install', 'C:/Git/Group-Battler-FFT-Final').permissionDecision).toBeUndefined();
            expect(bash('npm run test', 'C:/Git/_wt_codex2').permissionDecision).toBeUndefined();
        });

        it('不准 git worktree remove --force（會順著 node_modules junction 刪主資料夾套件）', () => {
            expect(bash('git worktree remove --force .claude/worktrees/agent-x').permissionDecision).toBe('deny');
            expect(bash('git worktree remove -f C:/Git/_wt_x').permissionDecision).toBe('deny');
            expect(bash('git worktree remove .claude/worktrees/agent-x').permissionDecision).toBeUndefined();
            expect(bash('git commit -m "deny git worktree remove --force"').permissionDecision).toBeUndefined();
        });

        it('迴圈守衛：同一個失敗第 3 次換假設、第 5 次停下回報；不同錯誤分開算；同指令成功就清掉', () => {
            const session = `test-loop-${process.pid}-${Date.now()}`;
            const state = path.join(os.tmpdir(), `tactical-loopguard-${session}.log`);
            const fail = (command: string, error: string) => runHook({ hook_event_name: 'PostToolUseFailure', session_id: session, tool_name: 'Bash', tool_input: { command }, error });
            const ok = (command: string) => runHook({ hook_event_name: 'PostToolUse', session_id: session, tool_name: 'Bash', tool_input: { command }, tool_response: { stdout: '' } });
            try {
                // 行號、耗時不同仍算同一個失敗；cd 前綴與路徑不影響指令頭
                expect(fail('npm test', 'Exit code 1\nFAIL tests/A.test.ts:12 expected 3').additionalContext).toBeUndefined();
                expect(fail('cd /repo && npm test', 'Exit code 1\nFAIL tests/A.test.ts:40 expected 7').additionalContext).toBeUndefined();
                expect(fail('npm run lint', 'Exit code 1\nFAIL tests/A.test.ts:12 expected 3').additionalContext).toBeUndefined();
                const third = fail('npm test', 'Exit code 2\nFAIL tests/A.test.ts:99 expected 1');
                expect(third.additionalContext).toMatch(/3 次.*實質不同的假設/);
                expect(fail('npm test', 'Exit code 1\nFAIL tests/A.test.ts:1 expected 1').additionalContext).toBeUndefined();
                expect(fail('npm test', 'Exit code 1\nFAIL tests/A.test.ts:1 expected 1').additionalContext).toMatch(/5 次.*停下來向使用者回報/);
                // 成功後重新計數
                expect(ok('npm test').additionalContext).toBeUndefined();
                fail('npm test', 'FAIL tests/A.test.ts:1 expected 1');
                expect(fail('npm test', 'FAIL tests/A.test.ts:1 expected 1').additionalContext).toBeUndefined();
                // 非 shell 工具不計
                expect(runHook({ hook_event_name: 'PostToolUseFailure', session_id: session, tool_name: 'Edit', tool_input: {}, error: 'x' }).additionalContext).toBeUndefined();
                // Codex：PostToolUse 帶非零 exit_code 也算失敗
                const cx = (n: number) => runHook({ hook_event_name: 'PostToolUse', session_id: `${session}-cx`, tool_name: 'Bash', tool_input: { command: 'npm run build' }, tool_response: { exit_code: n, stderr: 'error TS2322 at line 4' } }, ['--codex']);
                cx(1); cx(1);
                expect(cx(1).additionalContext).toMatch(/3 次/);
            } finally {
                for (const f of [state, path.join(os.tmpdir(), `tactical-loopguard-${session}-cx.log`)]) fs.rmSync(f, { force: true });
            }
        });
    });
});
