/**
 * tools/ui-e2e/br-soak.mjs
 * Battle Royale Soak & Diagnostics Harness (B0)
 *
 * Runs Battle Royale automated soak across N seeds (default 20),
 * stepping deterministic frames via __stepFrames, sampling every 0.5 sim-seconds.
 * Detects:
 *   1. GHOST: Units standing on removed tiles, frozen physics, uncollected corpses, or lingering map occupancy.
 *   2. IDLE (precise): alive, not CC'd, an enemy is alive, and for >= IDLE_GRACE_SEC the unit
 *      (a) did not displace its pixel position by > IDLE_MOVE_PX, (b) was never casting, and
 *      (c) never started a skill (no skill cooldown rose since the previous sample).
 *      Claimed states (isMoving / actionState) are NOT counted as activity: they can be stale.
 *      A unit with no targetable enemy (all banished / out of bounds / on collapsed tiles) is excluded.
 *      Stun / banish / fear / stasis are excluded; root is excluded only while no enemy is in basic range.
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

const START_TEXT = 'START SIMULATION';
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

// Parse CLI flags
const args = process.argv.slice(2);
const assertMode = args.includes('--assert');
const assertGhostOnly = args.includes('--assert-ghost');
const assertIdleOnly = args.includes('--assert-idle');
// A seed whose battleTime ends below this never really simulated; it must not count as CLEAN.
const MIN_BATTLE_TIME_SEC = 5;

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
const SEED_START = getArgValue('seedStart', 1); // seed index of the first run (seed = 1000 + index)
const SIM_SECONDS = getArgValue('simTime', 180);
const GHOST_GRACE_SEC = getArgValue('ghostGrace', 6);
const IDLE_GRACE_SEC = getArgValue('idleGrace', 6);
const IDLE_MOVE_PX = getArgValue('idleMovePx', 3);
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
    window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */
        seed = s;
        /* syntheticTime 刻意不倒退：遊戲迴圈的 lastTime 會保留上一場的值，倒退會讓 dt 為負 */
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

