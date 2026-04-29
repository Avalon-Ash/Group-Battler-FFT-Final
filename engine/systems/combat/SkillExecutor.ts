import { Agent, GameEngine } from "../../game";
import { Skill, Team } from "../../../types";
import { HexUtils } from "../../utils";
import { DamageCalculator } from "./DamageCalculator";
import { CCManager } from "./CCManager";
import { HazardManager } from "./HazardManager";
import { PhysicsEngine } from "../../physics/PhysicsEngine";
import { COMBAT_PARAM } from "../../../constants";

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

        // 2. 獲取受影響區域
        const impactCells = engine.movement.targeting.getImpactArea(source, targetHex, skill, engine);
        const p = HexUtils.toPx(targetHex.q, targetHex.r, engine.mapConfig);
        const origin = { x: p.x, y: p.y };

        // [NEW] DASH Effect: Move caster towards targetHex
        if (skill.effectType === 'DASH' || skill.effectType2 === 'DASH') {
            let bestH = null;
            let minDist = Infinity;
            
            // If targetHex is empty, dash directly there
            const targetOccupant = engine.getAgentAt(targetHex.q, targetHex.r);
            if (engine.map.isValid(targetHex.q, targetHex.r) && (!targetOccupant || targetOccupant === source) && !engine.map.hasObstacle(targetHex.q, targetHex.r)) {
                bestH = targetHex;
            } else {
                // Otherwise find an empty neighbor
                for (const n of HexUtils.neighbors(targetHex)) {
                    const occupant = engine.getAgentAt(n.q, n.r);
                    if (engine.map.isValid(n.q, n.r) && (!occupant || occupant === source) && !engine.map.hasObstacle(n.q, n.r)) {
                        const dist = HexUtils.dist(source, n);
                        if (dist < minDist) {
                            minDist = dist;
                            bestH = n;
                        }
                    }
                }
            }
            
            if (bestH) {
                engine.updateAgentPosition(source, bestH.q, bestH.r);
                const newPx = HexUtils.toPx(bestH.q, bestH.r, engine.mapConfig);
                source.px = newPx.x;
                source.py = newPx.y;
                source.physics.vz += 150; // Visual jump
                engine.events.push({ 
                    type: 'CC_APPLIED', 
                    pos: { x: source.px + source.physics.x, y: source.py + source.physics.y, z: source.physics.z }, 
                    text: "突進", 
                    color: "#60a5fa",
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
                if (u && u.hp > 0 && !u.banished) {
                    const isValidTarget = (skill.power > 0 && u.team !== source.team) || 
                                          (skill.power < 0 && u.team === source.team) || 
                                          (skill.power === 0);
                    
                    if (isValidTarget) {
                        targets.push(u);
                    }
                }
            });
            
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color, sourceId: source.id });
            HazardManager.spawnHazards(source, impactCells, skill, engine, targetHex);
        } else {
            if (source.target && source.target.hp > 0 && !source.target.banished) {
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
        
        // Final target selection fallback
        if (targets.length === 0 && skill.power <= 0 && skill.type === 'SINGLE') {
            targets.push(source);
        }

        const preRollCrit = skill.power > 0 ? Math.random() < 0.1 : false;
        targets.forEach(target => {
            this.resolveHit(source, target, skill, isAOE ? origin : undefined, engine, preRollCrit);
        });
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine, preRollCrit: boolean | undefined = undefined) {
        if (!target || target.hp <= 0 || target.banished) return;

        // A. Damage Calculation
        const result = DamageCalculator.calculate(source, target, skill, engine.battleTime, preRollCrit, engine.isLastStand);
        
        if (result.isMiss) {
            target.lastHitDamage = 0;
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
                text: "MISS", 
                color: '#9ca3af',
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '閃避', target.id, `攻擊未命中`);
            return;
        }

        if (result.isBlock) {
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
                text: "BLOCK", 
                color: '#fb923c',
                sourceId: source.id,
                targetId: target.id
            });
            engine.log(source, 'HIT', '格擋', target.id, `減少15%傷害`);
        }

        if (result.shieldAbsorb > 0) {
            engine.events.push({ 
                type: 'DAMAGE', 
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
                value: -Math.floor(result.shieldAbsorb), 
                color: '#bae6fd', 
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
            const color = isHeal ? '#86efac' : (result.isCrit ? '#ef4444' : skill.color);
            
            engine.events.push({ 
                type: evtType, 
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
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
                    target.hitFlashTimer = COMBAT_PARAM.HIT_FLASH_DURATION;
                    
                    // [NEW] Optical Shake Sync: Decoupled visual jitter
                    const shakePower = Math.min(12, finalDamage / 8 + 3);
                    target.visualOffset.x = (Math.random() - 0.5) * shakePower;
                    target.visualOffset.y = (Math.random() - 0.5) * shakePower;

                    // [FIX] SSOT Grid Anchor Locking for Hit VFX
                    const hexCenter = HexUtils.toPx(target.q, target.r, engine.mapConfig);
                    const hitX = hexCenter.x;
                    const hitY = hexCenter.y;
                    const hitZ = engine.getTerrainHeight(target.q, target.r);

                    // 選擇基礎打擊特效
                    const hitFX = target.team === Team.BLUE ? 'FX_HIT_BLUE_TECH' : 'FX_HIT_RED_BLOOD';

                    // [FIX] Synchronous VFX: Immediate burst aligned with hitFlashFrame
                    if (engine.vfx) {
                        // Check for shield hit - play shield spark if absorbed
                        if (result.shieldAbsorb > 0) {
                            engine.vfx.playEffect('FX_HIT_SHIELD_SPARK', hitX, hitY, hitZ);
                        } else {
                            engine.vfx.playEffect(hitFX, hitX, hitY, hitZ);
                            if (finalDamage >= COMBAT_PARAM.HIT_MEDIUM_THRESHOLD) {
                                engine.vfx.playEffect(hitFX, hitX + 8, hitY - 8, hitZ);
                            }
                        }

                        // HEAVY：額外疊加地面衝擊波（複用現有 EASING_SHOCKWAVE）
                        if (finalDamage >= COMBAT_PARAM.HIT_HEAVY_THRESHOLD) {
                            engine.vfx.playEffect('EASING_SHOCKWAVE', hitX, hitY, hitZ);
                        }
                    }
                    
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
                pos: { x: source.px + source.physics.x, y: source.py + source.physics.y, z: source.physics.z }, 
                value: result.vampAmount, 
                color: '#be123c', 
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
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
                value: result.manaBurn, 
                color: '#8b5cf6', 
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
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: target.physics.z }, 
                value: result.manaRestore, 
                color: '#60a5fa', 
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
                    pos: { x: source.px + source.physics.x, y: source.py + source.physics.y, z: source.physics.z },
                    value: selfDmgValue,
                    color: '#ef4444',
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