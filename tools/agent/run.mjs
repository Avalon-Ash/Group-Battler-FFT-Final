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
 *
 * 分段等待（超過約 5 秒的指令一律這樣跑）：
 *   node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令…>   立刻返回，指令在背景跑
 *   node tools/agent/run.mjs --wait <名稱> [最多等幾秒，預設 5]        最多等這麼久就返回
 *   --wait 第一行是 STATE=RUNNING（再呼叫一次 --wait）或 STATE=DONE EXIT=<代碼>／STATE=TIMEOUT／STATE=LOST。
 *   IDE 代理的工具呼叫超過幾秒就轉成背景並結束回合等通知，通知沒來就整晚停住（2026-10-21 停了 6.5 小時，
 *   指令 10 秒就結束）。每次呼叫都在幾秒內返回，代理就不會交出回合。
 */
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// 記錄目錄：--log-dir=（背景啟動時由 detach 傳入，WMI 程序不繼承環境變數）＞ AGENT_LOG_DIR ＞ 預設
const logDirArg = process.argv.find((a) => a.startsWith('--log-dir='));
const LOG_DIR = logDirArg ? resolve(logDirArg.slice('--log-dir='.length))
    : process.env.AGENT_LOG_DIR ? resolve(process.env.AGENT_LOG_DIR) : join(ROOT, 'tools', 'ui-e2e', 'out', 'agent-logs');
/** --detach 後超過這麼久還停在 starting＝背景程序沒啟動 */
const STARTUP_GRACE_SEC = 10;
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

const startingStale = (s) => s.state === 'starting' && (Date.now() - Date.parse(s.startedAt)) / 1000 > STARTUP_GRACE_SEC;

