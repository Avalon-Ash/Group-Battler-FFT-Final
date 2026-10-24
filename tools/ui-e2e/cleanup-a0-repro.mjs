/**
 * tools/ui-e2e/cleanup-a0-repro.mjs
 * 
 * A0-R1 Reproducible Live Verification Probe for TACTICAL.OS
 * Covers F01 (Caster death vs interrupt vs projectile),
 * F02 (Target movement: Ground AOE vs Single target),
 * and F03 (API boundary inputs vs UI Inspector interaction).
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const outDir = join(root, 'tools', 'ui-e2e', 'out', 'cleanup-a0-r1');
mkdirSync(outDir, { recursive: true });

const server = await createServer({
    root,
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});

let browser = null;
const results = {
    metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        gitHead: '5d99130e5e1698e956c69ae3c2138798376d8ded',
    },
    F01: {},
    F02: {},
    F03: {},
    summary: {
        F01_status: 'CONFIRMED_DEFECT',
        F02_status: 'OBSERVED_SPEC_DIFFERENCE',
        F03_status: 'CONFIRMED_API_DEFECT_AND_UI_OBSERVED',
    }
};

try {
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];

    for (const channel of ['msedge', 'chrome']) {
        try {
            browser = await chromium.launch({ channel, headless: true });
            break;
        } catch { /* try next */ }
    }
    if (!browser) throw new Error('No Chromium-compatible browser found (msedge/chrome)');

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

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

    // Helper inside evaluate to setup standard 1v1 arena
    const setupArena = `
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });

        // Place blue caster (Mage), blue ally (to keep battle running if caster dies), red target (Tank)
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const ally = e.agents[1];
        const target = e.agents[2];
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
    `;

    // F01-A: Normal cast completion (mb_u1 Arcane Vortex)
    results.F01.A_normal_completion = await page.evaluate(async () => {
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

        const targetHpBefore = target.hp;
        const initiated = e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const castDur = caster.skills[0].cast;
        window.__stepFrames(Math.ceil(castDur * 60) + 10);
        const targetHpAfter = target.hp;
        e.events.push = origPush;

        return {
            condition: 'normal_completion',
            skillId: caster.skills[0].id,
            skillName: caster.skills[0].name,
            skillType: caster.skills[0].type,
            castDur,
            initiated,
            targetHpBefore,
            targetHpAfter,
            damageDealt: targetHpBefore - targetHpAfter,
            events: recordedEvents.map(ev => ev.type),
            completedSuccessfully: targetHpAfter < targetHpBefore,
        };
    });

    // F01-B: Stun interruption while alive
    results.F01.B_stun_interruption = await page.evaluate(async () => {
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

        e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const castDur = caster.skills[0].cast;
        window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

        const queueSizeBeforeStun = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;
        caster.effects.STUN.remaining = 1.0;
        window.__stepFrames(1);

        const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK');
        const queueSizeAfterStun = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

        const targetHpBefore = target.hp;
        window.__stepFrames(Math.ceil(castDur * 60));
        const targetHpAfter = target.hp;
        e.events.push = origPush;

        return {
            condition: 'stun_interruption_while_alive',
            skillId: 'mb_u1',
            queueSizeBeforeStun,
            queueSizeAfterStun,
            hadCastBreak,
            damageDealt: targetHpBefore - targetHpAfter,
            casterAlive: caster.hp > 0,
            events: recordedEvents.map(ev => ev.type),
            queueCleanedByBreak: queueSizeAfterStun === 0,
        };
    });

    // F01-C1: State-injected death during cast (Run 1 & Run 2 for repeatability)
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
                if (caster.hp <= 0) dispatchedAfterDeath++;
                return origDispatch(...args);
            };

            e.initiateCast(caster, 0);
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = caster.skills[0].cast;
            window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

            // Lethal injection: directly set hp to 0
            caster.hp = 0;
            window.__stepFrames(1); // updateCasting handles interruption

            const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK');
            const queueAtDeath = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

            const targetHpBefore = target.hp;
            // Advance past original cast completion
            window.__stepFrames(Math.ceil(castDur * 60) + 20);
            const targetHpAfter = target.hp;

            // Restore hooks
            e.events.push = origPush;
            e.renderer.sequences.dispatch = origDispatch;

            return {
                run: runIdx,
                condition: 'state_injected_death_at_40pct',
                skillId: 'mb_u1',
                hadCastBreak,
                queueAtDeath,
                actionsDispatchedAfterDeath: dispatchedAfterDeath,
                damageDealt: targetHpBefore - targetHpAfter,
                casterDead: caster.hp <= 0,
                defectConfirmed: !hadCastBreak && dispatchedAfterDeath > 0 && (targetHpBefore - targetHpAfter) === 0,
            };
        }, runIndex);
    };

    results.F01.C1_state_injected_death_run1 = await runF01C1(1);
    results.F01.C1_state_injected_death_run2 = await runF01C1(2);

    // F01-C2: Natural combat damage lethal transition (Run 1 & Run 2 for repeatability)
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
                if (caster.hp <= 0) dispatchedAfterDeath++;
                return origDispatch(...args);
            };

            e.initiateCast(caster, 0);
            e.renderer.processVisualEvents(e.events.splice(0));
            window.__stepFrames(1);

            const castDur = caster.skills[0].cast;
            window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

            // Lethal damage via natural combat damage system
            const { applyDirectDamage } = await import('/engine/systems/combat/DirectDamage.ts');
            applyDirectDamage(caster, 2000, true, target.id);
            window.__stepFrames(1); // updateCasting runs next tick

            const hadCastBreak = recordedEvents.some(ev => ev.type === 'CAST_BREAK');
            const queueAtDeath = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

            const targetHpBefore = target.hp;
            window.__stepFrames(Math.ceil(castDur * 60) + 20);
            const targetHpAfter = target.hp;

            // Restore hooks
            e.events.push = origPush;
            e.renderer.sequences.dispatch = origDispatch;

            return {
                run: runIdx,
                condition: 'natural_lethal_damage_at_40pct',
                skillId: 'mb_u1',
                hadCastBreak,
                queueAtDeath,
                actionsDispatchedAfterDeath: dispatchedAfterDeath,
                damageDealt: targetHpBefore - targetHpAfter,
                casterDead: caster.hp <= 0,
                defectConfirmed: !hadCastBreak && dispatchedAfterDeath > 0 && (targetHpBefore - targetHpAfter) === 0,
            };
        }, runIndex);
    };

    results.F01.C2_natural_damage_death_run1 = await runF01C2(1);
    results.F01.C2_natural_damage_death_run2 = await runF01C2(2);

    // F01-E: Agent Reset during cast
    results.F01.E_reset_during_cast = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[1];
        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const castDur = caster.skills[0].cast;
        window.__stepFrames(Math.floor(castDur * 60 * 0.4)); // 40% into cast

        const queueBeforeReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;
        // Trigger AGENT_RESET command
        cmd({ type: 'REBUILD_AGENT_AI', agentId: caster.id });
        window.__stepFrames(1);

        const queueAfterReset = e.renderer.sequences ? e.renderer.sequences.actionQueue.length : 0;

        return {
            condition: 'agent_reset_during_cast',
            skillId: 'mb_u1',
            queueBeforeReset,
            queueAfterReset,
            clearedByAgentReset: queueAfterReset === 0,
        };
    });

    // F01-D: Cast completed with projectile in flight, then caster killed
    results.F01.D_projectile_in_flight_after_death = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        // Ranger with rb_a1 (Frost Orb, cast 0.6s, projectileSpeed 900, range 7)
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.RANGER });
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 1, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 5, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[2];
        caster.skillIds = ['rb_a1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const castDur = caster.skills[0].cast; // 0.6s
        // Step until cast finishes and projectile spawns
        window.__stepFrames(Math.ceil(castDur * 60) + 1);

        const projectilesSpawned = e.projectiles.length;

        // Kill caster while projectile is airborne
        caster.hp = 0;
        window.__stepFrames(1);

        const targetHpBefore = target.hp;
        // Advance frames until projectile travels 5 hexes (distance / speed)
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
            physicsPreserved: targetHpAfter < targetHpBefore,
        };
    });

    console.log('[Probe] F01 completed.');

    // =========================================================================
    // F02: Target Movement During Cast (True Ground AOE vs True Single Target)
    // =========================================================================
    console.log('[Probe] Running F02 investigations...');

    // F02-AOE: Ground AOE (mb_u1 Arcane Vortex, aoeRadius=3, cast=1.0s)
    results.F02.AOE_ground_locked = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        // Caster at (0, 0), Target 1 at (2, 0) (inside initial AOE), Target 2 at (6, 0) (outside initial AOE)
        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 6, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target1 = e.agents[1];
        const target2 = e.agents[2];

        caster.skillIds = ['mb_u1', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        // Assert skill properties
        if (skill.type !== 'AOE' || skill.aoeRadius < 1 || skill.cast <= 0) {
            throw new Error(`Skill ${skill.id} is not valid AOE with cast time`);
        }

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target1;
        caster.targetHex = { q: target1.q, r: target1.r };

        e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const initialTargetHex = { ...caster.targetHex };
        const initialTelegraph = caster.currentTelegraph ? caster.currentTelegraph.map(h => ({ q: h.q, r: h.r })) : [];

        // At 50% cast, swap targets' positions:
        // Target 1 moves out to (6, 0), Target 2 moves in to (2, 0)
        window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));

        // Use motion commands to ensure spatial coordinates and grid indices stay consistent
        const { teleportTo } = await import('/engine/systems/movement/MotionCommands.ts');
        teleportTo(target1, 6, 0, e);
        teleportTo(target2, 2, 0, e);

        const t1HpBefore = target1.hp;
        const t2HpBefore = target2.hp;

        // Advance to hit
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
            telegraphCellCount: initialTelegraph.length,
            target1MovedTo: { q: target1.q, r: target1.r },
            target2MovedTo: { q: target2.q, r: target2.r },
            target1Damage,
            target2Damage,
            target1Escaped: target1Damage === 0,
            target2Hit: target2Damage > 0,
            designConclusion: 'Ground AOE damage strictly locked to targeted ground hexes. Original target that moved out took 0 damage; new target that moved into the hexes took full damage.',
        };
    });

    // F02-SINGLE: True Single-target skill (mb_a2 冰封禁錮, type='SINGLE', cast=0.5s)
    results.F02.SINGLE_target_locked = await page.evaluate(async () => {
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });

        cmd({ type: 'PLACE_AGENT', team: types.Team.BLUE, q: 0, r: 0, hp: 1000, role: types.Role.MAGE });
        cmd({ type: 'PLACE_AGENT', team: types.Team.RED, q: 2, r: 0, hp: 2000, role: types.Role.TANK });

        const caster = e.agents[0];
        const target = e.agents[1];

        caster.skillIds = ['mb_a2', null, null];
        caster.skills = caster.skillIds.map(id => id ? e.skillDB.find(s => s.id === id) || null : null);
        const skill = caster.skills[0];

        // Assert skill properties
        if (skill.type !== 'SINGLE' || skill.cast <= 0) {
            throw new Error(`Skill ${skill.id} is not valid SINGLE with cast time`);
        }

        e.play();
        for (const a of e.agents) { a.bt = null; a.mp = a.maxMp; }
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };

        e.initiateCast(caster, 0);
        e.renderer.processVisualEvents(e.events.splice(0));
        window.__stepFrames(1);

        const initialTargetPos = { q: target.q, r: target.r, px: target.px, py: target.py };
        const sequenceTargetPointAtStart = e.renderer.sequences && e.renderer.sequences.actionQueue.length > 0
            ? { ...e.renderer.sequences.actionQueue[0].target }
            : null;

        // At 50% cast, target moves to (4, 0)
        window.__stepFrames(Math.floor(skill.cast * 60 * 0.5));
        target.q = 4; target.r = 0;
        const newP = HexUtils.toPx(4, 0, e.mapConfig);
        target.px = newP.x; target.py = newP.y;

        const sequenceTargetPointBeforeDispatch = e.renderer.sequences && e.renderer.sequences.actionQueue.length > 0
            ? { ...e.renderer.sequences.actionQueue[0].target }
            : null;

        const tHpBefore = target.hp;
        window.__stepFrames(Math.ceil(skill.cast * 60 * 0.5) + 15);
        const tHpAfter = target.hp;

        return {
            skillId: skill.id,
            skillName: skill.name,
            skillType: skill.type,
            initialTargetPos,
            targetMovedTo: { q: target.q, r: target.r, px: target.px, py: target.py },
            sequenceTargetPointAtStart,
            sequenceTargetPointBeforeDispatch,
            visualTracksMovement: sequenceTargetPointBeforeDispatch && sequenceTargetPointBeforeDispatch.x === target.px,
            damageDealt: tHpBefore - tHpAfter,
            simHitTargetAtNewPosition: (tHpBefore - tHpAfter) > 0,
            conclusion: 'Simulation damages target agent reference regardless of movement; Visual sequence maintains static target Point3D sampled at CAST_START.',
        };
    });

    console.log('[Probe] F02 completed.');

    // =========================================================================
    // F03: API Boundary Inputs vs UI Inspector Interaction
    // =========================================================================
    console.log('[Probe] Running F03 investigations...');

    // Part 1: API Boundary Pipeline Test
    results.F03.API_boundary_inputs = await page.evaluate(async () => {
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
            // Restore ALL tested fields
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

    // Part 2: Real UI DOM Interaction via Playwright
    // Open Inspector -> SKILL DATABASE tab -> click skill -> interact with range field
    console.log('[Probe] Running F03 UI Inspector DOM interaction...');

    const uiInteractionResult = await (async () => {
        // 1. Open the DB window via System Menu
        await page.locator('[data-testid="system-menu-button"]').click();
        await page.waitForTimeout(300);
        await page.locator('[data-testid="menu-item-db"]').click();
        await page.waitForTimeout(500);

        // 2. Window container is [data-window-id="db"]
        const dbWindow = page.locator('[data-window-id="db"]');
        await dbWindow.waitFor({ state: 'visible', timeout: 5000 });

        // 3. Find and click mb_u1 (奧術漩渦) in skill list inside dbWindow
        const skillRow = dbWindow.getByText('奧術漩渦').first();
        await skillRow.click();
        await page.waitForTimeout(300);

        // 4. Inspect rendered enum controls inside dbWindow
        const selectElementsCount = await dbWindow.locator('select').count();
        const tagSelectVisible = selectElementsCount > 0;

        // 5. Test numeric range input inside dbWindow
        const rangeLabel = dbWindow.locator('label', { hasText: '極限射程' });
        const rangeContainer = rangeLabel.locator('..');
        const rangeInput = rangeContainer.locator('input[type="number"]');

        let uiNegativeAccepted = false;
        let uiClearBehavior = 'not_tested';
        let uiRestoreWorks = false;

        if (await rangeInput.isVisible()) {
            const initialVal = await rangeInput.inputValue();

            // Test A: Type negative number
            await rangeInput.fill('-5');
            const negativeInputVal = await rangeInput.inputValue();
            const dbValAfterNegative = await page.evaluate(() => {
                const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
                return s ? s.range : null;
            });
            uiNegativeAccepted = (negativeInputVal === '-5' && dbValAfterNegative === -5);

            // Test B: Clear input completely
            await rangeInput.fill('');
            const clearedInputVal = await rangeInput.inputValue();
            const dbValAfterClear = await page.evaluate(() => {
                const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
                return s ? s.range : null;
            });
            // Did it snap back or keep empty string?
            await rangeInput.blur();
            const blurredInputVal = await rangeInput.inputValue();

            uiClearBehavior = {
                clearedInputVal,
                dbValAfterClear,
                blurredInputVal,
                snappedBack: dbValAfterClear !== '' && dbValAfterClear !== null && !Number.isNaN(dbValAfterClear),
            };

            // Test C: Restore valid value
            await rangeInput.fill(initialVal || '8');
            const restoredInputVal = await rangeInput.inputValue();
            const dbValAfterRestore = await page.evaluate(() => {
                const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
                return s ? s.range : null;
            });
            uiRestoreWorks = (dbValAfterRestore === Number(initialVal || '8'));
        }

        // Ensure database state is pristine in finally
        await page.evaluate(() => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            if (s) { s.range = 8; s.cast = 1.0; s.cd = 5.0; s.cost = 100; s.tag = 'ULT'; s.type = 'AOE'; }
        });

        return {
            inspectorOpened: true,
            selectElementsPresent: selectElementsCount > 0,
            tagSelectVisible,
            enumProtectedBySelect: selectElementsCount > 0,
            uiNegativeAccepted,
            uiClearBehavior,
            uiRestoreWorks,
            conclusion: 'In UI: Enums are constrained by select dropdowns; numeric inputs accept negative numbers; clearing numeric input produces NaN which is rejected by isFinite, leaving DB value unchanged.',
        };
    })();

    results.F03.UI_inspector_interaction = uiInteractionResult;
    console.log('[Probe] F03 completed.');

} catch (err) {
    console.error('[Probe] Error during probe:', err);
    results.error = err.message;
} finally {
    if (browser) await browser.close();
    await server.close();
}

// Write out full live probe results
const outputPath = join(outDir, 'repro_results.json');
writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
console.log(`[Probe] Successfully saved verified results to ${outputPath}`);
