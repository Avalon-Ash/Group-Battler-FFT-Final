/**
 * fx-shot — 單一登記特效的確定性逐格截圖（空場、地圖中央一格）。用來比對零件化前後的同一個鍵。
 *   node tools/vfx/fx-shot.mjs --keys=FX_HEAL_BURST,FX_GRID_IMPACT_BLUE [--body=FX_HEAL_BURST] [--out=tools/ui-e2e/out/vfx/fx]
 * --body：列出的鍵在身體高度播放（命中、治療、出手類）；其餘貼地播放（格子脈衝類）。
 *   光束：--keys=BEAM:DEATH_RAY:RED,BEAM:HOLY_RAY:BLUE（樣式:陣營，固定在身體高度往右下打）。
 *   死亡碎裂：--keys=DEATH:BLUE,DEATH:RED（直接呼叫 UnitShatter.spawn）。
 *   隕石：--keys=FALL:BLUE,FALL:RED（直接跑 HEAVEN_FALL METEOR 動作，高度 FALL_H）。
 *   投射物：--keys=PROJ:PROJ_BLUE_ORB:BLUE,PROJ:ARROW:RED（外觀鍵:陣營）。地圖中央放一對藍紅單位（相距 PROJ_COLS 欄），
 *     施法者對另一方發射一發 power 0 的投射物（速度 PROJ_SPEED，可入鏡）；建議 --t=0.08,0.16,0.24,0.32,0.4。
 * 每個鍵輸出 <key>.png：一列 5 格（t = 0.03／0.1／0.2／0.32／0.48 秒）。
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const keys = arg('keys', 'FX_HEAL_BURST').split(',').filter(Boolean);
const bodyKeys = new Set(arg('body', '').split(',').filter(Boolean));
const outDir = resolve(root, arg('out', 'tools/ui-e2e/out/vfx/fx'));
const START_TEXT = '啟動戰術模擬';
const SAMPLE_T = (process.argv.find((a) => a.startsWith('--t=')) ?? '--t=0.03,0.1,0.2,0.32,0.48').slice(4).split(',').map(Number);
const BODY_LIFT = 30; // 身體高度（world px，約為受擊點）
const CROP = { w: 220, h: 200 };
/** 光束模式：終點相對起點的螢幕偏移（world px），截圖範圍改用 BEAM_CROP */
const BEAM_DX = 150, BEAM_DY = 60;
const BEAM_CROP = { w: 420, h: 240 };
/** 隕石模式（FALL:<陣營>）：落下高度（world px）與截圖範圍（直向） */
const FALL_H = 160;
const FALL_CROP = { w: 300, h: 420 };
const FALL_ZOOM = 1.0;
/** 死亡碎裂模式（DEATH:<陣營>）的截圖範圍 */
const DEATH_CROP = { w: 320, h: 260 };
/** 投射物模式（PROJ:<外觀鍵>:<陣營>）：兩單位相距的欄數、投射物速度、截圖範圍 */
const PROJ_COLS = 3;
const PROJ_SPEED = 520;
const PROJ_CROP = { w: 560, h: 420 };
const PROJ_ZOOM = 1.0;

