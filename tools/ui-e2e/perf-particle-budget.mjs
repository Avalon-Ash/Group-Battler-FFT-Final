/**
 * perf-particle-budget.mjs — 粒子數 vs 幀時間壓測（決定 VFX_BUDGET 的軟／硬上限）
 *
 * 做法：
 *   - 2560×1440、DPR 1、headed、主螢幕 RTX 4070，解除 vsync（--disable-frame-rate-limit --disable-gpu-vsync），
 *     量的是「一幀實際要花多少時間」而不是被螢幕更新率卡住的間隔
 *   - 背景是真實 5v5 戰鬥（HP 調高不會結束）
 *   - 暫時把 VFX_BUDGET 的軟／硬上限與 MAX_POOL_SIZE 拉高，讓預算不介入
 *   - 每個級距 N：清空後每幀補播 50 招奧義的真實資產，把粒子總數（含 delay 倒數中的，與預算檢查同一個數）維持在 N 附近
 *   - 每級暖機 1.5 s、量 PERF_PB_SECONDS 秒，ROUNDS 輪交錯
 * 輸出：median／p95／p99（ms）、>8.4 ms 與 >16.7 ms 幀數比例、實際平均粒子數 → tools/ui-e2e/out/perf_particle_budget.json
 *
 * PERF_PB_MODE=ults：真實情境。DESERT 同一幀 8 招奧義（暫時關掉打斷），在不同硬上限（PERF_PB_HARDS，
 *   軟上限照舊比例 240/380）下量施放後 PERF_PB_SECONDS 秒的幀時間、粒子峰值（總數／可見）、被硬上限略過的特效數
 *   → tools/ui-e2e/out/perf_particle_budget_ults.json
 * 用法：node tools/ui-e2e/perf-particle-budget.mjs   （不得和 Blender 烘焙、其他 perf:* 同時跑）
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, assertMainGpu, assertResolution, prepareManualBattle } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS = Number(process.env.PERF_PB_SECONDS || 6);
const ROUNDS = Number(process.env.PERF_ROUNDS || 2);
const LEVELS = (process.env.PERF_PB_LEVELS || '0,380,500,650,800,1000,1300').split(',').map(Number);
const MODE = process.env.PERF_PB_MODE || 'levels';
const HARDS = (process.env.PERF_PB_HARDS || '380,600,800,1000,1500').split(',').map(Number);
const ULT_PICKS = ['mb_u1', 'rr_u2', 'wb_u4', 'sb_u4', 'tr_u4', 'mr_u4', 'rb_u2', 'wr_u5'];

const stats = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    return {
        frames: s.length,
        medianMs: +q(0.5).toFixed(2), p95Ms: +q(0.95).toFixed(2), p99Ms: +q(0.99).toFixed(2), maxMs: +s[s.length - 1].toFixed(2),
        over8_4Pct: +(100 * s.filter((f) => f > 8.4).length / s.length).toFixed(1),
        over16_7Pct: +(100 * s.filter((f) => f > 16.7).length / s.length).toFixed(1),
    };
};

/** 真實情境：同一幀 8 招奧義，給定硬上限下的幀時間與被略過的特效數 */
async function runUlts(page, hard) {
    return page.evaluate(async ({ hard, seconds, picks }) => {
        const e = window.__TACTICAL_ENGINE__;
        const { VFX_BUDGET } = await import('/constants/vfx.ts');
        const T = await import('/types.ts');
        const { SCENE_DB } = await import('/data/scenes.ts');
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        if (e.currentScene?.id !== 'DESERT') { e.currentScene = SCENE_DB.find((x) => x.id === 'DESERT'); e.map.rebuildMap(e); }
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const free = (q, r) => e.isValid(q, r) && !e.hasObstacle(q, r);
        const ring = [];
        for (let q = -2; q <= 3; q++) for (let r = -2; r <= 2; r++) {
            const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
            if (d >= 1 && d <= 2 && !(q === 1 && r === 0) && free(q, r)) ring.push({ q, r });
        }
        for (let i = 0; i < picks.length; i++) {
            const sk = e.skillDB.find((x) => x.id === picks[i]);
            cmd({ type: 'PLACE_AGENT', team: sk.team === 1 ? T.Team.RED : T.Team.BLUE, q: ring[i].q, r: ring[i].r, hp: 999999, role: T.Role.MAGE });
        }
        cmd({ type: 'PLACE_AGENT', team: T.Team.RED, q: 0, r: 0, hp: 999999, role: T.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: T.Team.BLUE, q: 1, r: 0, hp: 999999, role: T.Role.TANK });
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = 0; a.spawnTimer = 0; }
        const casters = picks.map((id, i) => {
            const a = e.agents.find((x) => x.q === ring[i].q && x.r === ring[i].r);
            const sk = e.skillDB.find((x) => x.id === id);
            const foe = e.agents.find((x) => x.team !== a.team && ((x.q === 0 && x.r === 0) || (x.q === 1 && x.r === 0)));
            a.skillIds = [sk.id, null, null]; a.skills = [sk, null, null]; a.mp = a.maxMp; a.target = foe; a.targetHex = { q: foe.q, r: foe.r };
            return a;
        });
        const saved = { soft: VFX_BUDGET.SOFT_PARTICLE_BUDGET, hard: VFX_BUDGET.HARD_PARTICLE_BUDGET };
        VFX_BUDGET.HARD_PARTICLE_BUDGET = hard;
        VFX_BUDGET.SOFT_PARTICLE_BUDGET = Math.round(hard * saved.soft / saved.hard);
        // 紅藍的控制會互相打斷詠唱；這裡量全部完成時的負載
        const origBreak = e.combat.breakCast;
        const origInterrupt = e.combat.castingEngine.handleInterruption;
        e.combat.breakCast = () => {};
        e.combat.castingEngine.handleInterruption = () => {};
        let dropped = 0;
        const vfx = e.renderer.vfx;
        const origPlay = vfx.playEffect;
        vfx.playEffect = function (...args) {
            if (this.state.particles.length >= VFX_BUDGET.HARD_PARTICLE_BUDGET) dropped++;
            return origPlay.apply(this, args);
        };
        vfx.reset();
        await new Promise((r) => setTimeout(r, 400));
        for (const a of casters) e.initiateCast(a, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        const frames = [];
        let peak = 0, peakVisible = 0, last = 0;
        await new Promise((res) => {
            const t0 = performance.now();
            const f = (now) => {
                if (last) frames.push(now - last);
                last = now;
                const ps = vfx.state.particles;
                peak = Math.max(peak, ps.length);
                let v = 0;
                for (const p of ps) if (!(p.delay > 0)) v++;
                peakVisible = Math.max(peakVisible, v);
                if (now - t0 < seconds * 1000) requestAnimationFrame(f); else res();
            };
            requestAnimationFrame(f);
        });
        vfx.playEffect = origPlay;
        e.combat.breakCast = origBreak;
        e.combat.castingEngine.handleInterruption = origInterrupt;
        VFX_BUDGET.HARD_PARTICLE_BUDGET = saved.hard;
        VFX_BUDGET.SOFT_PARTICLE_BUDGET = saved.soft;
        return { frames, peak, peakVisible, dropped };
    }, { hard, seconds: SECONDS, picks: ULT_PICKS });
}

