
import { Agent, GameEngine } from "../game";
import { Projectile, Skill } from "../../types";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { SkillResolutionSystem } from "./combat/SkillResolutionSystem";

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
        // We iterate agents here to drive the casting timers via SkillResolutionSystem
        engine.agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.castingSkillIdx !== -1) {
                this.skillResolution.updateCasting(a, dt, engine);
            }
        });

        // 2. Projectile Physics & Impacts
        // We pass the skillResolution system to projectiles so they can trigger effects on hit
        this.projectileSystem.update(dt, engine, this.skillResolution);
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }
}
