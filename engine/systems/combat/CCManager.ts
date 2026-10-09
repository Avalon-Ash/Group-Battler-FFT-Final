
import { Agent, GameEngine } from "../../game";
import { Skill, Hex } from "../../../types";
import { Vector, HexUtils } from "../../utils";
import { COMBAT_PARAM, PHYSICS, VFX_PARAM } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

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

        const isBuff = ['SHIELD', 'HOT', 'INVINCIBLE'].includes(type);
        const isDebuff = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT', 'KNOCKBACK', 'PULL', 'DOT', 'BLIND', 'POLYMORPH', 'VULNERABLE'].includes(type);

        if (isBuff && source.team !== target.team) return;
        if (isDebuff && source.team === target.team) return;
        
        const amount = force || 50;
        let isImmune = false;
        let effectiveDuration = dur || 0;

        // --- 1. Exclusion Table Logic ---
        if (type === 'BANISH') {
            // BANISH clears mobility-restricting CCs
            target.rootTimer = 0;
            target.fearTimer = 0;
            target.isMoving = false;
            target.path = [];
            // Optional: clear DOTs? (The prompt says maintain "state purity")
            engine.log(target, 'CC', '狀態清洗', null, '進入放逐狀態，禁錮與恐懼已清除');
        }

        // DR only applies to duration-based Hard CCs
        const isHardCC = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT'].includes(type);
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
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: 0 }, 
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
                if (effectiveDuration > target.stunTimer) {
                    target.stunTimer = effectiveDuration;
                    target.stunMax = effectiveDuration;
                }
                target.isMoving = false;
                // SSOT: AnimState.STUN is derived from stunTimer
                statusText = STATUS_VISUALS.STUN.label;
                statusColor = STATUS_VISUALS.STUN.primaryColor;
                
                if (skill.element === 'ICE') target.visualStatus = 'FROZEN';
                break;

            case 'SILENCE':
                if (effectiveDuration > target.silenceTimer) {
                    target.silenceTimer = effectiveDuration;
                    target.silenceMax = effectiveDuration;
                }
                statusText = STATUS_VISUALS.SILENCE.label;
                statusColor = STATUS_VISUALS.SILENCE.primaryColor;
                break;

            case 'BANISH':
                if (effectiveDuration > target.banishTimer) {
                    target.banishTimer = effectiveDuration;
                    target.banishMax = effectiveDuration;
                }
                target.banished = true;
                target.isMoving = false;
                // SSOT: AnimState.STUN is derived from banished state
                
                statusText = STATUS_VISUALS.BANISH.label;
                statusColor = STATUS_VISUALS.BANISH.primaryColor;
                
                if (skill.specialVisualStatus === 'STASIS') {
                    // STASIS 使用獨立 timer，不共用 banishTimer 語意
                    target.stasisTimer = effectiveDuration;
                    target.stasisMax = effectiveDuration;
                    target.visualStatus = 'STASIS';
                } else if (skill.specialVisualStatus) {
                    target.visualStatus = skill.specialVisualStatus;
                }
                break;

            case 'ROOT':
                if (effectiveDuration > target.rootTimer) target.rootTimer = effectiveDuration;
                target.isMoving = false;
                statusText = STATUS_VISUALS.ROOT.label;
                statusColor = STATUS_VISUALS.ROOT.primaryColor;
                break;

            case 'FEAR':
                if (effectiveDuration > target.fearTimer) target.fearTimer = effectiveDuration;
                statusText = STATUS_VISUALS.FEAR.label;
                statusColor = STATUS_VISUALS.FEAR.primaryColor;
                break;

            case 'TAUNT':
                if (effectiveDuration > target.tauntTimer) {
                    target.tauntTimer = effectiveDuration;
                    target.tauntTargetId = source.id; 
                    
                    // --- 2. State Machine Overrides ---
                    // Force target to taunter immediately
                    target.target = source;
                    target.targetHex = null;
                    
                    // Interrupt current action
                    engine.combat.breakCast(target, engine);
                    
                    // Force AI Decision next tick
                    target.forceAiUpdate = true;
                }
                statusText = STATUS_VISUALS.TAUNT.label;
                statusColor = STATUS_VISUALS.TAUNT.primaryColor;
                break;

            case 'BLIND':
                if (effectiveDuration > target.blindTimer) target.blindTimer = effectiveDuration;
                statusText = STATUS_VISUALS.BLIND.label;
                statusColor = STATUS_VISUALS.BLIND.primaryColor;
                break;

            case 'POLYMORPH':
                if (effectiveDuration > target.polymorphTimer) target.polymorphTimer = effectiveDuration;
                target.isMoving = false;
                statusText = STATUS_VISUALS.POLYMORPH.label;
                statusColor = STATUS_VISUALS.POLYMORPH.primaryColor;
                if (skill.specialVisualStatus) target.visualStatus = skill.specialVisualStatus;
                break;

            case 'INVINCIBLE':
                if (effectiveDuration > target.invincibleTimer) target.invincibleTimer = effectiveDuration;
                statusText = STATUS_VISUALS.INVINCIBLE.label;
                statusColor = STATUS_VISUALS.INVINCIBLE.primaryColor;
                if (skill.specialVisualStatus) target.visualStatus = skill.specialVisualStatus;
                break;

            case 'VULNERABLE':
                if (effectiveDuration > target.vulnerableTimer) target.vulnerableTimer = effectiveDuration;
                statusText = STATUS_VISUALS.VULNERABLE.label;
                statusColor = STATUS_VISUALS.VULNERABLE.primaryColor;
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
                    if (target.hp > 0) target.hitFlashTimer = 0.2;
                    target.physics.vz += PHYSICS.VISUAL_JUMP_KNOCKBACK; 
                    noDurationLog = true;
                    engine.bus.emit('CAMERA_SHAKE', { intensity: VFX_PARAM.SHAKE_INTENSITY_KNOCKBACK });
                }
                break;

            case 'DOT':
                target.dotDmg = force || 10;
                target.dotTimer = effectiveDuration;
                if (skill.element === 'FIRE') {
                    target.dotType = 'BURN';
                    statusText = STATUS_VISUALS.BURN.label;
                    statusColor = STATUS_VISUALS.BURN.primaryColor;
                } else {
                    target.dotType = 'POISON';
                    statusText = STATUS_VISUALS.POISON.label;
                    statusColor = STATUS_VISUALS.POISON.primaryColor;
                }
                break;

            case 'HOT':
                target.hotVal = force || 10;
                target.hotTimer = effectiveDuration;
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
                pos: { x: target.px + target.physics.x, y: target.py + target.physics.y, z: 0 }, 
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
        
        let currentH = {q: target.q, r: target.r};
        let finalH = currentH;

        for(let k=0; k<tilesToPush; k++) {
            const neighbors = HexUtils.neighbors(currentH);
            let bestN: Hex | null = null;
            let bestDot = -2.0; 
            
            for(const n of neighbors) {
                const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                const cPx = HexUtils.toPx(currentH.q, currentH.r, engine.mapConfig);
                const nDir = Vector.normalize(Vector.sub(nPx, cPx));
                
                const dot = nDir.x * vector.x + nDir.y * vector.y;
                if (dot > bestDot) {
                    bestDot = dot;
                    bestN = n;
                }
            }
            
            if (bestN) {
                if (engine.map.hasObstacle(bestN.q, bestN.r)) break; 
                if (engine.getAgentAt(bestN.q, bestN.r)) break; 
                
                const curHeight = engine.map.getTerrainHeight(currentH.q, currentH.r);
                const nextHeight = engine.map.getTerrainHeight(bestN.q, bestN.r);
                if (engine.map.isValid(bestN.q, bestN.r) && nextHeight > curHeight + 24) break; 
                
                currentH = bestN;
                finalH = bestN;
            } else {
                break;
            }
        }
        
        if (finalH.q !== target.q || finalH.r !== target.r) {
            const originPx = {x: target.px, y: target.py};
            engine.updateAgentPosition(target, finalH.q, finalH.r);
            const newPx = HexUtils.toPx(finalH.q, finalH.r, engine.mapConfig);
            target.px = newPx.x;
            target.py = newPx.y;
            target.physics.x += originPx.x - newPx.x;
            target.physics.y += originPx.y - newPx.y;
            
            if (target.isMoving) {
                target.isMoving = false;
                target.path = [];
            }
            return { applied: true };
        }
        return { applied: false };
    }
};
