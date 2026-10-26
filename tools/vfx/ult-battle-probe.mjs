// ╔══════════════════════════════════════════════════════════════════╗
// ║  tools/vfx/ult-battle-probe.mjs — 奧義實戰探針（ULT-V01）        ║
// ║  職責：在真實引擎（固定種子＋__stepFrames）跑 50 招奧義，量測：  ║
// ║    maps   跨地圖（FOREST／ICE／DESERT／VOID／MAGMA）× 50 招：     ║
// ║           生效時刻＝cast＋ultImpactDelay、頁面錯誤、結束後殘留、  ║
// ║           命中瞬間總表（每張地圖一張）                            ║
// ║    move   單體技詠唱中目標移開 2 格：命中特效離新／舊位置的距離   ║
// ║    multi  同一幀 8 招奧義：粒子峰值、預算、錯誤、各自生效時刻     ║
// ║    cancel 詠唱中打斷（50 招，不得結算）與天降落下途中打斷（照常落地）║
// ║           被打斷後是否仍有傷害或命中特效（幽靈爆發）              ║
// ║    reset  施放中途 RESET_GAME：殘留粒子與延遲爆發                 ║
// ║  用法：node tools/vfx/ult-battle-probe.mjs [--suite=all|maps|move|multi|cancel|reset]
// ║  輸出：tools/ui-e2e/out/ult-probe/（JSON＋總表 PNG）；有 FAIL 時退出碼 1 ║
// ╚══════════════════════════════════════════════════════════════════╝

import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const suite = arg('suite', 'all');
const outDir = resolve(root, 'tools/ui-e2e/out/ult-probe');
mkdirSync(outDir, { recursive: true });

