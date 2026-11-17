// ╔══════════════════════════════════════════════════════════╗
// ║  sim-fingerprint — 同 seed 模擬的行為指紋                 ║
// ║  用法：node tools/balance/sim-fingerprint.mjs [--record]  ║
// ║        [--battles=60] [--dump=<場景>:<場次>]              ║
// ║  每場戰鬥每 0.5 秒記下所有單位的完整狀態並算 SHA-1，和     ║
// ║  fingerprint.baseline.json 逐場比對，有差就退出碼 1。      ║
// ║  [ARCH] 重構技能系統時的硬關卡：行為不變的改動必須完全相同 ║
// ║  故意改玩法時才由主代理 --record，commit 訊息要寫明原因。  ║
// ║  情境、佈陣、狀態欄位、步長讀 simFingerprint.ts（和契約    ║
// ║  驗收共用），本檔不另外定義。                              ║
// ╚══════════════════════════════════════════════════════════╝
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const RECORD = process.argv.includes('--record');
const BATTLES = Number(arg('battles', 60));
const DUMP = arg('dump', null);
const BASELINE = 'tools/balance/fingerprint.baseline.json';
const MAX_TIME = 120;
/** 取樣間隔（秒），依步長換算成 tick 數 */
const SAMPLE_S = 0.5;
const SALT = 12345;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, logLevel: 'error', appType: 'custom', optimizeDeps: { noDiscovery: true } });
let exitCode = 0;
try {
    // 步長＝遊戲的固定步長；情境表、佈陣、狀態字串都在 simFingerprint.ts
    const { DT, SIM_SCENARIOS, buildBattle, fingerprintFrame } = await server.ssrLoadModule('/tools/balance/simFingerprint.ts');
    const SCENARIOS = Object.entries(SIM_SCENARIOS).map(([id, sc]) => ({ id, ...sc }));
    const SAMPLE_TICKS = Math.round(SAMPLE_S / DT);
    const { AgentManager } = await server.ssrLoadModule('/engine/systems/agentManager.ts');
    AgentManager.matchSalt = SALT;

    const runBattle = (sc, b, seed) => {
        let engine;
        try {
            engine = buildBattle(sc.id, seed);
        } catch (err) {
            throw new Error(`battle ${b}: ${err.message}`, { cause: err });
        }
        let over = false;
        const casts = {};
        engine.bus.on('GAME_OVER', () => { over = true; });
        engine.bus.on('GAME_EVENT', (e) => { if (e.type === 'CAST_FINISH' && e.skill?.id) casts[e.skill.id] = (casts[e.skill.id] ?? 0) + 1; });
        engine.play();
        const hash = createHash('sha1');
        const lines = DUMP ? [] : null;
        let t = 0, tick = 0;
        while (!over && t < MAX_TIME) {
            engine.tick(DT);
            t += DT;
            if (++tick % SAMPLE_TICKS === 0) {
                const frame = fingerprintFrame(engine, tick);
                hash.update(frame);
                lines?.push(frame);
            }
        }
        const alive = engine.agents.filter((a) => a.hp > 0 && !a.outOfBounds).length;
        hash.update(`end ${tick} ${alive}`);
        return { hash: hash.digest('hex'), ticks: tick, alive, casts, lines };
    };

    if (DUMP) {
        const [scId, idx] = DUMP.split(':');
        const sc = SCENARIOS.find((s) => s.id === scId);
        if (!sc) throw new Error(`unknown scenario ${scId}`);
        const i = SCENARIOS.indexOf(sc);
        const r = runBattle(sc, Number(idx), 21000000 + i * 100000 + Number(idx));
        const out = `tools/ui-e2e/out/fingerprint-${scId}-${idx}.txt`;
        writeFileSync(out, r.lines.join('\n\n'));
        console.log(`dumped ${out}`);
    } else {
        const current = {};
        SCENARIOS.forEach((sc, i) => {
            current[sc.id] = [];
            for (let b = 0; b < BATTLES; b++) {
                const r = runBattle(sc, b, 21000000 + i * 100000 + b);
                current[sc.id].push(r.hash);
            }
        });
        if (RECORD) {
            writeFileSync(BASELINE, `${JSON.stringify(current, null, 1)}\n`);
            console.log(`recorded ${SCENARIOS.map((s) => `${s.id}:${current[s.id].length}`).join(' ')}`);
        } else {
            if (!existsSync(BASELINE)) throw new Error(`no baseline: ${BASELINE}`);
            const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
            let bad = 0;
            for (const sc of SCENARIOS) {
                const a = base[sc.id] ?? [], b = current[sc.id];
                const diff = b.map((h, i) => (h === a[i] ? -1 : i)).filter((i) => i >= 0);
                console.log(`${sc.id}: ${b.length - diff.length}/${b.length} identical${diff.length ? `, first difference at battle ${diff[0]} (--dump=${sc.id}:${diff[0]})` : ''}`);
                bad += diff.length;
            }
            if (bad > 0) {
                console.error(`FAIL: ${bad} battles differ from the baseline. Behaviour changed.`);
                exitCode = 1;
            } else console.log('PASS: behaviour identical to the baseline');
        }
    }
} finally {
    await server.close();
}
process.exit(exitCode);
