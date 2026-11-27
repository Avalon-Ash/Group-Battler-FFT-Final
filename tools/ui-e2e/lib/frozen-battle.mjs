import { readFileSync } from 'node:fs';
import { START_TEXT } from './perf-common.mjs';

// The fidelity suite owns these fixtures but does not export them.
export function probeFixture(file, pattern) {
    const value = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').match(pattern)?.[1];
    if (!value) throw new Error(`Probe fixture changed in ${file}: ${pattern}`);
    return value;
}

const fidelity = 'render-fidelity.mjs';
const initClock = probeFixture(fidelity, /await page\.addInitScript\((\(\) => \{[\s\S]*?)(?=\s*\/\/ Comparison helper)/);
const map = JSON.parse(probeFixture(fidelity, /^const FIDELITY_MAP = (\{[^\n]+\});/m)
    .replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));

export const desktopProbe = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };

/**
 * extraQuery: appended to the fidelity query; the fixture itself is unchanged. Defaults to the Canvas 2D path
 * (lit=0, ADR 0029) because the layer probe and the VFX strips read the main canvas draw calls; pass '&lit=1' to light.
 */
export async function openFrozenPage(context, url, install, extraQuery = '&lit=0') {
    const page = await context.newPage();
    // Manual rendering can also advance time without invoking the app's RAF loop.
    await page.addInitScript({ content: `(${initClock}
        window.__advanceProbeClock = (ms) => { syntheticTime += ms; };
    })();` });
    await page.goto(`${url}?quality=0&mute${extraQuery}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ && window.__TACTICAL_ENGINE__?.renderer,
        null, { polling: 100, timeout: 15000 });
    if (install) await install(page);
    await page.evaluate(() => { window.__resetSeed(1337); window.__stepFrames(10); });
    await page.getByText(START_TEXT).evaluate(button => button.click());
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));
    return page;
}

export function rebuildFrozenMap(page, sceneId, seed) {
    return page.evaluate(async ({ sceneId, seed, map }) => {
        const { SCENE_DB } = await import('/data/scenes.ts');
        const { seedSetupStream } = await import('/engine/math/rng.ts');
        window.__resetSeed(seed);
        seedSetupStream(seed);
        const engine = window.__TACTICAL_ENGINE__;
        engine.currentScene = SCENE_DB.find(scene => scene.id === sceneId);
        if (!engine.currentScene) throw new Error(`Unknown scene ${sceneId}`);
        Object.assign(engine.mapConfig, map);
        engine.map.rebuildMap(engine);
    }, { sceneId, seed, map });
}