const server = await createServer({ root, server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
let failed = false;
try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge or Chrome found for Playwright.');
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

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
    await page.getByText('START SIMULATION').click();
    await page.waitForTimeout(300);

    // 共用的頁內工具：場景、擺位、施放、事件紀錄、粒子統計
    await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const { SCENE_DB } = await import('/data/scenes.ts');
        const { ULT_VISUALS, ultImpactDelay } = await import('/data/vfx/ult_visuals.ts');
        const { vfxPartStore } = await import('/engine/renderers/vfxparts/VFXPartStore.ts');
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });

        const log = [];
        const orig = e.renderer.processVisualEvents.bind(e.renderer);
        e.renderer.processVisualEvents = (evs) => {
            for (const ev of evs) log.push({ type: ev.type, sourceId: ev.sourceId, skillId: ev.skill?.id, t: e.battleTime });
            return orig(evs);
        };
        const EFFECT_TYPES = new Set(['DAMAGE', 'HEAL', 'IMPACT_AOE', 'CC_APPLIED']);
        const P = {
            types, HexUtils, ULT_VISUALS, ultImpactDelay, vfxPartStore, cmd, log, EFFECT_TYPES,
            setScene(id) {
                const sc = SCENE_DB.find((x) => x.id === id);
                e.currentScene = sc;
                e.map.rebuildMap(e);
            },
            /** 可以放單位的格（在地圖內、沒有障礙） */
            free(q, r) { return e.isValid(q, r) && !e.hasObstacle(q, r); },
            /** 找一對相鄰、高低差最大的可放格（目標旁再要兩格空位給額外目標）；相鄰格對所有奧義射程都成立 */
            heightPair() {
                let best = null;
                const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
                for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) {
                    if (!P.free(q, r)) continue;
                    for (const [dq, dr] of DIRS) {
                        const q2 = q + dq, r2 = r + dr;
                        if (!P.free(q2, r2) || !P.free(q2 + 1, r2) || !P.free(q2, r2 + 1)) continue;
                        if ((q2 + 1 === q && r2 === r) || (q2 === q && r2 + 1 === r)) continue;
                        const dh = Math.abs(e.getTerrainHeight(q, r) - e.getTerrainHeight(q2, r2));
                        if (!best || dh > best.dh) best = { c: { q, r }, t: { q: q2, r: r2 }, dh };
                    }
                }
                return best;
            },
            /** 技能序列生成的粒子數（SequenceSystem 記 seqRun；不含天氣、地面危險區） */
            seqParticles() {
                return e.renderer.vfx.state.particles.filter((p) => p.seqRun !== undefined && !(p.locked && p.lockReason === 'HAZARD_FIELD')).length;
            },
            /** 擺一個施法者＋三個目標，回傳 { caster, target, castStart } 並開始施放 */
            setup(ultId, cHex, tHex, extra = []) {
                cmd({ type: 'CLEAR_BOARD', keepScene: true });
                const skill = e.skillDB.find((s) => s.id === ultId);
                const isRed = skill.team === 1;
                const ct = isRed ? types.Team.RED : types.Team.BLUE;
                const tt = isRed ? types.Team.BLUE : types.Team.RED;
                cmd({ type: 'PLACE_AGENT', team: ct, q: cHex.q, r: cHex.r, hp: 99999, role: types.Role.MAGE });
                cmd({ type: 'PLACE_AGENT', team: tt, q: tHex.q, r: tHex.r, hp: 99999, role: types.Role.TANK });
                for (const h of extra) if (e.isValid(h.q, h.r)) cmd({ type: 'PLACE_AGENT', team: tt, q: h.q, r: h.r, hp: 99999, role: types.Role.WARRIOR });
                e.play();
                for (const a of e.agents) { a.bt = null; a.mp = 0; a.spawnTimer = 0; }
                const caster = e.agents.find((a) => a.team === ct);
                const target = e.agents.find((a) => a.team === tt && a.q === tHex.q && a.r === tHex.r);
                if (!caster || !target) {
                    const why = [cHex, tHex].map((h) => `${h.q},${h.r} valid=${e.isValid(h.q, h.r)} obstacle=${e.hasObstacle(h.q, h.r)} agent=${Boolean(e.getAgentAt(h.q, h.r))}`).join(' | ');
                    throw new Error(`placement failed for ${ultId}: ${why}; agents=${e.agents.length}`);
                }
                caster.skillIds = [ultId, null, null];
                caster.skills = [skill, null, null];
                caster.mp = caster.maxMp;
                caster.target = target;
                caster.targetHex = { q: target.q, r: target.r };
                e.renderer.vfx.reset();
                const tp = HexUtils.toPx(tHex.q, tHex.r, e.mapConfig);
                e.renderer.camera.snapTo(tp.x, tp.y - e.getTerrainHeight(tHex.q, tHex.r), 1.4);
                window.__stepFrames(2);
                log.length = 0;
                P.plays.length = 0;
                const castStart = e.battleTime;
                e.initiateCast(caster, 0);
                // tick 之外施放：事件要手動送進表現層，否則下一個 tick 開頭會清掉（同 ult-sheet）
                e.renderer.processVisualEvents(e.events.splice(0));
                return { caster, target, castStart, skill, expected: skill.cast + ultImpactDelay(ultId) };
            },
            stepTo(castStart, tau) {
                const n = Math.max(0, Math.round((castStart + tau - e.battleTime) * 60));
                window.__stepFrames(n);
            },
            firstEffect(casterId, castStart) {
                const ev = log.find((x) => x.sourceId === casterId && EFFECT_TYPES.has(x.type));
                return ev ? ev.t - castStart : null;
            },
            effectCount(casterId) {
                return log.filter((x) => x.sourceId === casterId && EFFECT_TYPES.has(x.type)).length;
            },
            ults() { return e.skillDB.filter((s) => s.tag === 'ULT').map((s) => s.id); },
        };
        // 每次播放特效的 id、位置與時間（move 用）
        P.plays = [];
        // VFXPlayer 在粒子數達 HARD_PARTICLE_BUDGET 時整個特效不播：記下被丟掉的（multi 用）
        P.dropped = [];
        const { VFX_BUDGET } = await import('/constants/vfx.ts');
        const origPlay = e.renderer.vfx.playEffect.bind(e.renderer.vfx);
        e.renderer.vfx.playEffect = (id, x, y, ...rest) => {
            P.plays.push({ id, x, y, t: e.battleTime });
            if (e.renderer.vfx.state.particles.length >= VFX_BUDGET.HARD_PARTICLE_BUDGET) P.dropped.push(`${id}@${e.battleTime.toFixed(2)}`);
            return origPlay(id, x, y, ...rest);
        };
        window.__PROBE__ = P;
    });

    const results = {};
    const say = (s) => console.log(s);

    // ---------------- maps ----------------
    if (suite === 'all' || suite === 'maps') {
        results.maps = {};
        for (const scene of ['FOREST', 'ICE', 'DESERT', 'VOID', 'MAGMA']) {
            const r = await page.evaluate(async ({ scene }) => {
                const e = window.__TACTICAL_ENGINE__;
                const P = window.__PROBE__;
                P.setScene(scene);
                let pair = P.heightPair();
                const pairs = new Set();
                const rows = [];
                const ids = P.ults();
                const COLS = 10, CW = 200, CH = 150;
                const sheet = document.createElement('canvas');
                sheet.width = COLS * CW; sheet.height = Math.ceil(ids.length / COLS) * CH;
                const sctx = sheet.getContext('2d');
                const game = document.querySelector('canvas');
                const cacheBefore = P.vfxPartStore.size();
                for (let i = 0; i < ids.length; i++) {
                    const id = ids[i];
                    // 有些地圖會在戰鬥中長出障礙（DESERT）：清場後格子不空就重新選一對
                    P.cmd({ type: 'CLEAR_BOARD', keepScene: true });
                    if (![pair.c, pair.t, { q: pair.t.q + 1, r: pair.t.r }, { q: pair.t.q, r: pair.t.r + 1 }].every((h) => P.free(h.q, h.r))) pair = P.heightPair();
                    pairs.add(`${pair.c.q},${pair.c.r}->${pair.t.q},${pair.t.r} dh${pair.dh}`);
                    const extra = [{ q: pair.t.q + 1, r: pair.t.r }, { q: pair.t.q, r: pair.t.r + 1 }];
                    const s = P.setup(id, pair.c, pair.t, extra);
                    P.stepTo(s.castStart, s.expected + 0.05);
                    // 命中瞬間總表
                    const gx = Math.round(game.width / 2 - CW / 2), gy = Math.round(game.height / 2 - CH * 0.65);
                    sctx.drawImage(game, gx, gy, CW, CH, (i % COLS) * CW, Math.floor(i / COLS) * CH, CW, CH);
                    sctx.fillStyle = '#fff'; sctx.font = 'bold 12px monospace';
                    sctx.fillText(id, (i % COLS) * CW + 4, Math.floor(i / COLS) * CH + 14);
                    const atHit = P.seqParticles();
                    P.stepTo(s.castStart, s.expected + 3.0);
                    const effectAt = P.firstEffect(s.caster.id, s.castStart);
                    rows.push({ id, projectile: (s.skill.projectileSpeed ?? 0) > 0, expected: +s.expected.toFixed(3), effectAt: effectAt === null ? null : +effectAt.toFixed(3), atHit, residue: P.seqParticles() });
                }
                return { scene, pair, pairs: [...pairs], rows, cacheBefore, cacheAfter: P.vfxPartStore.size(), sheet: sheet.toDataURL('image/png') };
            }, { scene });
            writeFileSync(join(outDir, `maps-${scene}.png`), Buffer.from(r.sheet.split(',')[1], 'base64'));
            delete r.sheet;
            const TOL = 1 / 60 + 1e-6;
            // 投射物（rb_u5）生效＝詠唱結束＋飛行時間，報告 §5 已列為既有差異，這裡只要求不早於詠唱結束
            const off = (x) => (x.projectile ? x.effectAt < x.expected - TOL : Math.abs(x.effectAt - x.expected) > TOL);
            const noEffect = r.rows.filter((x) => x.effectAt === null).map((x) => x.id);
            const late = r.rows.filter((x) => x.effectAt !== null && off(x)).map((x) => `${x.id}(${x.effectAt}≠${x.expected})`);
            const projectile = r.rows.filter((x) => x.projectile).map((x) => `${x.id}(+${(x.effectAt - x.expected).toFixed(2)}s flight)`);
            const residue = r.rows.filter((x) => x.residue > 0).map((x) => `${x.id}:${x.residue}`);
            results.maps[scene] = r;
            say(`[maps] ${scene} pairs ${r.pairs.join(' / ')} cache ${r.cacheBefore}->${r.cacheAfter} | timing mismatch: ${late.join(' ') || 'none'} | projectile: ${projectile.join(' ')} | no effect event: ${noEffect.join(' ') || 'none'} | residue@+3s: ${residue.join(' ') || 'none'}`);
            if (late.length || residue.length || noEffect.length) failed = true;
        }
    }

    // ---------------- move ----------------
    if (suite === 'all' || suite === 'move') {
        const r = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const P = window.__PROBE__;
            P.setScene('FOREST');
            const singles = e.skillDB.filter((s) => s.tag === 'ULT' && s.type === 'SINGLE' && (s.range ?? 0) > 0).map((s) => s.id);
            const rows = [];
            for (const id of singles) {
                const s = P.setup(id, { q: -2, r: 0 }, { q: 0, r: 0 });
                const old = { x: s.target.px, y: s.target.py };
                P.stepTo(s.castStart, 0.5);
                // 詠唱中目標移開 2 格
                const np = P.HexUtils.toPx(1, 1, e.mapConfig);
                s.target.q = 1; s.target.r = 1; s.target.px = np.x; s.target.py = np.y;
                const near = (c) => (Math.hypot(c.x - np.x, c.y - np.y) < Math.hypot(c.x - old.x, c.y - old.y) ? 'new' : 'old');
                // 資產本體在詠唱開始就生成，命中發射器的粒子靠 delay 倒數：命中前 0.1 s 抓還在倒數的序列粒子，命中後量它們的重心
                P.stepTo(s.castStart, s.expected - 0.1);
                const pending = new Set(e.renderer.vfx.state.particles.filter((p) => p.seqRun !== undefined && p.delay > 0));
                P.stepTo(s.castStart, s.expected + 0.05);
                const hitPs = e.renderer.vfx.state.particles.filter((p) => pending.has(p));
                let asset = null;
                if (hitPs.length) {
                    // 粒子 y 是未投影座標（等距 Y ÷ ISO_SCALE_Y 0.5），換回等距 Y 再比
                    const cx = hitPs.reduce((a, p) => a + p.x, 0) / hitPs.length;
                    const cy = (hitPs.reduce((a, p) => a + p.y, 0) / hitPs.length) * 0.5;
                    asset = { n: hitPs.length, at: near({ x: cx, y: cy }) };
                }
                P.stepTo(s.castStart, s.expected + 2.5);
                // 共用命中包在命中時刻才由序列派發：看 playEffect 的位置
                const packPlay = P.plays.find((c) => c.id.startsWith('FX_ULT_IMPACT_'));
                rows.push({
                    id,
                    // RenderSpec §4.1 不綁定的：天降類與正速度投射物，維持靜態快照
                    heaven: P.ultImpactDelay(id) > 0 || (s.skill.projectileSpeed ?? 0) > 0,
                    asset,
                    pack: packPlay ? { n: 1, at: near(packPlay) } : null,
                });
            }
            return rows;
        });
        results.move = r;
        const fmt = (m) => (m ? `${m.at}(${m.n}p)` : '-');
        const stuck = r.filter((x) => !x.heaven && ((x.asset && x.asset.at === 'old') || (x.pack && x.pack.at === 'old'))).map((x) => `${x.id}[asset ${fmt(x.asset)} pack ${fmt(x.pack)}]`);
        const heaven = r.filter((x) => x.heaven).map((x) => `${x.id}[asset ${fmt(x.asset)} pack ${fmt(x.pack)}]`);
        say(`[move] single-target, non-heaven, effect played at the old position: ${stuck.join(' ') || 'none'}`);
        say(`[move] heaven-fall / projectile (static snapshot by RenderSpec 4.1): ${heaven.join(' ')}`);
        if (stuck.length) failed = true;
    }

    // ---------------- multi ----------------
    if (suite === 'all' || suite === 'multi') {
        results.multi = {};
        // 4 招（實戰常見的同時開大）與 8 招（極端）
        const PICKS = {
            four: ['mb_u1', 'rr_u2', 'wb_u4', 'mr_u4'],
            eight: ['mb_u1', 'rr_u2', 'wb_u4', 'sb_u4', 'tr_u4', 'mr_u4', 'rb_u2', 'wr_u5'],
        };
        for (const [name, picks] of Object.entries(PICKS)) {
            const r = await page.evaluate(async (picks) => {
                const e = window.__TACTICAL_ENGINE__;
                const P = window.__PROBE__;
                const T = P.types;
                const { VFX_BUDGET } = await import('/constants/vfx.ts');
                P.setScene('DESERT');
                P.cmd({ type: 'CLEAR_BOARD', keepScene: true });
                // 施法者放在兩個目標周圍 1～2 格的空位（地圖不同，障礙位置不同）
                const ring = [];
                for (let q = -2; q <= 3; q++) for (let r = -2; r <= 2; r++) {
                    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
                    if (d >= 1 && d <= 2 && !(q === 1 && r === 0) && P.free(q, r)) ring.push({ q, r });
                }
                const cs = ring.slice(0, picks.length);
                for (let i = 0; i < picks.length; i++) {
                    const sk = e.skillDB.find((s) => s.id === picks[i]);
                    P.cmd({ type: 'PLACE_AGENT', team: sk.team === 1 ? T.Team.RED : T.Team.BLUE, q: cs[i].q, r: cs[i].r, hp: 99999, role: T.Role.MAGE });
                }
                P.cmd({ type: 'PLACE_AGENT', team: T.Team.RED, q: 0, r: 0, hp: 99999, role: T.Role.TANK });
                P.cmd({ type: 'PLACE_AGENT', team: T.Team.BLUE, q: 1, r: 0, hp: 99999, role: T.Role.TANK });
                e.play();
                for (const a of e.agents) { a.bt = null; a.mp = 0; a.spawnTimer = 0; }
                const casters = [];
                for (let i = 0; i < picks.length; i++) {
                    const a = e.agents.find((x) => x.q === cs[i].q && x.r === cs[i].r);
                    const sk = e.skillDB.find((s) => s.id === picks[i]);
                    const foe = e.agents.find((x) => x.team !== a.team && ((x.q === 0 && x.r === 0) || (x.q === 1 && x.r === 0)));
                    a.skillIds = [sk.id, null, null]; a.skills = [sk, null, null]; a.mp = a.maxMp; a.target = foe; a.targetHex = { q: foe.q, r: foe.r };
                    casters.push({ a, sk });
                }
                // 紅藍兩方的控制會在同一刻互相打斷詠唱（真實玩法）；這裡要量所有奧義都完成時的畫面負載，暫時讓打斷失效
                const origBreak = e.combat.breakCast;
                e.combat.breakCast = () => {};
                const origInterrupt = e.combat.castingEngine.handleInterruption;
                e.combat.castingEngine.handleInterruption = () => {};
                e.renderer.vfx.reset();
                window.__stepFrames(2);
                P.log.length = 0;
                P.dropped.length = 0;
                const t0 = e.battleTime;
                for (const c of casters) e.initiateCast(c.a, 0);
                e.renderer.processVisualEvents(e.events.splice(0));
                let peak = 0, overSoft = 0, atHard = 0;
                for (let f = 0; f < 60 * 5; f++) {
                    window.__stepFrames(1);
                    const n = e.renderer.vfx.state.particles.length;
                    peak = Math.max(peak, n);
                    if (n >= VFX_BUDGET.SOFT_PARTICLE_BUDGET) overSoft++;
                    if (n >= VFX_BUDGET.HARD_PARTICLE_BUDGET) atHard++;
                }
                e.combat.breakCast = origBreak;
                e.combat.castingEngine.handleInterruption = origInterrupt;
                const timing = casters.map((c) => {
                    const ev = P.log.find((x) => x.sourceId === c.a.id && P.EFFECT_TYPES.has(x.type));
                    return { id: c.sk.id, expected: +(c.sk.cast + P.ultImpactDelay(c.sk.id)).toFixed(3), effectAt: ev ? +(ev.t - t0).toFixed(3) : null };
                });
                const dropped = {};
                for (const d of P.dropped) { const id = d.split('@')[0]; dropped[id] = (dropped[id] ?? 0) + 1; }
                return { peak, soft: VFX_BUDGET.SOFT_PARTICLE_BUDGET, hard: VFX_BUDGET.HARD_PARTICLE_BUDGET, framesOverSoft: overSoft, framesAtHard: atHard, timing, dropped, residue: P.seqParticles() };
            }, picks);
            results.multi[name] = r;
            const off = r.timing.filter((x) => x.effectAt === null || Math.abs(x.effectAt - x.expected) > 1 / 60 + 1e-6);
            const dropped = Object.entries(r.dropped).map(([k, v]) => `${k}×${v}`).join(' ') || 'none';
            say(`[multi] ${picks.length} ults same frame: peak ${r.peak} particles (soft ${r.soft}, hard ${r.hard}); frames over soft ${r.framesOverSoft}, at hard ${r.framesAtHard}; timing off: ${off.map((x) => `${x.id}(${x.effectAt}≠${x.expected})`).join(' ') || 'none'}; residue@+5s ${r.residue}`);
            say(`[multi] ${picks.length} ults: effects skipped at the hard budget: ${dropped}`);
            // 8 招時被暈住的施法者詠唱會暫停（打斷雖已關掉，暈眩仍讓讀條停住），生效時刻只列出不判定
            if ((name === 'four' && off.length) || r.residue > 0) failed = true;
        }
    }

    // ---------------- cancel ----------------
    if (suite === 'all' || suite === 'cancel') {
        const r = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const P = window.__PROBE__;
            P.setScene('FOREST');
            const rows = [];
            for (const id of P.ults()) {
                // 詠唱中（0.8 s）打斷
                const s = P.setup(id, { q: -2, r: 0 }, { q: 0, r: 0 }, [{ q: 1, r: 0 }]);
                P.stepTo(s.castStart, 0.8);
                e.combat.breakCast(s.caster, e, 1);
                e.renderer.processVisualEvents(e.events.splice(0)); // tick 外打斷：CAST_BREAK 手動送進表現層
                P.stepTo(s.castStart, 0.9);
                const after = P.seqParticles();
                P.stepTo(s.castStart, s.expected + 0.05);
                const atHit = P.seqParticles();
                P.stepTo(s.castStart, s.expected + 1.5);
                rows.push({ id, mode: 'mid-cast', effects: P.effectCount(s.caster.id), particlesAfterBreak: after, particlesAtHit: atHit });
            }
            for (const id of P.ults().filter((u) => P.ultImpactDelay(u) > 0)) {
                // 天降：詠唱結束後、落地前打斷
                const s = P.setup(id, { q: -2, r: 0 }, { q: 0, r: 0 }, [{ q: 1, r: 0 }]);
                P.stepTo(s.castStart, s.skill.cast + 0.1);
                e.combat.breakCast(s.caster, e, 1);
                e.renderer.processVisualEvents(e.events.splice(0)); // tick 外打斷：CAST_BREAK 手動送進表現層
                P.stepTo(s.castStart, s.expected + 0.05);
                const atHit = P.seqParticles();
                P.stepTo(s.castStart, s.expected + 1.5);
                rows.push({ id, mode: 'during-fall', effects: P.effectCount(s.caster.id), particlesAfterBreak: null, particlesAtHit: atHit });
            }
            return rows;
        });
        results.cancel = r;
        // 詠唱中打斷：不得有傷害、不得有命中特效
        const mid = r.filter((x) => x.mode === 'mid-cast');
        const effectLeak = mid.filter((x) => x.effects > 0).map((x) => `${x.id}:${x.effects}`);
        const ghost = mid.filter((x) => x.particlesAtHit > 0).map((x) => `${x.id}:${x.particlesAtHit}`);
        // 天降落下途中打斷：詠唱結束就算施放成功（2026-10-26 決定），傷害與落地特效都要照常出現
        const fall = r.filter((x) => x.mode === 'during-fall');
        const fallMissing = fall.filter((x) => x.effects === 0 || x.particlesAtHit === 0).map((x) => `${x.id}(effects ${x.effects}, particles ${x.particlesAtHit})`);
        say(`[cancel] mid-cast break (${mid.length}): effects ${effectLeak.join(' ') || 'none'}; ghost particles ${ghost.join(' ') || 'none'}`);
        say(`[cancel] break during the fall (${fall.length}): did not land ${fallMissing.join(' ') || 'none'}`);
        if (effectLeak.length || ghost.length || fallMissing.length) failed = true;
    }

    // ---------------- reset ----------------
    if (suite === 'all' || suite === 'reset') {
        const r = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const P = window.__PROBE__;
            P.setScene('FOREST');
            const rows = [];
            for (const id of P.ults()) {
                const s = P.setup(id, { q: -2, r: 0 }, { q: 0, r: 0 }, [{ q: 1, r: 0 }]);
                P.stepTo(s.castStart, Math.min(s.expected - 0.2, 1.2));
                P.cmd({ type: 'RESET_GAME' });
                window.__stepFrames(2);
                const after = P.seqParticles();
                window.__stepFrames(60 * 3);
                rows.push({ id, afterReset: after, later: P.seqParticles(), effects: P.effectCount(s.caster.id) });
            }
            return rows;
        });
        results.reset = r;
        const left = r.filter((x) => x.afterReset > 0 || x.later > 0 || x.effects > 0).map((x) => `${x.id}(after ${x.afterReset}, +3s ${x.later}, effects ${x.effects})`);
        say(`[reset] leftovers after RESET_GAME: ${left.join(' ') || 'none'}`);
        if (left.length) failed = true;
    }

    say(`[probe] page errors: ${pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : 'none'}`);
    if (pageErrors.length) failed = true;
    writeFileSync(join(outDir, `probe-${suite}.json`), JSON.stringify({ results, pageErrors }, null, 2));
    say(`[probe] ${failed ? 'FAIL' : 'PASS'} (details: tools/ui-e2e/out/ult-probe/probe-${suite}.json)`);
} finally {
    if (browser) await browser.close();
    await server.close();
}
process.exit(failed ? 1 : 0);
