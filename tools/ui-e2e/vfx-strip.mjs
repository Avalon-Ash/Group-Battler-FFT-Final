import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { desktopProbe, openFrozenPage, rebuildFrozenMap } from './lib/frozen-battle.mjs';
import { launchBrowser } from './lib/perf-common.mjs';

const STEP_S = 0.05;
const MAX_FRAMES = 60;
const SEED = 1337;
const out = fileURLToPath(new URL('./out/vfx-strip/', import.meta.url));

async function skillList({ ids, teamName, biome }) {
    const [{ DEFAULT_SKILL_DB }, { Role, Team }, { SCENE_DB }, { roleSkills }] = await Promise.all([
        import('/skillDatabase.ts'),
        import('/types.ts'),
        import('/data/scenes.ts'),
        import('/engine/core/SkillQueries.ts'),
    ]);
    if (!SCENE_DB.some(scene => scene.id === biome)) throw new Error('Unknown biome: ' + biome);
    const team = Team[teamName ?? 'BLUE'];
    if (ids.length) {
        return ids.map(id => {
            const skill = DEFAULT_SKILL_DB.find(entry => entry.id === id);
            if (!skill) throw new Error('Unknown skill: ' + id);
            return { id, role: skill.role, tag: skill.tag, team: teamName ? team : (skill.team ?? team) };
        });
    }
    return Object.values(Role).flatMap(role => {
        const options = roleSkills(DEFAULT_SKILL_DB, role, team);
        const preferred = ['ULT', 'ACTIVE'].map(tag => options.find(skill => skill.tag === tag)).filter(Boolean);
        const extras = options.filter(skill => skill.tag !== 'BASIC' && !preferred.includes(skill));
        return [...preferred, ...extras].slice(0, 2).map(({ id, tag }) => ({ id, role, tag, team }));
    });
}

