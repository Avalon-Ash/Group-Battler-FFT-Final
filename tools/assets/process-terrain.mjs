/**
 * tools/assets/process-terrain.mjs
 *
 * Deterministic terrain texture processor:
 * - Detects 2x5 swatches from art-source/terrain_grid.jpg.
 * - Crops interior with 2% inset (ignoring text labels, preserving top moss on cliff sides).
 * - Scales to 512x512.
 * - Applies 2D wrap-shift cross-fade seamless tiling for _top textures.
 * - Applies 1D horizontal wrap-shift cross-fade seamless tiling for _side textures.
 * - Exports WebP to public/assets/terrain/<theme>_{top,side}.webp.
 * - Exports preview grid to tools/ui-e2e/out/assets_preview_terrain.png.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const SOURCE_IMG = join(ROOT, 'art-source', 'terrain_grid.jpg');
const OUT_DIR = join(ROOT, 'public', 'assets', 'terrain');
const PREVIEW_DIR = join(ROOT, 'tools', 'ui-e2e', 'out');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PREVIEW_DIR, { recursive: true });

const THEMES = ['void', 'forest', 'ice', 'magma', 'desert'];

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
    console.log('[process-terrain] Processing terrain textures from art-source/terrain_grid.jpg...');
    const buf = readFileSync(SOURCE_IMG);
    const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    const result = await page.evaluate(async ({ dataUrl, themes }) => {
        const img = new Image();
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = () => rej(new Error('Failed to load terrain_grid.jpg'));
            img.src = dataUrl;
        });

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.naturalWidth;
        srcCanvas.height = img.naturalHeight;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        srcCtx.drawImage(img, 0, 0);

        // Standard bounding boxes for the 2x5 grid in 1376x768 image:
        // Col 0..4 (VOID, FOREST, ICE, MAGMA, DESERT)
        const cols = [
            { start: 37, end: 286 },
            { start: 301, end: 549 },
            { start: 563, end: 813 },
            { start: 827, end: 1075 },
            { start: 1089, end: 1340 }
        ];
        // Rows: Row 0 (Top), Row 1 (Side)
        const rows = [
            { start: 88, end: 335 },
            { start: 412, end: 657 }
        ];

        // Smoothstep helper
        function smoothstep(min, max, val) {
            const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
            return t * t * (3 - 2 * t);
        }

        const TARGET_SIZE = 512;
        const FEATHER_BAND = 0.22; // 22% transition band for seamless blending
        const textures = {};

        // Helper to process a swatch
        function processSwatch(col, row, isTop) {
            const w = col.end - col.start;
            const h = row.end - row.start;

            // Inset 2% to strip borders
            const insetX = Math.round(w * 0.02);
            const insetY = Math.round(h * 0.02);

            const sx = col.start + insetX;
            const sy = row.start + insetY;
            const sw = w - 2 * insetX;
            const sh = h - 2 * insetY;

            // Step 1: scale crop to 512x512
            const baseCanvas = document.createElement('canvas');
            baseCanvas.width = TARGET_SIZE;
            baseCanvas.height = TARGET_SIZE;
            const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
            baseCtx.imageSmoothingEnabled = true;
            baseCtx.imageSmoothingQuality = 'high';
            baseCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, TARGET_SIZE, TARGET_SIZE);

            const baseData = baseCtx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
            const srcPixels = baseData.data;

            // Step 2: create seamless blended version
            const outCanvas = document.createElement('canvas');
            outCanvas.width = TARGET_SIZE;
            outCanvas.height = TARGET_SIZE;
            const outCtx = outCanvas.getContext('2d');
            const outData = outCtx.createImageData(TARGET_SIZE, TARGET_SIZE);
            const dstPixels = outData.data;

            const half = TARGET_SIZE / 2;

            for (let y = 0; y < TARGET_SIZE; y++) {
                const ny = Math.min(y, TARGET_SIZE - 1 - y) / half;
                for (let x = 0; x < TARGET_SIZE; x++) {
                    const nx = Math.min(x, TARGET_SIZE - 1 - x) / half;
                    const dstIdx = (y * TARGET_SIZE + x) * 4;

                    // Compute shifted coordinates
                    const shiftX = (x + half) % TARGET_SIZE;
                    const shiftY = isTop ? ((y + half) % TARGET_SIZE) : y;
                    const shiftIdx = (shiftY * TARGET_SIZE + shiftX) * 4;

                    // Blend weights
                    let wOrig;
                    if (isTop) {
                        // 2D blend
                        const wx = smoothstep(0, FEATHER_BAND, nx);
                        const wy = smoothstep(0, FEATHER_BAND, ny);
                        wOrig = Math.min(wx, wy);
                    } else {
                        // 1D horizontal blend only (preserve vertical cliff strata & top moss)
                        wOrig = smoothstep(0, FEATHER_BAND, nx);
                    }
                    const wShift = 1 - wOrig;

                    dstPixels[dstIdx] = Math.round(srcPixels[dstIdx] * wOrig + srcPixels[shiftIdx] * wShift);
                    dstPixels[dstIdx + 1] = Math.round(srcPixels[dstIdx + 1] * wOrig + srcPixels[shiftIdx + 1] * wShift);
                    dstPixels[dstIdx + 2] = Math.round(srcPixels[dstIdx + 2] * wOrig + srcPixels[shiftIdx + 2] * wShift);
                    dstPixels[dstIdx + 3] = 255;
                }
            }

            outCtx.putImageData(outData, 0, 0);
            return {
                webpBase64: outCanvas.toDataURL('image/webp', 0.88).split(',')[1],
                pngDataUrl: outCanvas.toDataURL('image/png')
            };
        }

        const previewTiles = [];

        for (let c = 0; c < themes.length; c++) {
            const theme = themes[c];
            // Top swatch
            const topRes = processSwatch(cols[c], rows[0], true);
            textures[`${theme}_top.webp`] = topRes.webpBase64;
            previewTiles.push({ theme, type: 'TOP', row: 0, col: c, dataUrl: topRes.pngDataUrl });

            // Side swatch
            const sideRes = processSwatch(cols[c], rows[1], false);
            textures[`${theme}_side.webp`] = sideRes.webpBase64;
            previewTiles.push({ theme, type: 'SIDE', row: 1, col: c, dataUrl: sideRes.pngDataUrl });
        }

        // Render combined preview canvas: 2 rows x 5 columns
        const tilePreviewSize = 256;
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = tilePreviewSize * 5 + 40;
        previewCanvas.height = tilePreviewSize * 2 + 100;
        const pCtx = previewCanvas.getContext('2d');

        pCtx.fillStyle = '#111218';
        pCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Header Title
        pCtx.fillStyle = '#e2e8f0';
        pCtx.font = 'bold 18px sans-serif';
        pCtx.fillText('TACTICAL.OS — Biome Terrain Textures Preview (512x512 Seamless)', 20, 30);

        for (const tile of previewTiles) {
            const x = 20 + tile.col * tilePreviewSize;
            const y = 50 + tile.row * (tilePreviewSize + 25);

            // Label
            pCtx.fillStyle = '#94a3b8';
            pCtx.font = 'bold 12px monospace';
            pCtx.fillText(`${tile.theme.toUpperCase()} (${tile.type})`, x + 4, y - 6);

            const imgTile = new Image();
            await new Promise((res) => { imgTile.onload = res; imgTile.src = tile.dataUrl; });
            pCtx.drawImage(imgTile, x, y, tilePreviewSize - 8, tilePreviewSize - 8);

            // Border
            pCtx.strokeStyle = '#334155';
            pCtx.strokeRect(x, y, tilePreviewSize - 8, tilePreviewSize - 8);
        }

        return {
            textures,
            previewPngBase64: previewCanvas.toDataURL('image/png').split(',')[1]
        };
    }, { dataUrl, themes: THEMES });

    // Write all WebP textures to public/assets/terrain/
    for (const [filename, base64] of Object.entries(result.textures)) {
        const outPath = join(OUT_DIR, filename);
        writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log(`[process-terrain] Wrote: public/assets/terrain/${filename}`);
    }

    // Write preview PNG
    const previewOutPath = join(PREVIEW_DIR, 'assets_preview_terrain.png');
    writeFileSync(previewOutPath, Buffer.from(result.previewPngBase64, 'base64'));
    console.log(`[process-terrain] Wrote preview: ${previewOutPath}`);

    await browser.close();
    console.log('[process-terrain] Terrain texture processing complete!');
}

main().catch((e) => {
    console.error('[process-terrain] Fatal error:', e);
    process.exit(1);
});
