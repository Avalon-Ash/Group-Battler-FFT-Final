/**
 * ui-gallery.e2e.mjs — 共用元件庫的驗收（docs/UI_REFRESH_PLAN.md）
 * 開 `?ui-gallery` 樣張頁，實際操作每種元件，用 axe 查無障礙，並量字級與巢狀模糊。
 * Run: node tools/ui-e2e/ui-gallery.e2e.mjs [--shots]
 *   --shots 會在 tools/ui-e2e/out/ui-gallery/ 存三種場景的截圖給人看
 */
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out', 'ui-gallery');
const SHOTS = process.argv.includes('--shots');
let failures = 0;
const ok = (name, cond, extra = '') => {
    if (!cond) failures++;
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

const launch = async () => {
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

const server = await createServer({ server: { port: 3193, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await launch();
const errors = [];

const openGallery = async (contextOptions) => {
    const ctx = await browser.newContext(contextOptions);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text().slice(0, 200)); });
    await page.goto(`${server.resolvedUrls.local[0]}?mute&ui-gallery`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="gallery-root"]');
    return { ctx, page };
};

const tid = (id) => `[data-testid="${id}"]`;

try {
    const { ctx, page } = await openGallery({ viewport: { width: 1440, height: 900 } });

    // ── 每種元件都要出現在樣張頁 ──
    const REQUIRED = [
        'gallery-button-primary', 'gallery-button-secondary', 'gallery-button-danger', 'gallery-button-ghost', 'gallery-button-disabled',
        'gallery-icon-button', 'gallery-segmented', 'gallery-tabs', 'gallery-select', 'gallery-select-grouped',
        'gallery-slider', 'gallery-switch', 'gallery-input', 'gallery-number-input', 'gallery-textarea', 'gallery-color-input',
        'gallery-card', 'gallery-setting-row', 'gallery-section-heading', 'gallery-tag', 'gallery-meter', 'gallery-tooltip', 'gallery-empty-state',
    ];
    for (const id of REQUIRED) ok(`present: ${id}`, (await page.locator(tid(id)).count()) > 0);

    // ── Select：鍵盤可操作、選項在最上層、選了值會變 ──
    const select = page.locator(tid('gallery-select'));
    await select.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const listbox = page.locator('[role="listbox"]').first();
    ok('select: Enter opens a listbox', await listbox.isVisible());
    const listboxZ = await listbox.evaluate((el) => {
        for (let n = el; n; n = n.parentElement) {
            const z = getComputedStyle(n).zIndex;
            if (z !== 'auto') return Number(z);
        }
        return 0;
    });
    ok('select: popover sits on the POPOVER layer', listboxZ >= 210, `z=${listboxZ}`);
    const popBlur = await listbox.evaluate((el) => {
        for (let n = el; n; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.backdropFilter && cs.backdropFilter !== 'none') return cs.backdropFilter;
        }
        return 'none';
    });
    ok('select: popover uses the glass blur', popBlur.includes('blur'), popBlur);
    const before = await select.textContent();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    ok('select: arrow keys and Enter change the value', (await select.textContent()) !== before);
    ok('select: closes after choosing', (await page.locator('[role="listbox"]').count()) === 0);
    await select.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok('select: Escape closes without changing focus target', (await page.locator('[role="listbox"]').count()) === 0);

    // 分組下拉：有群組標題
    await page.locator(tid('gallery-select-grouped')).click();
    await page.waitForTimeout(200);
    ok('select grouped: shows group labels', (await page.locator('[role="group"]').count()) >= 2);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // ── 分頁、分段 ──
    const tabs = page.locator(`${tid('gallery-tabs')} [role="tab"]`);
    ok('tabs: at least 3 tabs', (await tabs.count()) >= 3);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    ok('tabs: arrow keys move selection', (await tabs.nth(1).getAttribute('aria-selected')) === 'true');
    const seg = page.locator(`${tid('gallery-segmented')} [role="radio"]`);
    ok('segmented: exposes radio roles', (await seg.count()) >= 3);
    await seg.nth(1).click();
    ok('segmented: click selects', (await seg.nth(1).getAttribute('aria-checked')) === 'true');

    // ── 滑桿、開關：保留原生 input，現有 e2e 的 inputValue／isChecked 才能用 ──
    const slider = page.locator(`${tid('gallery-slider')} input[type="range"]`);
    ok('slider: wraps a native range input', (await slider.count()) === 1);
    const sliderBefore = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    ok('slider: keyboard changes value', (await slider.inputValue()) !== sliderBefore);
    const hit = await slider.boundingBox();
    ok('slider: hit area at least 24px tall (WCAG 2.5.8)', hit.height >= 24, `h=${hit.height}`);
    const sw = page.locator(`${tid('gallery-switch')} input[role="switch"]`);
    ok('switch: native checkbox with role=switch', (await sw.count()) === 1);
    const swBefore = await sw.isChecked();
    await sw.focus();
    await page.keyboard.press('Space');
    ok('switch: Space toggles', (await sw.isChecked()) !== swBefore);

    // ── 數字輸入：Enter 送出、Escape 還原、清空不產生 NaN ──
    const num = page.locator(`${tid('gallery-number-input')} input`);
    const out = page.locator(tid('gallery-number-value'));
    const committed = await out.textContent();
    await num.fill('');
    await num.press('Enter');
    ok('number input: empty does not commit NaN', (await out.textContent()) === committed && !/NaN/.test(await out.textContent()));
    await num.fill('123');
    await num.press('Enter');
    ok('number input: Enter commits', (await out.textContent()) === '123');
    await num.fill('999');
    await num.press('Escape');
    ok('number input: Escape reverts', (await num.inputValue()) === '123' && (await out.textContent()) === '123');

    // ── 量測：字級、巢狀模糊、控制項大小 ──
    const stats = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="gallery-root"]');
        const small = new Set();
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
            const el = w.currentNode.parentElement;
            if (!w.currentNode.textContent.trim() || !el || !el.getBoundingClientRect().width) continue;
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 11) small.add(`${w.currentNode.textContent.trim().slice(0, 12)}=${size}`);
        }
        const blurred = [...root.querySelectorAll('*')].filter((e) => getComputedStyle(e).backdropFilter !== 'none').length;
        const tooSmall = [...root.querySelectorAll('button,select,textarea,input:not([type=range]):not([type=checkbox])')]
            .filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && Math.min(r.width, r.height) < 24; })
            .map((c) => c.getAttribute('data-testid') ?? c.tagName);
        return { small: [...small], blurred, tooSmall };
    });
    ok('no text under 11px', stats.small.length === 0, stats.small.join(', '));
    ok('no blur inside the gallery shell (only the shell itself)', stats.blurred === 0, `nested=${stats.blurred}`);
    ok('controls are at least 24px', stats.tooSmall.length === 0, stats.tooSmall.join(', '));

    // ── axe：無障礙 ──
    const axe = await new AxeBuilder({ page }).include(tid('gallery-root')).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    ok('axe: no serious or critical violations', serious.length === 0, serious.map((v) => `${v.id}(${v.nodes.length})`).join(', '));

    if (SHOTS) {
        mkdirSync(OUT, { recursive: true });
        for (let i = 0; i < 3; i++) {
            await page.screenshot({ path: join(OUT, `desktop-${i}.png`) });
            await page.locator('button[title="隨機生成戰場與陣容"]').click({ force: true }).catch(() => {});
            await page.waitForTimeout(1200);
        }
    }
    await ctx.close();

    // ── 手機：控制項要到觸控尺寸 ──
    const phone = await openGallery({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const phoneH = await phone.page.locator(tid('gallery-button-secondary')).boundingBox();
    ok('phone: buttons reach the 44px touch size', phoneH.height >= 44, `h=${phoneH.height}`);
    if (SHOTS) await phone.page.screenshot({ path: join(OUT, 'mobile.png'), fullPage: false });
    await phone.ctx.close();

    ok('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
    failures++;
    console.log(`FAIL  fatal: ${e.message.split('\n')[0].slice(0, 200)}`);
} finally {
    await browser.close();
    await server.close();
}
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
