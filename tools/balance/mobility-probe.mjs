// ╔══════════════════════════════════════════════════════════╗
// ║  mobility-probe — 機動技實戰驗收：位移、落點、掉場外       ║
// ║  用法：npm run balance:mobility -- [--battles=200]         ║
// ║        [--seed=31] [--report]                              ║
// ║  無畫面跑 5v5（同 batch-sim 的配置），包住 completeCast、  ║
// ║  resolveHit、calculateKnockback 量測，引擎不修改。         ║
// ║  門檻未達退出碼 1；--report 只印數字不判定。               ║
// ║  門檻同時含「次數下限」：只靠不放技能過關會失敗。          ║
// ╚══════════════════════════════════════════════════════════╝
import { createServer } from 'vite';

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const BATTLES = Number(arg('battles', 200));
const SEED = Number(arg('seed', 31));
const REPORT_ONLY = process.argv.includes('--report');
const DT = 1 / 30;
/** 死前這麼多秒內被位移過，就把這次墜落算給那次位移 */
const ATTRIBUTE_S = 4;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
let failed = false;
try {
    const { GameEngine } = await server.ssrLoadModule('/engine/game.ts');
    const { SkillExecutor } = await server.ssrLoadModule('/engine/systems/combat/SkillExecutor.ts');
    const { CombatSystem } = await server.ssrLoadModule('/engine/systems/combat/CombatSystem.ts');
    const { CCManager } = await server.ssrLoadModule('/engine/systems/combat/CCManager.ts');
    const { Team, Role } = await server.ssrLoadModule('/types.ts');
    const { HexUtils } = await server.ssrLoadModule('/engine/utils.ts');
    const { BLOCK_HEIGHT } = await server.ssrLoadModule('/constants.ts');

    const moveKind = (s) => s?.onCast?.find((c) => c.action === 'DASH' || c.action === 'RETREAT' || c.action === 'BLINK')?.action;
    const moves = [];
    const forced = [];
    const deaths = [];
    const hits = { total: 0, far: 0, maxDist: 0 };
    let curHitSkill = null;

    const origResolve = SkillExecutor.prototype.resolveHit;
    SkillExecutor.prototype.resolveHit = function (source, target, skill, ...rest) {
        const prev = curHitSkill;
        curHitSkill = skill;
        if (skill?.tag === 'MOBILITY' && moveKind(skill) === 'DASH') {
            const d = HexUtils.dist(source, target);
            hits.total++;
            hits.maxDist = Math.max(hits.maxDist, d);
            if (d > (skill.type === 'AOE' ? skill.aoeRadius ?? 1 : 1)) hits.far++;
        }
        try { return origResolve.call(this, source, target, skill, ...rest); } finally { curHitSkill = prev; }
    };

    const origKb = CCManager.calculateKnockback;
    CCManager.calculateKnockback = function (target, force, source, origin, type, engine, repeatHit) {
        const from = { q: target.q, r: target.r };
        const d0 = HexUtils.dist(from, source);
        const out = origKb.call(this, target, force, source, origin, type, engine, repeatHit);
        const tiles = HexUtils.dist(from, target);
        forced.push({ skill: curHitSkill?.id, tag: curHitSkill?.tag, type, d0, tiles, offMap: !engine.isValid(target.q, target.r), hasOrigin: !!origin });
        target.__lastMove = { kind: type, tag: curHitSkill?.tag, t: engine.battleTime };
        return out;
    };

    const origComplete = CombatSystem.prototype.completeCast;
    CombatSystem.prototype.completeCast = function (a, engine) {
        const s = a.skills[a.castingSkillIdx];
        const kind = moveKind(s);
        if (!kind) return origComplete.call(this, a, engine);
        const from = { q: a.q, r: a.r };
        const h0 = engine.getTerrainHeight(a.q, a.r);
        const center = SkillExecutor.castCenter(a, s);
        const targetDist = HexUtils.dist(a, center);
        const out = origComplete.call(this, a, engine);
        const rec = {
            skill: s.id, tag: s.tag, kind, baseRange: s.range, targetDist,
            tiles: HexUtils.dist(from, a),
            drop: (h0 - engine.getTerrainHeight(a.q, a.r)) / BLOCK_HEIGHT,
            afterDist: HexUtils.dist(a, center),
            landWarning: engine.isWarningTile(HexUtils.key(a)),
            landHazard: engine.getSpatialHazardsAt(a.q, a.r).some((h) => h.side !== a.side),
            nearestEnemy: Math.min(99, ...engine.agents.filter((e) => e.hp > 0 && e.side !== a.side && !e.outOfBounds).map((e) => HexUtils.dist(a, e))),
            atEdge: HexUtils.neighbors(a).some((n) => !engine.isValid(n.q, n.r)),
            ringOutAfter: false,
        };
        moves.push(rec);
        a.__lastMove = { kind, tag: s.tag, t: engine.battleTime, rec };
        return out;
    };

    const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
    let ringOuts = 0, totalTime = 0;
    for (let b = 0; b < BATTLES; b++) {
        const engine = new GameEngine({ mute: true });
        engine.seedSimulation(SEED * 100000 + b);
        engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
        const radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1;
        const valid = [...engine.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !engine.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
        const left = valid.filter((h) => h.q < -1), right = valid.filter((h) => h.q > 1);
        let s = (SEED * 7919 + b * 104729) >>> 0;
        const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        for (const arr of [left, right]) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
        for (let i = 0; i < 5; i++) {
            engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: left[i].q, r: left[i].r, role: roles[i] });
            engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: right[i].q, r: right[i].r, role: roles[i] });
        }
        const origDead = engine.agentManager.handleDeadState.bind(engine.agentManager);
        engine.agentManager.handleDeadState = (a, e, reason, text) => {
            if (text === 'RING_OUT') {
                ringOuts++;
                const lm = a.__lastMove;
                const recent = lm && e.battleTime - lm.t < ATTRIBUTE_S;
                if (recent && lm.rec) lm.rec.ringOutAfter = true;
                deaths.push(recent ? `${lm.kind} ${lm.tag}` : '無位移');
            }
            return origDead(a, e, reason, text);
        };
        let winner = null;
        engine.bus.on('GAME_OVER', (d) => { winner = d.winner ?? 'DRAW'; });
        engine.play();
        let t = 0;
        while (winner === null && t < 180) { engine.tick(DT); t += DT; }
        totalTime += t;
    }

    const count = (arr, f) => arr.filter(f).length;
    const pct = (n, d) => (d ? 100 * n / d : 0);
    const mobDash = moves.filter((m) => m.kind === 'DASH' && m.tag === 'MOBILITY');
    const retreats = moves.filter((m) => m.kind === 'RETREAT');
    const blinks = moves.filter((m) => m.kind === 'BLINK');
    const mobPull = forced.filter((f) => f.type === 'PULL' && f.tag === 'MOBILITY');
    const mobKb = forced.filter((f) => f.type === 'KNOCKBACK' && f.tag === 'MOBILITY');
    const allPull = forced.filter((f) => f.type === 'PULL');
    const deathBy = deaths.reduce((m, k) => { m[k] = (m[k] ?? 0) + 1; return m; }, {});

    // [名稱, 數值, 門檻, 判定]
    const rows = [
        ['機動突進 最大位移（格）', Math.max(0, ...mobDash.map((m) => m.tiles)), '<=5', (v) => v <= 5],
        ['機動突進 目標超過資料射程 %', pct(count(mobDash, (m) => m.targetDist > m.baseRange), mobDash.length), '<=2', (v) => v <= 2],
        ['機動突進 隔空打中 %', pct(hits.far, hits.total), '=0', (v) => v === 0],
        ['機動突進 位移為 0 %', pct(count(mobDash, (m) => m.tiles === 0), mobDash.length), '<=3', (v) => v <= 3],
        ['機動突進 落警告格 %', pct(count(mobDash, (m) => m.landWarning), mobDash.length), '<=1', (v) => v <= 1],
        ['機動突進 落敵方危害區 %', pct(count(mobDash, (m) => m.landHazard), mobDash.length), '<=1', (v) => v <= 1],
        ['機動突進 每場次數（下限）', mobDash.length / BATTLES, '>=0.9', (v) => v >= 0.9],
        ['後撤 落警告格 %', pct(count(retreats, (m) => m.landWarning), retreats.length), '<5', (v) => v < 5],
        ['後撤 落敵方危害區 %', pct(count(retreats, (m) => m.landHazard), retreats.length), '<=1', (v) => v <= 1],
        ['後撤 貼場邊 %', pct(count(retreats, (m) => m.atEdge), retreats.length), '<=15', (v) => v <= 15],
        ['後撤 之後墜落死（次）', count(retreats, (m) => m.ringOutAfter), `<=${Math.ceil(BATTLES / 100)}`, (v) => v <= Math.ceil(BATTLES / 100)],
        ['後撤 每場次數（下限）', retreats.length / BATTLES, '>=1.5', (v) => v >= 1.5],
        ['瞬移 落警告或危害 %', pct(count(blinks, (m) => m.landWarning || m.landHazard), blinks.length), '<=1', (v) => v <= 1],
        ['機動拉扯 穿過施法者（次）', count(mobPull, (f) => !f.hasOrigin && f.tiles >= f.d0 && f.tiles > 0), '=0', (v) => v === 0],
        ['拉扯 拉出場（次）', count(allPull, (f) => f.offMap), '=0', (v) => v === 0],
        ['機動擊退 推出場（次）', count(mobKb, (f) => f.offMap), '=0', (v) => v === 0],
        ['每場墜落死', ringOuts / BATTLES, '<=0.3', (v) => v <= 0.3],
    ];
    console.log(`${BATTLES} 場，seed ${SEED}，平均 ${(totalTime / BATTLES).toFixed(1)} 秒`);
    for (const [name, value, gate, ok] of rows) {
        const pass = ok(value);
        if (!pass) failed = true;
        console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${Number(value.toFixed(2))}（門檻 ${gate}）`);
    }
    console.log('機動突進 次數', mobDash.length, '後撤 次數', retreats.length, '瞬移 次數', blinks.length);
    console.log('機動突進 打中時最遠距離', hits.maxDist);
    console.log('墜落死來源', deathBy);
} finally {
    await server.close();
}
process.exit(failed && !REPORT_ONLY ? 1 : 0);
