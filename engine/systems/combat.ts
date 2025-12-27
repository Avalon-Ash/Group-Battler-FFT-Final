
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, MovementType } from "../../types";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { SkillResolutionSystem } from "./combat/SkillResolutionSystem";
import { HexUtils, Vector } from "../utils";
import { HEX_SIZE } from "../../constants";

export class CombatSystem {
    public projectileSystem: ProjectileSystem;
    public skillResolution: SkillResolutionSystem;

    constructor() {
        this.projectileSystem = new ProjectileSystem();
        this.skillResolution = new SkillResolutionSystem();
    }

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

        // 3. Update Hazards (Visuals + Logic)
        engine.map.tickHazards(dt, engine);
        this.resolveHazardEffects(dt, engine);
        
        // 4. Update Field Physics (Gravity/Suction) from Hazards
        this.updateHazardPhysics(dt, engine);
    }

    private resolveHazardEffects(dt: number, engine: GameEngine) {
        // Iterate Hazards directly to trigger the Pulse logic
        for (const h of engine.map.hazards.values()) {
            if (h.timer <= 0) {
                h.timer = h.interval; // Reset tick
                
                // Find units in this tile
                const occupants = engine.agents.filter(a => 
                    a.hp > 0 && !a.banished && a.q === h.q && a.r === h.r && a.team !== h.team
                );
                
                occupants.forEach(agent => {
                    // Height Check: Flying units avoid ground hazards (Liquid/Low Fog)
                    // unless hazard is "tall" (like Gravity or high gas)
                    if (agent.movementType === MovementType.FLYING && (h.type === 'FIRE')) {
                        return; // Safe
                    }

                    const dmg = h.power;
                    agent.hp = Math.max(0, agent.hp - dmg);
                    
                    // Visual Feedback
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: {x: agent.px, y: agent.py}, 
                        value: -Math.floor(dmg), 
                        color: h.color,
                        // Mock skill for color consistency in renderer
                        skill: { color: h.color, ccType: 'DOT' } as any 
                    });

                    engine.log(agent, 'HAZARD', h.type, `(${h.q},${h.r})`, `受到地形傷害 ${Math.floor(dmg)}`);
                });
            }
        }
    }

    private updateHazardPhysics(dt: number, engine: GameEngine) {
        engine.agents.forEach(agent => {
            if (agent.hp <= 0 || agent.banished) return;
            const hazard = engine.map.getHazardAt(agent.q, agent.r);
            
            if (hazard && hazard.type === 'GRAVITY' && hazard.team !== agent.team) {
                // Pull towards center of hazard
                const center = HexUtils.toPx(hazard.q, hazard.r, engine.mapConfig);
                const dx = center.x - agent.px;
                const dy = center.y - agent.py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    const pull = 300 * dt;
                    agent.physics.vx += (dx/dist) * pull;
                    agent.physics.vy += (dy/dist) * pull;
                    agent.moveSpeedMult = 0.3; // Slow down
                }
            }
        });
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }
}