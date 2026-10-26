import { Agent, GameEngine } from "../../game";
import { Skill } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { planDashPath, resolveForcedMove } from "./ForcedMove";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";
import { applyDirectDamage, applyHeal, applyLethal } from "./DirectDamage";
import { teleportTo, dashTo, lungeToward } from "../movement/MotionCommands";
import { triggerHitFlash, triggerHitShake } from "../../core/ViewCommands";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { COMBAT_PARAM, PHYSICS, VFX_PARAM, DAMAGE_TEXT_COLORS, EFFECT_LIMITS } from "../../../constants";
import { random } from "../../math/rng";
import { unitEventPos, hexEventPos } from "../../events/EventPos";

/** 天降類延遲結算：詠唱結束當下記下的落點與目標（落下期間施法者被暈、陣亡、換目標都不影響） */
export interface DeferredCastSnapshot {
    center: { q: number; r: number };
    target: Agent | null;
}

export class SkillExecutor {
    /** 施法中心：range 0 是施法者所在格，其他是 targetHex（沒有就用目標格，再沒有就用自己） */
    public static castCenter(source: Agent, skill: Skill): { q: number; r: number } {
        if (skill.range === 0) return { q: source.q, r: source.r };
        return source.targetHex || (source.target ? { q: source.target.q, r: source.target.r } : { q: source.q, r: source.r });
    }