// Runs in the page. Only the harness owns the clock and issues the one cast.
async function captureStrip({ id, team, step, maxFrames }) {
    const [
        { NodeState, Role, Team }, { skillTeams, targetModeOf }, { stepSimulation, SIM_STEP_S },
        { HexUtils }, { HEX_SIZE }, { getRenderDpr }, { spriteAtlasStore }, { ultFeelStore }, { Agent },
    ] = await Promise.all([
        import('/types.ts'),
        import('/engine/core/SkillQueries.ts'),
        import('/engine/core/Replay.ts'),
        import('/engine/utils.ts'),
        import('/constants.ts'),
        import('/engine/renderers/RenderQuality.ts'),
        import('/engine/renderers/units/SpriteAtlasStore.ts'),
        import('/engine/presentation/vfx/UltFeelStore.ts'),
        import('/engine/core/Agent.ts'),
    ]);

    const e = window.__TACTICAL_ENGINE__;
    const renderer = e.renderer;
    const cmd = command => e.bus.emit('UI_COMMAND', command);
    const skill = e.skillDB.find(entry => entry.id === id);
    if (!skill) throw new Error('Skill unavailable in the engine: ' + id);
    const substeps = Math.round(step / SIM_STEP_S);
    if (Math.abs(substeps * SIM_STEP_S - step) > 1e-9) throw new Error('Sample spacing must be a whole number of simulation ticks');

    cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
    cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    const targetTeam = skillTeams(skill) === 'ALLY' ? team : (team === Team.BLUE ? Team.RED : Team.BLUE);
    const mode = targetModeOf(skill);
    const tiles = [...e.map.getMapKeys()].map(key => {
        const [q, r] = key.split(',').map(Number);
        return { q, r };
    }).filter(h => !e.isBlocked(h.q, h.r));
    const standIns = tiles.map(tile => new Agent(HexUtils.key(tile), team, tile.q, tile.r, e.mapConfig));
    const preview = Object.assign(Object.create(e), { agents: standIns });
    const occluded = new Set(renderer.grid.getOcclusionSources(preview).map(entry => entry.agent.id));
    const visible = hex => !occluded.has(HexUtils.key(hex));
    const tileHeight = hex => e.getTerrainHeight(hex.q, hex.r);
    const origin = { q: 0, r: 0 };
    const preferredDistance = Math.max(1, Math.min(3, skill.range, Math.floor(skill.range / 2) + 1));
    const pairs = [];
    for (const source of tiles) {
        for (const target of tiles) {
            if (source === target) continue;
            const distance = HexUtils.dist(source, target);
            if (distance > preferredDistance) continue;
            pairs.push({
                source, target, visibleUnits: Number(visible(source)) + Number(visible(target)),
                distance, heightDelta: Math.abs(tileHeight(source) - tileHeight(target)),
                centerDistance: HexUtils.dist(source, origin) + HexUtils.dist(target, origin),
            });
        }
    }
    const pair = pairs.sort((a, b) => b.visibleUnits - a.visibleUnits || b.distance - a.distance ||
        a.heightDelta - b.heightDelta || a.centerDistance - b.centerDistance)[0];
    if (!pair) throw new Error('No free pair of tiles in casting range');
    const { source: sourceHex, target: targetHex } = pair;

    cmd({ type: 'PLACE_AGENT', team, ...sourceHex, hp: 100000, role: skill.role });
    cmd({ type: 'PLACE_AGENT', team: targetTeam, ...targetHex, hp: 100000, role: Role.TANK });
    const [caster, target] = e.agents;
    if (e.agents.length !== 2) throw new Error('Expected exactly one caster and one target');
    cmd({ type: 'SET_AGENT_SKILL', agentId: caster.id, skillId: id, slot: 0 });
    spriteAtlasStore.syncRoster(e.agents);
    await spriteAtlasStore.readyPromise;

    e.play();
    for (const agent of e.agents) agent.bt = null;
    if (targetTeam === team) target.hp = target.maxHp / 2;
    caster.mp = caster.maxMp;
    // The encounter never ends by team count, so an allied target can receive heals and shields.
    e.victorySystem.check = () => false;
    // Idle particles have no cast owner and do not define the end of a skill.
    renderer.vfx.agentVFX.processIdleVFX = () => {};
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const { width, height } = canvas;
    if (!width || !height) throw new Error('Battle canvas is empty');
    const dpr = getRenderDpr();

    function advance() {
        window.__advanceProbeClock(SIM_STEP_S * 1000);
        stepSimulation(e);
        renderer.update(SIM_STEP_S, e);
    }
    function draw() {
        renderer.draw(ctx, e, renderer.camera, null, 0, null, null, e.battleTime, e.battleTime);
    }

    // Let the normal spawn animation finish before recording the pre-cast frame.
    while (e.agents.some(agent => agent.spawnTimer > 0)) advance();
    draw();
    const focus = e.agents.map(agent => renderer.pipeline.frames.get(agent));
    renderer.camera.snapTo((focus[0].footX + focus[1].footX) / 2,
        (focus[0].bodyCenterY + focus[1].bodyCenterY) / 2, 1);

    const positions = [];
    const frames = [];
    function sample() {
        draw();
        ctx.save();
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        renderer.camera.applyTransform(ctx, width / dpr, height / dpr);
        const transform = ctx.getTransform();
        ctx.restore();
        const screen = (agent, previous) => {
            const frame = renderer.pipeline.frames.get(agent);
            if (!frame) return previous;
            const { x, y } = transform.transformPoint({ x: frame.footX, y: frame.bodyCenterY });
            return { x, y };
        };
        const previous = positions.at(-1);
        positions.push({ caster: screen(caster, previous?.caster), target: screen(target, previous?.target) });
        frames.push(ctx.getImageData(0, 0, width, height));
    }

    let hitIndex = null;
    let selfHitIndex = null;
    let areaIndex = null;
    let areaEvent = null;
    let releaseIndex = null;
    e.bus.on('GAME_EVENT', event => {
        if (event.sourceId !== caster.id || (event.skillId ?? event.skill?.id) !== id) return;
        if (event.type === 'CAST_FINISH') releaseIndex ??= frames.length;
        if (event.type === 'CAST_BREAK' || event.type === 'CAST_CANCEL') throw new Error('Cast was interrupted: ' + id);
        if (['IMPACT_AOE', 'HAZARD_SPAWN', 'GROUND_IMPACT', 'PROJECTILE_HIT'].includes(event.type) && areaIndex === null) {
            areaIndex = frames.length;
            areaEvent = event.type;
        }
    });
    const executor = e.combat.skillExecutor;
    const resolveHit = executor.resolveHit;
    executor.resolveHit = function (source, hitTarget, usedSkill, ...args) {
        const outcome = resolveHit.call(this, source, hitTarget, usedSkill, ...args);
        if (source === caster && usedSkill.id === id && outcome.landed) {
            if (hitTarget === target) hitIndex ??= frames.length;
            if (hitTarget === caster) selfHitIndex ??= frames.length;
        }
        return outcome;
    };

    sample();
    const updateCombat = e.combat.update;
    e.combat.update = function (...args) {
        // GameEngine clears events at the start of the tick. Queue CAST_START after that clear.
        this.update = updateCombat;
        caster.target = target;
        caster.targetHex = mode === 'SELF' ? sourceHex : targetHex;
        if (e.initiateCast(caster, 0) !== NodeState.RUNNING) throw new Error('Cast refused: ' + id);
        return updateCombat.apply(this, args);
    };

    function effectActive() {
        return caster.castingSkillIdx !== -1 ||
            e.combat._deferredCasts.length > 0 ||
            executor.multiHit.pending.length > 0 ||
            e.projectiles.some(projectile => projectile.active) ||
            renderer.sequences.actionQueue.length > 0 ||
            renderer.vfx.state.particles.some(particle => particle.weather === undefined) ||
            ultFeelStore.getActiveImpacts(e.battleTime).length > 0 ||
            e.state.spatialHazards.length > 0 ||
            renderer.hud.damageNumbers.length > 0 ||
            e.agents.some(agent => Object.values(agent.effects).some(effect => effect.remaining > 0));
    }

    const preCastTick = e.state.time.tick;
    let active;
    for (let index = 1; index < maxFrames; index++) {
        for (let sub = 0; sub < substeps; sub++) advance();
        if (e.state.time.tick !== preCastTick + index * substeps) throw new Error('Unexpected simulation tick count');
        sample();
        active = effectActive();
        if (!active) break;
    }

    const hitEvent = hitIndex !== null ? 'TARGET_HIT' : selfHitIndex !== null ? 'SELF_HIT' : areaEvent;
    hitIndex ??= selfHitIndex ?? areaIndex;
    // Support effects with no separate hit event use the release as their key frame.
    const impactIndex = hitIndex ?? releaseIndex;
    const impactKind = hitEvent ?? (releaseIndex === null ? 'NOT_REACHED' : 'CAST_FINISH');
    const endIndex = frames.length - 1;
    const points = positions.flatMap(({ caster, target }) => [caster, target]);
    const pad = 2 * HEX_SIZE * renderer.camera.zoom * dpr;
    const x = Math.max(0, Math.floor(Math.min(...points.map(point => point.x)) - pad));
    const y = Math.max(0, Math.floor(Math.min(...points.map(point => point.y)) - pad));
    const right = Math.min(width, Math.ceil(Math.max(...points.map(point => point.x)) + pad));
    const bottom = Math.min(height, Math.ceil(Math.max(...points.map(point => point.y)) + pad));
    const crop = { x, y, width: right - x, height: bottom - y };

    const sheet = document.createElement('canvas');
    sheet.width = Math.max(crop.width * frames.length, width * 3);
    sheet.height = crop.height + height;
    const output = sheet.getContext('2d');
    const before = frames[0].data;
    let maxChangedPixels = 0;
    for (const [index, frame] of frames.entries()) {
        output.putImageData(frame, index * crop.width - x, -y, x, y, crop.width, crop.height);
        if (!index) continue;
        const data = frame.data;
        let changed = 0;
        for (let row = y; row < bottom; row++) {
            for (let col = x; col < right; col++) {
                const pixel = (row * width + col) * 4;
                if (data[pixel] !== before[pixel] || data[pixel + 1] !== before[pixel + 1] ||
                    data[pixel + 2] !== before[pixel + 2]) changed++;
            }
        }
        maxChangedPixels = Math.max(maxChangedPixels, changed);
    }

    const startIndex = 1;
    output.putImageData(frames[startIndex], 0, crop.height);
    if (impactIndex !== null) output.putImageData(frames[impactIndex], width, crop.height);
    output.putImageData(frames[endIndex], 2 * width, crop.height);
    const png = sheet.toDataURL('image/png').split(',')[1];
    if (!png) throw new Error('Could not encode sheet for ' + id);
    return {
        png, frameCount: frames.length, startIndex, hitIndex, impactIndex, impactKind, endIndex,
        capped: active, maxChangedPixels, crop, canvas: { width, height }, positions, sourceHex, targetHex,
    };
}

