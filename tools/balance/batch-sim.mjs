// ╔══════════════════════════════════════════════════════════╗
// ║  batch-sim — 無畫面批次對戰，統計勝率與技能實際表現        ║
// ║  用法：node tools/balance/batch-sim.mjs [--battles=200]    ║
// ║        [--seed=1] [--maxTime=180] [--dt=0.0333]            ║
// ║        [--out=tools/ui-e2e/out/balance.json] [--swapSides] ║
// ║  做法：Vite ssrLoadModule 載入引擎（Node，無渲染），每場隨 ║
// ║  機地圖、雙方各 5 職業一人、技能照 addAgent 隨機抽；包住   ║
// ║  SkillExecutor.resolveHit 量命中扣血／回血／反傷，          ║
// ║  CCManager.applyCC 與 EffectSystem.update 歸屬 DOT 傷害，  ║
// ║  Agent.prototype.hp 攔截雙方總失血量，CombatSystem 施放入口║
// ║  量施放次數。引擎程式碼除 sourceId 外不修改。              ║
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
    const { CCManager } = await server.ssrLoadModule('/engine/systems/combat/CCManager.ts');
    const { EffectSystem } = await server.ssrLoadModule('/engine/systems/status/EffectSystem.ts');
    const { Agent } = await server.ssrLoadModule('/engine/core/Agent.ts');
    const { Team, Role } = await server.ssrLoadModule('/types.ts');
    const { HexUtils } = await server.ssrLoadModule('/engine/utils.ts');
    const { DEFAULT_SKILL_DB } = await server.ssrLoadModule('/skillDatabase.ts');
    const skillMetaMap = new Map(DEFAULT_SKILL_DB.map((s) => [s.id, s]));

    // ── 量測掛鉤 ──
    let cur = null; // 目前這場的統計

    // 1. 全局 HP 扣減攔截（測量總失血，涵蓋技能直接、DOT、危害、縮圈墜落、反傷等所有來源）
    const _hpMap = new WeakMap();
    Object.defineProperty(Agent.prototype, 'hp', {
        get() { return _hpMap.get(this) ?? 0; },
        set(val) {
            const old = _hpMap.get(this) ?? val;
            _hpMap.set(this, val);
            if (cur && cur.active && val < old) {
                const loss = old - val;
                cur.hpLost[this.team] = (cur.hpLost[this.team] || 0) + loss;
            }
        },
        configurable: true
    });

    // 2. 技能直接命中扣血、護盾吸收、擊殺、吸血與反傷
    const origResolve = SkillExecutor.prototype.resolveHit;
    SkillExecutor.prototype.resolveHit = function (source, target, skill, ...rest) {
        if (!cur || !target) return origResolve.call(this, source, target, skill, ...rest);
        const hp0 = target.hp, sh0 = target.shield ?? 0;
        const sourceHp0 = source ? source.hp : 0;
        const out = origResolve.call(this, source, target, skill, ...rest);
        const dHp = target.hp - hp0;
        const s = (cur.skills[skill.id] ??= { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, absorbed: 0, hits: 0, kills: 0, reflected: 0 });
        s.hits++;
        if (dHp < 0) {
            const dmg = -dHp;
            s.dmg += dmg;
            s.directDmg = (s.directDmg || 0) + dmg;
        } else if (dHp > 0) {
            s.heal += dHp;
        }
        const dSh = sh0 - (target.shield ?? 0);
        if (dSh > 0 && target.team !== source?.team) s.absorbed += dSh;
        if (hp0 > 0 && target.hp <= 0) s.kills++;

        // 吸血回復歸到技能 heal、反傷造成的自損另列 reflected
        if (source) {
            const dSourceHp = source.hp - sourceHp0;
            if (dSourceHp > 0) {
                s.heal += dSourceHp;
            } else if (dSourceHp < 0) {
                s.reflected = (s.reflected || 0) + (-dSourceHp);
            }
        }
        return out;
    };

    // 3. DOT 歸屬：記錄目標單位身上 DOT 是由哪個技能施放
    const origApplyCC = CCManager.applyCC;
    CCManager.applyCC = function (source, target, skill, type, ...rest) {
        if (cur && type === 'DOT' && target && skill) {
            cur.targetDotSkill[target.id] = skill.id;
        }
        return origApplyCC.call(this, source, target, skill, type, ...rest);
    };

    // 4. DOT 每幀扣血歸屬到技能
    const origEffectUpdate = EffectSystem.prototype.update;
    EffectSystem.prototype.update = function (agent, dt, engine) {
        if (!cur || agent.hp <= 0 || agent.banished || agent.outOfBounds) {
            return origEffectUpdate.call(this, agent, dt, engine);
        }
        const dotRemaining = agent.effects.DOT.remaining;
        const dotVal = agent.effects.DOT.value;
        const hp0 = agent.hp;
        const sh0 = agent.shield ?? 0;

        const out = origEffectUpdate.call(this, agent, dt, engine);

        if (dotRemaining > 0 && dotVal > 0) {
            const amount = dotVal * dt;
            const absorbed = Math.min(sh0, amount);
            const dealt = Math.min(hp0, Math.max(0, amount - absorbed));
            const skillId = cur.targetDotSkill[agent.id];
            if (skillId && dealt > 0) {
                const s = (cur.skills[skillId] ??= { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, absorbed: 0, hits: 0, kills: 0, reflected: 0 });
                s.dotDmg = (s.dotDmg || 0) + dealt;
                s.dmg += dealt;
                if (hp0 > 0 && agent.hp <= 0) {
                    s.kills++;
                }
            }
        }
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
        cur = {
            skills: {},
            casts: {},
            targetDotSkill: {},
            hpLost: { [Team.BLUE]: 0, [Team.RED]: 0 },
            active: true
        };
        let winner = null;
        engine.bus.on('GAME_OVER', (d) => { winner = d.winner ?? 'DRAW'; });
        const lineup = engine.agents.map((a) => ({ id: a.id, team: a.team, role: a.role, skills: [...a.skillIds] }));
        engine.play();
        let t = 0;
        while (winner === null && t < MAX_TIME) { engine.tick(DT); t += DT; }
        cur.active = false;
        const survivors = engine.agents.filter((a) => a.hp > 0 && !a.outOfBounds).map((a) => a.id);

        // 統計本場失血與傷害歸屬
        const skillToTeam = {};
        for (const u of lineup) {
            for (const sid of u.skills) if (sid) skillToTeam[sid] = u.team;
        }
        let blueSkillDmg = 0;
        let redSkillDmg = 0;
        for (const [sid, sk] of Object.entries(cur.skills)) {
            if (skillToTeam[sid] === Team.BLUE) blueSkillDmg += sk.dmg;
            else if (skillToTeam[sid] === Team.RED) redSkillDmg += sk.dmg;
        }
        const blueHpLost = cur.hpLost[Team.BLUE] || 0;
        const redHpLost = cur.hpLost[Team.RED] || 0;
        const totalHpLost = blueHpLost + redHpLost;
        const attributedDmg = blueSkillDmg + redSkillDmg;
        const unattributedDmg = Math.max(0, totalHpLost - attributedDmg);

        battles.push({
            i: b,
            scene: engine.currentScene?.id,
            winner: winner ?? 'TIMEOUT',
            time: +t.toFixed(1),
            lineup,
            survivors,
            skills: cur.skills,
            casts: cur.casts,
            hpLoss: {
                blueHpLost,
                redHpLost,
                totalHpLost,
                blueSkillDmg,
                redSkillDmg,
                attributedDmg,
                unattributedDmg
            }
        });
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
            const meta = skillMetaMap.get(id);
            const a = (skillAgg[id] ??= {
                picks: 0, wins: 0, casts: 0, dmg: 0, directDmg: 0, dotDmg: 0,
                heal: 0, absorbed: 0, hits: 0, kills: 0, reflected: 0,
                name: meta?.name || id,
                tag: meta?.tag || '',
                role: meta?.role || u.role,
                team: meta?.team ? teamName(meta.team) : teamName(u.team)
            });
            a.picks++;
            if (winTeam && teamName(u.team) === winTeam) a.wins++;
        }
        for (const [id, c] of Object.entries(r.casts)) {
            (skillAgg[id] ??= { picks: 0, wins: 0, casts: 0, dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, absorbed: 0, hits: 0, kills: 0, reflected: 0 }).casts += c;
        }
        for (const [id, s] of Object.entries(r.skills)) {
            const a = (skillAgg[id] ??= { picks: 0, wins: 0, casts: 0, dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, absorbed: 0, hits: 0, kills: 0, reflected: 0 });
            a.dmg += s.dmg;
            a.directDmg = (a.directDmg || 0) + (s.directDmg || 0);
            a.dotDmg = (a.dotDmg || 0) + (s.dotDmg || 0);
            a.heal += s.heal;
            a.hits += s.hits;
            a.kills += s.kills;
            a.absorbed += s.absorbed;
            a.reflected = (a.reflected || 0) + (s.reflected || 0);
        }
    }

    const totalLostAll = battles.reduce((acc, b) => acc + b.hpLoss.totalHpLost, 0);
    const totalAttrAll = battles.reduce((acc, b) => acc + b.hpLoss.attributedDmg, 0);
    const totalUnattrAll = battles.reduce((acc, b) => acc + b.hpLoss.unattributedDmg, 0);

    const summary = {
        battles: BATTLES, seed: SEED, dt: DT, maxTime: MAX_TIME, swapSides: SWAP,
        wins, blueWinRate: +pBlue.toFixed(3), ci95: +ci.toFixed(3),
        avgTime: +(battles.reduce((s, r) => s + r.time, 0) / BATTLES).toFixed(1),
        wallSeconds: +((Date.now() - t0) / 1000).toFixed(1),
        damageAttribution: {
            totalHpLost: Math.round(totalLostAll),
            attributedDmg: Math.round(totalAttrAll),
            unattributedDmg: Math.round(totalUnattrAll),
            attributedPct: +(totalLostAll > 0 ? (totalAttrAll / totalLostAll) * 100 : 0).toFixed(1),
            unattributedPct: +(totalLostAll > 0 ? (totalUnattrAll / totalLostAll) * 100 : 0).toFixed(1),
        }
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ summary, skills: skillAgg, battles }, null, 1));
    console.log(JSON.stringify(summary));
    console.log(`saved ${OUT}`);
} finally {
    await server.close();
}
