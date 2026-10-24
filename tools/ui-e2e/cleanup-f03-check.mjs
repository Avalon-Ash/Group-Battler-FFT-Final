/**
 * tools/ui-e2e/cleanup-f03-check.mjs
 *
 * F03 Focused API + DOM Probe for Skill Editor Validation and Input Drafts
 * Supports --phase=before and --phase=after
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const outDir = join(root, 'tools', 'ui-e2e', 'out');
mkdirSync(outDir, { recursive: true });

// Parse arguments
let phase = 'before';
const phaseArg = process.argv.find(a => a.startsWith('--phase='));
if (phaseArg) {
    phase = phaseArg.split('=')[1];
}

let outFileName = `f03-${phase}.json`;
const outArg = process.argv.find(a => a.startsWith('--out='));
if (outArg) {
    outFileName = outArg.split('=')[1];
}

let gitHead = 'unknown';
try {
    gitHead = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf-8' }).trim();
} catch {
    gitHead = 'unknown';
}

const toolSource = readFileSync(fileURLToPath(import.meta.url), 'utf-8');
const toolSha256 = createHash('sha256').update(toolSource).digest('hex');

const results = {
    metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        gitHead,
        toolSha256,
        command: process.argv.join(' '),
        phase,
        faviconFixture: 'GET /favicon.ico returns 204 in this harness only',
    },
    apiCases: [],
    uiCases: {},
    smokeBattle: { status: 'NOT_RUN' },
    errors: [],
    pageErrors: [],
    consoleErrors: [],
    summary: {
        phase,
        totalApiCases: 0,
        apiPassed: 0,
        apiFailed: 0,
        uiPassed: 0,
        uiFailed: 0,
        status: 'RUNNING',
    }
};

let server = null;
let browser = null;

try {
    // 1. Start Vite Server with audit favicon fixture
    server = await createServer({
        root,
        plugins: [{
            name: 'audit-favicon-fixture',
            configureServer(vite) {
                vite.middlewares.use((request, response, next) => {
                    if (request.method === 'GET' && request.url === '/favicon.ico') {
                        response.statusCode = 204;
                        response.end();
                    } else next();
                });
            },
        }],
        server: { port: 3199, strictPort: false, host: '127.0.0.1' },
        logLevel: 'error',
    });
    await server.listen();
    const baseUrl = server.resolvedUrls.local[0];

    // 2. Launch Chromium (msedge or chrome)
    for (const channel of ['msedge', 'chrome']) {
        try {
            browser = await chromium.launch({ channel, headless: true });
            break;
        } catch { /* try next */ }
    }
    if (!browser) throw new Error('No Chromium-compatible browser found (msedge/chrome)');

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on('pageerror', (e) => {
        results.pageErrors.push(e.message);
    });
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            results.consoleErrors.push({ message: msg.text(), location: msg.location() });
        }
    });

    console.log(`[f03-check] Navigating to ${baseUrl}?quality=0&mute...`);
    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__TACTICAL_ENGINE__), { timeout: 15000 });

    const startBtn = page.getByText('START SIMULATION');
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(500);
    }

    // =========================================================================
    // PART 1: API Boundary Validation Tests via UI_COMMAND (UPDATE_SKILL)
    // =========================================================================
    console.log('[f03-check] Running Part 1: API Boundary Cases...');

    const apiResults = await page.evaluate((currentPhase) => {
        const e = window.__TACTICAL_ENGINE__;
        const skill = e.skillDB.find(s => s.id === 'mb_u1');
        if (!skill) throw new Error('Skill mb_u1 not found');

        // Snapshot original pristine values
        const origValues = {
            name: skill.name,
            desc: skill.desc,
            tag: skill.tag,
            team: skill.team,
            visual: skill.visual,
            visualHitEffect: skill.visualHitEffect,
            visualProjectileEffect: skill.visualProjectileEffect,
            specialVisualStatus: skill.specialVisualStatus,
            color: skill.color,
            projectileSpeed: skill.projectileSpeed,
            range: skill.range,
            type: skill.type,
            aoeRadius: skill.aoeRadius,
            power: skill.power,
            cast: skill.cast,
            cost: skill.cost,
            gain: skill.gain,
            cd: skill.cd,
            element: skill.element,
            ccType: skill.ccType,
            ccDur: skill.ccDur,
            ccForce: skill.ccForce,
            ccSelf: skill.ccSelf,
            ccType2: skill.ccType2,
            ccDur2: skill.ccDur2,
            ccForce2: skill.ccForce2,
            ccSelf2: skill.ccSelf2,
            effectType: skill.effectType,
            effectVal: skill.effectVal,
            effectType2: skill.effectType2,
            effectVal2: skill.effectVal2,
        };

        const cases = [
            { id: 'cast_negative', field: 'cast', value: -2, expectAfter: 'REJECT' },
            { id: 'cast_string', field: 'cast', value: 'two', expectAfter: 'REJECT' },
            { id: 'tag_invalid', field: 'tag', value: 'INVALID_TAG', expectAfter: 'REJECT' },
            { id: 'type_invalid', field: 'type', value: 'INVALID_TYPE', expectAfter: 'REJECT' },
            { id: 'ccType_gravity', field: 'ccType', value: 'GRAVITY', expectAfter: 'REJECT' },
            { id: 'specialVisualStatus_danger', field: 'specialVisualStatus', value: 'DANGER', expectAfter: 'REJECT' },
            { id: 'ccSelf_string', field: 'ccSelf', value: 'false', expectAfter: 'REJECT' },
            { id: 'range_undefined', field: 'range', value: undefined, expectAfter: 'REJECT' },
            { id: 'unknown_field', field: 'nonExistentField', value: 123, expectAfter: 'REJECT' },
            { id: 'range_nan', field: 'range', value: NaN, expectAfter: 'REJECT' },
            { id: 'cast_infinity', field: 'cast', value: Infinity, expectAfter: 'REJECT' },
            { id: 'power_negative', field: 'power', value: -100, expectAfter: 'ACCEPT' },
            { id: 'projectileSpeed_zero', field: 'projectileSpeed', value: 0, expectAfter: 'ACCEPT' },
            { id: 'aoeRadius_undefined', field: 'aoeRadius', value: undefined, expectAfter: 'ACCEPT' },
            { id: 'hit_effect_valid', field: 'visualHitEffect', value: 'FX_GRID_IMPACT_BLUE', expectAfter: 'ACCEPT' },
            { id: 'hit_effect_tostring', field: 'visualHitEffect', value: 'toString', expectAfter: 'REJECT' },
            { id: 'hit_effect_empty', field: 'visualHitEffect', value: '', expectAfter: 'REJECT' },
            { id: 'hit_effect_unknown', field: 'visualHitEffect', value: 'NON_EXISTENT_VFX_KEY', expectAfter: 'REJECT' },
            { id: 'team_valid_enum', field: 'team', value: 0, expectAfter: 'ACCEPT' }, // Team.BLUE
            { id: 'team_invalid_string', field: 'team', value: 'BLUE', expectAfter: 'REJECT' },
        ];

        const caseOutputs = [];

        try {
            for (const c of cases) {
                const beforeVal = skill[c.field];
                e.bus.emit('UI_COMMAND', {
                    type: 'UPDATE_SKILL',
                    skillId: 'mb_u1',
                    field: c.field,
                    value: c.value,
                });
                const afterVal = skill[c.field];
                const isAccepted = (typeof c.value === 'number' && Number.isNaN(c.value))
                    ? Number.isNaN(afterVal)
                    : (afterVal === c.value);

                // Restore this field immediately before next test
                if (c.field in origValues) {
                    skill[c.field] = origValues[c.field];
                } else {
                    delete skill[c.field];
                }

                const expectedBehavior = (currentPhase === 'after') ? c.expectAfter : 'OBSERVE';
                const pass = (currentPhase === 'before')
                    ? true // In before phase, we observe and record whatever happens
                    : (c.expectAfter === 'ACCEPT' ? isAccepted : !isAccepted);

                caseOutputs.push({
                    id: c.id,
                    field: c.field,
                    input: typeof c.value === 'number' && Number.isNaN(c.value) ? 'NaN' : String(c.value),
                    expectedAfter: c.expectAfter,
                    isAccepted,
                    afterVal: typeof afterVal === 'number' && Number.isNaN(afterVal) ? 'NaN' : afterVal,
                    pass,
                });
            }
        } finally {
            // Full pristine restore
            for (const [k, v] of Object.entries(origValues)) {
                skill[k] = v;
            }
        }

        const restored = Object.entries(origValues).every(([k, v]) => Object.is(skill[k], v));

        return { caseOutputs, restored };
    }, phase);

    results.apiCases = apiResults.caseOutputs;
    results.apiRestored = apiResults.restored;
    if (!apiResults.restored) {
        throw new Error('API boundary cases failed to restore pristine skill state');
    }

    // =========================================================================
    // PART 2: Real UI DOM Interaction via Playwright
    // =========================================================================
    console.log('[f03-check] Running Part 2: Real UI DOM Inspector Cases...');

    // Open System Menu -> DB Window
    const menuBtn = page.locator('[data-testid="system-menu-button"]');
    await menuBtn.click();
    await page.waitForTimeout(300);

    const dbMenuItem = page.locator('[data-testid="menu-item-db"]');
    await dbMenuItem.click();
    await page.waitForTimeout(400);

    const dbWindow = page.locator('[data-window-id="db"]');
    await dbWindow.waitFor({ state: 'visible', timeout: 5000 });

    // Click skill '奧術漩渦' (mb_u1)
    const skillItem = dbWindow.getByText('奧術漩渦').first();
    await skillItem.click();
    await page.waitForTimeout(300);

    // Check Dropdown Options
    const tagSelect = dbWindow.locator('label', { hasText: '技能類型' }).locator('..').locator('select');
    const typeSelect = dbWindow.locator('label', { hasText: '目標模式' }).locator('..').locator('select');
    const ccTypeSelect = dbWindow.locator('label', { hasText: '主控制類型' }).locator('..').locator('select');
    const specialVisualSelect = dbWindow.locator('label', { hasText: '特殊視覺狀態' }).locator('..').locator('select');

    const ccTypeOptions = await ccTypeSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));
    const specialVisualOptions = await specialVisualSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));

    const ccHasGravity = ccTypeOptions.includes('GRAVITY');
    const visualHasDanger = specialVisualOptions.includes('DANGER');
    const visualHasInvincible = specialVisualOptions.includes('INVINCIBLE');

    results.uiCases.dropdowns = {
        ccTypeOptions,
        specialVisualOptions,
        ccHasGravity,
        visualHasDanger,
        visualHasInvincible,
        validInAfter: !ccHasGravity && !visualHasDanger && visualHasInvincible,
    };

    // Range input (numeric required)
    const rangeContainer = dbWindow.locator('label', { hasText: '極限射程' }).locator('..');
    const rangeInput = rangeContainer.locator('input');
    const initialRange = await rangeInput.inputValue();

    // Cast input (numeric required >= 0)
    const castContainer = dbWindow.locator('label', { hasText: '詠唱時間 (秒)' }).locator('..');
    const castInput = castContainer.locator('input');
    const initialCast = await castInput.inputValue();

    // Power input (numeric signed)
    const powerContainer = dbWindow.locator('label', { hasText: '威力指數' }).locator('..');
    const powerInput = powerContainer.locator('input');
    const initialPower = await powerInput.inputValue();

    // AOE Radius input (numeric optional)
    const aoeContainer = dbWindow.locator('label', { hasText: '範圍半徑' }).locator('..');
    const aoeInput = aoeContainer.locator('input');
    const initialAoe = await aoeInput.inputValue();

    if (phase === 'before') {
        // Observe snapback defect on clearing
        await rangeInput.fill('');
        const domValCleared = await rangeInput.inputValue();
        const dbValCleared = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);
        await rangeInput.blur();
        await page.waitForTimeout(100);
        const domValBlurred = await rangeInput.inputValue();

        // Observe negative number accepted
        await rangeInput.fill('-5');
        const domValNegative = await rangeInput.inputValue();
        const dbValNegative = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);

        // Restore initial value
        await page.evaluate((orig) => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            if (s) s.range = Number(orig);
        }, initialRange);

        results.uiCases.beforeObservation = {
            domValCleared,
            dbValCleared,
            domValBlurred,
            domValNegative,
            dbValNegative,
            snapbackObserved: domValCleared === domValBlurred,
            negativeAccepted: dbValNegative === -5,
        };
    } else {
        // AFTER PHASE: verify all UI requirements strictly
        // 1. Clear required field: draft is empty, engine unchanged -> input new value -> blur/Enter writes
        await rangeInput.fill('');
        const domEmpty = await rangeInput.inputValue();
        const dbUnchangedAfterEmpty = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);

        await rangeInput.fill('7');
        const dbUnchangedAfterTyping = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);
        await rangeInput.press('Enter');
        await page.waitForTimeout(100);
        const dbUpdatedAfterEnter = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);

        const draftAndCommitOk = (domEmpty === '') &&
            (dbUnchangedAfterEmpty === Number(initialRange)) &&
            (dbUnchangedAfterTyping === Number(initialRange)) &&
            (dbUpdatedAfterEnter === 7);

        // 2. Negative cast rejected, restores engine value on blur
        await castInput.fill('-2');
        await castInput.press('Enter');
        await castInput.blur();
        await page.waitForTimeout(100);
        const dbCastAfterNegative = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').cast);
        const domCastAfterNegative = await castInput.inputValue();
        const negativeCastRejected = (dbCastAfterNegative === Number(initialCast)) && (domCastAfterNegative === String(initialCast));

        // 3. Negative power can be submitted
        await powerInput.fill('-50');
        await powerInput.press('Enter');
        await page.waitForTimeout(100);
        const dbPowerAfterNegative = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').power);
        const negativePowerSubmitted = (dbPowerAfterNegative === -50);

        // 4. Empty optional clears to undefined
        await aoeInput.fill('');
        await aoeInput.press('Enter');
        await page.waitForTimeout(100);
        const dbAoeAfterClear = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').aoeRadius);
        const emptyOptionalCleared = (dbAoeAfterClear === undefined);

        // 5. Escape cancels draft and restores
        await rangeInput.fill('999');
        await rangeInput.press('Escape');
        await page.waitForTimeout(100);
        const domRangeAfterEscape = await rangeInput.inputValue();
        const dbRangeAfterEscape = await page.evaluate(() => window.__TACTICAL_ENGINE__.skillDB.find(s => s.id === 'mb_u1').range);
        const escapeCancels = (domRangeAfterEscape === '7') && (dbRangeAfterEscape === 7);

        // 6. Switch skill does not leak draft
        // Find another skill row (e.g. '連環火球' or second skill row)
        const secondSkill = dbWindow.locator('.liquid-card').nth(1);
        await secondSkill.click();
        await page.waitForTimeout(200);
        const secondSkillRangeInput = dbWindow.locator('label', { hasText: '極限射程' }).locator('..').locator('input').last();
        const secondSkillRangeVal = await secondSkillRangeInput.inputValue();
        const switchSkillNoLeak = (secondSkillRangeVal !== '7' && secondSkillRangeVal !== '999');

        // Restore all modified fields in engine
        await page.evaluate((orig) => {
            const s = window.__TACTICAL_ENGINE__.skillDB.find(x => x.id === 'mb_u1');
            if (s) {
                s.range = Number(orig.range);
                s.cast = Number(orig.cast);
                s.power = Number(orig.power);
                s.aoeRadius = orig.aoe ? Number(orig.aoe) : undefined;
            }
        }, { range: initialRange, cast: initialCast, power: initialPower, aoe: initialAoe });

        results.uiCases.afterValidation = {
            draftAndCommitOk,
            negativeCastRejected,
            negativePowerSubmitted,
            emptyOptionalCleared,
            escapeCancels,
            switchSkillNoLeak,
            dropdownsValid: results.uiCases.dropdowns.validInAfter,
        };
    }

    // Save screenshot
    const shotPath = join(outDir, `f03-${phase}-ui.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    results.screenshot = shotPath;

    // Run short smoke battle check
    console.log('[f03-check] Running short engine smoke battle verification...');
    const smokeResult = await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        if (!e) return { ok: false, error: 'No engine' };
        try {
            e.play();
            const t0 = e.state?.time?.battleTime ?? 0;
            await new Promise(r => setTimeout(r, 400));
            const t1 = e.state?.time?.battleTime ?? 0;
            return { ok: true, t0, t1, advanced: t1 >= t0, isRunning: Boolean(e.isRunning) };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
    results.smokeBattle = smokeResult;

    // Summarize
    const totalApi = results.apiCases.length;
    const apiPassed = results.apiCases.filter(c => c.pass).length;
    const apiFailed = totalApi - apiPassed;

    let uiPassed = 0;
    let uiFailed = 0;

    if (phase === 'before') {
        uiPassed = 1;
        results.summary.status = 'COMPLETED_BEFORE';
    } else {
        const av = results.uiCases.afterValidation;
        const allUiPassed = av && av.draftAndCommitOk && av.negativeCastRejected &&
            av.negativePowerSubmitted && av.emptyOptionalCleared && av.escapeCancels &&
            av.switchSkillNoLeak && av.dropdownsValid;

        if (allUiPassed && apiFailed === 0 && results.smokeBattle.ok && results.pageErrors.length === 0) {
            uiPassed = 1;
            results.summary.status = 'PASS';
        } else {
            uiFailed = 1;
            results.summary.status = 'FAIL';
            process.exitCode = 1;
        }
    }

    results.summary.totalApiCases = totalApi;
    results.summary.apiPassed = apiPassed;
    results.summary.apiFailed = apiFailed;
    results.summary.uiPassed = uiPassed;
    results.summary.uiFailed = uiFailed;

} catch (err) {
    console.error('[f03-check] Unhandled error:', err);
    results.errors.push({ message: err.message, stack: err.stack });
    results.summary.status = 'ERROR';
    process.exitCode = 1;
} finally {
    try {
        if (browser) await browser.close();
    } catch { /* ignore */ }
    try {
        if (server) await server.close();
    } catch { /* ignore */ }

    // Write results to JSON
    const primaryOutPath = resolve(root, outFileName);
    const backupOutPath = join(outDir, outFileName.split(/[/\\]/).pop());
    const jsonStr = JSON.stringify(results, null, 2);
    writeFileSync(primaryOutPath, jsonStr, 'utf-8');
    if (primaryOutPath !== backupOutPath) {
        writeFileSync(backupOutPath, jsonStr, 'utf-8');
    }
    console.log(`[f03-check] Results written to ${primaryOutPath} (status: ${results.summary.status})`);
}
