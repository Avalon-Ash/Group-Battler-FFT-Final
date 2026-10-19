/**
 * hex-align-shot — 六角版面（FLAT／POINTY）對齊的確定性截圖（docs/archive/HEX_ALIGN_AUDIT.md）。
 * 每個版面截：覆蓋層（滑鼠懸停、技能射程、縮圈預警、危險區、護盾）、AOE 預警、詠唱中斷（施法者環＋AOE 斷裂環）、
 * 四種法陣圖騰（太陽、獅盾、顱骨、倒三角）、地面材質場（冰／毒／火／重力）、每格一個 r=48 的 AOE 斷裂環。
 * 輸出 tools/ui-e2e/out/hex-align/<layout>_<shot>.png（已 gitignore）。
 *
 *   node tools/ui-e2e/hex-align-shot.mjs [--layouts=FLAT,POINTY] [--scene=<sceneId>] [--zoom=1.6]
 *
 * 測試用 hook（seeded Math.random、合成時間、手動 rAF、renderer.draw 包裝注入懸停狀態）只在本腳本注入，不在 app 內。
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const outDir = join(root, 'tools', 'ui-e2e', 'out', 'hex-align');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const layouts = arg('layouts', 'FLAT,POINTY').split(',').map((s) => s.trim().toUpperCase());
const sceneArg = arg('scene', '');
const zoom = Number(arg('zoom', '1.6'));
const tag = arg('tag', '');
const START_TEXT = 'START SIMULATION';
const CLIP = { x: 180, y: 90, width: 600, height: 420 };
const SIGILS = ['FX_ULT_BLUE_TITAN_SMASH', 'FX_ULT_BLUE_KINGS_BLESSING', 'FX_ULT_RED_PLAGUE', 'FX_ULT_RED_GUILLOTINE_IMPACT'];
const FIELDS = ['FX_HAZARD_FIELD_ICE', 'FX_HAZARD_FIELD_POISON', 'FX_HAZARD_FIELD_FIRE', 'FX_HAZARD_FIELD_GRAVITY'];

const server = await createServer({ root, server: { port: 3197, strictPort: false, host: '127.0.0.1' }, cacheDir: join(tmpdir(), 'vite-hex-align'), logLevel: 'error' });
let browser = null;
const saved = [];
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge/Chrome found.');

    for (const layout of layouts) {
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

        const shot = async (name) => {
            const file = join(outDir, `${layout}_${name}${tag ? `_${tag}` : ''}.png`);
            mkdirSync(outDir, { recursive: true });
            writeFileSync(file, await page.screenshot({ clip: CLIP }));
            saved.push(file);
        };

        const setup = await page.evaluate(async ({ layout, sceneArg, zoom }) => {
            const types = await import('/types.ts');
            const { HexUtils } = await import('/engine/utils.ts');
            const scenes = await import('/data/scenes.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            const sceneId = sceneArg || e.currentScene?.id || scenes.SCENE_DB[0].id;
            cmd({ type: 'STOP_GAME' });
            cmd({ type: 'RANDOMIZE_MAP', layout, w: 11, h: 9, sceneId, randomizeScene: false });
            cmd({ type: 'CLEAR_BOARD', keepScene: true });
            cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
            cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });

            const usable = (h) => e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r);
            const midC = Math.floor(e.mapConfig.w / 2), midR = Math.floor(e.mapConfig.h / 2);
            let spot = null;
            for (let d = 0; d < 6 && !spot; d++) {
                for (const [c, r] of [[midC + d, midR], [midC - d, midR], [midC, midR + d], [midC, midR - d]]) {
                    const h = HexUtils.offsetToAxial(c, r, e.mapConfig);
                    if (usable(h)) { spot = h; break; }
                }
            }
            const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
            const nbs = DIRS.map(([dq, dr]) => ({ q: spot.q + dq, r: spot.r + dr }));
            // 螢幕上最靠前（y 最大）的兩個鄰格：檢查「後格覆蓋層蓋到前格單位」的深度交互
            const px = (h) => HexUtils.toPx(h.q, h.r, e.mapConfig);
            const front = nbs.filter(usable).sort((a, b) => px(b).y - px(a).y);
            const skill = e.skillDB.find((s) => s.id === 'wb_a3');
            const place = (team, h, role) => {
                const before = e.agents.length;
                cmd({ type: 'PLACE_AGENT', team, q: h.q, r: h.r, hp: 20000, role });
                return e.agents.length > before ? e.agents[e.agents.length - 1] : null;
            };
            const caster = place(types.Team.BLUE, spot, skill.role);
            const bystanders = front.slice(0, 2).map((h) => place(types.Team.BLUE, h, types.Role.TANK)).filter(Boolean);
            if (bystanders[0]) { bystanders[0].shield = 600; bystanders[0].maxShield = 1000; }
            for (let c = 0; c < e.mapConfig.w; c++) {
                const h = HexUtils.offsetToAxial(c, 0, e.mapConfig);
                if (usable(h) && HexUtils.dist(h, spot) > 4) { place(types.Team.RED, h, types.Role.TANK); break; }
            }
            // 危險區（HazardPainter）：施法者後方兩格
            const back = nbs.filter(usable).sort((a, b) => px(a).y - px(b).y);
            const mkHazard = (type, cell, i) => e.hazardSystem.registerHazard({
                id: `hexalign_${type}_${i}`, type, cells: [cell], duration: 60, sourceId: caster.id, team: types.Team.RED,
                color: '#ffffff', power: 0, tickInterval: 999, lastTickTime: 0, centerQ: cell.q, centerR: cell.r,
            }, e);
            if (back[0]) mkHazard('FIRE', back[0], 0);
            if (back[1]) mkHazard('POISON', back[1], 1);
            // 縮圈預警：前方第二排（鄰格的鄰格）
            const warn = front.slice(0, 2).map((h) => ({ q: h.q + (front[0].q - spot.q), r: h.r + (front[0].r - spot.r) })).filter(usable);
            for (const h of warn) e.map.warningTiles.add(`${h.q},${h.r}`);

            caster.skillIds = [skill.id, null, null];
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
            const camY = caster.py - e.getTerrainHeight(spot.q, spot.r);
            e.renderer.camera.snapTo(caster.px, camY, zoom);

            // 懸停／射程：包裝 renderer.draw，注入 hoveredHex、hoveredSkill 與選取單位（只在本腳本）
            const orig = e.renderer.draw.bind(e.renderer);
            e.renderer.draw = (ctx, eng, cam, hl, fps, hh, hs, bt, rt) =>
                orig(ctx, eng, cam, window.__hl ?? hl, fps, window.__hover ?? hh, window.__skill ?? hs, bt, rt);
            window.__caster = caster;
            window.__spot = spot;
            window.__camY = camY;
            window.__zoom = zoom;
            return { layout: e.mapConfig.layout, sceneId, spot, front: front.slice(0, 2), bystanders: bystanders.length, warn: warn.length, hazards: e.state.spatialHazards.length };
        }, { layout, sceneArg, zoom });
        console.log('setup', JSON.stringify(setup));

        const hold = () => page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__, c = window.__caster;
            e.renderer.camera.snapTo(c.px, window.__camY, window.__zoom);
            window.__stepFrames(1);
        });

        // 1. 覆蓋層：懸停施法者前方鄰格＋射程（wb_u3 range 3）＋預警＋危險區＋護盾
        await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            window.__hl = window.__caster;
            window.__skill = e.skillDB.find((s) => s.id === 'wb_u3');
            window.__hover = window.__spot;
            window.__stepFrames(6);
        });
        await hold();
        await shot('overlays');
        await page.evaluate(() => { window.__hl = undefined; window.__skill = undefined; window.__hover = undefined; });

        // 2. AOE 預警（詠唱中）→ 3. 詠唱中斷
        const cast = await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__, c = window.__caster;
            c.targetHex = { q: window.__spot.q, r: window.__spot.r };
            const ok = e.initiateCast(c, 0);
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(12);
            return { ok, telegraph: c.currentTelegraph?.length ?? 0 };
        });
        console.log('cast', JSON.stringify(cast));
        await hold();
        await shot('telegraph');
        await page.evaluate(() => { window.__caster.stunTimer = 1; window.__stepFrames(3); });
        await hold();
        await shot('castbreak_a');
        await page.evaluate(() => window.__stepFrames(7));
        await hold();
        await shot('castbreak_b');
        await page.evaluate(() => { window.__caster.stunTimer = 0; window.__stepFrames(60); });

        // 4. 法陣圖騰（施法者格中心）
        for (const id of SIGILS) {
            await page.evaluate((id) => {
                const e = window.__TACTICAL_ENGINE__, c = window.__caster;
                const z = e.getTerrainHeight(window.__spot.q, window.__spot.r);
                e.renderer.vfx.playEffect(id, c.px, c.py, z, undefined, z);
                window.__stepFrames(8);
            }, id);
            await hold();
            await shot(`sigil_${id.replace('FX_ULT_', '').toLowerCase()}`);
            await page.evaluate(() => window.__stepFrames(150));
        }

        // 5. 地面材質場＋每格 r=48 斷裂環（應貼齊格線）
        await page.evaluate(({ FIELDS }) => {
            const e = window.__TACTICAL_ENGINE__;
            const s = window.__spot;
            const DIRS = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
            window.__cells = DIRS.map(([dq, dr]) => ({ q: s.q + dq, r: s.r + dr })).filter((h) => e.isValid(h.q, h.r));
            window.__fields = FIELDS;
        }, { FIELDS });
        await page.evaluate(async () => {
            const { HexUtils } = await import('/engine/utils.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cells = window.__cells;
            cells.slice(1, 1 + window.__fields.length).forEach((h, i) => {
                const p = HexUtils.toPx(h.q, h.r, e.mapConfig);
                const z = e.getTerrainHeight(h.q, h.r);
                e.renderer.vfx.playEffect(window.__fields[i], p.x, p.y, z, undefined, z);
            });
            window.__stepFrames(20);
        });
        await hold();
        await shot('fields');
        await page.evaluate(() => window.__stepFrames(300));
        await page.evaluate(async () => {
            const { HexUtils } = await import('/engine/utils.ts');
            const e = window.__TACTICAL_ENGINE__;
            for (const h of window.__cells) {
                const p = HexUtils.toPx(h.q, h.r, e.mapConfig);
                const z = e.getTerrainHeight(h.q, h.r);
                e.renderer.vfx.playEffect('FX_AOE_BREAK_BLUE_0', p.x, p.y, z, undefined, z, undefined, `${h.q},${h.r}`);
            }
            window.__stepFrames(3);
        });
        await hold();
        await shot('tile_rings');

        if (errors.length) console.log(`[${layout}] pageErrors=${errors.join(' | ')}`);
        await page.context().close();
    }
    console.log(`saved ${saved.length} shots:\n${saved.map((f) => '  ' + f).join('\n')}`);
} finally {
    await browser?.close();
    await server.close();
}
