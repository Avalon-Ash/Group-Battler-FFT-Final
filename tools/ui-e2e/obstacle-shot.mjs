/**
 * obstacle-shot.mjs — 各群系障礙物外觀對照（VISUAL_ROADMAP O2／O4）
 *
 * 每個場景重建地圖、放幾個單位在障礙物旁邊，固定時鐘截全畫面，並以第一個障礙物為中心裁一張放大圖。
 *   node tools/ui-e2e/obstacle-shot.mjs [--scenes=VOID,FOREST,ICE,MAGMA,DESERT] [--zoom=2] [--out=tools/ui-e2e/out/obstacles]
 *   --procedural：不載入預渲染圖集（攔下 manifest），看舊的程序化外觀做對照
 *   --frames=N：截圖前步進幾幀（預設 90；看天氣用 600）
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const SCENES = arg('scenes', 'VOID,FOREST,ICE,MAGMA,DESERT').split(',');
const ZOOM = Number(arg('zoom', '2'));
const OUT = path.resolve(root, arg('out', 'tools/ui-e2e/out/obstacles'));
const PROCEDURAL = process.argv.includes('--procedural');
/** 截圖前步進的幀數（天氣等需要時間累積的效果用大一點） */
const FRAMES = Number(arg('frames', '90'));
const START_TEXT = 'START SIMULATION';
const CROP = { w: 520, h: 360 };
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ root, server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge/Chrome found.');
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (PROCEDURAL) await page.route('**/assets/obstacles/manifest.json', (r) => r.fulfill({ status: 404, body: '' }));
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
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(300);
    for (const scene of SCENES) {
        const info = await page.evaluate(async ({ scene, zoom }) => {
            const { HexUtils } = await import('/engine/utils.ts');
            const { SCENE_DB } = await import('/data/scenes.ts');
            const types = await import('/types.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            cmd({ type: 'STOP_GAME' });
            e.currentScene = SCENE_DB.find((x) => x.id === scene);
            e.map.rebuildMap(e);
            cmd({ type: 'CLEAR_BOARD', keepScene: true });
            cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
            cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
            // 最靠地圖中央的障礙物；它四周放單位（前後都有，看排序）
            const keys = Array.from(e.map.obstacles.keys()).map((k) => k.split(',').map(Number));
            const mid = HexUtils.toPx(...Object.values(HexUtils.offsetToAxial(Math.floor(e.mapConfig.w / 2), Math.floor(e.mapConfig.h / 2), e.mapConfig)), e.mapConfig);
            keys.sort((a, b) => { const pa = HexUtils.toPx(a[0], a[1], e.mapConfig), pb = HexUtils.toPx(b[0], b[1], e.mapConfig); return Math.hypot(pa.x - mid.x, pa.y - mid.y) - Math.hypot(pb.x - mid.x, pb.y - mid.y); });
            const [oq, or] = keys[0] ?? [0, 0];
            let placed = 0;
            for (const [dq, dr] of [[0, -1], [0, 1], [1, 0], [-1, 1]]) {
                const q = oq + dq, r = or + dr;
                if (!e.isValid(q, r) || e.hasObstacle(q, r) || e.getAgentAt(q, r)) continue;
                cmd({ type: 'PLACE_AGENT', team: placed % 2 ? types.Team.RED : types.Team.BLUE, q, r, hp: 99999, role: placed % 2 ? types.Role.MAGE : types.Role.TANK });
                placed++;
            }
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = 0; }
            const p = HexUtils.toPx(oq, or, e.mapConfig);
            return { obstacles: keys.length, q: oq, r: or, x: p.x, y: p.y, placed };
        }, { scene, zoom: ZOOM });
        await page.evaluate((n) => window.__stepFrames(n), FRAMES);
        const weather = await page.evaluate(() => window.__TACTICAL_ENGINE__.renderer.vfx.state.particles.filter((p) => p.weather).length);
        await page.screenshot({ path: path.join(OUT, `${scene}${PROCEDURAL ? '_proc' : ''}_full.png`) });
        // 放大圖：鏡頭對準那個障礙物
        await page.evaluate(({ x, y, zoom }) => {
            const e = window.__TACTICAL_ENGINE__;
            const cam = e.renderer.camera;
            cam.x = cam.targetX = x; cam.y = cam.targetY = y - 30;
            cam.zoom = cam.targetZoom = zoom; cam.manualOverrideTimer = 99;
        }, { ...info, zoom: ZOOM });
        await page.evaluate(() => window.__stepFrames(30));
        await page.screenshot({ path: path.join(OUT, `${scene}${PROCEDURAL ? '_proc' : ''}_zoom.png`), clip: { x: 640 - CROP.w / 2, y: 360 - CROP.h / 2, width: CROP.w, height: CROP.h } });
        console.log(scene, JSON.stringify({ ...info, weather }));
    }
    if (errors.length) console.log('PAGE ERRORS', errors.slice(0, 5));
} finally {
    if (browser) await browser.close();
    await server.close();
}
