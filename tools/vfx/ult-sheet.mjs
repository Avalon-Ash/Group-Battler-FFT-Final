// ╔══════════════════════════════════════════════════════════╗
// ║  tools/vfx/ult-sheet.mjs — 奧義 50 招總表與白飽和量測 (UA2)║
// ║  職責：在 FOREST 上擷取 50 招的 5 格時間序（藍/紅各一張表）║
// ║        在 ICE 與 DESERT 量測 hitAt+0.05 白飽和像素比例       ║
// ╚══════════════════════════════════════════════════════════╝

import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const outDir = resolve(root, arg('out', 'tools/ui-e2e/out/ult/before'));

const START_TEXT = 'START SIMULATION';
const CELL_W = 240;
const CELL_H = 180;
const LABEL_W = 220;
const HEADER_H = 40;

const BLUE_ULTS = [
    'tb_u1', 'tb_u2', 'tb_u3', 'tb_u4', 'tb_u5',
    'wb_u1', 'wb_u2', 'wb_u3', 'wb_u4', 'wb_u5',
    'rb_u1', 'rb_u2', 'rb_u3', 'rb_u4', 'rb_u5',
    'mb_u1', 'mb_u2', 'mb_u3', 'mb_u4', 'mb_u5',
    'sb_u1', 'sb_u2', 'sb_u3', 'sb_u4', 'sb_u5',
];

const RED_ULTS = [
    'tr_u1', 'tr_u2', 'tr_u3', 'tr_u4', 'tr_u5',
    'wr_u1', 'wr_u2', 'wr_u3', 'wr_u4', 'wr_u5',
    'rr_u1', 'rr_u2', 'rr_u3', 'rr_u4', 'rr_u5',
    'mr_u1', 'mr_u2', 'mr_u3', 'mr_u4', 'mr_u5',
    'sr_u1', 'sr_u2', 'sr_u3', 'sr_u4', 'sr_u5',
];

const server = await createServer({
    root,
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});

