/**
 * tools/ui-e2e/cleanup-coord01-check.mjs
 * COORD01 Forensic Probe & Reproduction Verification (Read-Only)
 *
 * Collects RenderOp, agent physics, terrain, and
 * visual frame data for the 3 representative coordinate protocol diagnostic cases:
 * 1. SINK diagnostic: FOREST seed 1001 f337 RED-0002.
 * 2. VOID diagnostic: FOREST seed 1002 f512 BLU-0007.
 * 3. Static and moved corpse/hazard A-B-A episodes; no root-cause claim.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, seededHarnessInit, installRecorder, setupBattle, stepFrames } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const isAfterMode = process.argv.includes('--after') || process.argv.includes('--mode=after');
const mode = isAfterMode ? 'after' : 'before';
const defaultOutName = isAfterMode ? 'coord01-after' : 'coord01-before';
const outName = process.argv.find(a => a.startsWith('--out='))?.slice(6) || defaultOutName;
const outDir = join(here, 'out', outName);
mkdirSync(outDir, { recursive: true });

const { server, port } = await startServer(3230);
const browser = await launchBrowser({ headed: false, unthrottled: false }).catch(async err => { await server.close(); throw err; });

const evidence = {
    timestamp: new Date().toISOString(),
    mode,
    cases: {},
    summary: {
        mode,
        sinkReproduced: false,
        voidReproduced: false,
        oscillationReproduced: false,
        oscillationEliminated: false,
        context2OscReproduced: false,
        mismatches: [],
        pageErrors: [],
    },
};

async function createAuditPage() {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    // Explicit harness-only favicon fixture, matching the F02/F03 probes.
    await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
    page.on('pageerror', e => evidence.summary.pageErrors.push(String(e)));
    page.on('console', msg => { if (msg.type() === 'error') evidence.summary.pageErrors.push(msg.text()); });
    await page.addInitScript(seededHarnessInit);
    await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    // Install base recorder
    await installRecorder(page);
    await page.evaluate((m) => { window.__AUDIT_MODE__ = m; }, mode);

    // Install forensic frame-inspector that saves complete RenderList ops per frame
    await page.evaluate(async () => {
        window.__AUDIT_FRAME_OPS__ = new Map(); // frame -> array of serialized ops

        if (!window.__AUDIT_HOOK_INSTALLED__) {
            window.__AUDIT_HOOK_INSTALLED__ = true;
            const { RenderList, RenderOpType } = await import('/engine/renderers/RenderList.ts');
            const { UnitFrameStore } = await import('/engine/renderers/frame/UnitFrame.ts');
            const { HexUtils } = await import('/engine/utils.ts');
            const { UNIT_FRAME, ISO_SCALE_Y } = await import('/constants.ts');

            const TNAME = RenderOpType;
            const orig = RenderList.prototype.sort;
            RenderList.prototype.sort = function () {
                orig.call(this);
                const f = window.__CG__?.frames?.() || 0;
                if (window.__WATCH_FRAMES__ && window.__WATCH_FRAMES__.has(f)) {
                    const ops = [];
                    for (let i = 0; i < this.count; i++) {
                        const op = this.ops[i];
                        ops.push({
                            index: i,
                            type: op.type,
                            typeName: TNAME[op.type] || '?',
                            y: op.y,
                            sortBias: op.sortBias,
                            sortKey: op.sortKey,
                            tx: op.tx,
                            ty: op.ty,
                            th: op.th,
                            z: op.z,
                            isGround: !!op.isGround,
                            agentId: op.agent ? op.agent.id : undefined,
                            unitFrame: op.unitFrame ? { footX: op.unitFrame.footX, footY: op.unitFrame.footY, groundH: op.unitFrame.groundH, hexUnderFoot: { ...op.unitFrame.hexUnderFoot }, sortFootY: op.unitFrame.sortFootY, hexCenterY: op.unitFrame.hexCenterY } : null,
                            tq: op.tq,
                            tr: op.tr,
                        });
                    }
                    window.__AUDIT_FRAME_OPS__.set(f, ops);
                }
            };

            window.__AUDIT_RESOLVE_LOGS__ = [];
            const origResolve = UnitFrameStore.prototype.resolveSortHex;
            UnitFrameStore.prototype.resolveSortHex = function (out, agent, footX, footY, mapConfig) {
                // resolve runs before RenderList.sort advances the recorder frame.
                const f = (window.__CG__?.frames?.() || 0) + 1;
                const prevMem = this.sortHex?.get(agent.id);
                const memBefore = prevMem ? {
                    q: prevMem.q, r: prevMem.r, stamp: prevMem.stamp, footY: prevMem.footY,
                    anchorX: prevMem.anchorX, anchorY: prevMem.anchorY, still: prevMem.still, released: prevMem.released
                } : null;
                const raw = HexUtils.fromPx(footX, footY, mapConfig);
                const ret = origResolve.call(this, out, agent, footX, footY, mapConfig);
                if (window.__WATCH_FRAMES__ && window.__WATCH_FRAMES__.has(f)) {
                    let branch = 'no_change';
                    let dNew = null, dOld = null, releaseCond = null, dist = null;
                    if (memBefore) {
                        const anchorMoved = Math.abs(footX - memBefore.anchorX) + Math.abs(footY - memBefore.anchorY) > UNIT_FRAME.STILL_PX;
                        const stillCount = anchorMoved ? 0 : memBefore.still + 1;
                        releaseCond = !(anchorMoved ? false : memBefore.released) && stillCount >= UNIT_FRAME.HEX_RELEASE_FRAMES;
                        dist = HexUtils.dist(raw, memBefore);
                        if (raw.q !== memBefore.q || raw.r !== memBefore.r) {
                            if (dist > 1) branch = 'dist_gt_1';
                            else if (releaseCond) branch = 'release_after_still';
                            else {
                                const cNew = HexUtils.toPx(raw.q, raw.r, mapConfig);
                                const cOld = HexUtils.toPx(memBefore.q, memBefore.r, mapConfig);
                                const isoScale = window.__AUDIT_MODE__ === 'after' ? ISO_SCALE_Y : 1.0;
                                dNew = Math.hypot(footX - cNew.x, (footY - cNew.y) / isoScale);
                                dOld = Math.hypot(footX - cOld.x, (footY - cOld.y) / isoScale);
                                if (dNew + UNIT_FRAME.HEX_HYSTERESIS_PX < dOld) branch = 'hysteresis_switch';
                                else branch = 'hysteresis_held';
                            }
                        }
                    }
                    window.__AUDIT_RESOLVE_LOGS__.push({
                        frame: f,
                        agentId: agent.id,
                        footX, footY,
                        raw: { q: raw.q, r: raw.r },
                        out: { q: out.q, r: out.r },
                        branch,
                        dist,
                        releaseCond,
                        dNew, dOld,
                        memBefore,
                        memAfter: {
                            q: ret.q, r: ret.r, stamp: ret.stamp, footY: ret.footY,
                            anchorX: ret.anchorX, anchorY: ret.anchorY, still: ret.still, released: ret.released
                        }
                    });
                }
                return ret;
            };
        }
    });

    return { ctx, page };
}


function verifyResolveTrace(label, frames, trace) {
    for (const frame of frames) {
        const sample = trace.find(t => t.frame === frame.frame);
        const rendered = frame.corpseOp?.unitFrame;
        if (!sample || !rendered || sample.footX !== rendered.footX || sample.footY !== rendered.footY || sample.out.q !== rendered.hexUnderFoot.q || sample.out.r !== rendered.hexUnderFoot.r) {
            evidence.summary.mismatches.push(label + ': resolve/render frame mismatch at ' + frame.frame);
            continue;
        }
        const before = sample.memBefore;
        const expected = ['dist_gt_1', 'release_after_still', 'hysteresis_switch'].includes(sample.branch) ? sample.raw : before;
        if (!expected || expected.q !== sample.out.q || expected.r !== sample.out.r) evidence.summary.mismatches.push(label + ': predicted branch differs from actual result at ' + frame.frame);
    }
}

function verifyEpisode(label, frames, hazardField, diagnostic, pair) {
    const mismatch = reason => { evidence.summary.mismatches.push(label + ': ' + reason); return false; };
    if (!diagnostic || JSON.stringify(diagnostic.pair) !== JSON.stringify(pair) || JSON.stringify(diagnostic.frames) !== JSON.stringify(frames.map(f => f.frame))) return mismatch('diagnostic pair/frame mismatch');
    const signs = [];
    for (let i = 0; i < frames.length; i++) {
        const a = frames[i].corpseOp, b = frames[i][hazardField];
        const expected = diagnostic.atFrames[i];
        if (!a || !b || !expected) return mismatch('missing corpse/hazard/sample');
        if (!Number.isFinite(a.sortKey) || !Number.isFinite(b.sortKey) || a.sortKey !== expected.A.sortKey || b.sortKey !== expected.B.sortKey) return mismatch('sort keys differ from diagnostic');
        const order = Math.sign(a.index - b.index);
        if (!order || order !== Math.sign(a.sortKey - b.sortKey)) return mismatch('dispatch order/key mismatch');
        signs.push(order);
    }
    if (signs[0] !== signs[2] || signs[0] === signs[1]) return mismatch('no A-B-A flip');
    console.log('[audit01] ' + label + ' reproduced: ' + diagnostic.frames.join('/') + '; moved=' + diagnostic.moved.join('/'));
    return true;
}

try {
    console.log('[audit01] Starting COORD01 Forensic Investigation...');

    // =========================================================================
    // CASE 1: SINK VIOLATION (FOREST seed 1001 frame 337 RED-0002)
    // =========================================================================
    console.log('\n--- Case 1: SINK VIOLATION (FOREST 1001 f337 RED-0002) ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'FOREST', seed: 1001, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([336, 337, 338]);
            window.__CG__.begin({ sink: true, flicker: false });
        });

        // Step up to frame 336 (before)
        await stepFrames(page, 336);
        const shot336 = join(outDir, 'case1_sink_f336.png');
        await page.screenshot({ path: shot336 });
        const f336Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'RED-0002');
            const ops = window.__AUDIT_FRAME_OPS__.get(336) || [];
            const unitOp = ops.find(o => o.agentId === 'RED-0002');
            return {
                agent: a ? { id: a.id, q: a.q, r: a.r, px: a.px, py: a.py, physics: { ...a.physics }, isMoving: a.isMoving, moveProgress: a.moveProgress } : null,
                unitOp,
                engineTime: e.battleTime,
            };
        });

        // Step to 337 (exact violation frame)
        await stepFrames(page, 1);
        const shot337 = join(outDir, 'case1_sink_f337.png');
        await page.screenshot({ path: shot337 });

        const f337Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'RED-0002');
            const ops = window.__AUDIT_FRAME_OPS__.get(337) || [];
            const unitOp = ops.find(o => o.agentId === 'RED-0002');
            const HexUtils = (await import('/engine/utils.ts')).HexUtils;
            const hex = HexUtils.fromPx(unitOp ? unitOp.tx : (a.px + a.physics.x), unitOp ? unitOp.y : (a.py + a.physics.y), e.mapConfig);
            const terrainOp = ops.find(o => o.typeName === 'TERRAIN' && o.tq === hex.q && o.tr === hex.r);
            const tileTop = terrainOp ? (terrainOp.ty - terrainOp.th + (unitOp.y - terrainOp.y)) : null;
            const delta = (unitOp && tileTop !== null) ? (unitOp.ty - tileTop) : null;
            return {
                agent: a ? { id: a.id, q: a.q, r: a.r, px: a.px, py: a.py, physics: { ...a.physics }, isMoving: a.isMoving, moveProgress: a.moveProgress, path: a.path } : null,
                footHex: hex,
                logicalHexHeight: e.getTerrainHeight(a.q, a.r),
                footHexHeight: e.getTerrainHeight(hex.q, hex.r),
                nextHexHeight: a.path && a.path.length > 0 ? e.getTerrainHeight(a.path[0].q, a.path[0].r) : null,
                unitOp,
                terrainOp,
                calculatedTileTop: tileTop,
                calculatedDelta: delta,
                engineTime: e.battleTime,
            };
        });

        // Step to 338 (after)
        await stepFrames(page, 1);
        const shot338 = join(outDir, 'case1_sink_f338.png');
        await page.screenshot({ path: shot338 });
        const f338Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'RED-0002');
            const ops = window.__AUDIT_FRAME_OPS__.get(338) || [];
            const unitOp = ops.find(o => o.agentId === 'RED-0002');
            return {
                agent: a ? { id: a.id, q: a.q, r: a.r, px: a.px, py: a.py, physics: { ...a.physics }, isMoving: a.isMoving, moveProgress: a.moveProgress } : null,
                unitOp,
                engineTime: e.battleTime,
            };
        });

        // Step to 400 and finish probe
        await stepFrames(page, 62);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const worst = cgEnd.sink.worst[0];

        if (!f337Data.unitOp) {
            console.error('[audit01] REPRO_MISMATCH: RED-0002 unitOp not found at frame 337');
            evidence.summary.mismatches.push('SINK: unitOp not found');
        } else if (!worst || worst.frame !== 337 || worst.agent !== 'RED-0002') {
            console.error(`[audit01] REPRO_MISMATCH: worst event mismatch: got ${JSON.stringify(worst)}`);
            evidence.summary.mismatches.push('SINK: worst event mismatch');
        } else if (!Number.isFinite(f337Data.calculatedDelta) || Math.abs(f337Data.calculatedDelta - worst.delta) > 0.01 || Math.abs(f337Data.unitOp.ty - worst.unitTy) > 0.01 || f337Data.footHex.q !== worst.q || f337Data.footHex.r !== worst.r) {
            evidence.summary.mismatches.push("SINK: captured sample differs from diagnostic");
        } else {
            console.log(`[audit01] SINK verified: agent=RED-0002 frame=337 delta=${f337Data.calculatedDelta?.toFixed(2)}px (worst delta=${worst.delta})`);
            console.log(`         tileTop=${f337Data.calculatedTileTop?.toFixed(2)} unitTy=${f337Data.unitOp.ty.toFixed(2)} moveProgress=${f337Data.agent.moveProgress}`);
            console.log(`         logicalH=${f337Data.logicalHexHeight} footH=${f337Data.footHexHeight} nextH=${f337Data.nextHexHeight}`);
            evidence.summary.sinkReproduced = true;
        }

        evidence.cases.sink = {
            f336: f336Data,
            f337: f337Data,
            f338: f338Data,
            worstDiagnostic: worst,
            screenshots: { f336: shot336, f337: shot337, f338: shot338 },
            screenshot: shot337,
        };

        await ctx.close();
    }

    // =========================================================================
    // CASE 2: OVER-VOID VIOLATION (FOREST seed 1002 frame 512 BLU-0007)
    // =========================================================================
    console.log('\n--- Case 2: OVER-VOID VIOLATION (FOREST 1002 f512 BLU-0007) ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'FOREST', seed: 1002, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([511, 512, 513]);
            window.__CG__.begin({ sink: true, flicker: false });
        });

        // Advance to 511 (before)
        await stepFrames(page, 511);
        const shot511 = join(outDir, 'case2_void_f511.png');
        await page.screenshot({ path: shot511 });
        const f511Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'BLU-0007');
            const ops = window.__AUDIT_FRAME_OPS__.get(511) || [];
            const unitOp = ops.find(o => o.agentId === 'BLU-0007');
            return {
                agent: a ? { id: a.id, hp: a.hp, q: a.q, r: a.r, px: a.px, py: a.py, physics: { ...a.physics }, banished: a.banished, outOfBounds: a.outOfBounds } : null,
                unitOp,
                engineTime: e.battleTime,
            };
        });

        // Step to 512 (exact void sample frame: pz = 0.42px, falling outside map)
        await stepFrames(page, 1);
        const shot512 = join(outDir, 'case2_void_f512.png');
        await page.screenshot({ path: shot512 });

        const f512Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'BLU-0007');
            const ops = window.__AUDIT_FRAME_OPS__.get(512) || [];
            const unitOp = ops.find(o => o.agentId === 'BLU-0007');
            const HexUtils = (await import('/engine/utils.ts')).HexUtils;
            const footHex = unitOp ? HexUtils.fromPx(unitOp.tx, unitOp.y, e.mapConfig) : null;
            const terrainAtFoot = footHex ? e.map.isValid(footHex.q, footHex.r) : false;
            return {
                agent: a ? {
                    id: a.id, hp: a.hp, q: a.q, r: a.r, px: a.px, py: a.py,
                    physics: { ...a.physics },
                    banished: a.banished, outOfBounds: a.outOfBounds, deathTimer: a.deathTimer,
                    isGroundValid: e.map.isValid(a.q, a.r),
                } : null,
                footHex,
                terrainAtFoot,
                unitOp,
                engineTime: e.battleTime,
            };
        });

        // Step to 513 (after)
        await stepFrames(page, 1);
        const shot513 = join(outDir, 'case2_void_f513.png');
        await page.screenshot({ path: shot513 });
        const f513Data = await page.evaluate(async () => {
            const e = window.__TACTICAL_ENGINE__;
            const a = e.agents.find(ag => ag.id === 'BLU-0007');
            const ops = window.__AUDIT_FRAME_OPS__.get(513) || [];
            const unitOp = ops.find(o => o.agentId === 'BLU-0007');
            return {
                agent: a ? { id: a.id, hp: a.hp, q: a.q, r: a.r, physics: { ...a.physics }, banished: a.banished, outOfBounds: a.outOfBounds } : null,
                unitOp,
                engineTime: e.battleTime,
            };
        });

        // Track full trajectory down to outOfBounds across frames 514..540
        const voidTrajectory = [
            { frame: 511, pz: f511Data.agent?.physics?.z, vz: f511Data.agent?.physics?.vz, hp: f511Data.agent?.hp, outOfBounds: f511Data.agent?.outOfBounds },
            { frame: 512, pz: f512Data.agent?.physics?.z, vz: f512Data.agent?.physics?.vz, hp: f512Data.agent?.hp, outOfBounds: f512Data.agent?.outOfBounds },
            { frame: 513, pz: f513Data.agent?.physics?.z, vz: f513Data.agent?.physics?.vz, hp: f513Data.agent?.hp, outOfBounds: f513Data.agent?.outOfBounds },
        ];
        for (let nextF = 514; nextF <= 540; nextF++) {
            await stepFrames(page, 1);
            const stepData = await page.evaluate((curF) => {
                const e = window.__TACTICAL_ENGINE__;
                const a = e.agents.find(ag => ag.id === 'BLU-0007');
                return a ? {
                    frame: curF,
                    pz: +a.physics.z.toFixed(2),
                    vz: +a.physics.vz.toFixed(1),
                    hp: a.hp,
                    outOfBounds: a.outOfBounds,
                    banished: a.banished,
                    deathTimer: +a.deathTimer.toFixed(3),
                    isGroundValid: e.map.isValid(a.q, a.r),
                } : null;
            }, nextF);
            if (stepData) voidTrajectory.push(stepData);
        }

        // Advance to 600 to finish probe run
        await stepFrames(page, 600 - 540);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const voidWorst = cgEnd.sink.voidWorst[0];

        if (!f512Data.unitOp) {
            console.error('[audit01] REPRO_MISMATCH: BLU-0007 unitOp not found at frame 512');
            evidence.summary.mismatches.push('VOID: unitOp not found');
        } else if (!voidWorst || voidWorst.frame !== 512 || voidWorst.agent !== 'BLU-0007') {
            console.error(`[audit01] REPRO_MISMATCH: voidWorst event mismatch: got ${JSON.stringify(voidWorst)}`);
            evidence.summary.mismatches.push('VOID: voidWorst event mismatch');
        } else if (f512Data.terrainAtFoot || !f512Data.footHex || f512Data.footHex.q !== voidWorst.hex[0] || f512Data.footHex.r !== voidWorst.hex[1] || Math.abs(f512Data.agent.physics.z - voidWorst.physicsZ) > 0.01) {
            evidence.summary.mismatches.push("VOID: captured sample differs from diagnostic");
        } else {
            console.log(`[audit01] VOID verified: agent=BLU-0007 frame=512 hp=${f512Data.agent.hp} pz=${f512Data.agent.physics.z.toFixed(2)} vz=${f512Data.agent.physics.vz.toFixed(1)}`);
            console.log(`         footHex=[${f512Data.footHex?.q}, ${f512Data.footHex?.r}] terrainAtFoot=${f512Data.terrainAtFoot} logicalValid=${f512Data.agent.isGroundValid}`);
            console.log(`         vx=${f512Data.agent.physics.vx.toFixed(1)} vy=${f512Data.agent.physics.vy.toFixed(1)}`);
            evidence.summary.voidReproduced = true;
        }

        evidence.cases.void = {
            f511: f511Data,
            f512: f512Data,
            f513: f513Data,
            voidWorstDiagnostic: voidWorst,
            voidTrajectory,
            screenshots: { f511: shot511, f512: shot512, f513: shot513 },
            screenshot: shot512,
        };

        await ctx.close();
    }

    // =========================================================================
    // CASE 3: STATIC OSCILLATION (VOID seed 1002 frames 507/508/510 C:RED-0010 vs Hazard)
    // =========================================================================
    console.log('\n--- Case 3: STATIC OSCILLATION (VOID 1002 f507/508/510 C:RED-0010) ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'VOID', seed: 1002, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([506, 507, 508, 509, 510]);
            window.__CG__.begin({ sink: true, flicker: true });
        });

        // Capture all three frames of the diagnostic A-B-A episode.
        await stepFrames(page, 506);

        const oscFrames = [];
        let previousFrame = 506;
        for (const f of [507, 508, 510]) {
            await stepFrames(page, f - previousFrame);
            previousFrame = f;
            const shotPath = join(outDir, `case3_osc_f${f}.png`);
            await page.screenshot({ path: shotPath });

            const frameInfo = await page.evaluate(async (curF) => {
                const e = window.__TACTICAL_ENGINE__;
                const a = e.agents.find(ag => ag.id === 'RED-0010');
                const ops = window.__AUDIT_FRAME_OPS__.get(curF) || [];
                const corpseOp = ops.find(o => o.typeName === 'CORPSE' && o.agentId === 'RED-0010');
                const hazard1 = ops.find(o => o.typeName === 'HAZARD' && o.tq === 1 && o.tr === 2);
                const hazard2 = ops.find(o => o.typeName === 'HAZARD' && o.tq === 2 && o.tr === 2);
                return {
                    frame: curF,
                    agent: a ? { id: a.id, hp: a.hp, deathTimer: a.deathTimer, px: a.px, py: a.py, physics: { ...a.physics } } : null,
                    corpseOp,
                    hazard1,
                    hazard2,
                    engineTime: e.battleTime,
                };
            }, f);

            frameInfo.screenshot = shotPath;
            oscFrames.push(frameInfo);
        }

        // Advance to 600 to finish flicker analysis
        await stepFrames(page, 90);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const corpseHazardGroup = cgEnd.flicker['CORPSE×HAZARD'];
        const exStatic = corpseHazardGroup?.exStatic?.find(e => e.pair.includes('C:RED-0010'));

        const resolveLogs = await page.evaluate(() => {
            return (window.__AUDIT_RESOLVE_LOGS__ || []).filter(l => l.agentId === 'RED-0010');
        });

        if (process.argv.includes('--negative-control')) oscFrames[1].hazard1 = undefined;
        verifyResolveTrace('OSC static', oscFrames, resolveLogs);
        if (mode === 'after') {
            for (let i = 0; i < oscFrames.length; i++) {
                const a = oscFrames[i].corpseOp, b = oscFrames[i].hazard1;
                if (!a || !b) {
                    evidence.summary.mismatches.push('OSC static: missing corpse/hazard sample in after mode');
                    break;
                }
                if (!Number.isFinite(a.sortKey) || !Number.isFinite(b.sortKey)) {
                    evidence.summary.mismatches.push('OSC static: invalid sortKeys');
                    break;
                }
            }
            if (oscFrames[2].engineTime <= oscFrames[0].engineTime) {
                evidence.summary.mismatches.push('OSC static: engine time did not advance');
            }
            const staticCount = corpseHazardGroup?.staticEvents ?? 0;
            const signs = oscFrames.map(f => f.corpseOp && f.hazard1 ? Math.sign(f.corpseOp.index - f.hazard1.index) : 0);
            const hasAbaFlip = (signs[0] !== 0 && signs[0] === signs[2] && signs[0] === -signs[1]);
            if (hasAbaFlip) {
                evidence.summary.mismatches.push('OSC static: A-B-A flip still present in after mode: signs=' + signs.join(','));
            } else if (staticCount !== 0) {
                evidence.summary.mismatches.push(`OSC static: staticEvents not 0 (got ${staticCount})`);
            } else {
                console.log(`[audit01] OSC static eliminated in after mode: staticEvents=0, signs=${signs.join(',')}`);
                evidence.summary.oscillationEliminated = true;
            }
        } else {
            evidence.summary.oscillationReproduced = verifyEpisode('OSC static', oscFrames, 'hazard1', exStatic, ['C:RED-0010', 'H:1,2']);
        }

        evidence.cases.oscillation = {
            frames: oscFrames,
            probeExStatic: exStatic,
            resolveSortHexTrace: resolveLogs,
        };

        await ctx.close();
    }

    // =========================================================================
    // CASE 4: CONTEXT 2 FOR OSCILLATION (VOID seed 1001 frames 563/564/565 C:RED-0002 vs H:4,0)
    // =========================================================================
    console.log('\n--- Case 4: CONTEXT 2 FOR OSCILLATION / STATIC FLIP ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'VOID', seed: 1001, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([562, 563, 564, 565]);
            window.__CG__.begin({ sink: true, flicker: true });
        });

        await stepFrames(page, 562);

        const ctx2Frames = [];
        for (const f of [563, 564, 565]) {
            await stepFrames(page, 1);
            const shotPath = join(outDir, `case4_osc2_f${f}.png`);
            await page.screenshot({ path: shotPath });

            const frameInfo = await page.evaluate(async (curF) => {
                const e = window.__TACTICAL_ENGINE__;
                const a = e.agents.find(ag => ag.id === 'RED-0002');
                const ops = window.__AUDIT_FRAME_OPS__.get(curF) || [];
                const corpseOp = ops.find(o => o.typeName === 'CORPSE' && o.agentId === 'RED-0002');
                const hazardOp = ops.find(o => o.typeName === 'HAZARD' && o.tq === 4 && o.tr === 0);
                return {
                    frame: curF,
                    agent: a ? { id: a.id, hp: a.hp, deathTimer: a.deathTimer, px: a.px, py: a.py } : null,
                    corpseOp,
                    hazardOp,
                    engineTime: e.battleTime,
                };
            }, f);
            frameInfo.screenshot = shotPath;
            ctx2Frames.push(frameInfo);
        }

        await stepFrames(page, 35);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const exMoved = cgEnd.flicker['CORPSE×HAZARD']?.exMoved?.find(e => e.pair.includes('C:RED-0002'));

        const resolveLogsCtx2 = await page.evaluate(() => {
            return (window.__AUDIT_RESOLVE_LOGS__ || []).filter(l => l.agentId === 'RED-0002');
        });

        verifyResolveTrace('OSC moved', ctx2Frames, resolveLogsCtx2);
        if (mode === 'after') {
            const hasOps = ctx2Frames.every(f => f.corpseOp && f.hazardOp);
            if (!hasOps) {
                evidence.summary.mismatches.push('OSC moved: missing ops in after mode');
            } else {
                const signs = ctx2Frames.map(f => Math.sign(f.corpseOp.index - f.hazardOp.index));
                console.log(`[audit01] OSC moved recorded in after mode: signs=${signs.join(',')}, exMoved=${exMoved ? 'present' : 'none'}`);
                evidence.summary.context2OscReproduced = true;
            }
        } else {
            evidence.summary.context2OscReproduced = verifyEpisode('OSC moved', ctx2Frames, 'hazardOp', exMoved, ['C:RED-0002', 'H:4,0']);
        }

        evidence.cases.oscillationContext2 = {
            frames: ctx2Frames,
            probeExMoved: exMoved,
            resolveSortHexTrace: resolveLogsCtx2,
        };

        await ctx.close();
    }

    if (evidence.summary.pageErrors.length) evidence.summary.mismatches.push('Browser errors');
    // Write final structured evidence
    const evidencePath = join(outDir, 'coord01_evidence.json');
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf-8');
    console.log(`\n[audit01] All evidence written to ${evidencePath}`);

    if (evidence.summary.mismatches.length > 0) {
        console.error(`[audit01] REPRO_MISMATCH detected: ${evidence.summary.mismatches.join('; ')}`);
        process.exitCode = 1;
    } else {
        if (mode === 'after') {
            console.log('[audit01] AFTER mode verified: static oscillation eliminated, moved recorded, existing sink/void intact.');
        } else {
            console.log('[audit01] Diagnostic episodes reproduced; root causes are NOT asserted by this probe.');
        }
    }

} catch (err) {
    console.error('[audit01] Fatal execution error:', err);
    process.exitCode = 1;
    writeFileSync(join(outDir, "failure.json"), JSON.stringify({ error: String(err), summary: evidence.summary }, null, 2));
} finally {
    try { await browser.close(); } finally { await server.close(); }
}
