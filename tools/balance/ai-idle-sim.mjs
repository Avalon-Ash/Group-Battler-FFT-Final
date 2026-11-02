// ╔══════════════════════════════════════════════════════════╗
// ║  ai-idle-sim — AI 發呆與大逃殺勝率量測工具                 ║
// ║  用法：node tools/balance/ai-idle-sim.mjs                 ║
// ║        --scenario=TEAMS|MELEE|ROYALE|MELEE_ROYALE|TANK_ROYALE ║
// ║        [--battles=200] [--seed=1] [--maxTime=180]        ║
// ║        [--dt=0.0333] [--loadout=role|mixed|mixedAll]     ║
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
if (!scenario || !['TEAMS', 'MELEE', 'ROYALE', 'MELEE_ROYALE', 'TANK_ROYALE'].includes(scenario)) {
    console.error(`Error: --scenario must be one of TEAMS, MELEE, ROYALE, MELEE_ROYALE, TANK_ROYALE (got: ${scenario})`);
    process.exit(1);
}

const BATTLES = Number(arg('battles', 200));
const SEED = Number(arg('seed', 1));
const MAX_TIME = Number(arg('maxTime', 180));
const DT = Number(arg('dt', 0.0333));
const OUT = arg('out', `tools/ui-e2e/out/ai-idle-${scenario}.json`);
// role＝照職業抽技能；mixed＝大招、主動從全部職業與陣營抽，普攻照職業；mixedAll＝三格都混
const LOADOUT = arg('loadout', 'role');
// 血量差壓縮：1＝職業血量；0.5＝差距減半；0＝全部同血（五職業平均）
const HP_SCALE = Number(arg('hpScale', 1));

const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    logLevel: 'error',
    appType: 'custom'
});

