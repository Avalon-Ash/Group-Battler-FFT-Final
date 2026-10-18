/**
 * vfx-storm.mjs — perf 量測用的特效壓力情境（perf:frames 的 battle_vfx_storm、perf:attribution）。
 *
 * 全部走真實引擎入口（2026-10-19 重寫；舊版寫的是已不存在的欄位，如 a.currentSkill／a.x／engine.vfx，大多是空轉）：
 *   - 每 BURST_MS：每個單位換一個自己陣營的奧義、補滿 MP、指定對手為目標，經 engine.initiateCast 詠唱
 *     （詠唱環、聖域、能量柱 → 奧義序列：光束、隕石、法陣、命中、浮字、死亡以外的全部）
 *   - 一半單位掛滿護盾（ShieldPainter 稜柱）
 *   - 地圖中央附近登記四種空間危害（HazardPainter 零件層，含重力中心格）
 *   - 每輪每個單位對目標發一發投射物（combat.spawnProjectile，輪替 PROJECTILE_VISUALS 外觀）＋一條光束（vfx.playBeam，輪替樣式）
 * window.__vfxStormStats() 回傳零件快取（命中／未命中／擠出、條目、位元組）與粒子數，量測端記錄 evictions。
 */

export const INJECT_VFX_STORM_SCRIPT = `
(() => {
    if (window.__vfxStormInstalled) return;
    window.__vfxStormInstalled = true;
    const BURST_MS = 600;
    const HAZARD_TYPES = ['FIRE', 'POISON', 'ICE', 'GRAVITY'];
    let timer = null;
    let round = 0;
    let mods = null;

    async function load() {
        if (mods) return mods;
        const [types, beams, proj, parts] = await Promise.all([
            import('/types.ts'),
            import('/data/vfx/beam_styles.ts'),
            import('/data/vfx/projectile_visuals.ts'),
            import('/engine/renderers/vfxparts/VFXPartStore.ts'),
        ]);
        mods = { Team: types.Team, beamStyles: Object.keys(beams.BEAM_STYLES), looks: Object.keys(proj.PROJECTILE_VISUALS), partStore: parts.vfxPartStore };
        return mods;
    }

    function registerHazards(e) {
        const cx = Math.floor(e.mapConfig.w / 2), cy = Math.floor(e.mapConfig.h / 2);
        let k = 0;
        for (let dy = -3; dy <= 3 && k < HAZARD_TYPES.length; dy += 2) {
            for (let dx = -4; dx <= 4 && k < HAZARD_TYPES.length; dx += 4) {
                const q = cx + dx - Math.floor((cy + dy) / 2), r = cy + dy;
                if (!e.isValid(q, r)) continue;
                const cells = [{ q, r }];
                for (const [a, b] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) if (e.isValid(q + a, r + b)) cells.push({ q: q + a, r: r + b });
                e.hazardSystem.registerHazard({ id: 'storm-hz-' + k, type: HAZARD_TYPES[k], cells, duration: 9999, sourceId: 'storm', team: 1, color: '#ffffff', power: 0, tickInterval: 9999, lastTickTime: e.battleTime, centerQ: q, centerR: r, pullRadius: 0 }, e);
                k++;
            }
        }
    }

    function burst(m) {
        const e = window.__TACTICAL_ENGINE__;
        if (!e || !e.agents) return;
        const vfx = e.renderer && e.renderer.vfx;
        const alive = e.agents.filter((a) => a.hp > 0);
        round++;
        for (let i = 0; i < alive.length; i++) {
            const a = alive[i];
            a.hp = a.maxHp = 999999;
            const foes = alive.filter((b) => b.team !== a.team);
            const target = foes[(i + round) % Math.max(1, foes.length)];
            if (!target) continue;
            a.target = target;
            a.targetHex = { q: target.q, r: target.r };
            if (i % 2 === 0) { a.maxShield = 500; a.shield = 500; }
            // 奧義詠唱（輪替同陣營的奧義）
            if (a.castingSkillIdx === -1) {
                const ults = e.skillDB.filter((s) => s.tag === 'ULT' && s.team === a.team);
                const skill = ults[(i + round) % ults.length];
                if (skill) {
                    a.skillIds[0] = skill.id;
                    a.skills[0] = skill;
                    a.mp = a.maxMp;
                    e.initiateCast(a, 0);
                }
            }
            // 投射物＋光束
            const look = m.looks[(i + round) % m.looks.length];
            e.combat.spawnProjectile(a, { id: 'storm-proj-' + look, name: look, type: 'SINGLE', tag: 'ACTIVE', power: 0, cast: 0, cd: 0, range: 99, color: '#ffffff', projectileSpeed: 420, visualProjectileEffect: look }, e);
            if (vfx) {
                const style = m.beamStyles[(i + round) % m.beamStyles.length];
                vfx.playBeam(style, { x: a.px, y: a.py, z: 30 }, { x: target.px, y: target.py, z: 30 }, undefined, 0.4, 1, a.team);
            }
        }
        e.bus.emit('CAMERA_SHAKE', { intensity: 0.2 });
    }

    window.__startVfxStorm = async function () {
        const e = window.__TACTICAL_ENGINE__;
        if (!e) { console.warn('[VFX_STORM] engine not found'); return; }
        const m = await load();
        registerHazards(e);
        burst(m);
        if (timer) clearInterval(timer);
        timer = setInterval(() => burst(m), BURST_MS);
    };

    window.__stopVfxStorm = function () {
        if (timer) clearInterval(timer);
        timer = null;
    };

    window.__vfxStormStats = function () {
        const e = window.__TACTICAL_ENGINE__;
        const s = mods ? mods.partStore.stats() : null;
        return {
            rounds: round,
            parts: s && { ...s, entries: mods.partStore.size(), bytes: mods.partStore.bytes(), byKind: mods.partStore.statsByKind(), top: mods.partStore.dump().slice(0, 8) },
            particles: e && e.renderer && e.renderer.vfx ? e.renderer.vfx.state.particles.length : 0,
            hazards: e ? e.state.spatialHazards.length : 0,
        };
    };
})();
`;

export async function injectVfxStorm(page) {
    await page.evaluate(INJECT_VFX_STORM_SCRIPT);
}

export async function startVfxStorm(page, options = {}) {
    await injectVfxStorm(page);
    await page.evaluate(async (opts) => {
        await window.__startVfxStorm?.(opts);
    }, options);
}

export async function stopVfxStorm(page) {
    return page.evaluate(() => {
        const stats = window.__vfxStormStats?.();
        window.__stopVfxStorm?.();
        return stats;
    });
}
