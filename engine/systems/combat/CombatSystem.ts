import { COMBAT_PARAM, CAST_RULES } from '../../../constants';
import { activationBlock, beginWindup, cancelWindup, castAim, commitSkill, extendInterruptLockout } from "./SkillStateMachine";

/** 這招開始前搖時會不會發 CAST_START（詠唱字、詠唱序列、預警格）；取消時同一個判斷決定要不要發 CAST_CANCEL */
const announcesCast = (skill: Skill): boolean => skill.cast > 0 && skill.tag !== 'BASIC';
// ╔══════════════════════════════════════════════════════════╗
// ║  CombatSystem — 戰鬥系統 Orchestrator                   ║
// ║  職責：攻擊判定 / 傷害計算 / 技能效果觸發                ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, GameEngine } from "../../game";
import { Skill, NodeState } from "../../../types";
import { ProjectileSystem } from "./ProjectileSystem";
import { CastingEngine, BreakCastContext } from "./CastingEngine";
import { SkillExecutor, DeferredCastSnapshot } from "./SkillExecutor";
import { HexUtils } from "../../utils";
import { ultImpactDelay } from '../../../data/vfx/ult_visuals';
import { hexEventPos, unitEventPos } from "../../events/EventPos";
import { runCastActions } from "./SkillActions";

export class CombatSystem {
    public projectileSystem: ProjectileSystem;
    public castingEngine: CastingEngine;
    public skillExecutor: SkillExecutor;

    private _deferredCasts: Array<{
        executeAt: number;
        agent: Agent;
        skill: Skill;
        engine: GameEngine;
        snapshot: DeferredCastSnapshot;
    }> = [];

    constructor() {
        this.projectileSystem = new ProjectileSystem();
        this.castingEngine = new CastingEngine();
        this.skillExecutor = new SkillExecutor();
    }

    public reset() {
        // Projectiles are cleared by the GameEngine root container
        this._deferredCasts = [];
        this.skillExecutor.multiHit.reset();
    }

    public initiateCast(a: Agent, skillIdx: number, engine: GameEngine): NodeState {
        if (activationBlock(a, skillIdx)) return NodeState.FAILURE;
        const skill = a.skills[skillIdx]!;

        if (a.castingSkillIdx === -1) {
            beginWindup(a, skillIdx, skill);
            const aim = castAim(a);
                        // 施法中的 AI 狀態由 castingSkillIdx 推導（engine/core/AgentDerived.ts，P7b），這裡不寫 aiState

            let targetName = '地面';
            if (aim) targetName = aim.id;
            else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
            
            engine.log(a, 'CAST', '詠唱', targetName, `開始引導 ${skill.name} (需 ${skill.cast} 秒)`);
            
            // [FIX] Pass targetId to CAST_START so visual sequences hit the target, not the caster
            const targetId = aim ? aim.id : (a.targetHex ? `ground-${a.targetHex.q},${a.targetHex.r}` : undefined);

            // sourceId 必須傳遞，供 HUD 綁定文字
            if (announcesCast(skill)) {
                // [FIX] Caching impact area for performance optimization in telegraph rendering
                const targetHex = a.targetHex || (aim ? {q: aim.q, r: aim.r} : {q: a.q, r: a.r});
                a.currentTelegraph = engine.movement.targeting.getImpactArea(a, targetHex, skill, engine);
                
                engine.events.push({ type: 'CAST_START', pos: unitEventPos(a, engine), skill, sourceId: a.id, targetId });
                engine.bus.emit('CAST_START', { sourceId: a.id, skill });
            }
            
            if (aim) {
                a.facing = aim.px > a.px ? 1 : -1;
            } else if (a.targetHex) {
                const tx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig).x;
                a.facing = tx > a.px ? 1 : -1;
            }
        }
        return NodeState.RUNNING;
    }

    /**
     * 玩家自己取消前搖（ADR 0026）：走狀態機的 CANCEL 邊（不進冷卻、不設鎖定；非奧義不扣魔，奧義已逐步扣掉的魔力不退）；
     * 有發過 CAST_START 的招再發 CAST_CANCEL，讓詠唱字與詠唱序列收掉（不演「被打斷」）。
     */
    public cancelCast(a: Agent, engine: GameEngine): void {
        const skill = a.castingSkillIdx !== -1 ? a.skills[a.castingSkillIdx] : null;
        if (!cancelWindup(a)) return;
        if (skill && announcesCast(skill)) {
            engine.events.push({ type: 'CAST_CANCEL', pos: unitEventPos(a, engine), skill, sourceId: a.id });
        }
    }

    /** `lockout`：中斷後禁止重新詠唱的秒數（_interruptCooldown 只在施法域寫入）。 */
    public breakCast(a: Agent, engine: BreakCastContext, lockout?: number) {
        if (a.castingSkillIdx !== -1) {
            this.castingEngine.handleInterruption(a, engine);
        }
        if (lockout !== undefined) extendInterruptLockout(a, lockout);
        // 天降類詠唱結束就算施放成功：落下途中的打斷不取消 _deferredCasts（2026-10-26 決定）
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

        // Process deferred casts
        for (let i = this._deferredCasts.length - 1; i >= 0; i--) {
            const dc = this._deferredCasts[i];
            if (dc.engine.battleTime >= dc.executeAt) {
                // 施法者在落下途中陣亡也照樣結算（同投射物：已出手的攻擊不因施法者死亡消失）
                this.skillExecutor.executeInstantSkill(dc.agent, dc.skill, dc.engine, dc.snapshot);
                this._deferredCasts.splice(i, 1);
            }
        }

        this.projectileSystem.update(dt, engine, this.skillExecutor);

        // 多段命中：到時間的後續段在這裡打出（第 0 段在技能結算當下已打）
        this.skillExecutor.multiHit.update(engine);
    }

    private completeCast(a: Agent, engine: GameEngine) {
        if (a.castingSkillIdx === -1) return; // Safety guard
        
        // [FIX] Cache final position before handleDeadState might zero it out
        const finalPos = unitEventPos(a, engine);

        const s = a.skills[a.castingSkillIdx]!;
        if (!s) return;
        
        commitSkill(a, a.castingSkillIdx, s);
        
        if (s.tag !== 'BASIC') {
            engine.events.push({ 
                type: 'CAST_FINISH', 
                pos: finalPos, 
                skill: s, 
                sourceId: a.id,
                targetId: a.id 
            });
        }
        
        const aim = castAim(a);
        let targetName = '地面';
        if (aim) targetName = aim.id;
        else if (a.targetHex) targetName = `(${a.targetHex.q},${a.targetHex.r})`;
        
        engine.log(a, 'CAST', '施放', targetName, `施放 ${s.name} (消耗 ${s.cost} MP)`);

        // 出手：突進、瞬移、後撤和結算方式（瞬發、投射物、天降）無關
        const center = SkillExecutor.castCenter(a, s);
        runCastActions(a, s, center, hexEventPos(center.q, center.r, engine), engine);

        // 天降類：詠唱結束後再等 timing＋落下時間才結算（ultImpactDelay；特效命中也讀同一個值）。
        // 落點與目標在詠唱結束這一刻定下，之後施法者被暈、陣亡、換目標都照這個結算
        const delay = ultImpactDelay(s.id);
        if (delay > 0) {
            this._deferredCasts.push({
                executeAt: engine.battleTime + delay,
                agent: a,
                skill: s,
                engine,
                snapshot: { center: SkillExecutor.castCenter(a, s), target: aim },
            });
            return;
        }

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
