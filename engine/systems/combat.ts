
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, BattleField } from "../../types";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { SkillResolutionSystem } from "./combat/SkillResolutionSystem";
import { HexUtils } from "../utils";
import { HEX_SIZE } from "../../constants";
import * as VFXSpawners from "./vfx/spawners";

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

    private resolveFieldTick(field: BattleField, engine: GameEngine) {
        const source = engine.agents.find(a => a.id === field.sourceId);
        // Even if source is dead, field might persist, but we need a source for damage attribution.
        // If source missing, we can create a dummy or just skip damage attribution log?
        // Let's create a dummy logic proxy if needed, but usually we just skip attribution text.
        
        // Find agents in radius
        // Optimization: Use squared distance
        const rPx = field.radiusPx * field.radiusPx;
        
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished || agent.team === field.team) return; // Friendly fire OFF

            const dx = agent.px - field.pos.x;
            const dy = agent.py - field.pos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= rPx) {
                // Determine damage. 
                // Logic: Fields usually do dotDamage (ccForce) or a fraction of power.
                // We use ccForce if available, otherwise 20% of power.
                const damage = field.skill.ccForce || (field.skill.power * 0.2) || 10;
                
                // Direct HP modification to avoid triggering full "Hit" animation every 0.5s which looks jerky
                agent.hp = Math.max(0, agent.hp - damage);
                
                // Add tiny floating text without spamming the log
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.floor(damage), 
                    color: field.color 
                });

                // Apply Status Effect if applicable (Refresh DoT timer)
                if (field.skill.ccType) {
                    // Re-apply status with 1s duration just to keep it active while in field
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

        const field: BattleField = {
            id: Math.random().toString(36).substr(2, 5),
            pos: pos,
            q: 0, r: 0, // Not strictly needed for collision if we use PX, but good for debug
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
        
        // Spawn Visuals immediately
        // Note: The VFXSpawner `spawnLingeringField` spawns particles with life = duration.
        // This matches perfectly.
        VFXSpawners.spawnLingeringField(engine.renderer!.vfx, pos.x, pos.y, skill.color, 'SMOKE', duration, 0);
    }
}
