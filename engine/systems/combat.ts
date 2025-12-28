
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
        // Prevents AI from spamming initiateCast when unit is disabled,
        // which causes infinite CastStart -> CastBreak loops.
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
                    if (agent.movementType === 1 && (h.type === 'FIRE')) return; // Flyers avoid fire

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