/** Windows 命令列引號（MSVC 規則：雙引號包住、內部 " 跳脫） */
const winQuote = (a) => `"${String(a).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;

/**
 * Windows：經 WMI（Win32_Process.Create）建立程序。IDE 代理的終端機會把指令放進 Job 物件，
 * 指令結束時連子程序一起結束（2026-10-21：detached spawn 的背景程序一啟動就被收掉，狀態永遠停在 starting）；
 * WMI 建立的程序由 WmiPrvSE 產生，不在呼叫端的 Job 裡。回傳新程序 pid，失敗回傳 0。
 * WMI 程序不繼承環境變數，所以記錄目錄改用 --log-dir 參數傳遞。
 */
function spawnOutsideJob(args) {
    const cmdline = [process.execPath, ...args].map(winQuote).join(' ');
    const script = '$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0};'
        + '$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=$env:RUNMJS_CMDLINE; CurrentDirectory=$env:RUNMJS_CWD; ProcessStartupInformation=$si};'
        + 'Write-Output "$($r.ReturnValue) $($r.ProcessId)"';
    try {
        const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
            encoding: 'utf8', windowsHide: true, env: { ...process.env, RUNMJS_CMDLINE: cmdline, RUNMJS_CWD: process.cwd() },
        }).trim().split(/\s+/);
        return out[0] === '0' ? Number(out[1]) : 0;
    } catch {
        return 0;
    }
}

/** 背景啟動：先寫 starting 狀態（避免 --wait 讀到上一次的結果），再以獨立程序跑 run 模式 */
function detach(name, timeoutSec, rest) {
    mkdirSync(LOG_DIR, { recursive: true });
    const p = paths(name);
    if (existsSync(p.status)) {
        const prev = JSON.parse(readFileSync(p.status, 'utf8'));
        if ((prev.state === 'running' && isAlive(prev.pid)) || (prev.state === 'starting' && !startingStale(prev))) {
            console.log(`[detach] ${name} 已經在跑或正在啟動。用 --wait ${name} 等它。`);
            return 3;
        }
    }
    writeFileSync(p.status, JSON.stringify({ name, state: 'starting', startedAt: now(), timeoutSec }, null, 2));
    writeFileSync(p.log, '');
    const args = [fileURLToPath(import.meta.url), `--log-dir=${LOG_DIR}`, name, String(timeoutSec), '--', ...rest];
    let how = 'wmi';
    if (process.platform !== 'win32' || !spawnOutsideJob(args)) {
        how = 'spawn';
        const child = spawn(process.execPath, args, { cwd: process.cwd(), detached: true, stdio: 'ignore', windowsHide: true, env: process.env });
        child.unref();
    }
    console.log(`[detach] ${name} 已在背景啟動（${how}，逾時 ${timeoutSec}s）。接著執行：node tools/agent/run.mjs --wait ${name}`);
    return 0;
}

/** 最多等 maxSec 秒；第一行固定是 STATE=…，代理據此決定再等或往下走 */
async function waitFor(name, maxSec) {
    const p = paths(name);
    const deadline = Date.now() + maxSec * 1000;
    let s = null;
    for (;;) {
        s = existsSync(p.status) ? JSON.parse(readFileSync(p.status, 'utf8')) : null;
        const finished = s && (s.state === 'done' || s.state === 'timeout');
        const lost = s && ((s.state === 'running' && !isAlive(s.pid)) || startingStale(s));
        if (finished || lost || Date.now() >= deadline) break;
        await new Promise((r) => setTimeout(r, 500));
    }
    if (!s) {
        console.log(`STATE=MISSING\n[wait] ${name}: 沒有狀態檔。先用 --detach 啟動它。`);
        return 2;
    }
    if (s.state === 'done') {
        console.log(`STATE=DONE EXIT=${s.exit}  用時 ${s.seconds}s  log: ${p.log}`);
        console.log(tail(p.log, 15));
        return s.exit;
    }
    if (s.state === 'timeout') {
        console.log(`STATE=TIMEOUT  log: ${p.log}\n${tail(p.log, 15)}\n[wait] → 重跑一次；再逾時就記進報告、跳下一個任務。`);
        return TIMEOUT_EXIT;
    }
    if (startingStale(s)) {
        console.log(`STATE=LOST  背景程序 ${STARTUP_GRACE_SEC}s 內沒有啟動（可能被 IDE 的程序群組收掉）。\n[wait] → 改用前景執行：node tools/agent/run.mjs ${name} ${s.timeoutSec} -- <同一個指令>`);
        return 70;
    }
    if (s.state === 'running' && !isAlive(s.pid)) {
        console.log(`STATE=LOST  程序已不在但沒有寫 EXIT。log: ${p.log}\n[wait] → 重跑一次。`);
        return 70;
    }
    const elapsed = Math.round((Date.now() - Date.parse(s.startedAt)) / 1000);
    const quiet = s.lastOutputAt ? Math.round((Date.now() - Date.parse(s.lastOutputAt)) / 1000) : elapsed;
    console.log(`STATE=RUNNING  已跑 ${elapsed}s／逾時 ${s.timeoutSec}s  距上次輸出 ${quiet}s`);
    console.log(tail(p.log, 3));
    console.log(`[wait] → 還沒結束。不要結束回合，立刻再執行：node tools/agent/run.mjs --wait ${name}`);
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

    const child = spawn(command, { cwd: process.cwd(), shell: true, detached: process.platform !== 'win32', windowsHide: true, env: process.env });
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

let argv = process.argv.slice(2).filter((a) => !a.startsWith('--log-dir='));
if (argv[0] === '--check' && argv[1]) {
    process.exit(check(argv[1]));
}
if (argv[0] === '--wait' && argv[1]) {
    const maxSec = Number(argv[2] ?? 5);
    process.exit(await waitFor(argv[1], maxSec > 0 ? maxSec : 5));
}
const detachMode = argv[0] === '--detach';
if (detachMode) argv = argv.slice(1);
const sep = argv.indexOf('--');
const [name, timeoutRaw] = argv;
const timeoutSec = Number(timeoutRaw);
if (sep !== 2 || !/^[\w.-]+$/.test(name || '') || !(timeoutSec > 0) || argv.length <= sep + 1) {
    console.error('用法：node tools/agent/run.mjs [--detach] <名稱> <逾時秒數> -- <指令…>\n      node tools/agent/run.mjs --wait <名稱> [秒數]\n      node tools/agent/run.mjs --check <名稱>');
    process.exit(2);
}
// 一個參數＝整串交給 shell；多個參數＝逐一加引號（含空白或 shell 特殊字元的才加），保留原本的切分
const quote = (a) => (/^[\w./:=@%+,-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
const rest = argv.slice(sep + 1);
if (detachMode) process.exit(detach(name, timeoutSec, rest));
process.exit(await run(name, timeoutSec, rest.length === 1 ? rest[0] : rest.map(quote).join(' ')));
