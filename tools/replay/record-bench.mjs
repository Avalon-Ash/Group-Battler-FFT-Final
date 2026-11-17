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
    const { GameEngine } = await server.ssrLoadModule('/engine/game.ts');
    const { SIM_STEP_S, stepSimulation, exportReplay } = await server.ssrLoadModule('/engine/core/Replay.ts');
    const { querySpawnableHexes, layoutFactionHexes } = await server.ssrLoadModule('/engine/systems/ui/editorQueries.ts');
    const { random } = await server.ssrLoadModule('/engine/math/rng.ts');
    const { Team, Role } = await server.ssrLoadModule('/types.ts');
    const ROLES = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

    const e = new GameEngine({ audio: false });
    const emit = (cmd) => e.bus.emit('UI_COMMAND', cmd);
    e.seedSimulation(SEED);
    emit({ type: 'SET_BATTLE_SETUP', setup: { factions: FACTIONS, unitsPerFaction: UNITS } });
    emit({ type: 'RANDOMIZE_MAP', w: W, h: H, sceneId: SCENE, randomizeScene: false });
    if (e.currentScene.id !== SCENE) throw new Error(`場景 ${SCENE} 不存在（現在是 ${e.currentScene.id}）`);
    const hexes = [...querySpawnableHexes(e)];
    for (let i = hexes.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [hexes[i], hexes[j]] = [hexes[j], hexes[i]];
    }
    const layout = layoutFactionHexes(hexes, FACTIONS, UNITS);
    for (let f = 0; f < FACTIONS; f++) {
        for (let u = 0; u < UNITS; u++) {
            const hex = layout[f]?.[u];
            if (!hex) throw new Error(`陣營 ${f} 第 ${u} 人沒有出生格（地圖 ${W}x${H} 太小？）`);
            emit({ type: 'PLACE_AGENT', team: f % 2 === 0 ? Team.BLUE : Team.RED, side: f, q: hex.q, r: hex.r, role: ROLES[(f + u) % ROLES.length] });
        }
    }
    if (e.agents.length !== FACTIONS * UNITS) throw new Error(`只生成了 ${e.agents.length} 人`);

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
