// ╔══════════════════════════════════════════════════════════╗
// ║  report.mjs — 讀取 balance*.json，輸出平衡分析 Markdown   ║
// ║  用法：node tools/balance/report.mjs [file1.json] [file2...]║
// ║        [--out=docs/BALANCE_REPORT.md]                      ║
// ╚══════════════════════════════════════════════════════════╝
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// 解析命令列參數
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));
const OUT_PATH = outArg ? outArg.slice(6) : null;
const inputFiles = args.filter((a) => !a.startsWith('--'));

let filePaths = inputFiles;
if (filePaths.length === 0) {
    const dir = resolve('tools/ui-e2e/out');
    if (existsSync(dir)) {
        const matches = readdirSync(dir)
            .filter((f) => f.startsWith('balance') && f.endsWith('.json'))
            .map((f) => join(dir, f));
        if (matches.length > 0) filePaths = matches;
    }
}

if (filePaths.length === 0) {
    console.error('No input balance*.json files found.');
    process.exit(1);
}

// 載入技能完整元資料（名稱、標籤、職業、陣營）
function loadSkillMeta() {
    const meta = {};
    const skillFiles = ['blue_basic.ts', 'blue_active.ts', 'blue_ult.ts', 'red_basic.ts', 'red_active.ts', 'red_ult.ts'];
    const roleMap = { t: 'TANK', w: 'WARRIOR', r: 'RANGER', m: 'MAGE', s: 'SUPPORT' };
    const teamMap = { b: 'BLUE', r: 'RED' };
    for (const f of skillFiles) {
        const filePath = resolve('data/skills', f);
        if (!existsSync(filePath)) continue;
        const src = readFileSync(filePath, 'utf8');
        const idMatches = [...src.matchAll(/id:\s*'([^']+)'/g)];
        const nameMatches = [...src.matchAll(/name:\s*'([^']+)'/g)];
        const tagMatches = [...src.matchAll(/tag:\s*'([^']+)'/g)];
        for (let i = 0; i < idMatches.length; i++) {
            const id = idMatches[i][1];
            meta[id] = {
                id,
                name: nameMatches[i] ? nameMatches[i][1] : id,
                tag: tagMatches[i] ? tagMatches[i][1] : '',
                role: roleMap[id[0]] || '',
                team: teamMap[id[1]] || ''
            };
        }
    }
    return meta;
}
const globalSkillMeta = loadSkillMeta();

// 讀取所有 JSON
const datasets = filePaths.map((p) => {
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    return { path: p, ...raw };
});

// 陣營名稱正規化 (Team.BLUE = 0, Team.RED = 1)
const teamName = (t) => {
    if (t === 0 || t === '0' || t === 'BLUE' || t === 'Team.BLUE') return 'BLUE';
    if (t === 1 || t === '1' || t === 'RED' || t === 'Team.RED') return 'RED';
    return String(t);
};

// ── 1. 陣營勝率統計 ──
function calcWinStats(battles) {
    const wins = { BLUE: 0, RED: 0, DRAW: 0, TIMEOUT: 0 };
    for (const b of battles) {
        const w = b.winner === 'TIMEOUT' || b.winner === 'DRAW' ? b.winner : teamName(b.winner);
        wins[w] = (wins[w] || 0) + 1;
    }
    const decided = (wins.BLUE || 0) + (wins.RED || 0);
    const pBlue = decided > 0 ? wins.BLUE / decided : 0;
    const pRed = decided > 0 ? wins.RED / decided : 0;
    const ci95 = decided > 0 ? 1.96 * Math.sqrt((pBlue * (1 - pBlue)) / decided) : 0;
    return { total: battles.length, wins, decided, pBlue, pRed, ci95 };
}

// 分站位統計
const normalDatasets = datasets.filter((d) => !d.summary.swapSides);
const swapDatasets = datasets.filter((d) => d.summary.swapSides);

const normalBattles = normalDatasets.flatMap((d) => d.battles);
const swapBattles = swapDatasets.flatMap((d) => d.battles);
const allBattles = datasets.flatMap((d) => d.battles);

const normalStats = normalBattles.length > 0 ? calcWinStats(normalBattles) : null;
const swapStats = swapBattles.length > 0 ? calcWinStats(swapBattles) : null;
const combinedStats = calcWinStats(allBattles);

