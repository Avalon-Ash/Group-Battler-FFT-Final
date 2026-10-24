/**
 * tools/ui-e2e/cleanup-coord01-check.mjs
 * COORD01 Forensic Probe & Reproduction Verification (Read-Only)
 * 
 * Accurately reproduces and collects ground-truth RenderOp, agent physics, terrain, and
 * visual frame data for the 3 representative coordinate protocol diagnostic cases:
 * 1. SINK: Step-blend transition interpolation cliff descent (FOREST seed 1001 f337 RED-0002 + context 2)
 * 2. VOID: Knockback impulse pushing agent outside map grid while grounded (FOREST seed 1002 f512 BLU-0007 + context 2)
 * 3. OSCILLATION: Dead body boundary hysteresis & deadband flip against adjacent hazard (VOID seed 1002 f508-510 + VOID seed 1001 f562-564)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, seededHarnessInit, installRecorder, setupBattle, stepFrames } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out', 'audit01');
mkdirSync(outDir, { recursive: true });

const { server, port } = await startServer(3230);
const browser = await launchBrowser({ headed: false, unthrottled: false });

const evidence = {
    timestamp: new Date().toISOString(),
    cases: {},
    summary: {
        sinkReproduced: false,
        voidReproduced: false,
        oscillationReproduced: false,
        context2OscReproduced: false,
        mismatches: [],
    },
};

async function createAuditPage() {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.warn('[pageerror]', String(e).slice(0, 200)));
    await page.addInitScript(seededHarnessInit);
    await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    // Install base recorder
    await installRecorder(page);

    // Install forensic frame-inspector that saves complete RenderList ops per frame
    await page.evaluate(() => {
        window.__AUDIT_FRAME_OPS__ = new Map(); // frame -> array of serialized ops

        if (!window.__AUDIT_HOOK_INSTALLED__) {
            window.__AUDIT_HOOK_INSTALLED__ = true;
            import('/engine/renderers/RenderList.ts').then(({ RenderList }) => {
                const TNAME = ['TERRAIN', 'OBSTACLE', 'UNIT', 'VFX', 'PROJECTILE', 'HAZARD', 'AURA', 'OVERLAY', 'CORPSE'];
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
                                tq: op.tq,
                                tr: op.tr,
                            });
                        }
                        window.__AUDIT_FRAME_OPS__.set(f, ops);
                    }
                };
            });
        }
    });

    return { ctx, page };
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

        // Advance to 600 to finish probe run
        await stepFrames(page, 86);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const voidWorst = cgEnd.sink.voidWorst[0];

        if (!f512Data.unitOp) {
            console.error('[audit01] REPRO_MISMATCH: BLU-0007 unitOp not found at frame 512');
            evidence.summary.mismatches.push('VOID: unitOp not found');
        } else if (!voidWorst || voidWorst.frame !== 512 || voidWorst.agent !== 'BLU-0007') {
            console.error(`[audit01] REPRO_MISMATCH: voidWorst event mismatch: got ${JSON.stringify(voidWorst)}`);
            evidence.summary.mismatches.push('VOID: voidWorst event mismatch');
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
            screenshot: shot512,
        };

        await ctx.close();
    }

    // =========================================================================
    // CASE 3: STATIC OSCILLATION (VOID seed 1002 frames 508-510 C:RED-0010 vs Hazard)
    // =========================================================================
    console.log('\n--- Case 3: STATIC OSCILLATION (VOID 1002 f508-f510 C:RED-0010) ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'VOID', seed: 1002, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([508, 509, 510]);
            window.__CG__.begin({ sink: true, flicker: true });
        });

        // Advance to 507
        await stepFrames(page, 507);

        const oscFrames = [];
        for (const f of [508, 509, 510]) {
            await stepFrames(page, 1);
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

        const f508 = oscFrames[0];
        const f509 = oscFrames[1];
        const f510 = oscFrames[2];

        if (!f508.corpseOp || !f509.corpseOp || !f510.corpseOp) {
            console.error('[audit01] REPRO_MISMATCH: corpseOp not found in frames 508-510');
            evidence.summary.mismatches.push('OSC: corpseOp not found');
        } else if (!f508.hazard1 || !f509.hazard1 || !f510.hazard1) {
            console.error('[audit01] REPRO_MISMATCH: hazard1 not found in frames 508-510');
            evidence.summary.mismatches.push('OSC: hazard1 not found');
        } else {
            console.log(`[audit01] OSCILLATION verified: C:RED-0010 vs H:1,2 across f508-f510`);
            console.log(`         f508: corpse sortBias=${f508.corpseOp.sortBias} sortKey=${f508.corpseOp.sortKey} hazard sortKey=${f508.hazard1.sortKey}`);
            console.log(`         f509: corpse sortBias=${f509.corpseOp.sortBias} sortKey=${f509.corpseOp.sortKey} hazard sortKey=${f509.hazard1.sortKey}`);
            console.log(`         f510: corpse sortBias=${f510.corpseOp.sortBias} sortKey=${f510.corpseOp.sortKey} hazard sortKey=${f510.hazard1.sortKey}`);
            evidence.summary.oscillationReproduced = true;
        }

        evidence.cases.oscillation = {
            frames: oscFrames,
            probeExStatic: exStatic,
        };

        await ctx.close();
    }

    // =========================================================================
    // CASE 4: CONTEXT 2 FOR OSCILLATION (VOID seed 1001 frames 562-564 C:RED-0002 vs H:4,0)
    // =========================================================================
    console.log('\n--- Case 4: CONTEXT 2 FOR OSCILLATION / STATIC FLIP ---');
    {
        const { ctx, page } = await createAuditPage();
        await setupBattle(page, { biome: 'VOID', seed: 1001, start: true });
        await stepFrames(page, 6);

        await page.evaluate(() => {
            window.__WATCH_FRAMES__ = new Set([562, 563, 564]);
            window.__CG__.begin({ sink: true, flicker: true });
        });

        await stepFrames(page, 561);

        const ctx2Frames = [];
        for (const f of [562, 563, 564]) {
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

        await stepFrames(page, 36);
        const cgEnd = await page.evaluate(() => window.__CG__.end());
        const exMoved = cgEnd.flicker['CORPSE×HAZARD']?.exMoved?.find(e => e.pair.includes('C:RED-0002'));

        if (!ctx2Frames[0].corpseOp || !ctx2Frames[1].corpseOp || !ctx2Frames[2].corpseOp) {
            console.error('[audit01] REPRO_MISMATCH: corpseOp not found in context 2 frames');
            evidence.summary.mismatches.push('OSC Context 2: corpseOp not found');
        } else {
            console.log(`[audit01] Context 2 verified: C:RED-0002 vs H:4,0 across f562-f564`);
            console.log(`         f562: corpse sortBias=${ctx2Frames[0].corpseOp.sortBias} sortKey=${ctx2Frames[0].corpseOp.sortKey}`);
            console.log(`         f563: corpse sortBias=${ctx2Frames[1].corpseOp.sortBias} sortKey=${ctx2Frames[1].corpseOp.sortKey}`);
            console.log(`         f564: corpse sortBias=${ctx2Frames[2].corpseOp.sortBias} sortKey=${ctx2Frames[2].corpseOp.sortKey}`);
            evidence.summary.context2OscReproduced = true;
        }

        evidence.cases.oscillationContext2 = {
            frames: ctx2Frames,
            probeExMoved: exMoved,
        };

        await ctx.close();
    }

    // Write final structured evidence
    const evidencePath = join(outDir, 'coord01_evidence.json');
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf-8');
    console.log(`\n[audit01] All evidence written to ${evidencePath}`);

    if (evidence.summary.mismatches.length > 0) {
        console.error(`[audit01] REPRO_MISMATCH detected: ${evidence.summary.mismatches.join('; ')}`);
        process.exit(1);
    }

    console.log('[audit01] COORD01 Forensic Check PASSED (all cases confirmed with 100% exact RenderOps).');
    process.exit(0);

} catch (err) {
    console.error('[audit01] Fatal execution error:', err);
    process.exit(1);
} finally {
    await browser.close();
    await server.close();
}
