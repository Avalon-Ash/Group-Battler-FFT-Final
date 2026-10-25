/**
 * tools/ui-e2e/coord-oracle-sprite-check.mjs
 * Verification probe for depth oracle obstacle sampling (COORD-TOOL-01 / Package A).
 *
 * Verifies:
 *   1. Procedural fallback sampling (valid mask, bounding box, sample points, cache).
 *   2. Loaded atlas and at least 2 distinct (q, r) variants.
 *   3. Dynamic animation frames (at least 2 frames with distinct crops/caches).
 *   4. Non-default anchor handling (world position offset by sprite.anchorX/Y).
 *   5. Controlled synthetic alpha image for exact crop, scale, and anchor math.
 *   6. Negative controls (empty alpha mask, out-of-bounds/empty crop, invalid sprite) must be caught and throw.
 *
 * Run:
 *   node tools/ui-e2e/coord-oracle-sprite-check.mjs
 */

import { startServer, seededHarnessInit } from './lib/coord-probes.mjs';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { installDepthOracle } from './lib/depth-oracle.mjs';

const { server, port } = await startServer(3235);
const browser = await launchBrowser({ headed: false, unthrottled: false }).catch(async (err) => {
    await server.close();
    throw err;
});

let failed = false;
const results = [];

function check(name, pass, detail = '') {
    results.push({ name, pass, detail });
    if (!pass) failed = true;
    const mark = pass ? '✓' : '✗';
    console.log(`  ${mark} ${name}${detail ? ` (${detail})` : ''}`);
}

