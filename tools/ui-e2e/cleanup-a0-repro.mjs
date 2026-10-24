/**
 * tools/ui-e2e/cleanup-a0-repro.mjs
 * 
 * A0-R2 Reproducible Live Verification Probe for TACTICAL.OS
 * 
 * Invariants & Strict Requirements:
 * 1. All scenarios initially NOT_RUN; status computed from raw measurements.
 * 2. Top-level catch captures error, stack, and currentScenario, setting non-zero exit code.
 * 3. Setup errors, page errors, or incomplete scenarios guarantee non-zero exit.
 * 4. Browser, server, and all monitoring hooks restored in finally blocks.
 * 5. Metadata gitHead resolved dynamically via `git rev-parse HEAD`.
 * 6. Configurable --out-dir (defaults to tools/ui-e2e/out/cleanup-a0-r2) preserves past runs.
 * 7. Supports --inject-setup-error flag for testing failure handling.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd();

// Parse command line arguments
let outDir = join(root, 'tools', 'ui-e2e', 'out', 'cleanup-a0-r2');
const outDirIdx = process.argv.indexOf('--out-dir');
if (outDirIdx !== -1 && process.argv[outDirIdx + 1]) {
    outDir = resolve(root, process.argv[outDirIdx + 1]);
}
mkdirSync(outDir, { recursive: true });

const injectSetupError = process.argv.includes('--inject-setup-error');

let gitHead = 'unknown';
try {
    gitHead = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf-8' }).trim();
} catch {
    gitHead = 'unknown';
}

const requiredScenarioKeys = [
    'F01_A_normal_completion',
    'F01_B_stun_interruption',
    'F01_C1_state_injected_death_run1',
    'F01_C1_state_injected_death_run2',
    'F01_C2_controlled_lethal_damage_run1',
    'F01_C2_controlled_lethal_damage_run2',
    'F01_E1_ai_rebuild_during_cast',
    'F01_E2_game_reset_during_cast',
    'F01_D_projectile_in_flight',
    'F02_AOE_ground_locked',
    'F02_SINGLE_target_locked',
    'F03_API_boundary_inputs',
    'F03_UI_inspector_interaction',
];

const results = {
    metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        gitHead,
        seed: 1337,
        command: process.argv.join(' '),
        outDir,
    },
    scenarios: Object.fromEntries(requiredScenarioKeys.map(k => [k, { status: 'NOT_RUN' }])),
    F01: {},
    F02: {},
    F03: {},
    errors: [],
    pageErrors: [],
    consoleErrors: [],
    summary: {
        totalScenarios: requiredScenarioKeys.length,
        completedScenarios: 0,
        observedScenarios: 0,
        notReproducedScenarios: 0,
        errorScenarios: 0,
        notRunScenarios: requiredScenarioKeys.length,
        toolExecutionStatus: 'NOT_RUN',
        productBugsObserved: [],
    }
};

let server = null;
let browser = null;
let currentScenario = 'SETUP';

try {
    if (injectSetupError) {
        throw new Error('INJECTED_SETUP_ERROR: controlled setup failure test');
    }

    server = await createServer({
        root,
        server: { port: 3198, strictPort: false, host: '127.0.0.1' },
        logLevel: 'error',
    });
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];

    for (const channel of ['msedge', 'chrome']) {
        try {
            browser = await chromium.launch({ channel, headless: true });
            break;
        } catch { /* try next channel */ }
    }
    if (!browser) throw new Error('No Chromium-compatible browser found (msedge/chrome)');

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on('pageerror', (e) => {
        results.pageErrors.push(e.message);
    });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            results.consoleErrors.push(msg.text());
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

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText('START SIMULATION').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__stepFrames(10));

    // =========================================================================
    // F01: Caster Death vs Interruption vs Complete vs Projectile vs Reset
    // =========================================================================
    console.log('[Probe] Running F01 investigations...');

    // F01-A: Normal cast completion
    currentScenario = 'F01_A_normal_completion';
    const resF01A = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[2];
        if (!caster || !target) throw new Error('Failed to place agents for F01-A');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];
        if (!skill) throw new Error('Skill mb_u1 not found');

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        const recordedEvents = [];
        const origPush = e.events.push.bind(e.events);
        e.events.push = (...evts) => {
            for (const ev of evts) recordedEvents.push({ type: ev.type, sourceId: ev.sourceId });
            return origPush(...evts);
        };

        try {
            const targetHpBefore = target.hp;
            const initiated = e.initiateCast(caster, 0);
            if (!initiated) throw new Error('initiateCast failed for F01-A');

            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = skill.cast;
            window.__stepFrames(Math.ceil(castDur * 60) + 10);
            const targetHpAfter = target.hp;

            return {
                condition: 'normal_completion',
                skillId: skill.id,
                skillName: skill.name,
                skillType: skill.type,
                castDur,
                initiated,
                targetHpBefore,
                targetHpAfter,
                damageDealt: targetHpBefore - targetHpAfter,
                events: recordedEvents.map(ev => ev.type),
                completedSuccessfully: targetHpAfter < targetHpBefore,
            };
        } finally {
            e.events.push = origPush;
        }
    });

    results.F01.A_normal_completion = resF01A;
    results.scenarios.F01_A_normal_completion = {
        status: resF01A.completedSuccessfully ? 'OBSERVED' : 'ERROR',
        data: resF01A,
    };

    // F01-B: Stun interruption while alive
    currentScenario = 'F01_B_stun_interruption';
    const resF01B = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[2];
        if (!caster || !target) throw new Error('Failed to place agents for F01-B');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        const recordedEvents = [];
        const origPush = e.events.push.bind(e.events);
        e.events.push = (...evts) => {
            for (const ev of evts) recordedEvents.push({ type: ev.type, sourceId: ev.sourceId });
            return origPush(...evts);
        };

        try {
            const initiated = e.initiateCast(caster, 0);
            if (!initiated) throw new Error('initiateCast failed for F01-B');
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = skill.cast;
            window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

            const queueSizeBeforeStun = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;
            caster.effects.STUN.remaining = 1.0;
            window.__stepFrames(1);

            const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK' && ev.sourceId === caster.id);
            const queueSizeAfterStun = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

            const targetHpBefore = target.hp;
            window.__stepFrames(Math.ceil(castDur * 60));
            const targetHpAfter = target.hp;

            return {
                condition: 'stun_interruption_while_alive',
                skillId: skill.id,
                queueSizeBeforeStun,
                queueSizeAfterStun,
                hadCastBreak,
                damageDealt: targetHpBefore - targetHpAfter,
                casterAlive: caster.hp > 0,
                events: recordedEvents.map(ev => ev.type),
                queueCleanedByBreak: queueSizeAfterStun === 0,
            };
        } finally {
            e.events.push = origPush;
        }
    });

    results.F01.B_stun_interruption = resF01B;
    results.scenarios.F01_B_stun_interruption = {
        status: (resF01B.hadCastBreak && resF01B.queueCleanedByBreak) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF01B,
    };

    // Helper for F01-C1 (State-injected death)
    const runF01C1 = async (runIndex) => {
        return await page.evaluate(async (runIdx) => {
            const types = await import('/types.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            cmd({ type: 'STOP_GAME' });
            cmd({ type: 'CLEAR_BOARD', keepScene: true });

            cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
            cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
            cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

            const caster = e.agents[0];
            const target = e.agents[2];
            if (!caster || !target) throw new Error(`Failed to place agents for F01-C1 run ${runIdx}`);

            caster.skillIds = ['mb_u1', null, null];
            caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
            caster.target = target;
            caster.targetHex = { q: target.q, r: target.r };

            const recordedEvents = [];
            const origPush = e.events.push.bind(e.events);
            e.events.push = (...evts) => {
                for (const ev of evts) recordedEvents.push({ type: ev.type, sourceId: ev.sourceId });
                return origPush(...evts);
            };

            let dispatchedAfterDeath = 0;
            const origDispatch = e.renderer.sequences.dispatch.bind(e.renderer.sequences);
            e.renderer.sequences.dispatch = (...args) => {
                const srcId = args[5];
                if (srcId === caster.id && caster.hp <= 0) dispatchedAfterDeath++;
                return origDispatch(...args);
            };

            try {
                const initiated = e.initiateCast(caster, 0);
                if (!initiated) throw new Error(`initiateCast failed for F01-C1 run ${runIdx}`);
                e.renderer.processVisualEvents(e.events.splice(0));
                window.__stepFrames(1);

                const castDur = caster.skills[0].cast;
                window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

                // State injected death
                caster.hp = 0;
                window.__stepFrames(1);

                const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK' && ev.sourceId === caster.id);
                const queueAtDeath = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

                const targetHpBefore = target.hp;
                window.__stepFrames(Math.ceil(castDur * 60) + 20);
                const targetHpAfter = target.hp;

                return {
                    run: runIdx,
                    condition: 'state_injected_death_at_40pct',
                    skillId: 'mb_u1',
                    hadCastBreak,
                    queueAtDeath,
                    actionsDispatchedAfterDeath: dispatchedAfterDeath,
                    damageDealt: targetHpBefore - targetHpAfter,
                    casterDead: caster.hp <= 0,
                    defectObserved: !hadCastBreak && dispatchedAfterDeath > 0 && (targetHpBefore - targetHpAfter) === 0,
                };
            } finally {
                e.events.push = origPush;
                e.renderer.sequences.dispatch = origDispatch;
            }
        }, runIndex);
    };

    currentScenario = 'F01_C1_state_injected_death_run1';
    const resC1Run1 = await runF01C1(1);
    results.F01.C1_state_injected_death_run1 = resC1Run1;
    results.scenarios.F01_C1_state_injected_death_run1 = {
        status: resC1Run1.defectObserved ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resC1Run1,
    };

    currentScenario = 'F01_C1_state_injected_death_run2';
    const resC1Run2 = await runF01C1(2);
    results.F01.C1_state_injected_death_run2 = resC1Run2;
    results.scenarios.F01_C1_state_injected_death_run2 = {
        status: resC1Run2.defectObserved ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resC1Run2,
    };

    // Helper for F01-C2 (Controlled lethal damage via formal damage entry)
    const runF01C2 = async (runIndex) => {
        return await page.evaluate(async (runIdx) => {
            const types = await import('/types.ts');
            const e = window.__TACTICAL_ENGINE__;
            const cmd = (c) => e.bus.emit('UI_COMMAND', c);
            cmd({ type: 'STOP_GAME' });
            cmd({ type: 'CLEAR_BOARD', keepScene: true });

            cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 500, role: types.Role.MAGE });
            cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
            cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

            const caster = e.agents[0];
            const target = e.agents[2];
            if (!caster || !target) throw new Error(`Failed to place agents for F01-C2 run ${runIdx}`);

            caster.skillIds = ['mb_u1', null, null];
            caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
            caster.target = target;
            caster.targetHex = { q: target.q, r: target.r };

            const recordedEvents = [];
            const origPush = e.events.push.bind(e.events);
            e.events.push = (...evts) => {
                for (const ev of evts) recordedEvents.push({ type: ev.type, sourceId: ev.sourceId });
                return origPush(...evts);
            };

            let dispatchedAfterDeath = 0;
            const origDispatch = e.renderer.sequences.dispatch.bind(e.renderer.sequences);
            e.renderer.sequences.dispatch = (...args) => {
                const srcId = args[5];
                if (srcId === caster.id && caster.hp <= 0) dispatchedAfterDeath++;
                return origDispatch(...args);
            };

            try {
                const initiated = e.initiateCast(caster, 0);
                if (!initiated) throw new Error(`initiateCast failed for F01-C2 run ${runIdx}`);
                e.renderer.processVisualEvents(e.events.splice(0));
                window.__stepFrames(1);

                const castDur = caster.skills[0].cast;
                window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

                // Formal combat damage entry
                const { applyDirectDamage } = await import('/engine/systems/combat/DirectDamage.ts');
                applyDirectDamage(caster, 2000, true, target.id);
                window.__stepFrames(1);

                const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK' && ev.sourceId === caster.id);
                const queueAtDeath = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

                const targetHpBefore = target.hp;
                window.__stepFrames(Math.ceil(castDur * 60) + 20);
                const targetHpAfter = target.hp;

                return {
                    run: runIdx,
                    condition: 'controlled_lethal_damage_via_applyDirectDamage_at_40pct',
                    skillId: 'mb_u1',
                    hadCastBreak,
                    queueAtDeath,
                    actionsDispatchedAfterDeath: dispatchedAfterDeath,
                    damageDealt: targetHpBefore - targetHpAfter,
                    casterDead: caster.hp <= 0,
                    defectObserved: !hadCastBreak && dispatchedAfterDeath > 0 && (targetHpBefore - targetHpAfter) === 0,
                };
            } finally {
                e.events.push = origPush;
                e.renderer.sequences.dispatch = origDispatch;
            }
        }, runIndex);
    };

    currentScenario = 'F01_C2_controlled_lethal_damage_run1';
    const resC2Run1 = await runF01C2(1);
    results.F01.C2_controlled_lethal_damage_run1 = resC2Run1;
    results.scenarios.F01_C2_controlled_lethal_damage_run1 = {
        status: resC2Run1.defectObserved ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resC2Run1,
    };

    currentScenario = 'F01_C2_controlled_lethal_damage_run2';
    const resC2Run2 = await runF01C2(2);
    results.F01.C2_controlled_lethal_damage_run2 = resC2Run2;
    results.scenarios.F01_C2_controlled_lethal_damage_run2 = {
        status: resC2Run2.defectObserved ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resC2Run2,
    };

    // F01-E1: AI Rebuild during cast
    currentScenario = 'F01_E1_ai_rebuild_during_cast';
    const resF01E1 = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[1];
        if (!caster || !target) throw new Error('Failed to place agents for F01-E1');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        let hadAgentReset = false;
        const onAgentReset = (ev) => {
            if (ev.agentId === caster.id) hadAgentReset = true;
        };
        e.bus.on('AGENT_RESET', onAgentReset);

        try {
            const initiated = e.initiateCast(caster, 0);
            if (!initiated) throw new Error('initiateCast failed for F01-E1');
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = caster.skills[0].cast;
            window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

            const queueBeforeReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;
            // Emit AI rebuild command
            cmd({ type: 'REBUILD_AGENT_AI', agentId: caster.id });
            window.__stepFrames(1);

            const queueAfterReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

            return {
                condition: 'ai_rebuild_during_cast',
                skillId: 'mb_u1',
                queueBeforeReset,
                queueAfterReset,
                hadAgentReset,
                queueRemained: queueAfterReset === queueBeforeReset,
            };
        } finally {
            e.bus.off('AGENT_RESET', onAgentReset);
        }
    });

    results.F01.E1_ai_rebuild_during_cast = resF01E1;
    results.scenarios.F01_E1_ai_rebuild_during_cast = {
        status: (resF01E1.queueBeforeReset > 0 && resF01E1.hadAgentReset) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF01E1,
    };

    // F01-E2: Game Reset during cast
    currentScenario = 'F01_E2_game_reset_during_cast';
    const resF01E2 = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[1];
        if (!caster || !target) throw new Error('Failed to place agents for F01-E2');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        let hadGameReset = false;
        const onGameReset = () => { hadGameReset = true; };
        e.bus.on('GAME_RESET', onGameReset);

        try {
            const initiated = e.initiateCast(caster, 0);
            if (!initiated) throw new Error('initiateCast failed for F01-E2');
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = caster.skills[0].cast;
            window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

            const queueBeforeReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;
            // Real RESET_GAME command
            cmd({ type: 'RESET_GAME' });
            window.__stepFrames(1);

            const queueAfterReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

            return {
                condition: 'game_reset_during_cast',
                skillId: 'mb_u1',
                queueBeforeReset,
                queueAfterReset,
                hadGameReset,
                queueCleared: queueAfterReset === 0,
            };
        } finally {
            e.bus.off('GAME_RESET', onGameReset);
        }
    });

    results.F01.E2_game_reset_during_cast = resF01E2;
    results.scenarios.F01_E2_game_reset_during_cast = {
        status: (resF01E2.queueBeforeReset > 0 && resF01E2.hadGameReset) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF01E2,
    };

    // F01-D: Cast completed with projectile in flight, then caster killed
    currentScenario = 'F01_D_projectile_in_flight';
    const resF01D = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.RANGER });
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 5, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[2];
        if (!caster || !target) throw new Error('Failed to place agents for F01-D');

        caster.skillIds = ['rb_a1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        const initiated = e.initiateCast(caster, 0);
        if (!initiated) throw new Error('initiateCast failed for F01-D');
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const castDur = caster.skills[0].cast;
        window.__stepFrames(Math.ceil(castDur * 60) + 1);

        const projectilesSpawned = e.projectiles.length;
        if (projectilesSpawned === 0) throw new Error('Expected airborne projectile not spawned');

        caster.hp = 0;
        window.__stepFrames(1);

        const targetHpBefore = target.hp;
        window.__stepFrames(40);
        const targetHpAfter = target.hp;

        return {
            condition: 'projectile_in_flight_when_caster_killed',
            skillId: 'rb_a1',
            projectilesSpawned,
            casterDead: caster.hp <= 0,
            targetHpBefore,
            targetHpAfter,
            damageDealt: targetHpBefore - targetHpAfter,
            projectileHitOccurred: targetHpAfter < targetHpBefore,
        };
    });

    results.F01.D_projectile_in_flight_after_death = resF01D;
    results.scenarios.F01_D_projectile_in_flight = {
        status: resF01D.projectileHitOccurred ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF01D,
    };

    console.log('[Probe] F01 completed.');

    // =========================================================================
    // F02: Target Movement During Cast (True Ground AOE vs True Single Target)
    // =========================================================================
    console.log('[Probe] Running F02 investigations...');

    // F02-AOE: Ground AOE (mb_u1 Arcane Vortex, aoeRadius=3, cast=1.0s)
    currentScenario = 'F02_AOE_ground_locked';
    const resF02AOE = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 6, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target1 = e.agents[1];
        const target2 = e.agents[2];
        if (!caster || !target1 || !target2) throw new Error('Failed to place agents for F02-AOE');

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        if (skill.type !== 'AOE' || skill.aoeRadius < 1 || skill.cast <= 0) {
            throw new Error(`Skill ${skill.id} is not valid AOE with cast time`);
        }

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target1;
        caster.targetHex = { q: target1.q, r: target1.r };

        const initiated = e.initiateCast(caster, 0);
        if (!initiated) throw new Error('initiateCast failed for F02-AOE');
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const initialTargetHex = { ...caster.targetHex };

        // At 50% cast, controlled displacement:
        // Target 1 moves out to (6, 0), Target 2 moves in to (2, 0)
        window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));

        const { teleportTo } = await import('/engine/systems/movement/MotionCommands.ts');
        teleportTo(target1, 6, 0, e);
        teleportTo(target2, 2, 0, e);

        const t1HpBefore = target1.hp;
        const t2HpBefore = target2.hp;

        window.__stepFrames(Math.ceil(skill.cast * 60 * 0.5) + 15);

        const t1HpAfter = target1.hp;
        const t2HpAfter = target2.hp;

        const target1Damage = t1HpBefore - t1HpAfter;
        const target2Damage = t2HpBefore - t2HpAfter;

        return {
            skillId: skill.id,
            skillName: skill.name,
            skillType: skill.type,
            aoeRadius: skill.aoeRadius,
            initialTargetHex,
            target1MovedTo: { q: target1.q, r: target1.r },
            target2MovedTo: { q: target2.q, r: target2.r },
            target1Damage,
            target2Damage,
            target1Escaped: target1Damage === 0,
            target2Hit: target2Damage > 0,
            designConclusion: 'Ground AOE damage strictly locked to targeted ground hexes.',
        };
    });

    results.F02.AOE_ground_locked = resF02AOE;
    results.scenarios.F02_AOE_ground_locked = {
        status: (resF02AOE.target1Escaped && resF02AOE.target2Hit) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF02AOE,
    };

    // F02-SINGLE: True Single-target skill (mb_a2, type='SINGLE', cast=0.5s)
    currentScenario = 'F02_SINGLE_target_locked';
    const resF02Single = await page.evaluate(async () => {
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
        if (!caster || !target) throw new Error('Failed to place agents for F02-SINGLE');

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

        // Intercept dispatch on caster
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
                });
            }
            return origDispatch(action, targetPos, sourcePos, vfx, engine, sourceId);
        };

        // Intercept vfx.playEffect
        const recordedVfx = [];
        const origPlayEffect = e.renderer.vfx.playEffect.bind(e.renderer.vfx);
        e.renderer.vfx.playEffect = (...vfxArgs) => {
            recordedVfx.push({
                id: vfxArgs[0],
                x: vfxArgs[1],
                y: vfxArgs[2],
                z: vfxArgs[3],
            });
            return origPlayEffect(...vfxArgs);
        };

        try {
            const initiated = e.initiateCast(caster, 0);
            if (!initiated) throw new Error('initiateCast failed for F02-SINGLE');
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            // At 50% cast, controlled displacement: target teleports to (4, 0)
            window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));
            teleportTo(target, 4, 0, e);

            const tHpBefore = target.hp;
            window.__stepFrames(Math.ceil(skill.cast * 60 * 0.5) + 15);
            const tHpAfter = target.hp;

            if (recordedDispatches.length === 0) {
                throw new Error('Expected sequence action was not dispatched for caster');
            }

            const dispatch = recordedDispatches[0];
            const hasCoordinateDrift = dispatch.diffX > 50; // Expected offset > 100px

            return {
                skillId: skill.id,
                skillName: skill.name,
                skillType: skill.type,
                initialTargetPos,
                targetMovedTo: { q: target.q, r: target.r, px: target.px, py: target.py },
                dispatchObservation: dispatch,
                vfxEffectCallsCount: recordedVfx.length,
                damageDealt: tHpBefore - tHpAfter,
                simDamagedTargetAtNewPosition: (tHpBefore - tHpAfter) > 0,
                visualRemainedAtCastStartPos: hasCoordinateDrift,
                conclusion: 'Simulation damages target agent reference regardless of displacement; Visual sequence dispatches at static target Point3D sampled at CAST_START.',
            };
        } finally {
            e.renderer.sequences.dispatch = origDispatch;
            e.renderer.vfx.playEffect = origPlayEffect;
        }
    });

    results.F02.SINGLE_target_locked = resF02Single;
    results.scenarios.F02_SINGLE_target_locked = {
        status: (resF02Single.simDamagedTargetAtNewPosition && resF02Single.visualRemainedAtCastStartPos) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF02Single,
    };

    console.log('[Probe] F02 completed.');

    // =========================================================================
    // F03: API Boundary Inputs vs UI Inspector Interaction
    // =========================================================================
    console.log('[Probe] Running F03 investigations...');

    // Part 1: API Boundary Pipeline Test
    currentScenario = 'F03_API_boundary_inputs';
    const resF03Api = await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const skill = e.skillDB.find(s => s.id === 'mb_u1');
        if (!skill) throw new Error('Skill mb_u1 not found');

        const origValues = {
            range: skill.range,
            cast: skill.cast,
            cd: skill.cd,
            cost: skill.cost,
            tag: skill.tag,
            type: skill.type,
            power: skill.power,
        };

        const testCases = [
            { field: 'range', input: -5, valueKind: 'number_negative' },
            { field: 'cast', input: -2, valueKind: 'number_negative' },
            { field: 'cd', input: -1, valueKind: 'number_negative' },
            { field: 'cost', input: -50, valueKind: 'number_negative' },
            { field: 'power', input: -100, valueKind: 'number_negative_heal_valid' },
            { field: 'range', input: NaN, valueKind: 'NaN' },
            { field: 'cast', input: Infinity, valueKind: 'Infinity' },
            { field: 'tag', input: 'INVALID_TAG', valueKind: 'string_invalid_enum' },
            { field: 'type', input: 'INVALID_TYPE', valueKind: 'string_invalid_enum' },
        ];

        const testResults = [];

        try {
            for (const tc of testCases) {
                const beforeVal = skill[tc.field];
                e.bus.emit('UI_COMMAND', {
                    type: 'UPDATE_SKILL',
                    skillId: 'mb_u1',
                    field: tc.field,
                    value: tc.input
                });
                const afterVal = skill[tc.field];
                const accepted = tc.valueKind === 'NaN' ? Number.isNaN(afterVal) : (afterVal === tc.input);

                testResults.push({
                    field: tc.field,
                    inputString: String(tc.input),
                    valueKind: tc.valueKind,
                    beforeVal,
                    afterVal: Number.isNaN(afterVal) ? 'NaN' : afterVal,
                    accepted,
                });
            }
        } finally {
            // Restore ALL tested fields via UI_COMMAND
            for (const [k, v] of Object.entries(origValues)) {
                e.bus.emit('UI_COMMAND', {
                    type: 'UPDATE_SKILL',
                    skillId: 'mb_u1',
                    field: k,
                    value: v
                });
            }
        }

        const restoredCorrectly = Object.entries(origValues).every(([k, v]) => skill[k] === v);

        return {
            testedCases: testResults,
            restoredCorrectly,
            summary: {
                negativeNumbersAccepted: testResults.some(r => r.valueKind === 'number_negative' && r.accepted),
                specialValuesAccepted: testResults.some(r => (r.valueKind === 'NaN' || r.valueKind === 'Infinity') && r.accepted),
                invalidEnumsAccepted: testResults.some(r => r.valueKind === 'string_invalid_enum' && r.accepted),
            }
        };
    });

    results.F03.API_boundary_inputs = resF03Api;
    results.scenarios.F03_API_boundary_inputs = {
        status: (resF03Api.restoredCorrectly && resF03Api.summary.negativeNumbersAccepted) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF03Api,
    };

    // Part 2: Real UI DOM Interaction via Playwright
    currentScenario = 'F03_UI_inspector_interaction';
    console.log('[Probe] Running F03 UI Inspector DOM interaction...');

    // 1. Open the DB window via System Menu
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="menu-item-db"]').click();
    await page.waitForTimeout(500);

    const dbWindow = page.locator('[data-window-id="db"]');
    await dbWindow.waitFor({ state: 'visible', timeout: 5000 });

    // 2. Click mb_u1 in skill list inside dbWindow
    const skillRow = dbWindow.getByText('奧術漩渦').first();
    await skillRow.click();
    await page.waitForTimeout(300);

    // 3. Precise inspection of enum controls: tag and type
    const tagLabel = dbWindow.locator('label', { hasText: '技能類型' });
    const tagContainer = tagLabel.locator('..');
    const tagSelect = tagContainer.locator('select');
    const tagVisible = await tagSelect.isVisible();
    if (!tagVisible) throw new Error('Required UI control tagSelect (技能類型) is missing or not visible');

    const tagOptions = await tagSelect.locator('option').allInnerTexts();
    const tagValues = await tagSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));

    const typeLabel = dbWindow.locator('label', { hasText: '目標模式' });
    const typeContainer = typeLabel.locator('..');
    const typeSelect = typeContainer.locator('select');
    const typeVisible = await typeSelect.isVisible();
    if (!typeVisible) throw new Error('Required UI control typeSelect (目標模式) is missing or not visible');

    const typeOptions = await typeSelect.locator('option').allInnerTexts();
    const typeValues = await typeSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));

    // 4. Test numeric range input inside dbWindow
    const rangeLabel = dbWindow.locator('label', { hasText: '極限射程' });
    const rangeContainer = rangeLabel.locator('..');
    const rangeInput = rangeContainer.locator('input[type="number"]');
    const rangeVisible = await rangeInput.isVisible();
    if (!rangeVisible) throw new Error('Required UI numeric control rangeInput (極限射程) is missing or not visible');

    // Snapshot pristine initial value
    const initialRangeDom = await rangeInput.inputValue();
    const initialRangeDb = await page.evaluate(() => {
        const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
        return s ? s.range : null;
    });

    let uiNegativeAccepted = false;
    let uiClearBehavior = null;
    let uiRestoreWorks = false;

    try {
        // Test A: Type negative number into range input
        await rangeInput.fill('-5');
        const negativeDomVal = await rangeInput.inputValue();
        const dbValAfterNegative = await page.evaluate(() => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            return s ? s.range : null;
        });
        uiNegativeAccepted = (negativeDomVal === '-5' && dbValAfterNegative === -5);

        // Test B: Clear input completely and check blur snapback
        await rangeInput.fill('');
        const clearedDomVal = await rangeInput.inputValue();
        const dbValAfterClear = await page.evaluate(() => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            return s ? s.range : null;
        });

        await rangeInput.blur();
        await page.waitForTimeout(100);
        const blurredDomVal = await rangeInput.inputValue();
        const dbValAfterBlur = await page.evaluate(() => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            return s ? s.range : null;
        });

        // In React controlled input, clearing produces NaN rejected by isFinite in UICommandSystem,
        // so DB stays -5, and component rerender snaps DOM value back to '-5'.
        const snappedBack = (clearedDomVal === '-5' && blurredDomVal === '-5' && dbValAfterBlur === -5);

        uiClearBehavior = {
            clearedDomVal,
            dbValAfterClear,
            blurredDomVal,
            dbValAfterBlur,
            snappedBack,
        };

        // Test C: Restore valid value via UI input interaction
        await rangeInput.fill(String(initialRangeDb));
        await page.waitForTimeout(100);
        const restoredDomVal = await rangeInput.inputValue();
        const dbValAfterRestore = await page.evaluate(() => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            return s ? s.range : null;
        });

        uiRestoreWorks = (dbValAfterRestore === initialRangeDb && String(restoredDomVal) === String(initialRangeDb));
    } finally {
        // Guarantee pristine state in finally via UI_COMMAND and verify restoration
        await page.evaluate((origVal) => {
            window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', {
                type: 'UPDATE_SKILL',
                skillId: 'mb_u1',
                field: 'range',
                value: origVal
            });
        }, initialRangeDb);
    }

    const resF03Ui = {
        inspectorOpened: true,
        controlsChecked: {
            tagSelect: { visible: tagVisible, options: tagOptions, values: tagValues },
            typeSelect: { visible: typeVisible, options: typeOptions, values: typeValues },
            rangeInput: { visible: rangeVisible, initialRangeDom, initialRangeDb },
        },
        uiNegativeAccepted,
        uiClearBehavior,
        uiRestoreWorks,
        conclusion: 'In UI: tag and type are constrained by dedicated select dropdowns; numeric inputs accept negative numbers; clearing numeric input produces NaN rejected by isFinite, causing DOM to snap back to previous valid state.',
    };

    results.F03.UI_inspector_interaction = resF03Ui;
    results.scenarios.F03_UI_inspector_interaction = {
        status: (resF03Ui.uiNegativeAccepted && resF03Ui.uiClearBehavior.snappedBack && resF03Ui.uiRestoreWorks) ? 'OBSERVED' : 'NOT_REPRODUCED',
        data: resF03Ui,
    };

    console.log('[Probe] F03 completed.');

} catch (err) {
    console.error(`[Probe] Error occurred during scenario [${currentScenario}]:`, err);
    results.errors.push({
        currentScenario,
        message: err.message,
        stack: err.stack,
    });
    if (results.scenarios[currentScenario]) {
        results.scenarios[currentScenario].status = 'ERROR';
        results.scenarios[currentScenario].error = err.message;
    }
    process.exitCode = 1;
} finally {
    // Graceful teardown
    try {
        if (browser) await browser.close();
    } catch (e) {
        console.error('[Probe] Error closing browser in finally:', e.message);
    }
    try {
        if (server) await server.close();
    } catch (e) {
        console.error('[Probe] Error closing server in finally:', e.message);
    }

    // Compute final status and counts
    let completedCount = 0;
    let observedCount = 0;
    let notRepCount = 0;
    let errorCount = 0;
    let notRunCount = 0;

    for (const key of requiredScenarioKeys) {
        const s = results.scenarios[key]?.status || 'NOT_RUN';
        if (s === 'OBSERVED') {
            observedCount++;
            completedCount++;
        } else if (s === 'NOT_REPRODUCED') {
            notRepCount++;
            completedCount++;
        } else if (s === 'ERROR') {
            errorCount++;
            completedCount++;
        } else {
            notRunCount++;
        }
    }

    results.summary.completedScenarios = completedCount;
    results.summary.observedScenarios = observedCount;
    results.summary.notReproducedScenarios = notRepCount;
    results.summary.errorScenarios = errorCount;
    results.summary.notRunScenarios = notRunCount;

    // Track product bugs observed during valid measurement
    if (results.scenarios.F01_C1_state_injected_death_run1?.status === 'OBSERVED' &&
        results.scenarios.F01_C2_controlled_lethal_damage_run1?.status === 'OBSERVED') {
        results.summary.productBugsObserved.push('F01: Caster death leaves sequence action queue active without CAST_BREAK');
    }
    if (results.scenarios.F02_SINGLE_target_locked?.status === 'OBSERVED') {
        results.summary.productBugsObserved.push('F02: Single target sequence action target Point3D does not track displaced target');
    }
    if (results.scenarios.F03_API_boundary_inputs?.status === 'OBSERVED' &&
        results.scenarios.F03_UI_inspector_interaction?.status === 'OBSERVED') {
        results.summary.productBugsObserved.push('F03: UPDATE_SKILL lacks numeric lower bounds schema and empty input handling');
    }

    // Overall tool execution success: all required scenarios ran, 0 errors, 0 page errors
    const allRequiredCompleted = completedCount === requiredScenarioKeys.length && notRunCount === 0;
    const noErrors = results.errors.length === 0 && results.pageErrors.length === 0;
    const toolSuccess = allRequiredCompleted && noErrors;

    results.summary.toolExecutionStatus = toolSuccess ? 'SUCCESS' : 'FAILED';
    if (!toolSuccess) {
        process.exitCode = process.exitCode || 1;
    }

    // Write output JSON
    const outputPath = join(outDir, 'repro_results.json');
    try {
        writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
        if (toolSuccess) {
            console.log(`[Probe] All ${requiredScenarioKeys.length} scenarios completed successfully (EXIT=0). Output saved to ${outputPath}`);
        } else {
            console.error(`[Probe] Probe execution failed or incomplete (EXIT=${process.exitCode || 1}). Scenarios completed: ${completedCount}/${requiredScenarioKeys.length}. Output saved to ${outputPath}`);
        }
    } catch (writeErr) {
        console.error('[Probe] Failed to write results JSON:', writeErr);
        process.exitCode = 1;
    }
}
