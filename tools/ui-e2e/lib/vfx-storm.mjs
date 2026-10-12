/**
 * vfx-storm.mjs — Heavy VFX pressure scenario generator for E2E perf measurement.
 * 
 * Simulates extreme battlefield conditions:
 *   - 10 units active skills / casting simultaneously (AOE warnings, domains, telegraphs)
 *   - Continuous burst of skills (pillars, shockwaves, rings, particles)
 *   - High-density ground hazard zones (fire, poison, ice, void fields)
 *   - Visual beams, laser lances, and slashes
 *   - Rapid damage floating texts (crits, absorbs, regular, heals)
 *   - Status auras (Poison, Regen, Shield)
 *   - Cast break / interruption visual & HUD triggers
 *   - Death / shatter / ragdoll events
 *   - Camera trauma and kill streaks
 */

export const INJECT_VFX_STORM_SCRIPT = `
(() => {
    if (window.__vfxStormInstalled) return;
    window.__vfxStormInstalled = true;

    let timer = null;
    let frameHook = null;

    window.__startVfxStorm = function(options = {}) {
        const engine = window.__TACTICAL_ENGINE__;
        if (!engine) {
            console.warn('[VFX_STORM] Engine not found on window.__TACTICAL_ENGINE__');
            return;
        }

        // Ensure agents are durable so battle does not end
        if (engine.agents) {
            for (const a of engine.agents) {
                a.hp = a.maxHp = 999999;
                // Add status effects
                a.statuses = [
                    { type: 'POISON', duration: 30, value: 50, interval: 0.5, timer: 0 },
                    { type: 'REGEN', duration: 30, value: 50, interval: 0.5, timer: 0 },
                    { type: 'SHIELD', duration: 30, value: 500, interval: 1, timer: 0 }
                ];
            }
        }

        const vfxList = [
            'FX_HAZARD_FIELD_FIRE',
            'FX_HAZARD_FIELD_POISON',
            'FX_HAZARD_FIELD_ICE',
            'FX_ACTIVE_BLUE_HOLY_SMITE',
            'FX_ACTIVE_BLUE_TECH_BURST',
            'FX_ACTIVE_BLUE_FROST_SNAP',
            'FX_ACTIVE_BLUE_ARCANE_RIPPLE',
            'FX_ACTIVE_RED_WAR_STOMP',
            'FX_ACTIVE_RED_BLOOD_RAGE',
            'FX_ACTIVE_RED_SHADOW_SCREAM',
            'FX_HIT_RED_HEAVY',
            'FX_HIT_RED_MAGMA',
            'FX_CASTING_ULT',
            'FX_CASTING_ACTIVE',
            'FX_CAST_BREAK',
            'FX_SPAWN_BLUE',
            'FX_SPAWN_RED',
            'FX_TELEPORT'
        ];

        const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#ec4899'];

        const triggerBurst = () => {
            const e = window.__TACTICAL_ENGINE__;
            if (!e || !e.agents || e.agents.length === 0) return;

            const agents = e.agents;
            const centerHex = e.mapConfig ? { q: Math.floor(e.mapConfig.w / 2), r: Math.floor(e.mapConfig.h / 2) } : { q: 0, r: 0 };

            // 1. Trigger casting & AOE telegraphs for all units
            for (let i = 0; i < agents.length; i++) {
                const a = agents[i];
                a.hp = a.maxHp = 999999;
                const target = agents[(i + 1) % agents.length];

                // Fake casting skill
                a.currentSkill = {
                    id: 'storm_cast_' + i,
                    name: 'Storm Cast ' + i,
                    castTime: 1.5,
                    currentCastTime: 0.5 + (i * 0.1),
                    color: colors[i % colors.length],
                    aoeRadius: 2.0 + (i % 3),
                    shape: i % 2 === 0 ? 'CIRCLE' : 'RING',
                    range: 5,
                    target: { x: target.x, y: target.y, q: target.q, r: target.r }
                };

                // Cast start event
                e.bus.emit('GAME_EVENT', {
                    type: 'CAST_START',
                    pos: { x: a.x, y: a.y },
                    sourceId: a.id,
                    skill: a.currentSkill
                });

                // Periodically trigger CAST_BREAK for some
                if (i % 3 === 0) {
                    e.bus.emit('GAME_EVENT', {
                        type: 'CAST_BREAK',
                        pos: { x: a.x, y: a.y },
                        sourceId: a.id
                    });
                }

                // Visual beams and slashes between pairs
                if (target) {
                    e.bus.emit('GAME_EVENT', {
                        type: 'VISUAL_BEAM',
                        pos: { x: a.x, y: a.y },
                        sourceId: a.id,
                        targetId: target.id,
                        color: colors[i % colors.length]
                    });

                    e.bus.emit('GAME_EVENT', {
                        type: 'VISUAL_SLASH',
                        pos: { x: target.x, y: target.y },
                        sourceId: a.id,
                        targetId: target.id,
                        color: colors[(i + 1) % colors.length]
                    });

                    e.bus.emit('GAME_EVENT', {
                        type: 'PROJECTILE_SPAWN',
                        pos: { x: a.x, y: a.y },
                        color: colors[i % colors.length]
                    });

                    e.bus.emit('GAME_EVENT', {
                        type: 'PROJECTILE_HIT',
                        pos: { x: target.x, y: target.y },
                        color: colors[(i + 2) % colors.length]
                    });

                    e.bus.emit('GAME_EVENT', {
                        type: 'IMPACT_AOE',
                        pos: { x: target.x, y: target.y },
                        color: colors[i % colors.length]
                    });
                }

                // Ground hazard spawn around agent
                const vfxId = vfxList[i % vfxList.length];
                e.bus.emit('GAME_EVENT', {
                    type: 'HAZARD_SPAWN',
                    pos: { x: a.x + (Math.sin(i) * 20), y: a.y + (Math.cos(i) * 20) },
                    text: vfxId
                });

                // Play effect directly via VFX player
                if (e.vfx) {
                    e.vfx.playEffect(vfxId, a.x, a.y, 0, colors[i % colors.length]);
                }

                // Floating damage and heal numbers (dozens)
                for (let d = 0; d < 3; d++) {
                    const ox = (Math.random() - 0.5) * 40;
                    const oy = (Math.random() - 0.5) * 40;
                    e.bus.emit('GAME_EVENT', {
                        type: 'DAMAGE',
                        pos: { x: a.x + ox, y: a.y + oy },
                        value: Math.floor(150 + Math.random() * 800),
                        text: d === 0 ? 'CRIT' : (d === 1 ? 'ABSORB' : undefined),
                        color: d === 0 ? '#ef4444' : (d === 1 ? '#bae6fd' : '#f87171'),
                        sourceId: a.id,
                        targetId: target?.id
                    });
                }

                e.bus.emit('GAME_EVENT', {
                    type: 'HEAL',
                    pos: { x: a.x, y: a.y - 10 },
                    value: Math.floor(100 + Math.random() * 300),
                    color: '#10b981'
                });
            }

            // Camera trauma & Killstreak banner
            e.bus.emit('CAMERA_SHAKE', { intensity: 0.35 });
            if (agents[0]) {
                e.bus.emit('GAME_EVENT', {
                    type: 'KILL_STREAK',
                    pos: { x: agents[0].x, y: agents[0].y },
                    text: 'MEGA KILL',
                    color: '#f59e0b',
                    value: 4
                });
            }

            // Ground impact locked
            if (agents[1]) {
                e.bus.emit('GAME_EVENT', {
                    type: 'GROUND_IMPACT',
                    pos: { x: agents[1].x, y: agents[1].y },
                    text: 'LOCKED',
                    color: '#c084fc'
                });
            }

            // Multiple death / shatter simulations
            for (let k = 0; k < 2; k++) {
                const targetAgent = agents[(k * 3) % agents.length];
                if (targetAgent) {
                    e.bus.emit('AGENT_DIED', {
                        agent: targetAgent,
                        groundZ: targetAgent.physics ? targetAgent.physics.z : 0,
                        impactX: (Math.random() - 0.5) * 80,
                        impactY: (Math.random() - 0.5) * 80
                    });
                    e.bus.emit('GAME_EVENT', {
                        type: 'DEATH',
                        pos: { x: targetAgent.x, y: targetAgent.y },
                        sourceId: targetAgent.id
                    });
                }
            }
        };

        // Initial burst immediately
        triggerBurst();

        // Repeat burst every 600ms to sustain storm
        if (timer) clearInterval(timer);
        timer = setInterval(triggerBurst, 600);
        window.__vfxStormTimer = timer;

        console.log('[VFX_STORM] Pressure storm started!');
    };

    window.__stopVfxStorm = function() {
        if (window.__vfxStormTimer) {
            clearInterval(window.__vfxStormTimer);
            window.__vfxStormTimer = null;
        }
        console.log('[VFX_STORM] Pressure storm stopped.');
    };
})();
`;

export async function injectVfxStorm(page) {
    await page.evaluate(INJECT_VFX_STORM_SCRIPT);
}

export async function startVfxStorm(page, options = {}) {
    await injectVfxStorm(page);
    await page.evaluate((opts) => {
        window.__startVfxStorm?.(opts);
    }, options);
}

export async function stopVfxStorm(page) {
    await page.evaluate(() => {
        window.__stopVfxStorm?.();
    });
}
