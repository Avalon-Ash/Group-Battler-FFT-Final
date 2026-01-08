
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, NodeState } from "../../types";
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
        const skill = a.skills[skillIdx];
        if (!skill) return NodeState.FAILURE;
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
            // sourceId 必須傳遞，供 HUD 綁定文字
            engine.events.push({ type: 'CAST_START', pos: {x: a.px, y: a.py}, sourceId: a.id, skill: skill });
            
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
        const s = a.skills[a.castingSkillIdx]!;
        a.mp = Math.min(a.maxMp, Math.max(0, a.mp - s.cost + s.gain));
        a.curCDs[a.castingSkillIdx] = s.cd;
        if (s.projectileSpeed && s.projectileSpeed > 0) {
             this.spawnProjectile(a, s, engine);
        } else {
            this.skillExecutor.executeInstantSkill(a, s, engine);
        }
    }
    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        this.projectileSystem.spawnProjectile(source, skill, engine);
    }
}
