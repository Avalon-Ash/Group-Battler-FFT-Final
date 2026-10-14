/**
 * tools/ui-e2e/br-soak.mjs
 * Battle Royale Soak & Diagnostics Harness (B0)
 *
 * Runs Battle Royale automated soak across N seeds (default 20),
 * stepping deterministic frames via __stepFrames, sampling every 0.5 sim-seconds.
 * Detects:
 *   1. GHOST: Units standing on removed tiles, frozen physics, uncollected corpses, or lingering map occupancy.
 *   2. IDLE: Alive, non-CCed, non-casting units that stand completely idle with enemies alive for >= IDLE_GRACE_SEC.
 * Outputs:
 *   tools/ui-e2e/out/br_soak.json
 *   Terminal summary report table
 */

import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec'; // 啟動戰術模擬
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

// Parse CLI flags
const args = process.argv.slice(2);
const assertMode = args.includes('--assert');
const assertGhostOnly = args.includes('--assert-ghost');

function getArgValue(name, defaultVal) {
    const prefix = `--${name}=`;
    const found = args.find(a => a.startsWith(prefix));
    if (found) {
        const v = parseInt(found.slice(prefix.length), 10);
        return isNaN(v) ? defaultVal : v;
    }
    return defaultVal;
}

const SEED_COUNT = getArgValue('seeds', 20);
const SIM_SECONDS = getArgValue('simTime', 180);
const GHOST_GRACE_SEC = getArgValue('ghostGrace', 6);
const IDLE_GRACE_SEC = getArgValue('idleGrace', 6);
const SHRINK_INTERVAL = getArgValue('shrinkInterval', 3);

const launchBrowser = async () => {
    const launchArgs = [
        '--enable-gpu-rasterization',
        '--ignore-gpu-blocklist',
        '--window-size=1280,720',
    ];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args: launchArgs });
    }
    for (const channel of ['msedge', 'chrome']) {
        try {
            return await chromium.launch({ channel, headless: true, args: launchArgs });
        } catch {
            // try next
        }
    }
    throw new Error('No Edge or Chrome found. Set E2E_BROWSER_PATH.');
};

console.log('====================================================');
console.log('       TACTICAL.OS — BATTLE ROYALE SOAK HARNESS     ');
console.log(` Seeds: ${SEED_COUNT} | Max Sim: ${SIM_SECONDS}s | ShrinkInterval: ${SHRINK_INTERVAL}s `);
console.log(` Ghost Grace: ${GHOST_GRACE_SEC}s | Idle Grace: ${IDLE_GRACE_SEC}s `);
console.log('====================================================\n');

const server = await createServer({
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];

const browser = await launchBrowser();
const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
});
const page = await ctx.newPage();