const server = await createServer({ root, server: { port: 3197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
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
    const spot = await page.evaluate(async (projCols) => {
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        // 兩個不動的單位放在地圖角落，讓戰鬥時鐘照常前進（停止狀態下特效不會更新）
        const types = await import('/types.ts');
        const corner = (c0, dir) => { for (let c = c0; c >= 0 && c < e.mapConfig.w; c += dir) { const h = HexUtils.offsetToAxial(c, dir > 0 ? 0 : e.mapConfig.h - 1, e.mapConfig); if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r)) return h; } return null; };
        const ha = corner(0, 1), hb = corner(e.mapConfig.w - 1, -1);
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: ha.q, r: ha.r, hp: 99999, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: hb.q, r: hb.r, hp: 99999, role: types.Role.TANK });
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = 0; }
        const midC = Math.floor(e.mapConfig.w / 2), midR = Math.floor(e.mapConfig.h / 2);
        const free = (c, r) => { const h = HexUtils.offsetToAxial(c, r, e.mapConfig); return e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r) && !e.getAgentAt(h.q, h.r) ? h : null; };
        for (let d = 0; d < 6; d++) for (const [c, r] of [[midC + d, midR], [midC - d, midR], [midC, midR + d], [midC, midR - d]]) {
            const h = free(c, r);
            if (h) {
                const px = HexUtils.toPx(h.q, h.r, e.mapConfig);
                // 投射物模式用的一對單位：這格的右邊 PROJ_COLS 欄放紅方（找不到就往下一列）
                let foe = null;
                for (const dc of [projCols, -projCols, projCols + 1, -projCols - 1, projCols - 1, 1 - projCols]) for (let dr = 0; dr < 4 && !foe; dr++) foe = foe || free(c + dc, r + dr) || free(c + dc, r - dr);
                const fpx = foe ? HexUtils.toPx(foe.q, foe.r, e.mapConfig) : px;
                return { q: h.q, r: h.r, x: px.x, y: px.y, gz: e.getTerrainHeight(h.q, h.r), foe: foe && { q: foe.q, r: foe.r, x: fpx.x, y: fpx.y, gz: e.getTerrainHeight(foe.q, foe.r) } };
            }
        }
        return null;
    }, PROJ_COLS);
    if (!spot) throw new Error('no free tile');
    // 投射物模式：放好那一對單位（全部鍵共用；RED 鍵由紅方往藍方打）
    if (keys.some((k) => k.startsWith('PROJ:'))) {
        if (!spot.foe) throw new Error(`no free tile for the projectile target ${JSON.stringify(spot)}`);
        await page.evaluate(async (spot) => {
            const e = window.__TACTICAL_ENGINE__;
            const types = await import('/types.ts');
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: spot.q, r: spot.r, hp: 99999, role: types.Role.MAGE });
            window.__projBlue = e.agents[e.agents.length - 1];
            cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: spot.foe.q, r: spot.foe.r, hp: 99999, role: types.Role.MAGE });
            window.__projRed = e.agents[e.agents.length - 1];
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = 0; a.spawnTimer = 0; }
            window.__stepFrames(2);
        }, spot);
    }
    mkdirSync(outDir, { recursive: true });
    const { default: sharp } = await import('sharp').catch(() => ({ default: null }));
    for (const key of keys) {
        const frames = [];
        const isBeam = key.startsWith('BEAM:');
        const isProj = key.startsWith('PROJ:');
        // 投射物模式的鏡頭對準兩單位中點
        const cam = isProj ? { x: (spot.x + spot.foe.x) / 2, y: (spot.y + spot.foe.y) / 2, gz: (spot.gz + spot.foe.gz) / 2 } : spot;
        await page.evaluate(async ({ key, spot, cam, lift, isBeam, beamDx, beamDy, fallH, fallZoom, projSpeed, projZoom }) => {
            const e = window.__TACTICAL_ENGINE__;
            e.renderer.vfx.reset();
            e.renderer.camera.snapTo(cam.x, cam.y - cam.gz, key.startsWith('FALL:') ? fallZoom : key.startsWith('PROJ:') ? projZoom : 2.0);
            window.__stepFrames(2);
            if (key.startsWith('PROJ:')) {
                // PROJ:<外觀鍵>:<BLUE|RED>：施法者對另一方發射一發 power 0 的投射物
                const [, look, team] = key.split(':');
                const src = team === 'RED' ? window.__projRed : window.__projBlue;
                const dst = team === 'RED' ? window.__projBlue : window.__projRed;
                src.target = dst;
                const color = team === 'RED' ? '#dc2626' : '#60a5fa';
                const skill = { id: `fx-shot-${look}`, name: look, type: 'SINGLE', tag: 'ACTIVE', power: 0, cast: 0, cd: 0, range: 9, color, projectileSpeed: projSpeed, visualProjectileEffect: look };
                e.combat.spawnProjectile(src, skill, e);
            } else if (key.startsWith('DEATH:')) {
                // DEATH:<BLUE|RED>：直接呼叫死亡碎裂 UnitShatter.spawn（以假單位代入位置與陣營）
                const types = await import('/types.ts');
                const { UnitShatter } = await import('/engine/systems/visuals/effects/UnitShatter.ts');
                const team = key.split(':')[1] === 'RED' ? types.Team.RED : types.Team.BLUE;
                UnitShatter.spawn(e.renderer.vfx, { team, px: spot.x, py: spot.y, physics: { z: spot.gz } }, spot.gz, 0, 0);
            } else if (key.startsWith('FALL:')) {
                // FALL:<BLUE|RED>：直接跑一個 HEAVEN_FALL（METEOR）序列動作，高度壓低到能入鏡
                const types = await import('/types.ts');
                const { SequenceSystem } = await import('/engine/systems/visuals/SequenceSystem.ts');
                const team = key.split(':')[1] === 'RED' ? types.Team.RED : types.Team.BLUE;
                const src = e.agents.find((a) => a.team === team);
                new SequenceSystem().run({ id: 'fx-shot', actions: [{ type: 'HEAVEN_FALL', style: 'METEOR', height: fallH, scale: 1.8, color: '#fbbf24' }] }, { x: spot.x, y: spot.y, z: spot.gz }, e, e.renderer.vfx, src?.id);
            } else if (isBeam) {
                // BEAM:<樣式>:<BLUE|RED>：從格子中心（身體高度）往右下打一條 0.4 秒的光束（螢幕座標，同 SequenceSystem）
                const [, style, team] = key.split(':');
                const types = await import('/types.ts');
                const z = spot.gz + lift;
                e.renderer.vfx.playBeam(style, { x: spot.x, y: spot.y, z }, { x: spot.x + beamDx, y: spot.y + beamDy, z }, undefined, 0.4, 1, team === 'RED' ? types.Team.RED : types.Team.BLUE);
            } else {
                e.renderer.vfx.playEffect(key, spot.x, spot.y, spot.gz + lift, undefined, spot.gz);
            }
        }, { key, spot, cam, lift: bodyKeys.has(key) || isBeam ? BODY_LIFT : 0, isBeam, beamDx: BEAM_DX, beamDy: BEAM_DY, fallH: FALL_H, fallZoom: FALL_ZOOM, projSpeed: PROJ_SPEED, projZoom: PROJ_ZOOM });
        let tPrev = 0;
        for (const t of SAMPLE_T) {
            await page.evaluate(({ n, cam, zoom }) => {
                window.__stepFrames(n);
                window.__TACTICAL_ENGINE__.renderer.camera.snapTo(cam.x, cam.y - cam.gz, zoom);
                window.__stepFrames(1);
            }, { n: Math.max(1, Math.round((t - tPrev) * 60) - 1), cam, zoom: key.startsWith('FALL:') ? FALL_ZOOM : isProj ? PROJ_ZOOM : 2.0 });
            tPrev = t;
            frames.push(await page.screenshot({ clip: isProj ? { x: 480 - PROJ_CROP.w / 2, y: 300 - PROJ_CROP.h * 0.72, width: PROJ_CROP.w, height: PROJ_CROP.h } : key.startsWith('DEATH:') ? { x: 480 - DEATH_CROP.w / 2, y: 300 - DEATH_CROP.h * 0.7, width: DEATH_CROP.w, height: DEATH_CROP.h } : key.startsWith('FALL:') ? { x: 480 - FALL_CROP.w / 2, y: 300 - FALL_CROP.h * 0.75, width: FALL_CROP.w, height: FALL_CROP.h } : isBeam ? { x: 480 - 60, y: 300 - 140, width: BEAM_CROP.w, height: BEAM_CROP.h } : { x: 480 - CROP.w / 2, y: 300 - CROP.h * 0.7, width: CROP.w, height: CROP.h } }));
        }
        if (sharp) {
            const row = await sharp({ create: { width: CROP.w * frames.length, height: CROP.h, channels: 3, background: '#000' } })
                .composite(frames.map((f, i) => ({ input: f, left: i * CROP.w, top: 0 }))).png().toBuffer();
            writeFileSync(join(outDir, `${key.replace(/:/g, "_")}.png`), row);
        } else {
            frames.forEach((f, i) => writeFileSync(join(outDir, `${key.replace(/:/g, "_")}_${i}.png`), f));
        }
        console.log('saved', key);
    }
    if (errors.length) console.log('pageErrors', [...new Set(errors)].slice(0, 5).join(' | '));
} finally {
    await browser?.close();
    await server.close();
}