// ── 2. 對戰時間分佈 ──
function calcTimePercentiles(battles) {
    if (battles.length === 0) return { p10: 0, p50: 0, p90: 0, mean: 0 };
    const sorted = battles.map((b) => b.time).sort((a, b) => a - b);
    const n = sorted.length;
    const p10 = sorted[Math.floor(0.1 * (n - 1))];
    const p50 = sorted[Math.floor(0.5 * (n - 1))];
    const p90 = sorted[Math.floor(0.9 * (n - 1))];
    const mean = +(sorted.reduce((s, t) => s + t, 0) / n).toFixed(1);
    return { p10, p50, p90, mean };
}
const timeStats = calcTimePercentiles(allBattles);

// ── 3. 傷害歸屬統計 ──
let totalHpLostAll = 0;
let totalAttrAll = 0;
let totalUnattrAll = 0;
let blueHpLostAll = 0;
let redHpLostAll = 0;
let blueSkillDmgAll = 0;
let redSkillDmgAll = 0;

for (const b of allBattles) {
    if (b.hpLoss) {
        totalHpLostAll += b.hpLoss.totalHpLost || 0;
        totalAttrAll += b.hpLoss.attributedDmg || 0;
        totalUnattrAll += b.hpLoss.unattributedDmg || 0;
        blueHpLostAll += b.hpLoss.blueHpLost || 0;
        redHpLostAll += b.hpLoss.redHpLost || 0;
        blueSkillDmgAll += b.hpLoss.blueSkillDmg || 0;
        redSkillDmgAll += b.hpLoss.redSkillDmg || 0;
    }
}
const attrPct = totalHpLostAll > 0 ? +((totalAttrAll / totalHpLostAll) * 100).toFixed(1) : 0;
const unattrPct = totalHpLostAll > 0 ? +((totalUnattrAll / totalHpLostAll) * 100).toFixed(1) : 0;

// ── 4. 各職業每場表現 ──
const roles = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT'];
const roleStats = {
    BLUE: { TANK: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, WARRIOR: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, RANGER: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, MAGE: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, SUPPORT: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 } },
    RED: { TANK: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, WARRIOR: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, RANGER: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, MAGE: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 }, SUPPORT: { dmg: 0, directDmg: 0, dotDmg: 0, heal: 0, kills: 0 } }
};

for (const b of allBattles) {
    for (const u of b.lineup) {
        const team = teamName(u.team);
        const r = u.role;
        if (!roleStats[team] || !roleStats[team][r]) continue;
        for (const sid of u.skills) {
            const sk = b.skills?.[sid];
            if (sk) {
                roleStats[team][r].dmg += sk.dmg || 0;
                roleStats[team][r].directDmg += sk.directDmg || (sk.dmg - (sk.dotDmg || 0));
                roleStats[team][r].dotDmg += sk.dotDmg || 0;
                roleStats[team][r].heal += sk.heal || 0;
                roleStats[team][r].kills += sk.kills || 0;
            }
        }
    }
}

const nBattles = allBattles.length || 1;
const roleSummary = roles.map((r) => {
    const bDmg = Math.round(roleStats.BLUE[r].dmg / nBattles);
    const rDmg = Math.round(roleStats.RED[r].dmg / nBattles);
    const bHeal = Math.round(roleStats.BLUE[r].heal / nBattles);
    const rHeal = Math.round(roleStats.RED[r].heal / nBattles);
    const bDot = Math.round(roleStats.BLUE[r].dotDmg / nBattles);
    const rDot = Math.round(roleStats.RED[r].dotDmg / nBattles);
    const dmgDiffPct = bDmg > 0 ? +(((rDmg - bDmg) / bDmg) * 100).toFixed(1) : 0;
    const healDiffPct = bHeal > 0 ? +(((rHeal - bHeal) / bHeal) * 100).toFixed(1) : 0;
    return {
        role: r,
        bDmg, rDmg, dmgDiffPct,
        bHeal, rHeal, healDiffPct,
        bDot, rDot
    };
});