// Inject deterministic time & seeded RNG harness before scripts load
await page.addInitScript(() => {
    let seed = 1337;
    function mulberry32() {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    Math.random = mulberry32;

    let syntheticTime = 1000.0;
    window.__resetSeed = (s = 1337) => {
        seed = s;
        syntheticTime = 1000.0;
    };
    Date.now = () => Math.floor(syntheticTime);
    performance.now = () => syntheticTime;

    let rafId = 0;
    const rafCallbacks = new Map();
    window.requestAnimationFrame = (cb) => {
        const id = ++rafId;
        rafCallbacks.set(id, cb);
        return id;
    };
    window.cancelAnimationFrame = (id) => {
        rafCallbacks.delete(id);
    };

    window.__stepFrames = (n = 1) => {
        for (let i = 0; i < n; i++) {
            syntheticTime += 16.666666666666668;
            const callbacks = Array.from(rafCallbacks.entries());
            rafCallbacks.clear();
            for (const [, cb] of callbacks) {
                cb(syntheticTime);
            }
        }
    };
});

// Navigate to app
await page.goto(`${baseUrl}?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 }).catch(() => {});
await page.evaluate(() => window.__stepFrames(10));

// Enter manual battle mode
const startBtn = page.getByText(START_TEXT);
if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));
}

const clickDice = async () => {
    const clicked = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (clicked !== 1) {
        throw new Error(`clickDice: dice button matched ${clicked} elements`);
    }
};

const results = [];
let totalGhosts = 0;
let totalIdles = 0;

for (let i = 1; i <= SEED_COUNT; i++) {
    const seed = 1000 + i;
    process.stdout.write(`[Seed ${i.toString().padStart(2, ' ')}/${SEED_COUNT}] Seed #${seed} ... `);

    // 1. Seed RNG
    await page.evaluate((s) => window.__resetSeed(s), seed);

    // 2. Generate new battlefield & roster
    await clickDice();
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__stepFrames(10));

    // 3. Run simulated battle royale and sample
    const seedResult = await page.evaluate(async ({
        seedVal,
        maxSimSeconds,
        shrinkInterval,
        ghostGraceSec,
        idleGraceSec,
    }) => {
        const engine = window.__TACTICAL_ENGINE__;
        if (!engine) throw new Error('TacticalEngine not found on window.__TACTICAL_ENGINE__');

        // Configure rapid Battle Royale shrink
        engine.bus.emit('UI_COMMAND', {
            type: 'SET_ZONE_CONFIG',
            config: {
                enabled: true,
                initialRadius: 12,
                shrinkInterval: shrinkInterval,
                minRadius: 1,
            },
        });

        // Start game
        engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });

        const collapseTimes = new Map(); // hexKey -> first noticed collapsed simTime
        const recordedGhosts = new Set();
        const recordedIdles = new Set();
        const ghostEvents = [];
        const idleEvents = [];
        const snapshots = [];

        const idleTrackers = new Map(); // agentId -> { lastActiveTime, lastQ, lastR, lastPx, lastPy, triggered }

        // Helper to dump BT tree state
        function dumpBT(node, depth = 0) {
            if (!node || depth > 6) return null;
            return {
                name: node.n,
                type: node.type,
                status: node.status,
                lastResult: node.lastResult,
                children: Array.isArray(node.c) ? node.c.map(ch => dumpBT(ch, depth + 1)) : [],
            };
        }

        // Helper to capture full diagnostic snapshot
        function captureSnapshot(a, currentSimTime, idleDuration) {
            const aKey = `${a.q},${a.r}`;
            const tileValid = engine.map.isValid(a.q, a.r);
            const tileWarning = engine.isWarningTile(aKey);
            const hazards = engine.getSpatialHazardsAt(a.q, a.r).map(h => ({ team: h.team, type: h.type, dur: +h.duration.toFixed(1) }));

            let targetSnap = null;
            if (a.target) {
                const t = a.target;
                const tKey = `${t.q},${t.r}`;
                targetSnap = {
                    id: t.id,
                    team: t.team,
                    role: t.role,
                    hp: t.hp,
                    maxHp: t.maxHp,
                    banished: t.banished,
                    outOfBounds: t.outOfBounds,
                    q: t.q,
                    r: t.r,
                    tileValid: engine.map.isValid(t.q, t.r),
                    tileWarning: engine.isWarningTile(tKey),
                    distance: +Math.hypot(a.q - t.q, a.r - t.r).toFixed(2),
                };
            }

            const NEIGHBOR_OFFSETS = [
                { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
                { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
            ];
            const neighbors = NEIGHBOR_OFFSETS.map(dir => {
                const nq = a.q + dir.q;
                const nr = a.r + dir.r;
                const nKey = `${nq},${nr}`;
                const valid = engine.map.isValid(nq, nr);
                const blocked = engine.isBlocked(nq, nr, a.id, a.movementType);
                const hasObstacle = engine.map.obstacles.has(nKey);
                const warning = engine.isWarningTile(nKey);
                const nHazards = engine.getSpatialHazardsAt(nq, nr).map(h => ({ team: h.team, type: h.type }));
                const hash = ((Math.round(nq) + 128) << 16) | (Math.round(nr) + 128);
                const occ = engine.map.agentMap.get(hash);
                return {
                    q: nq,
                    r: nr,
                    valid,
                    blocked,
                    hasObstacle,
                    warning,
                    hazards: nHazards,
                    occupant: occ ? {
                        id: occ.id,
                        team: occ.team,
                        role: occ.role,
                        hp: occ.hp,
                        fullyDead: occ.fullyDead,
                    } : null,
                };
            });

            const recentLogs = (engine.logger?.logs || [])
                .filter(l => l.agentId === a.id)
                .slice(-8)
                .map(l => ({
                    time: +l.time.toFixed(2),
                    type: l.type,
                    action: l.actionName,
                    target: l.targetInfo,
                    detail: l.detail,
                }));

            return {
                agentId: a.id,
                role: a.role,
                team: a.team,
                simTime: +currentSimTime.toFixed(2),
                idleDuration: +idleDuration.toFixed(2),
                pos: { q: a.q, r: a.r, px: +a.px.toFixed(1), py: +a.py.toFixed(1) },
                hp: a.hp,
                maxHp: a.maxHp,
                inSafeZone: !tileWarning,
                tileStatus: { valid: tileValid, warning: tileWarning, hazards },
                target: targetSnap,
                targetHex: a.targetHex ? { q: a.targetHex.q, r: a.targetHex.r } : null,
                movement: {
                    pathLength: a.path ? a.path.length : 0,
                    isMoving: a.isMoving,
                    animState: a.animState,
                    actionState: a.actionState,
                    aiState: a.aiState,
                    stuckTicks: a.stuckTicks,
                },
                timers: {
                    stunTimer: +a.stunTimer.toFixed(2),
                    castTimer: +a.castTimer.toFixed(2),
                    curCDs: (a.curCDs || []).map(cd => +cd.toFixed(2)),
                    escapeCooldown: +a.escapeCooldown.toFixed(2),
                    aiUpdateTimer: +a.aiUpdateTimer.toFixed(2),
                    castingSkillIdx: a.castingSkillIdx,
                },
                recentLogs,
                btTree: dumpBT(a.bt),
                neighbors,
            };
        }

        const framesPerSample = 30; // 0.5s at 60fps
        const maxSteps = Math.ceil(maxSimSeconds / 0.5);

        let currentSim = 0;
        let step = 0;
        let blueAlive = 0;
        let redAlive = 0;

        while (step < maxSteps) {
            step++;
            window.__stepFrames(framesPerSample);
            currentSim = engine.battleTime;

            // Update collapsed tiles map
            for (const key of Array.from(engine.map.mapKeys)) {
                if (!engine.map.isValid(...key.split(',').map(Number))) {
                    if (!collapseTimes.has(key)) {
                        collapseTimes.set(key, currentSim);
                    }
                }
            }

            // Also check all agent positions: if tile is not valid and not recorded, mark it
            for (const a of engine.agents) {
                const k = `${a.q},${a.r}`;
                if (!engine.map.isValid(a.q, a.r) && !collapseTimes.has(k)) {
                    collapseTimes.set(k, currentSim);
                }
            }

            // Check alive teams
            blueAlive = 0;
            redAlive = 0;
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    if (a.team === 0 || a.team === 'BLUE') blueAlive++;
                    else if (a.team === 1 || a.team === 'RED') redAlive++;
                }
            }
            const matchOngoing = blueAlive > 0 && redAlive > 0;

            // ── GHOST CHECK ──
            const allAgentsPool = new Map();
            for (const a of engine.agents) allAgentsPool.set(a.id, a);
            if (engine.map?.agentMap) {
                for (const [, a] of engine.map.agentMap.entries()) {
                    if (a?.id) allAgentsPool.set(a.id, a);
                }
            }

            for (const a of allAgentsPool.values()) {
                const k = `${a.q},${a.r}`;
                const tileValid = engine.map.isValid(a.q, a.r);

                if (!tileValid) {
                    const cTime = collapseTimes.get(k) ?? currentSim;
                    const elapsed = currentSim - cTime;

                    if (elapsed >= ghostGraceSec) {
                        const inAgents = engine.agents.some(x => x.id === a.id);
                        const hash = ((Math.round(a.q) + 128) << 16) | (Math.round(a.r) + 128);
                        const inAgentMap = engine.map.agentMap.get(hash) === a;
                        const inGetAgentAt = engine.map.getAgentAt(a.q, a.r) === a;
                        const zFrozen = a.physics.z >= 0;
                        const deadNotFullyDead = a.hp <= 0 && !a.fullyDead;

                        if (inAgents || inAgentMap || inGetAgentAt || zFrozen || deadNotFullyDead) {
                            if (!recordedGhosts.has(a.id)) {
                                recordedGhosts.add(a.id);
                                ghostEvents.push({
                                    agentId: a.id,
                                    role: a.role,
                                    team: a.team === 0 ? 'BLUE' : (a.team === 1 ? 'RED' : a.team),
                                    simTime: +currentSim.toFixed(2),
                                    timeSinceCollapse: +elapsed.toFixed(2),
                                    q: a.q,
                                    r: a.r,
                                    z: +a.physics.z.toFixed(2),
                                    hp: a.hp,
                                    fullyDead: a.fullyDead,
                                    deadLogged: a.deadLogged,
                                    inAgents,
                                    inAgentMap,
                                    inGetAgentAt,
                                    zFrozen,
                                    deadNotFullyDead,
                                });
                            }
                        }
                    }
                }

                // Check: fullyDead unit still lingering in map occupancy
                if (a.fullyDead) {
                    const hash = ((Math.round(a.q) + 128) << 16) | (Math.round(a.r) + 128);
                    const lingeringInMap = engine.map.agentMap.get(hash) === a || engine.map.getAgentAt(a.q, a.r) === a;
                    if (lingeringInMap) {
                        const key = `lingering_fullyDead_${a.id}`;
                        if (!recordedGhosts.has(key)) {
                            recordedGhosts.add(key);
                            ghostEvents.push({
                                type: 'GHOST_FULLY_DEAD_MAP_OCCUPANCY',
                                agentId: a.id,
                                role: a.role,
                                team: a.team === 0 ? 'BLUE' : (a.team === 1 ? 'RED' : a.team),
                                simTime: +currentSim.toFixed(2),
                                q: a.q,
                                r: a.r,
                                inAgentMap: engine.map.agentMap.get(hash) === a,
                                inGetAgentAt: engine.map.getAgentAt(a.q, a.r) === a,
                            });
                        }
                    }
                }
            }

            // ── IDLE CHECK ──
            if (matchOngoing) {
                for (const a of engine.agents) {
                    if (a.hp <= 0) continue;

                    const isCC = a.stunTimer > 0 || a.banished || a.fearTimer > 0 || a.stasisTimer > 0 || a.actionState === 5 || a.animState === 5;
                    const isCasting = a.castingSkillIdx !== -1 || a.actionState === 4 || a.actionState === 'CASTING';
                    const isMoving = a.isMoving || (a.path && a.path.length > 0) || a.actionState === 1 || a.actionState === 3 || a.actionState === 'WALKING' || a.actionState === 'EVADING' || a.animState === 6;
                    const isAttacking = a.actionState === 2 || a.actionState === 'ATTACKING' || a.animState === 2 || a.animState === 'ATTACK' || a.animState === 'CAST_ULT';

                    let tr = idleTrackers.get(a.id);
                    if (!tr) {
                        tr = {
                            lastActiveTime: currentSim,
                            lastQ: a.q,
                            lastR: a.r,
                            lastPx: a.px,
                            lastPy: a.py,
                            triggered: false,
                        };
                        idleTrackers.set(a.id, tr);
                    }

                    if (isCC) {
                        // Incapacitated: reset timer
                        tr.lastActiveTime = currentSim;
                        tr.lastQ = a.q;
                        tr.lastR = a.r;
                        tr.lastPx = a.px;
                        tr.lastPy = a.py;
                        tr.triggered = false;
                        continue;
                    }

                    const distMoved = Math.hypot(a.px - tr.lastPx, a.py - tr.lastPy);
                    const posChanged = a.q !== tr.lastQ || a.r !== tr.lastR || distMoved > 5;

                    if (isCasting || isMoving || isAttacking || posChanged) {
                        tr.lastActiveTime = currentSim;
                        tr.lastQ = a.q;
                        tr.lastR = a.r;
                        tr.lastPx = a.px;
                        tr.lastPy = a.py;
                        tr.triggered = false;
                    } else {
                        const idleDur = currentSim - tr.lastActiveTime;
                        if (idleDur >= idleGraceSec && !tr.triggered) {
                            tr.triggered = true;
                            const snap = captureSnapshot(a, currentSim, idleDur);
                            idleEvents.push({
                                agentId: a.id,
                                role: a.role,
                                team: a.team,
                                simTime: +currentSim.toFixed(2),
                                idleDuration: +idleDur.toFixed(2),
                                q: a.q,
                                r: a.r,
                                snapshot: snap,
                            });
                            snapshots.push(snap);
                        }
                    }
                }
            }

            // Early exit if match finished
            if (!matchOngoing && currentSim >= 10.0) {
                break;
            }
        }

        const winner = blueAlive > 0 && redAlive === 0 ? 'BLUE' : (redAlive > 0 && blueAlive === 0 ? 'RED' : 'DRAW');

        return {
            seed: seedVal,
            simDuration: +currentSim.toFixed(2),
            winner,
            ghostCount: ghostEvents.length,
            idleCount: idleEvents.length,
            ghostEvents,
            idleEvents,
            snapshots,
        };
    }, {
        seedVal: seed,
        maxSimSeconds: SIM_SECONDS,
        shrinkInterval: SHRINK_INTERVAL,
        ghostGraceSec: GHOST_GRACE_SEC,
        idleGraceSec: IDLE_GRACE_SEC,
    });

    results.push(seedResult);
    totalGhosts += seedResult.ghostCount;
    totalIdles += seedResult.idleCount;

    const isClean = seedResult.ghostCount === 0 && seedResult.idleCount === 0;
    const statusText = isClean ? 'CLEAN' : `GHOST: ${seedResult.ghostCount}, IDLE: ${seedResult.idleCount}`;
    console.log(`Duration: ${seedResult.simDuration}s | Winner: ${seedResult.winner} | ${statusText}`);
}

