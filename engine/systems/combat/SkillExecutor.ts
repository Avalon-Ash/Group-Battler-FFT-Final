import { Agent, GameEngine } from "../../game";
import { Skill, Team } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { planDashPath, resolveForcedMove } from "./ForcedMove";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";
import { triggerHitFlash, triggerHitShake } from "../AnimationSystem";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { COMBAT_PARAM, PHYSICS, VFX_PARAM, DAMAGE_TEXT_COLORS } from "../../../constants";
import { random } from "../../math/rng";
import { unitEventPos, hexEventPos } from "../../events/EventPos";

export class SkillExecutor {

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        let targets: Agent[] = [];
        
        // 1. 確定施法中心點
        let targetHex;
        if (skill.range === 0) {
            targetHex = { q: source.q, r: source.r };
        } else {
            targetHex = source.targetHex || (source.target ? {q: source.target.q, r: source.target.r} : {q: source.q, r: source.r});
        }

        // 普攻沒有 CAST_START；近戰斬擊與瞬發光束由 VISUAL_BEAM 事件觸發技能序列（SkillSequences）
        if (skill.tag === 'BASIC' && source.target) {
            engine.pushEvent('VISUAL_BEAM', unitEventPos(source, engine), { skill, sourceId: source.id, targetId: source.target.id, color: skill.color });
        }

        // 2. 獲取受影響區域
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);
        const origin = hexEventPos(targetHex.q, targetHex.r, engine);

        // [NEW] DASH Effect: Move caster towards targetHex（高度／障礙／單位由 ForcedMove 裁決）
        if (skill.effectType === 'DASH' || skill.effectType2 === 'DASH') {
            const dashPath = planDashPath(source, targetHex, engine);
            const dash = resolveForcedMove(source, dashPath, dashPath.length, 'DASH', engine);
            const bestH = dash.stepsTaken > 0 ? dash.finalHex : null;
            
            if (bestH) {
                const originPx = {x: source.px, y: source.py};
                engine.updateAgentPosition(source, bestH.q, bestH.r);
                const newPx = HexUtils.toPx(bestH.q, bestH.r, engine.mapConfig);
                source.px = newPx.x;
                source.py = newPx.y;
                
                // [FIX] Store the teleport distance into physics offset.
                // This causes PhysicsEngine to naturally spring to the new location,
                // capturing the dash cleanly with speed trails.
                source.physics.x += originPx.x - newPx.x;
                source.physics.y += originPx.y - newPx.y;
                source.physics.vz += PHYSICS.VISUAL_JUMP_DASH; // Visual jump
                
                engine.bus.emit('CAMERA_SHAKE', { intensity: VFX_PARAM.SHAKE_INTENSITY_DASH });
                
                engine.events.push({ 
                    type: 'CC_APPLIED', 
                    pos: unitEventPos(source, engine), 
                    text: "突進", 
                    color: DAMAGE_TEXT_COLORS.DASH,
                    sourceId: source.id,
                    targetId: source.id
                });
            }
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
            if (source.target && source.target.hp > 0 && !source.target.banished && !source.target.outOfBounds) {
                const isValidTarget = (skill.power > 0 && source.target.team !== source.team) || 
                                      (skill.power < 0 && source.target.team === source.team) || 
                                      (skill.power === 0);
                
                // For power === 0 buffs, AI might have targeted an enemy. In this case, CCManager would block it.
                // We should ideally prevent adding invalid buff targets, forcing the self-fallback below.
                const isBuffCC = (skill.ccType === 'SHIELD' || skill.ccType === 'HOT' || skill.ccType2 === 'SHIELD' || skill.ccType2 === 'HOT');
               
                let shouldPush = false;
                if (isValidTarget) {
                    if (skill.power === 0 && isBuffCC && source.target.team !== source.team) {
                        // AI targeted an enemy for a Buff. Don't push, so it falls back to self.
                        shouldPush = false;
                    } else {
                        shouldPush = true;
                    }
                }

                const effRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (shouldPush && HexUtils.dist(source, source.target) <= effRange + 0.1) {
                    targets.push(source.target);
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
            target.hp = Math.max(0, Math.min(target.maxHp, target.hp + result.finalValue));
            if (result.finalValue < 0) {
                target.lastHitSourceId = source.id;
                target.lastHitDamage = finalDamage;
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
            source.hp = Math.min(source.maxHp, source.hp + result.vampAmount);
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
                source.hp = Math.max(0, source.hp - selfDmgValue);
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
        if (skill.ccType && (skill.ccType as string) !== 'NONE') {
            const isBuff = skill.ccType === 'SHIELD' || skill.ccType === 'HOT';
            const ccTarget = (isBuff && target.team !== source.team) ? source : target;
            CCManager.applyCC(source, ccTarget, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        }
        if (skill.ccType2 && (skill.ccType2 as string) !== 'NONE') {
            const isBuff2 = skill.ccType2 === 'SHIELD' || skill.ccType2 === 'HOT';
            const ccTarget2 = (isBuff2 && target.team !== source.team) ? source : target;
            CCManager.applyCC(source, ccTarget2, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);
        }

        // D. Death Check & Absolute EXECUTE enforcement
        if (result.isExecute || target.hp <= 0) {
            if (result.isExecute) {
                target.hp = 0; // Forced death logic
                engine.log(source, 'HIT', '斬殺', target.id, `造成 ${Math.abs(result.finalValue)} 傷害 (絕對執行)`);
            }
            engine.agentManager.handleDeadState(target, engine);
        }
    }
}