    /**
     * `deferred`：天降類延遲結算（CombatSystem）。詠唱結束就算施放成功：用當時的落點與目標，
     * 不再檢查射程，施法者也不再突進或前衝（可能已被暈或陣亡）。
     */
    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine, deferred?: DeferredCastSnapshot) {
        let targets: Agent[] = [];
        
        // 1. 確定施法中心點
        const targetHex = deferred ? deferred.center : SkillExecutor.castCenter(source, skill);

        // 普攻沒有 CAST_START；近戰斬擊與瞬發光束由 VISUAL_BEAM 事件觸發技能序列（SkillSequences）
        if (skill.tag === 'BASIC' && source.target) {
            engine.pushEvent('VISUAL_BEAM', unitEventPos(source, engine), { skill, sourceId: source.id, targetId: source.target.id, color: skill.color });
        }

        // 2. 獲取受影響區域
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);
        const origin = hexEventPos(targetHex.q, targetHex.r, engine);

        // [NEW] DASH Effect: Move caster towards targetHex（高度／障礙／單位由 ForcedMove 裁決）
        if (!deferred && (skill.effectType === 'DASH' || skill.effectType2 === 'DASH')) {
            const dashPath = planDashPath(source, targetHex, engine);
            const dash = resolveForcedMove(source, dashPath, dashPath.length, 'DASH', engine);
            const bestH = dash.stepsTaken > 0 ? dash.finalHex : null;
            
            if (bestH) {
                // dashTo 把位移量存進 physics 偏移並注入順向初速與跳躍弧度，
                // 衝刺因此帶著速度前傾與殘影
                dashTo(source, bestH.q, bestH.r, engine);
                
                engine.bus.emit('CAMERA_SHAKE', { intensity: VFX_PARAM.SHAKE_INTENSITY_DASH });
                
                engine.events.push({ 
                    type: 'CC_APPLIED', 
                    pos: unitEventPos(source, engine), 
                    text: "突進", 
                    color: DAMAGE_TEXT_COLORS.DASH,
                    sourceId: source.id,
                    targetId: source.id
                });
            } else {
                lungeToward(source, origin, PHYSICS.LUNGE_SPEED_ACTIVE);
            }
        } else if (
            !deferred &&
            skill.range >= 1 &&
            skill.range <= 2 &&
            (skill.projectileSpeed ?? 0) === 0 &&
            skill.power > 0 &&
            (targetHex.q !== source.q || targetHex.r !== source.r)
        ) {
            lungeToward(source, origin, skill.tag === 'BASIC' ? PHYSICS.LUNGE_SPEED_BASIC : PHYSICS.LUNGE_SPEED_ACTIVE);
        }

        // 3. 判定受擊目標
        let isAOE = skill.type === 'AOE' || impactCells.length > 1;
        
        if (isAOE) {
            impactCells.forEach(cell => {
                const u = engine.getAgentAt(cell.q, cell.r);
                if (u && u.hp > 0 && !u.banished && !u.outOfBounds) {
                    const isValidTarget = (skill.power > 0 && u.team !== source.team) || 
                                          (skill.power < 0 && u.team === source.team) || 
                                          (skill.power === 0);
                    
                    if (isValidTarget) {
                        targets.push(u);
                    }
                }
            });
            
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color, sourceId: source.id });
        } else {
            const primary = deferred ? deferred.target : source.target;
            if (primary && primary.hp > 0 && !primary.banished && !primary.outOfBounds) {
                const isValidTarget = (skill.power > 0 && primary.team !== source.team) || 
                                      (skill.power < 0 && primary.team === source.team) || 
                                      (skill.power === 0);
                
                // For power === 0 buffs, AI might have targeted an enemy. In this case, CCManager would block it.
                // We should ideally prevent adding invalid buff targets, forcing the self-fallback below.
                const isBuffCC = (skill.ccType === 'SHIELD' || skill.ccType === 'HOT' || skill.ccType2 === 'SHIELD' || skill.ccType2 === 'HOT');
               
                let shouldPush = false;
                if (isValidTarget) {
                    if (skill.power === 0 && isBuffCC && primary.team !== source.team) {
                        // AI targeted an enemy for a Buff. Don't push, so it falls back to self.
                        shouldPush = false;
                    } else {
                        shouldPush = true;
                    }
                }

                const effRange = engine.movement.getEffectiveRange(source, primary.q, primary.r, skill.range, engine);
                if (shouldPush && (deferred || HexUtils.dist(source, primary) <= effRange + 0.1)) {
                    targets.push(primary);
                }
            }
        }

        // [FIX] Global Hazard Injected - Allow both AOE and Single target skills to spawn hazards (e.g., Lava/Ice)
        HazardManager.spawnHazards(source, impactCells, skill, engine, targetHex);
        
        // Final target selection fallback
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }

        const preRollCrit = skill.power > 0 ? random() < 0.1 : false;
        targets.forEach(target => {
            this.resolveHit(source, target, skill, isAOE ? origin : undefined, engine, preRollCrit);
        });

        applySelfCC(source, skill, engine);
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine, preRollCrit: boolean | undefined = undefined) {
        if (!target || target.hp <= 0 || target.banished || target.outOfBounds) return;

        // A. Damage Calculation
        const result = DamageCalculator.calculate(source, target, skill, engine.battleTime, preRollCrit, engine.isLastStand);
        
        if (result.isMiss) {
            target.lastHitDamage = 0;
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: unitEventPos(target, engine), 
                text: "MISS", 
                color: DAMAGE_TEXT_COLORS.MISS,
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '閃避', target.id, `攻擊未命中`);
            return;
        }

        if (result.isBlock) {
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: unitEventPos(target, engine), 
                text: "BLOCK", 
                color: DAMAGE_TEXT_COLORS.BLOCK,
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '格擋', target.id, `減少15%傷害`);
        }

        if (result.shieldAbsorb > 0) {
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: unitEventPos(target, engine), 
                value: -Math.floor(result.shieldAbsorb), 
                color: DAMAGE_TEXT_COLORS.ABSORB, 
                text: "ABSORB",
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '吸收', target.id, `護盾吸收 ${Math.floor(result.shieldAbsorb)} 傷害`);
        }

        if (result.finalValue !== 0) {
            const finalDamage = Math.abs(Math.floor(result.finalValue));
            if (result.finalValue < 0) {
                // 護盾已在 DamageCalculator 扣過，所以這裡是真實傷害
                applyDirectDamage(target, -result.finalValue, true, source.id);
                target.lastHitDamage = finalDamage;

                // [NEW] REFLECT: 反傷判定（受到敵方技能直接傷害後，對攻擊者造成 實際扣血量×v/100 的真實傷害）
                if (target.effects.REFLECT.remaining > 0 && target.team !== source.team && source.hp > 0 && !source.banished && !source.outOfBounds) {
                    const reflectPct = Math.min(target.effects.REFLECT.value, EFFECT_LIMITS.REFLECT_MAX_PCT) / 100;
                    const reflectDmg = Math.floor(finalDamage * reflectPct);
                    if (reflectDmg > 0) {
                        applyDirectDamage(source, reflectDmg, true, target.id);
                        engine.events.push({
                            type: 'DAMAGE',
                            pos: unitEventPos(source, engine),
                            value: reflectDmg,
                            color: DAMAGE_TEXT_COLORS.REFLECT,
                            text: "反傷",
                            sourceId: target.id,
                            targetId: source.id
                        });
                        engine.log(target, 'HIT', '反傷', source.id, `反彈 ${reflectDmg} 傷害`);
                        if (source.hp <= 0) {
                            engine.agentManager.handleDeadState(source, engine);
                        }
                    }
                }
            } else {
                applyHeal(target, result.finalValue);
            }
            
            // Visual Event
            const isHeal = result.finalValue > 0;
            const evtType = isHeal ? 'HEAL' : 'DAMAGE';
            const color = isHeal ? DAMAGE_TEXT_COLORS.HEAL : (result.isCrit ? DAMAGE_TEXT_COLORS.CRIT : skill.color);
            
            engine.events.push({ 
                type: evtType, 
                pos: unitEventPos(target, engine), 
                value: finalDamage, 
                absorbed: result.shieldAbsorb > 0 ? Math.floor(result.shieldAbsorb) : undefined,
                crit: !isHeal && result.isCrit,
                color,
                skill,
                targetId: target.id,
                sourceId: source.id
            });

            const actionName = isHeal ? '治療' : (result.isCrit ? '爆擊' : '命中');
            const logType = isHeal ? 'HEAL' : 'HIT';
            engine.log(source, logType, actionName, target.id, `造成 ${finalDamage} ${isHeal ? '治療' : '傷害'}`);

                // SSOT: Trigger Animation System
                if (!isHeal) {
                    triggerHitFlash(target, COMBAT_PARAM.HIT_FLASH_DURATION);
                    
                    // [NEW] Optical Shake Sync: Decoupled visual jitter
                    const shakePower = Math.min(12, finalDamage / 8 + 3);
                    triggerHitShake(target, shakePower);

                    // [FIX] SSOT Grid Anchor Locking for Hit VFX

                    // 打擊特效：普攻與投射物主動技用技能自己的（奧義與無投射物的主動技由 SkillSequences 播主特效，這裡只播陣營預設小打擊）
                    const ownHit = skill.tag === 'BASIC' || (skill.tag === 'ACTIVE' && (skill.projectileSpeed ?? 0) > 0);
                    const hitFX = (ownHit && skill.visualHitEffect) || FACTION_VISUALS[source.team].defaultHitEffect;

                    // Decoupled Event: Emit HIT_FX for visual pipeline
                    engine.pushEvent('HIT_FX', hexEventPos(target.q, target.r, engine), {
                        value: finalDamage,
                        absorbed: result.shieldAbsorb,
                        text: hitFX,
                        targetId: target.id,
                        sourceId: source.id,
                        skill
                    });
                    
                    if (origin && !skill.ccType) {
                        PhysicsEngine.applyImpulse(target, origin, COMBAT_PARAM.HIT_IMPULSE_MIN);
                    }
                }
        }

        // B. Secondary Effects (Vamp, Mana, Self Damage)
        if (result.vampAmount > 0) {
            applyHeal(source, result.vampAmount);
            engine.events.push({ 
                type: 'HEAL', 
                pos: unitEventPos(source, engine), 
                value: result.vampAmount, 
                color: DAMAGE_TEXT_COLORS.VAMP, 
                text: "VAMP",
                sourceId: source.id,
                targetId: source.id
            });
            engine.log(source, 'HEAL', '吸血', source.id, `回復 ${Math.floor(result.vampAmount)} HP`);
        }
        if (result.manaBurn > 0) {
            target.mp = Math.max(0, target.mp - result.manaBurn);
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: unitEventPos(target, engine), 
                value: result.manaBurn, 
                color: DAMAGE_TEXT_COLORS.MANA_BURN, 
                text: "BURN",
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '燃魔', target.id, `燃燒 ${Math.floor(result.manaBurn)} MP`);
        }
        if (result.manaRestore > 0) {
            target.mp = Math.min(target.maxMp, target.mp + result.manaRestore);
            engine.events.push({ 
                type: 'HEAL', 
                pos: unitEventPos(target, engine), 
                value: result.manaRestore, 
                color: DAMAGE_TEXT_COLORS.MANA_RESTORE, 
                text: "MP",
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HEAL', '回魔', target.id, `回復 ${Math.floor(result.manaRestore)} MP`);
        }

        // [NEW] SELF_DAMAGE implementation: bypassing shield/evade
        if (skill.effectType === 'SELF_DAMAGE' || skill.effectType2 === 'SELF_DAMAGE') {
            const selfDmgValue = skill.effectType === 'SELF_DAMAGE' ? (skill.effectVal || 0) : (skill.effectVal2 || 0);
            if (selfDmgValue > 0) {
                applyDirectDamage(source, selfDmgValue, true); // 反噬無視護盾；無歸屬來源，沿用先前的擊殺歸屬
                engine.events.push({
                    type: 'DAMAGE',
                    pos: unitEventPos(source, engine),
                    value: selfDmgValue,
                    color: DAMAGE_TEXT_COLORS.RECOIL,
                    text: "RECOIL",
                    sourceId: source.id,
                    targetId: source.id
                });
                engine.log(source, 'HIT', '反噬', source.id, `受到 ${selfDmgValue} 反噬傷害`);
                // Check if source dies from self damage
                if (source.hp <= 0) {
                    engine.agentManager.handleDeadState(source, engine);
                }
            }
        }
        
        // C. Crowd Control (CC) Application
        // Cast to string to allow 'NONE' check against strictly typed Union
        if (skill.ccType && (skill.ccType as string) !== 'NONE' && !skill.ccSelf) {
            CCManager.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        }
        if (skill.ccType2 && (skill.ccType2 as string) !== 'NONE' && !skill.ccSelf2) {
            CCManager.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);
        }

        // D. Death Check & Absolute EXECUTE enforcement
        if (result.isExecute || target.hp <= 0) {
            if (result.isExecute) {
                applyLethal(target, source.id); // Forced death logic
                engine.log(source, 'HIT', '斬殺', target.id, `造成 ${Math.abs(result.finalValue)} 傷害 (絕對執行)`);
            }
            engine.agentManager.handleDeadState(target, engine);
        }
    }
}

/**
 * 技能自我控制套用（SK1：ccSelf / ccSelf2）
 * 每次技能施放只對施法者套用一次（無論打中幾個、有沒有打中）。
 */
export function applySelfCC(source: Agent, skill: Skill, engine: GameEngine): void {
    if (source.hp <= 0 || source.banished || source.outOfBounds) return;
    if (skill.ccSelf && skill.ccType && (skill.ccType as string) !== 'NONE') {
        CCManager.applyCC(source, source, skill, skill.ccType, skill.ccDur, skill.ccForce, undefined, engine);
    }
    if (skill.ccSelf2 && skill.ccType2 && (skill.ccType2 as string) !== 'NONE') {
        CCManager.applyCC(source, source, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, undefined, engine);
    }
}