
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, NodeState, AIState } from "../../types";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { CastingEngine } from "./combat/CastingEngine";
import { SkillExecutor } from "./combat/SkillExecutor";
import { HexUtils } from "../utils";
export class CombatSystem {
    public projectileSystem: ProjectileSystem;
    public castingEngine: CastingEngine;
    public skillExecutor: SkillExecutor;
    constructor() {
        this.projectileSystem = new ProjectileSystem();
        this.castingEngine = new CastingEngine();
        this.skillExecutor = new SkillExecutor();
    }
    public reset() {
        // Projectiles are cleared by the GameEngine root container
    }
    public initiateCast(a: Agent, skillIdx: number, engine: GameEngine): NodeState {
        const isHardCC = a.stunTimer > 0 || a.banished || a.fearTimer > 0 || a.hp <= 0;
        if (isHardCC) return NodeState.FAILURE;
        
        if (a._castCompleteCooldown > 0) return NodeState.FAILURE;
        if (a._interruptCooldown > 0) return NodeState.FAILURE;

        // [FIX] If already casting something else, this initiation fails
        if (a.castingSkillIdx !== -1 && a.castingSkillIdx !== skillIdx) {
            return NodeState.FAILURE;
        }

        const skill = a.skills[skillIdx];
        if (!skill) return NodeState.FAILURE;

        // [SAFETY] Check CD even if AI/caller should have
        const cd = a.curCDs[skillIdx] || 0;
        const tolerance = (skill.tag === 'BASIC') ? 0.15 : 0.05; 
        if (cd > tolerance && a.castingSkillIdx !== skillIdx) {
            return NodeState.FAILURE;
        }

        if (a.silenceTimer > 0 && skill.tag !== 'BASIC') return NodeState.FAILURE;
        if (a.mp < skill.cost) return NodeState.FAILURE;

        if (a.castingSkillIdx === -1) {
            a.castingSkillIdx = skillIdx;
            // [FIX] Ensure at least one frame of duration to prevent immediate completion loop
            a.castTimer = Math.max(skill.cast, 0.016);
            a.castingAnimationTimer = Math.max(skill.cast, 0.016);
            
            if (skill.tag === 'ULT') a.aiState = AIState.CASTING_ULT;
            else if (skill.tag === 'ACTIVE') a.aiState = AIState.CASTING_ACTIVE;
            else a.aiState = AIState.CASTING_BASIC;

            let targetName = '地面';
            if (a.target) targetName = a.target.id;
            else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
            
            // Console log for debugging infinite cast
            // console.log(`[Combat] ${a.id} initiating ${skill.id} (slot ${skillIdx})`);
            
            engine.log(a, 'CAST', '詠唱', targetName, `開始引導 ${skill.name} (需 ${skill.cast} 秒)`);
            
            // [FIX] Pass targetId to CAST_START so visual sequences hit the target, not the caster
            const targetId = a.target ? a.target.id : (a.targetHex ? `ground-${a.targetHex.q},${a.targetHex.r}` : undefined);

            // sourceId 必須傳遞，供 HUD 綁定文字
            if (skill.cast > 0 && skill.tag !== 'BASIC') {
                // [FIX] Caching impact area for performance optimization in telegraph rendering
                const targetHex = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : {q: a.q, r: a.r});
                a.currentTelegraph = engine.movement.targeting.getImpactArea(a, targetHex, skill, engine);
                
                engine.events.push({ type: 'CAST_START', pos: { x: a.px, y: a.py }, skill, sourceId: a.id, targetId });
            }
            
            if (a.target) {
                a.facing = a.target.px > a.px ? 1 : -1;
            } else if (a.targetHex) {
                const tx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig).x;
                a.facing = tx > a.px ? 1 : -1;
            }
        }
        return NodeState.RUNNING;
    }

    public breakCast(a: Agent, engine: GameEngine) {
        if (a.castingSkillIdx !== -1) {
            this.castingEngine.handleInterruption(a, engine);
        }
    }

    public update(dt: number, engine: GameEngine) {
        engine.agents.forEach(a => {
            // 修正：如果單位已死但仍在詠唱，允許進入 updateCasting 進行中斷處理
            if (a.hp <= 0 && a.castingSkillIdx === -1) return;
            
            if (a.castingSkillIdx !== -1) {
                this.castingEngine.updateCasting(a, dt, engine, (agent) => {
                    this.completeCast(agent, engine);
                });
            }
        });
        this.projectileSystem.update(dt, engine, this.skillExecutor);
    }
    private completeCast(a: Agent, engine: GameEngine) {
        if (a.castingSkillIdx === -1) return; // Safety guard
        
        // [FIX] Cache final position before handleDeadState might zero it out
        const finalPos = { 
            x: a.px + a.physics.x, 
            y: a.py + a.physics.y, 
            z: a.physics.z 
        };

        const s = a.skills[a.castingSkillIdx]!;
        if (!s) return;
        
        a.mp = Math.min(a.maxMp, Math.max(0, a.mp - s.cost + s.gain));
        // BASIC attacks do not have a mandatory 0.3s floor CD
        const minCd = (s.tag === 'BASIC') ? 0.1 : 0.3;
        a.curCDs[a.castingSkillIdx] = Math.max(s.cd ?? 0, minCd); 
        
        if (s.tag !== 'BASIC') {
            engine.events.push({ 
                type: 'CAST_FINISH', 
                pos: finalPos, 
                skill: s, 
                sourceId: a.id,
                targetId: a.id 
            });
        }
        
        let targetName = '地面';
        if (a.target) targetName = a.target.id;
        else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
        
        engine.log(a, 'CAST', '施放', targetName, `施放 ${s.name} (消耗 ${s.cost} MP)`);

        if (s.projectileSpeed && s.projectileSpeed > 0) {
             this.spawnProjectile(a, s, engine);
        } else {
            this.skillExecutor.executeInstantSkill(a, s, engine);
        }

        const isSelfDmg1 = s.effectType === 'SELF_DAMAGE';
        const isSelfDmg2 = s.effectType2 === 'SELF_DAMAGE';
        if (isSelfDmg1 || isSelfDmg2) {
            const dmgVal = (isSelfDmg1 ? s.effectVal : s.effectVal2) || 50;
            a.hp = Math.max(0, a.hp - dmgVal);
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: finalPos, 
                value: dmgVal, 
                color: '#991b1b', 
                text: "SACRIFICE",
                sourceId: a.id,
                targetId: a.id
            });
            engine.log(a, 'HIT', '自殘', a.id, `消耗 ${dmgVal} HP`);
            a.lastHitSourceId = a.id;
            if (a.hp <= 0) {
                engine.agentManager.handleDeadState(a, engine);
            }
        }
    }
    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }
}
