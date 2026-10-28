// ╔══════════════════════════════════════════════════════════════╗
// ║ R7: deterministic isolated production-system evidence probe ║
// ║ node tools/ui-e2e/drift-corpse-probe.mjs [--tag=before]       ║
// ║ Before: --tag=before --baseline=810dd50; after: --tag=after  ║
// ║ --compare compares saved probes and all 300 battle records ║
// ║ SSR loads real StackingResolver/PhysicsEngine/UnitFrame.    ║
// ║ Fixtures only: flat crowded board, no AI/attacks; collapsing ║
// ║ boundary at the analytic corpse slide endpoint. Seed = 1.  ║
// ║ Outputs full per-frame JSON; no production state modified. ║
// ╚══════════════════════════════════════════════════════════════╝
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync } from 'node:child_process';
if (process.argv.includes('--compare')) {
    const read = name => JSON.parse(readFileSync(`tools/ui-e2e/out/r7-${name}.json`, 'utf8'));
    const before = read('before-probe'), after = read('after-probe');
    const metrics = p => ({
        ...p.summary,
        // From frame 18 (0.3s), every offset is already capped. Exclude the
        // initial physical crossing into the final tile; count later switches.
        cappedHexSwitches: p.death.filter((d, i, a) => i > 18 && !isDeepStrictEqual(d.rawHex, a[i - 1].rawHex)).length,
        cappedUpwardHeightJumps: p.death.filter((d, i, a) => i > 18 && d.groundH - a[i - 1].groundH > 1).length,
        cappedSortKeySwitches: p.death.filter((d, i, a) => i > 18 && d.sortKey !== a[i - 1].sortKey).length,
    });
    const a = read('before-sim').battles, b = read('after-sim').battles;
    const result = { before: metrics(before), after: metrics(after),
        battles: a.length, changedBattles: a.filter((d, i) => !isDeepStrictEqual(d, b[i])).length };
    writeFileSync('tools/ui-e2e/out/r7-comparison.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    process.exit(a.length === 300 && b.length === 300 && result.changedBattles === 0 && result.after.cappedHexSwitches === 0 ? 0 : 1);
}
const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) ?? 'before';
// --baseline=<git-ref> loads just the old deathMotion module through Vite;
// production files stay untouched, so the same probe measures both revisions.
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice(11);
const oldMotion = baseline ? execFileSync('git', ['show', `${baseline}:data/units/appearance/deathMotion.ts`], { encoding: 'utf8' }) : null;
const server = await createServer({ plugins: oldMotion ? [{ name: 'r7-baseline', enforce: 'pre',
    transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/data/units/appearance/deathMotion.ts')) return oldMotion; },
}] : [], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
try {
    const load = p => server.ssrLoadModule(p);
    const { Agent } = await load('/engine/core/Agent.ts');
    const { StackingResolver } = await load('/engine/systems/movement/StackingResolver.ts');
    const { PhysicsEngine } = await load('/engine/physics/PhysicsEngine.ts');
    const { UnitFrameStore } = await load('/engine/renderers/frame/UnitFrame.ts');
    const { RenderList, RenderOpType } = await load('/engine/renderers/RenderList.ts');
    const { HexUtils } = await load('/engine/utils.ts');
    const { seedSimulation } = await load('/engine/math/rng.ts');
    seedSimulation(1);
    const config = { w: 12, h: 12, offsetX: 0, offsetY: 0, layout: 'FLAT' };
    const agents = Array.from({ length: 4 }, (_, i) => new Agent(`probe${i}`, 0, 0, 0, config));
    const spatial = {
        agents, mapConfig: config, isLastStand: false,
        getAgents: () => agents, getMapConfig: () => config,
        getTerrainHeight: () => 0, isValid: () => true,
        isBlocked: (q, r, id) => agents.some(a => a.id !== id && a.q === q && a.r === r),
        updateAgentPosition: (a, q, r) => { a.q = q; a.r = r; },
    };
    // Flat running-board MapSystem has deltaH=0 and writes only q/r.
    new StackingResolver().resolve(spatial, { log() {} });
    const physics = new PhysicsEngine(), store = new UnitFrameStore();
    const drift = [];
    for (let frame = 0; frame <= 360; frame++) {
        store.build(agents, () => 0, config, 0, 'IDLE', () => true);
        for (const a of agents.slice(1)) {
            const c = HexUtils.toPx(a.q, a.r, config), f = store.get(a);
            drift.push({ frame, id: a.id, q: a.q, r: a.r, px: a.px, py: a.py,
                physicsX: a.physics.x, physicsY: a.physics.y, vx: a.physics.vx, vy: a.physics.vy,
                offset: Math.hypot(f.footX - c.x, f.footY - c.y), baseOffset: Math.hypot(a.px - c.x, a.py - c.y) });
        }
        for (const a of agents) physics.update(a, 1 / 60, spatial);
    }
    const corpse = new Agent('corpse', 0, 0, 0, config);
    corpse.hp = 0;
    // Long slide stops exactly at the (0,0)/(0,1) boundary.
    corpse.ragdoll = [{ id: 'torso', vx: 300, vy: 173.20508075688772, vz: 150 }];
    corpse.px = -Math.sqrt(110 * 110 - 55 * 55);
    corpse.py = HexUtils.toPx(0, 1, config).y / 2 - 55;
    const death = [], deathStore = new UnitFrameStore(), renderList = new RenderList();
    for (let frame = 0; frame <= 150; frame++) {
        const t = frame / 60;
        corpse.deathTimer = t;
        const heightAt = (q, r) => q === 0 && r === 0 ? 24 : 24 - 300 * t * t;
        const hasGround = (q, r) => q === 0 && r === 0 || t < 1.5;
        deathStore.build([corpse], heightAt, config, 0, 'IDLE', hasGround);
        const f = deathStore.get(corpse);
        renderList.reset();
        const op = renderList.next(); op.type = RenderOpType.CORPSE; op.y = f.sortY; op.sortBias = f.sortBias;
        // RenderList skips key calculation for one op; include a real tile op.
        const tile = renderList.next(); tile.type = RenderOpType.TERRAIN; tile.y = 0; renderList.sort();
        death.push({ frame, t, rawHex: HexUtils.fromPx(f.footX, f.footY, config), sortKey: op.sortKey, footX: f.footX, groundH: f.groundH, drawY: f.drawY, footY: f.footY,
            sortHex: { ...f.hexUnderFoot }, sortY: f.sortY + f.sortBias });
    }
    const summary = {
        seed: 1, fixture: 'isolated production systems, not a naturally occurring battle',
        maxOffset: Math.max(...drift.map(d => d.offset)),
        returnWithin001Seconds: Math.max(...agents.slice(1).map(a => drift.find(d => d.id === a.id && d.frame > 0 && drift.filter(x => x.id === a.id && x.frame >= d.frame).every(x => x.offset < 0.01))?.frame / 60)),
        offsetAt6Seconds: Math.max(...drift.filter(d => d.frame === 360).map(d => d.offset)),
        deathUpwardHeightJumps: death.filter((d, i) => i && d.groundH - death[i - 1].groundH > 1).length,
        deathMaxUpwardHeightJump: Math.max(...death.slice(1).map((d, i) => d.groundH - death[i].groundH)),
    };
    mkdirSync('tools/ui-e2e/out', { recursive: true });
    writeFileSync(`tools/ui-e2e/out/r7-${tag}-probe.json`, JSON.stringify({ summary, drift, death }, null, 2));
    console.log(JSON.stringify(summary, null, 2));
} finally { await server.close(); }