await browser.close();
await server.close();

// Save full soak output
const outPath = join(OUT_DIR, 'br_soak.json');
writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
        seeds: SEED_COUNT,
        simSeconds: SIM_SECONDS,
        shrinkInterval: SHRINK_INTERVAL,
        ghostGraceSec: GHOST_GRACE_SEC,
        idleGraceSec: IDLE_GRACE_SEC,
    },
    summary: {
        totalSeeds: SEED_COUNT,
        cleanSeeds: results.filter(r => r.ghostCount === 0 && r.idleCount === 0).length,
        totalGhosts,
        totalIdles,
    },
    results,
}, null, 2), 'utf8');

// Generate Terminal Summary Table
console.log('\n========================================================================================');
console.log('                          SOAK TEST SUMMARY REPORT                                      ');
console.log('========================================================================================');
console.log('| Seed | Sim Time | Winner | Ghosts | Idles | Status                                    |');
console.log('| :--- | :------- | :----- | :----- | :---- | :---------------------------------------- |');
for (const r of results) {
    const status = (r.ghostCount === 0 && r.idleCount === 0) ? 'PASS (Clean)' : `FAIL (Ghosts:${r.ghostCount}, Idles:${r.idleCount})`;
    console.log(`| #${r.seed} | ${r.simDuration.toString().padStart(6, ' ')}s | ${r.winner.padEnd(6, ' ')} | ${r.ghostCount.toString().padStart(6, ' ')} | ${r.idleCount.toString().padStart(5, ' ')} | ${status.padEnd(41, ' ')} |`);
}
console.log('========================================================================================');
console.log(`TOTALS: ${SEED_COUNT} Seeds | Clean Seeds: ${results.filter(r => r.ghostCount === 0 && r.idleCount === 0).length}/${SEED_COUNT}`);
console.log(`Total Ghost Events: ${totalGhosts} | Total Idle Events: ${totalIdles}`);
console.log(`Saved report artifact: ${outPath}\n`);

