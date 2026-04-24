
import { Agent, GameEngine } from "../../game";
import { Skill, Hex } from "../../../types";
import { Vector, HexUtils } from "../../utils";
import { COMBAT_PARAM } from "../../../constants";

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
        
        const amount = force || 50;
        let isImmune = false;
        let effectiveDuration = dur || 0;

        // DR only applies to duration-based Hard CCs
        const isHardCC = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT'].includes(type);
        if (isHardCC) {
            const drResult = this.checkDR(target, type, dur || 0);
            effectiveDuration = drResult.effectiveDuration;
            isImmune = drResult.isImmune;
        }
        
        if (isImmune) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "免疫", color: "#9ca3af" });
            return;
        }

        let statusText = "";
        let statusColor = "#fff";
        let noDurationLog = false;

        switch (type) {
            case 'STUN':
                if (effectiveDuration > target.stunTimer) {
                    target.stunTimer = effectiveDuration;
                    target.stunMax = effectiveDuration;
                }
                target.isMoving = false;
                // SSOT: AnimState.STUN is derived from stunTimer
                statusText = "暈眩"; statusColor = "#facc15";
                
                if (skill.element === 'ICE') target.visualStatus = 'FROZEN';
                break;

            case 'SILENCE':
                if (effectiveDuration > target.silenceTimer) {
                    target.silenceTimer = effectiveDuration;
                    target.silenceMax = effectiveDuration;
                }
                statusText = "沉默"; statusColor = "#94a3b8";
                break;

            case 'BANISH':
                if (effectiveDuration > target.banishTimer) {
                    target.banishTimer = effectiveDuration;
                    target.banishMax = effectiveDuration;
                }
                target.banished = true;
                target.isMoving = false;
                // SSOT: AnimState.STUN is derived from banished state
                
                statusText = "放逐"; statusColor = "#c084fc";
                
                if (skill.specialVisualStatus) target.visualStatus = skill.specialVisualStatus;
                break;

            case 'ROOT':
                if (effectiveDuration > target.rootTimer) target.rootTimer = effectiveDuration;
                target.isMoving = false;
                statusText = "禁錮"; statusColor = "#fbbf24";
                break;

            case 'FEAR':
                if (effectiveDuration > target.fearTimer) target.fearTimer = effectiveDuration;
                statusText = "恐懼"; statusColor = "#a855f7";
                break;

            case 'TAUNT':
                if (effectiveDuration > target.tauntTimer) {
                    target.tauntTimer = effectiveDuration;
                    target.tauntTargetId = source.id; 
                }
                statusText = "嘲諷"; statusColor = "#ef4444";
                break;

            case 'BLIND':
                if (effectiveDuration > target.blindTimer) target.blindTimer = effectiveDuration;
                statusText = "致盲"; statusColor = "#cbd5e1";
                break;

            case 'SHIELD':
                target.shield += amount;
                target.maxShield = Math.max(target.maxShield, target.shield);
                statusText = "護盾"; statusColor = "#bae6fd";
                noDurationLog = true;
                break;

            case 'KNOCKBACK':
            case 'PULL':
                const result = this.calculateKnockback(target, force || 0, source, origin, type, engine);
                if (result.applied) {
                    statusText = type === 'PULL' ? "牽引" : "擊退";
                    // SSOT: Trigger hit flash to cause reaction
                    if (target.hp > 0) target.hitFlashTimer = 0.2;
                    target.physics.vz += 150; 
                    noDurationLog = true;
                }
                break;

            case 'DOT':
                target.dotDmg = force || 10;
                target.dotTimer = effectiveDuration;
                statusText = "中毒"; statusColor = "#10b981";
                break;

            case 'HOT':
                target.hotVal = force || 10;
                target.hotTimer = effectiveDuration;
                statusText = "再生"; statusColor = "#86efac";
                break;
        }

        if (statusText) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: statusText, color: statusColor });
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
        const resilience = (target as any).resilience || 0; 
        
        // 2. Diminishing Returns Stacks
        const stacks = target.drStacks[type] || 0;
        
        // Formula: Duration * (0.5 ^ stacks) * (1 - resilience)
        let multiplier = Math.pow(0.5, stacks) * (1 - resilience);
        
        // Minimum duration floor (20% of base) or immunity
        if (multiplier < 0.2) return { effectiveDuration: 0, isImmune: true };
        
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
            engine.updateAgentPosition(target, finalH.q, finalH.r);
            if (target.isMoving) {
                target.isMoving = false;
                target.path = [];
            }
            return { applied: true };
        }
        return { applied: false };
    }
};
