// H4 root cause probe (docs/COORD_GUARD_FINDINGS.md 8.2): units whose draw foot y (py + physics.y) wobbles 0.3..3 px per frame while not moving, with the physics state at that moment.
// Usage: node tools/ui-e2e/unit-jitter-probe.mjs  (evidence only; patches the page, never the engine)


const { launchBrowser, START_TEXT } = await import('./lib/perf-common.mjs');
const { startServer, seededHarnessInit, setupBattle, stepFrames } = await import('./lib/coord-probes.mjs');
const { server, port } = await startServer(3321);
const browser = await launchBrowser({ headed: false, unthrottled: false });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(seededHarnessInit);
await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => window.__stepFrames(10));
await page.getByText(START_TEXT).click();
await page.waitForTimeout(400); await page.evaluate(() => window.__stepFrames(10));
const out = [];
for (const [biome, seed] of [['FOREST', 1001], ['FOREST', 1002]]) {
  await setupBattle(page, { biome, seed, start: true });
  await stepFrames(page, 6);
  await page.evaluate(() => {
    const e = window.__TACTICAL_ENGINE__;
    window.__J = { prev: new Map(), hist: new Map(), frame: 0, hits: [], lastTrig: new Map() };
    const step = window.__stepFrames;
    window.__stepJ = (n) => {
      for (let i = 0; i < n; i++) {
        step(1);
        const J = window.__J; J.frame++;
        for (const a of e.agents) {
          if (a.hp <= 0) continue;
          const y = a.py + a.physics.y, x = a.px + a.physics.x;
          const p = J.prev.get(a.id);
          J.prev.set(a.id, { y, x, py: a.py, px: a.px, vy: a.physics.vy, vx: a.physics.vx, pyPhys: a.physics.y, moving: a.isMoving });
          if (!p) continue;
          const dy = y - p.y;
          if (Math.abs(dy) > 0.3 && Math.abs(dy) < 3 && !a.isMoving && !p.moving && a.px === p.px && a.py === p.py) {
            J.hits.push({ f: J.frame, id: a.id, dy: +dy.toFixed(3), y: +y.toFixed(2), physY: +a.physics.y.toFixed(3), vy: +a.physics.vy.toFixed(2), prevVy: +p.vy.toFixed(2), stun: +a.stunTimer.toFixed(2), z: +a.physics.z.toFixed(2), anim: a.animState, cast: a.castingSkillIdx, hitFlash: a.view.hitFlashTimer });
          }
        }
      }
    };
  });
  for (let k = 0; k < 20; k++) await page.evaluate(() => window.__stepJ(60));
  const hits = await page.evaluate(() => window.__J.hits);
  out.push({ biome, seed, n: hits.length, sample: hits.slice(0, 12) });
  // distribution of |physY| and whether vy was ~0 at hit time (impulse) vs spring ring-down
  const byUnit = {};
  for (const h of hits) byUnit[h.id] = (byUnit[h.id] || 0) + 1;
  out[out.length - 1].byUnit = byUnit;
}
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close(); process.exit(0);