// Diagnostics analysis
if (totalGhosts > 0 || totalIdles > 0) {
    console.log('── DIAGNOSTIC HIGHLIGHTS ──');
    if (totalGhosts > 0) {
        console.log(`[GHOSTS (${totalGhosts})]:`);
        const sampleGhosts = results.flatMap(r => r.ghostEvents).slice(0, 5);
        for (const g of sampleGhosts) {
            console.log(`  - Agent ${g.agentId} (${g.role}, ${g.team}) @ (${g.q},${g.r}): hp=${g.hp}, z=${g.z}, fullyDead=${g.fullyDead}, inAgents=${g.inAgents}, inAgentMap=${g.inAgentMap}, deadLogged=${g.deadLogged}`);
        }
    }
    if (totalIdles > 0) {
        console.log(`[IDLES (${totalIdles})]:`);
        const sampleIdles = results.flatMap(r => r.idleEvents).slice(0, 5);
        for (const idl of sampleIdles) {
            const s = idl.snapshot;
            const targetDesc = s.target ? `${s.target.id} (${s.target.role}, hp=${s.target.hp}, dist=${s.target.distance}, validTile=${s.target.tileValid})` : 'none';
            console.log(`  - Agent ${s.agentId} (${s.role}, ${s.team}) @ (${s.pos.q},${s.pos.r}) for ${s.idleDuration}s: Target=${targetDesc}, safe=${s.inSafeZone}, pathLen=${s.movement.pathLength}, anim=${s.movement.animState}, aiState=${s.movement.aiState}`);
        }
    }
}

if (assertMode) {
    if (totalGhosts > 0 || totalIdles > 0) {
        console.error(`[ASSERTION FAILED] br-soak detected ${totalGhosts} ghosts and ${totalIdles} idles.`);
        process.exit(1);
    } else {
        console.log('[ASSERTION PASSED] 0 ghosts, 0 idles.');
    }
} else if (assertGhostOnly) {
    if (totalGhosts > 0) {
        console.error(`[ASSERTION FAILED] br-soak detected ${totalGhosts} ghosts.`);
        process.exit(1);
    } else {
        console.log('[ASSERTION PASSED] 0 ghosts.');
    }
}
