import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { clickDice, launchBrowser, START_TEXT } from './lib/perf-common.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = join(here, 'out', 'layers');
const assertOrder = process.argv.includes('--assert-order');

// These standalone scripts do not export their fixtures. Read the specific
// expressions in place so the probe follows the existing clock and luma rule.
function fixture(file, pattern) {
    const value = readFileSync(join(here, file), 'utf8').match(pattern)?.[1];
    if (!value) throw new Error(`Probe fixture changed in ${file}: ${pattern}`);
    return value;
}

const fidelity = 'render-fidelity.mjs';
const initClock = fixture(fidelity, /await page\.addInitScript\((\(\) => \{[\s\S]*?)(?=\s*\/\/ Comparison helper)/) + '\n}';
const map = JSON.parse(fixture(fidelity, /^const FIDELITY_MAP = (\{[^\n]+\});/m)
    .replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
const lumaFormula = fixture('terrain-contrast.mjs', /luma: \+\(([\d.]+ \* R \+ [\d.]+ \* G \+ [\d.]+ \* B)\)\.toFixed/);
const mobileUA = fixture('perf-mobile-emu.mjs', /userAgent: '([^']+)'/);

const devices = {
    desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    mobile: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: mobileUA },
};

const palette = {
    background: [63, 75, 105],
    terrainTop: [82, 160, 214],
    terrainSide: [99, 80, 207],
    obstacle: [74, 202, 103],
    unit: [255, 66, 111],
    vfx: [255, 149, 56],
    hud: [255, 228, 85],
};
const alphaMin = 64;
const biomeFrames = 36;

// Runs in the page. Painter scopes tag real Canvas calls, retaining their
// native order, paths, clip, image alpha, smoothing, and device transforms.
async function installProbe({ palette, alphaMin, lumaFormula }) {
    const [
        { RenderPipeline }, { RenderDispatcher }, { RenderOpType }, { TerrainRenderer },
        { HexGeometry }, { VisualMath }, { UnitBodyPainter }, { UnitAfterimagePainter },
        { FrozenPainter }, { StatusArtPainter }, { UnitCorePainter }, { UnitShadowPainter },
        { SilhouetteMask }, { GroundDrapeLayer }, { PostProcessor },
    ] = await Promise.all([
        import('/engine/renderers/RenderPipeline.ts'),
        import('/engine/renderers/RenderDispatcher.ts'),
        import('/engine/renderers/RenderList.ts'),
        import('/engine/renderers/grid/TerrainRenderer.ts'),
        import('/engine/graphics/utils/HexGeometry.ts'),
        import('/engine/math/VisualMath.ts'),
        import('/engine/renderers/units/painters/UnitBodyPainter.ts'),
        import('/engine/renderers/units/painters/UnitAfterimagePainter.ts'),
        import('/engine/renderers/units/painters/FrozenPainter.ts'),
        import('/engine/renderers/status/painters/StatusArtPainter.ts'),
        import('/engine/renderers/units/painters/UnitCorePainter.ts'),
        import('/engine/renderers/units/painters/UnitShadowPainter.ts'),
        import('/engine/renderers/units/SilhouetteMask.ts'),
        import('/engine/renderers/GroundDrape.ts'),
        import('/engine/renderers/PostProcessor.ts'),
    ]);

    const keys = Object.keys(palette);
    const tags = Object.fromEntries(keys.map((key, i) => [key, i]));
    const luma = new Function('R', 'G', 'B', `return ${lumaFormula}`);
    const topShapes = new WeakMap();
    const makeCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
    const bakeBlock = TerrainRenderer.bakeBlock;
    TerrainRenderer.bakeBlock = function (...args) {
        const [, , height, , , , , floatOffset, scale] = args;
        const getVertices = HexGeometry.getVertices;
        let vertices;
        HexGeometry.getVertices = function (...vertexArgs) {
            const result = getVertices.apply(this, vertexArgs);
            vertices ??= result;
            return result;
        };
        let sprite;
        try { sprite = bakeBlock.apply(this, args); }
        finally { HexGeometry.getVertices = getVertices; }
        if (!vertices) throw new Error('No hex path from TerrainRenderer.bakeBlock');
        const y = VisualMath.getIsoVisualY(0, height, floatOffset);
        const path = new Path2D();
        vertices.forEach((v, i) => path[i ? 'lineTo' : 'moveTo'](
            (sprite.anchorX + v.x) * scale, (sprite.anchorY + y + v.y) * scale));
        path.closePath();
        topShapes.set(sprite.canvas, { path });
        return sprite;
    };

    let frame;
    let tag = null;
    let armed = false;
    let captured;
    function scoped(owner, method, getTag) {
        const original = owner[method];
        if (typeof original !== 'function') throw new Error(`Missing painter method ${method}`);
        owner[method] = function (...args) {
            if (!frame || args[0] !== frame.proxy) return original.apply(this, args);
            const previous = tag;
            tag = getTag(...args);
            try { return original.apply(this, args); }
            finally { tag = previous; }
        };
    }

    const opTags = {
        [RenderOpType.TERRAIN]: tags.terrainTop,
        [RenderOpType.OBSTACLE]: tags.obstacle,
        [RenderOpType.UNIT]: null,
        [RenderOpType.CORPSE]: tags.vfx,
        [RenderOpType.OVERLAY]: tags.hud,
        [RenderOpType.VFX]: tags.vfx,
        [RenderOpType.PROJECTILE]: tags.vfx,
        [RenderOpType.HAZARD]: tags.vfx,
        [RenderOpType.AURA]: tags.vfx,
    };
    scoped(RenderDispatcher, 'dispatch', (_ctx, op) => {
        if (!(op.type in opTags)) throw new Error(`Unknown RenderOp ${op.type}`);
        return opTags[op.type];
    });
    scoped(GroundDrapeLayer.prototype, 'drawOnTile', () => tags.vfx);
    scoped(SilhouetteMask, 'draw', () => tags.vfx);
    scoped(UnitBodyPainter, 'draw', (_ctx, agent, _px, _py, _t, isSilhouette) => {
        if (isSilhouette) return tags.vfx;
        return frame.unitLabel(agent.id);
    });
    scoped(UnitShadowPainter, 'draw', () => tags.terrainTop);
    for (const painter of [UnitCorePainter, UnitAfterimagePainter, FrozenPainter]) {
        scoped(painter, 'draw', () => tags.vfx);
    }
    for (const method of ['root', 'torso', 'stars']) scoped(StatusArtPainter, method, () => tags.vfx);
    for (const method of ['apply', 'applyToneGrade', 'applyFinishBlur']) {
        scoped(PostProcessor.prototype, method, () => null);
    }

    const stateMethods = new Set([
        'save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform',
        'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo',
        'ellipse', 'rect', 'roundRect', 'clip', 'setLineDash',
    ]);
    const paintMethods = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText']);

    function createFrame(real) {
        const { width, height } = real.canvas;
        const mask = makeCanvas(width, height).getContext('2d', { willReadFrequently: true });
        const blank = mask.createImageData(width, height);
        const owners = new Uint32Array(width * height); // zero = background
        const unitIds = [];
        const unitLabels = new Map();
        const unitLabel = (id) => {
            if (!unitLabels.has(id)) {
                unitLabels.set(id, keys.length + unitIds.length);
                unitIds.push(id);
            }
            return unitLabels.get(id);
        };

        let pending = null;
        let bounds;
        function flush() {
            if (!bounds) return;
            const [x, y, right, bottom] = bounds;
            const w = right - x, h = bottom - y;
            const pixels = mask.getImageData(x, y, w, h).data;
            for (let row = 0; row < h; row++) {
                const source = row * w * 4 + 3, dest = (y + row) * width + x;
                for (let col = 0; col < w; col++) {
                    if (pixels[source + col * 4] >= alphaMin) owners[dest + col] = pending;
                }
            }
            // ImageData clears pixels without changing the active path or clip.
            mask.putImageData(blank, 0, 0, x, y, w, h);
            bounds = undefined;
        }

        function paint(key, args, label) {
            if (label === null || mask.globalAlpha === 0) return;
            if (label !== pending) flush();
            pending = label;
            let rect = [0, 0, width, height];
            if (key === 'drawImage' && mask.filter === 'none' && mask.shadowBlur === 0 &&
                mask.shadowOffsetX === 0 && mask.shadowOffsetY === 0) {
                const [image, dx, dy] = args;
                const [x, y, w, h] = args.length === 3
                    ? [dx, dy, image.naturalWidth ?? image.width, image.naturalHeight ?? image.height]
                    : args.slice(-4);
                const m = mask.getTransform();
                const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
                    .map(([cx, cy]) => m.transformPoint({ x: cx, y: cy }));
                rect = [
                    Math.max(0, Math.floor(Math.min(...corners.map(p => p.x))) - 1),
                    Math.max(0, Math.floor(Math.min(...corners.map(p => p.y))) - 1),
                    Math.min(width, Math.ceil(Math.max(...corners.map(p => p.x))) + 1),
                    Math.min(height, Math.ceil(Math.max(...corners.map(p => p.y))) + 1),
                ];
            }
            if (rect[0] >= rect[2] || rect[1] >= rect[3]) return;
            bounds = bounds ? [
                Math.min(bounds[0], rect[0]), Math.min(bounds[1], rect[1]),
                Math.max(bounds[2], rect[2]), Math.max(bounds[3], rect[3]),
            ] : rect;
            mask[key](...args);
        }

        const methods = new Map();
        const proxy = new Proxy(real, {
            get(target, key) {
                const value = Reflect.get(target, key, target);
                if (typeof value !== 'function') return value;
                if (!methods.has(key)) methods.set(key, (...args) => {
                    const result = value.apply(target, args);
                    if (stateMethods.has(key)) mask[key](...args);
                    if (paintMethods.has(key)) {
                        const shape = key === 'drawImage' && tag === tags.terrainTop && topShapes.get(args[0]);
                        if (shape) {
                            if (!shape.image) {
                                const source = args[0];
                                shape.image = makeCanvas(source.width, source.height);
                                const top = shape.image.getContext('2d');
                                top.clip(shape.path);
                                top.drawImage(source, 0, 0);
                            }
                            paint(key, args, tags.terrainSide);
                            paint(key, [shape.image, ...args.slice(1)], tags.terrainTop);
                        } else paint(key, args, tag);
                    }
                    return result;
                });
                return methods.get(key);
            },
            set(target, key, value) {
                if (key !== 'globalCompositeOperation') Reflect.set(mask, key, value, mask);
                return Reflect.set(target, key, value, target);
            },
        });
        return { proxy, flush, owners, unitIds, unitLabel };
    }

    const draw = RenderPipeline.prototype.draw;
    RenderPipeline.prototype.draw = function (ctx, ...args) {
        if (!armed) return draw.call(this, ctx, ...args);
        armed = false;
        frame = createFrame(ctx);
        // Wrap instance methods once. Offscreen calls keep their original behavior.
        if (!instrumented.has(this)) {
            for (const method of ['drawOverlay', 'drawPlayerArrows', 'drawHUD', 'drawDebug']) {
                scoped(this.tactical, method, () => tags.hud);
            }
            scoped(this.hud, 'draw', () => tags.hud);
            scoped(this.ultWorld, 'draw', () => tags.vfx);
            scoped(args[0].renderer.statusOrchestrator, 'draw', () => tags.vfx);
            instrumented.add(this);
        }
        try {
            draw.call(this, frame.proxy, ...args);
            frame.flush();
            captured = { ...frame, ctx, transition: this.transitionPhase };
        } finally { frame = undefined; }
    };
    const instrumented = new WeakSet();

    function quantile(sorted, p) {
        if (!sorted.length) return null;
        const i = (sorted.length - 1) * p;
        const lo = Math.floor(i), hi = Math.ceil(i);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
    }

    function summarize(values, percentiles) {
        const sorted = values.sort((a, b) => a - b);
        return {
            ...Object.fromEntries(percentiles.map(p => [`p${p}`, quantile(sorted, p / 100)])),
            mean: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null,
        };
    }

    window.__captureLayerProbe = async (frames, viewport) => {
        const [{ HexUtils }, { HEX_SIZE }, { getRenderDpr }] = await Promise.all([
            import('/engine/utils.ts'),
            import('/constants.ts'),
            import('/engine/renderers/RenderQuality.ts'),
        ]);
        window.__stepFrames(frames - 1);
        const engine = window.__TACTICAL_ENGINE__;
        // Sample the whole board at the existing freeze time. A director
        // close-up can put living units outside the viewport.
        const centers = [...engine.map.getMapKeys()].map(key => {
            const [q, r] = key.split(',').map(Number);
            const { x, y } = HexUtils.toPx(q, r, engine.mapConfig);
            return { x, y: VisualMath.getIsoVisualY(y, engine.getTerrainHeight(q, r)) };
        });
        const xs = centers.map(p => p.x), ys = centers.map(p => p.y);
        const left = Math.min(...xs), right = Math.max(...xs);
        const top = Math.min(...ys), bottom = Math.max(...ys);
        const padding = 4 * HEX_SIZE;
        engine.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
        engine.bus.emit('UI_COMMAND', {
            type: 'CAMERA_SNAP',
            x: (left + right) / 2,
            y: (top + bottom) / 2,
            zoom: Math.min(engine.screenW / (right - left + padding), engine.screenH / (bottom - top + padding)),
        });
        captured = undefined;
        armed = true;
        window.__stepFrames(1);
        if (!captured) throw new Error('No RenderPipeline frame captured');
        const { ctx, owners, unitIds, transition } = captured;
        captured = undefined;
        const dpr = window.devicePixelRatio;
        const { width, height } = ctx.canvas;
        const original = ctx.getImageData(0, 0, width, height);
        const gray = new ImageData(width, height), overlay = new ImageData(width, height);
        const labels = new ImageData(width, height);
        const buckets = keys.map(() => ({ luma: [], sat: [] }));
        const unitLuma = unitIds.map(() => []);
        for (let pixel = 0; pixel < owners.length; pixel++) {
            const owner = owners[pixel];
            const layer = owner < keys.length ? owner : tags.unit;
            const i = pixel * 4;
            const r = original.data[i], g = original.data[i + 1], b = original.data[i + 2];
            const y = luma(r, g, b);
            const max = Math.max(r, g, b);
            buckets[layer].luma.push(y);
            buckets[layer].sat.push(max ? (max - Math.min(r, g, b)) / max : 0);
            if (owner >= keys.length) unitLuma[owner - keys.length].push(y);
            for (let channel = 0; channel < 3; channel++) {
                gray.data[i + channel] = y;
                overlay.data[i + channel] = y * 0.55 + palette[keys[layer]][channel] * 0.45;
                labels.data[i + channel] = (owner >>> (8 * channel)) & 255;
            }
            gray.data[i + 3] = overlay.data[i + 3] = labels.data[i + 3] = 255;
        }

        const layers = {};
        const metrics = ({ luma, sat }) => ({ count: luma.length, luma: summarize(luma, [5, 50, 95]), sat: summarize(sat, [50, 95]) });
        layers.terrain = metrics({
            luma: buckets[tags.terrainTop].luma.concat(buckets[tags.terrainSide].luma),
            sat: buckets[tags.terrainTop].sat.concat(buckets[tags.terrainSide].sat),
        });
        keys.forEach((key, i) => { layers[key] = metrics(buckets[i]); });

        const units = [];
        const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
        unitLuma.forEach((values, i) => {
            if (!values.length) return;
            values.sort((a, b) => a - b);
            const n = Math.max(1, Math.floor(values.length / 4));
            const dark = mean(values.slice(0, n)), light = mean(values.slice(-n));
            units.push({ id: unitIds[i], count: values.length, dark, light, ratio: dark > 0 ? light / dark : null });
        });
        const ratios = units.flatMap(u => u.ratio === null ? [] : [u.ratio]).sort((a, b) => a - b);

        const panelWidth = viewport.width * dpr, panelHeight = viewport.height * dpr;
        const triptych = makeCanvas(panelWidth * 3, panelHeight);
        const panel = triptych.getContext('2d');
        const tile = makeCanvas(width, height).getContext('2d');
        tile.putImageData(labels, 0, 0);
        const maskPng = tile.canvas.toDataURL('image/png').split(',')[1];
        [original, gray, overlay].forEach((image, i) => {
            tile.putImageData(image, 0, 0);
            panel.drawImage(tile.canvas, i * panelWidth, 0, panelWidth, panelHeight);
        });
        return {
            png: triptych.toDataURL('image/png').split(',')[1],
            width, height, panelWidth, panelHeight, dpr, renderDpr: getRenderDpr(), transition, layers, units,
            mask: { pngBase64: maskPng, labels: [...keys, ...unitIds.map(id => `unit:${id}`)] },
            camera: { x: engine.renderer.camera.x, y: engine.renderer.camera.y, zoom: engine.renderer.camera.zoom },
            biome: engine.currentScene.id, tick: engine.state.time.tick,
            liveIds: engine.agents.filter(agent => agent.hp > 0 && !agent.banished && !agent.fullyDead).map(agent => agent.id),
            unitRatioMedian: quantile(ratios, 0.5),
        };
    };
}

async function measureDevice(browser, url, device, options) {
    const context = await browser.newContext(options);
    const rows = [];
    async function createPage() {
        const page = await context.newPage();
        await page.addInitScript({ content: `(${initClock})();` });
        await page.goto(`${url}?quality=0&mute`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__ASSETS_READY__ && window.__TACTICAL_ENGINE__?.renderer,
            null, { polling: 100, timeout: 15000 });
        await page.evaluate(installProbe, { palette, alphaMin, lumaFormula });
        await page.evaluate(() => { window.__resetSeed(1337); window.__stepFrames(10); });
        await page.getByText(START_TEXT).evaluate(button => button.click());
        await page.waitForTimeout(400);
        await page.evaluate(() => window.__stepFrames(10));
        return page;
    }

    async function rebuild(page, sceneId, seed) {
        await page.evaluate(async ({ sceneId, seed, map }) => {
            const { SCENE_DB } = await import('/data/scenes.ts');
            const { seedSetupStream } = await import('/engine/math/rng.ts');
            window.__resetSeed(seed);
            seedSetupStream(seed);
            const engine = window.__TACTICAL_ENGINE__;
            engine.currentScene = SCENE_DB.find(scene => scene.id === sceneId);
            if (!engine.currentScene) throw new Error(`Unknown scene ${sceneId}`);
            Object.assign(engine.mapConfig, map);
            engine.map.rebuildMap(engine);
        }, { sceneId, seed, map });
    }

    async function seedRoster(page) {
        await page.evaluate(async () => (await import('/engine/math/rng.ts')).seedSetupStream(42));
        await clickDice(page);
        await page.waitForTimeout(200);
        await page.evaluate(async () => {
            window.__stepFrames(5);
            const { spriteAtlasStore } = await import('/engine/renderers/units/SpriteAtlasStore.ts');
            await spriteAtlasStore.readyPromise;
            if (!window.__UNIT_ASSETS_READY__) throw new Error('Roster atlases not ready');
        });
    }

    async function capture(page, scene, frames) {
        const { png, ...row } = await page.evaluate(({ frames, viewport }) => window.__captureLayerProbe(frames, viewport),
            { frames, viewport: options.viewport });
        const file = `${scene}_${device}.png`;
        writeFileSync(join(out, file), Buffer.from(png, 'base64'));
        rows.push({ scene, device, file, ...row });
        console.log(`Captured ${file} (${row.width}×${row.height} native, tick ${row.tick})`);
    }

    try {
        const page = await createPage();
        const sceneIds = await page.evaluate(async () => (await import('/data/scenes.ts')).SCENE_DB.map(scene => scene.id));
        // The baseline biome fixture has no roster. Deal the same seeded
        // roster on each map and allow the native spawn fade to finish.
        for (const sceneId of sceneIds) {
            await rebuild(page, sceneIds[0], 42);
            await page.evaluate(() => window.__stepFrames(5));
            await seedRoster(page);
            await rebuild(page, sceneId, 1337);
            await page.evaluate(() => window.__TACTICAL_ENGINE__.play());
            await capture(page, sceneId, biomeFrames);
            await page.evaluate(() => window.__TACTICAL_ENGINE__.stop());
        }
        await page.close();

        const battle = await createPage();
        await rebuild(battle, sceneIds[0], 42);
        await battle.evaluate(() => window.__stepFrames(5));
        await seedRoster(battle);
        await battle.evaluate(() => window.__TACTICAL_ENGINE__.play());
        await capture(battle, 'battle_frozen', 120);
        return rows;
    } finally { await context.close(); }
}

function check(rows) {
    const packing = [];
    const order = [];
    for (const row of rows) {
        const name = `${row.scene}/${row.device}`;
        const { layers, liveIds, units } = row;
        const count = Object.keys(palette).reduce((sum, key) => sum + layers[key].count, 0);
        const visible = new Set(units.map(unit => unit.id));
        const expected = new Set(liveIds);
        const missing = liveIds.filter(id => !visible.has(id));
        const extra = [...visible].filter(id => !expected.has(id));
        row.coverage = { count, visibleUnits: visible.size, liveUnits: liveIds.length, unitDelta: visible.size - liveIds.length, missing, extra };
        if (count !== row.width * row.height) packing.push(`${name}: ${count} labelled pixels, expected ${row.width * row.height}`);
        if (row.transition !== 'IDLE') packing.push(`${name}: captured during transition ${row.transition}`);
        if (!layers.unit.count || missing.length || extra.length) {
            packing.push(`${name}: ${layers.unit.count} body pixels, ${visible.size}/${liveIds.length} units, ` +
                `delta ${row.coverage.unitDelta}, missing [${missing}], extra [${extra}]`);
        }
        for (const [a, b, strict] of [['terrain', 'unit', true], ['unit', 'vfx', true], ['obstacle', 'unit', false]]) {
            const first = layers[a].luma.p50, second = layers[b].luma.p50;
            if (first === null || second === null || (strict ? first >= second : first > second)) {
                order.push(`${name}: ${a} (${first?.toFixed(2) ?? 'no pixels'}) ${strict ? '<' : '<='} ${b} (${second?.toFixed(2) ?? 'no pixels'})`);
            }
        }
    }
    return { packing, order };
}

mkdirSync(out, { recursive: true });
console.log(`layer-luma-probe pid=${process.pid}`);
const server = await createServer({ server: { port: 3196, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser;
try {
    await server.listen();
    browser = await launchBrowser({ headed: false });
    const rows = [];
    for (const [device, options] of Object.entries(devices)) {
        rows.push(...await measureDevice(browser, server.resolvedUrls.local[0], device, options));
    }
    const { packing, order } = check(rows);
    const display = value => value === null ? '—' : value.toFixed(3);
    console.table(rows.flatMap(row => Object.entries(row.layers).map(([layer, stats]) => ({
        scene: row.scene, device: row.device, layer, px: stats.count,
        y05: display(stats.luma.p5), y50: display(stats.luma.p50), y95: display(stats.luma.p95), yAvg: display(stats.luma.mean),
        s50: display(stats.sat.p50), s95: display(stats.sat.p95), sAvg: display(stats.sat.mean),
        ...(layer === 'unit' ? { ratio: display(row.unitRatioMedian), units: `${row.coverage.visibleUnits}/${row.coverage.liveUnits}`, delta: row.coverage.unitDelta } : {}),
    }))));
    writeFileSync(join(out, 'layers.json'), JSON.stringify({ lumaFormula, saturation: 'HSV S', alphaMin, palette, devices, rows, packing, order }, null, 2) + '\n');
    for (const line of packing) console.error(`[coverage] ${line}`);
    for (const line of order) console.log(`[order] ${line}`);
    console.log(`${rows.length} captures; ${packing.length} coverage failures; ${order.length} order failures (${assertOrder ? 'asserted' : 'reported'})`);
    if (packing.length || (assertOrder && order.length)) process.exitCode = 1;
} finally {
    try { await browser?.close(); }
    finally { await server.close(); }
}
