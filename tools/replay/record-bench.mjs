// ╔══════════════════════════════════════════════════════════╗
// ║  record-bench — 錄效能基準用的回放檔（契約 S3）            ║
// ║  用法：node tools/replay/record-bench.mjs                  ║
// ║        [--scene=MAGMA] [--factions=2] [--units=10]         ║
// ║        [--seed=1] [--w=13] [--h=11]                        ║
// ║        [--out=public/replays/bench-magma-20.json]          ║
// ║  做法：Vite ssrLoadModule 載入引擎（Node，無渲染），佈陣、  ║
// ║        開戰、用 stepSimulation 跑到分出勝負，exportReplay   ║
// ║        存成 JSON。開機網址 ?replay=<檔名> 直接播它，         ║
// ║        perf:frames 與手機 A/B 用同一場，固定站位與奧義序列。 ║
// ║  [ARCH] 回放檔只記開戰快照＋種子＋指令：模擬改了（平衡、AI） ║
// ║  它仍然播得出來，但已不是同一場；要固定的場景就重錄並在      ║
// ║  commit 訊息寫明原因。                                       ║
// ╚══════════════════════════════════════════════════════════╝
import { createServer } from 'vite';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const SCENE = arg('scene', 'MAGMA');
const FACTIONS = Number(arg('factions', '2'));
const UNITS = Number(arg('units', '10'));
const SEED = Number(arg('seed', '1'));
const W = Number(arg('w', '13'));
const H = Number(arg('h', '11'));
const OUT = arg('out', `public/replays/bench-${SCENE.toLowerCase()}-${FACTIONS * UNITS}.json`);
/** 跑太久就放棄（秒）：展示模式的對局不會超過這個長度 */
const MAX_BATTLE_S = 300;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
let failed = false;
try {
    const { buildHeadlessBattle } = await server.ssrLoadModule('/tools/sim/headlessBattle.ts');
    const { SIM_STEP_S, stepSimulation, exportReplay } = await server.ssrLoadModule('/engine/core/Replay.ts');

    const { engine: e } = buildHeadlessBattle({
        seed: SEED,
        setup: { factions: FACTIONS, unitsPerFaction: UNITS },
        map: { sceneId: SCENE, w: W, h: H },
    });
    const emit = (cmd) => e.bus.emit('UI_COMMAND', cmd);

    emit({ type: 'START_GAME', seed: SEED });
    const maxTicks = Math.round(MAX_BATTLE_S / SIM_STEP_S);
    while (e.isRunning && e.state.time.tick < maxTicks) stepSimulation(e);
    if (e.isRunning) throw new Error(`跑了 ${MAX_BATTLE_S} 秒還沒分出勝負`);

    const file = exportReplay(e);
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(file));
    console.log(JSON.stringify({
        out: OUT, scene: SCENE, units: FACTIONS * UNITS, seed: SEED, build: file.build,
        endTick: file.endTick, seconds: +(file.endTick * SIM_STEP_S).toFixed(1),
        winner: e.state.victory.winningTeam, tiles: file.start.snapshot.tiles.length,
    }));
} catch (err) {
    failed = true;
    console.error(err);
} finally {
    await server.close();
}
process.exit(failed ? 1 : 0);