async function record(browser, url, biome, skill) {
    const context = await browser.newContext(desktopProbe);
    try {
        const page = await openFrozenPage(context, url);
        await page.evaluate(() => {
            const engine = window.__TACTICAL_ENGINE__;
            engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        });
        await rebuildFrozenMap(page, biome, SEED);
        const { png, ...metadata } = await page.evaluate(captureStrip, {
            ...skill, step: STEP_S, maxFrames: MAX_FRAMES,
        });
        return { png: Buffer.from(png, 'base64'), metadata };
    } finally { await context.close(); }
}

async function main() {
    const { values } = parseArgs({ options: {
        skill: { type: 'string', multiple: true, default: [] },
        biome: { type: 'string', default: 'FOREST' },
        team: { type: 'string' },
        'check-determinism': { type: 'boolean' },
    } });
    const biome = values.biome.toUpperCase();
    const teamName = values.team?.toUpperCase();
    if (teamName !== undefined && !['BLUE', 'RED'].includes(teamName)) throw new Error('--team must be BLUE or RED');

    console.log('vfx-strip pid=' + process.pid);
    mkdirSync(out, { recursive: true });
    const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
    let browser;
    try {
        await server.listen();
        const url = server.resolvedUrls.local[0];
        // Fix the 2D raster path for byte comparisons, independent of GPU Canvas promotion/readback.
        browser = await launchBrowser({ headed: false, extraArgs: ['--disable-accelerated-2d-canvas'] });
        const context = await browser.newContext();
        let skills;
        try {
            const page = await context.newPage();
            await page.goto(url);
            skills = await page.evaluate(skillList, { ids: [...new Set(values.skill)], teamName, biome });
        } finally { await context.close(); }

        const rows = [];
        const failures = [];
        for (const skill of skills) {
            try {
                const { png, metadata } = await record(browser, url, biome, skill);
                const file = skill.id + '_' + biome + '.png';
                writeFileSync(join(out, file), png);
                const row = { ...skill, ...metadata, file };
                rows.push(row);
                if (!metadata.maxChangedPixels) failures.push(skill.id + ': no changed pixels in crop');
                if (values['check-determinism']) {
                    const second = await record(browser, url, biome, skill);
                    row.deterministic = png.equals(second.png);
                    if (!row.deterministic) failures.push(skill.id + ': PNG bytes differ between runs');
                }
                console.log(skill.id + ': ' + metadata.frameCount + ' frames, hit=' + (metadata.hitIndex ?? '—') +
                    ', changed=' + metadata.maxChangedPixels + (metadata.capped ? ', capped' : '') +
                    (row.deterministic === undefined ? '' : ', deterministic=' + row.deterministic));
            } catch (error) { failures.push(skill.id + ': ' + error.message); }
        }
        writeFileSync(join(out, 'strips.json'), JSON.stringify({
            biome, stepSeconds: STEP_S, maxFrames: MAX_FRAMES, strips: rows, failures,
        }, null, 2) + '\n');
        console.log(out);
        for (const failure of failures) console.error(failure);
        if (failures.length) process.exitCode = 1;
    } finally {
        try { await browser?.close(); }
        finally { await server.close(); }
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
