// Bundle size budget (U2). Runs after `vite build` and fails (exit 1) when the JS needed to
// start the app grows past the budget, so lazy-loaded windows can't silently drift back into the entry.
//
// Depends on: `dist/index.html` (entry script + modulepreload links, written by vite),
// and the chunk split in `vite.config.ts` (`manualChunks`). Pass `--print` to show numbers only.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Measured right after the U2 split (WORKLOG §2 CD), gzip bytes of the entry chunk alone. */
const MEASURED_ENTRY_GZIP = 250_000;
/** Same measurement: entry + the vendor chunks index.html preloads (what a first visit downloads before the game starts). */
const MEASURED_INITIAL_GZIP = 372_000;
/** Headroom over the measurement (open-case plan U2: measured value + 3%). Raising it needs a reason in WORKLOG. */
const HEADROOM = 1.03;
export const BUDGET = {
    ENTRY_GZIP: Math.round(MEASURED_ENTRY_GZIP * HEADROOM),
    INITIAL_GZIP: Math.round(MEASURED_INITIAL_GZIP * HEADROOM),
};

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entry = /<script[^>]+type="module"[^>]+src="\.\/([^"]+\.js)"/.exec(html)?.[1];
if (!entry) {
    console.error('bundle-budget: no entry script in dist/index.html (run `npm run build` first)');
    process.exit(1);
}
const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\.\/([^"]+\.js)"/g)].map((m) => m[1]);
const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length;

const entryGzip = gz(entry);
const initialGzip = [entry, ...preloads].reduce((sum, f) => sum + gz(f), 0);
const kb = (n) => `${(n / 1000).toFixed(1)} kB`;
console.log(`bundle-budget: entry ${entry} ${kb(entryGzip)} (budget ${kb(BUDGET.ENTRY_GZIP)})`);
console.log(`bundle-budget: initial (entry + ${preloads.length} preloads) ${kb(initialGzip)} (budget ${kb(BUDGET.INITIAL_GZIP)})`);

if (process.argv.includes('--print')) process.exit(0);
const failures = [];
if (entryGzip > BUDGET.ENTRY_GZIP) failures.push(`entry gzip ${entryGzip} > ${BUDGET.ENTRY_GZIP}`);
if (initialGzip > BUDGET.INITIAL_GZIP) failures.push(`initial gzip ${initialGzip} > ${BUDGET.INITIAL_GZIP}`);
if (failures.length) {
    console.error(`bundle-budget FAILED: ${failures.join('; ')}`);
    process.exit(1);
}