let browser = null;
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];

    for (const channel of ['msedge', 'chrome']) {
        try {
            browser = await chromium.launch({
                channel,
                headless: true,
                args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
            });
            break;
        } catch {
            // next
        }
    }
    if (!browser) throw new Error('No Edge or Chrome found for Playwright.');

    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // Deterministic harness
    await page.addInitScript(() => {
        let s = 1337;
        Math.random = () => {
            let t = (s += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        let now = 1000;
        performance.now = () => now;
        Date.now = () => Math.floor(now);
        let id = 0;
        const cbs = new Map();
        window.requestAnimationFrame = (cb) => {
            cbs.set(++id, cb);
            return id;
        };
        window.cancelAnimationFrame = (i) => {
            cbs.delete(i);
        };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                now += 1000 / 60;
                const list = Array.from(cbs.values());
                cbs.clear();
                for (const cb of list) cb(now);
            }
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(300);

    // Initialize environment in browser
    await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    });

    mkdirSync(outDir, { recursive: true });

    // Helper to capture a sheet for a faction
    async function captureFactionSheet(factionName, ultIds) {
        console.log(`[ult-sheet] Capturing ${factionName} sheet (${ultIds.length} ultimates) on FOREST...`);

        // Set scene to FOREST
        await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const { SCENE_DB } = await import('/data/scenes.ts');
            const sc = SCENE_DB.find((x) => x.id === 'FOREST');
            e.currentScene = sc;
            e.map.rebuildMap(e);
        });

        const sheetDataUrl = await page.evaluate(
            async ({ ultIds, factionName, cellW, cellH, labelW, headerH }) => {
                const e = window.__TACTICAL_ENGINE__;
                const types = await import('/types.ts');
                const { HexUtils } = await import('/engine/utils.ts');
                const { SKILL_SEQUENCES } = await import('/data/vfx/SkillSequences.ts');

                const cmd = (c) => e.bus.emit('UI_COMMAND', c);

                const sheetCanvas = document.createElement('canvas');
                sheetCanvas.width = labelW + cellW * 5;
                sheetCanvas.height = headerH + cellH * ultIds.length;
                const ctx = sheetCanvas.getContext('2d');

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

                // Draw Header
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 13px monospace';
                ctx.fillText(`${factionName} ULTIMATES (FOREST)`, 16, 25);

                const colTitles = ['hitAt - 0.20s', 'hitAt (Impact)', 'hitAt + 0.15s', 'hitAt + 0.40s', 'hitAt + 0.80s'];
                for (let c = 0; c < 5; c++) {
                    ctx.fillText(colTitles[c], labelW + c * cellW + 16, 25);
                }

                // Grid lines for header
                ctx.strokeStyle = '#334155';
                ctx.strokeRect(0, 0, sheetCanvas.width, headerH);

                const centerH = { q: 0, r: 0 };
                const t1H = { q: 1, r: 0 };
                const t2H = { q: 0, r: 1 };
                const t3H = { q: 1, r: -1 };

                const targetCenterPx = HexUtils.toPx(0, 0, e.mapConfig);
                const gz = e.getTerrainHeight(0, 0);

                const gameCanvas = document.querySelector('canvas');
                const gW = gameCanvas.width;
                const gH = gameCanvas.height;
                const cropX = Math.round(gW / 2 - cellW / 2);
                const cropY = Math.round(gH / 2 - cellH * 0.65);

                for (let rowIdx = 0; rowIdx < ultIds.length; rowIdx++) {
                    const ultId = ultIds[rowIdx];
                    const skill = e.skillDB.find((s) => s.id === ultId);
                    const sequence = SKILL_SEQUENCES[ultId];
                    const hitAt = sequence.hitAt;
                    const cast = skill.cast;
                    const isRed = skill.team === 1;

                    // Clean board
                    cmd({ type: 'CLEAR_BOARD', keepScene: true });

                    // Spawn 1 Caster and 3 Targets
                    const casterTeam = isRed ? types.Team.RED : types.Team.BLUE;
                    const targetTeam = isRed ? types.Team.BLUE : types.Team.RED;

                    cmd({ type: 'PLACE_AGENT', team: casterTeam, q: centerH.q, r: centerH.r, hp: 99999, role: types.Role.MAGE });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t1H.q, r: t1H.r, hp: 99999, role: types.Role.TANK });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t2H.q, r: t2H.r, hp: 99999, role: types.Role.WARRIOR });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t3H.q, r: t3H.r, hp: 99999, role: types.Role.RANGER });

                    e.play();
                    for (const a of e.agents) {
                        a.bt = null;
                        a.mp = 0;
                        a.spawnTimer = 0;
                    }

                    const caster = e.agents.find((a) => a.team === casterTeam);
                    const target1 = e.agents.find((a) => a.team === targetTeam && a.q === t1H.q && a.r === t1H.r);

                    caster.skillIds = [ultId, null, null];
                    caster.skills = [skill, null, null];
                    caster.mp = caster.maxMp;
                    caster.target = target1;
                    caster.targetHex = { q: target1.q, r: target1.r };

                    e.renderer.vfx.reset();
                    e.renderer.camera.snapTo(targetCenterPx.x, targetCenterPx.y - gz, 1.4);
                    window.__stepFrames(2);

                    // Initiate Cast
                    e.initiateCast(caster, 0);
                    e.renderer.processVisualEvents(e.events.splice(0));
                    e.renderer.hud.reset();

                    // Sequence timing
                    const castDelay = Math.max(0, cast - hitAt);
                    const sampleOffsets = [-0.2, 0.0, 0.15, 0.4, 0.8];
                    let currentTau = -castDelay; // battleTime delta relative to sequence start

                    const y = headerH + rowIdx * cellH;

                    // Draw row label
                    ctx.fillStyle = isRed ? '#fca5a5' : '#93c5fd';
                    ctx.font = 'bold 12px monospace';
                    ctx.fillText(`${ultId} ${skill.name}`, 10, y + 30);
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '11px monospace';
                    ctx.fillText(`cast:${cast.toFixed(2)}s hitAt:${hitAt.toFixed(2)}s`, 10, y + 50);
                    ctx.fillText(`type:${skill.type} r:${skill.aoeRadius ?? skill.range}`, 10, y + 70);

                    for (let colIdx = 0; colIdx < 5; colIdx++) {
                        const targetTau = hitAt + sampleOffsets[colIdx];
                        const deltaTau = targetTau - currentTau;
                        const framesToStep = Math.max(1, Math.round(deltaTau * 60));
                        window.__stepFrames(framesToStep);
                        currentTau = targetTau;

                        // Camera lock
                        e.renderer.camera.snapTo(targetCenterPx.x, targetCenterPx.y - gz, 1.4);
                        window.__stepFrames(1);

                        // Capture crop to sheet
                        const x = labelW + colIdx * cellW;
                        ctx.drawImage(gameCanvas, cropX, cropY, cellW, cellH, x, y, cellW, cellH);

                        // Border for frame cell
                        ctx.strokeStyle = '#1e293b';
                        ctx.strokeRect(x, y, cellW, cellH);
                    }

                    // Border for label cell
                    ctx.strokeStyle = '#334155';
                    ctx.strokeRect(0, y, labelW, cellH);
                }

                return sheetCanvas.toDataURL('image/png');
            },
            { ultIds, factionName, cellW: CELL_W, cellH: CELL_H, labelW: LABEL_W, headerH: HEADER_H },
        );

        return Buffer.from(sheetDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    }

    // Helper to measure white saturation on a scene at hitAt + 0.05
    async function measureSceneSaturation(sceneId, allUltIds) {
        console.log(`[ult-sheet] Measuring white saturation on scene ${sceneId}...`);

        // Set scene
        await page.evaluate(async (sceneId) => {
            const e = window.__TACTICAL_ENGINE__;
            const { SCENE_DB } = await import('/data/scenes.ts');
            const sc = SCENE_DB.find((x) => x.id === sceneId);
            e.currentScene = sc;
            e.map.rebuildMap(e);
        }, sceneId);

        return await page.evaluate(
            async ({ allUltIds, cellW, cellH }) => {
                const e = window.__TACTICAL_ENGINE__;
                const types = await import('/types.ts');
                const { HexUtils } = await import('/engine/utils.ts');
                const { SKILL_SEQUENCES } = await import('/data/vfx/SkillSequences.ts');
                const cmd = (c) => e.bus.emit('UI_COMMAND', c);

                const centerH = { q: 0, r: 0 };
                const t1H = { q: 1, r: 0 };
                const t2H = { q: 0, r: 1 };
                const t3H = { q: 1, r: -1 };
                const targetCenterPx = HexUtils.toPx(0, 0, e.mapConfig);
                const gz = e.getTerrainHeight(0, 0);

                const gameCanvas = document.querySelector('canvas');
                const gW = gameCanvas.width;
                const gH = gameCanvas.height;
                const cropX = Math.round(gW / 2 - cellW / 2);
                const cropY = Math.round(gH / 2 - cellH * 0.65);

                const measureCanvas = document.createElement('canvas');
                measureCanvas.width = cellW;
                measureCanvas.height = cellH;
                const mCtx = measureCanvas.getContext('2d', { willReadFrequently: true });

                const results = {};

                for (const ultId of allUltIds) {
                    const skill = e.skillDB.find((s) => s.id === ultId);
                    const sequence = SKILL_SEQUENCES[ultId];
                    const hitAt = sequence.hitAt;
                    const cast = skill.cast;
                    const isRed = skill.team === 1;

                    cmd({ type: 'CLEAR_BOARD', keepScene: true });

                    const casterTeam = isRed ? types.Team.RED : types.Team.BLUE;
                    const targetTeam = isRed ? types.Team.BLUE : types.Team.RED;

                    cmd({ type: 'PLACE_AGENT', team: casterTeam, q: centerH.q, r: centerH.r, hp: 99999, role: types.Role.MAGE });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t1H.q, r: t1H.r, hp: 99999, role: types.Role.TANK });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t2H.q, r: t2H.r, hp: 99999, role: types.Role.WARRIOR });
                    cmd({ type: 'PLACE_AGENT', team: targetTeam, q: t3H.q, r: t3H.r, hp: 99999, role: types.Role.RANGER });

                    e.play();
                    for (const a of e.agents) {
                        a.bt = null;
                        a.mp = 0;
                        a.spawnTimer = 0;
                    }

                    const caster = e.agents.find((a) => a.team === casterTeam);
                    const target1 = e.agents.find((a) => a.team === targetTeam && a.q === t1H.q && a.r === t1H.r);

                    caster.skillIds = [ultId, null, null];
                    caster.skills = [skill, null, null];
                    caster.mp = caster.maxMp;
                    caster.target = target1;
                    caster.targetHex = { q: target1.q, r: target1.r };

                    e.renderer.vfx.reset();
                    e.renderer.camera.snapTo(targetCenterPx.x, targetCenterPx.y - gz, 1.4);
                    window.__stepFrames(2);

                    e.initiateCast(caster, 0);
                    e.renderer.processVisualEvents(e.events.splice(0));
                    e.renderer.hud.reset();

                    const castDelay = Math.max(0, cast - hitAt);
                    const targetTime = castDelay + hitAt + 0.05;
                    const framesToStep = Math.max(1, Math.round(targetTime * 60));
                    window.__stepFrames(framesToStep);

                    e.renderer.camera.snapTo(targetCenterPx.x, targetCenterPx.y - gz, 1.4);
                    window.__stepFrames(1);

                    mCtx.clearRect(0, 0, cellW, cellH);
                    mCtx.drawImage(gameCanvas, cropX, cropY, cellW, cellH, 0, 0, cellW, cellH);
                    const imgData = mCtx.getImageData(0, 0, cellW, cellH);
                    const data = imgData.data;

                    let satPixels = 0;
                    const totalPixels = cellW * cellH;
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i] >= 245 && data[i + 1] >= 245 && data[i + 2] >= 245) {
                            satPixels++;
                        }
                    }
                    results[ultId] = Number((satPixels / totalPixels).toFixed(4));
                }

                return results;
            },
            { allUltIds, cellW: CELL_W, cellH: CELL_H },
        );
    }

    // 1. Capture Blue Sheet (FOREST)
    const blueBuf = await captureFactionSheet('BLUE (IMPERIAL)', BLUE_ULTS);
    writeFileSync(join(outDir, 'blue.png'), blueBuf);
    console.log(`[ult-sheet] Saved ${join(outDir, 'blue.png')}`);

    // 2. Capture Red Sheet (FOREST)
    const redBuf = await captureFactionSheet('RED (COVENANT)', RED_ULTS);
    writeFileSync(join(outDir, 'red.png'), redBuf);
    console.log(`[ult-sheet] Saved ${join(outDir, 'red.png')}`);

    // 3. Measure ICE & DESERT White Saturation
    const all50 = [...BLUE_ULTS, ...RED_ULTS];
    const iceStats = await measureSceneSaturation('ICE', all50);
    const desertStats = await measureSceneSaturation('DESERT', all50);

    const sheetJson = {};
    for (const id of all50) {
        sheetJson[id] = {
            iceSatRatio: iceStats[id],
            desertSatRatio: desertStats[id],
            maxSatRatio: Math.max(iceStats[id], desertStats[id]),
        };
    }

    writeFileSync(join(outDir, 'ult-sheet.json'), JSON.stringify(sheetJson, null, 2), 'utf8');
    console.log(`[ult-sheet] Saved ${join(outDir, 'ult-sheet.json')}`);

    if (pageErrors.length > 0) {
        console.warn(`[ult-sheet] Page errors encountered:`, pageErrors.slice(0, 5));
    }
} finally {
    if (browser) await browser.close();
    await server.close();
}
