/**
 * perf-r1-attribution.mjs — Comprehensive attribution benchmark for Task R1.
 * Run: `node tools/ui-e2e/perf-r1-attribution.mjs`
 *
 * Runs 3 interleaved rounds of switch-based A/B under headed unthrottled mode:
 *   1. baseline
 *   2. no_units (suppress agent updates and rendering)
 *   3. flat_terrain (skip terrain sprite blit / flat color)
 *   4. no_post_tone (disable post tone grade pass)
 *   5. no_hud (hide HUD / editor toolbar / overlays)
 *   6. half_res (quality tier 3, internal resolution 0.5x)
 *   7. no_backdrop_filter (CSS backdrop-filter: none)
 *   8. no_matrix_rain (showcase only)
 *
 * Simultaneously gathers TerrainBlockCache hits, misses, and clears per frame.
 * Output:
 *   - tools/ui-e2e/out/perf_attribution.json
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    prepareManualBattle,
    measureScenarioFrames,
    START_TEXT,
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS = Number(process.env.PERF_SECONDS || 4);
const ROUNDS = Number(process.env.PERF_ROUNDS || 3);
const isHeadless = process.env.PERF_HEADED !== '1';
const unthrottled = process.env.PERF_UNTHROTTLED !== '0';

function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : +((s[mid - 1] + s[mid]) / 2).toFixed(2);
}

const server = await createServer({
    server: { port: 3202, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&perf=1`;
const browser = await launchBrowser({ headed: !isHeadless, unthrottled });

const SCENARIOS = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT', 'manual_battle', 'showcase'];

const TOGGLES = [
    'baseline',
    'no_units',
    'flat_terrain',
    'no_post_tone',
    'no_hud',
    'half_res',
    'no_backdrop_filter',
    'no_matrix_rain',
];

async function applyToggle(page, toggle) {
    await page.evaluate(async (t) => {
        const e = window.__TACTICAL_ENGINE__;
        const modVfx = await import('/data/vfx/materialConfig.ts');
        const c = modVfx.MATERIAL_CONFIG;

        // Reset toggles first
        window.__origToggle ??= {
            units: e ? e.agents : [],
            grade: c.grade.enabled,
            grain: c.terrain.grain.enabled,
            side: c.terrain.sideGrain,
        };

        c.grade.enabled = window.__origToggle.grade;
        c.terrain.grain.enabled = window.__origToggle.grain;
        c.terrain.sideGrain = window.__origToggle.side;

        // Reset CSS
        let cssEl = document.getElementById('__r1_css');
        if (cssEl) cssEl.textContent = '';

        // Reset Matrix rain
        const canvases = document.querySelectorAll('canvas');
        for (const can of canvases) {
            if (can.getAttribute('id') !== 'tactical-canvas') {
                can.style.display = '';
            }
        }

        // Reset units visibility override
        window.__r1HideUnits = false;
        window.__r1FlatTerrain = false;

        // Restore renderer hooks
        if (e?.renderer?.unit && window.__origUnitSubmit) {
            e.renderer.unit.submitRenderables = window.__origUnitSubmit;
        }
        const hudObj = e?.renderer?.pipeline?.hud;
        if (hudObj && window.__origHudDraw) {
            hudObj.draw = window.__origHudDraw;
        }
        const { TerrainRenderer } = await import('/engine/renderers/grid/TerrainRenderer.ts');
        if (window.__origDetailDraw) {
            TerrainRenderer.drawTerrainDetail = window.__origDetailDraw;
        }

        // Apply toggle
        if (t === 'no_units') {
            window.__r1HideUnits = true;
            if (e && e.renderer?.unit) {
                window.__origUnitSubmit ??= e.renderer.unit.submitRenderables.bind(e.renderer.unit);
                e.renderer.unit.submitRenderables = function() { /* suppress */ };
            }
        }

        if (t === 'flat_terrain') {
            c.terrain.grain.enabled = false;
            c.terrain.sideGrain = 0;
            window.__r1FlatTerrain = true;
            window.__origDetailDraw ??= TerrainRenderer.drawTerrainDetail.bind(TerrainRenderer);
            TerrainRenderer.drawTerrainDetail = function() { /* suppress dynamic detail */ };
        }

        if (t === 'no_post_tone') {
            c.grade.enabled = false;
        }

        if (t === 'no_hud') {
            if (hudObj) {
                window.__origHudDraw ??= hudObj.draw.bind(hudObj);
                hudObj.draw = function() { /* suppress */ };
            }
            if (!cssEl) {
                cssEl = document.createElement('style');
                cssEl.id = '__r1_css';
                document.head.appendChild(cssEl);
            }
            cssEl.textContent = '.absolute.top-0, .pointer-events-none { opacity: 0 !important; }';
        }

        if (t === 'no_backdrop_filter') {
            if (!cssEl) {
                cssEl = document.createElement('style');
                cssEl.id = '__r1_css';
                document.head.appendChild(cssEl);
            }
            cssEl.textContent = '*{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}';
        }

        if (t === 'no_matrix_rain') {
            for (const can of canvases) {
                if (can.getAttribute('id') !== 'tactical-canvas') {
                    can.style.display = 'none';
                }
            }
        }
    }, toggle);
}

