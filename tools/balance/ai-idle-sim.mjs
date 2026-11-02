// ╔══════════════════════════════════════════════════════════╗
// ║  ai-idle-sim — AI 發呆與大逃殺勝率量測工具                 ║
// ║  用法：node tools/balance/ai-idle-sim.mjs                 ║
// ║        --scenario=TEAMS|MELEE|ROYALE|MELEE_ROYALE        ║
// ║        [--battles=200] [--seed=1] [--maxTime=180]        ║
// ║        [--dt=0.0333] [--hp=game|role]                    ║
// ║        [--out=tools/ui-e2e/out/ai-idle-<scenario>.json]   ║
// ║  做法：Vite ssrLoadModule 載入引擎（Node，無渲染），       ║
// ║  每 tick 後分類單位狀態（busy/moving/waitInRange/發呆原因），║
// ║  攔截死亡與擊殺統計，彙整各角色勝率與發呆原因。           ║
// ╚══════════════════════════════════════════════════════════╝

import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const arg = (n, d) => {
    const h = process.argv.find((a) => a.startsWith(`--${n}=`));
    return h ? h.slice(n.length + 3) : d;
};

const scenario = arg('scenario');
if (!scenario || !['TEAMS', 'MELEE', 'ROYALE', 'MELEE_ROYALE'].includes(scenario)) {
    console.error(`Error: --scenario must be one of TEAMS, MELEE, ROYALE, MELEE_ROYALE (got: ${scenario})`);
    process.exit(1);
}

const BATTLES = Number(arg('battles', 200));
const SEED = Number(arg('seed', 1));
const MAX_TIME = Number(arg('maxTime', 180));
const DT = Number(arg('dt', 0.0333));
const OUT = arg('out', `tools/ui-e2e/out/ai-idle-${scenario}.json`);
// game＝和 useGameApp 開局相同（SPAWN_HP_MIN＋隨機幅度，蓋掉職業血量）；role＝用職業預設血量
const HP_MODE = arg('hp', 'game');

const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    logLevel: 'error',
    appType: 'custom'
});

