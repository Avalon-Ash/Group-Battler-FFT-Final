/**
 * Deterministic skill recorder (MP4 + GIF + 4-frame contact sheet + grayscale sheet).
 *
 * Usage:
 *   node tools/vfx/record-skill.mjs --list
 *   node tools/vfx/record-skill.mjs --skill=tb_u1
 *   node tools/vfx/record-skill.mjs --skill=聖光結界 --team=BLUE --frames=90 --fps=30 --seed=1337
 *
 * Options:
 *   --skill=<id|name>   skill id (e.g. tb_u1) or exact name (required unless --list)
 *   --team=BLUE|RED     caster team (default: the skill's own team, else BLUE)
 *   --frames=90         number of OUTPUT frames
 *   --fps=30            output fps; the engine is stepped at 60 Hz, so fps=30 samples every 2nd step
 *   --seed=1337         Math.random seed (same args => byte-identical contact sheets)
 *   --out=<dir>         output dir (default tools/ui-e2e/out/vfx)
 *   --crop=720          square crop (canvas px) around the action
 *   --zoom=1.6          camera zoom
 *   --dist=N            hex distance caster->target (default: clamp(skill.range, 1..3), 2 for self-centred)
 *   --lift=20           aim point height above the ground (world px)
 *   --scene=<id>        scene id from data/scenes.ts (default: first scene)
 *   --keep-frames       keep the PNG frames (otherwise deleted)
 *
 * Harness: same approach as tools/ui-e2e/render-fidelity.mjs (seeded Math.random, synthetic time,
 * manual rAF queue driven by window.__stepFrames). Needs `msedge`/`chrome` for playwright-core and
 * an ffmpeg (PATH, $FFMPEG_PATH, or the python imageio_ffmpeg binary).
 *
 * Scene: caster at a fixed hex, one main enemy target in front of it (distance = clamp(range, 1..3)),
 * two extra enemies next to the target (AOE) and one ally next to the caster (buffs/heals). AI is
 * disabled (bt = null) so only the requested cast happens. Cast goes through the public
 * engine.initiateCast(); setup goes through UI_COMMANDs on engine.bus where one exists.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const START_TEXT = '啟動戰術模擬'; // 啟動戰術模擬
const ENGINE_HZ = 60;

// ---------------------------------------------------------------- args
const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
        return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
    })
);
const isList = args.list === true;
const skillQuery = typeof args.skill === 'string' ? args.skill : null;
const frames = Math.max(8, parseInt(args.frames ?? '90', 10));
const fps = Math.max(1, parseInt(args.fps ?? '30', 10));
const seed = parseInt(args.seed ?? '1337', 10);
const crop = Math.max(64, parseInt(args.crop ?? '720', 10) & ~1);
const zoom = parseFloat(args.zoom ?? '1.6');
const sceneId = typeof args.scene === 'string' ? args.scene : null;
const keepFrames = args['keep-frames'] === true;
const outDir = resolve(repoRoot, typeof args.out === 'string' ? args.out : 'tools/ui-e2e/out/vfx');
const dist0 = parseInt(args.dist ?? '0', 10);
const bodyLift = parseFloat(args.lift ?? '20');
const stepsPerFrame = Math.max(1, Math.round(ENGINE_HZ / fps));

if (!isList && !skillQuery) {
    console.error('Usage: node tools/vfx/record-skill.mjs --skill=<id|name> [--team=BLUE|RED] [--frames=90] [--fps=30] [--seed=1337] [--out=dir] | --list');
    process.exit(2);
}

// ---------------------------------------------------------------- ffmpeg
const findFfmpeg = () => {
    const candidates = [];
    if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
    candidates.push('ffmpeg');
    const py = spawnSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
    if (py.status === 0 && py.stdout.trim()) candidates.push(py.stdout.trim());
    for (const c of candidates) {
        const r = spawnSync(c, ['-version'], { encoding: 'utf8' });
        if (r.status === 0) return c;
    }
    throw new Error('ffmpeg not found (set FFMPEG_PATH, put ffmpeg on PATH, or pip install imageio-ffmpeg).');
};
const runFfmpeg = (ff, argv) => {
    const r = spawnSync(ff, ['-y', '-hide_banner', '-loglevel', 'error', ...argv], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg failed: ${argv.join(' ')}\n${r.stderr}`);
};

// ---------------------------------------------------------------- browser / vite
const launchBrowser = async () => {
    const launchArgs = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args: launchArgs });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args: launchArgs }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({
    server: { port: 3197, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
let browser = null;

try {
    // Skill lookup runs in Node through Vite SSR (no browser needed).
    const skillMod = await server.ssrLoadModule('/skillDatabase.ts');
    const skillDB = skillMod.DEFAULT_SKILL_DB;

    const TEAM_NAME_BY_ID = { 0: 'BLUE', 1: 'RED' };
    if (isList) {
        for (const s of skillDB) {
            console.log(`${String(s.id).padEnd(10)} ${String(s.tag).padEnd(7)} ${String(TEAM_NAME_BY_ID[s.team] ?? '-').padEnd(5)} ${String(s.role).padEnd(9)} ${s.type.padEnd(6)} range=${s.range} aoe=${s.aoeRadius ?? '-'} ${s.name}`);
        }
        console.log(`\n${skillDB.length} skills`);
        process.exit(0);
    }

    const skill = skillDB.find((s) => s.id === skillQuery) ?? skillDB.find((s) => s.name === skillQuery);
    if (!skill) {
        console.error(`Unknown skill "${skillQuery}". Use --list.`);
        process.exit(2);
    }
    const teamArg = typeof args.team === 'string' ? args.team.toUpperCase() : null;
    const TEAM_NAME = { 0: 'BLUE', 1: 'RED' };
    const casterTeam = teamArg ?? TEAM_NAME[skill.team] ?? 'BLUE';
    if (casterTeam !== 'BLUE' && casterTeam !== 'RED') throw new Error(`--team must be BLUE or RED (got ${casterTeam})`);

    const ff = findFfmpeg();
    const label = `${skill.id}_${casterTeam}`;
    mkdirSync(outDir, { recursive: true });
    const framesDir = join(outDir, `${label}_frames`);
    rmSync(framesDir, { recursive: true, force: true });
    mkdirSync(framesDir, { recursive: true });

    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    browser = await launchBrowser();

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.addInitScript(() => {
        let s = 1337;
        function mulberry32() {
            let t = (s += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        Math.random = mulberry32;
        let syntheticTime = 1000.0;
        window.__resetSeed = (v = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(v); /* 模擬流與 Math.random 分離，需一併重設 */ s = v; syntheticTime = 1000.0; };
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;

        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
        window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) cb(syntheticTime);
            }
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    // ---- scene setup (fully inside one evaluate; returns camera centre in world px)
    const setup = await page.evaluate(async ({ skillId, casterTeam, seed, zoom, sceneId, bodyLift, dist0 }) => {
        window.__resetSeed(seed);
        const scenes = await import('/data/scenes.ts');
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        if (!e) throw new Error('engine missing');
        const skill = e.skillDB.find((s) => s.id === skillId);
        const scene = (sceneId && scenes.SCENE_DB.find((x) => x.id === sceneId)) || scenes.SCENE_DB[0];
        e.currentScene = scene;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        cmd({ type: 'SET_TIME_SCALE', timeScale: 1 });

        const enemyTeam = casterTeam === 'BLUE' ? types.Team.RED : types.Team.BLUE;
        const myTeam = casterTeam === 'BLUE' ? types.Team.BLUE : types.Team.RED;
        const role = skill.role;

        // Offset (col,row) coordinates keep "same row, +N columns" == hex distance N for either layout.
        const dist = Math.max(1, dist0 || (Math.min(3, Math.max(1, skill.range || 0)) || 2));
        const usable = (col, row) => {
            if (col < 0 || row < 0 || col >= e.mapConfig.w || row >= e.mapConfig.h) return false;
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            return e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r);
        };
        const place = (team, col, row, rl) => {
            if (!usable(col, row)) return null;
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            const before = e.agents.length;
            cmd({ type: 'PLACE_AGENT', team, q: h.q, r: h.r, hp: 20000, role: rl });
            return e.agents.length > before ? e.agents[e.agents.length - 1] : null;
        };
        // The generated map can have holes: pick the usable (caster, target) pair closest to the map centre,
        // preferring spots whose neighbours (extras) are usable too.
        const midC = e.mapConfig.w / 2, midR = e.mapConfig.h / 2;
        let best = null;
        for (let row = 0; row < e.mapConfig.h; row++) {
            for (let col = 0; col + dist < e.mapConfig.w; col++) {
                if (!usable(col, row) || !usable(col + dist, row)) continue;
                const nb = [usable(col + dist, row - 1), usable(col + dist, row + 1), usable(col - 1, row + 1)].filter(Boolean).length;
                const score = Math.abs(col + dist / 2 - midC) + Math.abs(row - midR) - nb * 2;
                if (!best || score < best.score) best = { col, row, score };
            }
        }
        if (!best) throw new Error('no usable caster/target hexes on this map');
        const cc = best.col, crow = best.row;
        const caster = place(myTeam, cc, crow, role);
        const target = place(enemyTeam, cc + dist, crow, types.Role.TANK);
        // Extra bodies so AOE / chain effects have something to hit. Failures are tolerated.
        const extras = [
            place(enemyTeam, cc + dist, crow - 1, types.Role.WARRIOR),
            place(enemyTeam, cc + dist, crow + 1, types.Role.MAGE),
            place(myTeam, cc - 1, crow + 1, types.Role.TANK),
        ].filter(Boolean);
        if (!caster || !target) throw new Error(`placement failed caster=${!!caster} target=${!!target} map=${JSON.stringify(e.mapConfig)} agents=${e.agents.length}`);

        caster.skillIds = [skillId, null, null];
        e.play();
        for (const a of e.agents) { a.bt = null; a.hp = a.maxHp = 20000; a.mp = a.maxMp; }
        caster.mp = caster.maxMp;
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };
        caster.facing = target.px > caster.px ? 1 : -1;
        const ok = e.initiateCast(caster, 0);
        // initiateCast runs outside a tick, and tick() clears engine.events first, so CAST_START (which
        // starts the skill's visual sequence) would be dropped. Flush it now, as the end of a tick would.
        e.renderer.processVisualEvents(e.events.splice(0));
        const midX = (caster.px + target.px) / 2;
        // Units are drawn at (py - terrainHeight); aim at roughly body height above the tile.
        const midTerrain = (e.getTerrainHeight(caster.q, caster.r) + e.getTerrainHeight(target.q, target.r)) / 2;
        const midY = (caster.py + target.py) / 2 - midTerrain - bodyLift;
        e.renderer.camera.snapTo(midX, midY, zoom);
        return {
            cast: String(ok), agents: e.agents.length, scene: scene.id,
            midX, midY, extras: extras.length, castingIdx: caster.castingSkillIdx,
            canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(),
        };
    }, { skillId: skill.id, casterTeam, seed, zoom, sceneId, bodyLift, dist0 });

    console.log(`[setup] ${JSON.stringify(setup)}`);
    if (setup.castingIdx !== 0) throw new Error(`cast did not start (initiateCast=${setup.cast}, castingSkillIdx=${setup.castingIdx})`);
    if (!setup.canvas) throw new Error('no canvas');

    // ---- record
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
        const b64 = await page.evaluate(({ steps, crop, midX, midY, zoom }) => {
            const e = window.__TACTICAL_ENGINE__;
            for (let k = 0; k < steps; k++) {
                // Camera is pinned every step (shake is applied at draw time, so it stays visible).
                e.renderer.camera.snapTo(midX, midY, zoom);
                window.__stepFrames(1);
            }
            const c = document.querySelector('canvas');
            const out = document.createElement('canvas');
            out.width = crop; out.height = crop;
            const octx = out.getContext('2d');
            const sx = Math.round((c.width - crop) / 2);
            const sy = Math.round((c.height - crop) / 2);
            octx.drawImage(c, sx, sy, crop, crop, 0, 0, crop, crop);
            return out.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        }, { steps: stepsPerFrame, crop, midX: setup.midX, midY: setup.midY, zoom });
        writeFileSync(join(framesDir, `frame_${String(i).padStart(4, '0')}.png`), Buffer.from(b64, 'base64'));
    }
    console.log(`[record] ${frames} frames captured in ${((Date.now() - t0) / 1000).toFixed(1)}s (stepsPerFrame=${stepsPerFrame})`);
    if (pageErrors.length) console.warn(`[warn] page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
    await ctx.close();

    // ---- encode
    const pattern = join(framesDir, 'frame_%04d.png');
    const mp4 = join(outDir, `${label}.mp4`);
    const gif = join(outDir, `${label}.gif`);
    const sheet = join(outDir, `${label}_sheet.png`);
    const sheetGray = join(outDir, `${label}_sheet_gray.png`);

    runFfmpeg(ff, [
        '-framerate', String(fps), '-i', pattern,
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
        '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
    ]);
    runFfmpeg(ff, [
        '-framerate', String(fps), '-i', pattern,
        '-filter_complex', 'scale=\'min(480,iw)\':-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
        '-loop', '0', gif,
    ]);

    // contact sheet: anticipation, impact, early linger, late linger
    const fractions = [0.15, 0.35, 0.6, 0.85];
    const picks = fractions.map((f) => Math.min(frames - 1, Math.floor(f * (frames - 1))));
    const tile = Math.min(480, crop);
    const inputs = picks.flatMap((idx) => ['-i', join(framesDir, `frame_${String(idx).padStart(4, '0')}.png`)]);
    const scaled = picks.map((_, i) => `[${i}:v]scale=${tile}:${tile}:flags=lanczos[t${i}]`).join(';');
    const layout = `0_0|${tile}_0|0_${tile}|${tile}_${tile}`;
    runFfmpeg(ff, [
        ...inputs,
        '-filter_complex', `${scaled};[t0][t1][t2][t3]xstack=inputs=4:layout=${layout}[v]`,
        '-map', '[v]', '-frames:v', '1', sheet,
    ]);
    runFfmpeg(ff, ['-i', sheet, '-vf', 'format=gray', '-frames:v', '1', sheetGray]);

    if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });

    console.log(`[done] skill=${skill.id} (${skill.name}) team=${casterTeam} frames=${frames}@${fps}fps seed=${seed} sheetFrames=${picks.join(',')}`);
    console.log(`  mp4        : ${mp4}`);
    console.log(`  gif        : ${gif}`);
    console.log(`  sheet      : ${sheet}`);
    console.log(`  sheet gray : ${sheetGray}`);
    if (keepFrames) console.log(`  frames     : ${framesDir} (${existsSync(framesDir) ? readdirSync(framesDir).length : 0} files)`);
} finally {
    if (browser) await browser.close();
    await server.close();
}
