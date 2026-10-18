/**
 * cast-ring-shot — 詠唱環／奧義聖域／AOE 預警的確定性截圖（RenderSpec §9：懸空平面與頂面鋪設）。
 * 施法者開始詠唱，詠唱到六成時截一張：環在前方較低的地塊上不得被蓋掉，比環高的前景地塊要擋住它。
 *
 *   node tools/vfx/cast-ring-shot.mjs [--skill=wb_a3] [--team=BLUE|RED]   -> tools/ui-e2e/out/vfx/cast_ring_<skill>_<team>.png
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const outDir = join(root, 'tools', 'ui-e2e', 'out', 'vfx');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const skillId = arg('skill', 'wb_a3');
const team = arg('team', 'BLUE').toUpperCase();
const START_TEXT = '啟動戰術模擬';
const SHOT_FRAMES = [0, 3, 6, 10, 15, 22];

const server = await createServer({ root, server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge/Chrome found.');
    const page = await (await browser.newContext({ viewport: { width: 960, height: 600 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
        let s = 1337;
        Math.random = () => { let t = (s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        let now = 1000;
        performance.now = () => now;
        Date.now = () => Math.floor(now);
        let id = 0;
        const cbs = new Map();
        window.requestAnimationFrame = (cb) => { cbs.set(++id, cb); return id; };
        window.cancelAnimationFrame = (i) => { cbs.delete(i); };
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
    await page.evaluate(() => window.__stepFrames(10));

    const info = await page.evaluate(async ({ skillId, team }) => {
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const skill = e.skillDB.find((s) => s.id === skillId);
        const myTeam = team === 'RED' ? types.Team.RED : types.Team.BLUE;
        const midC = Math.floor(e.mapConfig.w / 2), midR = Math.floor(e.mapConfig.h / 2);
        let spot = null;
        for (let d = 0; d < 6 && !spot; d++) {
            for (const [c, r] of [[midC + d, midR], [midC - d, midR], [midC, midR + d], [midC, midR - d]]) {
                const h = HexUtils.offsetToAxial(c, r, e.mapConfig);
                if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r)) { spot = h; break; }
            }
        }
        cmd({ type: 'PLACE_AGENT', team: myTeam, q: spot.q, r: spot.r, hp: 20000, role: skill.role });
        const caster = e.agents[e.agents.length - 1];
        // 遠處放一個敵人，避免場上只剩一隊而立即結束戰鬥
        const foeTeam = myTeam === types.Team.RED ? types.Team.BLUE : types.Team.RED;
        for (let c = 0; c < e.mapConfig.w; c++) {
            const h = HexUtils.offsetToAxial(c, 0, e.mapConfig);
            if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r) && HexUtils.dist(h, spot) > 4) {
                cmd({ type: 'PLACE_AGENT', team: foeTeam, q: h.q, r: h.r, hp: 20000, role: types.Role.TANK });
                break;
            }
        }
        caster.skillIds = [skillId, null, null];
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.targetHex = { q: spot.q, r: spot.r };
        const ok = e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        e.renderer.camera.snapTo(caster.px, caster.py - e.getTerrainHeight(spot.q, spot.r), 1.6);
        window.__caster = caster;
        return { ok, telegraph: caster.currentTelegraph?.length ?? 0, cast: skill.cast };
    }, { skillId, team });
    console.log('setup', JSON.stringify(info));

    // 詠唱到六成時截圖（詠唱環、奧義聖域、AOE 預警都在場）
    await page.evaluate((n) => {
        window.__stepFrames(n);
        const e = window.__TACTICAL_ENGINE__, c = window.__caster;
        e.renderer.camera.snapTo(c.px, c.py - e.getTerrainHeight(c.q, c.r), 1.6);
        window.__stepFrames(1);
    }, Math.max(6, Math.round(info.cast * 60 * 0.6)));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `cast_ring_${skillId}_${team}.png`), await page.screenshot({ clip: { x: 130, y: 60, width: 700, height: 480 } }));
    console.log(`saved cast_ring_${skillId}_${team}.png`, errors.length ? `pageErrors=${errors.join(' | ')}` : '');
} finally {
    await browser?.close();
    await server.close();
}
