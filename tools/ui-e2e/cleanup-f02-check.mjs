/**
 * tools/ui-e2e/cleanup-f02-check.mjs
 *
 * F02 Focused Probe: Single-Target Sequence Dynamic Target Binding vs Ground AOE
 * Supports --phase=before and --phase=after
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const outDir = join(root, 'tools', 'ui-e2e', 'out');
mkdirSync(outDir, { recursive: true });

// Parse arguments
let phase = 'before';
const phaseArg = process.argv.find(a => a.startsWith('--phase='));
if (phaseArg) {
    phase = phaseArg.split('=')[1];
}

let outFileName = `f02-${phase}.json`;
const outArg = process.argv.find(a => a.startsWith('--out='));
if (outArg) {
    outFileName = outArg.split('=')[1];
}

let gitHead = 'unknown';
let trackedDirty = false;
try {
    gitHead = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf-8' }).trim();
    const statusOut = execSync('git status --porcelain', { cwd: root, encoding: 'utf-8' }).trim();
    trackedDirty = statusOut.split('\n').filter(l => l && !l.startsWith('??')).length > 0;
} catch {
    gitHead = 'unknown';
}

const toolSource = readFileSync(fileURLToPath(import.meta.url), 'utf-8');
const toolSha256 = createHash('sha256').update(toolSource).digest('hex');

const results = {
    metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        gitHead,
        trackedDirty,
        toolSha256,
        command: process.argv.join(' '),
        phase,
        seed: 1337,
        faviconFixture: 'GET /favicon.ico returns 204 in this harness only',
    },
    singleTargetCase: null,
    groundAoeCase: null,
    errors: [],
    pageErrors: [],
    consoleErrors: [],
    summary: {
        phase,
        status: 'RUNNING',
    }
};

let server = null;
let browser = null;

try {
    // 1. Start Vite Server with audit favicon fixture
    server = await createServer({
        root,
        plugins: [{
            name: 'audit-favicon-fixture',
            configureServer(vite) {
                vite.middlewares.use((request, response, next) => {
                    if (request.method === 'GET' && request.url === '/favicon.ico') {
                        response.statusCode = 204;
                        response.end();
                    } else next();
                });
            },
        }],
        server: { port: 3198, strictPort: false, host: '127.0.0.1' },
        logLevel: 'error',
    });
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];

    // 2. Launch Chromium (msedge or chrome)
    for (const channel of ['msedge', 'chrome']) {
        try {
            browser = await chromium.launch({ channel, headless: true });
            break;
        } catch { /* try next */ }
    }
    if (!browser) throw new Error('No Chromium-compatible browser found (msedge/chrome)');

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on('pageerror', (e) => {
        results.pageErrors.push(e.message);
    });
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            results.consoleErrors.push({ message: msg.text(), location: msg.location() });
        }
    });

    // Install deterministic test clock hook
    await page.addInitScript(() => {
        let s = 1337;
        Math.random = () => {
            let t = (s += 0x6D2B79F5);
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

    console.log(`[f02-check] Navigating to ${baseUrl}?quality=0&mute...`);
    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__TACTICAL_ENGINE__), { timeout: 15000 });
    await page.evaluate(() => window.__stepFrames(10));

    const startBtn = page.getByText('START SIMULATION');
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(300);
        await page.evaluate(() => window.__stepFrames(10));
    }

    // =========================================================================
    // CASE 1: mb_a2 True Single-Target Skill with Cast Time (0.5s, BEAM)
    // =========================================================================
    console.log('[f02-check] Running Case 1: mb_a2 Single-Target Displacement Tracking...');

    const singleResult = await page.evaluate(async (currentPhase) => {
        const types = await import('/types.ts');
        const { VisualMath } = await import('/engine/math/VisualMath.ts');
        const { teleportTo } = await import('/engine/systems/movement/MotionCommands.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);

        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[1];
        if (!caster || !target) throw new Error('Failed to place agents for mb_a2 test');

        caster.skillIds = ['mb_a2', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        if (skill.type !== 'SINGLE' || skill.cast <= 0) {
            throw new Error(`Skill ${skill.id} is not valid SINGLE with cast time`);
        }

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        const initialTargetPos = { q: target.q, r: target.r, px: target.px, py: target.py };
        const castStartTargetPoint = { ...VisualMath.resolveTargetPoint(target.id, e) };

        const recordedDispatches = [];
        const origDispatch = e.renderer.sequences.dispatch.bind(e.renderer.sequences);
        e.renderer.sequences.dispatch = (action, targetPos, sourcePos, vfx, engine, sourceId) => {
            if (sourceId === caster.id) {
                const targetAnchor = VisualMath.getUnitAnchor(target, engine);
                recordedDispatches.push({
                    actionId: action.id,
                    actionType: action.type,
                    simTime: engine.battleTime,
                    passedTarget: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
                    currentTargetAnchor: { x: targetAnchor.x, y: targetAnchor.y, z: targetAnchor.z },
                    targetAgentPx: target.px,
                    targetAgentPy: target.py,
                    diffX: Math.abs(targetPos.x - targetAnchor.x),
                    diffY: Math.abs(targetPos.y - targetAnchor.y),
                    diffZ: Math.abs((targetPos.z ?? 0) - (targetAnchor.z ?? 0)),
                    drift3D: Math.hypot(
                        targetPos.x - targetAnchor.x,
                        targetPos.y - targetAnchor.y,
                        (targetPos.z ?? 0) - (targetAnchor.z ?? 0)
                    ),
                });
            }
            return origDispatch(action, targetPos, sourcePos, vfx, engine, sourceId);
        };

        try {
            const initiated = e.initiateCast(caster, 0);
            if (initiated !== types.NodeState.RUNNING || caster.castingSkillIdx !== 0) {
                throw new Error('initiateCast failed for mb_a2');
            }
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            // At 50% cast, controlled displacement: target teleports from (2, 0) to (4, 0)
            window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));
            teleportTo(target, 4, 0, e);

            const tHpBefore = target.hp;
            // Advance remaining cast duration + buffer frames
            window.__stepFrames(Math.ceil(skill.cast * 60 * 0.5) + 15);
            const tHpAfter = target.hp;

            if (recordedDispatches.length === 0) {
                throw new Error('Expected sequence action was not dispatched for caster');
            }

            const beamDispatch = recordedDispatches.find(item => item.actionType === 'BEAM');
            if (!beamDispatch) {
                throw new Error('mb_a2 did not dispatch a BEAM action: expected BEAM dispatch in recordedDispatches');
            }
            const damageDealt = tHpBefore - tHpAfter;
            const targetMovedAnchor = VisualMath.getUnitAnchor(target, e);

            return {
                skillId: skill.id,
                skillName: skill.name,
                skillType: skill.type,
                cast: skill.cast,
                initialTargetPos,
                targetMovedTo: { q: target.q, r: target.r, px: target.px, py: target.py },
                castStartTargetPoint,
                targetMovedAnchor,
                dispatch: beamDispatch,
                allDispatches: recordedDispatches,
                damageDealt,
                simDamagedTargetAtNewPosition: damageDealt > 0,
                stayedAtCastStartPos: Math.hypot(
                    beamDispatch.passedTarget.x - castStartTargetPoint.x,
                    beamDispatch.passedTarget.y - castStartTargetPoint.y
                ) <= 1,
                trackedToNewAnchor: beamDispatch.drift3D <= 1,
            };
        } finally {
            e.renderer.sequences.dispatch = origDispatch;
        }
    }, phase);

    results.singleTargetCase = singleResult;

    // Save screenshot for Case 1
    const shotPathSingle = join(outDir, `f02-${phase}-single.png`);
    await page.screenshot({ path: shotPathSingle, fullPage: false });
    results.singleTargetScreenshot = shotPathSingle;

    // =========================================================================
    // CASE 2: mb_u1 Ground AOE Control Test (cast=1.0s, aoeRadius=2)
    // =========================================================================
    console.log('[f02-check] Running Case 2: mb_u1 Ground AOE Lock Control...');

    const aoeResult = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const { VisualMath } = await import('/engine/math/VisualMath.ts');
        const { teleportTo } = await import('/engine/systems/movement/MotionCommands.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);

        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 6, r: 0, hp: 2000, role: types.Role.WARRIOR });

        const caster = e.agents[0];
        const target1 = e.agents[1];
        const target2 = e.agents[2];
        if (!caster || !target1 || !target2) throw new Error('Failed to place agents for mb_u1 AOE test');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target1;
        caster.targetHex = { q: target1.q, r: target1.r };

        const initialTargetHex = { ...caster.targetHex };
        const castStartTargetPoint = { ...VisualMath.resolveTargetPoint(target1.id, e) };

        const recordedDispatches = [];
        const origDispatch = e.renderer.sequences.dispatch.bind(e.renderer.sequences);
        e.renderer.sequences.dispatch = (action, targetPos, sourcePos, vfx, engine, sourceId) => {
            if (sourceId === caster.id) {
                // Record spatial actions; exclude SHAKE and non-spatial actions
                const isSpatial = action.type === 'PARTICLE' || action.type === 'BEAM' || action.type === 'GRID_PULSE' || action.type === 'HEAVEN_FALL';
                if (isSpatial) {
                    const currentTarget1Anchor = VisualMath.getUnitAnchor(target1, engine);
                    const driftFromCastStart = Math.hypot(
                        targetPos.x - castStartTargetPoint.x,
                        targetPos.y - castStartTargetPoint.y,
                        (targetPos.z ?? 0) - (castStartTargetPoint.z ?? 0)
                    );
                    const driftFromTarget1 = Math.hypot(
                        targetPos.x - currentTarget1Anchor.x,
                        targetPos.y - currentTarget1Anchor.y,
                        (targetPos.z ?? 0) - (currentTarget1Anchor.z ?? 0)
                    );
                    recordedDispatches.push({
                        actionId: action.id,
                        actionType: action.type,
                        simTime: engine.battleTime,
                        passedTarget: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
                        castStartPoint: { ...castStartTargetPoint },
                        target1Anchor: { x: currentTarget1Anchor.x, y: currentTarget1Anchor.y, z: currentTarget1Anchor.z },
                        driftFromCastStart,
                        driftFromTarget1,
                        followedMovedTarget: driftFromTarget1 <= 1,
                    });
                }
            }
            return origDispatch(action, targetPos, sourcePos, vfx, engine, sourceId);
        };

        try {
            const initiated = e.initiateCast(caster, 0);
            if (initiated !== types.NodeState.RUNNING || caster.castingSkillIdx !== 0) {
                throw new Error('initiateCast failed for mb_u1 AOE');
            }
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            // At 50% cast:
            // Target 1 teleports out to (6, 0), Target 2 teleports into ground hex (2, 0)
            window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));
            teleportTo(target1, 6, 0, e);
            teleportTo(target2, 2, 0, e);

            const t1HpBefore = target1.hp;
            const t2HpBefore = target2.hp;

            window.__stepFrames(Math.ceil(skill.cast * 60 * 0.5) + 15);

            const t1HpAfter = target1.hp;
            const t2HpAfter = target2.hp;

            const target1Damage = t1HpBefore - t1HpAfter;
            const target2Damage = t2HpBefore - t2HpAfter;

            if (recordedDispatches.length === 0) {
                throw new Error('Expected AOE sequence spatial actions were not dispatched for caster');
            }

            const maxVisualDrift = Math.max(...recordedDispatches.map(d => d.driftFromCastStart));
            const followedMovedTarget = recordedDispatches.some(d => d.followedMovedTarget);
            const visualGroundLocked = maxVisualDrift <= 1 && !followedMovedTarget;
            const simulationGroundLocked = target1Damage === 0 && target2Damage > 0;

            return {
                skillId: skill.id,
                skillName: skill.name,
                skillType: skill.type,
                aoeRadius: skill.aoeRadius,
                initialTargetHex,
                castStartTargetPoint,
                target1MovedTo: { q: target1.q, r: target1.r },
                target2MovedTo: { q: target2.q, r: target2.r },
                target1Damage,
                target2Damage,
                target1Escaped: target1Damage === 0,
                target2Hit: target2Damage > 0,
                maxVisualDrift,
                simulationGroundLocked,
                visualGroundLocked,
                groundLocked: simulationGroundLocked && visualGroundLocked,
                allSpatialDispatches: recordedDispatches,
            };
        } finally {
            e.renderer.sequences.dispatch = origDispatch;
        }
    });

    results.groundAoeCase = aoeResult;

    // Save screenshot for Case 2
    const shotPathAoe = join(outDir, `f02-${phase}-aoe.png`);
    await page.screenshot({ path: shotPathAoe, fullPage: false });
    results.groundAoeScreenshot = shotPathAoe;

    // Clean up board at end
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        if (e) {
            e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        }
    });

    // Summary evaluation
    const s = results.singleTargetCase;
    const a = results.groundAoeCase;

    if (phase === 'before') {
        const observedDefect = s.simDamagedTargetAtNewPosition && s.stayedAtCastStartPos && s.dispatch.drift3D > 1;
        const aoeGroundLocked = a.simulationGroundLocked && a.visualGroundLocked;
        const noErrors = results.errors.length === 0 && results.pageErrors.length === 0 && results.consoleErrors.length === 0;

        if (observedDefect && aoeGroundLocked && noErrors) {
            results.summary.status = 'COMPLETED_BEFORE';
        } else {
            results.summary.status = 'BEFORE_ANOMALY';
            process.exitCode = 1;
        }
    } else {
        // AFTER phase: single target must track to new anchor <= 1px, AOE must remain ground locked (both sim and visual)
        const singlePassed = s.simDamagedTargetAtNewPosition && s.trackedToNewAnchor;
        const aoePassed = a.simulationGroundLocked && a.visualGroundLocked;
        const noErrors = results.errors.length === 0 && results.pageErrors.length === 0 && results.consoleErrors.length === 0;

        if (singlePassed && aoePassed && noErrors) {
            results.summary.status = 'PASS';
        } else {
            results.summary.status = 'FAIL';
            process.exitCode = 1;
        }
    }

} catch (err) {
    console.error('[f02-check] Unhandled error:', err);
    results.errors.push({ message: err.message, stack: err.stack });
    results.summary.status = 'ERROR';
    process.exitCode = 1;
} finally {
    try {
        if (browser) await browser.close();
    } catch { /* ignore */ }
    try {
        if (server) await server.close();
    } catch { /* ignore */ }

    // Write results to JSON inside outDir only (never root directory)
    const fileNameOnly = outFileName.split(/[/\\]/).pop();
    const finalOutPath = isAbsolute(outFileName) ? outFileName : join(outDir, fileNameOnly);
    const jsonStr = JSON.stringify(results, null, 2);
    writeFileSync(finalOutPath, jsonStr, 'utf-8');
    console.log(`[f02-check] Results written to ${finalOutPath} (status: ${results.summary.status})`);
}