try {
    const { GameEngine } = await server.ssrLoadModule('/engine/game.ts');
    const { AgentManager } = await server.ssrLoadModule('/engine/systems/agentManager.ts');
    const { Team, Role, ActionState, AIState } = await server.ssrLoadModule('/types.ts');
    const { HexUtils } = await server.ssrLoadModule('/engine/utils.ts');
    const { COMBAT_PARAM } = await server.ssrLoadModule('/constants.ts');
    const { isGroundMeleeRange, isMeleeAttackCell } = await server.ssrLoadModule('/engine/ai/MeleeAttack.ts');
    const { querySpawnableHexes, layoutFactionHexes } = await server.ssrLoadModule('/engine/systems/ui/editorQueries.ts');
    const { random } = await server.ssrLoadModule('/engine/math/rng.ts');
    const { Pathfinder } = await server.ssrLoadModule('/engine/ai/Pathfinder.ts');
    const { HEX_SIZE } = await server.ssrLoadModule('/constants.ts');
    const { DEFAULT_SKILL_DB } = await server.ssrLoadModule('/skillDatabase.ts');
    const winsByTeamRole = {};
    const streaks = { over1: 0, over3: 0, over3ByReason: {} };
    const END_PHASE_TILES = 19;
    const skillPicks = {};
    const skillWins = {};
    const pickFrom = (tag) => {
        const pool = DEFAULT_SKILL_DB.filter((s) => s.tag === tag);
        return pool[Math.floor(random() * pool.length)].id;
    };
    // 額外指標：路徑重算、換目標、繞圈（3 秒內走了 3 格以上、淨位移不到 1 格）、過早逃離、終局
    const CIRCLE_WINDOW_S = 3;
    const CELL_PX = HEX_SIZE * 1.5;
    const EARLY_ESCAPE_S = 3;
    const extra = {};
    const extraOf = (role) => (extra[role] ??= { pathCalls: 0, targetSwitches: 0, circlingSec: 0, evadeSec: 0, evadeEarlySec: 0, attackSec: 0 });
    // 互相鎖定又打不到：兩個存活單位互為 target、距離都大於各自基本攻擊的有效射程、都不在 busy（同 isBusy 定義）
    // 被打沒回頭：近 HIT_RECENT_S 內 hp 下降、lastHitSourceId 是存活敵人、target 不是他、且 target 不在射程內
    const HIT_RECENT_S = 1;
    const MUTUAL_LONG_S = 2;
    const circDiag = {};
    const mutualSecByRole = {};
    const hitNoTurnSecByRole = {};
    const mutualDurations = [];
    const baseRangeOf = (a) => {
        const s = a.skills.find((k) => k && k.tag === 'BASIC');
        return s ? s.range : COMBAT_PARAM.MELEE_RANGE;
    };
    const isLive = (u) => Boolean(u) && u.hp > 0 && !u.outOfBounds && !u.banished;
    const outOfReach = (eng, a, t) => HexUtils.dist(a, t) > eng.getEffectiveRange(a, t.q, t.r, baseRangeOf(a));
    const busyOf = (a) => (
        a.castingSkillIdx !== -1 ||
        a.actionState === ActionState.ATTACKING || a.actionState === ActionState.CASTING ||
        a.actionState === ActionState.STUNNED || a.actionState === ActionState.EVADING ||
        a.effects.STUN.remaining > 0 || a.effects.ROOT.remaining > 0 ||
        a.effects.FEAR.remaining > 0 || a.effects.BANISH.remaining > 0
    );
    const finalStage = { battles: 0, lastStandBattles: 0, startTiles: 0, startAlive: 0, sec: 0, attack: 0, evade: 0, moving: 0, wait: 0, idle: 0, endTilesSum: 0 };
    let curEngine = null;
    const origFindPath = Pathfinder.prototype.findPath;
    Pathfinder.prototype.findPath = function (startAgent, ...rest) {
        if (curEngine && this === curEngine.movement.pathfinder) extraOf(startAgent.role).pathCalls++;
        return origFindPath.call(this, startAgent, ...rest);
    };

    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    };

    // 「其他」再細分：擠在路上走不動、施法後硬直、逃生冷卻、行為樹落到 Idle
    const otherReason = (a) => {
        if (a.isMoving) return 'moveBlocked'; // moveProgress 沒動卻還在移動：照理不會發生，出現就是 bug
        if (a._castCompleteCooldown > 0 || a._interruptCooldown > 0) return 'afterCast';
        if (a.aiState === AIState.IDLE) return 'idleNode';
        return 'other';
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
                // 掉下去的當下在做什麼：判斷是逃太晚、被控制、還是沒地方去
                const why = [a.aiMode, a.isMoving ? 'moving' : 'still', a.castingSkillIdx !== -1 ? 'casting' : null,
                    ['STUN', 'ROOT', 'FEAR'].filter((k) => a.effects[k].remaining > 0).join('+') || null,
                    engineCtx.map.mapKeys.size <= 7 ? 'tiles<=7' : null].filter(Boolean).join('|');
                ringOutBy[why] = (ringOutBy[why] ?? 0) + 1;
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
    const lastStandDurations = [];
    const ringOutBy = {};
    const lastProgress = new Map();

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
        if (dur >= 1) streaks.over1++;
        if (dur >= 3) {
            streaks.over3++;
            streaks.over3ByReason[dominantReason] = (streaks.over3ByReason[dominantReason] ?? 0) + 1;
        }
        allIdleStreaks.push({
            battle: battleIndex,
            agentId: s.agentId,
            role: s.role,
            startSec: +s.startSec.toFixed(2),
            durationSec: dur,
            length: dur,
            reason: dominantReason,
            snapshot: s.snapshot ?? null
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
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: left[i].q, r: left[i].r, role: rolesList[i] });
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: right[i].q, r: right[i].r, role: rolesList[i] });
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
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: left[i].q, r: left[i].r, role: Role.WARRIOR });
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: right[i].q, r: right[i].r, role: Role.WARRIOR });
            }
        } else if (scenario === 'ROYALE') {
            engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { factions: 10, unitsPerFaction: 1 } });
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
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team, side: i, q: hex.q, r: hex.r, role: royaleRoles[i] });
            }
        } else if (scenario === 'MELEE_ROYALE' || scenario === 'TANK_ROYALE') {
            engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { factions: 10, unitsPerFaction: 1 } });
            const shuffledHexes = shuffle([...spawnable]);
            const layout = layoutFactionHexes(shuffledHexes, 10, 1);
            for (let i = 0; i < 10; i++) {
                const hex = layout[i]?.[0];
                if (!hex) throw new Error(`Battle ${b}: Faction ${i} missing spawn hex`);
                const team = (i % 2 === 0) ? Team.BLUE : Team.RED;
                engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team, side: i, q: hex.q, r: hex.r, role: scenario === 'TANK_ROYALE' ? Role.TANK : Role.WARRIOR });
            }
        }

        if (HP_SCALE !== 1) {
            const roleHps = engine.agents.map((a) => a.maxHp);
            const mean = roleHps.reduce((x, y) => x + y, 0) / roleHps.length;
            for (const a of engine.agents) {
                a.maxHp = Math.round(mean + (a.maxHp - mean) * HP_SCALE);
                a.hp = a.maxHp;
            }
        }
        if (LOADOUT !== 'role') {
            for (const a of engine.agents) {
                engine.bus.emit('UI_COMMAND', { type: 'SET_AGENT_SKILL', agentId: a.id, slot: 0, skillId: pickFrom('ULT') });
                engine.bus.emit('UI_COMMAND', { type: 'SET_AGENT_SKILL', agentId: a.id, slot: 1, skillId: pickFrom('ACTIVE') });
                if (LOADOUT === 'mixedAll') engine.bus.emit('UI_COMMAND', { type: 'SET_AGENT_SKILL', agentId: a.id, slot: 2, skillId: pickFrom('BASIC') });
            }
        }
        curEngine = engine;
        const history = new Map();
        const lastTarget = new Map();
        let finalSeen = false;
        const lineup = engine.agents.map((a) => ({
            id: a.id,
            team: a.team,
            side: a.side,
            role: a.role
        }));
        for (const u of lineup) {
            roleStats[u.role].picks++;
        }

        const mutualOpen = new Map();
        const lastHp = new Map();
        const lastHpDropT = new Map();
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
        for (const a of engine.agents) {
            if (a.skills.map((s) => s?.id ?? null).join() !== a.skillIds.join()) {
                console.error(`Loadout not applied on ${a.id}`);
                process.exit(1);
            }
            for (const id of a.skillIds) if (id) skillPicks[id] = (skillPicks[id] ?? 0) + 1;
        }
        let t = 0;
        let lastStandAt = null;

        while (gameOverWinner === null && t < MAX_TIME) {
            engine.tick(DT);
            t += DT;
            if (lastStandAt === null && engine.state.isLastStand) lastStandAt = t;
            totalTicks++;

            // 勝負已定的慢動作階段不量：倖存者沒有目標是正常的，算進去會墊高贏家的發呆
            if (engine.victory.isFinishing) continue;

            const alive = engine.agents.filter((a) => a.hp > 0 && !a.outOfBounds && !a.banished);
            const zones = engine.zones;
            const inFinalStage = engine.zoneConfig.enabled && engine.map.mapKeys.size <= END_PHASE_TILES;
            if (inFinalStage && !finalSeen) {
                finalSeen = true;
                finalStage.battles++;
                finalStage.startTiles += engine.map.mapKeys.size;
                finalStage.startAlive += alive.length;
            }

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
                    // 被控制（定身也算）不是 AI 發呆
                    a.effects.STUN.remaining > 0 || a.effects.ROOT.remaining > 0 ||
                    a.effects.FEAR.remaining > 0 || a.effects.BANISH.remaining > 0 ||
                    a.actionState === ActionState.EVADING
                );

                const ex = extraOf(a.role);
                const tid = a.target?.id ?? null;
                const prevTid = lastTarget.get(a.id) ?? null;
                if (tid && prevTid && tid !== prevTid) ex.targetSwitches++;
                if (tid) lastTarget.set(a.id, tid);
                if (a.actionState === ActionState.EVADING) {
                    ex.evadeSec += DT;
                    if (zones.shrinkTimer > EARLY_ESCAPE_S && engine.isWarningTile(HexUtils.key(a))) ex.evadeEarlySec += DT;
                } else if (isBusy) {
                    ex.attackSec += DT;
                }
                const hist = history.get(a.id) ?? { pts: [], walked: 0 };
                history.set(a.id, hist);
                const lastPt = hist.pts[hist.pts.length - 1];
                if (lastPt) hist.walked += Math.hypot(a.px - lastPt.px, a.py - lastPt.py);
                hist.pts.push({ t, px: a.px, py: a.py });
                while (hist.pts.length > 1 && t - hist.pts[0].t > CIRCLE_WINDOW_S) {
                    const [p0, p1] = hist.pts;
                    hist.walked -= Math.hypot(p1.px - p0.px, p1.py - p0.py);
                    hist.pts.shift();
                }
                if (t - hist.pts[0].t >= CIRCLE_WINDOW_S - DT * 2 && hist.walked >= CELL_PX * 3 &&
                    Math.hypot(a.px - hist.pts[0].px, a.py - hist.pts[0].py) < CELL_PX) {
                    ex.circlingSec += DT;
                    const tg = a.target;
                    const dk = !isLive(tg) ? 'noTarget' : [
                        tg.target === a ? 'mutual' : (isLive(tg.target) ? 'tgOther' : 'tgNone'),
                        tg.isMoving ? 'tgMoving' : 'tgStill',
                        outOfReach(engine, a, tg) ? 'out' : 'in',
                        'd' + Math.min(5, HexUtils.dist(a, tg)), String(a.actionState), a.isMoving ? 'mv' : 'nomv', a.effects.KNOCKBACK ? 'kb' : '',
                    ].join('/');
                    circDiag[dk] = (circDiag[dk] ?? 0) + DT;
                }

                let cat = 'idle';
                let idleReason = 'other';

                if (isBusy) {
                    cat = 'busy';
                } else {
                    const prev = prevPositions.get(a.id) ?? { px: a.px, py: a.py };
                    const distMoved = Math.hypot(a.px - prev.px, a.py - prev.py);
                    // 走得慢（敵方地面效果 ×0.3）每 tick 不到半像素也還是在走：看 moveProgress，不只看位移
                    const stepping = a.isMoving && a.moveProgress !== (lastProgress.get(a.id) ?? -1);
                    lastProgress.set(a.id, a.moveProgress);
                    if (distMoved >= 0.5 || stepping) {
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
                                        isMeleeAttackCell(engine.movement.targeting, c, a.target.q, a.target.r, baseRange, engine, a.jump)
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
                                            idleReason = otherReason(a);
                                        }
                                    }
                                } else {
                                    idleReason = otherReason(a);
                                }
                            }
                        }
                    }
                }

                if (inFinalStage) {
                    finalStage.sec += DT;
                    if (a.actionState === ActionState.EVADING) finalStage.evade += DT;
                    else if (cat === 'busy') finalStage.attack += DT;
                    else if (cat === 'moving') finalStage.moving += DT;
                    else if (cat === 'waitInRange') finalStage.wait += DT;
                    else finalStage.idle += DT;
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
                        // 連續發呆滿 1 秒時記下當下狀態，查根因不必重跑
                        if (!tracker.currentStreak.snapshot && tracker.currentStreak.duration >= 1) {
                            tracker.currentStreak.snapshot = {
                                mode: a.aiMode,
                                modeSince: +a.aiModeSince.toFixed(2),
                                trace: a.aiModeTrace.slice(-4).map((e) => `${e.t.toFixed(1)}:${e.from}>${e.to}(${e.why})`),
                                aiState: a.aiState,
                                actionState: a.actionState,
                                effects: Object.entries(a.effects).filter(([, v]) => v?.remaining > 0).map(([k]) => k),
                                pos: [a.q, a.r],
                                height: engine.getTerrainHeight(a.q, a.r),
                                target: a.target ? { id: a.target.id, q: a.target.q, r: a.target.r, h: engine.getTerrainHeight(a.target.q, a.target.r) } : null,
                                path: a.path.slice(0, 3).map((h) => [h.q, h.r]),
                                progress: +a.moveProgress.toFixed(3),
                                speedMult: a.moveSpeedMult,
                                casting: a.castingSkillIdx,
                                neighbors: HexUtils.neighbors(a).map((c) => ({
                                    c: [c.q, c.r], ok: engine.isValid(c.q, c.r), obstacle: engine.hasObstacle(c.q, c.r),
                                    h: engine.getTerrainHeight(c.q, c.r), unit: engine.getAgentAt(c.q, c.r)?.id ?? null,
                                    warning: engine.isWarningTile(HexUtils.key(c))
                                })),
                                onWarning: engine.isWarningTile(HexUtils.key(a)),
                                isMoving: a.isMoving, px: +a.px.toFixed(1), simT: +t.toFixed(2), battleTime: +engine.battleTime.toFixed(2),
                                scale: engine.state.time.timeScale, aliveInBattle: alive.length
                            };
                        }
                        tracker.currentStreak.reasonCounts[idleReason] = (tracker.currentStreak.reasonCounts[idleReason] ?? 0) + DT;
                        tracker.maxContinuousIdleSec = Math.max(tracker.maxContinuousIdleSec, tracker.currentStreak.duration);
                    } else {
                        if (tracker.currentStreak) {
                            finalizeStreak(tracker, b);
                        }
                    }
                }
            }

            const mutualNow = new Set();
            for (const a of alive) {
                const prevHp = lastHp.get(a.id);
                if (prevHp !== undefined && a.hp < prevHp) lastHpDropT.set(a.id, t);
                lastHp.set(a.id, a.hp);
                const tg = a.target;
                if (!isLive(tg)) continue;
                if (!busyOf(a) && outOfReach(engine, a, tg)) {
                    const src = a.lastHitSourceId ? engine.agents.find((u) => u.id === a.lastHitSourceId) : null;
                    if (isLive(src) && src.team !== a.team && src.id !== tg.id && t - (lastHpDropT.get(a.id) ?? -Infinity) <= HIT_RECENT_S) {
                        hitNoTurnSecByRole[a.role] = (hitNoTurnSecByRole[a.role] ?? 0) + DT;
                    }
                }
                if (tg.target !== a || a.id > tg.id) continue;
                if (busyOf(a) || busyOf(tg) || !outOfReach(engine, a, tg) || !outOfReach(engine, tg, a)) continue;
                const pk = `${a.id}|${tg.id}`;
                mutualNow.add(pk);
                mutualSecByRole[a.role] = (mutualSecByRole[a.role] ?? 0) + DT;
                mutualSecByRole[tg.role] = (mutualSecByRole[tg.role] ?? 0) + DT;
                mutualOpen.set(pk, (mutualOpen.get(pk) ?? 0) + DT);
            }
            for (const [k, d] of [...mutualOpen]) {
                if (!mutualNow.has(k)) {
                    mutualDurations.push(d);
                    mutualOpen.delete(k);
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

        for (const d of mutualOpen.values()) mutualDurations.push(d);
        mutualOpen.clear();
        curMatch.active = false;
        curEngine = null;
        if (engine.state.isLastStand) finalStage.lastStandBattles++;
        if (lastStandAt !== null) lastStandDurations.push(t - lastStandAt);
        finalStage.endTilesSum += engine.map.mapKeys.size;
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
            if (scenario !== 'TEAMS' && scenario !== 'MELEE') {
                let winnerAgent = lineup.find((u) => u.id === gameOverWinnerId);
                if (!winnerAgent) {
                    const lastSurvivor = engine.agents.find((a) => a.hp > 0 && !a.outOfBounds && !a.banished);
                    if (lastSurvivor) winnerAgent = lineup.find((u) => u.id === lastSurvivor.id);
                }
                if (winnerAgent) {
                    roleStats[winnerAgent.role].wins++;
                    const k = `${winnerAgent.team === Team.BLUE ? 'BLUE' : 'RED'}/${winnerAgent.role}`;
                    winsByTeamRole[k] = (winsByTeamRole[k] ?? 0) + 1;
                    const wa = engine.agents.find((x) => x.id === winnerAgent.id);
                    for (const id of wa.skillIds) if (id) skillWins[id] = (skillWins[id] ?? 0) + 1;
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
    if (scenario !== 'TEAMS' && scenario !== 'MELEE') {
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
    const isRoyale = (scenario !== 'TEAMS' && scenario !== 'MELEE');

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
    Pathfinder.prototype.findPath = origFindPath;
    const perRole = {};
    for (const [role, ex] of Object.entries(extra)) {
        const alive = roleStats[role].aliveSec;
        perRole[role] = {
            pathCallsPerSec: +(ex.pathCalls / alive).toFixed(2),
            targetSwitchPerMin: +((ex.targetSwitches / alive) * 60).toFixed(1),
            circlingPct: +((ex.circlingSec / alive) * 100).toFixed(2),
            evadePct: +((ex.evadeSec / alive) * 100).toFixed(2),
            evadeEarlyPct: +((ex.evadeEarlySec / alive) * 100).toFixed(2),
            attackPct: +((ex.attackSec / alive) * 100).toFixed(2),
            mutualLockPct: +(((mutualSecByRole[role] ?? 0) / alive) * 100).toFixed(2),
            hitNoTurnPct: +(((hitNoTurnSecByRole[role] ?? 0) / alive) * 100).toFixed(2),
        };
    }
    const mutSorted = [...mutualDurations].sort((x, y) => x - y);
    const totalAlive = Object.values(roleStats).reduce((s, r) => s + r.aliveSec, 0);
    const mutualSummary = {
        pctOfAlive: +((Object.values(mutualSecByRole).reduce((s, v) => s + v, 0) / totalAlive) * 100).toFixed(2),
        hitNoTurnPctOfAlive: +((Object.values(hitNoTurnSecByRole).reduce((s, v) => s + v, 0) / totalAlive) * 100).toFixed(2),
        episodes: mutSorted.length,
        p90Sec: +(mutSorted[Math.floor(mutSorted.length * 0.9)] ?? 0).toFixed(2),
        maxSec: +(mutSorted[mutSorted.length - 1] ?? 0).toFixed(2),
        over2PerBattle: +(mutSorted.filter((d) => d >= MUTUAL_LONG_S).length / BATTLES).toFixed(3),
    };
    const fs = finalStage;
    const finalSummary = fs.battles === 0 ? null : {
        battlesReached: fs.battles,
        lastStandBattles: fs.lastStandBattles,
        avgStartTiles: +(fs.startTiles / fs.battles).toFixed(1),
        avgStartAlive: +(fs.startAlive / fs.battles).toFixed(1),
        attackPct: +((fs.attack / fs.sec) * 100).toFixed(1),
        evadePct: +((fs.evade / fs.sec) * 100).toFixed(1),
        movingPct: +((fs.moving / fs.sec) * 100).toFixed(1),
        waitPct: +((fs.wait / fs.sec) * 100).toFixed(1),
        idlePct: +((fs.idle / fs.sec) * 100).toFixed(1),
    };
    const skillTable = Object.entries(skillPicks)
        .map(([id, picks]) => ({ id, picks, wins: skillWins[id] ?? 0, winPct: +(((skillWins[id] ?? 0) / picks) * 100).toFixed(1) }))
        .sort((a, b) => b.winPct - a.winPct);
    const idleDetail = {};
    for (const [role, rs] of Object.entries(roleStats)) {
        if (rs.aliveSec <= 0) continue;
        idleDetail[role] = Object.fromEntries(Object.entries(rs.idleReasons).filter(([, v]) => v > 0).map(([k, v]) => [k, +((v / rs.aliveSec) * 100).toFixed(2)]));
    }
    result.loadout = LOADOUT;
    result.winsByTeamRole = winsByTeamRole;
    result.perRole = perRole;
    result.finalStage = finalSummary;
    result.skillTable = skillTable;
    console.log(`LOADOUT ${LOADOUT}; wins by team/role: ${JSON.stringify(winsByTeamRole)}`);
    console.log(`PERROLE ${JSON.stringify(perRole)}`);
    console.log(`IDLEDETAIL ${JSON.stringify(idleDetail)}`);
    console.log(`FINAL ${JSON.stringify(finalSummary)} avgEndTiles=${(fs.endTilesSum / BATTLES).toFixed(1)}`);
    const lsSorted = [...lastStandDurations].sort((x, y) => x - y);
    console.log(`LASTSTAND battles=${lsSorted.length} durationSec avg=${(lsSorted.reduce((x, y) => x + y, 0) / (lsSorted.length || 1)).toFixed(1)} p90=${(lsSorted[Math.floor(lsSorted.length * 0.9)] ?? 0).toFixed(1)} max=${(lsSorted[lsSorted.length - 1] ?? 0).toFixed(1)}`);
    console.log(`RINGOUT ${JSON.stringify(Object.entries(ringOutBy).sort((x, y) => y[1] - x[1]).slice(0, 12))}`);
    console.log('CIRCDIAG ' + JSON.stringify(Object.entries(circDiag).sort((x, y) => y[1] - x[1]).slice(0, 14).map(([k, v]) => [k, +v.toFixed(1)])));
    console.log(`MUTUALLOCK ${JSON.stringify(mutualSummary)}`);
    console.log(`STREAKS per battle: >=1s ${(streaks.over1 / BATTLES).toFixed(2)}, >=3s ${(streaks.over3 / BATTLES).toFixed(2)} ${JSON.stringify(streaks.over3ByReason)}`);
    console.log(`SKILLS_TOP ${JSON.stringify(skillTable.slice(0, 6))}`);
    console.log(`SKILLS_BOTTOM ${JSON.stringify(skillTable.slice(-6))}`);
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
