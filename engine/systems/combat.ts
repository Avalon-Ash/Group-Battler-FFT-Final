
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, NodeState, AnimState } from "../../types";
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

    public initiateCast(a: Agent, skillIdx: number, engine: GameEngine): NodeState {
        // --- LOOP BUG FIX: Strict State Check ---
        const isHardCC = a.stunTimer > 0 || a.banished || a.fearTimer > 0 || a.hp <= 0;
        if (isHardCC) return NodeState.FAILURE;

        const skill = a.skills[skillIdx];
        if (!skill) return NodeState.FAILURE;

        // Silence check
        if (a.silenceTimer > 0 && skill.tag !== 'BASIC') return NodeState.FAILURE;

        if (a.castingSkillIdx === -1) {
            a.castingSkillIdx = skillIdx;
            a.castTimer = skill.cast;
            a.castingAnimationTimer = skill.cast; 
            a.btStatus = `詠唱 ${skill.tag}`;
            
            let targetName = '地面';
            if (a.target) targetName = a.target.id;
            else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
            
            engine.log(a, 'CAST', '詠唱', targetName, `開始引導 ${skill.name} (需 ${skill.cast} 秒)`);
            engine.events.push({ type: 'CAST_START', pos: {x: a.px, y: a.py}, sourceId: a.id, skill: skill });
            
            a.setAnim(AnimState.ATTACK);
            
            if (a.target) {
                a.facing = a.target.px > a.px ? 1 : -1;
            } else if (a.targetHex) {
                const tx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig).x;
                a.facing = tx > a.px ? 1 : -1;
            }
        }
        return NodeState.RUNNING;
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

        // 3. Update Hazards (Logic & Physics)
        engine.hazards.update(dt, engine);
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }
}