for (let i = SEED_START; i < SEED_START + SEED_COUNT; i++) {
    const seed = 1000 + i;
    process.stdout.write(`[Seed ${i.toString().padStart(2, ' ')}/${SEED_START + SEED_COUNT - 1}] Seed #${seed} ... `);

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
        idleMovePx,
        traceAgentId,
        traceFrom,
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

        // Nodes ticked during the unit's most recent BT tick (same lastRunTime as the root),
        // flattened depth-first as "Name=RESULT" so the taken path reads top to bottom.
        function lastTickTrace(root) {
            const out = [];
            const t = root.lastRunTime;
            (function walk(n, d) {
                if (!n || n.lastRunTime !== t) return;
                out.push(`${'  '.repeat(d)}${n.n}=${n.lastResult}`);
                for (const c of n.c || []) walk(c, d + 1);
            })(root, 0);
            return out;
        }

        function HexDist(p, q) {
            const dq = p.q - q.q, dr = p.r - q.r;
            return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
        }

        // Pathfinding probes for an idle unit: can it reach its target / escape hex at all?
        function probeReach(a) {
            const pf = engine.movement.pathfinder;
            const tg = engine.movement.targeting;
            const out = {};
            const basic = (a.skills || []).find(sk => sk && sk.tag === 'BASIC');
            const range = basic ? basic.range : 1;
            if (a.target) {
                const t = a.target;
                const ps = (ign, esc) => pf.findPath(a, t.q, t.r, range, ign, engine, tg, esc);
                const p1 = ps(false, false), p2 = ps(true, false);
                const first = (p2[0] || p1[0]) || null;
                out.chase = {
                    range,
                    effRange: engine.getEffectiveRange(a, t.q, t.r, range),
                    gridDist: HexDist(a, t),
                    pathLen: p1.length,
                    pathLenIgnoreUnits: p2.length,
                    myH: engine.map.getTerrainHeight(a.q, a.r),
                    targetH: engine.map.getTerrainHeight(t.q, t.r),
                    jump: a.jump,
                    first: first && {
                        q: first.q, r: first.r,
                        blocked: engine.isBlocked(first.q, first.r, a.id, a.movementType),
                        warning: engine.isWarningTile(`${first.q},${first.r}`),
                        h: engine.map.getTerrainHeight(first.q, first.r),
                        occ: (() => { const o = engine.map.getAgentAt(first.q, first.r); return o ? `${o.team}:${o.role}:${o.hp > 0 ? 'alive' : 'dead'}` : null; })(),
                    },
                    moveResult: (() => {
                        // Replay the movement call the BT makes, then restore the unit's movement fields.
                        const save = { isMoving: a.isMoving, path: a.path, trajectory: a.trajectory, mult: a.moveSpeedMult, stuck: a.stuckTicks, prog: a.moveProgress };
                        const res = engine.movement.moveAgentToHex(a, { q: t.q, r: t.r }, range, engine, 1.0, false);
                        const after = { isMoving: a.isMoving, pathLen: a.path.length, stuck: a.stuckTicks };
                        a.isMoving = save.isMoving; a.path = save.path; a.trajectory = save.trajectory; a.moveSpeedMult = save.mult; a.stuckTicks = save.stuck; a.moveProgress = save.prog;
                        return { res, after };
                    })(),
                    safePath: (() => { const sp = pf.findPathToSafety(a, a, engine, tg); return sp ? sp.length : null; })(),
                };
            }
            if (a.targetHex) {
                const th = a.targetHex;
                const e1 = pf.findPath(a, th.q, th.r, 0, false, engine, tg, true);
                out.escape = {
                    th: { q: th.q, r: th.r },
                    pathLen: e1.length,
                    first: e1[0] ? { q: e1[0].q, r: e1[0].r, blocked: engine.isBlocked(e1[0].q, e1[0].r, a.id, a.movementType), occ: (() => { const o = engine.map.getAgentAt(e1[0].q, e1[0].r); return o ? `${o.team}:${o.role}:${o.hp > 0 ? 'alive' : 'dead'}` : null; })() } : null,
                    canEscape: pf.canEscape(a, engine),
                };
            }
            return out;
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
                    time: l.time,
                    type: l.actionType,
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
                skills: (a.skills || []).map((sk, i) => sk ? ({ slot: i, tag: sk.tag, range: sk.range, cost: sk.cost, cd: +(a.curCDs[i] ?? 0).toFixed(2) }) : null),
                mp: a.mp,
                lockouts: { interrupt: +(a._interruptCooldown ?? 0).toFixed(2), castComplete: +(a._castCompleteCooldown ?? 0).toFixed(2), silence: +a.silenceTimer.toFixed(2) },
                nearestEnemyDist: Math.min(...engine.agents.filter(e => e.hp > 0 && e.team !== a.team).map(e => HexDist(a, e))),
                shrinkTimer: +engine.zones.shrinkTimer.toFixed(2),
                shrinkLevel: engine.zones.currentShrinkLevel,
                mapTiles: engine.map.mapKeys.size,
                probe: probeReach(a),
                moveDbg: (globalThis.__MOVE_DBG__ || []).filter(m => m.id === a.id).slice(-12),
                actLog: (globalThis.__ACT_LOG__?.[a.id] || []).slice(-24),
                recentLogs,
                btTrace: lastTickTrace(a.bt),
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
            if (traceAgentId) {
                const ta0 = engine.agents.find(x => x.id === traceAgentId);
                if (ta0 && !ta0.__hooked) {
                    ta0.__hooked = true;
                    let v = ta0.isMoving;
                    Object.defineProperty(ta0, 'isMoving', {
                        get() { return v; },
                        set(nv) {
                            if (v && !nv && engine.battleTime >= traceFrom && engine.battleTime <= traceFrom + 1.2) {
                                (globalThis.__FRAME_LOG__ ||= []).push(`${engine.battleTime.toFixed(3)} isMoving->false by ` + new Error().stack.split(String.fromCharCode(10)).slice(2, 5).map(l => l.trim().replace(/\(.*[\/]/, '(')).join(' < '));
                            }
                            v = nv;
                        },
                    });
                }
                for (let f = 0; f < framesPerSample; f++) {
                    window.__stepFrames(1);
                    const ta = engine.agents.find(x => x.id === traceAgentId);
                    if (ta && engine.battleTime >= traceFrom && engine.battleTime <= traceFrom + 1.2) {
                        (globalThis.__FRAME_LOG__ ||= []).push(`${engine.battleTime.toFixed(3)} mv=${ta.isMoving ? 1 : 0}/${ta.path.length} prog=${ta.moveProgress.toFixed(3)} mult=${ta.moveSpeedMult.toFixed(2)} @${ta.q},${ta.r} px=${ta.px.toFixed(1)},${ta.py.toFixed(1)} ai=${ta.aiUpdateTimer.toFixed(3)}`);
                    }
                }
            } else {
                window.__stepFrames(framesPerSample);
            }
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

            // Debug: record every Action node result per agent (ring buffer of 200).
            for (const a of engine.agents) {
                if (!a.bt || a.bt.__wrapped) continue;
                a.bt.__wrapped = true;
                const log = ((globalThis.__ACT_LOG__ ||= {})[a.id] = []);
                (function walk(n) {
                    if (n.type === 'ACT') {
                        const orig = n.fn;
                        n.fn = (ctx) => {
                            const r = orig(ctx);
                            log.push(`${engine.battleTime.toFixed(2)} ${n.n}=${r} @${ctx.q},${ctx.r} mv=${ctx.isMoving ? 1 : 0}/${ctx.path.length} prog=${ctx.moveProgress.toFixed(2)} spd=${ctx.moveSpeed}x${ctx.moveSpeedMult.toFixed(2)} px=${ctx.px.toFixed(0)},${ctx.py.toFixed(0)} tgt=${ctx.target ? ctx.target.id + '@' + ctx.target.q + ',' + ctx.target.r : '-'} th=${ctx.targetHex ? ctx.targetHex.q + ',' + ctx.targetHex.r : '-'}`);
                            if (log.length > 200) log.shift();
                            return r;
                        };
                    }
                    for (const c of n.c || []) walk(c);
                })(a.bt);
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

                    // A rooted unit cannot move but CAN still attack: it only counts as incapacitated while no enemy is in
                    // its basic-skill range (otherwise standing there without attacking is exactly the bug).
                    const basic = (a.skills || []).find(sk => sk && sk.tag === 'BASIC');
                    const targetable = engine.agents.filter(e => e.hp > 0 && e.team !== a.team && !e.banished && !e.outOfBounds && engine.map.isValid(e.q, e.r));
                    const nearest = Math.min(...targetable.map(e => HexDist(a, e)));
                    const rootedNoTarget = a.rootTimer > 0 && nearest > (basic ? basic.range : 1);
                    const isCC = targetable.length === 0 || a.stunTimer > 0 || a.banished || a.fearTimer > 0 || a.stasisTimer > 0 || a.outOfBounds || rootedNoTarget;
                    const isCasting = a.castingSkillIdx !== -1;

                    let tr = idleTrackers.get(a.id);
                    if (!tr) {
                        tr = {
                            lastActiveTime: currentSim,
                            lastPx: a.px,
                            lastPy: a.py,
                            lastCDs: (a.curCDs || []).slice(),
                            triggered: false,
                        };
                        idleTrackers.set(a.id, tr);
                    }

                    // A skill was started since the last sample if any cooldown rose.
                    let startedSkill = false;
                    const cds = a.curCDs || [];
                    for (let i = 0; i < cds.length; i++) {
                        if (cds[i] > (tr.lastCDs[i] ?? 0) + 0.01) startedSkill = true;
                    }
                    tr.lastCDs = cds.slice();

                    const distMoved = Math.hypot(a.px - tr.lastPx, a.py - tr.lastPy);

                    if (isCC || isCasting || startedSkill || distMoved > idleMovePx) {
                        tr.lastActiveTime = currentSim;
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
            frames: step * framesPerSample,
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
        idleMovePx: IDLE_MOVE_PX,
        traceAgentId: process.env.TRACE_AGENT || '',
        traceFrom: parseFloat(process.env.TRACE_FROM || '0'),
    });
    if (process.env.TRACE_AGENT) {
        const fl = await page.evaluate(() => globalThis.__FRAME_LOG__ || []);
        console.log(fl.join('\n'));
    }

    results.push(seedResult);
    totalGhosts += seedResult.ghostCount;
    totalIdles += seedResult.idleCount;

    seedResult.stalled = seedResult.simDuration < MIN_BATTLE_TIME_SEC;
    const isClean = seedResult.ghostCount === 0 && seedResult.idleCount === 0 && !seedResult.stalled;
    const statusText = isClean ? 'CLEAN' : seedResult.stalled ? `STALLED (battleTime < ${MIN_BATTLE_TIME_SEC}s), GHOST: ${seedResult.ghostCount}, IDLE: ${seedResult.idleCount}` : `GHOST: ${seedResult.ghostCount}, IDLE: ${seedResult.idleCount}`;
    console.log(`Duration: ${seedResult.simDuration}s | Frames: ${seedResult.frames} | Winner: ${seedResult.winner} | ${statusText}`);
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
        cleanSeeds: results.filter(r => r.ghostCount === 0 && r.idleCount === 0 && !r.stalled).length,
        stalledSeeds: results.filter(r => r.stalled).length,
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
    const status = r.stalled ? `FAIL (Stalled: battleTime ${r.simDuration}s)` : (r.ghostCount === 0 && r.idleCount === 0) ? 'PASS (Clean)' : `FAIL (Ghosts:${r.ghostCount}, Idles:${r.idleCount})`;
    console.log(`| #${r.seed} | ${r.simDuration.toString().padStart(6, ' ')}s | ${r.winner.padEnd(6, ' ')} | ${r.ghostCount.toString().padStart(6, ' ')} | ${r.idleCount.toString().padStart(5, ' ')} | ${status.padEnd(41, ' ')} |`);
}
console.log('========================================================================================');
console.log(`TOTALS: ${SEED_COUNT} Seeds | Clean Seeds: ${results.filter(r => r.ghostCount === 0 && r.idleCount === 0 && !r.stalled).length}/${SEED_COUNT}`);
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
            console.log(s.btTrace.map(l => '      ' + l).join('\n'));
        }
    }
}

const stalledCount = results.filter(r => r.stalled).length;
if (stalledCount > 0) {
    console.error(`[ASSERTION FAILED] ${stalledCount} seed(s) ended with battleTime < ${MIN_BATTLE_TIME_SEC}s (harness did not advance the battle).`);
    process.exitCode = 1;
}
if (assertMode) {
    if (totalGhosts > 0 || totalIdles > 0) {
        console.error(`[ASSERTION FAILED] br-soak detected ${totalGhosts} ghosts and ${totalIdles} idles.`);
        process.exit(1);
    } else {
        console.log('[ASSERTION PASSED] 0 ghosts, 0 idles.');
    }
} else if (assertIdleOnly) {
    if (totalIdles > 0) {
        console.error(`[ASSERTION FAILED] br-soak detected ${totalIdles} idle episodes.`);
        process.exit(1);
    } else {
        console.log('[ASSERTION PASSED] 0 idle episodes.');
    }
} else if (assertGhostOnly) {
    if (totalGhosts > 0) {
        console.error(`[ASSERTION FAILED] br-soak detected ${totalGhosts} ghosts.`);
        process.exit(1);
    } else {
        console.log('[ASSERTION PASSED] 0 ghosts.');
    }
}