const server = await createServer({ server: { port: 3196, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&mute`;

const browser = await launchBrowser({ headed: true, unthrottled: true });
const result = { levels: {}, env: null };
try {
    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const env = await getEnvInfo(page, true);
    result.env = { gpu: env.gpu, viewport: env.viewport, dpr: env.dpr };
    assertMainGpu(env);
    assertResolution(env);
    await prepareManualBattle(page);

    if (MODE === 'ults') {
        const rows = {};
        for (let round = 0; round < ROUNDS; round++) {
            const order = round % 2 === 0 ? HARDS : [...HARDS].reverse();
            for (const hard of order) {
                const r = await runUlts(page, hard);
                const st = stats(r.frames);
                (rows[hard] ??= []).push({ ...st, peak: r.peak, peakVisible: r.peakVisible, dropped: r.dropped });
                console.log(`round ${round + 1} hard ${hard}: peak ${r.peak} (visible ${r.peakVisible}), dropped ${r.dropped}, ${JSON.stringify(st)}`);
            }
        }
        result.ults = rows;
        console.log('\n| 硬上限 | 軟上限 | 粒子峰值 | 可見峰值 | 略過特效 | median ms | p95 ms | p99 ms | max ms | >8.4ms % | >16.7ms % |');
        console.log('| --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |');
        for (const hard of HARDS) {
            const runs = rows[hard];
            const avg = (key) => +(runs.reduce((a, r) => a + r[key], 0) / runs.length).toFixed(2);
            console.log(`| ${hard} | ${Math.round(hard * 240 / 380)} | ${Math.round(avg('peak'))} | ${Math.round(avg('peakVisible'))} | ${Math.round(avg('dropped'))} | ${avg('medianMs')} | ${avg('p95Ms')} | ${avg('p99Ms')} | ${avg('maxMs')} | ${avg('over8_4Pct')} | ${avg('over16_7Pct')} |`);
        }
    } else {
    await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const { VFX_BUDGET, VFX_PARAM } = await import('/constants/vfx.ts');
        const { ULT_VISUALS } = await import('/data/vfx/ult_visuals.ts');
        const saved = { soft: VFX_BUDGET.SOFT_PARTICLE_BUDGET, hard: VFX_BUDGET.HARD_PARTICLE_BUDGET, pool: VFX_PARAM.MAX_POOL_SIZE };
        VFX_BUDGET.SOFT_PARTICLE_BUDGET = 1e6;
        VFX_BUDGET.HARD_PARTICLE_BUDGET = 1e6;
        VFX_PARAM.MAX_POOL_SIZE = 5000;
        const assets = e.skillDB.filter((s) => s.tag === 'ULT').map((s) => ULT_VISUALS[s.id]?.vfxOverride || s.id);
        let k = 0;
        const S = { target: 0, frames: [], counts: [], visible: [], measuring: false, last: 0, saved };
        // 每幀：補播資產維持可見粒子數；量測期間記錄幀間隔與粒子數
        const tick = (now) => {
            if (S.target > 0) {
                let guard = 0;
                while (e.renderer.vfx.state.particles.length < S.target && guard++ < 3) {
                    const alive = e.agents.filter((a) => a.hp > 0);
                    const a = alive[k % alive.length];
                    const g = e.getTerrainHeight(a.q, a.r);
                    e.renderer.vfx.playEffect(assets[k % assets.length], a.px, a.py, g + 5, undefined, g, undefined, undefined, 1);
                    k++;
                }
            }
            if (S.measuring) {
                if (S.last) S.frames.push(now - S.last);
                let vis = 0;
                for (const p of e.renderer.vfx.state.particles) if (!(p.delay > 0)) vis++;
                S.counts.push(e.renderer.vfx.state.particles.length);
                S.visible.push(vis);
            }
            S.last = now;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        window.__PB__ = S;
    });

    for (let round = 0; round < ROUNDS; round++) {
        const order = round % 2 === 0 ? LEVELS : [...LEVELS].reverse();
        for (const level of order) {
            await page.evaluate((n) => {
                const S = window.__PB__;
                S.target = n;
                window.__TACTICAL_ENGINE__.renderer.vfx.state.reset();
            }, level);
            await page.waitForTimeout(1500);
            await page.evaluate(() => { const S = window.__PB__; S.frames = []; S.counts = []; S.visible = []; S.last = 0; S.measuring = true; });
            await page.waitForTimeout(SECONDS * 1000);
            const raw = await page.evaluate(() => { const S = window.__PB__; S.measuring = false; return { frames: S.frames, counts: S.counts, visible: S.visible }; });
            const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length));
            const avgCount = mean(raw.counts), avgVisible = mean(raw.visible);
            (result.levels[level] ??= []).push({ ...stats(raw.frames), avgParticles: avgCount, avgVisible });
            console.log(`round ${round + 1} level ${level}: total ${avgCount}, visible ${avgVisible}, ${JSON.stringify(stats(raw.frames))}`);
        }
    }
    await page.evaluate(async () => {
        const S = window.__PB__;
        S.target = 0;
        const { VFX_BUDGET, VFX_PARAM } = await import('/constants/vfx.ts');
        VFX_BUDGET.SOFT_PARTICLE_BUDGET = S.saved.soft;
        VFX_BUDGET.HARD_PARTICLE_BUDGET = S.saved.hard;
        VFX_PARAM.MAX_POOL_SIZE = S.saved.pool;
    });
    result.pageErrors = pageErrors;

    console.log('\n| 目標總粒子 | 實際總粒子 | 可見 | median ms | p95 ms | p99 ms | >8.4ms % | >16.7ms % |');
    console.log('| --: | --: | --: | --: | --: | --: | --: | --: |');
    for (const level of LEVELS) {
        const runs = result.levels[level];
        const avg = (key) => +(runs.reduce((a, r) => a + r[key], 0) / runs.length).toFixed(2);
        console.log(`| ${level} | ${Math.round(avg('avgParticles'))} | ${Math.round(avg('avgVisible'))} | ${avg('medianMs')} | ${avg('p95Ms')} | ${avg('p99Ms')} | ${avg('over8_4Pct')} | ${avg('over16_7Pct')} |`);
    }
    }
    console.log(`page errors: ${pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'none'}`);
} finally {
    writeFileSync(join(OUT_DIR, MODE === 'ults' ? 'perf_particle_budget_ults.json' : 'perf_particle_budget.json'), JSON.stringify(result, null, 2));
    await browser.close();
    await server.close();
}
