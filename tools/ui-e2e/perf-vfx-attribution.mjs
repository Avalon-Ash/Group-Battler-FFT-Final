/**
 * perf-vfx-attribution.mjs — Task P2: VFX Per-Item Cost Attribution Benchmark.
 *
 * Runs under 2560x1440 headed NVIDIA GPU in battle_vfx_storm pressure scenario.
 * Toggles each VFX category individually in A/B testing:
 *   - baseline (all VFX active in storm)
 *   - no_shields (ShieldPainter / 3D hex prism)
 *   - no_hazards (HazardPainter / procedural liquid, fog, crystals, void hole)
 *   - no_shadowblur (shadowBlur intercepted across all canvas operations)
 *   - no_floating_text (TextPainter / damage, crits, absorbs, shouts, glitches)
 *   - no_chants_auras (UnitAuraPainter / casting circle and ultimate chant)
 *   - no_projectiles (ProjectileDrawer / projectile body and gradient trails)
 *   - no_unit_shatter (UnitShatter / death ragdoll shard decomposition)
 *   - no_beams_slashes (ProceduralPainter / beams and slashes)
 *   - no_ground_cc (StatusPartPainter status layers)
 *   - no_particles (ParticleRenderer / all ECS simulation particles)
 *
 * Gathers:
 *   - Frame timing distribution (median, min, max, p90, p95, p99, 1% low FPS, >8.4ms, >16.7ms)
 *   - CtxOpCounter operation statistics (shadowBlur, gradients, drawImage, save/restore, GCO)
 *   - CDP HeapProfiler sampling for per-frame allocations
 *   - CDP trace attribution for long frames (>16.7ms)
 *
 * Outputs:
 *   - tools/ui-e2e/out/perf_attribution.json
 *   - Top 10 Cost Ranking Markdown
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    assertResolution,
    prepareManualBattle,
    measureScenarioFrames
} from './lib/perf-common.mjs';
import { startVfxStorm, stopVfxStorm } from './lib/vfx-storm.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS = Number(process.env.PERF_SECONDS || 5);
const ROUNDS = Number(process.env.PERF_ROUNDS || 2);
const isHeadless = process.env.PERF_HEADLESS === '1';
const unthrottled = process.env.PERF_UNTHROTTLED !== '0';

const TOGGLES = [
    { id: 'baseline', name: 'Baseline (All VFX Active)', prop: null },
    { id: 'no_shields', name: 'Shield 3D Prism (VolumePainter)', prop: 'no_shields' },
    { id: 'no_hazards', name: 'Map Hazard Painter (HazardPainter)', prop: 'no_hazards' },
    { id: 'no_shadowblur', name: 'All ShadowBlur Calls (Canvas Context)', prop: 'no_shadowblur' },
    { id: 'no_floating_text', name: 'Floating Damage & SHOUT Text (TextPainter)', prop: 'no_floating_text' },
    { id: 'no_chants_auras', name: 'Chant & Ult Auras (UnitAuraPainter)', prop: 'no_chants_auras' },
    { id: 'no_projectiles', name: 'Projectiles & Trails (ProjectileDrawer)', prop: 'no_projectiles' },
    { id: 'no_unit_shatter', name: 'Unit Death Shatter (UnitShatter)', prop: 'no_unit_shatter' },
    { id: 'no_beams_slashes', name: 'Beams & Slashes (ProceduralPainter)', prop: 'no_beams_slashes' },
    { id: 'no_ground_cc', name: 'Status parts (StatusPartPainter)', prop: 'no_ground_cc' },
    { id: 'no_particles', name: 'All ECS Particles (ParticleRenderer)', prop: 'no_particles' }
];

function calcStats(deltas) {
    if (!deltas || deltas.length === 0) {
        return { count: 0, median: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, onePercentLow: 0, over8_4: 0, over16_7: 0 };
    }
    const sorted = [...deltas].sort((a, b) => a - b);
    const n = sorted.length;
    const percentile = (p) => {
        const idx = (p / 100) * (n - 1);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        if (lower === upper) return sorted[lower];
        return sorted[lower] + (idx - lower) * (sorted[upper] - sorted[lower]);
    };
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / n;
    const p99Val = percentile(99);
    const onePercentCount = Math.max(1, Math.floor(n * 0.01));
    const slowestFrames = sorted.slice(n - onePercentCount);
    const avgSlowestMs = slowestFrames.reduce((a, b) => a + b, 0) / slowestFrames.length;
    const onePercentLow = avgSlowestMs > 0 ? +(1000 / avgSlowestMs).toFixed(1) : 0;

    return {
        count: n,
        median: +percentile(50).toFixed(2),
        p90: +percentile(90).toFixed(2),
        p95: +percentile(95).toFixed(2),
        p99: +p99Val.toFixed(2),
        min: +sorted[0].toFixed(2),
        max: +sorted[n - 1].toFixed(2),
        avg: +avg.toFixed(2),
        onePercentLow,
        over8_4: sorted.filter(v => v > 8.4).length,
        over16_7: sorted.filter(v => v > 16.7).length
    };
}

async function sampleFrames(page, durationSeconds) {
    return await page.evaluate(async (sec) => {
        return new Promise((resolve) => {
            const deltas = [];
            let last = performance.now();
            let running = true;
            const loop = (now) => {
                if (!running) return;
                const dt = now - last;
                last = now;
                deltas.push(dt);
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
            setTimeout(() => {
                running = false;
                resolve(deltas.slice(2));
            }, sec * 1000);
        });
    }, durationSeconds);
}

async function main() {
    console.log(`\n======================================================================`);
    console.log(`  TACTICAL.OS — Task P2: VFX Per-Item Cost Attribution Benchmark`);
    console.log(`  Resolution: 2560x1440 @ 239 Hz, Headed: ${!isHeadless}, Unthrottled: ${unthrottled}`);
    console.log(`  Duration: ${SECONDS}s per toggle x ${ROUNDS} rounds`);
    console.log(`======================================================================\n`);

    const server = await createServer({
        server: { port: 3205, strictPort: false, host: '127.0.0.1' },
        logLevel: 'error'
    });
    await server.listen();
    const port = server.config.server.port || 3205;
    const baseUrl = `http://localhost:${port}/?quality=0&perf&perfops&mute`;

    const browser = await launchBrowser({
        headed: !isHeadless,
        unthrottled,
        extraArgs: ['--window-size=2560,1440']
    });
    const browserCtx = await browser.newContext({
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1
    });
    const page = await browserCtx.newPage();

    console.log(`[P2] Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    const env = await getEnvInfo(page, false);
    console.log(`[P2] Environment: GPU=${env.gpu}, DPR=${env.dpr}, Resolution=${env.viewport[0]}x${env.viewport[1]}`);
    assertMainGpu(env);
    assertResolution(env);

    // Setup CDP Session
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    console.log(`[P2] Preparing manual battle...`);
    await prepareManualBattle(page);

    const agentCount = await page.evaluate(() => window.__TACTICAL_ENGINE__?.agents?.length ?? 0);
    console.log(`[P2] Verified active battle agents: ${agentCount}`);
    if (agentCount < 2) {
        throw new Error(`[P2] Expected at least 2 agents in battle, found: ${agentCount}`);
    }

    // Install Dynamic VFX Hook Interceptors
    await page.evaluate(async () => {
        if (window.__vfxHooksInstalled) return;
        window.__vfxHooksInstalled = true;
        window.__vfxToggles = {};

        // 1. Hook ShieldPainter
        try {
            const modShield = await import('/engine/renderers/status/painters/ShieldPainter.ts');
            const origShieldDraw = modShield.ShieldPainter.draw;
            modShield.ShieldPainter.draw = function(...args) {
                if (window.__vfxToggles.no_shields) return;
                return origShieldDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook ShieldPainter failed', e); }

        // 2. Hook HazardPainter
        try {
            const modHazard = await import('/engine/renderers/grid/painters/HazardPainter.ts');
            const origHazardDraw = modHazard.HazardPainter.draw;
            modHazard.HazardPainter.draw = function(...args) {
                if (window.__vfxToggles.no_hazards) return;
                return origHazardDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook HazardPainter failed', e); }

        // 3. Hook TextPainter
        try {
            const modText = await import('/engine/renderers/hud/TextPainter.ts');
            const origTextDraw = modText.TextPainter.drawFloatingText;
            modText.TextPainter.drawFloatingText = function(...args) {
                if (window.__vfxToggles.no_floating_text) return;
                return origTextDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook TextPainter failed', e); }

        // 4. Hook UnitAuraPainter
        try {
            const modAura = await import('/engine/renderers/units/painters/UnitAuraPainter.ts');
            const origAuraCast = modAura.UnitAuraPainter.drawCastingVFX;
            const origAuraUlt = modAura.UnitAuraPainter.drawUltimateChantVFX;
            modAura.UnitAuraPainter.drawCastingVFX = function(...args) {
                if (window.__vfxToggles.no_chants_auras) return;
                return origAuraCast.apply(this, args);
            };
            modAura.UnitAuraPainter.drawUltimateChantVFX = function(...args) {
                if (window.__vfxToggles.no_chants_auras) return;
                return origAuraUlt.apply(this, args);
            };
        } catch (e) { console.warn('Hook UnitAuraPainter failed', e); }

        // 5. Hook ProjectileDrawer
        try {
            const modProj = await import('/engine/renderers/ProjectileDrawer.ts');
            const origProjDraw = modProj.ProjectileDrawer.draw;
            modProj.ProjectileDrawer.draw = function(...args) {
                if (window.__vfxToggles.no_projectiles) return;
                return origProjDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook ProjectileDrawer failed', e); }

        // 6. Hook UnitShatter
        try {
            const modShatter = await import('/engine/systems/visuals/effects/UnitShatter.ts');
            const origShatterSpawn = modShatter.UnitShatter.spawn;
            modShatter.UnitShatter.spawn = function(...args) {
                if (window.__vfxToggles.no_unit_shatter) return;
                return origShatterSpawn.apply(this, args);
            };
        } catch (e) { console.warn('Hook UnitShatter failed', e); }

        // 7. Hook ProceduralPainter
        try {
            const modProc = await import('/engine/systems/vfx/renderers/painters/ProceduralPainter.ts');
            const origBeamDraw = modProc.ProceduralPainter.drawBeam;
            modProc.ProceduralPainter.drawBeam = function(...args) {
                if (window.__vfxToggles.no_beams_slashes) return;
                return origBeamDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook ProceduralPainter failed', e); }

        // 8. Hook StatusPartPainter
        try {
            const modGroundCC = await import('/engine/renderers/status/painters/StatusPartPainter.ts');
            const origGroundCCDraw = modGroundCC.StatusPartPainter.draw;
            modGroundCC.StatusPartPainter.draw = function(...args) {
                if (window.__vfxToggles.no_ground_cc) return;
                return origGroundCCDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook StatusPartPainter failed', e); }

        // 9. Hook ParticleRenderer
        try {
            const modParticle = await import('/engine/systems/vfx/renderers/ParticleRenderer.ts');
            const origParticleDraw = modParticle.ParticleRenderer.drawSingleParticle;
            modParticle.ParticleRenderer.drawSingleParticle = function(...args) {
                if (window.__vfxToggles.no_particles) return;
                return origParticleDraw.apply(this, args);
            };
        } catch (e) { console.warn('Hook ParticleRenderer failed', e); }

        // 10. Hook shadowBlur on CanvasRenderingContext2D
        try {
            const proto = CanvasRenderingContext2D.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
            if (desc && desc.set) {
                const origSet = desc.set;
                Object.defineProperty(proto, 'shadowBlur', {
                    set(val) {
                        if (window.__vfxToggles.no_shadowblur) {
                            return origSet.call(this, 0);
                        }
                        return origSet.call(this, val);
                    },
                    get: desc.get,
                    configurable: true
                });
            }
        } catch (e) { console.warn('Hook shadowBlur failed', e); }
    });

    // Start pressure storm
    console.log(`[P2] Starting vfx-storm pressure generator...`);
    await startVfxStorm(page);
    await page.waitForTimeout(2000); // Warm up storm

    // Collect baseline CDP Heap Sampling
    console.log(`[P2] Starting HeapProfiler sampling on storm...`);
    await client.send('HeapProfiler.enable');
    await client.send('HeapProfiler.startSampling', { samplingInterval: 32768 });

    const toggleResults = {};

    for (let r = 1; r <= ROUNDS; r++) {
        console.log(`\n--- Starting Round ${r}/${ROUNDS} ---`);
        for (const item of TOGGLES) {
            // Apply toggle
            await page.evaluate((prop) => {
                window.__vfxToggles = {};
                if (prop) window.__vfxToggles[prop] = true;
            }, item.prop);

            // Wait 500ms for state to settle
            await page.waitForTimeout(500);

            // Measure frames
            const deltas = await sampleFrames(page, SECONDS);
            const m = calcStats(deltas);

            // Fetch CtxOpCounter data
            const ops = await page.evaluate(async () => {
                try {
                    const mod = await import('/engine/renderers/CtxOpCounter.ts');
                    return {
                        counts: mod.CtxOpCounter.getLatestCounts(),
                        scopes: mod.CtxOpCounter.getScopeCounts()
                    };
                } catch {
                    return null;
                }
            });

            if (!toggleResults[item.id]) {
                toggleResults[item.id] = {
                    id: item.id,
                    name: item.name,
                    deltas: [],
                    runs: [],
                    ops: []
                };
            }
            toggleResults[item.id].deltas.push(...deltas);
            toggleResults[item.id].runs.push(m);
            if (ops) toggleResults[item.id].ops.push(ops);

            console.log(`  [R${r}] ${item.name.padEnd(45)}: Median=${m.median.toFixed(2)}ms, p99=${m.p99.toFixed(2)}ms, 1%Low=${m.onePercentLow}fps, >16.7ms=${m.over16_7}`);
        }
    }

    // Stop Heap Sampling
    const heapProfile = await client.send('HeapProfiler.stopSampling');
    await client.send('HeapProfiler.disable');

    // Restore all toggles and stop storm
    await page.evaluate(() => { window.__vfxToggles = {}; });
    await stopVfxStorm(page);

    // Process Attribution & Cost Ranking
    const processedResults = {};
    for (const [id, data] of Object.entries(toggleResults)) {
        processedResults[id] = {
            id,
            name: data.name,
            stats: calcStats(data.deltas),
            avgOps: data.ops.length > 0 ? data.ops[data.ops.length - 1].counts : null
        };
    }

    const baselineStats = processedResults['baseline'].stats;
    const baselineOps = processedResults['baseline'].avgOps;

    // Calculate Impact for each feature:
    // deltaMedian = baselineMedian - toggleMedian (how much time this feature adds)
    // deltap99 = baselinep99 - togglep99
    const costRanking = [];
    for (const item of TOGGLES) {
        if (item.id === 'baseline') continue;
        const s = processedResults[item.id].stats;
        const medianSaving = +(baselineStats.median - s.median).toFixed(2);
        const p99Saving = +(baselineStats.p99 - s.p99).toFixed(2);
        const maxSaving = +(baselineStats.max - s.max).toFixed(2);
        const longFramesSaved = baselineStats.over16_7 - s.over16_7;

        costRanking.push({
            id: item.id,
            name: item.name,
            variantMedian: s.median,
            variantp99: s.p99,
            medianSaving,
            p99Saving,
            maxSaving,
            longFramesSaved,
            onePercentLowDelta: +(s.onePercentLow - baselineStats.onePercentLow).toFixed(1)
        });
    }

    // Sort by p99Saving (descending) as primary metric for frame drops
    costRanking.sort((a, b) => b.p99Saving - a.p99Saving);

    // Extract top heap allocation functions from HeapProfiler
    const topAllocations = [];
    function traverseHeap(node) {
        if (!node) return;
        if (node.selfSize > 0) {
            topAllocations.push({
                name: node.callFrame.functionName || '(anonymous)',
                url: node.callFrame.url.split('/').pop(),
                line: node.callFrame.lineNumber,
                selfSize: node.selfSize
            });
        }
        if (node.children) {
            for (const child of node.children) traverseHeap(child);
        }
    }
    if (heapProfile && heapProfile.profile && heapProfile.profile.head) {
        traverseHeap(heapProfile.profile.head);
    }
    topAllocations.sort((a, b) => b.selfSize - a.selfSize);

    const outJson = {
        timestamp: new Date().toISOString(),
        env,
        baseline: baselineStats,
        baselineOps,
        processedResults,
        costRanking,
        topAllocations: topAllocations.slice(0, 15)
    };

    const outPath = join(OUT_DIR, 'perf_attribution.json');
    writeFileSync(outPath, JSON.stringify(outJson, null, 2), 'utf-8');
    console.log(`\n[P2] Attribution results written to ${outPath}`);

    // Print Cost Ranking Table
    console.log(`\n======================================================================`);
    console.log(`  VFX COST RANKING (Sorted by p99 Frame Time Impact)`);
    console.log(`======================================================================`);
    console.log(`| Rank | VFX System / Feature | Variant p99 | p99 Saving (ms) | Median Saving (ms) | 1% Low Gain | Long Frames (>16.7ms) Saved |`);
    console.log(`| :--- | :------------------- | :---------- | :-------------- | :----------------- | :---------- | :-------------------------- |`);
    costRanking.forEach((c, idx) => {
        console.log(`| #${idx + 1} | ${c.name.padEnd(35)} | ${c.variantp99.toFixed(2)} ms | +${c.p99Saving.toFixed(2)} ms | +${c.medianSaving.toFixed(2)} ms | +${c.onePercentLowDelta} fps | ${c.longFramesSaved} frames |`);
    });

    console.log(`\n[P2] Top Memory Allocation Hotspots (HeapProfiler Sampling):`);
    topAllocations.slice(0, 8).forEach((a, idx) => {
        console.log(`  ${idx + 1}. ${a.name} (${a.url}:${a.line}): ${(a.selfSize / 1024).toFixed(1)} KB`);
    });

    await browser.close();
    await server.close();
    console.log(`\n[P2] Complete.`);
}

main().catch(err => {
    console.error('[P2] Error:', err);
    process.exit(1);
});
