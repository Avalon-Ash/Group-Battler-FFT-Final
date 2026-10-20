
import { Agent, GameEngine } from "../../game";
import { Skill } from "../../../types";
import { Vector } from "../../utils";
import { COMBAT_PARAM, PHYSICS, VFX_PARAM, FORCED_MOVE, DAMAGE_TEXT_COLORS } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { triggerHitFlash } from "../../core/ViewCommands";
import { applyDirectDamage } from "./DirectDamage";
import { unitEventPos } from "../../events/EventPos";
import { stopMovement, teleportTo } from "../movement/MotionCommands";
import { syncBanished } from "../status/ControlSystem";
import { resolveForcedMove, isImpactBlock, computeImpactDamage } from "./ForcedMove";
import type { ForcedMoveKind, ForcedMoveBlock } from "./ForcedMove";
import { EFFECT_DEFS } from "../../../data/status/effect_defs";
import type { EffectKind } from "../../../types";

export const CCManager = {
    
    applyCC(
        source: Agent, 
        target: Agent, 
        skill: Skill, 
        type: string | undefined, 
        dur: number | undefined, 
        force: number | undefined, 
        origin: {x: number, y: number} | undefined, 
        engine: GameEngine
    ) {
        if (!type || type === 'NONE') return;

        const def = (type && type in EFFECT_DEFS) ? EFFECT_DEFS[type as EffectKind] : undefined;
        const isBuff = type === 'SHIELD' || def?.polarity === 'BUFF';
        const isDebuff = type === 'KNOCKBACK' || type === 'PULL' || def?.polarity === 'DEBUFF';

        if (isBuff && source.team !== target.team) return;
        if (isDebuff && source.team === target.team) return;
        
        const amount = force || 50;
        let isImmune = false;
        let effectiveDuration = dur || 0;

        // --- 1. Exclusion Table Logic ---
        if (def?.clearsOnApply && def.clearsOnApply.length > 0) {
            for (const clearedKind of def.clearsOnApply) {
                target.effects[clearedKind].remaining = 0;
            }
            stopMovement(target);
            // Optional: clear DOTs? (The prompt says maintain "state purity")
            engine.log(target, 'CC', '狀態清洗', null, '進入放逐狀態，禁錮與恐懼已清除');
        }

        // DR only applies to duration-based Hard CCs
        const isHardCC = def?.hardCC ?? false;
        let drMultiplier = 1.0;
        if (isHardCC) {
            const drResult = this.checkDR(target, type, dur || 0);
            effectiveDuration = drResult.effectiveDuration;
            isImmune = drResult.isImmune;
            
            // Calculate DR multiplier for display (dur might be 0, so guard)
            if (dur && dur > 0) drMultiplier = effectiveDuration / dur;
        }
        
        if (isImmune) {
            engine.events.push({ 
                type: 'CC_APPLIED', 
                pos: unitEventPos(target, engine), 
                text: STATUS_VISUALS.IMMUNE.label, 
                color: STATUS_VISUALS.IMMUNE.primaryColor,
                sourceId: source.id,
                targetId: target.id
            });
            return;
        }

        let statusText = "";
        let statusColor = STATUS_VISUALS.DEFAULT.primaryColor;
        let noDurationLog = false;

        switch (type) {
            case 'STUN':
                if (effectiveDuration > target.effects.STUN.remaining) {
                    target.effects.STUN.remaining = effectiveDuration;
                    target.effects.STUN.max = effectiveDuration;
                }
                stopMovement(target);
                // SSOT: AnimState.STUN is derived from effects.STUN
                statusText = STATUS_VISUALS.STUN.label;
                statusColor = STATUS_VISUALS.STUN.primaryColor;
                
                if (skill.element === 'ICE') target.ccVisual = 'FROZEN';
                break;

            case 'SILENCE':
                if (effectiveDuration > target.effects.SILENCE.remaining) {
                    target.effects.SILENCE.remaining = effectiveDuration;
                    target.effects.SILENCE.max = effectiveDuration;
                }
                statusText = STATUS_VISUALS.SILENCE.label;
                statusColor = STATUS_VISUALS.SILENCE.primaryColor;
                break;

            case 'BANISH':
                if (effectiveDuration > target.effects.BANISH.remaining) {
                    target.effects.BANISH.remaining = effectiveDuration;
                    target.effects.BANISH.max = effectiveDuration;
                }
                syncBanished(target);
                stopMovement(target);
                // SSOT: AnimState.STUN is derived from banished state
                
                statusText = STATUS_VISUALS.BANISH.label;
                statusColor = STATUS_VISUALS.BANISH.primaryColor;
                
                if (skill.specialVisualStatus === 'STASIS') {
                    // STASIS 使用獨立槽位，不共用 effects.BANISH 語意
                    target.effects.STASIS.remaining = effectiveDuration;
                    target.effects.STASIS.max = effectiveDuration;
                    target.ccVisual = 'STASIS';
                } else if (skill.specialVisualStatus) {
                    target.ccVisual = skill.specialVisualStatus;
                }
                break;

            case 'ROOT':
                if (effectiveDuration > target.effects.ROOT.remaining) {
                    target.effects.ROOT.remaining = effectiveDuration;
                    target.effects.ROOT.max = effectiveDuration;
                }
                stopMovement(target);
                statusText = STATUS_VISUALS.ROOT.label;
                statusColor = STATUS_VISUALS.ROOT.primaryColor;
                break;

            case 'FEAR':
                if (effectiveDuration > target.effects.FEAR.remaining) {
                    target.effects.FEAR.remaining = effectiveDuration;
                    target.effects.FEAR.max = effectiveDuration;
                }
                statusText = STATUS_VISUALS.FEAR.label;
                statusColor = STATUS_VISUALS.FEAR.primaryColor;
                break;

            case 'TAUNT':
                if (effectiveDuration > target.effects.TAUNT.remaining) {
                    target.effects.TAUNT.remaining = effectiveDuration;
                    target.effects.TAUNT.max = effectiveDuration;
                    target.effects.TAUNT.sourceId = source.id; 
                    
                    // --- 2. State Machine Overrides ---
                    // Target lock lives in TargetingSystem.updateTarget (BT HasTarget re-targets while effects.TAUNT.remaining > 0)
                    // Interrupt current action
                    engine.combat.breakCast(target, engine);
                    
                    // Force AI Decision next tick
                    target.forceAiUpdate = true;
                }
                statusText = STATUS_VISUALS.TAUNT.label;
                statusColor = STATUS_VISUALS.TAUNT.primaryColor;
                break;

            case 'BLIND':
                if (effectiveDuration > target.effects.BLIND.remaining) {
                    target.effects.BLIND.remaining = effectiveDuration;
                    target.effects.BLIND.max = effectiveDuration;
                }
                statusText = STATUS_VISUALS.BLIND.label;
                statusColor = STATUS_VISUALS.BLIND.primaryColor;
                break;

            case 'POLYMORPH':
                if (effectiveDuration > target.effects.POLYMORPH.remaining) {
                    target.effects.POLYMORPH.remaining = effectiveDuration;
                    target.effects.POLYMORPH.max = effectiveDuration;
                }
                stopMovement(target);
                statusText = STATUS_VISUALS.POLYMORPH.label;
                statusColor = STATUS_VISUALS.POLYMORPH.primaryColor;
                if (skill.specialVisualStatus) target.ccVisual = skill.specialVisualStatus;
                break;

            case 'INVINCIBLE':
                if (effectiveDuration > target.effects.INVINCIBLE.remaining) {
                    target.effects.INVINCIBLE.remaining = effectiveDuration;
                    target.effects.INVINCIBLE.max = effectiveDuration;
                }
                statusText = STATUS_VISUALS.INVINCIBLE.label;
                statusColor = STATUS_VISUALS.INVINCIBLE.primaryColor;
                if (skill.specialVisualStatus) target.ccVisual = skill.specialVisualStatus;
                break;

            case 'VULNERABLE':
                if (effectiveDuration > target.effects.VULNERABLE.remaining) {
                    target.effects.VULNERABLE.remaining = effectiveDuration;
                    target.effects.VULNERABLE.max = effectiveDuration;
                }
                statusText = STATUS_VISUALS.VULNERABLE.label;
                statusColor = STATUS_VISUALS.VULNERABLE.primaryColor;
                break;

            case 'HASTE':
                if (effectiveDuration > target.effects.HASTE.remaining) {
                    target.effects.HASTE.remaining = effectiveDuration;
                    target.effects.HASTE.max = effectiveDuration;
                    target.effects.HASTE.value = force || 0;
                }
                statusText = STATUS_VISUALS.HASTE.label;
                statusColor = STATUS_VISUALS.HASTE.primaryColor;
                break;

            case 'REFLECT':
                if (effectiveDuration > target.effects.REFLECT.remaining) {
                    target.effects.REFLECT.remaining = effectiveDuration;
                    target.effects.REFLECT.max = effectiveDuration;
                    target.effects.REFLECT.value = force || 0;
                }
                statusText = STATUS_VISUALS.REFLECT.label;
                statusColor = STATUS_VISUALS.REFLECT.primaryColor;
                break;

            case 'LIFESTEAL':
                if (effectiveDuration > target.effects.LIFESTEAL.remaining) {
                    target.effects.LIFESTEAL.remaining = effectiveDuration;
                    target.effects.LIFESTEAL.max = effectiveDuration;
                    target.effects.LIFESTEAL.value = force || 0;
                }
                statusText = STATUS_VISUALS.LIFESTEAL.label;
                statusColor = STATUS_VISUALS.LIFESTEAL.primaryColor;
                break;

            case 'SHIELD':
                target.shield += amount;
                target.maxShield = Math.max(target.maxShield, target.shield);
                statusText = STATUS_VISUALS.SHIELD.label;
                statusColor = STATUS_VISUALS.SHIELD.primaryColor;
                noDurationLog = true;
                break;

            case 'KNOCKBACK':
            case 'PULL':
                const result = this.calculateKnockback(target, force || 0, source, origin, type, engine);
                if (result.applied) {
                    const visual = type === 'PULL' ? STATUS_VISUALS.PULL : STATUS_VISUALS.KNOCKBACK;
                    statusText = visual.label;
                    statusColor = visual.primaryColor;
                    // SSOT: Trigger hit flash to cause reaction
                    if (target.hp > 0) triggerHitFlash(target, 0.2);
                    target.physics.vz += PHYSICS.VISUAL_JUMP_KNOCKBACK; 
                    noDurationLog = true;
                    engine.bus.emit('CAMERA_SHAKE', { intensity: VFX_PARAM.SHAKE_INTENSITY_KNOCKBACK });
                }
                break;

            case 'DOT':
                target.effects.DOT.remaining = effectiveDuration;
                target.effects.DOT.max = effectiveDuration;
                target.effects.DOT.value = force || 10;
                target.effects.DOT.sourceId = source.id;
                if (skill.element === 'FIRE') {
                    target.effects.DOT.tag = 'BURN';
                    statusText = STATUS_VISUALS.BURN.label;
                    statusColor = STATUS_VISUALS.BURN.primaryColor;
                } else {
                    target.effects.DOT.tag = 'POISON';
                    statusText = STATUS_VISUALS.POISON.label;
                    statusColor = STATUS_VISUALS.POISON.primaryColor;
                }
                break;

            case 'HOT':
                target.effects.HOT.remaining = effectiveDuration;
                target.effects.HOT.max = effectiveDuration;
                target.effects.HOT.value = force || 10;
                statusText = STATUS_VISUALS.REGEN.label;
                statusColor = STATUS_VISUALS.REGEN.primaryColor;
                break;
        }

        if (statusText) {
            // Append DR info if applicable
            let displayEffectText = statusText;
            if (drMultiplier < 0.95 && drMultiplier > 0.05) {
                const pct = Math.round(drMultiplier * 100);
                displayEffectText = `${statusText} (${pct}% DR)`;
            }

            engine.events.push({ 
                type: 'CC_APPLIED', 
                pos: unitEventPos(target, engine), 
                text: displayEffectText, 
                color: statusColor,
                sourceId: source.id,
                targetId: target.id
            });
            if (noDurationLog) {
                engine.log(source, 'CC', type, target.id, `施加 ${statusText}`);
            } else {
                engine.log(source, 'CC', type, target.id, `施加 ${statusText} (${effectiveDuration.toFixed(1)}s)`);
            }
        }
    },

    checkDR(target: Agent, type: string, baseDuration: number) {
        const isHardCC = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT'].includes(type);
        if (!isHardCC) return { effectiveDuration: baseDuration, isImmune: false };
        
        // 1. Base Resilience (Future-proofing for items/buffs)
        const resilience = COMBAT_PARAM.BASE_CC_RESILIENCE; 
        
        // 2. Diminishing Returns Stacks
        const stacks = target.drStacks[type] || 0;
        
        // Formula: Duration * (0.5 ^ stacks) * (1 - resilience)
        let multiplier = Math.pow(0.5, stacks) * (1 - resilience);
        
        // Minimum duration floor or immunity (<= 0.25 means the 3rd application is immune)
        if (multiplier <= 0.25) return { effectiveDuration: 0, isImmune: true };
        
        target.drStacks[type] = stacks + 1;
        target.drTimers[type] = COMBAT_PARAM.DR_RESET_TIME; 
        
        return { effectiveDuration: baseDuration * multiplier, isImmune: false };
    },

    calculateKnockback(target: Agent, force: number, source: Agent, origin: {x: number, y: number} | undefined, type: string, engine: GameEngine) {
        const rawForce = Math.max(1, force);
        const resistance = target.weight || 1; 
        
        // [FIX] Normal weight is 1. If force is 1, it should push 1 tile.
        // So tilesToPush = rawForce - (resistance - 1)
        const tilesToPush = Math.max(0, rawForce - (resistance - 1));
        if (tilesToPush === 0) return { applied: false };

        const originPx = origin ? origin : {x: source.px, y: source.py};
        const dir = Vector.normalize(Vector.sub({x: target.px, y: target.py}, originPx));
        const vector = type === 'KNOCKBACK' ? dir : Vector.mult(dir, -1); 
        const kind: ForcedMoveKind = type === 'PULL' ? 'PULL' : 'KNOCKBACK';

        // 高度／障礙／單位的判定全在 ForcedMove（與 Pathfinder 共用爬高規則）
        const { finalHex: finalH, blocked } = resolveForcedMove(target, vector, tilesToPush, kind, engine);

        const moved = finalH.q !== target.q || finalH.r !== target.r;
        if (moved) {
            teleportTo(target, finalH.q, finalH.r, engine);
            if (target.isMoving) stopMovement(target);
        }

        // 撞擊傷害（Tactics Ogre 式）：拉扯停在施法者身邊是目的，不算撞擊
        if (isImpactBlock(blocked, kind) && !(kind === 'PULL' && blocked.otherAgentId === source.id)) {
            this.applyImpact(target, source, blocked, engine);
        }
        return { applied: moved };
    },

    /** 撞擊傷害：走 applyDirectDamage（先扣護盾），撞到單位時雙方各吃一部分。 */
    applyImpact(target: Agent, source: Agent, block: ForcedMoveBlock, engine: GameEngine) {
        const damage = computeImpactDamage(target.maxHp, block);
        const victims: { agent: Agent; amount: number }[] = [{ agent: target, amount: damage }];
        if (block.reason === 'UNIT' && block.otherAgentId) {
            const other = engine.agents.find(a => a.id === block.otherAgentId);
            if (other && other.hp > 0) {
                victims.push({ agent: other, amount: Math.max(FORCED_MOVE.IMPACT_MIN, Math.floor(damage * FORCED_MOVE.IMPACT_UNIT_SHARE)) });
            }
        }

        for (const { agent, amount } of victims) {
            const { absorbed } = applyDirectDamage(agent, amount, false, source.id);
            if (absorbed > 0) {
                engine.pushEvent('DAMAGE', unitEventPos(agent, engine), {
                    value: -Math.floor(absorbed), color: DAMAGE_TEXT_COLORS.ABSORB, text: 'ABSORB',
                    sourceId: source.id, targetId: agent.id
                });
            }
            engine.pushEvent('DAMAGE', unitEventPos(agent, engine), {
                value: -amount, color: DAMAGE_TEXT_COLORS.RECOIL, text: FORCED_MOVE.IMPACT_TEXT,
                sourceId: source.id, targetId: agent.id
            });
            engine.pushEvent('HIT_FX', unitEventPos(agent, engine), {
                value: amount, text: FORCED_MOVE.IMPACT_FX, sourceId: source.id, targetId: agent.id
            });
            engine.log(source, 'CC', FORCED_MOVE.IMPACT_TEXT, agent.id, `${agent.id} 撞擊${block.reason} 受到 ${amount} 傷害`);
            if (agent.hp <= 0) {
                engine.agentManager.handleDeadState(agent, engine, FORCED_MOVE.IMPACT_TEXT);
            } else {
                triggerHitFlash(agent, COMBAT_PARAM.HIT_FLASH_DURATION);
            }
        }
        engine.bus.emit('CAMERA_SHAKE', { intensity: FORCED_MOVE.IMPACT_SHAKE });
    }
};
