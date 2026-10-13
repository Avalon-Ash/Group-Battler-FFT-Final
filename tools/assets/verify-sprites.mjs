/**
 * tools/assets/verify-sprites.mjs
 *
 * Verifies sprite atlases and manifest frames using headless playwright-core.
 * Checks bounds, frame counts, mandatory animations, and non-blank pixels.
 * Generates visual preview: tools/ui-e2e/out/assets_preview_units.png
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const UNITS_DIR = join(ROOT, 'public', 'assets', 'units');
const OUT_DIR = join(ROOT, 'tools', 'ui-e2e', 'out');
mkdirSync(OUT_DIR, { recursive: true });

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

async function main() {
    console.log('[verify-sprites] Starting sprite atlas verification...');
    const manifestPath = join(UNITS_DIR, 'manifest.json');
    if (!existsSync(manifestPath)) {
        console.error(`[verify-sprites] Missing manifest: ${manifestPath}`);
        process.exit(1);
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const browser = await launchBrowser();
    const page = await browser.newPage();

    const errors = [];
    const unitKeys = Object.keys(manifest.units);
    console.log(`[verify-sprites] Found ${unitKeys.length} units in manifest.`);

    const REQUIRED_ANIMS = ['idle', 'walk', 'attack', 'hit', 'death'];
    const REQUIRED_DIRS = ['SE', 'SW', 'NE', 'NW'];

    // Expected units: 10
    if (unitKeys.length < 10) {
        errors.push(`Expected at least 10 units in manifest, found ${unitKeys.length}`);
    }

    const idleFramesForPreview = [];

    for (const unitKey of unitKeys) {
        const unit = manifest.units[unitKey];
        const atlasFile = join(UNITS_DIR, unit.file);
        if (!existsSync(atlasFile)) {
            errors.push(`[${unitKey}] Atlas file does not exist: ${unit.file}`);
            continue;
        }

        const buf = readFileSync(atlasFile);
        const dataUrl = `data:image/webp;base64,${buf.toString('base64')}`;

        // Verify in browser canvas
        const result = await page.evaluate(async ({ unitKey, unit, dataUrl, requiredAnims, requiredDirs }) => {
            const errs = [];
            const img = new Image();
            try {
                await new Promise((res, rej) => {
                    img.onload = res;
                    img.onerror = () => rej(new Error('Failed to load image'));
                    img.src = dataUrl;
                });
            } catch (e) {
                return { errors: [`Image decode failed: ${unit.file}`], previewFrames: [] };
            }

            if (img.naturalWidth !== unit.atlas.w || img.naturalHeight !== unit.atlas.h) {
                errs.push(`Atlas dimensions mismatch: image is ${img.naturalWidth}x${img.naturalHeight}, manifest declared ${unit.atlas.w}x${unit.atlas.h}`);
            }

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            // Check anims
            for (const animName of requiredAnims) {
                if (!unit.anims[animName]) {
                    errs.push(`Missing required animation: ${animName}`);
                    continue;
                }
                const anim = unit.anims[animName];
                let expectedCount = -1;
                for (const dir of requiredDirs) {
                    const frames = anim.frames[dir];
                    if (!frames || !Array.isArray(frames) || frames.length === 0) {
                        errs.push(`Animation ${animName} missing direction ${dir}`);
                        continue;
                    }
                    if (expectedCount === -1) {
                        expectedCount = frames.length;
                    } else if (frames.length !== expectedCount) {
                        errs.push(`Animation ${animName} direction ${dir} frame count ${frames.length} != expected ${expectedCount}`);
                    }

                    // Check each frame
                    for (let i = 0; i < frames.length; i++) {
                        const fr = frames[i];
                        if (fr.x < 0 || fr.y < 0 || fr.w <= 0 || fr.h <= 0 ||
                            fr.x + fr.w > img.naturalWidth || fr.y + fr.h > img.naturalHeight) {
                            errs.push(`Frame out of bounds in ${animName}:${dir}:${i} -> rect: ${JSON.stringify(fr)}`);
                            continue;
                        }

                        // Check non-blank pixels
                        const idata = ctx.getImageData(fr.x, fr.y, fr.w, fr.h);
                        let hasAlpha = false;
                        for (let p = 3; p < idata.data.length; p += 4) {
                            if (idata.data[p] > 10) {
                                hasAlpha = true;
                                break;
                            }
                        }
                        if (!hasAlpha) {
                            errs.push(`Frame is completely blank in ${animName}:${dir}:${i}`);
                        }
                    }
                }
            }

            // Check cast animation requirement for MAGE / SUPPORT
            if (unitKey.includes('MAGE') || unitKey.includes('SUPPORT')) {
                if (!unit.anims.cast) {
                    errs.push(`Expected 'cast' animation for ${unitKey}, but not found`);
                }
            }

            // Collect idle frame 0 for each direction for preview
            const preview = [];
            if (unit.anims.idle) {
                for (const dir of requiredDirs) {
                    const fr = unit.anims.idle.frames[dir]?.[0];
                    if (fr) {
                        // Extract frame to small canvas
                        const fCanvas = document.createElement('canvas');
                        fCanvas.width = 160;
                        fCanvas.height = 200;
                        const fCtx = fCanvas.getContext('2d');
                        // Render with anchor at (80, 160)
                        const ax = 80;
                        const ay = 160;
                        fCtx.drawImage(img, fr.x, fr.y, fr.w, fr.h, ax + fr.ox, ay + fr.oy, fr.w, fr.h);
                        preview.push({ dir, dataUrl: fCanvas.toDataURL('image/png') });
                    }
                }
            }

            return { errors: errs, previewFrames: preview };
        }, { unitKey, unit, dataUrl, requiredAnims: REQUIRED_ANIMS, requiredDirs: REQUIRED_DIRS });

        if (result.errors.length > 0) {
            for (const err of result.errors) {
                errors.push(`[${unitKey}] ${err}`);
            }
        } else {
            console.log(`[verify-sprites] PASS: ${unitKey} (${unit.file})`);
        }

        idleFramesForPreview.push({ unitKey, frames: result.previewFrames });
    }

    // Generate combined preview image: 10 units x 4 directions
    console.log('[verify-sprites] Generating visual preview tools/ui-e2e/out/assets_preview_units.png...');
    const previewPngBase64 = await page.evaluate(async (data) => {
        const cellW = 180;
        const cellH = 220;
        const cols = 4;
        const rows = data.length;
        const canvas = document.createElement('canvas');
        canvas.width = cellW * cols + 160; // Extra left space for unit labels
        canvas.height = cellH * rows + 40; // Top header
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#181920';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px sans-serif';
        const dirs = ['SE (3/4 Front Right)', 'SW (3/4 Front Left)', 'NE (3/4 Back Right)', 'NW (3/4 Back Left)'];
        for (let c = 0; c < 4; c++) {
            ctx.fillText(dirs[c], 170 + c * cellW + 10, 26);
        }

        // Render each row
        for (let r = 0; r < rows; r++) {
            const item = data[r];
            const y = 40 + r * cellH;

            // Row background alternate
            if (r % 2 === 1) {
                ctx.fillStyle = '#1e212b';
                ctx.fillRect(0, y, canvas.width, cellH);
            }

            // Unit label
            ctx.fillStyle = item.unitKey.startsWith('BLUE') ? '#60a5fa' : '#f87171';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(item.unitKey, 10, y + cellH / 2);

            // Draw 4 directions
            for (let c = 0; c < item.frames.length; c++) {
                const fr = item.frames[c];
                const x = 160 + c * cellW;

                // Subtle cell border
                ctx.strokeStyle = '#2d3345';
                ctx.strokeRect(x + 5, y + 5, cellW - 10, cellH - 10);

                // Small ground shadow guide
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(x + 5 + 80, y + 5 + 160, 28, 14, 0, 0, Math.PI * 2);
                ctx.fill();

                const img = new Image();
                await new Promise((res) => { img.onload = res; img.src = fr.dataUrl; });
                ctx.drawImage(img, x + 5, y + 5);
            }
        }

        return canvas.toDataURL('image/png').split(',')[1];
    }, idleFramesForPreview);

    const previewOutPath = join(OUT_DIR, 'assets_preview_units.png');
    writeFileSync(previewOutPath, Buffer.from(previewPngBase64, 'base64'));
    console.log(`[verify-sprites] Preview written to: ${previewOutPath}`);

    await browser.close();

    if (errors.length > 0) {
        console.error(`[verify-sprites] FAILED with ${errors.length} error(s):`);
        for (const err of errors) console.error(`  - ${err}`);
        process.exit(1);
    }

    console.log('[verify-sprites] ALL SPRITE ATLAS CHECKS PASSED.');
}

main().catch((e) => {
    console.error('[verify-sprites] Fatal error:', e);
    process.exit(1);
});
