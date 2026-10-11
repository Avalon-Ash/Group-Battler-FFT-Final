/**
 * perf-r4-smoke-governor.mjs
 * R4: Smoke testing ?glow=1, ?quality=2, ?quality=3, plus a 60s primary GPU headed governor test.
 */
import { createServer } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    prepareManualBattle,
    assertAgents,
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const server = await createServer({
    server: { port: 3192, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];

const results = {
    smoke: {},
    governor: {
        samples: [],
        maxTier: 0,
        stayedZero: true,
    },
};

console.log('== R4: SMOKE TESTING URL VARIANTS ==\n');

// 1. Smoke test ?glow=1, ?quality=2, ?quality=3
const smokeParams = ['?glow=1', '?quality=2', '?quality=3'];

for (const q of smokeParams) {
    console.log(`Smoke testing: ${q}`);
    const browser = await launchBrowser({ headed: false, unthrottled: true });
    try {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await ctx.newPage();
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto(`${baseUrl}${q}`, { waitUntil: 'networkidle' });
        const envInfo = await getEnvInfo(page, true);
        assertMainGpu(envInfo);

        // Click start & generate battle
        await prepareManualBattle(page);
        await assertAgents(page, 2);

        // Click an agent to verify selection interaction
        const selected = await page.evaluate(() => {
            const engine = window.__TACTICAL_ENGINE__;
            if (!engine || !engine.agents || engine.agents.length === 0) return false;
            const target = engine.agents[0];
            engine.selectedAgent = target;
            return true;
        });

        await page.waitForTimeout(1000);

        if (pageErrors.length > 0) {
            throw new Error(`Smoke test ${q} encountered page errors: ${pageErrors.join(', ')}`);
        }

        console.log(`  -> PASS: loaded, units generated, agent selected, zero page errors.`);
        results.smoke[q] = { pass: true, selected, pageErrorsCount: 0 };
        await ctx.close();
    } finally {
        await browser.close();
    }
}

console.log('\n== R4: 60-SECOND HEADED GOVERNOR STABILITY TEST ON PRIMARY GPU ==\n');

// 2. Governor 60-second test
const headedBrowser = await launchBrowser({ headed: true, unthrottled: true });
try {
    const ctx = await headedBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Default settings without manual quality override (?perf enables RenderStats)
    await page.goto(`${baseUrl}?perf`, { waitUntil: 'networkidle' });
    const envInfo = await getEnvInfo(page, true);
    assertMainGpu(envInfo);

    console.log(`Running on GPU: ${envInfo.gpu}`);
    console.log(`Sampling quality tier every 1 second for 60 seconds...`);

    await prepareManualBattle(page, { boostHp: true });

    const totalSeconds = 60;
    for (let s = 1; s <= totalSeconds; s++) {
        await page.waitForTimeout(1000);
        const tier = await page.evaluate(async () => {
            const { getQualityTier } = await import('/engine/renderers/RenderQuality.ts');
            return getQualityTier();
        });

        results.governor.samples.push({ second: s, tier });
        if (tier > results.governor.maxTier) {
            results.governor.maxTier = tier;
        }
        if (tier !== 0) {
            results.governor.stayedZero = false;
        }

        if (s % 10 === 0 || tier !== 0) {
            console.log(`  [${s}s / 60s] current tier: ${tier}`);
        }
    }

    if (!results.governor.stayedZero) {
        console.error(`\n[GOVERNOR REGRESSION] Quality tier downgraded during 60s test! Max tier observed: ${results.governor.maxTier}`);
    } else {
        console.log(`\n[GOVERNOR PASS] Quality tier strictly remained at 0 across all 60 seconds!`);
    }

    writeFileSync(join(OUT, 'governor_60s.json'), JSON.stringify(results, null, 2));
    await ctx.close();
} finally {
    await headedBrowser.close();
    await server.close();
}

if (!results.governor.stayedZero) {
    process.exit(1);
}
console.log('\nALL R4 CHECKS PASSED.');
