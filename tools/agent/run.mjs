#!/usr/bin/env node
/**
 * run.mjs — 實作代理（Gemini 等）跑長指令的包裝器：結果寫進檔案，不靠 IDE 的「工作完成」通知。
 *
 * IDE 代理常把長指令丟到背景再等通知；開 vite／瀏覽器的指令結束時通知常常收不到，代理就無限等待
 * （2026-10 卡過 2 小時、70 分鐘，指令其實早就結束）。這支包裝器讓「結束了沒、結果是什麼」可以從檔案讀到。
 *
 * 執行（前景）：
 *   node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令…>
 *   例：node tools/agent/run.mjs fidelity 600 -- npm run perf:fidelity
 * 產出（tools/ui-e2e/out/agent-logs/）：
 *   <名稱>.log          指令完整輸出；最後一行是 EXIT=<代碼>（逾時為 EXIT=TIMEOUT）
 *   <名稱>.status.json  { state: running|done|timeout, exit, pid, startedAt, lastOutputAt, seconds }
 *   running 期間每 10 秒更新 lastOutputAt／heartbeatAt。
 * 逾時：結束整個子程序樹（只限這個指令自己開的程序，含它開的瀏覽器），結束碼 124。
 *
 * 查狀態（卡住時用）：
 *   node tools/agent/run.mjs --check <名稱>
 *   印出 state、結束碼、程序是否還活著、距離上次輸出幾秒、log 最後 15 行，以及該怎麼做（AGENTS.md §7）。
 */
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOG_DIR = process.env.AGENT_LOG_DIR ? resolve(process.env.AGENT_LOG_DIR) : join(ROOT, 'tools', 'ui-e2e', 'out', 'agent-logs');
const HEARTBEAT_MS = 10_000;
/** 沒有輸出超過這麼久，--check 視為「可能卡住」 */
const STALE_SEC = 300;
const TIMEOUT_EXIT = 124;

const paths = (name) => ({ log: join(LOG_DIR, `${name}.log`), status: join(LOG_DIR, `${name}.status.json`) });
const now = () => new Date().toISOString();

function isAlive(pid) {
    if (!pid) return false;
    try { process.kill(pid, 0); return true; } catch { return false; }
}

function killTree(pid) {
    if (!pid) return;
    try {
        if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        else process.kill(-pid, 'SIGKILL');
    } catch { /* 已經結束 */ }
}

function tail(file, n) {
    if (!existsSync(file)) return '(沒有 log)';
    return readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(-n).join('\n');
}

function check(name) {
    const p = paths(name);
    if (!existsSync(p.status)) {
        console.log(`[check] ${name}: 沒有狀態檔（還沒用 run.mjs 跑過）→ 用 run.mjs 前景執行一次。`);
        return 2;
    }
    const s = JSON.parse(readFileSync(p.status, 'utf8'));
    const alive = isAlive(s.pid);
    const quietSec = Math.round((Date.now() - Date.parse(s.lastOutputAt || s.startedAt)) / 1000);
    console.log(`[check] ${name}: state=${s.state} exit=${s.exit ?? '-'} pid=${s.pid} alive=${alive} 距上次輸出=${quietSec}s`);
    console.log(tail(p.log, 15));
    let advice;
    if (s.state === 'done') advice = '已結束：依 log 的結果繼續，不要再等。';
    else if (s.state === 'timeout') advice = '逾時已結束：重跑一次；再逾時就記進報告、跳下一個任務。';
    else if (!alive) advice = '程序已不在但沒有寫 EXIT（被外部中斷）：重跑一次。';
    else if (quietSec > STALE_SEC) advice = `還在跑但 ${quietSec}s 沒有輸出：可能卡住。等到逾時（run.mjs 會自己結束），或記進報告後跳下一個任務。`;
    else advice = '還在跑且有輸出：繼續等，稍後再 --check。';
    console.log(`[check] → ${advice}`);
    return 0;
}

function run(name, timeoutSec, command) {
    mkdirSync(LOG_DIR, { recursive: true });
    const p = paths(name);
    if (existsSync(p.status)) {
        const prev = JSON.parse(readFileSync(p.status, 'utf8'));
        if (prev.state === 'running' && isAlive(prev.pid)) {
            console.error(`[run] ${name} 已經在跑（pid ${prev.pid}）。不要同時跑兩份；用 --check ${name} 看狀態。`);
            return 3;
        }
    }
    const log = createWriteStream(p.log, { encoding: 'utf8' });
    const startedAt = now();
    const status = { name, command, state: 'running', exit: null, pid: null, startedAt, lastOutputAt: startedAt, heartbeatAt: startedAt, timeoutSec, seconds: null };
    const save = () => writeFileSync(p.status, JSON.stringify(status, null, 2));

    const child = spawn(command, { cwd: process.cwd(), shell: true, detached: process.platform !== 'win32', env: process.env });
    status.pid = child.pid;
    save();
    log.write(`[run] ${name} pid=${child.pid} start=${startedAt} timeout=${timeoutSec}s\n[run] $ ${command}\n`);

    const onData = (stream) => (chunk) => {
        stream.write(chunk);
        log.write(chunk);
        status.lastOutputAt = now();
    };
    child.stdout.on('data', onData(process.stdout));
    child.stderr.on('data', onData(process.stderr));

    const heartbeat = setInterval(() => { status.heartbeatAt = now(); save(); }, HEARTBEAT_MS);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, timeoutSec * 1000);
    const forward = () => { killTree(child.pid); };
    process.on('SIGINT', forward);
    process.on('SIGTERM', forward);

    return new Promise((resolveExit) => {
        child.on('close', (code) => {
            clearInterval(heartbeat);
            clearTimeout(timer);
            const seconds = Math.round((Date.now() - Date.parse(startedAt)) / 1000);
            const exit = timedOut ? TIMEOUT_EXIT : (code ?? 1);
            Object.assign(status, { state: timedOut ? 'timeout' : 'done', exit, seconds, heartbeatAt: now() });
            save();
            log.end(`\nEXIT=${timedOut ? 'TIMEOUT' : exit}\n`, () => {
                console.log(`\n[run] ${name} EXIT=${timedOut ? 'TIMEOUT' : exit} 用時 ${seconds}s  log: ${p.log}`);
                resolveExit(exit);
            });
        });
    });
}

const argv = process.argv.slice(2);
if (argv[0] === '--check' && argv[1]) {
    process.exit(check(argv[1]));
}
const sep = argv.indexOf('--');
const [name, timeoutRaw] = argv;
const timeoutSec = Number(timeoutRaw);
if (sep !== 2 || !/^[\w.-]+$/.test(name || '') || !(timeoutSec > 0) || argv.length <= sep + 1) {
    console.error('用法：node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令…>\n      node tools/agent/run.mjs --check <名稱>');
    process.exit(2);
}
// 一個參數＝整串交給 shell；多個參數＝逐一加引號（含空白或 shell 特殊字元的才加），保留原本的切分
const quote = (a) => (/^[\w./:=@%+,-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
const rest = argv.slice(sep + 1);
process.exit(await run(name, timeoutSec, rest.length === 1 ? rest[0] : rest.map(quote).join(' ')));
