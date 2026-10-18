/**
 * vfx-coverage-report — 讀 vfx-coverage.mjs 的輸出，印出覆蓋率矩陣（markdown）。
 *   node tools/vfx/vfx-coverage-report.mjs [path=tools/ui-e2e/out/vfx/coverage.json]
 * 來源標記：fx:<登記鍵>、beam:<光束樣式>、direct（不經登記表直接生成的粒子）。
 * 後端：PART（新零件材質）、PROC（ProceduralPainter）、GROUND（GroundPainter）、BILL（BillboardPainter）。
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const path = process.argv[2] ?? join(root, 'tools', 'ui-e2e', 'out', 'vfx', 'coverage.json');
const { data, castLog } = JSON.parse(readFileSync(path, 'utf8'));

// 每個技能標籤都會帶到的背景：出場、待機、天氣
const NOISE = /^(fx:FX_SPAWN_|fx:FX_IDLE_|direct\|BILL:ATMOSPHERE)/;
const parse = (k) => { const [src, rest] = k.split('|'); const [be, type] = rest.split(':'); return { src, be, type }; };

const sourcesOf = (bucket) => {
    const m = new Map(); // src -> Map(be -> Set(type))
    for (const [k, n] of Object.entries(bucket?.particles ?? {})) {
        if (NOISE.test(k)) continue;
        const { src, be, type } = parse(k);
        if (!m.has(src)) m.set(src, new Map());
        const bm = m.get(src);
        if (!bm.has(be)) bm.set(be, new Map());
        bm.get(be).set(type, (bm.get(be).get(type) || 0) + n);
    }
    return m;
};
const legacyOf = (srcMap) => [...srcMap].filter(([, bm]) => [...bm.keys()].some((be) => be !== 'PART'));
const fmtSrc = ([src, bm]) => `${src}(${[...bm].filter(([be]) => be !== 'PART').map(([be, t]) => `${be}:${[...t.keys()].join('/')}`).join(',')})`;

const skills = Object.keys(data).filter((k) => !['BOOT', 'SETUP', 'BATTLE'].includes(k));
const tagOf = (id) => (/_u\d/.test(id) ? 'ULT' : /_a\d/.test(id) ? 'ACTIVE' : 'BASIC');
const rows = { BASIC: [], ACTIVE: [], ULT: [] };
const legacyFreq = new Map();
for (const id of skills) {
    const sm = sourcesOf(data[id]);
    const leg = legacyOf(sm);
    for (const s of leg) legacyFreq.set(fmtSrc(s), [...(legacyFreq.get(fmtSrc(s)) || []), id]);
    rows[tagOf(id)].push({ id, total: sm.size, leg, partOnly: leg.length === 0 && sm.size > 0, empty: sm.size === 0, proj: !!data[id].painters['ProjectileDrawer.draw'] || Object.keys(data[id].painters).some((p) => p.startsWith('ProjectileDrawer')) });
}

console.log(`# 執行期覆蓋率（${skills.length} 技能）\n`);
console.log('| 類別 | 技能數 | 只用零件 | 含舊後端 | 沒有任何粒子（只有投射物／光束以外的直接繪製） |');
console.log('| :-- | --: | --: | --: | --: |');
for (const [tag, list] of Object.entries(rows)) {
    console.log(`| ${tag} | ${list.length} | ${list.filter((r) => r.partOnly).length} | ${list.filter((r) => r.leg.length).length} | ${list.filter((r) => r.empty).length} |`);
}
console.log('\n## 舊後端來源 × 技能數\n');
console.log('| 來源（舊後端:類型） | 技能數 | 例 |');
console.log('| :-- | --: | :-- |');
for (const [src, ids] of [...legacyFreq].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`| ${src} | ${ids.length} | ${ids.slice(0, 6).join(' ')}${ids.length > 6 ? ' …' : ''} |`);
}
const empties = Object.values(rows).flat().filter((r) => r.empty).map((r) => r.id);
if (empties.length) console.log(`\n沒有任何技能粒子：${empties.join(' ')}`);
const failed = Object.entries(castLog).filter(([, v]) => v !== 'R' && v !== 'S').map(([k, v]) => `${k}:${v}`);
if (failed.length) console.log(`\n施放未成功：${failed.join(' ')}`);

const battle = data.BATTLE;
if (battle) {
    console.log('\n## 實戰（BATTLE）來源 → 後端\n');
    console.log('| 來源 | 後端:類型（顆數） |');
    console.log('| :-- | :-- |');
    const sm = sourcesOf(battle);
    const rowsB = [...sm].map(([src, bm]) => [src, [...bm].map(([be, t]) => `${be}:${[...t].map(([ty, n]) => `${ty}×${n}`).join('/')}`).join(', '), [...bm.keys()].every((be) => be === 'PART')]);
    for (const [src, desc, part] of rowsB.sort((a, b) => Number(a[2]) - Number(b[2]))) console.log(`| ${part ? '' : '**'}${src}${part ? '' : '**'} | ${desc} |`);
    console.log('\n## 直接繪製器（不經粒子）在實戰中的呼叫次數\n');
    for (const [k, n] of Object.entries(battle.painters).sort((a, b) => b[1] - a[1])) console.log(`- ${k}: ${n}`);
}