// ── 5. 技能統計表 ──
const combinedSkills = {};
for (const d of datasets) {
    for (const [id, s] of Object.entries(d.skills)) {
        const meta = globalSkillMeta[id];
        const a = (combinedSkills[id] ??= {
            id,
            name: meta?.name || s.name || id,
            team: meta?.team || s.team || '',
            role: meta?.role || s.role || '',
            tag: meta?.tag || s.tag || '',
            picks: 0,
            wins: 0,
            casts: 0,
            dmg: 0,
            directDmg: 0,
            dotDmg: 0,
            heal: 0,
            hits: 0,
            kills: 0,
            reflected: 0
        });
        a.picks += s.picks || 0;
        a.wins += s.wins || 0;
        a.casts += s.casts || 0;
        a.dmg += s.dmg || 0;
        a.directDmg += s.directDmg || 0;
        a.dotDmg += s.dotDmg || 0;
        a.heal += s.heal || 0;
        a.hits += s.hits || 0;
        a.kills += s.kills || 0;
        a.reflected += s.reflected || 0;
        if (a.name === id && meta?.name) a.name = meta.name;
        if (!a.team && meta?.team) a.team = meta.team;
        if (!a.role && meta?.role) a.role = meta.role;
        if (!a.tag && meta?.tag) a.tag = meta.tag;
    }
}

// 計算勝率差與每場數據
const blueOverallWinRate = combinedStats.pBlue;
const redOverallWinRate = combinedStats.pRed;

const skillList = Object.values(combinedSkills).map((s) => {
    const isBlue = s.team === 'BLUE' || s.id.startsWith('t') && s.id[1] === 'b' || s.id.startsWith('w') && s.id[1] === 'b' || s.id.startsWith('r') && s.id[1] === 'b' || s.id.startsWith('m') && s.id[1] === 'b' || s.id.startsWith('s') && s.id[1] === 'b';
    const faction = isBlue ? 'BLUE' : 'RED';
    const factionWR = isBlue ? blueOverallWinRate : redOverallWinRate;
    const wr = s.picks > 0 ? s.wins / s.picks : 0;
    const diff = +(wr - factionWR).toFixed(3);
    const castsPerPick = s.picks > 0 ? +(s.casts / s.picks).toFixed(2) : 0;
    const dmgPerPick = s.picks > 0 ? Math.round(s.dmg / s.picks) : 0;
    const dmgPerCast = s.casts > 0 ? Math.round(s.dmg / s.casts) : 0;
    const healPerPick = s.picks > 0 ? Math.round(s.heal / s.picks) : 0;
    const dotPerPick = s.picks > 0 ? Math.round(s.dotDmg / s.picks) : 0;
    const reflectedPerPick = s.picks > 0 ? Math.round(s.reflected / s.picks) : 0;
    return {
        ...s,
        faction,
        wr: +(wr * 100).toFixed(1),
        diff,
        castsPerPick,
        dmgPerPick,
        dmgPerCast,
        healPerPick,
        dotPerPick,
        reflectedPerPick
    };
});

// 以勝率差排序（大到小）
skillList.sort((a, b) => b.diff - a.diff);

// ── 6. 驗收目標檢驗 ──
const goalWinRateNormal = normalStats ? (normalStats.pBlue >= 0.46 && normalStats.pBlue <= 0.54) : null;
const goalWinRateSwap = swapStats ? (swapStats.pBlue >= 0.46 && swapStats.pBlue <= 0.54) : null;
const goalWinRateCombined = combinedStats.pBlue >= 0.47 && combinedStats.pBlue <= 0.53;
const goalTime = timeStats.p50 >= 12 && timeStats.p50 <= 22;

const outliersSkill = skillList.filter((s) => s.picks >= 300 && Math.abs(s.diff) > 0.08);
const goalSkills = outliersSkill.length === 0;

const roleGaps = roleSummary.map((r) => {
    const val = r.role === 'SUPPORT' ? Math.abs(r.healDiffPct) : Math.abs(r.dmgDiffPct);
    return { role: r.role, gap: val, pass: val <= 25 };
});
const goalRoles = roleGaps.every((r) => r.pass);

