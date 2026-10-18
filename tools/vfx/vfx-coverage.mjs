/**
 * vfx-coverage — 特效繪製後端的執行期覆蓋率探針（docs/VFX_PIPELINE_MAP.md 的 P1）。
 * 不改引擎：在頁面裡動態 import 與 app 相同的模組，包住各繪製器的方法與 VFXSystem.playEffect／playBeam，
 * 依「目前標籤」累計：播了哪些登記特效、哪些光束樣式、粒子實際走哪個後端（PART／PROC／GROUND／BILL）、
 * 哪些直接繪製器被呼叫。
 *
 * 兩段：
 *   1. 實戰：點開始後的預設自動對戰 N 秒，標籤 BATTLE（命中、狀態、危害、死亡、出場、待機）。
 *   2. 逐技能：每個技能單獨施放一次（施法者＋射程內 1～2 格的敵人），標籤＝技能 id。
 *
 *   node tools/vfx/vfx-coverage.mjs [--skills=all|wb_a3,rb_u1] [--battleSec=60] [--battles=1] [--liveness]
 *     -> tools/ui-e2e/out/vfx/coverage.json
 * --battles=N：實戰段重複 N 場（每場按一次骰子＝隨機陣容，地圖依 SCENE_DB 順序輪替，N≥5 就涵蓋全部地圖），累計在同一個 BATTLE 標籤。
 * --liveness：存活探針。另外自動包住 LIVENESS_DIRS 底下每個模組的全部匯出（物件方法、類別方法），
 *   coverage.json 的 wrapped 列出包到的方法；vfx-coverage-report.mjs 依此印出「整輪零呼叫」的方法（刪除前的證據）。
 *   只能包物件／類別上的方法；模組層級的具名函式（export function）包不到，要另外靜態查引用。
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const outDir = join(root, 'tools', 'ui-e2e', 'out', 'vfx');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const skillsArg = arg('skills', 'all');
const battleSec = Number(arg('battleSec', '60'));
const battles = Number(arg('battles', '1'));
const liveness = process.argv.includes('--liveness');
const START_TEXT = '啟動戰術模擬';
const DICE_TITLE = '隨機生成戰場與陣容';

// 被包住的繪製模組（路徑：匯出名）。新增繪製器時加進來。
const PAINTER_MODULES = {
    '/engine/systems/vfx/renderers/painters/PartPainter.ts': ['PartPainter'],
    '/engine/systems/vfx/renderers/painters/BillboardPainter.ts': ['BillboardPainter'],
    '/engine/systems/vfx/renderers/ProjectileRenderer.ts': ['ProjectileRenderer'],
    '/engine/systems/vfx/VFXAmbience.ts': ['VFXAmbience'],
    '/engine/systems/visuals/effects/UnitShatter.ts': ['UnitShatter'],
    '/engine/systems/vfx/renderers/painters/ProjectilePartPainter.ts': ['ProjectilePartPainter'],
    '/engine/renderers/GroundDrape.ts': ['GroundDrapeLayer'],
    '/engine/renderers/grid/GridOverlays.ts': ['GridOverlays'],
    '/engine/renderers/grid/painters/HazardPainter.ts': ['HazardPainter'],
    '/engine/renderers/grid/ZoneRenderer.ts': ['ZoneRenderer'],
    '/engine/renderers/status/painters/ShieldPainter.ts': ['ShieldPainter'],
    '/engine/renderers/status/painters/StatusPartPainter.ts': ['StatusPartPainter'],
    '/engine/renderers/status/StatusOrchestrator.ts': ['StatusOrchestrator'],
    '/engine/renderers/units/painters/PedestalGhostPainter.ts': ['PedestalGhostPainter'],
    '/engine/renderers/units/painters/UnitAfterimagePainter.ts': ['UnitAfterimagePainter'],
    '/engine/renderers/units/painters/UnitAuraPainter.ts': ['UnitAuraPainter'],
    '/engine/renderers/units/painters/UnitCorePainter.ts': ['UnitCorePainter'],
    '/engine/renderers/units/painters/UnitDeathPainter.ts': ['UnitDeathPainter'],
    '/engine/renderers/units/painters/UnitFlightPainter.ts': ['UnitFlightPainter'],
    '/engine/renderers/units/painters/UnitIndicatorPainter.ts': ['UnitIndicatorPainter'],
    '/engine/renderers/units/painters/UnitShadowPainter.ts': ['UnitShadowPainter'],
    '/engine/systems/unit/UnitSystem.ts': ['UnitRenderSystem'],
    '/engine/graphics/painters/GeometryPainter.ts': ['GeometryPainter'],
    '/engine/graphics/painters/ParticlePainter.ts': ['ParticlePainter'],
    '/engine/graphics/painters/VolumePainter.ts': ['VolumePainter'],
    '/engine/renderers/hud/TextPainter.ts': ['TextPainter'],
};
// 存活探針掃描的目錄（視覺管線全部）：每個模組的全部匯出都包（'*'）
const LIVENESS_DIRS = ['engine/graphics', 'engine/renderers', 'engine/systems/vfx', 'engine/systems/visuals', 'engine/systems/unit', 'engine/assets.ts', 'engine/sprites.ts', 'engine/renderer.ts'];
if (liveness) {
    const files = execSync(`git ls-files ${LIVENESS_DIRS.join(' ')}`, { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
    for (const f of files) if (!PAINTER_MODULES[`/${f}`]) PAINTER_MODULES[`/${f}`] = ['*'];
}

const server = await createServer({ root, server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
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

    // ── 安裝探針 ──
    const installed = await page.evaluate(async (mods) => {
        const cov = window.__cov = { label: 'BOOT', data: {} };
        const bucket = () => (cov.data[cov.label] ||= { fx: {}, beams: {}, particles: {}, painters: {} });
        const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
        const wrapped = [];
        const wrapFn = (owner, key, name) => {
            const d = Object.getOwnPropertyDescriptor(owner, key);
            if (!d || !('value' in d)) return; // getter／setter 不包（讀取會觸發副作用）
            const orig = d.value;
            if (typeof orig !== 'function' || orig.__covWrapped || key === 'constructor') return;
            const w = function (...a) { inc(bucket().painters, name); return orig.apply(this, a); };
            w.__covWrapped = true;
            try { owner[key] = w; wrapped.push(name); } catch { /* 唯讀 */ }
        };
        for (const [path, names] of Object.entries(mods)) {
            let m;
            try { m = await import(path); } catch (e) { wrapped.push(`IMPORT_FAIL ${path}`); continue; }
            for (const n of (names[0] === '*' ? Object.keys(m) : names)) {
                const obj = m[n];
                if (names[0] === '*' && (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))) continue;
                if (!obj) { wrapped.push(`MISSING ${n}`); continue; }
                for (const k of Object.getOwnPropertyNames(obj)) if (!['length', 'name', 'prototype'].includes(k)) wrapFn(obj, k, `${n}.${k}`);
                if (typeof obj === 'function' && obj.prototype) for (const k of Object.getOwnPropertyNames(obj.prototype)) wrapFn(obj.prototype, k, `${n}#${k}`);
            }
        }
        // 粒子後端：與 ParticleRenderer 同一張特性表（constants.ts PARTICLE_TRAITS）；掛了零件的 BEAM 算 PART
        const { ParticleRenderer } = await import('/engine/systems/vfx/renderers/ParticleRenderer.ts');
        const { particleBackend } = await import('/constants.ts');
        const seen = new WeakMap();
        const origDraw = ParticleRenderer.drawSingleParticle;
        ParticleRenderer.drawSingleParticle = function (ctx, p, ...rest) {
            const be = p.type === 'BEAM' && p.part ? 'PART' : particleBackend(p.type);
            // 粒子物件會被池化重用：以（物件，標籤，maxLife）判斷是不是新的一顆
            const sig = `${cov.label}|${p.maxLife}|${p.type}`;
            if (seen.get(p) !== sig) { seen.set(p, sig); inc(bucket().particles, `${p.__src || 'direct'}|${be}:${p.type}`); }
            return origDraw.call(this, ctx, p, ...rest);
        };
        const { VFXSystem } = await import('/engine/systems/vfx/VFXSystem.ts');
        // 來源標記：playEffect／playBeam 新推進 particles 的粒子記下來源；池化重用時由 getParticle 清掉舊標記。
        // 沒有標記的粒子＝不經登記表直接生成（HEAVEN_FALL、UnitShatter 碎片、天氣等）。
        const tagNew = (sys, n0, src) => { const ps = sys.state.particles; for (let i = n0; i < ps.length; i++) ps[i].__src = src; };
        const pe = VFXSystem.prototype.playEffect;
        VFXSystem.prototype.playEffect = function (id, ...a) { inc(bucket().fx, id); const n0 = this.state.particles.length; const r = pe.call(this, id, ...a); tagNew(this, n0, `fx:${id}`); return r; };
        const pb = VFXSystem.prototype.playBeam;
        VFXSystem.prototype.playBeam = function (id, ...a) { inc(bucket().beams, id); const n0 = this.state.particles.length; const r = pb.call(this, id, ...a); tagNew(this, n0, `beam:${id}`); return r; };
        // 事件計數：每個標籤收到哪些遊戲事件（用來判斷「沒有粒子」是沒命中還是特效漏掛）
        const rend = window.__TACTICAL_ENGINE__.renderer;
        const pv = rend.processVisualEvents.bind(rend);
        rend.processVisualEvents = (evs, ...rest) => { const b = bucket(); b.events ||= {}; for (const ev of evs) inc(b.events, ev.text && ev.type === 'DAMAGE' ? `DAMAGE:${ev.text}` : ev.type); return pv(evs, ...rest); };
        const st = window.__TACTICAL_ENGINE__.renderer.vfx.state;
        const gp = st.getParticle.bind(st);
        st.getParticle = () => { const p = gp(); p.__src = undefined; return p; };
        return wrapped;
    }, PAINTER_MODULES);
    const fails = installed.filter((s) => /IMPORT_FAIL|MISSING/.test(s));
    console.log(`wrapped ${installed.length - fails.length} methods`, fails.length ? `problems: ${fails.join(', ')}` : '');

    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__stepFrames(10));

    // ── 1. 實戰（先跑：點開始後場上是完整的雙方隊伍） ──
    if (battleSec > 0) {
        // 骰子鈕產生隨機地圖與雙方隊伍（同 br-soak）；導演、縮圈照預設
        for (let b = 0; b < battles; b++) {
            await page.evaluate(() => { const e = window.__TACTICAL_ENGINE__; window.__cov.label = 'SETUP'; e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' }); });
            await page.evaluate((title) => { for (const b of document.querySelectorAll('button')) if (b.title === title) { b.click(); break; } }, DICE_TITLE);
            await page.waitForTimeout(300);
            await page.evaluate(() => window.__stepFrames(10));
            await page.evaluate(async (b) => {
                const e = window.__TACTICAL_ENGINE__;
                const cmd = (c) => e.bus.emit('UI_COMMAND', c);
                // 地圖輪替：骰子的陣容保留，地形換成第 b 張（同 biome-frames 的換圖方式）
                const { SCENE_DB } = await import('/data/scenes.ts');
                e.currentScene = SCENE_DB[b % SCENE_DB.length];
                e.map.rebuildMap(e);
                if (!e.isRunning) cmd({ type: 'START_GAME' });
                window.__cov.label = 'BATTLE';
            }, b);
            for (let s = 0; s < battleSec; s += 10) await page.evaluate(() => window.__stepFrames(600));
            console.log('battle done', await page.evaluate(() => ({ scene: window.__TACTICAL_ENGINE__.currentScene?.id, agents: window.__TACTICAL_ENGINE__.agents.length, t: window.__TACTICAL_ENGINE__.battleTime })));
        }
    }
    // ── 2. 逐技能 ──
    const skillIds = await page.evaluate((arg) => {
        const all = window.__TACTICAL_ENGINE__.skillDB.map((s) => s.id);
        return arg === 'all' ? all : arg.split(',').filter((id) => all.includes(id));
    }, skillsArg);
    const castLog = {};
    for (const skillId of skillIds) {
        const r = await page.evaluate(async (skillId) => {
            const types = await import('/types.ts');
            const { HexUtils } = await import('/engine/utils.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            window.__cov.label = 'SETUP';
            cmd({ type: 'STOP_GAME' });
            cmd({ type: 'CLEAR_BOARD', keepScene: true });
            cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
            cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
            e.renderer.vfx.reset();
            const skill = e.skillDB.find((s) => s.id === skillId);
            const myTeam = skill.team ?? (skillId[1] === 'r' ? types.Team.RED : types.Team.BLUE);
            const foeTeam = myTeam === types.Team.RED ? types.Team.BLUE : types.Team.RED;
            const midC = Math.floor(e.mapConfig.w / 2), midR = Math.floor(e.mapConfig.h / 2);
            const free = (h) => e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r);
            let spot = null;
            for (let d = 0; d < 6 && !spot; d++) {
                for (const [c, rr] of [[midC + d, midR], [midC - d, midR], [midC, midR + d], [midC, midR - d]]) {
                    const h = HexUtils.offsetToAxial(c, rr, e.mapConfig);
                    if (free(h)) { spot = h; break; }
                }
            }
            // 敵人放在射程內（近戰 1 格，其餘 2 格），否則近戰普攻打不到、沒有命中特效
            const foeDist = Math.max(1, Math.min(2, skill.range ?? 1));
            let foeHex = null;
            for (let c = 0; c < e.mapConfig.w && !foeHex; c++) for (let rr = 0; rr < e.mapConfig.h && !foeHex; rr++) {
                const h = HexUtils.offsetToAxial(c, rr, e.mapConfig);
                if (free(h) && HexUtils.dist(h, spot) === foeDist) foeHex = h;
            }
            cmd({ type: 'PLACE_AGENT', team: myTeam, q: spot.q, r: spot.r, hp: 20000, role: skill.role });
            const caster = e.agents[e.agents.length - 1];
            cmd({ type: 'PLACE_AGENT', team: foeTeam, q: foeHex.q, r: foeHex.r, hp: 20000, role: types.Role.TANK });
            const foe = e.agents[e.agents.length - 1];
            caster.skillIds = [skillId, null, null];
            e.play();
            // 出場動畫期間（spawnTimer > 0）投射物會被丟棄，短詠唱的技能因此看不到命中：直接結束出場
            for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; a.spawnTimer = 0; }
            caster.target = foe; // Agent 物件（曾誤設成 id 字串，近戰單體技能因此沒有命中）
            caster.targetHex = { q: foeHex.q, r: foeHex.r };
            window.__cov.label = skillId;
            const ok = e.initiateCast(caster, 0);
            e.renderer.processVisualEvents(e.events.splice(0));
            e.renderer.camera.snapTo(caster.px, caster.py - e.getTerrainHeight(spot.q, spot.r), 1.2);
            return { ok, cast: skill.cast ?? 0 };
        }, skillId);
        castLog[skillId] = r.ok;
        // 詠唱＋2.5 秒餘韻
        await page.evaluate((n) => window.__stepFrames(n), Math.round((r.cast + 2.5) * 60));
    }
    console.log(`skills done: ${skillIds.length}`);

    const data = await page.evaluate(() => window.__cov?.data ?? null);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'coverage.json'), JSON.stringify({ castLog, data, wrapped: installed.filter((s) => !/IMPORT_FAIL|MISSING/.test(s)), errors: [...new Set(errors)].slice(0, 20) }, null, 1));
    console.log('saved coverage.json', errors.length ? `pageErrors=${[...new Set(errors)].slice(0, 5).join(' | ')}` : '');
} finally {
    await browser?.close();
    await server.close();
}
