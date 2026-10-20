// ╔══════════════════════════════════════════════════════════════════╗
// ║  HarnessContract — 主代理合約（skill／子代理／hook）守門測試     ║
// ║  職責：① 每個 skill 有合法 frontmatter，且在 CLAUDE.md 有觸發句  ║
// ║        （沒被點名的 skill 不會被打開）                           ║
// ║    ② 子代理定義鎖定模型，且不是 Opus（使用者是 Pro 方案）        ║
// ║    ③ settings.json 掛的 hook 腳本存在                            ║
// ║    ④ agent-guardrails.mjs 以實際 payload 執行的判定              ║
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

function runHook(payload: object): { permissionDecision?: string; additionalContext?: string } {
    const res = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
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
    });
});
