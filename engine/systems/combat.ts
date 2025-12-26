import { Agent, GameEngine } from "../game";
import { Projectile, Skill, BattleField } from "../../types";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { SkillResolutionSystem } from "./combat/SkillResolutionSystem";
import { HexUtils, Vector } from "../utils";
import { HEX_SIZE } from "../../constants";
import * as GenericVFX from "./vfx/spawners/generic";

const FIELD_TICK_RATE = 0.5; // Damage every 0.5s

export class CombatSystem {
    public projectileSystem: ProjectileSystem;
    public skillResolution: SkillResolutionSystem;

    constructor() {
        this.projectileSystem = new ProjectileSystem();
        this.skillResolution = new SkillResolutionSystem();
    }

    // Proxy for accessors to maintain GameEngine compatibility
    get projectiles(): Projectile[] { return this.projectileSystem.projectiles; }
    set projectiles(v: Projectile[]) { this.projectileSystem.projectiles = v; }

    public reset() {
        this.projectileSystem.projectiles = [];
    }

    public update(dt: number, engine: GameEngine) {
        // 1. Casting Updates (Logic)
        engine.agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.castingSkillIdx !== -1) {
                this.skillResolution.updateCasting(a, dt, engine);
            }
        });

        // 2. Projectile Physics & Impacts
        this.projectileSystem.update(dt, engine, this.skillResolution);

        // 3. Update Persistent Ground Fields (Poison clouds, etc.)
        this.updateFields(dt, engine);
        
        // 4. Update Field Physics (Gravity/Suction - Per Frame)
        this.updateFieldPhysics(dt, engine);
    }

    private updateFields(dt: number, engine: GameEngine) {
        // Reverse iterate to remove expired fields safely
        for (let i = engine.fields.length - 1; i >= 0; i--) {
            const field = engine.fields[i];
            
            field.duration -= dt;
            field.tickTimer -= dt;

            // Handle Logic Tick
            if (field.tickTimer <= 0) {
                field.tickTimer = FIELD_TICK_RATE;
                this.resolveFieldTick(field, engine);
            }

            // Expiry
            if (field.duration <= 0) {
                engine.fields.splice(i, 1);
            }
        }
    }

    private updateFieldPhysics(dt: number, engine: GameEngine) {
        // Optimized physics loop for continuous effects (Black Hole / Gravity)
        // This runs every frame, unlike damage ticks.
        
        for (const field of engine.fields) {
            // Only 'PULL' fields generate gravity
            if (field.skill.ccType !== 'PULL' && field.skill.ccType2 !== 'PULL') continue;

            const rPxSq = field.radiusPx * field.radiusPx;
            const pullForce = (field.skill.ccForce || 5) * 150; // Base force multiplier

            engine.agents.forEach(agent => {
                if (agent.hp <= 0 || agent.banished || agent.team === field.team) return;

                const dx = field.pos.x - agent.px;
                const dy = field.pos.y - agent.py;
                const distSq = dx * dx + dy * dy;

                if (distSq <= rPxSq && distSq > 100) { // Don't pull if already at center (jitter fix)
                    // 1. GRAVITY: Apply force towards center
                    // We calculate a normalized vector
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Apply continuous acceleration
                    // We rely on PhysicsEngine damping to prevent infinite speed
                    agent.physics.vx += nx * pullForce * dt;
                    agent.physics.vy += ny * pullForce * dt;

                    // 2. EVENT HORIZON: Massive Slow
                    // If you are in a black hole, you can barely walk away
                    agent.moveSpeedMult = 0.3; // 70% Slow override
                }
            });
        }
    }

    private resolveFieldTick(field: BattleField, engine: GameEngine) {
        const source = engine.agents.find(a => a.id === field.sourceId);
        
        const rPx = field.radiusPx * field.radiusPx;
        
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished || agent.team === field.team) return; // Friendly fire OFF

            const dx = agent.px - field.pos.x;
            const dy = agent.py - field.pos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= rPx) {
                // Determine damage. 
                // Use ccForce if available, otherwise 20% of power.
                // For Black Holes, damage is usually low per tick but high utility.
                const damage = (field.skill.power * 0.2) || 10;
                
                // Direct HP modification
                agent.hp = Math.max(0, agent.hp - damage);
                
                // Add tiny floating text
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.floor(damage), 
                    color: field.color 
                });

                // Apply Status Effect if applicable (Refresh DoT timer)
                // Note: We don't apply PULL here, that's handled in updateFieldPhysics
                if (field.skill.ccType && field.skill.ccType !== 'PULL') {
                    this.skillResolution.applyCC(
                        source || agent, agent, field.skill, 
                        field.skill.ccType, 1.0, 0, undefined, engine
                    );
                }
            }
        });
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }

    public spawnField(source: Agent, skill: Skill, pos: {x: number, y: number}, engine: GameEngine) {
        // Convert radius to pixels
        const radiusGrid = skill.aoeRadius || 1;
        const radiusPx = radiusGrid * HEX_SIZE * 1.5; // Approximation for coverage
        
        // Determine Duration: Use ccDur if > 0, else default 5s
        const duration = (skill.ccDur && skill.ccDur > 0) ? skill.ccDur : 5.0;

        // Calculate Q, R from Pos for Grid Lookup
        const hex = HexUtils.fromPx(pos.x, pos.y, engine.mapConfig);

        const field: BattleField = {
            id: Math.random().toString(36).substr(2, 5),
            pos: pos,
            q: hex.q, 
            r: hex.r, 
            radius: radiusGrid,
            radiusPx: radiusPx,
            skill: skill,
            sourceId: source.id,
            team: source.team,
            duration: duration,
            tickTimer: 0, // Tick immediately on spawn
            visualType: skill.visual || 'SMOKE',
            color: skill.color
        };

        engine.fields.push(field);
        
        // Spawn Visuals immediately (Just initial puff, persistent zone handled by ZoneRenderer)
        GenericVFX.spawnLingeringField(engine.renderer!.vfx, pos.x, pos.y, skill.color, 'SMOKE', 1.0, 0);
    }
}