try {
    const { GameEngine } = await server.ssrLoadModule('/engine/game.ts');
    const { AgentManager } = await server.ssrLoadModule('/engine/systems/agentManager.ts');
    const { Team, Role, ActionState } = await server.ssrLoadModule('/types.ts');
    const { HexUtils } = await server.ssrLoadModule('/engine/utils.ts');
    const { COMBAT_PARAM } = await server.ssrLoadModule('/constants.ts');
    const { isGroundMeleeRange, isMeleeAttackCell } = await server.ssrLoadModule('/engine/ai/MeleeAttack.ts');
    const { querySpawnableHexes, layoutFactionHexes } = await server.ssrLoadModule('/engine/systems/ui/editorQueries.ts');
    const { random } = await server.ssrLoadModule('/engine/math/rng.ts');
    const { GAME_APP_PARAM } = await server.ssrLoadModule('/constants.ts');
    const spawnHp = () => (HP_MODE === 'game' ? GAME_APP_PARAM.SPAWN_HP_MIN + random() * GAME_APP_PARAM.SPAWN_HP_RANGE : undefined);
    const winsByTeamRole = {};

    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    };

    const rolesList = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

    const createRoleStat = () => ({
        picks: 0,
        wins: 0,
        aliveSec: 0,
        kills: 0,
        combatDeaths: 0,
        ringOutDeaths: 0,
        busySec: 0,
        movingSec: 0,
        waitInRangeSec: 0,
        idleSec: 0,
        idleReasons: {
            noTarget: 0,
            warningBlock: 0,
            heightBlock: 0,
            noAttackCell: 0,
            cellsTaken: 0,
            other: 0
        },
        warningTileSec: 0,
        maxContinuousIdleSec: 0
    });

    const roleStats = {
        [Role.TANK]: createRoleStat(),
        [Role.WARRIOR]: createRoleStat(),
        [Role.RANGER]: createRoleStat(),
        [Role.MAGE]: createRoleStat(),
        [Role.SUPPORT]: createRoleStat()
    };

    let curMatch = null;
    const origHandleDeadState = AgentManager.prototype.handleDeadState;
    AgentManager.prototype.handleDeadState = function (a, engineCtx, reason, text) {
        if (curMatch && curMatch.active && !a.fullyDead && !a.deadLogged) {
            if (text === 'RING_OUT') {
                curMatch.ringOutDeaths[a.id] = (curMatch.ringOutDeaths[a.id] ?? 0) + 1;
            } else {
                curMatch.combatDeaths[a.id] = (curMatch.combatDeaths[a.id] ?? 0) + 1;
            }
        }
        return origHandleDeadState.call(this, a, engineCtx, reason, text);
    };

    let draws = 0;
    let timeouts = 0;
    let totalTicks = 0;
    const battleTimes = [];
    const allIdleStreaks = [];

    const finalizeStreak = (tracker, battleIndex) => {
        const s = tracker.currentStreak;
        if (!s || s.duration <= 0) {
            tracker.currentStreak = null;
            return;
        }
        let dominantReason = 'other';
        let maxDur = -1;
        for (const [r, d] of Object.entries(s.reasonCounts)) {
            if (d > maxDur) {
                maxDur = d;
                dominantReason = r;
            }
        }
        const dur = +s.duration.toFixed(2);
        allIdleStreaks.push({
            battle: battleIndex,
            agentId: s.agentId,
            role: s.role,
            startSec: +s.startSec.toFixed(2),
            durationSec: dur,
            length: dur,
            reason: dominantReason
        });
        tracker.maxContinuousIdleSec = Math.max(tracker.maxContinuousIdleSec, s.duration);
        tracker.currentStreak = null;
    };

    const t0 = Date.now();

    for (let b = 0; b < BATTLES; b++) {
        const engine = new GameEngine({ mute: true });
        engine.seedSimulation(SEED * 100000 + b);
        engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });

        const spawnable = querySpawnableHexes(engine);
        if (spawnable.length === 0) {
            throw new Error(`Battle ${b}: querySpawnableHexes returned 0 valid hexes`);
        }

        if (scenario === 'TEAMS') {
            const left = spawnable.filter((h) => h.q < -1);
            const right = spawnable.filter((h) => h.q > 1);
            if (left.length < 5 || right.length < 5) {
                throw new Error(`Battle ${b}: Not enough left/right hexes (left=${left.length}, right=${right.length})`);
            }
            shuffle(left);
            shuffle(right);
            for (let i = 0; i < 5; i++) {
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team: Team.BLUE, q: left[i].q, r: left[i].r, role: rolesList[i] });
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team: Team.RED, q: right[i].q, r: right[i].r, role: rolesList[i] });
            }
        } else if (scenario === 'MELEE') {
            const left = spawnable.filter((h) => h.q < -1);
            const right = spawnable.filter((h) => h.q > 1);
            if (left.length < 5 || right.length < 5) {
                throw new Error(`Battle ${b}: Not enough left/right hexes (left=${left.length}, right=${right.length})`);
            }
            shuffle(left);
            shuffle(right);
            for (let i = 0; i < 5; i++) {
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team: Team.BLUE, q: left[i].q, r: left[i].r, role: Role.WARRIOR });
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team: Team.RED, q: right[i].q, r: right[i].r, role: Role.WARRIOR });
            }
        } else if (scenario === 'ROYALE') {
            const shuffledHexes = shuffle([...spawnable]);
            const layout = layoutFactionHexes(shuffledHexes, 10, 1);
            const royaleRoles = [
                Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT,
                Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT
            ];
            for (let i = 0; i < 10; i++) {
                const hex = layout[i]?.[0];
                if (!hex) throw new Error(`Battle ${b}: Faction ${i} missing spawn hex`);
                const team = (i % 2 === 0) ? Team.BLUE : Team.RED;
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team, side: i, q: hex.q, r: hex.r, role: royaleRoles[i] });
            }
        } else if (scenario === 'MELEE_ROYALE') {
            const shuffledHexes = shuffle([...spawnable]);
            const layout = layoutFactionHexes(shuffledHexes, 10, 1);
            for (let i = 0; i < 10; i++) {
                const hex = layout[i]?.[0];
                if (!hex) throw new Error(`Battle ${b}: Faction ${i} missing spawn hex`);
                const team = (i % 2 === 0) ? Team.BLUE : Team.RED;
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', hp: spawnHp(), team, side: i, q: hex.q, r: hex.r, role: Role.WARRIOR });
            }
        }

        const lineup = engine.agents.map((a) => ({
            id: a.id,
            team: a.team,
            side: a.side,
            role: a.role
        }));
        for (const u of lineup) {
            roleStats[u.role].picks++;
        }

        const prevPositions = new Map();
        const matchTrackers = new Map();
        for (const a of engine.agents) {
            prevPositions.set(a.id, { px: a.px, py: a.py });
            matchTrackers.set(a.id, { currentStreak: null, maxContinuousIdleSec: 0 });
        }

        curMatch = {
            active: true,
            combatDeaths: {},
            ringOutDeaths: {},
            kills: {}
        };

        let gameOverWinner = null;
        let gameOverWinnerId = null;
        const onGameOver = (d) => {
            gameOverWinner = d.winner ?? 'DRAW';
            gameOverWinnerId = d.winnerId ?? null;
        };
        const onKill = ({ killerId }) => {
            if (curMatch && curMatch.active && killerId) {
                curMatch.kills[killerId] = (curMatch.kills[killerId] ?? 0) + 1;
            }
        };
        engine.bus.on('GAME_OVER', onGameOver);
        engine.bus.on('KILL', onKill);

        engine.play();
        let t = 0;

        while (gameOverWinner === null && t < MAX_TIME) {
            engine.tick(DT);
            t += DT;
            totalTicks++;

            // 勝負已定的慢動作階段不量：倖存者沒有目標是正常的，算進去會墊高贏家的發呆
            if (engine.victory.isFinishing) continue;

            const alive = engine.agents.filter((a) => a.hp > 0 && !a.outOfBounds && !a.banished);

            for (const a of alive) {
                const rs = roleStats[a.role];
                rs.aliveSec += DT;

                if (engine.isWarningTile(HexUtils.key(a))) {
                    rs.warningTileSec += DT;
                }

                const isBusy = (
                    a.castingSkillIdx !== -1 ||
                    a.actionState === ActionState.ATTACKING ||
                    a.actionState === ActionState.CASTING ||
                    a.actionState === ActionState.STUNNED ||
                    a.actionState === ActionState.EVADING
                );

                let cat = 'idle';
                let idleReason = 'other';

                if (isBusy) {
                    cat = 'busy';
                } else {
                    const prev = prevPositions.get(a.id) ?? { px: a.px, py: a.py };
                    const distMoved = Math.hypot(a.px - prev.px, a.py - prev.py);
                    if (distMoved >= 0.5) {
                        cat = 'moving';
                    } else {
                        const hasAliveTarget = Boolean(a.target && a.target.hp > 0 && !a.target.outOfBounds && !a.target.banished);
                        const basicSkill = a.skills.find((s) => s && s.tag === 'BASIC');
                        const baseRange = basicSkill ? basicSkill.range : COMBAT_PARAM.MELEE_RANGE;

                        let inRange = false;
                        let distToTarget = 0;
                        let effRange = 0;
                        if (hasAliveTarget) {
                            distToTarget = HexUtils.dist(a, a.target);
                            effRange = engine.getEffectiveRange(a, a.target.q, a.target.r, baseRange);
                            if (distToTarget <= effRange) {
                                inRange = true;
                            }
                        }

                        if (inRange) {
                            cat = 'waitInRange';
                        } else {
                            cat = 'idle';
                            if (!hasAliveTarget) {
                                idleReason = 'noTarget';
                            } else if (!engine.isWarningTile(HexUtils.key(a)) && engine.isWarningTile(HexUtils.key(a.target))) {
                                idleReason = 'warningBlock';
                            } else if (distToTarget <= baseRange && distToTarget > effRange) {
                                idleReason = 'heightBlock';
                            } else {
                                const isGroundMelee = isGroundMeleeRange(a, baseRange);
                                if (isGroundMelee) {
                                    const neighbors = HexUtils.neighbors(a.target);
                                    const standableAttackCells = neighbors.filter((c) => (
                                        engine.isValid(c.q, c.r) &&
                                        !engine.hasObstacle(c.q, c.r) &&
                                        isMeleeAttackCell(engine.movement.targeting, c, a.target.q, a.target.r, baseRange, engine)
                                    ));
                                    if (standableAttackCells.length === 0) {
                                        idleReason = 'noAttackCell';
                                    } else {
                                        const allTaken = standableAttackCells.every((c) => {
                                            const occ = engine.getAgentAt(c.q, c.r);
                                            return occ && occ !== a && occ.hp > 0 && !occ.outOfBounds && !occ.banished;
                                        });
                                        if (allTaken) {
                                            idleReason = 'cellsTaken';
                                        } else {
                                            idleReason = 'other';
                                        }
                                    }
                                } else {
                                    idleReason = 'other';
                                }
                            }
                        }
                    }
                }

                if (cat === 'busy') {
                    rs.busySec += DT;
                } else if (cat === 'moving') {
                    rs.movingSec += DT;
                } else if (cat === 'waitInRange') {
                    rs.waitInRangeSec += DT;
                } else if (cat === 'idle') {
                    rs.idleSec += DT;
                    rs.idleReasons[idleReason] = (rs.idleReasons[idleReason] ?? 0) + DT;
                }

                const tracker = matchTrackers.get(a.id);
                if (tracker) {
                    if (cat === 'idle') {
                        if (!tracker.currentStreak) {
                            tracker.currentStreak = {
                                battle: b,
                                agentId: a.id,
                                role: a.role,
                                startSec: t,
                                duration: 0,
                                reasonCounts: {}
                            };
                        }
                        tracker.currentStreak.duration += DT;
                        tracker.currentStreak.reasonCounts[idleReason] = (tracker.currentStreak.reasonCounts[idleReason] ?? 0) + DT;
                        tracker.maxContinuousIdleSec = Math.max(tracker.maxContinuousIdleSec, tracker.currentStreak.duration);
                    } else {
                        if (tracker.currentStreak) {
                            finalizeStreak(tracker, b);
                        }
                    }
                }
            }

            for (const [id, tracker] of matchTrackers.entries()) {
                if (tracker.currentStreak && !alive.some((a) => a.id === id)) {
                    finalizeStreak(tracker, b);
                }
            }

            for (const a of engine.agents) {
                prevPositions.set(a.id, { px: a.px, py: a.py });
            }
        }

        for (const [, tracker] of matchTrackers.entries()) {
            if (tracker.currentStreak) {
                finalizeStreak(tracker, b);
            }
        }

        for (const u of lineup) {
            const tracker = matchTrackers.get(u.id);
            if (tracker) {
                roleStats[u.role].maxContinuousIdleSec = Math.max(roleStats[u.role].maxContinuousIdleSec, tracker.maxContinuousIdleSec);
            }
        }

        curMatch.active = false;
        engine.bus.off('GAME_OVER', onGameOver);
        engine.bus.off('KILL', onKill);

        battleTimes.push(+t.toFixed(2));

        for (const u of lineup) {
            roleStats[u.role].kills += (curMatch.kills[u.id] ?? 0);
            roleStats[u.role].combatDeaths += (curMatch.combatDeaths[u.id] ?? 0);
            roleStats[u.role].ringOutDeaths += (curMatch.ringOutDeaths[u.id] ?? 0);
        }

        if (gameOverWinner === null && t >= MAX_TIME) {
            timeouts++;
        } else if (gameOverWinner === 'DRAW' || (gameOverWinner === null && gameOverWinnerId === null)) {
            draws++;
        } else {
            if (scenario === 'ROYALE' || scenario === 'MELEE_ROYALE') {
                let winnerAgent = lineup.find((u) => u.id === gameOverWinnerId);
                if (!winnerAgent) {
                    const lastSurvivor = engine.agents.find((a) => a.hp > 0 && !a.outOfBounds && !a.banished);
                    if (lastSurvivor) winnerAgent = lineup.find((u) => u.id === lastSurvivor.id);
                }
                if (winnerAgent) {
                    roleStats[winnerAgent.role].wins++;
                    const k = `${winnerAgent.team === Team.BLUE ? 'BLUE' : 'RED'}/${winnerAgent.role}`;
                    winsByTeamRole[k] = (winsByTeamRole[k] ?? 0) + 1;
                } else {
                    draws++;
                }
            } else {
                const winningTeam = gameOverWinner;
                const survivors = engine.agents.filter((a) => a.team === winningTeam && a.hp > 0 && !a.outOfBounds && !a.banished);
                for (const s of survivors) {
                    roleStats[s.role].wins++;
                }
            }
        }

        engine.stop();
        engine.destroy?.();
    }

    curMatch = null;
    AgentManager.prototype.handleDeadState = origHandleDeadState;

    // 自我檢查（不符就 process.exit(1)）
    // ① 勝場＋平手＋超時＝場數（ROYALE 類）
    if (scenario === 'ROYALE' || scenario === 'MELEE_ROYALE') {
        const totalWins = Object.values(roleStats).reduce((acc, r) => acc + r.wins, 0);
        if (totalWins + draws + timeouts !== BATTLES) {
            console.error(`Self-check 1 failed: totalWins(${totalWins}) + draws(${draws}) + timeouts(${timeouts}) !== BATTLES(${BATTLES})`);
            process.exit(1);
        }
    }

    // ② 每個角色的各分類秒數加總＝存活秒數（誤差 ≤ 一個 dt × 總 tick 數的 1%）
    for (const role of rolesList) {
        const rs = roleStats[role];
        if (rs.picks > 0) {
            const catSum = rs.busySec + rs.movingSec + rs.waitInRangeSec + rs.idleSec;
            const diff = Math.abs(catSum - rs.aliveSec);
            const maxDiff = DT * totalTicks * 0.01 + 1e-4;
            if (diff > maxDiff) {
                console.error(`Self-check 2 failed for role ${role}: catSum=${catSum}, aliveSec=${rs.aliveSec}, diff=${diff}, maxDiff=${maxDiff}`);
                process.exit(1);
            }
        }
    }

    // ③ 各發呆原因加總＝發呆秒數
    for (const role of rolesList) {
        const rs = roleStats[role];
        if (rs.picks > 0) {
            const reasonSum = Object.values(rs.idleReasons).reduce((a, b) => a + b, 0);
            const diff = Math.abs(reasonSum - rs.idleSec);
            if (diff > 1e-4) {
                console.error(`Self-check 3 failed for role ${role}: reasonSum=${reasonSum}, idleSec=${rs.idleSec}, diff=${diff}`);
                process.exit(1);
            }
        }
    }

    // ④ 至少有一個單位被量到。
    const totalAliveSec = Object.values(roleStats).reduce((acc, r) => acc + r.aliveSec, 0);
    if (totalAliveSec <= 0) {
        console.error('Self-check 4 failed: totalAliveSec is 0');
        process.exit(1);
    }

    allIdleStreaks.sort((a, b) => b.durationSec - a.durationSec);
    const top10IdleStreaks = allIdleStreaks.slice(0, 10);

    const avgDuration = +(battleTimes.reduce((a, b) => a + b, 0) / BATTLES).toFixed(2);
    const isRoyale = (scenario === 'ROYALE' || scenario === 'MELEE_ROYALE');

    const roleOutput = {};
    for (const role of rolesList) {
        const rs = roleStats[role];
        if (rs.picks === 0) continue;
        const alive = rs.aliveSec;
        const idle = rs.idleSec;
        const pct = (val, denom) => (denom > 0 ? +((val / denom) * 100).toFixed(1) : 0);

        roleOutput[role] = {
            picks: rs.picks,
            wins: rs.wins,
            winRate: isRoyale ? pct(rs.wins, BATTLES) : 'N/A',
            avgAliveSec: +(alive / rs.picks).toFixed(2),
            avgKills: +(rs.kills / rs.picks).toFixed(2),
            combatDeaths: rs.combatDeaths,
            ringOutDeaths: rs.ringOutDeaths,
            aliveSec: +alive.toFixed(2),
            maxContinuousIdleSec: +rs.maxContinuousIdleSec.toFixed(2),
            categories: {
                busySec: +rs.busySec.toFixed(2),
                busyPct: pct(rs.busySec, alive),
                movingSec: +rs.movingSec.toFixed(2),
                movingPct: pct(rs.movingSec, alive),
                waitInRangeSec: +rs.waitInRangeSec.toFixed(2),
                waitInRangePct: pct(rs.waitInRangeSec, alive),
                idleSec: +rs.idleSec.toFixed(2),
                idlePct: pct(rs.idleSec, alive)
            },
            idleReasons: {
                noTarget: {
                    sec: +rs.idleReasons.noTarget.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.noTarget, alive),
                    pctOfIdle: pct(rs.idleReasons.noTarget, idle)
                },
                warningBlock: {
                    sec: +rs.idleReasons.warningBlock.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.warningBlock, alive),
                    pctOfIdle: pct(rs.idleReasons.warningBlock, idle)
                },
                heightBlock: {
                    sec: +rs.idleReasons.heightBlock.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.heightBlock, alive),
                    pctOfIdle: pct(rs.idleReasons.heightBlock, idle)
                },
                noAttackCell: {
                    sec: +rs.idleReasons.noAttackCell.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.noAttackCell, alive),
                    pctOfIdle: pct(rs.idleReasons.noAttackCell, idle)
                },
                cellsTaken: {
                    sec: +rs.idleReasons.cellsTaken.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.cellsTaken, alive),
                    pctOfIdle: pct(rs.idleReasons.cellsTaken, idle)
                },
                other: {
                    sec: +rs.idleReasons.other.toFixed(2),
                    pctOfAlive: pct(rs.idleReasons.other, alive),
                    pctOfIdle: pct(rs.idleReasons.other, idle)
                }
            },
            warningTileSec: +rs.warningTileSec.toFixed(2),
            warningTilePct: pct(rs.warningTileSec, alive)
        };
    }

    const result = {
        scenario,
        summary: {
            battles: BATTLES,
            seed: SEED,
            dt: DT,
            maxTime: MAX_TIME,
            avgDuration,
            draws,
            timeouts,
            totalTicks,
            wallSeconds: +((Date.now() - t0) / 1000).toFixed(2)
        },
        roles: roleOutput,
        topIdleStreaks: top10IdleStreaks
    };

    mkdirSync(dirname(OUT), { recursive: true });
    result.hpMode = HP_MODE;
    result.winsByTeamRole = winsByTeamRole;
    console.log(`HP mode: ${HP_MODE}; wins by team/role: ${JSON.stringify(winsByTeamRole)}`);
    writeFileSync(OUT, JSON.stringify(result, null, 2));

    console.log('\n' + '='.repeat(123));
    console.log(`SCENARIO: ${scenario} | Battles: ${BATTLES} | Seed: ${SEED} | Avg Time: ${avgDuration}s | Draws: ${draws} | Timeouts: ${timeouts}`);
    console.log('='.repeat(123));
    console.log('ROLE SUMMARY:');
    console.log(
        'Role'.padEnd(10) +
        'Picks'.padStart(7) +
        'Wins'.padStart(7) +
        'Win%'.padStart(8) +
        'AvgAlive(s)'.padStart(13) +
        'AvgKills'.padStart(10) +
        'D-Combat'.padStart(10) +
        'D-RingOut'.padStart(11) +
        'Busy%'.padStart(8) +
        'Moving%'.padStart(9) +
        'WaitInRange%'.padStart(14) +
        'Idle%'.padStart(8) +
        'Warn%'.padStart(8)
    );
    console.log('-'.repeat(123));
    for (const [role, data] of Object.entries(roleOutput)) {
        const winPctStr = typeof data.winRate === 'number' ? `${data.winRate.toFixed(1)}%` : data.winRate;
        console.log(
            role.padEnd(10) +
            String(data.picks).padStart(7) +
            String(data.wins).padStart(7) +
            winPctStr.padStart(8) +
            data.avgAliveSec.toFixed(1).padStart(13) +
            data.avgKills.toFixed(2).padStart(10) +
            String(data.combatDeaths).padStart(10) +
            String(data.ringOutDeaths).padStart(11) +
            `${data.categories.busyPct.toFixed(1)}%`.padStart(8) +
            `${data.categories.movingPct.toFixed(1)}%`.padStart(9) +
            `${data.categories.waitInRangePct.toFixed(1)}%`.padStart(14) +
            `${data.categories.idlePct.toFixed(1)}%`.padStart(8) +
            `${data.warningTilePct.toFixed(1)}%`.padStart(8)
        );
    }

    console.log('\n' + '='.repeat(93));
    console.log('IDLE BREAKDOWN (% of alive time):');
    console.log(
        'Role'.padEnd(10) +
        'Idle%'.padStart(8) +
        'noTarget%'.padStart(12) +
        'warnBlock%'.padStart(12) +
        'heightBlock%'.padStart(14) +
        'noAttackCell%'.padStart(15) +
        'cellsTaken%'.padStart(13) +
        'other%'.padStart(9)
    );
    console.log('-'.repeat(93));
    for (const [role, data] of Object.entries(roleOutput)) {
        console.log(
            role.padEnd(10) +
            `${data.categories.idlePct.toFixed(1)}%`.padStart(8) +
            `${data.idleReasons.noTarget.pctOfAlive.toFixed(1)}%`.padStart(12) +
            `${data.idleReasons.warningBlock.pctOfAlive.toFixed(1)}%`.padStart(12) +
            `${data.idleReasons.heightBlock.pctOfAlive.toFixed(1)}%`.padStart(14) +
            `${data.idleReasons.noAttackCell.pctOfAlive.toFixed(1)}%`.padStart(15) +
            `${data.idleReasons.cellsTaken.pctOfAlive.toFixed(1)}%`.padStart(13) +
            `${data.idleReasons.other.pctOfAlive.toFixed(1)}%`.padStart(9)
        );
    }

    console.log('\n' + '='.repeat(80));
    console.log('TOP 10 LONGEST IDLE STREAKS:');
    console.log(
        'Rank'.padEnd(6) +
        'Battle'.padStart(8) +
        'Agent'.padStart(12) +
        'Role'.padStart(10) +
        'Start(s)'.padStart(10) +
        'Duration(s)'.padStart(13) +
        '  Reason'
    );
    console.log('-'.repeat(80));
    top10IdleStreaks.forEach((s, idx) => {
        console.log(
            `#${idx + 1}`.padEnd(6) +
            `#${s.battle}`.padStart(8) +
            s.agentId.padStart(12) +
            s.role.padStart(10) +
            s.startSec.toFixed(1).padStart(10) +
            s.durationSec.toFixed(1).padStart(13) +
            `  ${s.reason}`
        );
    });
    console.log('='.repeat(80));
    console.log(`Saved results to ${OUT}\n`);
} finally {
    await server.close();
}