try {
    console.log('[oracle-sprite-check] Starting Depth Oracle Obstacle Sampling Verification...');

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.addInitScript(seededHarnessInit);
    await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 });
    await page.evaluate(() => window.__stepFrames(5));

    await installDepthOracle(page);

    const checkData = await page.evaluate(async () => {
        const { SpriteManager } = await import('/engine/sprites.ts');
        const { obstacleSpriteStore, obstacleVariant } = await import('/engine/renderers/grid/ObstacleSpriteStore.ts');
        const K = await import('/constants.ts');

        const tests = [];

        // -------------------------------------------------------------
        // 1. Procedural fallback (WALL procedural or EnvironmentFactory)
        // -------------------------------------------------------------
        try {
            const procSprite = SpriteManager.getObstacleSprite('WALL', 'FLAT', 0, 0, 0);
            const b1 = window.__DO__.sampleObstacleSprite(procSprite, 'procedural-WALL');
            const validBounds = b1.x0 >= 0 && b1.y0 >= 0 && b1.x1 > b1.x0 && b1.y1 > b1.y0;
            const validPts = Array.isArray(b1.pts) && b1.pts.length > 0;
            const validAnchor = b1.anchorX === procSprite.anchorX && b1.anchorY === procSprite.anchorY;
            const validSize = b1.width === procSprite.width && b1.height === procSprite.height;

            // Repeated sample should return cached object reference
            const b1Cached = window.__DO__.sampleObstacleSprite(procSprite, 'procedural-WALL-cache');
            const cachedSame = b1 === b1Cached;

            tests.push({
                name: '1. Procedural fallback sampling',
                pass: validBounds && validPts && validAnchor && validSize && cachedSame,
                detail: `box=[${b1.x0},${b1.y0},${b1.x1},${b1.y1}], pts=${b1.pts.length}, cached=${cachedSame}`,
            });
        } catch (err) {
            tests.push({ name: '1. Procedural fallback sampling', pass: false, detail: err.message });
        }

        // -------------------------------------------------------------
        // 2. Loaded atlas & at least 2 distinct (q, r) variants
        // -------------------------------------------------------------
        try {
            await obstacleSpriteStore.readyPromise;
            const manifest = obstacleSpriteStore.getManifest();
            if (!manifest || !manifest.types || !manifest.types.TREE) {
                tests.push({ name: '2. Loaded atlas variants', pass: false, detail: 'Manifest or TREE type not found' });
            } else {
                const varCount = manifest.types.TREE.variants.length;
                // Find two (q, r) pairs that produce different variant indices
                let q1 = 0, r1 = 0, q2 = 1, r2 = 0;
                const v1Idx = obstacleVariant(q1, r1, varCount);
                let v2Idx = obstacleVariant(q2, r2, varCount);
                if (v1Idx === v2Idx) {
                    for (let q = 1; q < 10; q++) {
                        for (let r = 1; r < 10; r++) {
                            if (obstacleVariant(q, r, varCount) !== v1Idx) {
                                q2 = q; r2 = r;
                                v2Idx = obstacleVariant(q, r, varCount);
                                break;
                            }
                        }
                        if (v1Idx !== v2Idx) break;
                    }
                }

                const s1 = SpriteManager.getObstacleSprite('TREE', 'FLAT', q1, r1, 0);
                const s2 = SpriteManager.getObstacleSprite('TREE', 'FLAT', q2, r2, 0);
                const b1 = window.__DO__.sampleObstacle({ ttype: 'TREE', tq: q1, tr: r1 }, 'FLAT');
                const b2 = window.__DO__.sampleObstacle({ ttype: 'TREE', tq: q2, tr: r2 }, 'FLAT');

                const variantsDiff = v1Idx !== v2Idx;
                const b1Valid = b1.x0 < b1.x1 && b1.y0 < b1.y1 && b1.pts.length > 0;
                const b2Valid = b2.x0 < b2.x1 && b2.y0 < b2.y1 && b2.pts.length > 0;
                const distinctSamples = (b1.width !== b2.width || b1.height !== b2.height || b1.anchorX !== b2.anchorX || b1.anchorY !== b2.anchorY || b1.x1 !== b2.x1);

                tests.push({
                    name: '2. Atlas variants (>=2 q/r variants)',
                    pass: variantsDiff && b1Valid && b2Valid && distinctSamples,
                    detail: `variant[${v1Idx}] at (${q1},${r1}) vs variant[${v2Idx}] at (${q2},${r2})`,
                });
            }
        } catch (err) {
            tests.push({ name: '2. Atlas variants (>=2 q/r variants)', pass: false, detail: err.message });
        }

        // -------------------------------------------------------------
        // 3. Dynamic animation frames (at least 2 dynamic frames)
        // -------------------------------------------------------------
        try {
            // Synthetic atlas image with 2 distinct animation frames
            const atlasCv = document.createElement('canvas');
            atlasCv.width = 120;
            atlasCv.height = 60;
            const atlasCtx = atlasCv.getContext('2d');
            // Frame 1: box at (10, 10, 30, 30)
            atlasCtx.fillStyle = 'rgba(255, 0, 0, 1)';
            atlasCtx.fillRect(10, 10, 30, 30);
            // Frame 2: box at (70, 15, 40, 35)
            atlasCtx.fillStyle = 'rgba(0, 255, 0, 1)';
            atlasCtx.fillRect(70, 15, 40, 35);

            const frame1Sprite = {
                image: atlasCv,
                sx: 0, sy: 0, sw: 50, sh: 50,
                width: 50, height: 50,
                anchorX: 25, anchorY: 45,
            };
            const frame2Sprite = {
                image: atlasCv,
                sx: 60, sy: 0, sw: 50, sh: 50,
                width: 50, height: 50,
                anchorX: 25, anchorY: 45,
            };

            const fb1 = window.__DO__.sampleObstacleSprite(frame1Sprite, 'anim-frame-1');
            const fb2 = window.__DO__.sampleObstacleSprite(frame2Sprite, 'anim-frame-2');

            // fb1 should have box at x: 10..40, y: 10..40
            const f1Match = fb1.x0 === 10 && fb1.x1 === 40 && fb1.y0 === 10 && fb1.y1 === 40;
            // fb2 (sx=60): box at x=(70-60)=10, x1=(70-60+40)=50, y=15..50
            const f2Match = fb2.x0 === 10 && fb2.x1 === 50 && fb2.y0 === 15 && fb2.y1 === 50;
            const separateCache = fb1 !== fb2;

            tests.push({
                name: '3. Dynamic animation frames (>=2 dynamic frames)',
                pass: f1Match && f2Match && separateCache,
                detail: `f1=[${fb1.x0},${fb1.y0},${fb1.x1},${fb1.y1}] f2=[${fb2.x0},${fb2.y0},${fb2.x1},${fb2.y1}] separateCache=${separateCache}`,
            });
        } catch (err) {
            tests.push({ name: '3. Dynamic animation frames (>=2 dynamic frames)', pass: false, detail: err.message });
        }

        // -------------------------------------------------------------
        // 4. Non-default anchor verification
        // -------------------------------------------------------------
        try {
            const customCv = document.createElement('canvas');
            customCv.width = 80;
            customCv.height = 80;
            const customCtx = customCv.getContext('2d');
            customCtx.fillStyle = 'rgba(0, 0, 255, 1)';
            customCtx.fillRect(10, 10, 50, 50);

            const nonDefaultAnchorX = 137;
            const nonDefaultAnchorY = 249;
            const customSprite = {
                image: customCv,
                width: 80,
                height: 80,
                anchorX: nonDefaultAnchorX,
                anchorY: nonDefaultAnchorY,
            };

            const cb = window.__DO__.sampleObstacleSprite(customSprite, 'custom-anchor');
            const anchorMatches = cb.anchorX === nonDefaultAnchorX && cb.anchorY === nonDefaultAnchorY;
            const notDefault = cb.anchorX !== K.ENV_SPRITE.ANCHOR_X && cb.anchorY !== K.ENV_SPRITE.ANCHOR_Y;

            tests.push({
                name: '4. Non-default anchor preservation',
                pass: anchorMatches && notDefault,
                detail: `anchorX=${cb.anchorX} (default ${K.ENV_SPRITE.ANCHOR_X}), anchorY=${cb.anchorY} (default ${K.ENV_SPRITE.ANCHOR_Y})`,
            });
        } catch (err) {
            tests.push({ name: '4. Non-default anchor preservation', pass: false, detail: err.message });
        }

        // -------------------------------------------------------------
        // 5. Controlled synthetic alpha image for exact crop/scale/anchor
        // -------------------------------------------------------------
        try {
            const synthCv = document.createElement('canvas');
            synthCv.width = 200;
            synthCv.height = 200;
            const synthCtx = synthCv.getContext('2d');
            // Background is transparent. Fill exact rect at (30, 40) of size (50, 60)
            synthCtx.fillStyle = 'rgba(128, 64, 32, 1)';
            synthCtx.fillRect(30, 40, 50, 60);

            // 5A: Full image, 1:1 scale
            const synthSpriteA = {
                image: synthCv,
                width: 200,
                height: 200,
                anchorX: 100,
                anchorY: 180,
            };
            const sbA = window.__DO__.sampleObstacleSprite(synthSpriteA, 'synth-full');
            const fullMatch = sbA.x0 === 30 && sbA.y0 === 40 && sbA.x1 === 80 && sbA.y1 === 100 &&
                              sbA.anchorX === 100 && sbA.anchorY === 180;

            // 5B: Cropped & scaled:
            // Crop sx=20, sy=30, sw=70, sh=80.
            // Rect (30, 40, 50, 60) in crop is: localX = 30-20=10, localY = 40-30=10, localW = 50, localH = 60.
            // Target scale 2x: width = 140, height = 160.
            // Scaled rect expected: x0 = 10*2 = 20, y0 = 10*2 = 20, x1 = (10+50)*2 = 120, y1 = (10+60)*2 = 140.
            const synthSpriteB = {
                image: synthCv,
                sx: 20, sy: 30, sw: 70, sh: 80,
                width: 140, height: 160,
                anchorX: 70, anchorY: 150,
            };
            const sbB = window.__DO__.sampleObstacleSprite(synthSpriteB, 'synth-cropped-scaled');
            const cropScaleMatch = sbB.x0 === 20 && sbB.y0 === 20 && sbB.x1 === 120 && sbB.y1 === 140 &&
                                   sbB.anchorX === 70 && sbB.anchorY === 150;

            tests.push({
                name: '5. Controlled synthetic crop, scale, and anchor math',
                pass: fullMatch && cropScaleMatch,
                detail: `full=[${sbA.x0},${sbA.y0},${sbA.x1},${sbA.y1}] cropScaled=[${sbB.x0},${sbB.y0},${sbB.x1},${sbB.y1}]`,
            });
        } catch (err) {
            tests.push({ name: '5. Controlled synthetic crop, scale, and anchor math', pass: false, detail: err.message });
        }

        // -------------------------------------------------------------
        // 6. Negative controls (empty alpha, transparent crop, invalid)
        // -------------------------------------------------------------
        try {
            // Negative Control A: Completely transparent canvas
            const emptyCv = document.createElement('canvas');
            emptyCv.width = 64;
            emptyCv.height = 64;
            let caughtEmpty = false;
            try {
                window.__DO__.sampleObstacleSprite({ image: emptyCv, width: 64, height: 64, anchorX: 32, anchorY: 32 }, 'neg-empty');
            } catch (e) {
                if (e.message.includes('empty alpha mask')) caughtEmpty = true;
            }

            // Negative Control B: Crop into transparent region
            const partialCv = document.createElement('canvas');
            partialCv.width = 100;
            partialCv.height = 100;
            const pCtx = partialCv.getContext('2d');
            pCtx.fillStyle = 'rgba(255, 0, 0, 1)';
            pCtx.fillRect(0, 0, 20, 20); // only top-left has pixels
            let caughtEmptyCrop = false;
            try {
                // Crop at (50, 50, 40, 40) where alpha is 0
                window.__DO__.sampleObstacleSprite({ image: partialCv, sx: 50, sy: 50, sw: 40, sh: 40, width: 40, height: 40, anchorX: 20, anchorY: 20 }, 'neg-crop');
            } catch (e) {
                if (e.message.includes('empty alpha mask')) caughtEmptyCrop = true;
            }

            // Negative Control C: Null sprite / invalid image
            let caughtInvalid = false;
            try {
                window.__DO__.sampleObstacleSprite(null, 'neg-null');
            } catch (e) {
                caughtInvalid = true;
            }

            const negPassed = caughtEmpty && caughtEmptyCrop && caughtInvalid;
            tests.push({
                name: '6. Negative controls (empty mask, empty crop, null sprite)',
                pass: negPassed,
                detail: `caughtEmpty=${caughtEmpty}, caughtEmptyCrop=${caughtEmptyCrop}, caughtInvalid=${caughtInvalid}`,
            });
        } catch (err) {
            tests.push({ name: '6. Negative controls', pass: false, detail: err.message });
        }

        return tests;
    });

    for (const t of checkData) {
        check(t.name, t.pass, t.detail);
    }

    if (pageErrors.length > 0) {
        check('Page errors check', false, pageErrors.join('; '));
    }

    await ctx.close();
} catch (err) {
    console.error('[oracle-sprite-check] Unexpected failure:', err);
    failed = true;
} finally {
    try { await browser.close(); } finally { await server.close(); }
}

if (failed) {
    console.error('\n[oracle-sprite-check] RESULT: FAILED');
    process.exit(1);
} else {
    console.log('\n[oracle-sprite-check] RESULT: ALL PASS');
    process.exit(0);
}
