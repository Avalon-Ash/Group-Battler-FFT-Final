// ╔══════════════════════════════════════════════════════════════════╗
// ║  AgentRunner — 實作代理長指令包裝器（tools/agent/run.mjs）守門測試 ║
// ║  職責：結束時 log 最後一行是 EXIT=<代碼>、狀態檔 state 正確；      ║
// ║        逾時結束整個子程序樹（含孫程序）並回 124；--check 給出下一步 ║
// ║  [ARCH] IDE 代理的「工作完成」通知不可靠，結束與否必須能從檔案讀到 ║
// ║  （AGENTS.md §7）。                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');
const RUNNER = path.join(ROOT, 'tools/agent/run.mjs');
const LOG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-run-'));
const env = { ...process.env, AGENT_LOG_DIR: LOG_DIR };

function runner(args: string[]) {
    return spawnSync(process.execPath, [RUNNER, ...args], { env, encoding: 'utf8', timeout: 30_000 });
}
const lastLine = (name: string) => fs.readFileSync(path.join(LOG_DIR, `${name}.log`), 'utf8').trim().split(/\r?\n/).pop();
const status = (name: string) => JSON.parse(fs.readFileSync(path.join(LOG_DIR, `${name}.status.json`), 'utf8'));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

describe('AgentRunner', () => {
    beforeAll(() => fs.mkdirSync(LOG_DIR, { recursive: true }));

    it('成功：輸出照轉、log 結尾 EXIT=0、狀態 done', () => {
        const r = runner(['ok', '30', '--', process.execPath, '-e', "console.log('hello 中文')"]);
        expect(r.status).toBe(0);
        expect(r.stdout).toContain('hello 中文');
        expect(lastLine('ok')).toBe('EXIT=0');
        expect(status('ok')).toMatchObject({ state: 'done', exit: 0 });
    });

    it('失敗：結束碼原樣傳回', () => {
        const r = runner(['bad', '30', '--', process.execPath, '-e', 'process.exit(3)']);
        expect(r.status).toBe(3);
        expect(lastLine('bad')).toBe('EXIT=3');
    });

    it('逾時：結束子程序樹（含孫程序），回 124，--check 建議重跑', () => {
        const pidFile = path.join(LOG_DIR, 'grandchild.pid');
        // 子程序再開一個長睡的孫程序，模擬 vite／瀏覽器殘留
        const script = `const c=require('child_process').spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});`
            + `require('fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));setTimeout(()=>{},60000);`;
        const r = runner(['slow', '2', '--', process.execPath, '-e', script]);
        expect(r.status).toBe(124);
        expect(lastLine('slow')).toBe('EXIT=TIMEOUT');
        expect(status('slow').state).toBe('timeout');
        const grandchild = Number(fs.readFileSync(pidFile, 'utf8'));
        expect(alive(grandchild)).toBe(false);
        expect(runner(['--check', 'slow']).stdout).toMatch(/重跑一次/);
    });

    it('--check：已結束的指令告訴代理不要再等', () => {
        expect(runner(['--check', 'ok']).stdout).toMatch(/不要再等/);
        expect(runner(['--check', 'never-ran']).stdout).toMatch(/沒有狀態檔/);
    });
});
