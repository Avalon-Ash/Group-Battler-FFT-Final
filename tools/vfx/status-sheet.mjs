/**
 * status-sheet — 全部狀態（STATUS_PARTS）疊在同一個單位上的確定性截圖表。
 * 一個單位、固定種子與合成時鐘；逐一套用狀態欄位，跑固定影格後截圖，最後拼成一張表。
 *
 *   node tools/vfx/status-sheet.mjs [--team=BLUE|RED] [--zoom=3] [--quality=0] [--out=tools/ui-e2e/out/status_sheet.png] [--only=STUN,ROOT]
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=').slice(1).join('=');
const team = arg('team', 'BLUE').toUpperCase();
const zoom = Number(arg('zoom', '2'));
const quality = arg('quality', '0');
const outPath = resolve(root, arg('out', 'tools/ui-e2e/out/status_sheet.png'));
const only = arg('only', '').split(',').filter(Boolean);
const START_TEXT = '啟動戰術模擬';
const SETTLE_FRAMES = 45;
const CLIP = { w: 220, h: 300 };

const server = await createServer({ root, server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge/Chrome found.');
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
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
    await page.goto(`${baseUrl}?quality=${quality}&mute`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__stepFrames(10));

    const keys = await page.evaluate(async ({ team }) => {
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const parts = await import('/data/vfx/status_parts.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const myTeam = team === 'RED' ? types.Team.RED : types.Team.BLUE;
        const midC = Math.floor(e.mapConfig.w / 2), midR = Math.floor(e.mapConfig.h / 2);
        let spot = null;
        for (let d = 0; d < 6 && !spot; d++) {
            for (const [c, r] of [[midC + d, midR], [midC - d, midR], [midC, midR + d], [midC, midR - d]]) {
                const h = HexUtils.offsetToAxial(c, r, e.mapConfig);
                if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r)) { spot = h; break; }
            }
        }
        cmd({ type: 'PLACE_AGENT', team: myTeam, q: spot.q, r: spot.r, hp: 20000, role: types.Role.WARRIOR });
        const foeTeam = myTeam === types.Team.RED ? types.Team.BLUE : types.Team.RED;
        for (let c = 0; c < e.mapConfig.w; c++) {
            const h = HexUtils.offsetToAxial(c, 0, e.mapConfig);
            if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r) && HexUtils.dist(h, spot) > 4) {
                cmd({ type: 'PLACE_AGENT', team: foeTeam, q: h.q, r: h.r, hp: 20000, role: types.Role.TANK });
                break;
            }
        }
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        window.__subject = e.agents.find((a) => a.team === myTeam);
        return parts.STATUS_PART_ORDER.slice();
    }, { team });

    const wanted = only.length ? keys.filter((k) => only.includes(k)) : keys;
    const shots = [];
    for (const key of wanted) {
        await page.evaluate(async (key) => {
            const types = await import('/types.ts');
            const e = window.__TACTICAL_ENGINE__;
            const a = window.__subject;
            // 清空所有狀態欄位
            Object.assign(a, {
                stunTimer: 0, silenceTimer: 0, banishTimer: 0, banished: false, rootTimer: 0, fearTimer: 0, tauntTimer: 0, tauntTargetId: null,
                blindTimer: 0, polymorphTimer: 0, invincibleTimer: 0, stasisTimer: 0, dotTimer: 0, dotDmg: 0, hotTimer: 0, ccVisual: 'NONE',
                hp: 20000, aiState: types.AIState.IDLE,
            });
            const BIG = 9999;
            const set = {
                STUN: { stunTimer: BIG, stunMax: BIG },
                SILENCE: { silenceTimer: BIG, silenceMax: BIG },
                BANISH: { banishTimer: BIG, banishMax: BIG, banished: true },
                ROOT: { rootTimer: BIG },
                FEAR: { fearTimer: BIG },
                TAUNT: { tauntTimer: BIG },
                BLIND: { blindTimer: BIG },
                POLYMORPH: { polymorphTimer: BIG, ccVisual: 'POLYMORPH' },
                FROZEN: { stunTimer: BIG, stunMax: BIG, ccVisual: 'FROZEN' },
                STASIS: { banishTimer: BIG, banishMax: BIG, banished: true, stasisTimer: BIG, stasisMax: BIG, ccVisual: 'STASIS' },
                INVINCIBLE: { invincibleTimer: BIG, ccVisual: 'INVINCIBLE' },
                POISON: { dotTimer: BIG, dotDmg: 5, dotType: 'POISON' },
                BURN: { dotTimer: BIG, dotDmg: 5, dotType: 'BURN' },
                REGEN: { hotTimer: BIG },
                VULNERABLE: { hp: 3000 },
                CAST_ULT: { aiState: types.AIState.CASTING_ULT },
                CAST_ACTIVE: { aiState: types.AIState.CASTING_ACTIVE },
                CC_INTERRUPT: { aiState: types.AIState.CC_INTERRUPTED },
                EVADING: { aiState: types.AIState.EVADING_URGENT },
            }[key] ?? {};
            Object.assign(a, set);
            window.__stepFrames(2);
            e.renderer.camera.snapTo(a.px, a.py - e.getTerrainHeight(a.q, a.r), 1);
        }, key);
        for (let i = 0; i < SETTLE_FRAMES; i++) {
            await page.evaluate(async ({ key, zoom }) => {
                const types = await import('/types.ts');
                const e = window.__TACTICAL_ENGINE__;
                const a = window.__subject;
                if (key.startsWith('CAST_') || key === 'CC_INTERRUPT' || key === 'EVADING') {
                    a.aiState = { CAST_ULT: types.AIState.CASTING_ULT, CAST_ACTIVE: types.AIState.CASTING_ACTIVE, CC_INTERRUPT: types.AIState.CC_INTERRUPTED, EVADING: types.AIState.EVADING_URGENT }[key];
                }
                e.renderer.camera.snapTo(a.px, a.py - e.getTerrainHeight(a.q, a.r), zoom);
                window.__stepFrames(1);
            }, { key, zoom });
        }
        const buf = await page.screenshot({ clip: { x: 480 - CLIP.w / 2, y: 300 - CLIP.h + 90, width: CLIP.w, height: CLIP.h } });
        shots.push({ key, b64: buf.toString('base64') });
    }

    // 拼表
    const cols = 6;
    const html = `<html><body style="margin:0;background:#111;color:#fff;font:14px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${CLIP.w}px);gap:4px;padding:4px">${shots.map((s) => `<div style="position:relative"><img src="data:image/png;base64,${s.b64}"><div style="position:absolute;left:4px;top:4px;background:#000a;padding:2px 6px;border-radius:4px">${s.key}</div></div>`).join('')}</div></body></html>`;
    const sheet = await ctx.newPage();
    await sheet.setViewportSize({ width: cols * (CLIP.w + 4) + 8, height: Math.ceil(shots.length / cols) * (CLIP.h + 4) + 8 });
    await sheet.setContent(html);
    const out = await sheet.screenshot();
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, out);
    console.log(`saved ${outPath} (${shots.length} statuses, team=${team}, zoom=${zoom})`, errors.length ? `pageErrors=${errors.join(' | ')}` : '');
} finally {
    await browser?.close();
    await server.close();
}
