/**
 * A0 inventory and evidence export. Fixed Git mother table, scoped observations.
 * Required: --probe-json <complete output>. Optional: --out-dir <folder>.
 * Reject invalid evidence before writes; never infer semantic header compliance.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const motherSha = 'e92b635248fae2c6f42cd53946fe3aa59372d73a';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const hash = value => createHash('sha256').update(value).digest('hex');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const required = ['F01_A_normal_completion', 'F01_B_stun_interruption',
    'F01_C1_state_injected_death_run1', 'F01_C1_state_injected_death_run2',
    'F01_C2_controlled_lethal_damage_run1', 'F01_C2_controlled_lethal_damage_run2',
    'F01_E1_ai_rebuild_during_cast', 'F01_E2_game_reset_during_cast', 'F01_D_projectile_in_flight',
    'F02_AOE_ground_locked', 'F02_SINGLE_target_locked', 'F03_API_boundary_inputs', 'F03_UI_inspector_interaction'];
function options() {
    const result = { '--out-dir': 'docs' };
    for (let i = 2; i < process.argv.length; i += 2) {
        const key = process.argv[i], value = process.argv[i + 1];
        assert(['--out-dir', '--probe-json'].includes(key) && value && !value.startsWith('--'), `Invalid argument: ${key}`);
        result[key] = value;
    }
    assert(result['--probe-json'], 'Explicit --probe-json is required');
    return result;
}
function parseCsv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
        } else if (!quoted && (c === ',' || c === '\n')) {
            row.push(cell.replace(/\r$/, '')); cell = '';
            if (c === '\n') { rows.push(row); row = []; }
        } else cell += c;
    }
    assert(!quoted, 'Unclosed CSV quote');
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    const headers = rows.shift();
    return { headers, rows: rows.filter(r => r.some(Boolean)).map(r => {
        assert(r.length === headers.length, 'CSV column mismatch');
        return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    }) };
}
const csv = (headers, rows) => '\uFEFF' + [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))]
    .map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
const group = (rows, field) => rows.reduce((counts, row) => { counts[row[field]] = (counts[row[field]] || 0) + 1; return counts; }, {});
function validateProbe(p) {
    assert(p && typeof p === 'object' && !p.error, 'Invalid probe envelope');
    for (const field of ['errors', 'pageErrors', 'consoleErrors']) assert(Array.isArray(p[field]) && p[field].length === 0, `Probe ${field} missing or nonempty`);
    assert(/^[a-f0-9]{40}$/.test(p.metadata?.gitHead || '') && p.metadata?.timestamp, 'Missing probe provenance');
    assert(/^[a-f0-9]{64}$/.test(p.metadata?.sourceSha256 || ''), 'Missing probe source hash; rerun current probe');
    assert(p.scenarios && Object.keys(p.scenarios).length === required.length, 'Incorrect scenario set');
    const counts = { OBSERVED: 0, NOT_REPRODUCED: 0 };
    for (const key of required) {
        const scenario = p.scenarios[key];
        assert(scenario && Object.hasOwn(counts, scenario.status) && !scenario.error, `Invalid/incomplete scenario: ${key}`);
        const d = scenario.data;
        assert(d && typeof d === 'object' && Object.keys(d).length > 0, `Missing measurements: ${key}`);
        const numericFields = key.startsWith('F01_C') ? ['queueAtDeath', 'actionsDispatchedAfterDeath', 'damageDealt']
            : key.startsWith('F01_E') ? ['queueBeforeReset', 'queueAfterReset']
            : key === 'F01_B_stun_interruption' ? ['queueSizeBeforeStun', 'queueSizeAfterStun', 'damageDealt']
            : key === 'F01_D_projectile_in_flight' ? ['projectilesSpawned', 'damageDealt', 'targetHpBefore', 'targetHpAfter']
            : key === 'F01_A_normal_completion' ? ['damageDealt', 'targetHpBefore', 'targetHpAfter', 'castDur']
            : key === 'F02_AOE_ground_locked' ? ['target1Damage', 'target2Damage']
            : key === 'F02_SINGLE_target_locked' ? ['damageDealt'] : [];
        for (const field of numericFields) assert(Number.isFinite(d[field]), `Missing numeric measurement ${key}.${field}`);
        if (!key.startsWith('F03_')) assert(typeof d.skillId === 'string', `Missing skill ID: ${key}`);
        for (const field of Object.keys(d).filter(f => /^(damageDealt|queueAtDeath|actionsDispatchedAfterDeath|target[12]Damage|queueBeforeReset|queueAfterReset|projectilesSpawned)$/.test(f))) assert(Number.isFinite(d[field]), `Invalid measurement ${key}.${field}`);
        if (key.startsWith('F01_C')) assert(typeof d.casterDead === 'boolean' && Number.isFinite(d.actionsDispatchedAfterDeath), `Missing death measurement: ${key}`);
        if (key === 'F02_SINGLE_target_locked') assert(d.dispatchObservation?.passedTarget && Number.isFinite(d.dispatchObservation?.diffX), 'Missing dispatch measurement');
        if (key === 'F03_API_boundary_inputs') assert(d.restoredCorrectly === true && Array.isArray(d.testedCases) && d.testedCases.length === 9 && d.testedCases.every(test => typeof test.field === 'string' && typeof test.valueKind === 'string' && typeof test.accepted === 'boolean'), 'Incomplete API test or failed restoration');
        if (key === 'F03_UI_inspector_interaction') assert(d.uiRestoreWorks === true && d.restoredInFinally === true && d.controlsChecked?.rangeInput?.visible, 'Incomplete UI test or failed restoration');
        counts[scenario.status]++;
    }
    const s = p.summary;
    assert(s?.toolExecutionStatus === 'SUCCESS' && s.totalScenarios === required.length && s.completedScenarios === required.length && s.errorScenarios === 0 && s.notRunScenarios === 0 && s.observedScenarios === counts.OBSERVED && s.notReproducedScenarios === counts.NOT_REPRODUCED, 'Summary disagrees with scenarios');
    return counts;
}
function logEvidence(path, successMarker) {
    if (!existsSync(join(root, path))) return { status: 'SOURCE_UNAVAILABLE', log: path, mode: 'historical_not_rerun' };
    const content = readFileSync(join(root, path), 'utf8');
    const exits = [...content.matchAll(/(?:^|\n)EXIT=(\d+)/g)];
    const exitCode = exits.length ? Number(exits.at(-1)[1]) : null;
    return { status: exitCode === 0 && successMarker.test(content) ? 'PASS_RECORDED' : exitCode !== null && exitCode !== 0 ? 'FAIL_RECORDED' : 'UNCONFIRMED',
        mode: 'historical_not_rerun', log: path, exitCode, sha256: hash(content),
        excerpts: content.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).filter(line => /meanAbsDiff=|violations\(feet|over-void samples|FLICKER total|ASSERTION|ALL PASSED|style-snapshot|Test Files|Tests\s|built in|PASS: runtime/.test(line)) };
}
function main() {
    const args = options(), outDir = resolve(root, args['--out-dir']), probePath = resolve(root, args['--probe-json']);
    const rawProbe = readFileSync(probePath, 'utf8'), probe = JSON.parse(rawProbe);
    const scenarioCounts = validateProbe(probe);
    const tracked = git('ls-tree', '-r', '--name-only', '-z', motherSha).split('\0').filter(Boolean);
    const untracked = git('ls-files', '--others', '--exclude-standard', '--directory', '--no-empty-directory', '-z').split('\0').filter(Boolean);
    const data = key => probe.scenarios[key].data;
    const deathKeys = required.filter(k => k.startsWith('F01_C'));
    const f01 = deathKeys.every(k => { const d = data(k); return d.casterDead && !d.hadCastBreak && d.actionsDispatchedAfterDeath > 0 && d.damageDealt === 0; });
    const f02 = data('F02_SINGLE_target_locked').visualRemainedAtCastStartPos === true && data('F02_SINGLE_target_locked').simDamagedTargetAtNewPosition === true;
    const f03 = data('F03_API_boundary_inputs').summary?.negativeNumbersAccepted === true && data('F03_UI_inspector_interaction').uiNegativeAccepted === true;
    // Preserve established IDs and unresolved items. Static entries are historical,
    // scoped observations; they do not authorize deletion or certify entire files.
    const ledger = parseCsv(git('show', `${motherSha}:docs/PROJECT_CLEANUP_A0_FINDINGS.csv`));
    const byId = Object.fromEntries(ledger.rows.map(row => [row.ID, row]));
    const update = (id, patch) => { assert(byId[id], `Unknown issue: ${id}`); Object.assign(byId[id], patch); };
    update('F01', { 狀態: f01 ? '已重現（受控致死）' : '本次未重現；保留歷史記錄',
        影響: '施法者死亡後未派發的演出是否繼續，依各情境量測判讀。', 證據: `probe.scenarios: ${deathKeys.join(', ')}`,
        依賴鏈: 'CombatSystem → CastingEngine → engine.events → VisualSystem.flush → SequenceSystem.cancel',
        建議最小修改: '另輪設計死亡中斷事件；保留已結算餘波與空中投射物。',
        '預期／實際': JSON.stringify(deathKeys.map(k => ({ case: k, ...data(k) }))),
        驗證方案: 'F01 死亡前未命中序列不再派發，正常完成／重置／投射物對照仍成立。' });
    update('F02', { 狀態: f02 ? '已觀測座標不一致；修法待設計' : '本次未重現；保留歷史記錄',
        證據: 'probe.scenarios.F02_SINGLE_target_locked.data.dispatchObservations / vfxEffectCalls',
        影響: 'SINGLE 數值受體與序列目標點的差異見實際 dispatch；不推論所有技能。',
        '預期／實際': JSON.stringify(data('F02_SINGLE_target_locked').dispatchObservation),
        建議最小修改: '依技能鎖人／鎖地語義另輪設計，不在清冊工具修改產品。' });
    update('F03', { 狀態: f03 ? 'API 與 UI 邊界觀測已重現' : '本次未重現；保留歷史記錄',
        影響: 'API 接受值、UI 負數與清空回彈分開記錄；未觀測戰鬥卡死或無限施法。',
        證據: 'probe.scenarios.F03_API_boundary_inputs / F03_UI_inspector_interaction',
        '預期／實際': JSON.stringify(data('F03_UI_inspector_interaction').uiClearBehavior),
        建議最小修改: '依欄位制定型別／範圍與空值草稿規則，保留負 power 治療語義。', 驗證方案: 'API 與實際 UI 編輯／失焦／還原分別驗證。' });
    update('H01', { 證據: 'engine/core/Effects.ts:3 與 EFFECT_KINDS；保留先前核對的數量事實。' });
    update('H02', { 影響: '過期 TODO 將死亡位移描述為尚待加入物理；UnitDeathPainter 實際讀快照並推導位移。', 證據: 'engine/systems/agentManager.ts:165；engine/renderers/units/painters/UnitDeathPainter.ts' });
    update('C01', { P: 'P3', 狀態: '靜態未使用候選；刪除前重查', 證據: 'git grep -n -w FACTION_BEAM_RAMP -- engine data tests tools（排除本稽核工具描述）', 建議最小修改: '刪除前核對動態入口與消費者。' });
    update('C02', { 狀態: '產品未引用候選；有測試及兩個工具消費者', 證據: 'tests/GlowSpriteCache.test.ts；tools/ui-e2e/perf-r1-attribution.mjs；tools/ui-e2e/lib/lifecycle-probe.mjs', 建議最小修改: '核對測試／工具／常數鏈後另輪退役，不單獨刪模組。' });
    update('C03', { 狀態: '廢棄設定候選；相容性待查', 驗證方案: '明確授權必要快照變更後驗證，保真門檻不放寬。' });
    update('C04', { 狀態: '待逐符號查證的匯出候選', 影響: 'createEffectSlot、getJumpLimit、FactionTextureStore 類別等仍有檔內使用；不得刪實作。', 證據: '先前 knip 診斷；逐符號外部／動態引用尚未補齊。', 建議最小修改: '證明 export 無消費者後才移除 export，保留實體與 singleton。' });
    update('C05', { 狀態: '待逐型別查證候選', 證據: '先前 knip 診斷；尚未完成逐型別引用台帳。' });
    update('K01', { 驗證方案: 'smoke／UI 有歷史通過；coords 有獨立失敗診斷，不稱全數通過。' });
    update('K02', { 狀態: '靜態確認 optional import；降級實跑範圍待查', 證據: 'tools/vfx/fx-shot.mjs:151；本輪未驗證預覽降級。' });
    const links = {
        'engine/systems/combat/CastingEngine.ts': ['F01'], 'engine/presentation/VisualSystem.ts': ['F01', 'F02'],
        'engine/presentation/visuals/SequenceSystem.ts': ['F01', 'F02'], 'engine/systems/ui/UICommandSystem.ts': ['F03'],
        'components/inspector/tabs/SkillDbTab.tsx': ['F03'], 'engine/core/Effects.ts': ['H01', 'C04'],
        'engine/systems/agentManager.ts': ['H02'], 'docs/DECISIONS.md': ['H03'], 'docs/VISUAL_ROADMAP.md': ['H04'],
        'docs/VFX_PIPELINE_MAP.md': ['H04'], 'docs/HANDOFF.md': ['H04'], 'docs/ART_SPEC.md': ['H05'],
        'data/vfx/beam_styles.ts': ['C01'], 'engine/renderers/GlowSpriteCache.ts': ['C02'], 'constants/terrain.ts': ['C03'],
        'engine/math/ClimbRule.ts': ['C04'], 'engine/renderers/units/FactionTextureStore.ts': ['C04'],
        'tools/ui-e2e/coord-guard.mjs': ['COORD01'], 'tests/DocDrift.test.ts': ['T01'], 'tools/vfx/fx-shot.mjs': ['K02'],
    };
    const confirmed = new Set(['H01', 'H02', 'H03', 'T01']);
    if (f01) confirmed.add('F01'); if (f02) confirmed.add('F02'); if (f03) confirmed.add('F03');
    const inventory = tracked.map(path => {
        const ids = links[path] || [], facts = ids.map(id => byId[id]);
        const na = ['.png', '.webp', '.jpg', '.jpeg', '.ogg', '.mp3', '.json', '.md', '.html', '.css'].includes(extname(path));
        return { path, zone: path.includes('/') ? path.split('/')[0] : 'root', category: path === 'types.ts' ? 'types' : path.startsWith('public/assets/') ? 'publicAssets' : path.includes('/') ? path.split('/')[0] : 'rootConfig',
            consumers: '待查', staticRefs: '待查', dynamicEntry: '待查', headerStatus: path === 'engine/core/Effects.ts' ? '待修正（H01）' : na ? '不適用（僅檔頭維度）' : '待查',
            funcObserved: ids.filter(id => /^F0/.test(id)).join('; ') || '待查', verifyStatus: ids.some(id => confirmed.has(id)) ? '已確認該事實' : '僅列舉／待查',
            unverifiedReason: '僅列具體事實／候選；整檔職責、依賴與功能未全面查證。',
            evidenceSource: facts.map(f => `${f.ID}: ${f.證據}`).join('; ') || `git ls-tree ${motherSha}`,
            specificIssue: ids.join('; ') || '未查，不等於無問題', suggestedAction: '保留；依分區計畫補查' };
    });
    for (const path of untracked) inventory.push({ path, zone: 'untracked', category: 'untracked', consumers: '待查', staticRefs: '待查', dynamicEntry: '待查', headerStatus: '待查', funcObserved: '未查', verifyStatus: '僅列舉／待查', unverifiedReason: '使用者未追蹤工作，不提交或刪除。', evidenceSource: 'git ls-files --others --exclude-standard --directory -z', specificIssue: '未查', suggestedAction: '保持未追蹤' });
    assert(new Set(inventory.map(r => r.path)).size === inventory.length, 'Duplicate inventory paths');
    const coverage = { totalRows: inventory.length, trackedFilesCount: tracked.length, untrackedFilesCount: untracked.length, verificationStatusCounts: group(inventory, 'verifyStatus'), headerStatusCounts: group(inventory, 'headerStatus'), categoryCounts: group(inventory, 'category') };
    for (const counts of [coverage.verificationStatusCounts, coverage.headerStatusCounts, coverage.categoryCounts]) assert(Object.values(counts).reduce((a, b) => a + b, 0) === inventory.length, 'Inventory count mismatch');
    const verificationLogs = {
        smoke: logEvidence('tools/ui-e2e/out/agent-logs/a0-smoke.log', /PASS: runtime smoke/), ui: logEvidence('tools/ui-e2e/out/agent-logs/a0-ui.log', /ALL PASSED/),
        fidelity: logEvidence('tools/ui-e2e/out/agent-logs/status-guard-native-1024.log', /ALL FIDELITY CHECKS PASSED/), coords: logEvidence('tools/ui-e2e/out/agent-logs/a0r1-coords.log', /ASSERTION PASSED/),
        lint: logEvidence('tools/ui-e2e/out/agent-logs/review-a0r2-lint.log', /tsc --noEmit/), tests: logEvidence('tools/ui-e2e/out/agent-logs/review-a0r2-test.log', /Tests/), build: logEvidence('tools/ui-e2e/out/agent-logs/review-a0r2-build.log', /built in/),
        inputGuards: logEvidence('tools/ui-e2e/out/agent-logs/review-a0r2-guards.log', /overwritePreserved.*true/),
        faultInjection: logEvidence('tools/ui-e2e/out/agent-logs/review-a0r2-faults.log', /nonempty-FAILURE-enum/),
    };
    const evidence = { metadata: { task: 'PROJECT_CLEANUP_A0_R2_REVIEW_FIX', motherCommit: motherSha, generatedAt: new Date().toISOString(), generatorHead: git('rev-parse', 'HEAD').trim(), generatorSourceSha256: hash(readFileSync(new URL(import.meta.url))), generatorWorkingTreeStatus: git('status', '--porcelain', '--', 'tools/audit/cleanup-a0-inventory.mjs').trim(), probeSource: relative(root, probePath).replaceAll('\\', '/'), probeSha256: hash(rawProbe), probeMetadata: probe.metadata }, inventoryCoverage: coverage, verificationLogs,
        probeFindings: { scenarioCounts, scenarios: probe.scenarios, toolSummary: probe.summary }, reviewClassification: { F01: f01 ? 'OBSERVED_DEFECT' : 'NOT_REPRODUCED', F02: f02 ? 'OBSERVED_COORDINATE_MISMATCH' : 'NOT_REPRODUCED', F03: f03 ? 'OBSERVED_BOUNDARY_BEHAVIOR' : 'NOT_REPRODUCED', COORD01: 'HISTORICAL_DIAGNOSTIC_ANOMALY_PENDING_VISUAL_REVIEW' } };
    const outputs = new Map([['PROJECT_CLEANUP_A0_INVENTORY.csv', csv(Object.keys(inventory[0]), inventory)], ['PROJECT_CLEANUP_A0_FINDINGS.csv', csv(ledger.headers, ledger.rows)], ['PROJECT_CLEANUP_A0_EVIDENCE.json', JSON.stringify(evidence, null, 2) + '\n']]);
    // No writes until validation/calculation completes. Stage files and roll back a failed replacement.
    mkdirSync(outDir, { recursive: true });
    const originals = new Map(), staged = [];
    try {
        for (const [name, content] of outputs) {
            const path = join(outDir, name), temp = `${path}.${process.pid}.tmp`;
            originals.set(path, existsSync(path) ? readFileSync(path) : null);
            staged.push([temp, path]); writeFileSync(temp, content, 'utf8');
        }
        for (const [temp, path] of staged) renameSync(temp, path);
    } catch (err) {
        for (const [path, original] of originals) { if (original !== null) writeFileSync(path, original); else if (existsSync(path)) unlinkSync(path); }
        throw err;
    } finally { for (const [temp] of staged) if (existsSync(temp)) unlinkSync(temp); }
    console.log(JSON.stringify({ output: outDir, coverage, findings: ledger.rows.length }));
}
try { main(); } catch (err) { console.error(`[Inventory] ${err.message}`); process.exitCode = 1; }