try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const envInfo = await getEnvInfo(page, unthrottled);
    assertMainGpu(envInfo);

    const attributionResults = {};

    for (const sc of SCENARIOS) {
        attributionResults[sc] = {};
        console.log(`\n================================================================`);
        console.log(`  ATTRIBUTION ANALYSIS: SCENARIO [${sc}]`);
        console.log(`================================================================`);

        const applicableToggles = TOGGLES.filter((t) => {
            if (t === 'no_matrix_rain' && sc !== 'showcase') return false;
            if (t === 'no_units' && (sc !== 'manual_battle' && sc !== 'showcase')) return false;
            return true;
        });

        // Setup base scenario
        const setupScenario = async () => {
            if (sc === 'showcase') {
                await page.goto(baseUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(1500);
            } else if (sc === 'manual_battle') {
                await page.goto(baseUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(800);
                await prepareManualBattle(page, { boostHp: true });
            } else {
                await page.getByText(START_TEXT).click().catch(() => {});
                await page.waitForTimeout(300);
                await page.evaluate(async (targetId) => {
                    const mod = await import('/data/scenes.ts');
                    const e = window.__TACTICAL_ENGINE__;
                    const s = mod.SCENE_DB.find((x) => x.id === targetId);
                    if (s && e) {
                        e.currentScene = s;
                        e.map.rebuildMap(e);
                    }
                }, sc);
                await page.waitForTimeout(600);
            }
        };

        await setupScenario();

        // Measure cache behavior on baseline for 3s
        const cacheStats = await page.evaluate(async () => {
            const { TerrainRenderer } = await import('/engine/renderers/grid/TerrainRenderer.ts');
            const terrainBefore = TerrainRenderer.store.getStats?.() || { size: 0, hits: 0, misses: 0, clears: 0 };

            await new Promise((r) => setTimeout(r, 2000));

            const terrainAfter = TerrainRenderer.store.getStats?.() || { size: 0, hits: 0, misses: 0, clears: 0 };

            return {
                terrain: {
                    size: terrainAfter.size,
                    deltaHits: terrainAfter.hits - terrainBefore.hits,
                    deltaMisses: terrainAfter.misses - terrainBefore.misses,
                    deltaClears: terrainAfter.clears - terrainBefore.clears,
                },
            };
        });

        console.log(`Cache (2s window) | Terrain: size=${cacheStats.terrain.size}, +hits=${cacheStats.terrain.deltaHits}, +misses=${cacheStats.terrain.deltaMisses}, +clears=${cacheStats.terrain.deltaClears}`);

        for (const toggle of applicableToggles) {
            process.stdout.write(`  Measuring toggle [${toggle.padEnd(18)}] ... `);
            const rounds = [];

            for (let r = 0; r < ROUNDS; r++) {
                if (toggle === 'half_res') {
                    // Navigate with ?quality=3
                    await page.goto(`${baseUrl.replace('quality=0', 'quality=3')}`, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(1000);
                    await setupScenario();
                } else {
                    if (toggle === applicableToggles[0] && r === 0) {
                        // Already setup
                    } else if (r > 0 || toggle !== 'baseline') {
                        await applyToggle(page, toggle);
                    }
                }

                const m = await measureScenarioFrames(page, {
                    scenarioName: sc,
                    durationSeconds: SECONDS,
                });
                rounds.push(m.avgMs);
            }

            // Restore
            if (toggle === 'half_res') {
                await page.goto(baseUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(1000);
                await setupScenario();
            } else {
                await applyToggle(page, 'baseline');
            }

            const med = median(rounds);
            const min = Math.min(...rounds);
            const max = Math.max(...rounds);
            console.log(`median: ${med.toFixed(2)}ms (${min.toFixed(2)} ~ ${max.toFixed(2)}ms)`);

            attributionResults[sc][toggle] = {
                medianMs: med,
                minMs: min,
                maxMs: max,
                rounds,
            };
        }

        attributionResults[sc]._cacheStats = cacheStats;
    }

    const outJson = {
        timestamp: new Date().toISOString(),
        env: envInfo,
        attribution: attributionResults,
    };

    const outPath = join(OUT_DIR, 'perf_attribution.json');
    writeFileSync(outPath, JSON.stringify(outJson, null, 2));
    console.log(`\nAttribution results written to: ${outPath}\n`);

    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