// ── 7. 產出 Markdown ──
let md = `# 技能平衡量測報告\n\n`;
md += `> 來源資料：${filePaths.map((f) => `\`${f}\``).join(', ')}  \n`;
md += `> 總對戰場次：**${allBattles.length}**（一般站位：${normalBattles.length}，交換站位：${swapBattles.length}）\n\n`;

md += `## 1. 驗收目標檢查\n\n`;
md += `| 驗收項目 | 目標門檻 | 當前數值 | 判定 |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
md += `| **一般站位藍方勝率** | 46% ～ 54% | ${normalStats ? `${(normalStats.pBlue * 100).toFixed(1)}% (±${(normalStats.ci95 * 100).toFixed(1)}%)` : 'N/A'} | ${goalWinRateNormal === null ? '—' : goalWinRateNormal ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **交換站位藍方勝率** | 46% ～ 54% | ${swapStats ? `${(swapStats.pBlue * 100).toFixed(1)}% (±${(swapStats.ci95 * 100).toFixed(1)}%)` : 'N/A'} | ${goalWinRateSwap === null ? '—' : goalWinRateSwap ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **合併藍方勝率** | 47% ～ 53% | ${(combinedStats.pBlue * 100).toFixed(1)}% (±${(combinedStats.ci95 * 100).toFixed(1)}%) | ${goalWinRateCombined ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **對戰時間中位數 (p50)** | 12s ～ 22s | **${timeStats.p50}s** (p10: ${timeStats.p10}s, p90: ${timeStats.p90}s) | ${goalTime ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **高頻技能勝率差** | picks ≥ 300 差值在 ±0.08 內 | 超標數：**${outliersSkill.length}** 筆 | ${goalSkills ? '✅ PASS' : '❌ FAIL'} |\n`;
md += `| **職業紅藍差距** | 同職業紅藍差距 ≤ ±25% | 最大差距：${Math.max(...roleGaps.map(g => g.gap)).toFixed(1)}% | ${goalRoles ? '✅ PASS' : '❌ FAIL'} |\n\n`;

md += `## 2. 陣營勝率與對戰時間\n\n`;
md += `| 站位條件 | 總場次 | 判定場次 | 藍方勝場 (勝率) | 紅方勝場 (勝率) | 95% 信賴區間 | 平手 / 逾時 |\n`;
md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
if (normalStats) {
    md += `| **一般站位 (藍左紅右)** | ${normalStats.total} | ${normalStats.decided} | ${normalStats.wins.BLUE} (${(normalStats.pBlue * 100).toFixed(1)}%) | ${normalStats.wins.RED} (${(normalStats.pRed * 100).toFixed(1)}%) | ±${(normalStats.ci95 * 100).toFixed(1)}% | ${normalStats.wins.DRAW || 0} / ${normalStats.wins.TIMEOUT || 0} |\n`;
}
if (swapStats) {
    md += `| **交換站位 (藍右紅左)** | ${swapStats.total} | ${swapStats.decided} | ${swapStats.wins.BLUE} (${(swapStats.pBlue * 100).toFixed(1)}%) | ${swapStats.wins.RED} (${(swapStats.pRed * 100).toFixed(1)}%) | ±${(swapStats.ci95 * 100).toFixed(1)}% | ${swapStats.wins.DRAW || 0} / ${swapStats.wins.TIMEOUT || 0} |\n`;
}
md += `| **合併 (Combined)** | ${combinedStats.total} | ${combinedStats.decided} | ${combinedStats.wins.BLUE} (${(combinedStats.pBlue * 100).toFixed(1)}%) | ${combinedStats.wins.RED} (${(combinedStats.pRed * 100).toFixed(1)}%) | ±${(combinedStats.ci95 * 100).toFixed(1)}% | ${combinedStats.wins.DRAW || 0} / ${combinedStats.wins.TIMEOUT || 0} |\n\n`;

md += `### 對戰時間分佈\n`;
md += `- **p10**：${timeStats.p10}s\n`;
md += `- **p50 (中位數)**：${timeStats.p50}s\n`;
md += `- **p90**：${timeStats.p90}s\n`;
md += `- **平均時長**：${timeStats.mean}s\n\n`;

md += `## 3. 傷害來源與歸屬比例\n\n`;
md += `| 項目 | 數值 (總量) | 每場平均 | 佔比 |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
md += `| **全場總失血 (所有來源)** | ${totalHpLostAll.toLocaleString()} | ${Math.round(totalHpLostAll / nBattles).toLocaleString()} | 100% |\n`;
md += `| **已歸屬傷害 (技能直傷＋DOT)** | ${totalAttrAll.toLocaleString()} | ${Math.round(totalAttrAll / nBattles).toLocaleString()} | **${attrPct}%** |\n`;
md += `| └ 藍方技能總傷害 (直接+DOT) | ${blueSkillDmgAll.toLocaleString()} | ${Math.round(blueSkillDmgAll / nBattles).toLocaleString()} | ${totalHpLostAll > 0 ? ((blueSkillDmgAll / totalHpLostAll) * 100).toFixed(1) : 0}% |\n`;
md += `| └ 紅方技能總傷害 (直接+DOT) | ${redSkillDmgAll.toLocaleString()} | ${Math.round(redSkillDmgAll / nBattles).toLocaleString()} | ${totalHpLostAll > 0 ? ((redSkillDmgAll / totalHpLostAll) * 100).toFixed(1) : 0}% |\n`;
md += `| **未歸屬傷害 (危害／縮圈墜落／反傷等)** | ${totalUnattrAll.toLocaleString()} | ${Math.round(totalUnattrAll / nBattles).toLocaleString()} | **${unattrPct}%** |\n\n`;

md += `## 4. 各職業每場表現 (藍 vs 紅)\n\n`;
md += `| 職業 | 藍方每場傷害 | 紅方每場傷害 | 傷害差距 (紅−藍)/藍 | 藍方每場DOT | 紅方每場DOT | 藍方每場治療 | 紅方每場治療 | 治療差距 |\n`;
md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
for (const r of roleSummary) {
    const dmgSign = r.dmgDiffPct >= 0 ? '+' : '';
    const healSign = r.healDiffPct >= 0 ? '+' : '';
    md += `| **${r.role}** | ${r.bDmg} | ${r.rDmg} | ${dmgSign}${r.dmgDiffPct}% | ${r.bDot} | ${r.rDot} | ${r.bHeal} | ${r.rHeal} | ${healSign}${r.healDiffPct}% |\n`;
}
md += `\n`;

md += `## 5. 技能表現總表 (按勝率差排序)\n\n`;
md += `> 勝率差＝該技能被抽到時所屬陣營勝率 − 該陣營整體勝率（藍方基準：${(blueOverallWinRate * 100).toFixed(1)}%，紅方基準：${(redOverallWinRate * 100).toFixed(1)}%）\n\n`;
md += `| 技能 ID | 技能名稱 | 陣營 | 職業 | 標籤 | Picks | 抽中勝率 | 勝率差 | 每場施放 | 每場傷害 | 每次施放傷 | 每場DOT | 每場治療 | 每場反傷 |\n`;
md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
for (const s of skillList) {
    const diffSign = s.diff >= 0 ? '+' : '';
    md += `| \`${s.id}\` | ${s.name} | ${s.faction} | ${s.role} | ${s.tag} | ${s.picks} | ${s.wr}% | **${diffSign}${s.diff}** | ${s.castsPerPick} | ${s.dmgPerPick} | ${s.dmgPerCast} | ${s.dotPerPick} | ${s.healPerPick} | ${s.reflectedPerPick} |\n`;
}
md += `\n`;

if (outliersSkill.length > 0) {
    md += `### 偏離超標技能清單 (Picks ≥ 300 且 |勝率差| > 0.08)\n\n`;
    md += `| 技能 ID | 技能名稱 | 陣營 | 職業 | Picks | 勝率差 | 偏離方向 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const s of outliersSkill) {
        md += `| \`${s.id}\` | ${s.name} | ${s.faction} | ${s.role} | ${s.picks} | **${s.diff >= 0 ? '+' : ''}${s.diff}** | ${s.diff > 0 ? '過強 (Overperforming)' : '過弱 (Underperforming)'} |\n`;
    }
    md += `\n`;
}

if (OUT_PATH) {
    writeFileSync(OUT_PATH, md, 'utf8');
    console.log(`Report generated: ${OUT_PATH}`);
} else {
    process.stdout.write(md);
}
