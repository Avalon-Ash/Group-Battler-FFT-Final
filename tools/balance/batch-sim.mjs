// ╔══════════════════════════════════════════════════════════╗
// ║  batch-sim — 無畫面批次對戰，統計勝率與技能實際表現        ║
// ║  用法：node tools/balance/batch-sim.mjs [--battles=200]    ║
// ║        [--seed=1] [--maxTime=180] [--dt=0.0333]            ║
// ║        [--out=tools/ui-e2e/out/balance.json] [--swapSides] ║
// ║  做法：Vite ssrLoadModule 載入引擎（Node，無渲染），每場隨 ║
// ║  機地圖、雙方各 5 職業一人、技能照 addAgent 隨機抽；包住   ║
// ║  SkillExecutor.resolveHit 量每次命中的實際扣血／回血，      ║
// ║  CombatSystem 的施放入口量施放次數。引擎程式碼不修改。     ║
// ╚══════════════════════════════════════════════════════════╝
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const BATTLES = Number(arg('battles', 200));
const SEED = Number(arg('seed', 1));
const MAX_TIME = Number(arg('maxTime', 180));
const DT = Number(arg('dt', 1 / 30));
const OUT = arg('out', 'tools/ui-e2e/out/balance.json');
const SWAP = process.argv.includes('--swapSides'); // 藍方改站右邊，用來分離站位與陣營的影響

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, logLevel: 'error', appType: 'custom' });
try {
    const { GameEngine } = await server.ssrLoadModule('/engine/game.ts');
    const { SkillExecutor } = await server.ssrLoadModule('/engine/systems/combat/SkillExecutor.ts');
    const { CombatSystem } = await server.ssrLoadModule('/engine/systems/combat/CombatSystem.ts');
    const { Team, Role } = await server.ssrLoadModule('/types.ts');
    const { HexUtils } = await server.ssrLoadModule('/engine/utils.ts');

    // ── 量測掛鉤 ──
    let cur = null; // 目前這場的統計
    const origResolve = SkillExecutor.prototype.resolveHit;
    SkillExecutor.prototype.resolveHit = function (source, target, skill, ...rest) {
        if (!cur || !target) return origResolve.call(this, source, target, skill, ...rest);
        const hp0 = target.hp, sh0 = target.shield ?? 0;
        const out = origResolve.call(this, source, target, skill, ...rest);
        const dHp = target.hp - hp0;
        const s = (cur.skills[skill.id] ??= { dmg: 0, heal: 0, absorbed: 0, hits: 0, kills: 0 });
        s.hits++;
        if (dHp < 0) s.dmg += -dHp; else if (dHp > 0) s.heal += dHp;
        const dSh = sh0 - (target.shield ?? 0);
        if (dSh > 0 && target.team !== source.team) s.absorbed += dSh;
        if (hp0 > 0 && target.hp <= 0) s.kills++;
        return out;
    };
    const countCast = (skill) => { if (cur && skill) (cur.casts[skill.id] = (cur.casts[skill.id] ?? 0) + 1); };
    const origInstant = SkillExecutor.prototype.executeInstantSkill;
    SkillExecutor.prototype.executeInstantSkill = function (a, s, e) { countCast(s); return origInstant.call(this, a, s, e); };
    const origSpawn = CombatSystem.prototype.spawnProjectile;
    CombatSystem.prototype.spawnProjectile = function (a, s, e) { countCast(s); return origSpawn.call(this, a, s, e); };

    const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
    const battles = [];
    const t0 = Date.now();
    for (let b = 0; b < BATTLES; b++) {
        const engine = new GameEngine({ mute: true });
        engine.seedSimulation(SEED * 100000 + b);
        engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
        const radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1;
        const valid = [...engine.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !engine.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
        const left = valid.filter((h) => h.q < -1), right = valid.filter((h) => h.q > 1);
        // 固定順序洗牌（引擎已設種子，這裡用自己的 LCG，不動引擎亂數）
        let s = (SEED * 7919 + b * 104729) >>> 0;
        const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        for (const arr of [left, right]) for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
        for (let i = 0; i < 5; i++) {
            const bh = SWAP ? right[i] : left[i], rh = SWAP ? left[i] : right[i];
            engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: bh.q, r: bh.r, role: roles[i] });
            engine.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: rh.q, r: rh.r, role: roles[i] });
        }
        cur = { skills: {}, casts: {} };
        let winner = null;
        engine.bus.on('GAME_OVER', (d) => { winner = d.winner ?? 'DRAW'; });
        const lineup = engine.agents.map((a) => ({ id: a.id, team: a.team, role: a.role, skills: [...a.skillIds] }));
        engine.play();
        let t = 0;
        while (winner === null && t < MAX_TIME) { engine.tick(DT); t += DT; }
        const survivors = engine.agents.filter((a) => a.hp > 0 && !a.outOfBounds).map((a) => a.id);
        battles.push({ i: b, scene: engine.currentScene?.id, winner: winner ?? 'TIMEOUT', time: +t.toFixed(1), lineup, survivors, skills: cur.skills, casts: cur.casts });
        engine.stop();
        engine.destroy?.();
        if ((b + 1) % 25 === 0) process.stdout.write(`  ${b + 1}/${BATTLES} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
    }
    cur = null;

    // ── 彙整 ──
    const teamName = (t) => (t === Team.BLUE ? 'BLUE' : t === Team.RED ? 'RED' : String(t));
    const wins = { BLUE: 0, RED: 0, DRAW: 0, TIMEOUT: 0 };
    for (const r of battles) wins[r.winner === 'TIMEOUT' || r.winner === 'DRAW' ? r.winner : teamName(r.winner)]++;
    const decided = wins.BLUE + wins.RED;
    const pBlue = decided ? wins.BLUE / decided : 0;
    const ci = decided ? 1.96 * Math.sqrt(pBlue * (1 - pBlue) / decided) : 0;

    const skillAgg = {};
    for (const r of battles) {
        const winTeam = r.winner === 'TIMEOUT' || r.winner === 'DRAW' ? null : teamName(r.winner);
        for (const u of r.lineup) for (const id of u.skills) {
            if (!id) continue;
            const a = (skillAgg[id] ??= { picks: 0, wins: 0, casts: 0, dmg: 0, heal: 0, hits: 0, kills: 0 });
            a.picks++;
            if (winTeam && teamName(u.team) === winTeam) a.wins++;
        }
        for (const [id, c] of Object.entries(r.casts)) (skillAgg[id] ??= { picks: 0, wins: 0, casts: 0, dmg: 0, heal: 0, hits: 0, kills: 0 }).casts += c;
        for (const [id, s] of Object.entries(r.skills)) { const a = skillAgg[id]; a.dmg += s.dmg; a.heal += s.heal; a.hits += s.hits; a.kills += s.kills; }
    }
    const summary = {
        battles: BATTLES, seed: SEED, dt: DT, maxTime: MAX_TIME, swapSides: SWAP,
        wins, blueWinRate: +pBlue.toFixed(3), ci95: +ci.toFixed(3),
        avgTime: +(battles.reduce((s, r) => s + r.time, 0) / BATTLES).toFixed(1),
        wallSeconds: +((Date.now() - t0) / 1000).toFixed(1),
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ summary, skills: skillAgg, battles }, null, 1));
    console.log(JSON.stringify(summary));
    console.log(`saved ${OUT}`);
} finally {
    await server.close();
}
